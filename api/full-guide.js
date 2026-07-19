import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.FULL_GUIDE_BUCKET || "private-guides";
const FILE_PATH = process.env.FULL_GUIDE_PATH || "nos-comprometimos-guia-completa.pdf";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método no permitido." });
  }

  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Necesitás iniciar sesión para descargar la guía." });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("Faltan VITE_SUPABASE_URL/SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
    return res.status(500).json({ error: "La descarga todavía no está configurada." });
  }

  try {
    // Reutiliza la misma validación de compra que ya protege la aplicación.
    const protocol = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
    const host = req.headers.host;
    if (!host) throw new Error("No se pudo determinar el dominio de la aplicación.");

    const accessResponse = await fetch(`${protocol}://${host}/api/access`, {
      headers: { Authorization: authorization },
    });
    const accessPayload = await accessResponse.json().catch(() => ({}));

    if (!accessResponse.ok || !accessPayload?.has_access) {
      return res.status(403).json({ error: "No encontramos una compra activa para esta cuenta." });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(FILE_PATH, 120, {
        download: "Nos-comprometimos-y-ahora-que-GUIA-COMPLETA.pdf",
      });

    if (error || !data?.signedUrl) {
      console.error("Error creando URL firmada de la guía:", error);
      return res.status(500).json({ error: "No pudimos preparar la guía. Intentá nuevamente en unos minutos." });
    }

    return res.status(200).json({ url: data.signedUrl });
  } catch (error) {
    console.error("Error en /api/full-guide:", error);
    return res.status(500).json({ error: "No pudimos preparar la descarga." });
  }
}

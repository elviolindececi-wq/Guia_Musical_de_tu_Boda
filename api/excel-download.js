import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.EXCEL_FILES_BUCKET || process.env.FULL_GUIDE_BUCKET || "private-guides";
const BASE_PATH = String(process.env.EXCEL_FILES_BASE_PATH || "excel").replace(/^\/+|\/+$/g, "");

const FILES = Object.freeze({
  master: {
    storageName: "00_Tu_Boda_Organizada_Planificador_Maestro.xlsx",
    downloadName: "00_Tu_Boda_Organizada_Planificador_Maestro.xlsx",
  },
  budget: {
    storageName: "01_Presupuesto_de_la_Boda.xlsx",
    downloadName: "01_Presupuesto_de_la_Boda.xlsx",
  },
  guests: {
    storageName: "02_Lista_de_Invitados.xlsx",
    downloadName: "02_Lista_de_Invitados.xlsx",
  },
  vendors: {
    storageName: "03_Gestion_de_Proveedores.xlsx",
    downloadName: "03_Gestion_de_Proveedores.xlsx",
  },
  checklist: {
    storageName: "04_Cronograma_y_Checklist.xlsx",
    downloadName: "04_Cronograma_y_Checklist.xlsx",
  },
  payments: {
    storageName: "05_Pagos_y_Contratos.xlsx",
    downloadName: "05_Pagos_y_Contratos.xlsx",
  },
  music: {
    storageName: "06_Musica_de_la_Boda.xlsx",
    downloadName: "06_Musica_de_la_Boda.xlsx",
  },
  tables: {
    storageName: "07_Distribucion_de_Mesas.xlsx",
    downloadName: "07_Distribucion_de_Mesas.xlsx",
  },
  weddingDay: {
    storageName: "08_Cronograma_del_Dia_de_la_Boda.xlsx",
    downloadName: "08_Cronograma_del_Dia_de_la_Boda.xlsx",
  },
});

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método no permitido." });
  }

  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Necesitás iniciar sesión para descargar el Excel." });
  }

  const fileKey = Array.isArray(req.query?.file) ? req.query.file[0] : req.query?.file;
  const file = FILES[String(fileKey || "").trim()];
  if (!file) {
    return res.status(400).json({ error: "La plantilla solicitada no existe." });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("Faltan VITE_SUPABASE_URL/SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
    return res.status(500).json({ error: "Las descargas de Excel todavía no están configuradas." });
  }

  try {
    // Usa la misma validación de compra que protege el resto de la aplicación.
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

    const storagePath = `${BASE_PATH}/${file.storageName}`;
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 120, { download: file.downloadName });

    if (error || !data?.signedUrl) {
      console.error("Error creando URL firmada del Excel:", { storagePath, error });
      return res.status(500).json({ error: "No pudimos preparar el Excel. Intentá nuevamente en unos minutos." });
    }

    return res.status(200).json({
      url: data.signedUrl,
      file: String(fileKey),
      name: file.downloadName,
    });
  } catch (error) {
    console.error("Error en /api/excel-download:", error);
    return res.status(500).json({ error: "No pudimos preparar la descarga del Excel." });
  }
}

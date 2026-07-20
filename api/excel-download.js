const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const EXCEL_BUCKET =
  process.env.EXCEL_FILES_BUCKET ||
  process.env.FULL_GUIDE_BUCKET ||
  "private-guides";

/*
 * Actualmente los Excel están guardados directamente
 * en la raíz del bucket private-guides.
 *
 * Si en el futuro se mueven a una carpeta, se puede definir
 * EXCEL_FILES_BASE_PATH en las variables de entorno.
 */
const EXCEL_BASE_PATH = String(
  process.env.EXCEL_FILES_BASE_PATH || ""
).replace(/^\/+|\/+$/g, "");

const EXCEL_FILES = Object.freeze({
  master: {
    storageName:
      "00_Tu_Boda_Organizada_Planificador_Maestro.xlsx",
    downloadName:
      "00_Tu_Boda_Organizada_Planificador_Maestro.xlsx",
  },

  budget: {
    storageName:
      "01_Presupuesto_de_la_Boda.xlsx",
    downloadName:
      "01_Presupuesto_de_la_Boda.xlsx",
  },

  guests: {
    storageName:
      "02_Lista_de_Invitados.xlsx",
    downloadName:
      "02_Lista_de_Invitados.xlsx",
  },

  vendors: {
    storageName:
      "03_Gestion_de_Proveedores.xlsx",
    downloadName:
      "03_Gestion_de_Proveedores.xlsx",
  },

  checklist: {
    storageName:
      "04_Cronograma_y_Checklist.xlsx",
    downloadName:
      "04_Cronograma_y_Checklist.xlsx",
  },

  payments: {
    storageName:
      "05_Pagos_y_Contratos.xlsx",
    downloadName:
      "05_Pagos_y_Contratos.xlsx",
  },

  music: {
    storageName:
      "06_Musica_de_la_Boda.xlsx",
    downloadName:
      "06_Musica_de_la_Boda.xlsx",
  },

  tables: {
    storageName:
      "07_Distribucion_de_Mesas.xlsx",
    downloadName:
      "07_Distribucion_de_Mesas.xlsx",
  },

  weddingDay: {
    storageName:
      "08_Cronograma_del_Dia_de_la_Boda.xlsx",
    downloadName:
      "08_Cronograma_del_Dia_de_la_Boda.xlsx",
  },
});

function getRequestedFile(req) {
  const value = req.query?.file;

  if (Array.isArray(value)) {
    return String(value[0] || "").trim();
  }

  return String(value || "").trim();
}

function getStoragePath(fileName) {
  if (!EXCEL_BASE_PATH) {
    return fileName;
  }

  return `${EXCEL_BASE_PATH}/${fileName}`;
}

function getApplicationOrigin(req) {
  const forwardedProtocol =
    req.headers["x-forwarded-proto"];

  const protocol = String(
    forwardedProtocol || "https"
  )
    .split(",")[0]
    .trim();

  const host = req.headers.host;

  if (!host) {
    throw new Error(
      "No se pudo determinar el dominio de la aplicación."
    );
  }

  return `${protocol}://${host}`;
}

async function validatePaidAccess(
  req,
  authorization
) {
  const origin = getApplicationOrigin(req);

  const response = await fetch(
    `${origin}/api/access`,
    {
      method: "GET",
      headers: {
        Authorization: authorization,
        Accept: "application/json",
      },
    }
  );

  const payload = await response
    .json()
    .catch(() => ({}));

  return {
    ok:
      response.ok &&
      payload?.has_access === true,

    status: response.status,
    payload,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader(
    "Cache-Control",
    "no-store, max-age=0"
  );

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");

    return res.status(405).json({
      error: "Método no permitido.",
    });
  }

  const authorization =
    req.headers.authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      error:
        "Necesitás iniciar sesión para descargar el Excel.",
    });
  }

  const requestedFile = getRequestedFile(req);
  const excelFile =
    EXCEL_FILES[requestedFile];

  if (!excelFile) {
    return res.status(400).json({
      error:
        "La plantilla solicitada no existe.",
    });
  }

  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error(
      "Faltan VITE_SUPABASE_URL/SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY."
    );

    return res.status(500).json({
      error:
        "Las descargas de Excel todavía no están configuradas.",
    });
  }

  try {
    const accessResult =
      await validatePaidAccess(
        req,
        authorization
      );

    if (!accessResult.ok) {
      console.error(
        "Acceso al Excel rechazado:",
        {
          status: accessResult.status,
          payload: accessResult.payload,
        }
      );

      return res.status(403).json({
        error:
          "No encontramos una compra activa para esta cuenta.",
      });
    }

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const storagePath = getStoragePath(
      excelFile.storageName
    );

    const {
      data,
      error: signedUrlError,
    } = await supabaseAdmin.storage
      .from(EXCEL_BUCKET)
      .createSignedUrl(
        storagePath,
        120,
        {
          download:
            excelFile.downloadName,
        }
      );

    if (
      signedUrlError ||
      !data?.signedUrl
    ) {
      console.error(
        "Error creando URL firmada del Excel:",
        {
          bucket: EXCEL_BUCKET,
          storagePath,
          error: signedUrlError,
        }
      );

      return res.status(500).json({
        error:
          "No pudimos preparar el Excel. Intentá nuevamente en unos minutos.",
      });
    }

    return res.status(200).json({
      url: data.signedUrl,
      file: requestedFile,
      name: excelFile.downloadName,
    });
  } catch (error) {
    console.error(
      "Error en /api/excel-download:",
      error
    );

    return res.status(500).json({
      error:
        "No pudimos preparar la descarga del Excel.",
    });
  }
};
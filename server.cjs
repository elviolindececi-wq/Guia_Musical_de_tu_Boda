const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const app = express();
const PORT = 3001;

app.use(express.json({ limit: "2mb" }));

// CORS para que Vite/browser pueda llamar al backend local
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Servidor local de Claude funcionando",
    port: PORT
  });
});

app.post("/api/generate", async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: {
          message: "Falta ANTHROPIC_API_KEY en el archivo .env.local"
        }
      });
    }

    const body = req.body;

    if (!body || !body.messages) {
      return res.status(400).json({
        error: {
          message: "Body inválido. Faltan messages."
        }
      });
    }

    const payload = {
      model: body.model || "claude-sonnet-4-6",
      max_tokens: body.max_tokens || 1000,
      messages: body.messages
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({
        error: {
          message: "Anthropic no devolvió JSON válido.",
          raw: text
        }
      });
    }

    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({
      error: {
        message: error.message || "Error inesperado en server.cjs"
      }
    });
  }
});

const server = app.listen(PORT, "127.0.0.1", () => {
  console.log(`Claude local API funcionando en http://127.0.0.1:${PORT}`);
  console.log("Dejá esta terminal abierta. Para cerrar el servidor, usá Ctrl + C.");
});

server.on("error", (error) => {
  console.error("Error levantando el servidor:", error.message);
});
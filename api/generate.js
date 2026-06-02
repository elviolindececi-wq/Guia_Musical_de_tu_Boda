module.exports = async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      return res.status(200).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: { message: "Method not allowed" } });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: {
          message: "Falta ANTHROPIC_API_KEY en las variables de entorno de Vercel."
        }
      });
    }

    const body = req.body || {};

    const model = body.model || "claude-sonnet-4-6";
    const maxTokens = body.max_tokens || 2000;
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (!messages.length) {
      return res.status(400).json({
        error: { message: "Falta messages en el request." }
      });
    }

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: typeof body.temperature === "number" ? body.temperature : 0,
        messages
      })
    });

    const raw = await anthropicResponse.text();

    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (error) {
      console.error("Anthropic devolvió texto no JSON:", raw);
      return res.status(500).json({
        error: { message: "Anthropic devolvió una respuesta inválida." }
      });
    }

    if (!anthropicResponse.ok) {
      console.error("Error de Anthropic:", data);
      return res.status(anthropicResponse.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error en /api/generate:", error);
    return res.status(500).json({
      error: { message: error.message || "Error interno en /api/generate" }
    });
  }
};

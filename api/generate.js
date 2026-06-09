// api/generate.js
const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('FALTA ANTHROPIC_API_KEY');
    return res.status(500).json({ error: { message: 'API key no configurada.' } });
  }

  const body = req.body || {};
  const payload = JSON.stringify({
    model: body.model || 'claude-sonnet-4-6',
    max_tokens: body.max_tokens || 2000,
    messages: Array.isArray(body.messages) ? body.messages : []
  });

  console.log('Llamando a Anthropic, modelo:', body.model, 'tokens:', body.max_tokens);

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => {
        console.log('Respuesta de Anthropic, status:', response.statusCode, 'bytes:', data.length);
        try {
          const parsed = JSON.parse(data);
          res.status(response.statusCode).json(parsed);
        } catch (e) {
          console.error('JSON inválido de Anthropic:', data.substring(0, 500));
          res.status(500).json({ error: { message: 'Respuesta inválida de Anthropic.' } });
        }
        resolve();
      });
    });

    request.on('error', (e) => {
      console.error('Error HTTPS:', e.message);
      res.status(500).json({ error: { message: e.message } });
      resolve();
    });

    request.setTimeout(55000, () => {
      console.error('Timeout esperando respuesta de Anthropic');
      request.destroy();
      res.status(504).json({ error: { message: 'Tiempo de espera agotado. Intentá de nuevo.' } });
      resolve();
    });

    request.write(payload);
    request.end();
  });
};
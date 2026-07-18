// api/generate.js
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const PRODUCT_CODE = process.env.HOTMART_PRODUCT_CODE || 'W106077396L';

function getAdminClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw new Error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function requireProductAccess(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, status: 401, message: 'Necesitás iniciar sesión.' };

  const admin = getAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  const user = authData?.user;
  if (authError || !user) return { ok: false, status: 401, message: 'La sesión no es válida.' };

  const email = String(user.email || '').toLowerCase().trim();
  const activeStatuses = ['active', 'legacy'];

  let { data, error } = await admin
    .from('access_entitlements')
    .select('id')
    .eq('product_code', PRODUCT_CODE)
    .eq('user_id', user.id)
    .in('status', activeStatuses)
    .limit(1);

  if (error) throw error;

  if (!data?.length && email) {
    const byEmail = await admin
      .from('access_entitlements')
      .select('id')
      .eq('product_code', PRODUCT_CODE)
      .ilike('email', email)
      .in('status', activeStatuses)
      .limit(1);
    if (byEmail.error) throw byEmail.error;
    data = byEmail.data;
  }

  if (!data?.length) return { ok: false, status: 403, message: 'La compra todavía no está habilitada para esta cuenta.' };

  return { ok: true, user };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } });

  try {
    const access = await requireProductAccess(req);
    if (!access.ok) return res.status(access.status).json({ error: { message: access.message } });
  } catch (error) {
    console.error('Error verificando acceso:', error);
    return res.status(500).json({ error: { message: 'No pudimos verificar el acceso al producto.' } });
  }

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
      request.destroy();
      res.status(504).json({ error: { message: 'Tiempo de espera agotado. Intentá de nuevo.' } });
      resolve();
    });

    request.write(payload);
    request.end();
  });
};

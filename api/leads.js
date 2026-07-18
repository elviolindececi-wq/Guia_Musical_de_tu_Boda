const { createClient } = require('@supabase/supabase-js');

const DEFAULT_CHECKOUT = 'https://pay.hotmart.com/W106077396L?checkoutMode=10&bid=1783991520846';
const PRODUCT_CODE = process.env.HOTMART_PRODUCT_CODE || 'W106077396L';

function getAdminClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw new Error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validPhone(value) {
  return /^\+[1-9]\d{7,15}$/.test(value);
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const email = String(body.email || '').toLowerCase().trim();
    const phone = String(body.phone || '').replace(/[\s()-]/g, '');
    const name = String(body.name || '').trim().slice(0, 140);
    const country = String(body.country || '').toUpperCase().slice(0, 2);
    const callingCode = String(body.calling_code || '').replace(/\D/g, '').slice(0, 4);
    const demoKey = body.demo_key ? String(body.demo_key).slice(0, 180) : null;

    if (!validEmail(email)) return res.status(400).json({ error: 'Email inválido.' });
    if (!validPhone(phone)) return res.status(400).json({ error: 'Celular internacional inválido.' });

    const admin = getAdminClient();
    const { data: lead, error } = await admin
      .from('purchase_leads')
      .insert({
        product_code: PRODUCT_CODE,
        name: name || null,
        email,
        phone_e164: phone,
        country_iso: country || null,
        demo_key: demoKey,
        source: 'app_demo',
        status: 'checkout_started',
      })
      .select('id')
      .single();

    if (error) throw error;

    const checkout = new URL(process.env.HOTMART_CHECKOUT_URL || DEFAULT_CHECKOUT);
    checkout.searchParams.set('email', email);
    if (name) checkout.searchParams.set('name', name);
    if (callingCode && phone.startsWith(`+${callingCode}`)) {
      checkout.searchParams.set('phoneac', callingCode);
      checkout.searchParams.set('phonenumber', phone.slice(callingCode.length + 1));
    }
    checkout.searchParams.set('src', 'app_demo');
    checkout.searchParams.set('sck', 'app_demo');
    checkout.searchParams.set('xcod', lead.id);

    return res.status(200).json({ checkout_url: checkout.toString(), lead_id: lead.id });
  } catch (error) {
    console.error('lead error:', error);
    return res.status(500).json({ error: 'No pudimos guardar tus datos antes del pago.' });
  }
};

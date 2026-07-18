const { createClient } = require('@supabase/supabase-js');

const PRODUCT_CODE = process.env.HOTMART_PRODUCT_CODE || 'W106077396L';

function getAdminClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw new Error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

function normalizeStatus(eventName, purchaseStatus) {
  const event = String(eventName || '').toUpperCase();
  const status = String(purchaseStatus || '').toUpperCase();
  if (['PURCHASE_APPROVED', 'PURCHASE_COMPLETE'].includes(event) || ['APPROVED', 'COMPLETE'].includes(status)) return 'active';
  if (event === 'PURCHASE_REFUNDED' || status === 'REFUNDED' || status === 'PARTIALLY_REFUNDED') return 'refunded';
  if (event === 'PURCHASE_CHARGEBACK' || status === 'CHARGEBACK') return 'chargeback';
  if (event === 'PURCHASE_CANCELED' || status === 'CANCELLED') return 'canceled';
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const expectedHottok = process.env.HOTMART_HOTTOK;
    const receivedHottok = req.headers['x-hotmart-hottok'];
    if (!expectedHottok || !receivedHottok || receivedHottok !== expectedHottok) {
      return res.status(401).json({ error: 'Invalid Hotmart token' });
    }

    const payload = req.body || {};
    const data = payload.data || {};
    const buyer = data.buyer || {};
    const product = data.product || {};
    const purchase = data.purchase || {};

    const configuredProductId = process.env.HOTMART_PRODUCT_ID;
    const configuredProductUcode = process.env.HOTMART_PRODUCT_UCODE;
    if (configuredProductId && String(product.id) !== String(configuredProductId)) {
      return res.status(200).json({ ok: true, ignored: 'different_product' });
    }
    if (configuredProductUcode && String(product.ucode) !== String(configuredProductUcode)) {
      return res.status(200).json({ ok: true, ignored: 'different_product' });
    }

    const entitlementStatus = normalizeStatus(payload.event, purchase.status);
    if (!entitlementStatus) return res.status(200).json({ ok: true, ignored: 'event_without_access_change' });

    const email = String(buyer.email || '').toLowerCase().trim();
    const transaction = String(purchase.transaction || '').trim();
    if (!email || !transaction) return res.status(400).json({ error: 'Webhook without buyer email or transaction.' });

    const admin = getAdminClient();
    const entitlementPayload = {
      product_code: PRODUCT_CODE,
      email,
      status: entitlementStatus,
      source: 'hotmart',
      hotmart_transaction: transaction,
      hotmart_event_id: String(payload.id || ''),
      hotmart_product_id: product.id || null,
      hotmart_product_ucode: product.ucode || null,
      buyer_name: buyer.name || null,
      buyer_phone: buyer.checkout_phone || null,
      purchased_at: purchase.approved_date ? new Date(Number(purchase.approved_date)).toISOString() : null,
      revoked_at: entitlementStatus === 'active' ? null : new Date().toISOString(),
      last_event: String(payload.event || purchase.status || ''),
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error: saveError } = await admin
      .from('access_entitlements')
      .upsert(entitlementPayload, { onConflict: 'hotmart_transaction' })
      .select('id,status,email,user_id')
      .single();
    if (saveError) throw saveError;

    if (entitlementStatus === 'active') {
      await admin
        .from('purchase_leads')
        .update({ status: 'purchased', hotmart_transaction: transaction, converted_at: new Date().toISOString() })
        .eq('product_code', PRODUCT_CODE)
        .ilike('email', email)
        .in('status', ['new', 'checkout_started']);
    }

    return res.status(200).json({ ok: true, entitlement: saved });
  } catch (error) {
    console.error('hotmart webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }
};

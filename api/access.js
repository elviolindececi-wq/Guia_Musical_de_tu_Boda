const { createClient } = require('@supabase/supabase-js');

const PRODUCT_CODE = process.env.HOTMART_PRODUCT_CODE || 'W106077396L';

function getAdminClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw new Error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return res.status(401).json({ error: 'Falta el token de sesión.' });

    const admin = getAdminClient();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    const user = authData?.user;
    if (authError || !user) return res.status(401).json({ error: 'Sesión inválida.' });

    const normalizedEmail = String(user.email || '').toLowerCase().trim();
    const activeStatuses = ['active', 'legacy'];

    let { data: entitlement, error } = await admin
      .from('access_entitlements')
      .select('id,status,source,purchased_at,hotmart_transaction,user_id,email')
      .eq('product_code', PRODUCT_CODE)
      .eq('user_id', user.id)
      .in('status', activeStatuses)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!entitlement && normalizedEmail) {
      const byEmail = await admin
        .from('access_entitlements')
        .select('id,status,source,purchased_at,hotmart_transaction,user_id,email')
        .eq('product_code', PRODUCT_CODE)
        .ilike('email', normalizedEmail)
        .in('status', activeStatuses)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (byEmail.error) throw byEmail.error;
      entitlement = byEmail.data;

      if (entitlement && !entitlement.user_id) {
        const linked = await admin
          .from('access_entitlements')
          .update({ user_id: user.id, updated_at: new Date().toISOString() })
          .eq('id', entitlement.id)
          .select('id,status,source,purchased_at,hotmart_transaction,user_id,email')
          .single();
        if (linked.error) throw linked.error;
        entitlement = linked.data;
      }
    }

    return res.status(200).json({
      has_access: !!entitlement,
      entitlement: entitlement || null,
      product_code: PRODUCT_CODE,
    });
  } catch (error) {
  console.error('access error:', {
    message: error?.message,
    code: error?.code,
    status: error?.status,
    details: error?.details,
    hint: error?.hint,
  });

  return res.status(500).json({
    error: 'No pudimos verificar el acceso.',
    detail: error?.message || 'Error desconocido',
    code: error?.code || null,
  });
}
};
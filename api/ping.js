// api/ping.js — Keep-alive para Supabase Free
// Llamar cada 5 días desde cron-job.org → https://guia-musical-de-tu-boda.vercel.app/api/ping

export default async function handler(req, res) {
  const SB_URL = process.env.VITE_SUPABASE_URL;
  const SB_KEY = process.env.VITE_SUPABASE_ANON_KEY;

  if (!SB_URL || !SB_KEY) {
    return res.status(500).json({ ok: false, error: "Missing env vars" });
  }

  try {
    const r = await fetch(`${SB_URL}/rest/v1/wedding_data?select=user_id&limit=1`, {
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
      },
    });

    if (!r.ok) throw new Error(`Supabase status ${r.status}`);

    res.status(200).json({
      ok: true,
      timestamp: new Date().toISOString(),
      message: "Supabase activo \u2713",
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
// api/update-business.js — Update business profile (bypasses RLS)

const SB_URL = 'https://cfbknvjkknhfsxnrejlc.supabase.co';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYmtudmpra25oZnN4bnJlamxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDU1NzQsImV4cCI6MjA5NjU4MTU3NH0.BEwgucGKJzc_cdZElcozwoogz8oIbwz6lAu9wom1zHk';

  const { business_id, ...row } = req.body || {};
  if (!business_id) return res.status(400).json({ error: 'business_id required' });
  delete row.id;
  delete row.line_user_id;
  delete row.plan;
  delete row.plan_started_at;
  delete row.plan_expire_at;

  const sbRes = await fetch(`${SB_URL}/rest/v1/businesses?id=eq.${business_id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });

  if (!sbRes.ok) {
    const err = await sbRes.text();
    console.error('update-business error:', err);
    return res.status(500).json({ error: err });
  }

  return res.status(200).json({ ok: true });
}

// api/create-business.js — Create/upsert business for LINE users (bypasses RLS)

const SB_URL = 'https://cfbknvjkknhfsxnrejlc.supabase.co';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYmtudmpra25oZnN4bnJlamxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDU1NzQsImV4cCI6MjA5NjU4MTU3NH0.BEwgucGKJzc_cdZElcozwoogz8oIbwz6lAu9wom1zHk';

  const { line_user_id, name, tax_id, type, display_name, picture_url } = req.body || {};
  if (!line_user_id || !name) return res.status(400).json({ error: 'line_user_id and name required' });

  const headers = {
    'Content-Type': 'application/json',
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Prefer: 'return=representation,resolution=merge-duplicates',
  };

  const sbRes = await fetch(`${SB_URL}/rest/v1/businesses`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ line_user_id, name, tax_id: tax_id || '', type: type || 'general', display_name: display_name || '', picture_url: picture_url || '', plan: 'basic' }),
  });

  const data = await sbRes.json().catch(() => null);
  if (!sbRes.ok) {
    console.error('create-business error:', data);
    return res.status(500).json({ error: data });
  }

  return res.status(200).json({ data: Array.isArray(data) ? data[0] : data });
}

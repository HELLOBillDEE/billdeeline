// api/approve-payment.js — Admin approves payment, upgrades plan via service_role

const SB_URL = 'https://cfbknvjkknhfsxnrejlc.supabase.co';
const LINE_CHANNEL_TOKEN = process.env.LINE_CHANNEL_TOKEN ||
  '8MnBH/AU7cLLkHQq69OzB5oPUPjttbNICw6Qy6yjqD3vajB6n4D4b7jjtuBem1i4pcIIjDImYRs2Zfz5Ow1bwpVRN09VCIDoR3/AnJnYUev9/Zf0wV2ey3QymCdfmtriOVbYxhiZoRak9u2buHS/mAdB04t89/1O/w1cDnyilFU=';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYmtudmpra25oZnN4bnJlamxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDU1NzQsImV4cCI6MjA5NjU4MTU3NH0.BEwgucGKJzc_cdZElcozwoogz8oIbwz6lAu9wom1zHk';

  const { payment_id, business_id, plan } = req.body || {};
  if (!payment_id || !business_id || !plan) {
    return res.status(400).json({ error: 'payment_id, business_id, plan required' });
  }

  const now = new Date().toISOString();
  const expire = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
  const headers = { 'Content-Type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'return=minimal' };

  // 1. Update payment_requests status
  const r1 = await fetch(`${SB_URL}/rest/v1/payment_requests?id=eq.${payment_id}`, {
    method: 'PATCH', headers,
    body: JSON.stringify({ status: 'approved', approved_at: now }),
  });

  // 2. Upgrade businesses.plan
  const r2 = await fetch(`${SB_URL}/rest/v1/businesses?id=eq.${business_id}`, {
    method: 'PATCH', headers,
    body: JSON.stringify({ plan, plan_started_at: now, plan_expire_at: expire }),
  });

  const err1 = r1.ok ? null : await r1.text();
  const err2 = r2.ok ? null : await r2.text();
  if (err1 || err2) {
    console.error('approve-payment error:', err1, err2);
    return res.status(500).json({ error: err1 || err2 });
  }

  // 3. Notify user via LINE
  await fetch('https://billdeeline-git-main-billdee-s-projects.vercel.app/api/notify-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ business_id, plan }),
  }).catch(e => console.warn('notify-user failed:', e.message));

  return res.status(200).json({ ok: true });
}

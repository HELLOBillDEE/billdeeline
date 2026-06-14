// api/approve-payment.js — Admin approves payment (requires ADMIN_SECRET header)
import { getConfig, requireServiceKey, rateLimit, sanitize, setSecurityHeaders,
         isValidUUID, isValidPlan, isAdmin } from './_lib/config.js';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  if (!rateLimit(ip, 20)) return res.status(429).json({ error: 'Too many requests' });

  // Admin-only endpoint — must supply x-admin-secret header
  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const serviceKey = requireServiceKey(res);
  if (!serviceKey) return;

  const { SB_URL } = getConfig();
  const payment_id  = sanitize(req.body?.payment_id);
  const business_id = sanitize(req.body?.business_id);
  const plan        = sanitize(req.body?.plan);

  if (!payment_id || !business_id || !plan) {
    return res.status(400).json({ error: 'payment_id, business_id, plan required' });
  }
  if (!isValidUUID(payment_id) || !isValidUUID(business_id)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  if (!isValidPlan(plan)) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  const now    = new Date().toISOString();
  const expire = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
  const hdrs   = {
    'Content-Type': 'application/json',
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Prefer: 'return=minimal',
  };

  const [r1, r2] = await Promise.all([
    fetch(`${SB_URL}/rest/v1/payment_requests?id=eq.${payment_id}`, {
      method: 'PATCH', headers: hdrs,
      body: JSON.stringify({ status: 'approved', approved_at: now }),
    }),
    fetch(`${SB_URL}/rest/v1/businesses?id=eq.${business_id}`, {
      method: 'PATCH', headers: hdrs,
      body: JSON.stringify({ plan, plan_started_at: now, plan_expire_at: expire }),
    }),
  ]);

  if (!r1.ok || !r2.ok) {
    console.error('[approve-payment] error:', await r1.text(), await r2.text());
    return res.status(500).json({ error: 'Failed to approve payment' });
  }

  // Notify user
  await fetch(`${process.env.VERCEL_URL ? 'https://'+process.env.VERCEL_URL : ''}/api/notify-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ business_id, plan }),
  }).catch(e => console.warn('[approve-payment] notify-user failed:', e.message));

  return res.status(200).json({ ok: true });
}

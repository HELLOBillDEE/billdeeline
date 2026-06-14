// api/approve-payment.js — Admin approves payment, upgrades plan via service_role

import { getConfig, requireServiceKey, rateLimit, sanitize, setSecurityHeaders } from './_lib/config.js';

export default async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  if (!rateLimit(ip, 20)) return res.status(429).json({ error: 'Too many requests' });

  const serviceKey = requireServiceKey(res);
  if (!serviceKey) return;

  const { SB_URL } = getConfig();

  const payment_id = sanitize(req.body?.payment_id);
  const business_id = sanitize(req.body?.business_id);
  const plan = sanitize(req.body?.plan);

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
    return res.status(500).json({ error: 'Failed to approve payment' });
  }

  // 3. Notify user via LINE
  await fetch('https://billdeeline-git-main-billdee-s-projects.vercel.app/api/notify-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ business_id, plan }),
  }).catch(e => console.warn('notify-user failed:', e.message));

  return res.status(200).json({ ok: true });
}

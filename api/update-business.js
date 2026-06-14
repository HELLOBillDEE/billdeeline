// api/update-business.js — Update business profile (bypasses RLS)

import { getConfig, requireServiceKey, rateLimit, sanitize, setSecurityHeaders } from './_lib/config.js';

export default async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  if (!rateLimit(ip, 30)) return res.status(429).json({ error: 'Too many requests' });

  const serviceKey = requireServiceKey(res);
  if (!serviceKey) return;

  const { SB_URL } = getConfig();

  const { business_id: rawId, ...rawRow } = req.body || {};
  const business_id = sanitize(rawId);
  if (!business_id) return res.status(400).json({ error: 'business_id required' });

  // Sanitize all string fields in the row
  const row = {};
  for (const [k, v] of Object.entries(rawRow)) {
    row[k] = typeof v === 'string' ? sanitize(v) : v;
  }

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
    return res.status(500).json({ error: 'Failed to update business' });
  }

  return res.status(200).json({ ok: true });
}

// api/create-business.js — Create/upsert business for LINE users (bypasses RLS)

import { getConfig, requireServiceKey, rateLimit, sanitize, setSecurityHeaders } from './_lib/config.js';

export default async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  if (!rateLimit(ip, 30)) return res.status(429).json({ error: 'Too many requests' });

  const serviceKey = requireServiceKey(res);
  if (!serviceKey) return;

  const { SB_URL } = getConfig();

  const line_user_id = sanitize(req.body?.line_user_id);
  const name = sanitize(req.body?.name);
  const tax_id = sanitize(req.body?.tax_id);
  const type = sanitize(req.body?.type);
  const display_name = sanitize(req.body?.display_name);
  const picture_url = sanitize(req.body?.picture_url);

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
    return res.status(500).json({ error: 'Failed to create business' });
  }

  return res.status(200).json({ data: Array.isArray(data) ? data[0] : data });
}

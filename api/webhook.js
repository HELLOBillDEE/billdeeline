// api/webhook.js — Outbound webhook to Zapier / n8n / Make (Pro plan)
import { getConfig, requireServiceKey, rateLimit, sanitize, setSecurityHeaders,
         isValidUUID, isSafeWebhookUrl } from './_lib/config.js';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  if (!rateLimit(ip, 30)) return res.status(429).json({ error: 'Too many requests' });

  const serviceKey = requireServiceKey(res);
  if (!serviceKey) return;

  const { SB_URL } = getConfig();
  const business_id = sanitize(req.body?.business_id);
  const event       = sanitize(req.body?.event, 64);
  const payload     = req.body?.payload;

  if (!business_id || !event || !payload) {
    return res.status(400).json({ error: 'business_id, event, payload required' });
  }
  if (!isValidUUID(business_id)) {
    return res.status(400).json({ error: 'Invalid business_id' });
  }

  const bizRes = await fetch(
    `${SB_URL}/rest/v1/businesses?id=eq.${business_id}&select=plan,webhook_url,name`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const bizData = await bizRes.json();
  const biz = bizData?.[0];
  if (!biz) return res.status(404).json({ error: 'Business not found' });
  if (biz.plan !== 'pro') return res.status(403).json({ error: 'Pro plan required' });
  if (!biz.webhook_url) return res.status(200).json({ ok: true, skipped: 'no webhook_url' });

  // SSRF protection — block internal/private URLs
  if (!isSafeWebhookUrl(biz.webhook_url)) {
    console.error('[webhook] unsafe URL blocked:', biz.webhook_url);
    return res.status(400).json({ error: 'Invalid webhook URL' });
  }

  const webhookPayload = {
    event,
    business_name: biz.name,
    business_id,
    timestamp: new Date().toISOString(),
    data: payload,
  };

  let webhookStatus = null;
  let webhookError  = null;
  try {
    const whRes = await fetch(biz.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-BillDEE-Event': event },
      body: JSON.stringify(webhookPayload),
      signal: AbortSignal.timeout(8000), // 8s timeout — prevent hanging
    });
    webhookStatus = whRes.status;
    if (!whRes.ok) {
      console.error('[webhook] delivery failed:', whRes.status);
      webhookError = `Delivery failed: ${whRes.status}`;
    }
  } catch (e) {
    console.error('[webhook] delivery error:', e.message);
    webhookError = 'Webhook delivery error';
  }

  // Log delivery
  try {
    await fetch(`${SB_URL}/rest/v1/webhook_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ business_id, event, webhook_url: biz.webhook_url,
        status: webhookStatus, error: webhookError, payload: webhookPayload }),
    });
  } catch (e) {
    console.error('[webhook] log error:', e.message);
  }

  return res.status(200).json({ ok: !webhookError, error: webhookError || undefined });
}

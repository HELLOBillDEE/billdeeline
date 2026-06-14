// api/webhook.js — Outbound webhook to Zapier / n8n / Make (Pro plan)
// Fires when: new transaction saved, new bill issued, payment received
// User configures their webhook URL in business settings

const SB_URL = 'https://cfbknvjkknhfsxnrejlc.supabase.co';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYmtudmpra25oZnN4bnJlamxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDU1NzQsImV4cCI6MjA5NjU4MTU3NH0.BEwgucGKJzc_cdZElcozwoogz8oIbwz6lAu9wom1zHk';

  const { business_id, event, payload } = req.body || {};
  if (!business_id || !event || !payload) {
    return res.status(400).json({ error: 'business_id, event, payload required' });
  }

  // Verify business exists and is Pro plan
  const bizRes = await fetch(`${SB_URL}/rest/v1/businesses?id=eq.${business_id}&select=plan,webhook_url,name`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  const bizData = await bizRes.json();
  const biz = bizData?.[0];
  if (!biz) return res.status(404).json({ error: 'Business not found' });
  if (biz.plan !== 'pro') return res.status(403).json({ error: 'Pro plan required for webhooks' });
  if (!biz.webhook_url) return res.status(200).json({ ok: true, skipped: 'no webhook_url configured' });

  // Send webhook
  const webhookPayload = {
    event,
    business_name: biz.name,
    business_id,
    timestamp: new Date().toISOString(),
    data: payload,
  };

  let webhookStatus = null;
  let webhookError = null;
  try {
    const whRes = await fetch(biz.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-BillDEE-Event': event },
      body: JSON.stringify(webhookPayload),
    });
    webhookStatus = whRes.status;
    if (!whRes.ok) {
      const errText = await whRes.text();
      webhookError = `${whRes.status}: ${errText.slice(0, 200)}`;
    }
  } catch (e) {
    webhookError = e.message;
  }

  // Log to webhook_logs table
  try {
    await fetch(`${SB_URL}/rest/v1/webhook_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        business_id,
        event,
        webhook_url: biz.webhook_url,
        status: webhookStatus,
        error: webhookError,
        payload: webhookPayload,
      }),
    });
  } catch (e) {
    console.error('Failed to log webhook:', e.message);
  }

  if (webhookError) {
    return res.status(200).json({ ok: false, error: webhookError, status: webhookStatus });
  }
  return res.status(200).json({ ok: true, status: webhookStatus });
}

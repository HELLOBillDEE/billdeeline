// api/save-payment.js — Save payment request + LINE notify admin

import { getConfig, requireServiceKey, rateLimit, sanitize, setSecurityHeaders } from './_lib/config.js';

const ADMIN_LINE_ID = 'U96ea6930e32013f700ff5933eb4b8dc6';

export default async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  if (!rateLimit(ip, 20)) return res.status(429).json({ error: 'Too many requests' });

  const serviceKey = requireServiceKey(res);
  if (!serviceKey) return;

  const { SB_URL, LINE_TOKEN } = getConfig();
  if (!LINE_TOKEN) {
    return res.status(500).json({ error: 'Server misconfigured: LINE_CHANNEL_TOKEN not set' });
  }

  const body = req.body;
  if (!body) return res.status(400).json({ error: 'Invalid body' });

  // Sanitize string inputs
  const ref_code = sanitize(body.ref_code);
  const business_id = sanitize(body.business_id);
  const biz_name = sanitize(body.biz_name);
  const plan = sanitize(body.plan);
  const amount = sanitize(String(body.amount ?? ''));
  const status = sanitize(body.status);

  // Check ref_code not already used (1 slip 1 use)
  if (ref_code) {
    const dupCheck = await fetch(
      `${SB_URL}/rest/v1/payment_requests?ref_code=eq.${encodeURIComponent(ref_code)}&status=neq.rejected&select=id&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const dupData = dupCheck.ok ? await dupCheck.json() : [];
    if (dupData.length > 0) {
      return res.status(409).json({ error: 'slip_already_used', message: 'สลิปนี้ถูกใช้งานแล้ว ไม่สามารถใช้ซ้ำได้' });
    }
  }

  // Check business_id not already pending (prevent duplicate submissions)
  if (business_id) {
    const pendingCheck = await fetch(
      `${SB_URL}/rest/v1/payment_requests?business_id=eq.${business_id}&status=in.(pending,auto_approved)&select=id&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const pendingData = pendingCheck.ok ? await pendingCheck.json() : [];
    if (pendingData.length > 0) {
      return res.status(409).json({ error: 'already_pending', message: 'มีรายการรอตรวจสอบอยู่แล้ว กรุณารอการอนุมัติก่อน' });
    }
  }

  // Save to Supabase
  const sbRes = await fetch(`${SB_URL}/rest/v1/payment_requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(body),
  });

  if (!sbRes.ok) {
    const err = await sbRes.text();
    console.error('save-payment error:', err);
    return res.status(500).json({ error: 'Failed to save payment request' });
  }

  // Push LINE message to admin
  const planName = { basic: 'Basic ฿109', smart: 'Smart ฿499', pro: 'Pro ฿1,190' }[plan] || plan;
  const aiStatus = body.ai_verified ? '✅ AI ยืนยันอัตโนมัติ' : '⏳ รอตรวจสอบ';
  const adminMsg = {
    to: ADMIN_LINE_ID,
    messages: [{
      type: 'text',
      text: `💰 สลิปใหม่เข้า! BillDEE\n👤 ${biz_name || 'ไม่ระบุ'}\n📦 ${planName}\n💵 ฿${amount}\n🔖 ref: ${ref_code}\n${aiStatus}\n👉 https://billdeeline-git-main-billdee-s-projects.vercel.app/admin.html`
    }]
  };

  // If auto_approved, upgrade plan directly (LINE users can't update via RLS)
  let planUpgraded = false;
  let planError = null;
  if (status === 'auto_approved' && business_id && plan) {
    const expire = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
    try {
      const planRes = await fetch(`${SB_URL}/rest/v1/businesses?id=eq.${business_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          plan,
          plan_started_at: new Date().toISOString(),
          plan_expire_at: expire,
        }),
      });
      if (planRes.ok) {
        planUpgraded = true;
      } else {
        const rawPlanError = await planRes.text();
        console.error('plan upgrade failed:', rawPlanError);
        planError = 'Plan upgrade failed';
      }
    } catch (e) {
      console.error('plan upgrade error:', e.message);
      planError = 'Plan upgrade error';
    }
  }

  let lineError = null;
  try {
    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_TOKEN}` },
      body: JSON.stringify(adminMsg),
    });
    if (!lineRes.ok) {
      const rawLineError = await lineRes.json().catch(() => ({}));
      console.error('LINE push admin failed:', JSON.stringify(rawLineError));
      lineError = 'LINE notification failed';
    }
  } catch (e) {
    console.error('LINE push admin error:', e.message);
    lineError = 'LINE notification error';
  }

  return res.status(200).json({ ok: true, plan_upgraded: planUpgraded, plan_error: planError, line_error: lineError });
}

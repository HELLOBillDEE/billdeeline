// api/save-payment.js — Save payment request + LINE notify admin

const SB_URL = 'https://cfbknvjkknhfsxnrejlc.supabase.co';
const LINE_CHANNEL_TOKEN = process.env.LINE_CHANNEL_TOKEN ||
  '8MnBH/AU7cLLkHQq69OzB5oPUPjttbNICw6Qy6yjqD3vajB6n4D4b7jjtuBem1i4pcIIjDImYRs2Zfz5Ow1bwpVRN09VCIDoR3/AnJnYUev9/Zf0wV2ey3QymCdfmtriOVbYxhiZoRak9u2buHS/mAdB04t89/1O/w1cDnyilFU=';
const ADMIN_LINE_ID = 'U96ea6930e32013f700ff5933eb4b8dc6';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYmtudmpra25oZnN4bnJlamxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDU1NzQsImV4cCI6MjA5NjU4MTU3NH0.BEwgucGKJzc_cdZElcozwoogz8oIbwz6lAu9wom1zHk';

  const body = req.body;
  if (!body) return res.status(400).json({ error: 'Invalid body' });

  // Check ref_code not already used (1 slip 1 use)
  if (body.ref_code) {
    const dupCheck = await fetch(
      `${SB_URL}/rest/v1/payment_requests?ref_code=eq.${encodeURIComponent(body.ref_code)}&status=neq.rejected&select=id&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const dupData = dupCheck.ok ? await dupCheck.json() : [];
    if (dupData.length > 0) {
      return res.status(409).json({ error: 'slip_already_used', message: 'สลิปนี้ถูกใช้งานแล้ว ไม่สามารถใช้ซ้ำได้' });
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
    return res.status(500).json({ error: err });
  }

  // Push LINE message to admin
  const planName = { basic: 'Basic ฿109', smart: 'Smart ฿499', pro: 'Pro ฿1,190' }[body.plan] || body.plan;
  const aiStatus = body.ai_verified ? '✅ AI ยืนยันอัตโนมัติ' : '⏳ รอตรวจสอบ';
  const adminMsg = {
    to: ADMIN_LINE_ID,
    messages: [{
      type: 'text',
      text: `💰 สลิปใหม่เข้า! BillDEE\n👤 ${body.biz_name||'ไม่ระบุ'}\n📦 ${planName}\n💵 ฿${body.amount}\n🔖 ref: ${body.ref_code}\n${aiStatus}\n👉 https://billdeeline-git-main-billdee-s-projects.vercel.app/admin.html`
    }]
  };

  // If auto_approved, upgrade plan directly (LINE users can't update via RLS)
  if (body.status === 'auto_approved' && body.business_id && body.plan) {
    const expire = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
    await fetch(`${SB_URL}/rest/v1/businesses?id=eq.${body.business_id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        plan: body.plan,
        plan_started_at: new Date().toISOString(),
        plan_expire_at: expire,
      }),
    }).catch(e => console.warn('plan upgrade error:', e.message));
  }

  let lineError = null;
  try {
    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_CHANNEL_TOKEN}` },
      body: JSON.stringify(adminMsg),
    });
    if (!lineRes.ok) {
      lineError = await lineRes.json().catch(() => ({}));
      console.error('LINE push admin failed:', JSON.stringify(lineError));
    }
  } catch (e) {
    lineError = e.message;
    console.error('LINE push admin error:', e.message);
  }

  return res.status(200).json({ ok: true, line_error: lineError });
}

// api/save-payment.js — Save payment request + LINE Notify admin

export const config = { runtime: 'edge' };

const SB_URL = 'https://cfbknvjkknhfsxnrejlc.supabase.co';
const LINE_NOTIFY_TOKEN = process.env.LINE_NOTIFY_TOKEN ||
  '8MnBH/AU7cLLkHQq69OzB5oPUPjttbNICw6Qy6yjqD3vajB6n4D4b7jjtuBem1i4pcIIjDImYRs2Zfz5Ow1bwpVRN09VCIDoR3/AnJnYUev9/Zf0wV2ey3QymCdfmtriOVbYxhiZoRak9u2buHS/mAdB04t89/1O/w1cDnyilFU=';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYmtudmpra25oZnN4bnJlamxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDU1NzQsImV4cCI6MjA5NjU4MTU3NH0.BEwgucGKJzc_cdZElcozwoogz8oIbwz6lAu9wom1zHk';

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  // Save to Supabase
  const res = await fetch(`${SB_URL}/rest/v1/payment_requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('save-payment error:', err);
    return new Response(JSON.stringify({ error: err }), { status: 500 });
  }

  // LINE Notify admin
  const planName = { basic: 'Basic ฿109', smart: 'Smart ฿499', pro: 'Pro ฿1,190' }[body.plan] || body.plan;
  const aiStatus = body.ai_verified ? '✅ AI ยืนยันอัตโนมัติ' : '⏳ รอตรวจสอบ';
  const msg = `\n💰 สลิปใหม่เข้า! BillDEE\n` +
    `👤 ${body.biz_name || 'ไม่ระบุ'}\n` +
    `📦 ${planName}\n` +
    `💵 ฿${body.amount}\n` +
    `🔖 ref: ${body.ref_code}\n` +
    `${aiStatus}\n` +
    `👉 approve: https://billdeeline-git-main-billdee-s-projects.vercel.app/admin.html`;

  await fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LINE_NOTIFY_TOKEN}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `message=${encodeURIComponent(msg)}`,
  }).catch(e => console.warn('LINE Notify failed:', e));

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

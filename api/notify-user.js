// api/notify-user.js — Push LINE message to user after admin approves payment

const LINE_CHANNEL_TOKEN = process.env.LINE_CHANNEL_TOKEN ||
  '8MnBH/AU7cLLkHQq69OzB5oPUPjttbNICw6Qy6yjqD3vajB6n4D4b7jjtuBem1i4pcIIjDImYRs2Zfz5Ow1bwpVRN09VCIDoR3/AnJnYUev9/Zf0wV2ey3QymCdfmtriOVbYxhiZoRak9u2buHS/mAdB04t89/1O/w1cDnyilFU=';

const SB_URL = 'https://cfbknvjkknhfsxnrejlc.supabase.co';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYmtudmpra25oZnN4bnJlamxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDU1NzQsImV4cCI6MjA5NjU4MTU3NH0.BEwgucGKJzc_cdZElcozwoogz8oIbwz6lAu9wom1zHk';

  const { business_id, plan } = req.body || {};
  if (!business_id) return res.status(400).json({ error: 'business_id required' });

  // Get LINE user ID from businesses table
  const bizRes = await fetch(
    `${SB_URL}/rest/v1/businesses?id=eq.${business_id}&select=line_user_id,name&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const bizData = bizRes.ok ? await bizRes.json() : [];
  const biz = bizData?.[0];

  if (!biz?.line_user_id) {
    return res.status(404).json({ error: 'No LINE user found' });
  }

  const planName = { basic: 'Basic', smart: 'Smart', pro: 'Pro' }[plan] || plan;
  const appUrl = 'https://liff.line.me/2010347722-o8ofu42K';

  const message = {
    to: biz.line_user_id,
    messages: [{
      type: 'flex',
      altText: `🎉 BillDEE ${planName} พร้อมใช้งานแล้ว!`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box', layout: 'vertical',
          backgroundColor: '#0b6b73', paddingAll: '16px',
          contents: [{
            type: 'text', text: '💚 BillDEE',
            color: '#ffffff', size: 'sm', weight: 'bold'
          }]
        },
        body: {
          type: 'box', layout: 'vertical', spacing: 'md',
          contents: [
            { type: 'text', text: '🎉 อัปเกรดสำเร็จแล้ว!', weight: 'bold', size: 'xl', color: '#0b6b73' },
            { type: 'text', text: `แพ็กเกจ BillDEE ${planName} พร้อมใช้งานแล้วครับ`, wrap: true, color: '#555555', size: 'sm' },
            {
              type: 'box', layout: 'vertical', margin: 'lg',
              backgroundColor: '#f0fdf4', cornerRadius: '10px', paddingAll: '12px',
              contents: [
                { type: 'text', text: `📦 ${planName} Plan`, weight: 'bold', color: '#065f46' },
                { type: 'text', text: `👤 ${biz.name || 'กิจการของคุณ'}`, size: 'sm', color: '#374151', margin: 'sm' },
              ]
            }
          ]
        },
        footer: {
          type: 'box', layout: 'vertical',
          contents: [{
            type: 'button', style: 'primary',
            color: '#0b6b73',
            action: { type: 'uri', label: '🚀 เริ่มใช้งาน BillDEE', uri: appUrl }
          }]
        }
      }
    }]
  };

  const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_CHANNEL_TOKEN}` },
    body: JSON.stringify(message),
  });

  const lineResult = await lineRes.json().catch(() => ({}));
  if (!lineRes.ok) {
    console.error('LINE push failed:', lineResult);
    return res.status(500).json({ error: lineResult });
  }

  return res.status(200).json({ ok: true });
}

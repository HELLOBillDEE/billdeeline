// api/notify-user.js — Push LINE message to user after admin approves payment

import { getConfig, requireServiceKey, rateLimit, sanitize, setSecurityHeaders } from './_lib/config.js';

export default async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  if (!rateLimit(ip, 30)) return res.status(429).json({ error: 'Too many requests' });

  const serviceKey = requireServiceKey(res);
  if (!serviceKey) return;

  const { SB_URL, LINE_TOKEN } = getConfig();
  if (!LINE_TOKEN) {
    return res.status(500).json({ error: 'Server misconfigured: LINE_CHANNEL_TOKEN not set' });
  }

  const business_id = sanitize(req.body?.business_id);
  const plan = sanitize(req.body?.plan);

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
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_TOKEN}` },
    body: JSON.stringify(message),
  });

  const lineResult = await lineRes.json().catch(() => ({}));
  if (!lineRes.ok) {
    console.error('LINE push failed:', lineResult);
    return res.status(500).json({ error: 'Failed to send LINE notification' });
  }

  return res.status(200).json({ ok: true });
}

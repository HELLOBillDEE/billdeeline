// api/notify-bill.js — Push LINE message to business owner after bill saved

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
  const bill_type = sanitize(req.body?.bill_type);
  const amount = req.body?.amount;
  const note = sanitize(req.body?.note);

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

  const typeLabel = bill_type === 'income' ? '💚 รายรับ' : '🔴 รายจ่าย';
  const typeColor = bill_type === 'income' ? '#0b6b73' : '#dc2626';
  const amountFmt = parseFloat(amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const appUrl = 'https://liff.line.me/2010347722-o8ofu42K';
  const nowTH = new Date().toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const message = {
    to: biz.line_user_id,
    messages: [{
      type: 'flex',
      altText: `${typeLabel} ฿${amountFmt} บันทึกแล้ว`,
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box', layout: 'vertical',
          backgroundColor: typeColor, paddingAll: '14px',
          contents: [{
            type: 'text', text: `${typeLabel} บันทึกแล้ว ✓`,
            color: '#ffffff', size: 'sm', weight: 'bold'
          }]
        },
        body: {
          type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '16px',
          contents: [
            {
              type: 'text',
              text: `฿${amountFmt}`,
              size: 'xxl', weight: 'bold', color: typeColor
            },
            ...(note ? [{
              type: 'text', text: note, size: 'sm', color: '#6b7280', wrap: true
            }] : []),
            {
              type: 'text', text: nowTH,
              size: 'xs', color: '#9ca3af', margin: 'sm'
            }
          ]
        },
        footer: {
          type: 'box', layout: 'vertical', paddingAll: '12px',
          contents: [{
            type: 'button', style: 'link', height: 'sm',
            action: { type: 'uri', label: 'ดูรายงาน →', uri: `${appUrl}?action=report` }
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
    console.error('LINE push bill notify failed:', JSON.stringify(lineResult));
    return res.status(500).json({ error: 'Failed to send LINE notification' });
  }

  return res.status(200).json({ ok: true });
}

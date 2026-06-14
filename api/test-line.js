// api/test-line.js — Debug: test LINE push (Node.js runtime for full outbound access)

const LINE_CHANNEL_TOKEN = process.env.LINE_CHANNEL_TOKEN ||
  '8MnBH/AU7cLLkHQq69OzB5oPUPjttbNICw6Qy6yjqD3vajB6n4D4b7jjtuBem1i4pcIIjDImYRs2Zfz5Ow1bwpVRN09VCIDoR3/AnJnYUev9/Zf0wV2ey3QymCdfmtriOVbYxhiZoRak9u2buHS/mAdB04t89/1O/w1cDnyilFU=';

const ADMIN_LINE_ID = 'U96ea6930e32013f700ff5933eb4b8dc6';

const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms));

export default async function handler(req, res) {
  const to = req.query?.to || ADMIN_LINE_ID;

  let botInfo = {}, botStatus = 0, pushResult = {}, pushStatus = 0;

  // Check token info
  try {
    const profileRes = await Promise.race([
      fetch('https://api.line.me/v2/bot/info', { headers: { Authorization: `Bearer ${LINE_CHANNEL_TOKEN}` } }),
      timeout(8000)
    ]);
    botStatus = profileRes.status;
    botInfo = await profileRes.json().catch(() => ({}));
  } catch (e) { botInfo = { error: e.message }; }

  // Try push
  try {
    const pushRes = await Promise.race([
      fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LINE_CHANNEL_TOKEN}` },
        body: JSON.stringify({ to, messages: [{ type: 'text', text: '🔧 BillDEE LINE test — ถ้าเห็นข้อความนี้แปลว่าระบบทำงานแล้ว!' }] })
      }),
      timeout(8000)
    ]);
    pushStatus = pushRes.status;
    pushResult = await pushRes.json().catch(() => ({}));
  } catch (e) { pushResult = { error: e.message }; }

  const result = {
    bot_info: { status: botStatus, ...botInfo },
    push: { status: pushStatus, ...pushResult },
    token_prefix: LINE_CHANNEL_TOKEN.slice(0, 20) + '...',
    target_user: to,
  };

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(result);
}

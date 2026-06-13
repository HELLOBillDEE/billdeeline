// api/test-line.js — Debug: test LINE push and return full response

export const config = { runtime: 'edge' };

const LINE_CHANNEL_TOKEN = process.env.LINE_CHANNEL_TOKEN ||
  '8MnBH/AU7cLLkHQq69OzB5oPUPjttbNICw6Qy6yjqD3vajB6n4D4b7jjtuBem1i4pcIIjDImYRs2Zfz5Ow1bwpVRN09VCIDoR3/AnJnYUev9/Zf0wV2ey3QymCdfmtriOVbYxhiZoRak9u2buHS/mAdB04t89/1O/w1cDnyilFU=';

const ADMIN_LINE_ID = 'U96ea6930e32013f700ff5933eb4b8dc6';

export default async function handler(req) {
  const to = new URL(req.url).searchParams.get('to') || ADMIN_LINE_ID;

  const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms));

  let botInfo = {}, botStatus = 0, pushResult = {}, pushStatus = 0;

  // Check token info
  try {
    const profileRes = await Promise.race([
      fetch('https://api.line.me/v2/bot/info', { headers: { Authorization: `Bearer ${LINE_CHANNEL_TOKEN}` } }),
      timeout(5000)
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
        body: JSON.stringify({ to, messages: [{ type: 'text', text: '🔧 BillDEE LINE test' }] })
      }),
      timeout(5000)
    ]);
    pushStatus = pushRes.status;
    pushResult = await pushRes.json().catch(() => ({}));
  } catch (e) { pushResult = { error: e.message }; }

  return new Response(JSON.stringify({
    bot_info: { status: botStatus, ...botInfo },
    push: { status: pushStatus, ...pushResult },
    token_prefix: LINE_CHANNEL_TOKEN.slice(0, 20) + '...',
    target_user: to,
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

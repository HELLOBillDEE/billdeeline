// api/verify-slip.js — Verify Thai bank transfer slip via Gemini Vision
import { getConfig, rateLimit, sanitize, setSecurityHeaders,
         isValidImageBase64, checkBodySize } from './_lib/config.js';

const GEMINI_MODELS = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'];
// Whitelist valid Gemini model names — prevents prompt injection via model param
const MODEL_RE = /^gemini-[\d.]+-flash(-\w+)?$/;

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkBodySize(req, res, 10)) return; // 10MB max (base64 images)

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  if (!rateLimit(ip, 10)) return res.status(429).json({ error: 'Too many requests' }); // strict: 10/min for OCR

  const { GEMINI_KEY } = getConfig();
  if (!GEMINI_KEY) return res.status(500).json({ error: 'Server misconfigured' });

  const { imageBase64, expectedAmount, refCode } = req.body || {};

  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

  // Validate base64 image — reject obviously malformed data
  if (!isValidImageBase64(imageBase64)) {
    return res.status(400).json({ error: 'Invalid image data' });
  }

  // Validate numeric inputs
  const amount = parseFloat(expectedAmount);
  if (isNaN(amount) || amount <= 0 || amount > 1_000_000) {
    return res.status(400).json({ error: 'Invalid expectedAmount' });
  }

  const sanitizedRef = sanitize(refCode, 64);

  const prompt = `คุณคือระบบตรวจสอบสลิปโอนเงินธนาคารไทย
อ่านสลิปนี้แล้วตอบเป็น JSON เท่านั้น ไม่มีข้อความอื่น:
{
  "amount": <ยอดเงินที่โอน เป็น number, ไม่มีหน่วย>,
  "date": "<วันที่ YYYY-MM-DD>",
  "time": "<เวลา HH:MM>",
  "ref_no": "<เลขที่อ้างอิง/เลขรายการ>",
  "from_bank": "<ธนาคารผู้โอน>",
  "to_account_last4": "<4 หลักสุดท้ายบัญชีปลายทาง>",
  "is_success": <true ถ้าสำเร็จ, false ถ้าไม่สำเร็จ>,
  "raw_text": "<ข้อความทั้งหมดในสลิป>"
}`;

  let lastError;
  for (const model of GEMINI_MODELS) {
    // Paranoia: ensure model name matches whitelist before putting in URL
    if (!MODEL_RE.test(model)) continue;
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
            ]}],
            generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
          }),
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!geminiRes.ok) {
        lastError = `${model}: ${geminiRes.status}`;
        console.error('[verify-slip] model failed:', lastError);
        continue;
      }

      const geminiJson = await geminiRes.json();
      const raw = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) { lastError = 'No JSON in response'; continue; }

      let slip;
      try { slip = JSON.parse(jsonMatch[0]); }
      catch { lastError = 'JSON parse error'; continue; }

      const amountOk = typeof slip.amount === 'number' && Math.abs(slip.amount - amount) < 2;

      // Date check: today or yesterday (Thailand UTC+7)
      let dateOk = true, dateReason = '';
      if (slip.date) {
        const normalizeDate = d => {
          if (!d) return null;
          if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
          const dmy = d.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
          if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
          const p = new Date(d);
          if (!isNaN(p)) return p.toISOString().slice(0,10);
          return d;
        };
        const thNow    = new Date(Date.now() + 7*3600000);
        const todayTH  = thNow.toISOString().slice(0,10);
        const yest     = new Date(thNow - 86400000).toISOString().slice(0,10);
        const slipDate = normalizeDate(slip.date);
        if (slipDate !== todayTH && slipDate !== yest) {
          dateOk = false;
          dateReason = `สลิปเก่าเกินไป (วันที่ในสลิป: ${slip.date})`;
        }
      }

      const refOk = sanitizedRef
        ? (slip.ref_no||'').includes(sanitizedRef) || (slip.raw_text||'').includes(sanitizedRef)
        : true;

      const rawText = (slip.raw_text||'').toLowerCase();
      const nameOk  = rawText.includes('กนิษฐา') || rawText.includes('kanitha') ||
                      rawText.includes('0981020284') || rawText.includes('098-102-0284');

      if (!amountOk) return res.status(200).json({
        verified:false, rejected:true, confidence:'low',
        reason:`ยอดเงินไม่ตรง (พบ ฿${slip.amount}, ต้องการ ฿${amount}) — สลิปถูกปฏิเสธ`,
        slip, model,
      });
      if (!nameOk) return res.status(200).json({
        verified:false, rejected:true, confidence:'low',
        reason:'ชื่อผู้รับเงินไม่ถูกต้อง — กรุณาโอนมาที่ กนิษฐา ภู่ทอง / 0981020284 เท่านั้น',
        slip, model,
      });

      const verified   = amountOk && slip.is_success === true && dateOk && nameOk;
      const confidence = verified && refOk ? 'high' : verified ? 'medium' : 'low';
      const reason = !slip.is_success ? 'สลิปไม่แสดงสถานะสำเร็จ'
        : !dateOk ? dateReason
        : !refOk  ? 'ไม่พบรหัสอ้างอิงในสลิป'
        : 'ยืนยันสำเร็จ';

      return res.status(200).json({ verified, confidence, reason, slip, model });

    } catch (e) {
      lastError = e.message;
      console.error('[verify-slip] error:', e.message);
    }
  }

  console.error('[verify-slip] all models failed:', lastError);
  return res.status(200).json({
    verified:false, rejected:true, confidence:'none',
    reason:'ไม่สามารถอ่านสลิปได้ — กรุณาถ่ายภาพสลิปใหม่ให้ชัดขึ้น',
  });
}

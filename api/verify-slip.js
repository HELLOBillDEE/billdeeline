// api/verify-slip.js — Node.js Serverless Function
// Verifies a Thai bank transfer slip using Gemini Vision
// Returns: { verified: boolean, slip: object, confidence: string, reason: string }

const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not set in Vercel env vars' });
  }
  console.log('[verify-slip] using key prefix:', apiKey.slice(0, 8));

  const { imageBase64, expectedAmount, refCode } = req.body || {};

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 required' });
  }

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
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
              ],
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
          }),
        }
      );

      if (!geminiRes.ok) {
        const errBody = await geminiRes.text();
        lastError = `Gemini ${model}: ${geminiRes.status} — ${errBody.slice(0, 200)}`;
        console.error('[verify-slip] model failed:', lastError);
        continue;
      }

      const geminiJson = await geminiRes.json();
      const raw = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) { lastError = 'No JSON in response'; continue; }

      const slip = JSON.parse(jsonMatch[0]);

      // Verification logic
      const amountOk = typeof slip.amount === 'number' &&
        Math.abs(slip.amount - expectedAmount) < 2; // ±2 baht tolerance

      // Date check: slip must be today or yesterday (Thailand UTC+7)
      let dateOk = true;
      let dateReason = '';
      if (slip.date) {
        // Normalize date to YYYY-MM-DD regardless of AI output format
        const normalizeDate = (d) => {
          if (!d) return null;
          // Already YYYY-MM-DD
          if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
          // DD/MM/YYYY or DD-MM-YYYY
          const dmy = d.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
          if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
          // Try native parse (handles "Jun 14, 2026" etc)
          const parsed = new Date(d);
          if (!isNaN(parsed)) return parsed.toISOString().slice(0, 10);
          return d;
        };
        const slipDateNorm = normalizeDate(slip.date);
        const thNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
        const todayTH = thNow.toISOString().slice(0, 10);
        const yesterday = new Date(thNow - 86400000).toISOString().slice(0, 10);
        if (slipDateNorm !== todayTH && slipDateNorm !== yesterday) {
          dateOk = false;
          dateReason = `สลิปเก่าเกินไป (วันที่ในสลิป: ${slip.date})`;
        }
      }

      const refOk = refCode
        ? (slip.ref_no || '').includes(refCode) || (slip.raw_text || '').includes(refCode)
        : true;

      const isSuccess = slip.is_success === true;

      const verified = amountOk && isSuccess && dateOk;
      const confidence = verified && refOk ? 'high' : verified ? 'medium' : 'low';

      const reason = !isSuccess
        ? 'สลิปไม่แสดงสถานะสำเร็จ'
        : !amountOk
          ? `ยอดเงินไม่ตรง (พบ ${slip.amount}, ต้องการ ${expectedAmount})`
          : !dateOk
            ? dateReason
            : !refOk
              ? 'ไม่พบรหัสอ้างอิงในสลิป'
              : 'ยืนยันสำเร็จ';

      return res.status(200).json({ verified, confidence, reason, slip, model });

    } catch (e) {
      lastError = e.message;
    }
  }

  // All models failed — return unverified for manual review
  return res.status(200).json({
    verified: false,
    confidence: 'none',
    reason: 'ไม่สามารถอ่านสลิปได้ — รอทีมงานตรวจสอบ',
    error: lastError,
    key_set: !!apiKey,
    key_prefix: apiKey ? apiKey.slice(0, 8) : 'MISSING',
  });
}

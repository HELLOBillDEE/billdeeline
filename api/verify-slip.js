// api/verify-slip.js — Vercel Edge Function
// Verifies a Thai bank transfer slip using Gemini Vision
// Returns: { verified: boolean, slip: object, confidence: string, reason: string }

export const config = { runtime: 'edge' };

const GEMINI_MODELS = [
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
];

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const { imageBase64, expectedAmount, refCode } = body;

  if (!imageBase64) {
    return new Response(JSON.stringify({ error: 'imageBase64 required' }), { status: 400 });
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
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
        lastError = `Gemini ${model}: ${geminiRes.status}`;
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

      return new Response(
        JSON.stringify({ verified, confidence, reason, slip, model }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    } catch (e) {
      lastError = e.message;
    }
  }

  // All models failed — return unverified for manual review
  return new Response(
    JSON.stringify({
      verified: false,
      confidence: 'none',
      reason: 'ไม่สามารถอ่านสลิปได้ — รอทีมงานตรวจสอบ',
      error: lastError,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

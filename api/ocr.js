// api/ocr.js — Vercel Edge Function
// BillDEE AI OCR — ใช้ Google Gemini Vision
// ENV: GEMINI_API_KEY (ตั้งใน Vercel → Settings → Environment Variables)

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders(req) })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = await req.json()
    const { imageBase64, mediaType, businessName, ownerName, taxId } = body

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'imageBase64 is required' }),
        { status: 400, headers: corsHeaders(req) }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not set in Vercel environment variables' }),
        { status: 500, headers: corsHeaders(req) }
      )
    }

    // ── Business context ──────────────────────────────────────
    const bizCtx = businessName
      ? `\nข้อมูลกิจการของลูกค้า: ชื่อ "${businessName}"${ownerName ? ` เจ้าของ "${ownerName}"` : ''}${taxId ? ` เลขภาษี ${taxId}` : ''}\nถ้าเห็นชื่อนี้ในเอกสารในฐานะ "ผู้จ่าย" ให้ระบุ payer_name เป็นชื่อนี้`
      : ''

    const prompt = `คุณคือผู้เชี่ยวชาญด้านบัญชีและภาษีไทย มีความเชี่ยวชาญในการอ่านเอกสารทางการเงินทุกประเภท${bizCtx}

อ่านข้อมูลจากภาพเอกสารนี้ เอกสารอาจเป็น:
• ใบเสร็จรับเงิน (Receipt)
• ใบกำกับภาษี (Tax Invoice)
• สลิปโอนเงิน (Transfer Slip) — ธนาคาร / พร้อมเพย์ / QR
• ใบแจ้งหนี้ (Invoice)
• บิลค่าน้ำ / ค่าไฟ / ค่าเช่า
• ใบเสร็จร้านค้าออนไลน์ (Shopee, Lazada, Line Shopping)

ตอบเป็น JSON เท่านั้น ไม่มีข้อความอื่น ไม่มี markdown code block:
{
  "doc_type": "receipt | tax_invoice | transfer_slip | bill | invoice | other",
  "vendor_name": "ชื่อร้านค้า / บริษัทผู้รับเงิน / ชื่อผู้รับโอน",
  "payer_name": "ชื่อผู้จ่ายเงิน / ผู้โอน (ถ้าอ่านได้ ถ้าไม่มีใส่ null)",
  "doc_date": "YYYY-MM-DD (แปลงปี พ.ศ. → ค.ศ. เช่น 2569 → 2026)",
  "doc_no": "เลขที่เอกสาร / Transaction ID (หรือ null)",
  "items": [{"name": "รายการสินค้า/บริการ", "amount": 0}],
  "subtotal": 0,
  "vat_amount": 0,
  "total_amount": 0,
  "category": "วัตถุดิบ | ค่าเช่า | เงินเดือน | ค่าน้ำ-ไฟ | ค่าเดินทาง | วัสดุสำนักงาน | การตลาด | รายได้ | อื่น ๆ",
  "confidence": 0.95,
  "notes": "ข้อสังเกต เช่น รูปเบลอ ข้อมูลไม่ครบ"
}

กฎสำคัญ:
- วันที่ไทย: 21/2/69 หรือ 21 ก.พ. 69 = 2026-02-21 (พ.ศ. 2569 = ค.ศ. 2026)
- ปี 2 หลัก < 70: บวก 2500 ได้ พ.ศ. แล้วลบ 543
- สลิปโอน: vendor_name = ผู้รับ, payer_name = ผู้โอน, vat_amount = 0
- ถ้าอ่านรูปไม่ชัด: ใส่ข้อมูลที่อ่านได้ confidence ต่ำ อย่าปฏิเสธ`

    // ── Call Gemini 1.5 Flash ─────────────────────────────────
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: mediaType || 'image/jpeg',
                data: imageBase64,
              }
            },
            { text: prompt }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        }
      })
    })

    if (!geminiRes.ok) {
      const err = await geminiRes.text()
      console.error('Gemini API error:', geminiRes.status, err)
      return new Response(
        JSON.stringify({ error: 'Gemini API error', status: geminiRes.status, detail: err }),
        { status: geminiRes.status, headers: corsHeaders(req) }
      )
    }

    const geminiData = await geminiRes.json()
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // strip markdown fences if Gemini wraps in ```json ... ```
    const clean = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    try {
      const result = JSON.parse(clean)
      return new Response(
        JSON.stringify({ success: true, data: result }),
        { status: 200, headers: corsHeaders(req) }
      )
    } catch (parseErr) {
      console.error('JSON parse failed:', clean)
      return new Response(
        JSON.stringify({ success: false, raw: text, parseError: parseErr.message }),
        { status: 200, headers: corsHeaders(req) }
      )
    }

  } catch (e) {
    console.error('OCR handler error:', e)
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: corsHeaders(req) }
    )
  }
}

function corsHeaders(req) {
  const origin = req?.headers?.get('origin') || ''
  const allowed = [
    'https://billdeeline.vercel.app',
    'https://liff.line.me',
    'http://localhost:3000',
  ]
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }
}

// api/ocr.js — Vercel Edge Function
// BillDEE AI OCR — ผู้เชี่ยวชาญบัญชีและภาษีไทย
// รับ: { imageBase64, mediaType, businessName?, ownerName?, taxId? }
// คืน: { success, data } หรือ { success: false, raw }

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const origin = req.headers.get('origin') || ''
  const allowed = [
    'https://billdeeline.vercel.app',
    'https://billdeeline-a8y3.vercel.app',
    'https://liff.line.me',
    'http://localhost:3000',
  ]
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  // preflight
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders })

  try {
    const body = await req.json()
    const { imageBase64, mediaType, businessName, ownerName, taxId } = body

    if (!imageBase64) return new Response(
      JSON.stringify({ error: 'imageBase64 is required' }),
      { status: 400, headers: corsHeaders }
    )

    const apiKey = process.env.CLAUDE_API_KEY
    if (!apiKey) return new Response(
      JSON.stringify({ error: 'CLAUDE_API_KEY not configured in Vercel env' }),
      { status: 500, headers: corsHeaders }
    )

    // ── Build context about the business ──────────────────────
    const bizCtx = businessName
      ? `\nข้อมูลกิจการของลูกค้า: ชื่อ "${businessName}"${ownerName ? ` เจ้าของ "${ownerName}"` : ''}${taxId ? ` เลขภาษี ${taxId}` : ''}\nถ้าเห็นชื่อนี้ในเอกสารในฐานะ "ผู้จ่าย" ให้ระบุ payer_name เป็นชื่อนี้`
      : ''

    const prompt = `คุณคือผู้เชี่ยวชาญด้านบัญชีและภาษีไทย มีความเชี่ยวชาญในการอ่านเอกสารทางการเงินทุกประเภท${bizCtx}

อ่านข้อมูลจากภาพเอกสารนี้ เอกสารอาจเป็น:
• ใบเสร็จรับเงิน (Receipt)
• ใบกำกับภาษี (Tax Invoice)  
• สลิปโอนเงิน (Transfer Slip) — ธนาคาร/พร้อมเพย์/QR
• ใบแจ้งหนี้ (Invoice)
• บิลค่าน้ำ/ค่าไฟ/ค่าเช่า
• ใบเสร็จร้านค้าออนไลน์ (Shopee, Lazada, Line Shopping)

ตอบเป็น JSON เท่านั้น ไม่มีข้อความอื่นก่อนหรือหลัง:
{
  "doc_type": "receipt | tax_invoice | transfer_slip | bill | invoice | other",
  "vendor_name": "ชื่อร้านค้า / บริษัทผู้รับเงิน / ชื่อผู้รับโอน",
  "payer_name": "ชื่อผู้จ่ายเงิน / ผู้โอน (ถ้าอ่านได้ ถ้าไม่มีใส่ null)",
  "doc_date": "YYYY-MM-DD (แปลงปี พ.ศ. → ค.ศ. เช่น 2569 → 2026)",
  "doc_no": "เลขที่เอกสาร / เลขอ้างอิง / Transaction ID (หรือ null)",
  "items": [{"name": "รายการ", "amount": ตัวเลข}],
  "subtotal": ตัวเลขก่อน VAT,
  "vat_amount": ตัวเลข VAT 7% (0 ถ้าไม่มี),
  "total_amount": ตัวเลขยอดรวมสุดท้าย,
  "category": "วัตถุดิบ | ค่าเช่า | เงินเดือน | ค่าน้ำ-ไฟ | ค่าเดินทาง | วัสดุสำนักงาน | การตลาด | รายได้ | อื่น ๆ",
  "confidence": 0.0-1.0,
  "notes": "ข้อสังเกต เช่น รูปเบลอ / ข้อมูลไม่ครบ / สลิปยืนยันการรับเงิน"
}

กฎการแปลงวันที่ไทย:
- 21/2/69 หรือ 21 ก.พ. 69 = 2026-02-21 (พ.ศ. 2569 = ค.ศ. 2026)
- ถ้าปีเป็น 2 หลัก: ถ้า < 70 บวก 2500 → พ.ศ. แล้วลบ 543
- เวลา: ไม่ต้องใส่ใน date field

สำหรับ สลิปโอนเงิน:
- vendor_name = ชื่อบัญชีผู้รับ
- payer_name = ชื่อบัญชีผู้โอน  
- total_amount = ยอดที่โอน
- vat_amount = 0 (การโอนเงินไม่มี VAT)
- doc_no = เลขอ้างอิงการโอน

ถ้ารูปไม่ชัดหรืออ่านบางส่วนไม่ได้ ให้ใส่ข้อมูลที่อ่านได้ และ confidence ต่ำ อย่าปฏิเสธการวิเคราะห์`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType || 'image/jpeg',
                data: imageBase64,
              }
            },
            { type: 'text', text: prompt }
          ]
        }]
      })
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      console.error('Claude API error:', claudeRes.status, err)
      return new Response(
        JSON.stringify({ error: 'Claude API error', status: claudeRes.status, detail: err }),
        { status: claudeRes.status, headers: corsHeaders }
      )
    }

    const data = await claudeRes.json()
    const text = data.content?.[0]?.text || ''

    // strip markdown code fences if present
    const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

    try {
      const result = JSON.parse(clean)
      return new Response(
        JSON.stringify({ success: true, data: result }),
        { status: 200, headers: corsHeaders }
      )
    } catch (e) {
      console.error('JSON parse failed:', clean)
      return new Response(
        JSON.stringify({ success: false, raw: text, parseError: e.message }),
        { status: 200, headers: corsHeaders }
      )
    }

  } catch (e) {
    console.error('OCR proxy error:', e)
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: corsHeaders }
    )
  }
}

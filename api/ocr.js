// api/ocr.js — Vercel Edge Function
// Claude Vision OCR Proxy (API Key ปลอดภัยใน Vercel env)

export const config = { runtime: 'edge' }

export default async function handler(req) {
  // รับเฉพาะ POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // ตรวจ CORS — อนุญาตเฉพาะ domain ของเรา
  const origin = req.headers.get('origin') || ''
  const allowed = [
    'https://billdeeline-a8y3.vercel.app',
    'https://liff.line.me',
    'http://localhost:3000',
  ]
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  try {
    const body = await req.json()
    const { imageBase64, mediaType } = body

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'imageBase64 is required' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // เรียก Claude API — Key อยู่ใน Vercel Environment Variables
    const apiKey = process.env.CLAUDE_API_KEY
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: corsHeaders }
      )
    }

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
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
            {
              type: 'text',
              text: `อ่านข้อมูลจากบิล/ใบเสร็จนี้แล้วตอบเป็น JSON เท่านั้น ไม่มีข้อความอื่น:
{
  "vendor_name": "ชื่อร้านค้าหรือผู้รับเงิน",
  "doc_date": "YYYY-MM-DD (แปลงจากวันที่ในบิล เช่น 21/2/69 = 2026-02-21)",
  "total_amount": ตัวเลขยอดรวม,
  "vat_amount": ตัวเลข VAT หรือ 0,
  "doc_no": "เลขที่ใบเสร็จ หรือ null",
  "category": "หมวดหมู่: สินค้าเพื่อขาย/ค่าเช่า/ค่าน้ำมัน/ค่าขนส่ง/ค่าสื่อสาร/ค่าโฆษณา/ซ่อมบำรุง/อุปกรณ์สำนักงาน/ค่าจ้างพนักงาน/อื่นๆ",
  "doc_type": "receipt หรือ tax_invoice หรือ expense"
}
หมายเหตุ: วันที่ไทย เช่น 21/2/69 หมายถึง พ.ศ. 2569 = ค.ศ. 2026`
            }
          ]
        }]
      })
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      console.error('Claude API error:', err)
      return new Response(
        JSON.stringify({ error: 'Claude API error', detail: err }),
        { status: claudeRes.status, headers: corsHeaders }
      )
    }

    const data = await claudeRes.json()
    const text = data.content?.[0]?.text || ''

    // parse JSON จาก response
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      const result = JSON.parse(clean)
      return new Response(
        JSON.stringify({ success: true, data: result }),
        { status: 200, headers: corsHeaders }
      )
    } catch(e) {
      // Claude ตอบมาแต่ parse ไม่ได้
      return new Response(
        JSON.stringify({ success: false, raw: text }),
        { status: 200, headers: corsHeaders }
      )
    }

  } catch(e) {
    console.error('OCR proxy error:', e)
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: corsHeaders }
    )
  }
}

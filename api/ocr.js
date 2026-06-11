// api/ocr.js — Vercel Edge Function
// BillDEE AI OCR — Google Gemini Vision
// ENV: GEMINI_API_KEY

export const config = { runtime: 'edge' }

// ลองตามลำดับ — มีรูปทุกตัว
const MODELS = [
  { id:'gemini-pro-vision',      json:false },
  { id:'gemini-1.0-pro-vision-latest', json:false },
  { id:'gemini-1.5-flash-latest',      json:true  },
  { id:'gemini-1.5-flash-001',         json:true  },
  { id:'gemini-1.5-pro-latest',        json:true  },
]

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors(req) })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const body = await req.json()
    const { imageBase64, mediaType, businessName, ownerName, taxId, _listModels } = body

    // ── List available models (debug mode) ────────────────────
    if (_listModels) {
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) return new Response(JSON.stringify({ error: 'No GEMINI_API_KEY' }), { status: 500, headers: cors(req) })
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
      const d = await r.json()
      const vision = (d.models || []).filter(m => (m.supportedGenerationMethods||[]).includes('generateContent'))
        .map(m => m.name)
      return new Response(JSON.stringify({ available: vision, raw: d }), { status: 200, headers: cors(req) })
    }

    if (!imageBase64) return new Response(
      JSON.stringify({ error: 'imageBase64 is required' }),
      { status: 400, headers: cors(req) }
    )

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return new Response(
      JSON.stringify({ error: 'GEMINI_API_KEY not set in Vercel Environment Variables' }),
      { status: 500, headers: cors(req) }
    )

    const bizCtx = businessName
      ? `\nกิจการ: "${businessName}"${ownerName ? ` เจ้าของ: "${ownerName}"` : ''}${taxId ? ` เลขภาษี: ${taxId}` : ''}`
      : ''

    const prompt = `คุณคือผู้เชี่ยวชาญด้านบัญชีและภาษีไทย${bizCtx}

อ่านข้อมูลจากภาพ ซึ่งอาจเป็น ใบเสร็จ / Tax Invoice / สลิปโอนเงิน / บิลค่าน้ำ-ไฟ / ใบแจ้งหนี้

ตอบเป็น JSON เท่านั้น ห้ามมี markdown ห้ามมีข้อความอื่น:
{
  "doc_type": "receipt | tax_invoice | transfer_slip | bill | invoice | other",
  "vendor_name": "ชื่อร้านค้า / บริษัทผู้รับเงิน",
  "payer_name": "ชื่อผู้จ่าย / ผู้โอน (null ถ้าไม่มี)",
  "doc_date": "YYYY-MM-DD (พ.ศ. 2569 = ค.ศ. 2026)",
  "doc_no": "เลขเอกสาร (null ถ้าไม่มี)",
  "items": [{"name": "รายการ", "amount": 0}],
  "subtotal": 0,
  "vat_amount": 0,
  "total_amount": 0,
  "category": "วัตถุดิบ | ค่าเช่า | เงินเดือน | ค่าน้ำ-ไฟ | ค่าเดินทาง | วัสดุสำนักงาน | การตลาด | รายได้ | อื่น ๆ",
  "confidence": 0.95,
  "notes": "ข้อสังเกต"
}
กฎ: พ.ศ. 2569 = ค.ศ. 2026, สลิปโอน vat=0, ถ้าอ่านไม่ชัดอย่าปฏิเสธ`

    const tried = []
    for (const { id: model, json: supportsJson } of MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

      const genCfg = supportsJson
        ? { temperature: 0.1, maxOutputTokens: 1024, responseMimeType: 'application/json' }
        : { temperature: 0.1, maxOutputTokens: 1024 }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: mediaType || 'image/jpeg', data: imageBase64 } },
            { text: prompt }
          ]}],
          generationConfig: genCfg
        })
      })

      if (res.status === 404) { tried.push(`${model}: 404`); continue }

      if (!res.ok) {
        const err = await res.text()
        // ถ้า model นี้ error ให้ลอง model ถัดไปแทนที่จะหยุด
        tried.push(`${model}: ${res.status}`); continue
      }

      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

      // strip markdown fences
      const clean = text.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/i,'').trim()

      // ลอง parse JSON
      try {
        const result = JSON.parse(clean)
        result._model = model
        return new Response(
          JSON.stringify({ success: true, data: result }),
          { status: 200, headers: cors(req) }
        )
      } catch (e) {
        // JSON parse ล้มเหลว — ลอง extract JSON object จากข้อความ
        const match = clean.match(/\{[\s\S]*\}/)
        if (match) {
          try {
            const result = JSON.parse(match[0])
            result._model = model
            return new Response(
              JSON.stringify({ success: true, data: result }),
              { status: 200, headers: cors(req) }
            )
          } catch {}
        }
        // ยังไม่ได้เลย — return raw text ให้ debug
        return new Response(
          JSON.stringify({ success: false, raw: text, parseError: e.message, model }),
          { status: 200, headers: cors(req) }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'ไม่พบ Gemini model ที่ใช้ได้', tried }),
      { status: 404, headers: cors(req) }
    )

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors(req) })
  }
}

function cors(req) {
  const origin = req?.headers?.get('origin') || ''
  const allowed = ['https://billdeeline.vercel.app','https://liff.line.me','http://localhost:3000']
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }
}

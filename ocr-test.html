
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>BillDEE OCR Test</title>
<style>
body{font-family:system-ui,sans-serif;max-width:600px;margin:40px auto;padding:0 20px;background:#f5f5f5}
h2{color:#0e9aa7}
.card{background:#fff;border-radius:16px;padding:20px;margin:16px 0;box-shadow:0 2px 12px rgba(0,0,0,.08)}
.btn{background:#0e9aa7;color:#fff;border:none;padding:12px 24px;border-radius:10px;font-size:15px;cursor:pointer;font-family:inherit;width:100%;margin-bottom:8px}
.btn2{background:#f0f8f9;color:#0e9aa7;border:1.5px solid #0e9aa7}
.btn:disabled{opacity:.5}
pre{background:#f0f8f9;border-radius:10px;padding:14px;font-size:12px;overflow-x:auto;white-space:pre-wrap;word-break:break-all;margin-top:10px}
.ok{color:#16a06f;font-weight:700}
.err{color:#e25563;font-weight:700}
input[type=file]{width:100%;padding:10px;border:2px dashed #ccc;border-radius:10px;margin-bottom:12px;box-sizing:border-box}
</style>
</head>
<body>
<h2>🧪 BillDEE OCR Debug</h2>

<div class="card">
  <h3 style="margin:0 0 12px">Step 1 — ดู Models ที่ใช้ได้</h3>
  <button class="btn btn2" onclick="listModels()">📋 ดูรายการ Gemini Models</button>
  <pre id="list-res" style="display:none"></pre>
</div>

<div class="card">
  <h3 style="margin:0 0 12px">Step 2 — ทดสอบ OCR</h3>
  <input type="file" id="img-in" accept="image/*"/>
  <button class="btn" onclick="testOCR()" id="ocr-btn">📷 อ่านใบเสร็จ</button>
  <pre id="ocr-res" style="display:none"></pre>
</div>

<div class="card" style="background:#fff8e1">
  <b>ถ้าเจอ Error:</b>
  <ul style="font-size:13px;line-height:1.9;color:#555;margin:8px 0 0">
    <li><b>GEMINI_API_KEY not set</b> → Vercel → Settings → Env → เพิ่ม GEMINI_API_KEY</li>
    <li><b>API_KEY_INVALID</b> → key ผิด → ตรวจที่ aistudio.google.com/apikey</li>
    <li><b>ไม่พบ model</b> → กด Step 1 ก่อน แล้วส่งรายการให้ developer</li>
    <li><b>Fetch failed</b> → ocr.js ยังไม่ได้ push ขึ้น GitHub</li>
  </ul>
</div>

<script>
const BASE = window.location.origin

async function listModels(){
  const el = document.getElementById('list-res')
  el.style.display = 'block'
  el.textContent = 'กำลังดึงรายการ…'
  try{
    const r = await fetch(`${BASE}/api/ocr`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ _listModels: true, imageBase64: 'dGVzdA==' })
    })
    const j = await r.json()
    if(j.available){
      el.innerHTML = `<span class="ok">✅ Models ที่ใช้ได้ (${j.available.length} รายการ):</span>\n\n${j.available.map(m=>'• '+m).join('\n')}`
    } else {
      el.innerHTML = `<span class="err">❌ Error</span>\n\n${JSON.stringify(j,null,2)}`
    }
  }catch(e){
    el.innerHTML = `<span class="err">❌ Fetch failed: ${e.message}</span>\n\nocr.js ยังไม่ได้ push หรือ Vercel ยัง deploy ไม่เสร็จ`
  }
}

async function testOCR(){
  const file = document.getElementById('img-in').files[0]
  if(!file){alert('เลือกรูปก่อน');return}
  const btn = document.getElementById('ocr-btn')
  const el = document.getElementById('ocr-res')
  btn.disabled = true; btn.textContent = 'กำลังอ่าน…'
  el.style.display = 'block'; el.textContent = 'กำลังส่งรูปไป Gemini…'
  try{
    const b64 = await toBase64(file)
    const r = await fetch(`${BASE}/api/ocr`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        imageBase64: b64.split(',')[1],
        mediaType: file.type,
        businessName: 'ร้านทดสอบ',
        ownerName: 'คุณทดสอบ'
      })
    })
    const j = await r.json()
    if(j.success){
      el.innerHTML = `<span class="ok">✅ อ่านสำเร็จ! model: ${j.data?._model} · confidence: ${Math.round((j.data?.confidence||0)*100)}%</span>\n\n${JSON.stringify(j.data,null,2)}`
    } else {
      el.innerHTML = `<span class="err">❌ ล้มเหลว</span>\n\n${JSON.stringify(j,null,2)}`
    }
  }catch(e){
    el.innerHTML = `<span class="err">❌ ${e.message}</span>`
  }
  btn.disabled = false; btn.textContent = '📷 อ่านใบเสร็จ'
}

function toBase64(f){return new Promise((r,j)=>{const fr=new FileReader();fr.onload=e=>r(e.target.result);fr.onerror=j;fr.readAsDataURL(f)})}
</script>
</body>
</html>

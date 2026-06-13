// api/article.js — SSR article page for SEO
// Vercel rewrite: /blog/:slug → /api/article?slug=:slug

export const config = { runtime: 'edge' };

const SB_URL = 'https://cfbknvjkknhfsxnrejlc.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYmtudmpra25oZnN4bnJlamxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDU1NzQsImV4cCI6MjA5NjU4MTU3NH0.BEwgucGKJzc_cdZElcozwoogz8oIbwz6lAu9wom1zHk';

export default async function handler(req) {
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug') || url.pathname.split('/').pop();

  if (!slug) {
    return Response.redirect(new URL('/blog/', req.url), 302);
  }

  // Fetch article from Supabase
  const res = await fetch(
    `${SB_URL}/rest/v1/articles?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
    { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
  );

  const data = res.ok ? await res.json() : [];
  const article = data?.[0];

  if (!article || !article.is_published) {
    return new Response(notFoundHTML(), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return new Response(articleHTML(article), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}

function articleHTML(a) {
  const title = esc(a.title || '');
  const desc = esc(a.excerpt || a.title || '');
  const content = a.content_html || `<p>${esc(a.content || '')}</p>`;
  const dateISO = a.published_at || new Date().toISOString();
  const dateDisplay = new Date(dateISO).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  const canonical = `https://billdee.app/blog/${a.slug}`;

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} — BillDEE Blog</title>
<meta name="description" content="${desc}"/>
<link rel="canonical" href="${canonical}"/>
<meta property="og:type" content="article"/>
<meta property="og:title" content="${title}"/>
<meta property="og:description" content="${desc}"/>
<meta property="og:url" content="${canonical}"/>
<meta property="og:image" content="${esc(a.og_image || 'https://billdee.app/og-blog.png')}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta property="article:published_time" content="${dateISO}"/>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Article","headline":"${title}","description":"${desc}","datePublished":"${dateISO}","author":{"@type":"Organization","name":"BillDEE"},"publisher":{"@type":"Organization","name":"BillDEE","url":"https://billdee.app"}}
</script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Sarabun','Noto Sans Thai',sans-serif;background:#f8fafb;color:#1a1a2e;line-height:1.75}
a{color:#0b6b73}
.nav{background:#fff;border-bottom:1px solid #e5e7eb;padding:0 20px;position:sticky;top:0;z-index:10}
.nav-inner{max-width:760px;margin:0 auto;height:56px;display:flex;align-items:center;justify-content:space-between}
.logo{font-size:20px;font-weight:800;color:#0b6b73;text-decoration:none}
.nav-cta{background:#0b6b73;color:#fff;padding:7px 16px;border-radius:99px;font-size:13px;font-weight:700;text-decoration:none}
.container{max-width:760px;margin:0 auto;padding:40px 20px 80px}
.breadcrumb{font-size:13px;color:#9ca3af;margin-bottom:20px}
.breadcrumb a{color:#0b6b73}
.tag{display:inline-block;background:#e0f7f9;color:#0b6b73;font-size:12px;font-weight:700;padding:3px 12px;border-radius:99px;margin-bottom:12px}
h1{font-size:clamp(22px,5vw,32px);font-weight:800;line-height:1.3;margin-bottom:12px}
.meta{font-size:13px;color:#9ca3af;margin-bottom:32px;padding-bottom:20px;border-bottom:1px solid #e5e7eb}
.content{font-size:16px}
.content h2{font-size:22px;font-weight:800;margin:32px 0 12px;color:#0b6b73}
.content h3{font-size:18px;font-weight:700;margin:24px 0 10px}
.content p{margin-bottom:16px}
.content ul,.content ol{margin:0 0 16px 24px}
.content li{margin-bottom:6px}
.content strong{color:#1a1a2e}
.content blockquote{border-left:4px solid #0e9aa7;padding:12px 16px;background:#f0fdf4;border-radius:0 10px 10px 0;margin:20px 0;font-style:italic}
.content table{width:100%;border-collapse:collapse;margin:20px 0;font-size:14px}
.content th{background:#0b6b73;color:#fff;padding:10px 12px;text-align:left}
.content td{padding:10px 12px;border-bottom:1px solid #e5e7eb}
.content tr:nth-child(even) td{background:#f8fafb}
.cta-box{background:linear-gradient(135deg,#0b6b73,#0e9aa7);border-radius:20px;padding:32px 24px;text-align:center;color:#fff;margin-top:48px}
.cta-box h2{font-size:20px;font-weight:800;margin-bottom:8px}
.cta-box p{font-size:14px;opacity:.88;margin-bottom:18px}
.cta-btn{display:inline-block;background:#fff;color:#0b6b73;padding:11px 26px;border-radius:99px;font-weight:800;font-size:14px;text-decoration:none}
.footer{background:#1a1a2e;color:#9ca3af;text-align:center;padding:20px;font-size:13px}
.footer a{color:#0e9aa7}
</style>
</head>
<body>
<nav class="nav">
  <div class="nav-inner">
    <a href="/" class="logo">💚 BillDEE</a>
    <a href="https://liff.line.me/2010347722-o8ofu42K" class="nav-cta">ทดลองฟรี</a>
  </div>
</nav>
<div class="container">
  <div class="breadcrumb"><a href="/blog/">Blog</a> › ${title}</div>
  <span class="tag">${esc(a.tag_label || a.tag || 'บทความ')}</span>
  <h1>${title}</h1>
  <div class="meta">โดย BillDEE · ${dateDisplay}</div>
  <div class="content">${content}</div>
  <div class="cta-box">
    <h2>ลองใช้ BillDEE ฟรีวันนี้</h2>
    <p>จัดการบัญชีง่าย สแกนบิล คำนวณภาษี ครบในแอปเดียว</p>
    <a href="https://liff.line.me/2010347722-o8ofu42K" class="cta-btn">ทดลองใช้ฟรี 14 วัน →</a>
  </div>
</div>
<div class="footer">© 2025 BillDEE · <a href="/blog/">Blog</a> · <a href="/">หน้าหลัก</a></div>
</body>
</html>`;
}

function notFoundHTML() {
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"/><title>ไม่พบบทความ — BillDEE</title></head>
<body style="font-family:sans-serif;text-align:center;padding:80px 20px">
<h1 style="color:#0b6b73">404 ไม่พบบทความ</h1>
<p style="margin:12px 0 24px;color:#6b7280">บทความนี้อาจถูกย้ายหรือลบแล้ว</p>
<a href="/blog/" style="background:#0b6b73;color:#fff;padding:10px 24px;border-radius:99px;text-decoration:none;font-weight:700">← กลับไปหน้า Blog</a>
</body></html>`;
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

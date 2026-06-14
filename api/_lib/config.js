// api/_lib/config.js — Security utilities (no hardcoded secrets)

export function getConfig() {
  const SB_URL     = process.env.SUPABASE_URL      || 'https://cfbknvjkknhfsxnrejlc.supabase.co';
  const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const SB_ANON    = process.env.SUPABASE_ANON_KEY;
  const LINE_TOKEN = process.env.LINE_CHANNEL_TOKEN;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const ADMIN_SECRET = process.env.ADMIN_SECRET; // Set a strong random secret in Vercel
  return { SB_URL, SB_SERVICE, SB_ANON, LINE_TOKEN, GEMINI_KEY, ADMIN_SECRET };
}

export function requireServiceKey(res) {
  const { SB_SERVICE } = getConfig();
  if (!SB_SERVICE) {
    res.status(500).json({ error: 'Server misconfigured' });
    return null;
  }
  return SB_SERVICE;
}

// ── Rate limiting (per-IP, in-memory) ────────────────────────
const _rl = new Map();
export function rateLimit(key, maxPerMinute = 30) {
  const now = Date.now();
  const e = _rl.get(key) || { n: 0, t: now };
  if (now - e.t > 60_000) { e.n = 1; e.t = now; }
  else e.n++;
  _rl.set(key, e);
  return e.n <= maxPerMinute;
}

// ── Input sanitization ────────────────────────────────────────
export function sanitize(val, maxLen = 500) {
  if (val == null) return '';
  if (typeof val !== 'string') val = String(val);
  // Strip control chars, null bytes, potential injection chars
  return val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
            .slice(0, maxLen)
            .trim();
}

// Validate UUID v4 format — prevents SQL injection via ID params
export function isValidUUID(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

// Validate plan value against whitelist
export function isValidPlan(p) {
  return ['basic', 'smart', 'pro'].includes(p);
}

// ── SSRF protection for webhook URLs ─────────────────────────
const _PRIVATE = [
  /^https?:\/\/(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/i,
  /^https?:\/\/169\.254\./i,    // link-local
  /^https?:\/\/::1/i,           // IPv6 loopback
  /^https?:\/\/0\./i,
];
export function isSafeWebhookUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (!url.startsWith('https://')) return false; // HTTPS only
  try {
    const u = new URL(url);
    if (u.port && !['443', ''].includes(u.port)) return false; // Standard port only
    return !_PRIVATE.some(r => r.test(url));
  } catch { return false; }
}

// ── Admin authentication ──────────────────────────────────────
export function isAdmin(req) {
  const { ADMIN_SECRET } = getConfig();
  if (!ADMIN_SECRET) return false; // If not set, block all admin actions
  const provided = req.headers['x-admin-secret'] || req.body?.admin_secret;
  return provided === ADMIN_SECRET;
}

// ── Body size guard (base64 images can be huge) ──────────────
export function checkBodySize(req, res, maxMB = 5) {
  const len = parseInt(req.headers['content-length'] || '0');
  if (len > maxMB * 1024 * 1024) {
    res.status(413).json({ error: `Request too large (max ${maxMB}MB)` });
    return false;
  }
  return true;
}

// ── Base64 image validation ───────────────────────────────────
export function isValidImageBase64(b64) {
  if (typeof b64 !== 'string') return false;
  if (b64.length > 10 * 1024 * 1024) return false; // max 10MB base64
  // Must be valid base64
  return /^[A-Za-z0-9+/]+=*$/.test(b64.replace(/\s/g, ''));
}

// ── Security response headers ─────────────────────────────────
export function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store');
}

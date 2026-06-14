// api/_lib/config.js — Centralised secrets (env vars only, no hardcoded fallbacks)

export function getConfig() {
  const SB_URL     = process.env.SUPABASE_URL      || 'https://cfbknvjkknhfsxnrejlc.supabase.co';
  const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const SB_ANON    = process.env.SUPABASE_ANON_KEY;
  const LINE_TOKEN = process.env.LINE_CHANNEL_TOKEN;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  return { SB_URL, SB_SERVICE, SB_ANON, LINE_TOKEN, GEMINI_KEY };
}

export function requireServiceKey(res) {
  const { SB_SERVICE } = getConfig();
  if (!SB_SERVICE) {
    res.status(500).json({ error: 'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY not set' });
    return null;
  }
  return SB_SERVICE;
}

// Simple in-memory rate limiter (per serverless instance, resets on cold start)
const rateLimitMap = new Map();
export function rateLimit(key, maxPerMinute = 30) {
  const now = Date.now();
  const window = 60_000;
  const entry = rateLimitMap.get(key) || { count: 0, start: now };
  if (now - entry.start > window) {
    entry.count = 1; entry.start = now;
  } else {
    entry.count++;
  }
  rateLimitMap.set(key, entry);
  return entry.count <= maxPerMinute;
}

// Sanitize text input — strip control chars, limit length
export function sanitize(val, maxLen = 500) {
  if (typeof val !== 'string') return '';
  return val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, maxLen).trim();
}

// Standard security headers for all API responses
export function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

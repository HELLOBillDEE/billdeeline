// api/health.js — Check env vars are set (no values exposed)
export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    env: {
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_ANON_KEY:         !!process.env.SUPABASE_ANON_KEY,
      LINE_CHANNEL_TOKEN:        !!process.env.LINE_CHANNEL_TOKEN,
      GEMINI_API_KEY:            !!process.env.GEMINI_API_KEY,
    }
  });
}

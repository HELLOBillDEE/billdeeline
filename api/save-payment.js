// api/save-payment.js — Save payment request (bypasses RLS for LINE users)
// Uses SUPABASE_SERVICE_ROLE_KEY env var — set in Vercel dashboard

export const config = { runtime: 'edge' };

const SB_URL = 'https://cfbknvjkknhfsxnrejlc.supabase.co';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYmtudmpra25oZnN4bnJlamxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDU1NzQsImV4cCI6MjA5NjU4MTU3NH0.BEwgucGKJzc_cdZElcozwoogz8oIbwz6lAu9wom1zHk';

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const res = await fetch(`${SB_URL}/rest/v1/payment_requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('save-payment error:', err);
    return new Response(JSON.stringify({ error: err }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

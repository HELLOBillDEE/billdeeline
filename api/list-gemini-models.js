// api/list-gemini-models.js — Debug: list available Gemini models

export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

  const r1 = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}&pageSize=50`);
  const d1 = await r1.json().catch(() => ({}));

  const r2 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=50`);
  const d2 = await r2.json().catch(() => ({}));

  const names1 = (d1.models || []).map(m => m.name);
  const names2 = (d2.models || []).map(m => m.name);

  res.json({
    v1_models: names1.filter(n => n.includes('flash') || n.includes('pro')),
    v1beta_models: names2.filter(n => n.includes('flash') || n.includes('pro')),
  });
}

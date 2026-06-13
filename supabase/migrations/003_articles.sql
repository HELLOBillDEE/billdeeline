-- BillDEE Articles / Blog table
-- Public read, admin write only

CREATE TABLE IF NOT EXISTS articles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  excerpt       TEXT,
  content       TEXT,
  content_html  TEXT,
  tag           TEXT DEFAULT 'tip',     -- tax | vat | howto | tip | news
  tag_label     TEXT,
  emoji         TEXT DEFAULT '📝',
  og_image      TEXT,
  is_published  BOOLEAN DEFAULT FALSE,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Public can read published articles (for SSR + blog page)
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read published" ON articles
  FOR SELECT
  USING (is_published = TRUE);

CREATE POLICY "admin write" ON articles
  USING (auth.email() = 'kanitthaphoothong@gmail.com')
  WITH CHECK (auth.email() = 'kanitthaphoothong@gmail.com');

CREATE INDEX IF NOT EXISTS articles_slug_idx ON articles(slug);
CREATE INDEX IF NOT EXISTS articles_published_idx ON articles(is_published, published_at DESC);

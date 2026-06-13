-- BillDEE Payment Requests Table
-- Run in Supabase SQL Editor

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS plan_started_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_expire_at   TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS payment_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  biz_name      TEXT,
  plan          TEXT NOT NULL,
  amount        NUMERIC(10,2) NOT NULL,
  ref_code      TEXT,
  slip_img      TEXT,        -- base64 data URI
  ai_amount     NUMERIC(10,2),
  ai_date       TEXT,
  ai_ref        TEXT,
  ai_verified   BOOLEAN DEFAULT FALSE,
  ai_reason     TEXT,
  status        TEXT DEFAULT 'pending',  -- pending | approved | rejected | auto_approved
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Admin can read all; users can insert their own
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own" ON payment_requests
  FOR INSERT
  WITH CHECK (business_id IN (
    SELECT id FROM businesses WHERE line_user_id = auth.uid()::text
  ));

CREATE POLICY "users read own" ON payment_requests
  FOR SELECT
  USING (business_id IN (
    SELECT id FROM businesses WHERE line_user_id = auth.uid()::text
  ));

-- Admin service role bypasses RLS — use service_role key in admin panel
CREATE INDEX IF NOT EXISTS pay_req_status_idx ON payment_requests(status, created_at DESC);

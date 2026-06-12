-- BillDEE Beta Schema Migration
-- Run this in Supabase SQL Editor before beta launch

-- ── businesses table (extend existing) ──────────────────────────
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS promptpay    TEXT,
  ADD COLUMN IF NOT EXISTS bank_account TEXT;

-- ── customers ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  tax_id       TEXT,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner access" ON customers
  USING (business_id IN (
    SELECT id FROM businesses WHERE line_user_id = auth.uid()::text
  ));
CREATE INDEX IF NOT EXISTS customers_biz_idx ON customers(business_id);

-- ── products / services ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  sku          TEXT,
  category     TEXT,
  description  TEXT,
  unit_price   NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit         TEXT DEFAULT 'ชิ้น',
  has_vat      BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner access" ON products
  USING (business_id IN (
    SELECT id FROM businesses WHERE line_user_id = auth.uid()::text
  ));
CREATE INDEX IF NOT EXISTS products_biz_idx ON products(business_id);

-- ── transactions (extend existing) ───────────────────────────────
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS type           TEXT,          -- 'income' | 'expense'
  ADD COLUMN IF NOT EXISTS date           DATE,          -- alias for txn_date
  ADD COLUMN IF NOT EXISTS vendor         TEXT,          -- alias for title (expense)
  ADD COLUMN IF NOT EXISTS doc_no         TEXT,          -- IV67050001 / AP67050001
  ADD COLUMN IF NOT EXISTS vendor_tax_id  TEXT,          -- สำหรับรายงานภาษีซื้อ
  ADD COLUMN IF NOT EXISTS vendor_branch  TEXT DEFAULT '00000',
  ADD COLUMN IF NOT EXISTS wht_rate       NUMERIC(4,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wht_amount     NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pay_method     TEXT DEFAULT 'โอนเงิน',
  ADD COLUMN IF NOT EXISTS bank_account   TEXT,
  ADD COLUMN IF NOT EXISTS m40_type      TEXT,   -- ม.40 category for personal income tax
  ADD COLUMN IF NOT EXISTS sso_amount    NUMERIC(8,2) DEFAULT 0,  -- ประกันสังคมที่ถูกหักต่อเดือน
  ADD COLUMN IF NOT EXISTS wht_inc_rate  NUMERIC(4,2) DEFAULT 0,  -- อัตรา WHT ที่ถูกหักจากรายรับ
  ADD COLUMN IF NOT EXISTS wht_inc_amt   NUMERIC(12,2) DEFAULT 0; -- ยอด WHT ที่ถูกหักจากรายรับ

-- Sync type ↔ kind for existing rows
UPDATE transactions SET type = kind WHERE type IS NULL AND kind IS NOT NULL;
UPDATE transactions SET date = txn_date::DATE WHERE date IS NULL AND txn_date IS NOT NULL;

-- ── documents (for receivables / invoices tracking) ───────────────
CREATE TABLE IF NOT EXISTS documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  doc_type     TEXT NOT NULL,   -- 'quotation','invoice','tax_invoice','receipt','delivery_order','payment_voucher'
  doc_no       TEXT,
  customer_name TEXT,
  customer_tax_id TEXT,
  customer_address TEXT,
  issue_date   DATE DEFAULT CURRENT_DATE,
  due_date     DATE,
  amount       NUMERIC(12,2) DEFAULT 0,
  vat_amount   NUMERIC(12,2) DEFAULT 0,
  wht_amount   NUMERIC(12,2) DEFAULT 0,
  net_amount   NUMERIC(12,2) DEFAULT 0,
  status       TEXT DEFAULT 'draft',  -- draft | sent | paid | partial_paid | overdue | cancelled
  note         TEXT,
  items        JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner access" ON documents
  USING (business_id IN (
    SELECT id FROM businesses WHERE line_user_id = auth.uid()::text
  ));
CREATE INDEX IF NOT EXISTS documents_biz_status_idx ON documents(business_id, status);
CREATE INDEX IF NOT EXISTS documents_due_date_idx ON documents(due_date);

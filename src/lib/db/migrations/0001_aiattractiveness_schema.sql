-- Migration: 0001_aiattractiveness_schema.sql
-- Description: ColorAI Portal isolated schema (auth, shared credit wallet, immutable ledger, orders, webhook dedup, async report jobs)
-- Constraint: ALL objects are scoped to the 'colorai_portal' schema. Never touches public or other projects.

CREATE SCHEMA IF NOT EXISTS colorai_portal;

-- 1. Better Auth User Table
CREATE TABLE IF NOT EXISTS colorai_portal.user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  image TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Better Auth Session Table
CREATE TABLE IF NOT EXISTS colorai_portal.session (
  id TEXT PRIMARY KEY,
  expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  user_id TEXT NOT NULL REFERENCES colorai_portal.user(id) ON DELETE CASCADE
);

-- 3. Better Auth Account Table
CREATE TABLE IF NOT EXISTS colorai_portal.account (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES colorai_portal.user(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at TIMESTAMP WITHOUT TIME ZONE,
  refresh_token_expires_at TIMESTAMP WITHOUT TIME ZONE,
  scope TEXT,
  password TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Better Auth Verification Table
CREATE TABLE IF NOT EXISTS colorai_portal.verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 5. Credit Wallet (Shared balance per user across all ColorAI Portal apps)
CREATE TABLE IF NOT EXISTS colorai_portal.credit_wallet (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES colorai_portal.user(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_granted INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT colorai_wallet_balance_check CHECK (balance >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS colorai_wallet_user_idx ON colorai_portal.credit_wallet(user_id);

-- 6. Immutable Credit Ledger (Audit trail for all credit additions, spends, and refunds)
CREATE TABLE IF NOT EXISTS colorai_portal.credit_ledger (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES colorai_portal.credit_wallet(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES colorai_portal.user(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'pack_purchase', 'report_reserve', 'report_settle', 'report_refund', 'order_refund'
  reference_id TEXT NOT NULL, -- orderId, reportJobId, or reversal ID
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS colorai_ledger_user_idx ON colorai_portal.credit_ledger(user_id);
CREATE INDEX IF NOT EXISTS colorai_ledger_ref_idx ON colorai_portal.credit_ledger(reference_id);
CREATE INDEX IF NOT EXISTS colorai_ledger_created_idx ON colorai_portal.credit_ledger(created_at);

-- 7. Credit Pack Orders (One-time credit pack purchases via Waffo Pancake)
CREATE TABLE IF NOT EXISTS colorai_portal.credit_order (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES colorai_portal.user(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL,
  credits INTEGER NOT NULL,
  amount_usd TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
  checkout_session_id TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMP WITHOUT TIME ZONE,
  refunded_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS colorai_order_waffo_id_idx ON colorai_portal.credit_order(order_id);
CREATE INDEX IF NOT EXISTS colorai_order_user_idx ON colorai_portal.credit_order(user_id);
CREATE INDEX IF NOT EXISTS colorai_order_status_idx ON colorai_portal.credit_order(status);

-- 8. Webhook Delivery Dedup (Cryptographic idempotency for provider deliveries)
CREATE TABLE IF NOT EXISTS colorai_portal.webhook_event (
  id TEXT PRIMARY KEY, -- provider event ID
  provider TEXT NOT NULL DEFAULT 'waffo',
  event_type TEXT NOT NULL,
  order_id TEXT,
  payload JSONB,
  processed_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS colorai_webhook_order_idx ON colorai_portal.webhook_event(order_id);

-- 9. Report Jobs (Shared async task queue across all ColorAI Portal apps; input_params.app identifies the feature)
CREATE TABLE IF NOT EXISTS colorai_portal.report_job (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES colorai_portal.user(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'refunded'
  model TEXT NOT NULL DEFAULT 'deepseek-flash',
  credits_cost INTEGER NOT NULL DEFAULT 1,
  input_params JSONB,
  result JSONB,
  error TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS colorai_report_user_idx ON colorai_portal.report_job(user_id);
CREATE INDEX IF NOT EXISTS colorai_report_status_idx ON colorai_portal.report_job(status);

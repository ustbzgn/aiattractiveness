-- Migration: 0001_aiattractiveness_schema.sql
-- Description: Isolated schema, auth tables, credit wallet, immutable ledger, orders, webhook dedup, and report jobs
-- Constraint: ALL objects are scoped to the 'aiattractiveness' schema. Never touches public or other projects.

CREATE SCHEMA IF NOT EXISTS aiattractiveness;

-- 1. Better Auth User Table
CREATE TABLE IF NOT EXISTS aiattractiveness.user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  image TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Better Auth Session Table
CREATE TABLE IF NOT EXISTS aiattractiveness.session (
  id TEXT PRIMARY KEY,
  expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  user_id TEXT NOT NULL REFERENCES aiattractiveness.user(id) ON DELETE CASCADE
);

-- 3. Better Auth Account Table
CREATE TABLE IF NOT EXISTS aiattractiveness.account (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES aiattractiveness.user(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS aiattractiveness.verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 5. Credit Wallet (Aggregated balance per user)
CREATE TABLE IF NOT EXISTS aiattractiveness.credit_wallet (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES aiattractiveness.user(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_granted INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT aat_wallet_balance_check CHECK (balance >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS aat_wallet_user_idx ON aiattractiveness.credit_wallet(user_id);

-- 6. Immutable Credit Ledger (Audit trail for all credit additions, spends, and refunds)
CREATE TABLE IF NOT EXISTS aiattractiveness.credit_ledger (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES aiattractiveness.credit_wallet(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES aiattractiveness.user(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'pack_purchase', 'report_reserve', 'report_settle', 'report_refund', 'order_refund'
  reference_id TEXT NOT NULL, -- orderId, reportJobId, or reversal ID
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS aat_ledger_user_idx ON aiattractiveness.credit_ledger(user_id);
CREATE INDEX IF NOT EXISTS aat_ledger_ref_idx ON aiattractiveness.credit_ledger(reference_id);
CREATE INDEX IF NOT EXISTS aat_ledger_created_idx ON aiattractiveness.credit_ledger(created_at);

-- 7. Credit Pack Orders (One-time credit pack purchases via Waffo Pancake)
CREATE TABLE IF NOT EXISTS aiattractiveness.credit_order (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES aiattractiveness.user(id) ON DELETE CASCADE,
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

CREATE UNIQUE INDEX IF NOT EXISTS aat_order_waffo_id_idx ON aiattractiveness.credit_order(order_id);
CREATE INDEX IF NOT EXISTS aat_order_user_idx ON aiattractiveness.credit_order(user_id);
CREATE INDEX IF NOT EXISTS aat_order_status_idx ON aiattractiveness.credit_order(status);

-- 8. Webhook Delivery Dedup (Cryptographic idempotency for provider deliveries)
CREATE TABLE IF NOT EXISTS aiattractiveness.webhook_event (
  id TEXT PRIMARY KEY, -- provider event ID
  provider TEXT NOT NULL DEFAULT 'waffo',
  event_type TEXT NOT NULL,
  order_id TEXT,
  payload JSONB,
  processed_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS aat_webhook_order_idx ON aiattractiveness.webhook_event(order_id);

-- 9. Report Jobs (Placeholder for future DeepSeek portrait analysis execution)
CREATE TABLE IF NOT EXISTS aiattractiveness.report_job (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES aiattractiveness.user(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'refunded'
  model TEXT NOT NULL DEFAULT 'deepseek-flash',
  credits_cost INTEGER NOT NULL DEFAULT 1,
  input_params JSONB,
  result JSONB,
  error TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS aat_report_user_idx ON aiattractiveness.report_job(user_id);
CREATE INDEX IF NOT EXISTS aat_report_status_idx ON aiattractiveness.report_job(status);

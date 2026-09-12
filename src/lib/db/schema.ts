import {
  pgSchema,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

/**
 * STRICT ISOLATION: All database objects for this project are created
 * inside the dedicated 'aiattractiveness' PostgreSQL schema.
 * Never references or modifies agentory tables or any public tables.
 */
export const aatSchema = pgSchema('aiattractiveness');

// 1. Better Auth User Table
export const user = aatSchema.table('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 2. Better Auth Session Table
export const session = aatSchema.table('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

// 3. Better Auth Account Table
export const account = aatSchema.table('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 4. Better Auth Verification Table
export const verification = aatSchema.table('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 5. Credit Wallet (Current state per user)
export const creditWallet = aatSchema.table(
  'credit_wallet',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    balance: integer('balance').notNull().default(0),
    lifetimeGranted: integer('lifetime_granted').notNull().default(0),
    lifetimeSpent: integer('lifetime_spent').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('aat_wallet_user_idx').on(t.userId),
  ]
);

// 6. Immutable Credit Ledger (Every transaction is append-only)
export const creditLedger = aatSchema.table(
  'credit_ledger',
  {
    id: text('id').primaryKey(),
    walletId: text('wallet_id')
      .notNull()
      .references(() => creditWallet.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(), // positive = credit, negative = debit
    balanceAfter: integer('balance_after').notNull(),
    type: text('type').notNull(), // 'pack_purchase' | 'report_reserve' | 'report_settle' | 'report_refund' | 'order_refund'
    referenceId: text('reference_id').notNull(), // orderId, reportJobId, or reversalId
    notes: text('notes'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('aat_ledger_user_idx').on(t.userId),
    index('aat_ledger_ref_idx').on(t.referenceId),
    index('aat_ledger_created_idx').on(t.createdAt),
  ]
);

// 7. Credit Pack Orders (One-time Waffo orders)
export const creditOrder = aatSchema.table(
  'credit_order',
  {
    id: text('id').primaryKey(), // local UUID
    orderId: text('order_id').notNull(), // Waffo order ID
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    packId: text('pack_id').notNull(),
    credits: integer('credits').notNull(),
    amountUsd: text('amount_usd').notNull(),
    currency: text('currency').notNull().default('USD'),
    status: text('status').notNull().default('pending'), // 'pending' | 'paid' | 'failed' | 'refunded'
    checkoutSessionId: text('checkout_session_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    paidAt: timestamp('paid_at'),
    refundedAt: timestamp('refunded_at'),
  },
  (t) => [
    uniqueIndex('aat_order_waffo_id_idx').on(t.orderId),
    index('aat_order_user_idx').on(t.userId),
    index('aat_order_status_idx').on(t.status),
  ]
);

// 8. Webhook Delivery Dedup (Cryptographic idempotency)
export const webhookEvent = aatSchema.table(
  'webhook_event',
  {
    id: text('id').primaryKey(), // provider delivery event ID
    provider: text('provider').notNull().default('waffo'),
    eventType: text('event_type').notNull(),
    orderId: text('order_id'),
    payload: jsonb('payload'),
    processedAt: timestamp('processed_at').notNull().defaultNow(),
  },
  (t) => [
    index('aat_webhook_order_idx').on(t.orderId),
  ]
);

// 9. Report Jobs (Placeholder for future portrait analysis reports)
export const reportJob = aatSchema.table(
  'report_job',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('pending'), // 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
    model: text('model').notNull().default('deepseek-flash'),
    creditsCost: integer('credits_cost').notNull().default(1),
    inputParams: jsonb('input_params'),
    result: jsonb('result'),
    error: text('error'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
  },
  (t) => [
    index('aat_report_user_idx').on(t.userId),
    index('aat_report_status_idx').on(t.status),
  ]
);

import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvLocal() {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnvLocal();

const databaseUrl = process.env.DATABASE_URL;
const targetEmail = process.argv[2] || 'ustbzgn@163.com';
const grantAmount = parseInt(process.argv[3] || '1000', 10);

if (!databaseUrl) {
  console.error('[ERROR] DATABASE_URL not found');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: !databaseUrl.includes('localhost') ? { rejectUnauthorized: false } : undefined,
});

async function run() {
  try {
    await client.connect();
    console.log(`[DB Connected] Searching for account: ${targetEmail}`);

    const userRes = await client.query(
      'SELECT id, name, email FROM aiattractiveness.user WHERE email = $1',
      [targetEmail]
    );

    let userId;
    if (userRes.rows.length === 0) {
      console.log(`[Notice] User ${targetEmail} not found in database yet. Creating user record...`);
      userId = `usr_test_${Date.now()}`;
      await client.query(
        'INSERT INTO aiattractiveness.user (id, name, email, email_verified) VALUES ($1, $2, $3, $4)',
        [userId, 'Test User', targetEmail, true]
      );
    } else {
      userId = userRes.rows[0].id;
      console.log(`[User Found] ID: ${userId}, Name: ${userRes.rows[0].name}`);
    }

    const walletId = `wlt_${userId}`;

    // Upsert wallet
    await client.query(
      `INSERT INTO aiattractiveness.credit_wallet (id, user_id, balance, lifetime_granted, lifetime_spent)
       VALUES ($1, $2, $3, $3, 0)
       ON CONFLICT (user_id) DO UPDATE
       SET balance = aiattractiveness.credit_wallet.balance + $3,
           lifetime_granted = aiattractiveness.credit_wallet.lifetime_granted + $3,
           updated_at = NOW()`,
      [walletId, userId, grantAmount]
    );

    // Get current balance
    const walletRes = await client.query(
      'SELECT balance FROM aiattractiveness.credit_wallet WHERE user_id = $1',
      [userId]
    );
    const currentBalance = walletRes.rows[0]?.balance;

    // Record ledger entry
    const ledgerId = `ldg_grant_${Date.now()}`;
    await client.query(
      `INSERT INTO aiattractiveness.credit_ledger (id, wallet_id, user_id, amount, balance_after, type, reference_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        ledgerId,
        walletId,
        userId,
        grantAmount,
        currentBalance,
        'pack_purchase',
        'manual_test_grant',
        `Test grant: ${grantAmount} credits for email ${targetEmail}`,
      ]
    );

    console.log(`\x1b[32m[SUCCESS]\x1b[0m Successfully credited ${grantAmount} credits to ${targetEmail}!`);
    console.log(`\x1b[36m[Current Balance]\x1b[0m ${currentBalance} credits`);
  } catch (err) {
    console.error('[Error]:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();

import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from 'better-auth/crypto';
import crypto from 'node:crypto';

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

if (!databaseUrl || databaseUrl.includes('placeholder')) {
  console.error('[ERROR] DATABASE_URL is not configured in .env.local.');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: !databaseUrl.includes('localhost') ? { rejectUnauthorized: false } : undefined,
});

async function run() {
  try {
    await client.connect();
    console.log('[DB Connected] Seeding user fakezgn@126.com into schema aiattractiveness...');

    const email = 'fakezgn@126.com';
    const plainPassword = '111111111';
    const name = 'fakezgn';
    const credits = 1000;

    // Check if user already exists
    const checkUser = await client.query(
      `SELECT id FROM aiattractiveness.user WHERE email = $1;`,
      [email]
    );

    let userId;
    if (checkUser.rows.length > 0) {
      userId = checkUser.rows[0].id;
      console.log(`[User Exists] User with email ${email} found: ${userId}. Updating password and wallet...`);
    } else {
      userId = `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      await client.query(
        `INSERT INTO aiattractiveness.user (id, name, email, email_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW());`,
        [userId, name, email, true]
      );
      console.log(`[User Created] Created user: id=${userId}, email=${email}`);
    }

    // Hash password
    const hashedPassword = await hashPassword(plainPassword);

    // Upsert account
    const checkAccount = await client.query(
      `SELECT id FROM aiattractiveness.account WHERE user_id = $1 AND provider_id = 'credential';`,
      [userId]
    );

    if (checkAccount.rows.length > 0) {
      await client.query(
        `UPDATE aiattractiveness.account
         SET password = $1, account_id = $2, updated_at = NOW()
         WHERE id = $3;`,
        [hashedPassword, userId, checkAccount.rows[0].id]
      );
      console.log(`[Account Updated] Password updated for credential account.`);
    } else {
      const accountId = `acc_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      await client.query(
        `INSERT INTO aiattractiveness.account (id, account_id, provider_id, user_id, password, created_at, updated_at)
         VALUES ($1, $2, 'credential', $3, $4, NOW(), NOW());`,
        [accountId, userId, userId, hashedPassword]
      );
      console.log(`[Account Created] Created credential account for user.`);
    }

    // Upsert credit_wallet
    const walletId = `wlt_${userId}`;
    const checkWallet = await client.query(
      `SELECT id, balance FROM aiattractiveness.credit_wallet WHERE user_id = $1;`,
      [userId]
    );

    if (checkWallet.rows.length > 0) {
      await client.query(
        `UPDATE aiattractiveness.credit_wallet
         SET balance = $1, lifetime_granted = $1, updated_at = NOW()
         WHERE user_id = $2;`,
        [credits, userId]
      );
      console.log(`[Wallet Updated] Balance set to ${credits} credits.`);
    } else {
      await client.query(
        `INSERT INTO aiattractiveness.credit_wallet (id, user_id, balance, lifetime_granted, lifetime_spent, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 0, NOW(), NOW());`,
        [walletId, userId, credits, credits]
      );
      console.log(`[Wallet Created] Created wallet with ${credits} credits.`);
    }

    // Insert credit_ledger entry
    const ledgerId = `ldg_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
    await client.query(
      `INSERT INTO aiattractiveness.credit_ledger (id, wallet_id, user_id, amount, balance_after, type, reference_id, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pack_purchase', 'admin_initial_grant', 'Initial grant: 1000 credits', NOW());`,
      [ledgerId, walletId, userId, credits, credits]
    );
    console.log(`[Ledger Appended] Ledger entry ${ledgerId} recorded.`);

    console.log('\n[Summary]');
    console.log(`Email: ${email}`);
    console.log(`Password: ${plainPassword}`);
    console.log(`Credits: ${credits}`);
    console.log(`User ID: ${userId}`);
    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('[Error Seeding User]:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();

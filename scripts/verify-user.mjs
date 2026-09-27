import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyPassword } from 'better-auth/crypto';

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
const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: !databaseUrl.includes('localhost') ? { rejectUnauthorized: false } : undefined,
});

async function run() {
  try {
    await client.connect();
    console.log('[Verification] Checking user fakezgn@126.com in PostgreSQL...');

    const userRes = await client.query(
      `SELECT id, name, email, email_verified, created_at FROM aiattractiveness.user WHERE email = 'fakezgn@126.com';`
    );
    if (userRes.rows.length === 0) {
      throw new Error('User not found!');
    }
    const user = userRes.rows[0];
    console.log('✓ User record:', user);

    const accRes = await client.query(
      `SELECT id, account_id, provider_id, password FROM aiattractiveness.account WHERE user_id = $1;`,
      [user.id]
    );
    if (accRes.rows.length === 0) {
      throw new Error('Account record not found!');
    }
    const acc = accRes.rows[0];
    const isPassValid = await verifyPassword({
      hash: acc.password,
      password: '111111111'
    });
    console.log('✓ Account verified:', {
      provider_id: acc.provider_id,
      account_id: acc.account_id,
      password_matches_111111111: isPassValid
    });

    const walletRes = await client.query(
      `SELECT id, user_id, balance, lifetime_granted, lifetime_spent FROM aiattractiveness.credit_wallet WHERE user_id = $1;`,
      [user.id]
    );
    if (walletRes.rows.length === 0) {
      throw new Error('Wallet not found!');
    }
    const wallet = walletRes.rows[0];
    console.log('✓ Credit wallet:', wallet);

    const ledgerRes = await client.query(
      `SELECT id, amount, balance_after, type, reference_id, notes FROM aiattractiveness.credit_ledger WHERE user_id = $1 ORDER BY created_at DESC;`,
      [user.id]
    );
    console.log('✓ Credit ledger count:', ledgerRes.rows.length);
    console.log('✓ Latest ledger entry:', ledgerRes.rows[0]);

    if (isPassValid && wallet.balance === 1000) {
      console.log('\n[PASS] All verification checks passed with 100% success!');
    } else {
      console.error('\n[FAIL] Verification checks failed.');
      process.exit(1);
    }
  } catch (err) {
    console.error('[Error during verification]:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();

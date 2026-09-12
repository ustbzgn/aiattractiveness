import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local manually if not loaded in process.env
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
  console.error('\x1b[31m[ERROR]\x1b[0m DATABASE_URL is not configured in .env.local.');
  console.log('Please set a valid PostgreSQL connection string in .env.local:');
  console.log('DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=aiattractiveness"');
  process.exit(1);
}

console.log('\x1b[36m[aiattractiveness migration]\x1b[0m Starting isolated schema migration...');
console.log('\x1b[33m[Constraint Checklist]\x1b[0m:');
console.log(' - Target Schema: "aiattractiveness"');
console.log(' - Never touches public or other projects tables');

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: !databaseUrl.includes('localhost') ? { rejectUnauthorized: false } : undefined,
});

async function run() {
  try {
    await client.connect();
    console.log('\x1b[32m[DB Connected]\x1b[0m Successfully connected to PostgreSQL.');

    const migrationSqlPath = path.resolve(
      __dirname,
      '..',
      'src',
      'lib',
      'db',
      'migrations',
      '0001_aiattractiveness_schema.sql'
    );

    if (!fs.existsSync(migrationSqlPath)) {
      throw new Error(`Migration file not found at: ${migrationSqlPath}`);
    }

    const migrationSql = fs.readFileSync(migrationSqlPath, 'utf8');

    console.log('\x1b[34m[Executing SQL]\x1b[0m Running isolated 0001_aiattractiveness_schema.sql...');
    await client.query(migrationSql);

    // Verify all created tables in aiattractiveness schema
    const res = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'aiattractiveness'
      ORDER BY table_name;
    `);

    console.log('\x1b[32m[Migration Complete]\x1b[0m Verified tables in schema "aiattractiveness":');
    res.rows.forEach((row, i) => {
      console.log(`  ${i + 1}. aiattractiveness.${row.table_name}`);
    });

  } catch (err) {
    console.error('\x1b[31m[Migration Failed]\x1b[0m:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();

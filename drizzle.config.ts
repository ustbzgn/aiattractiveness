import { defineConfig } from 'drizzle-kit';

/**
 * STRICT ISOLATION CONFIGURATION:
 * 1. Only touches schema files inside aiattractiveness project.
 * 2. schemaFilter ensures Drizzle Kit is strictly constrained to the 'aiattractiveness' schema.
 * 3. Never affects agentory or any public tables in shared database.
 */
export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './src/lib/db/migrations',
  dialect: 'postgresql',
  schemaFilter: ['aiattractiveness'],
  strict: true,
  verbose: true,
});

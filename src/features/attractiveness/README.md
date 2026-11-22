# Feature: Attractiveness Test (`src/features/attractiveness/`)

Fully self-contained portrait evaluation app within ColorAI Portal.

- **Public URL**: `/attractiveness-test` (`src/app/attractiveness-test/page.tsx`)
- **API**: `POST /api/apps/attractiveness/portrait` (async Deep/Compare jobs poll `GET /api/jobs/[jobId]`)
- **Credit Costs** (`config.ts`): `fast: 10`, `deep: 40`, `compare: 50`
- **Internal Structure**:
  - `components/AttractivenessApp.tsx` + `AttractivenessApp.module.css` — main UI
  - `components/report/*` — Fast, Deep Scan, and Compare report renderers
  - `server/*` — DeepSeek evaluator, poster prompts/generators, region cropping
  - `lib/report-exporter.ts` — PNG poster export helper
  - `types.ts` — Deep Scan data contracts and fixtures
  - `index.ts` — single barrel export

> Isolation: Do not import this feature from other `src/features/*` modules.

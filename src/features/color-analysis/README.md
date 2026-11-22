# Feature: Personal Color Analysis (`src/features/color-analysis/`)

Independent seasonal color analysis feature shell within ColorAI Portal.

- **Public URL**: `/color-analysis` (`src/app/color-analysis/page.tsx`)
- **API**: `POST /api/apps/color-analysis` (shared async jobs poll `GET /api/jobs/[jobId]`)
- **Credit Costs** (`config.ts`): `quick: 10`, `full: 40`
- **Shared Core**: Import auth, credits, db, and image helpers ONLY from `@/core/server`.

> Isolation: When implementing this feature, read ONLY `src/core/README.md` and `src/features/color-analysis/`. Never read `src/features/attractiveness/`.

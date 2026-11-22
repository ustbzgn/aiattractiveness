# ColorAI Portal Core (`src/core/`)

Shared platform foundation for all ColorAI Portal apps.

## Context Isolation Rule (Important for AI)
- When building or editing a feature under `src/features/<app>/`, **only read this README + `src/features/<app>/`**.
- **Never** read or import files from another `src/features/<other-app>/`.
- `src/core/` **never** imports from `src/features/*`.

## Shared Imports
- **Server primitives (`@/core/server`)**:
  - Auth: `auth`, `resolveCurrentUserId`, `getOrCreateCurrentUserId`
  - Credits: `deductCredits`, `refundCredits`, `InsufficientCreditsError`, `getUserWallet`, `getOrCreateUserWallet`
  - Database: `db`, `reportJob` (PostgreSQL schema: `colorai_portal`)
  - Shared AI / Image utilities: `generateImage`, `getToApisConfig`, `normalizePortraitImage`
- **App Registry (`@/core/registry`)**: `PORTAL_APPS`, `getPortalAppById` (pure static metadata only)
- **Global Config (`@/lib/config`)**: `APP_CONFIG`, `CREDIT_PACKAGES`

## Shared Routes
- Auth: `/api/auth/[...all]`
- Credits balance: `GET /api/user/credits`
- Checkout & Webhook: `POST /api/checkout/credits`, `POST /api/webhook/waffo`, `GET /api/orders/[orderId]/status`
- Async job polling (all apps): `GET /api/jobs/[jobId]` — insert into `reportJob` with `inputParams: { app: '<appId>', mode }` and poll this endpoint.

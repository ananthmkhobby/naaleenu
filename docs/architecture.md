# Breakfast Decision Assistant Architecture

## Product posture

This prototype optimizes for one job: help a homemaker decide breakfast in under 10 seconds. The app should feel like a calm assistant, not a recipe marketplace. The home screen therefore renders one dish, one reason and two dominant actions.

The product still includes a secondary Breakfast Book because households sometimes need to inspect the full set of breakfasts and lunchbox ideas or save a family-specific staple. This path is intentionally one level quieter than the recommendation screen so browsing does not become the default behavior.

## Research notes checked on 23 September 2026

- React: official React versions page and React 19.2 announcement show React 19.2 as the current stable family.
- Vite: official Vite releases page lists `vite@8.3` as the current patch line, with security backports to selected older lines.
- FastAPI: official release notes list FastAPI 0.141.1 on 29 July 2026.
- Capacitor: official docs are on v8 and include upgrade guidance through 8.5, supporting the PWA-first to native-shell path.

Sources:
- https://react.dev/versions
- https://react.dev/blog/2025/10/01/react-19-2
- https://vite.dev/releases
- https://fastapi.tiangolo.com/release-notes/
- https://capacitorjs.com/docs

## Stack decision

- Client: React, TypeScript and Vite PWA.
- UI: CSS token layer for the prototype, with Tailwind still compatible if the team wants utility classes later.
- Server state: TanStack Query is installed for caching/retry defaults. Current vertical slice uses explicit calls to keep the flow easy to inspect.
- Offline storage: Dexie over IndexedDB for household state, history and mutation outbox.
- API: FastAPI and Pydantic. OpenAPI is generated automatically by FastAPI.
- Native path: Capacitor after the PWA stabilizes. Business rules and storage are kept behind modules so native capabilities can replace browser-specific adapters later.

## Domain flow

1. User completes minimal household setup.
2. Optional pantry selection improves ranking but can be skipped.
3. Client sends household, pantry, recent history and session exclusions to `/v1/recommendations`.
4. API applies hard filters, scores eligible dishes and returns exactly one recommendation with reason codes.
5. “Another” adds the current dish to a short session exclusion list.
6. “Cook this” opens a concise cooking screen.
7. Mark cooked and feedback are persisted locally first, with an outbox fallback when the API is unavailable.
8. The user can switch between Breakfast and Lunchbox modes without leaving the decision screen.
9. The Breakfast Book lists seeded dishes from the API plus locally saved family dishes from IndexedDB.
10. Favorite dish IDs are stored locally, sorted first in Breakfast Book and sent to the recommendation engine as loved preference signals.
11. Custom family dishes for the active meal type are included in recommendation requests so they can appear on the decision screen.
12. Catalog dishes can be copied into the family folder and edited locally without mutating the curated seed catalog.
13. Custom family recipes can store an optional local photo data URL for display in the recipe book, dashboard and cook view.
14. A short “Naale enu?” splash screen provides product identity before the dashboard.
15. Tomorrow Plan uses the existing breakfast and lunchbox catalogs plus family recipes to create a one-screen plan for tomorrow.
16. Leftover Magic maps common leftovers to practical recipes without requiring detailed pantry inventory.

## Recommendation engine

The engine is deterministic and explainable. It never depends on an LLM at runtime. The scoring weights live in `apps/api/app/services/recommendation.py`:

- Household preference fit: 30 percent
- Ingredient availability: 25 percent
- Morning time fit: 20 percent
- Variety and recency: 15 percent
- Historical acceptance: 10 percent

Hard constraints always win: diet compatibility, avoided ingredients, household-level do-not-suggest entries, active session exclusions and quicker-than limits. Favorites are preference boosts, not overrides. When “Another” is used, the client can ask the engine to avoid the current dish category so similar dishes such as dosa variants do not appear back to back when enough alternatives exist. Fallback relaxation may relax category, repeat and time limits, but not diet or avoid rules.

## Security and privacy

- No login, personal name, email, phone or location is collected.
- Household IDs are random UUID-derived values.
- Mutation endpoints accept idempotency keys.
- API responses use Pydantic validation.
- CORS is local-only in the prototype.
- Request correlation IDs are propagated through `x-correlation-id`.
- Secrets belong in `.env`; `.env.example` is committed.

## Current implementation boundary

The prototype currently uses in-memory API state so the first vertical slice can run locally without a database setup step. The repository already includes Docker Compose for PostgreSQL and command hooks for migration/seed. The next hardening step is to replace the in-memory stores in `apps/api/app/main.py` with SQLAlchemy 2 models and Alembic migrations without changing the HTTP contract.

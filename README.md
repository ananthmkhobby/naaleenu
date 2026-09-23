# Breakfast Decision Assistant

Mobile-first PWA prototype for homemakers who want one practical breakfast recommendation, not a recipe catalog.

## What is built

- React/Vite PWA with setup, optional pantry, breakfast/lunchbox decision modes, cook, feedback, history and Breakfast Book screens.
- Secondary Breakfast Book for browsing all seeded breakfasts and saving family custom breakfasts locally.
- Family breakfast and family lunch tabs for only saved household recipes.
- Custom dish photo upload stored locally offline and in Supabase Storage after sign-in.
- “Naale enu?” splash screen with Indian homemaker artwork.
- Tomorrow Plan: one breakfast, one lunchbox, one dinner rescue, one prep action and a tiny grocery gap.
- Leftover Magic: converts common leftovers such as rice, chapati, dal, sambar and batter into practical ideas.
- Supabase-ready auth, sync, storage, analytics, Tomorrow Plan persistence, prep tasks and grocery gaps.
- Vercel deployment configuration with static catalog fallback when the FastAPI prototype service is absent.
- Favorite dishes saved locally and prioritized first in the Breakfast Book and recommendation ranking.
- FastAPI service with a deterministic recommendation engine.
- 216-dish breakfast seed corpus plus 119 lunchbox ideas, ordered South Indian first, then North Indian, then Western quick options.
- Side-dish suggestions for breakfast and lunchbox recommendations.
- Family/custom recipe editing after copying catalog dishes.
- IndexedDB local household state, latest recommendation, meal history and offline outbox.
- PWA manifest and service worker shell caching.
- Unit tests for recommendation hard rules.

## Commands

```bash
pnpm install
pnpm dev
pnpm test
pnpm build
pnpm smoke
```

Database hooks are present for the production path:

```bash
pnpm db-up
pnpm db-migrate
pnpm seed
```

## Local URLs

- Web: `http://localhost:5173`
- API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

## Stack

- React 19 family, TypeScript and Vite PWA.
- FastAPI and Pydantic.
- Dexie over IndexedDB.
- TanStack Query installed for server-state growth.
- Capacitor is the intended first native wrapper after PWA hardening.

## Product principles

- Returning user should see one useful breakfast quickly.
- Lunchbox uses the same low-click recommendation pattern because packing decisions are also decision-fatigue problems.
- Tomorrow Plan is designed as the daily habit loop: one tap in the evening to reduce the next day’s mental load.
- Home screen has only two dominant actions: `Cook this` and `Another`.
- Browsing is available when needed, but it stays behind the secondary Breakfast Book control.
- Favorite dishes are tried first when they still fit diet, avoid ingredients and time constraints.
- “Another” avoids repeating the same dish family when enough alternatives exist.
- “Quicker” exists as a small contextual intent.
- No LLM is required for runtime recommendation.
- No personal identifiers are collected in the MVP.

## Deployment

See [docs/deployment-vercel-supabase.md](docs/deployment-vercel-supabase.md) for Vercel and Supabase setup.

## Launch readiness

- Ready for a connected beta on Vercel and Supabase after applying the Supabase migration and setting Vercel environment variables.
- User/family data, custom recipes, Tomorrow Plans, prep tasks, grocery gaps, meal events, feedback and analytics have Supabase persistence with Row Level Security.
- The app remains usable offline with IndexedDB and static catalog fallbacks.
- Browser reminders are implemented as local notifications after permission. True production push reminders still need a Push API/provider or serverless notification workflow.
- Seed catalog photos are still illustrative generated visuals. Custom recipe photos are real uploads; curated catalog photos need a food-editor/photo pass before a broad consumer launch.
- Seed recipe metadata is usable for product validation, but a food editor should review recipe steps, timings, side dishes and regional naming before public marketing.
- Generate Supabase TypeScript DB types and complete real-device PWA QA for iOS Safari and Android Chrome before paid acquisition.

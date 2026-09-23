# Vercel and Supabase Deployment

## Architecture

The web app deploys as a static Vite app on Vercel. Supabase provides:

- Auth for magic-link sign in and cross-device sync.
- Postgres persistence for households, custom dishes, meal events, feedback, Tomorrow Plans, prep tasks, grocery items and analytics.
- Storage for custom dish photos.
- Row Level Security so users can only access their own household data.

The app still works without Supabase configuration by using IndexedDB and static catalog files. When Supabase environment variables are present, it progressively enables sync.

## Supabase setup

1. Create a Supabase project.
2. Apply migrations from `supabase/migrations`.
3. Verify the `dish-photos` storage bucket exists.
4. Enable email magic links in Supabase Auth.
5. Set the deployed Vercel domain as an allowed redirect URL.

The migration creates:

- `households`
- `custom_dishes`
- `meal_events`
- `feedback_events`
- `tomorrow_plans`
- `prep_tasks`
- `grocery_items`
- `analytics_events`
- Storage bucket `dish-photos`

## Vercel setup

Set these Vercel environment variables:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Vercel uses `vercel.json`:

```json
{
  "buildCommand": "pnpm --filter @breakfast/web build",
  "outputDirectory": "apps/web/dist",
  "installCommand": "pnpm install"
}
```

## Official docs checked

- Supabase Auth and JavaScript client: https://supabase.com/docs/reference/javascript/auth
- Supabase database migrations: https://supabase.com/docs/guides/deployment/database-migrations
- Supabase Storage: https://supabase.com/docs/guides/storage/quickstart
- Vercel Vite deployment: https://vercel.com/docs/frameworks/frontend/vite

## Remaining production hardening

- Replace browser-only reminder scheduling with true push notifications using a push provider or serverless scheduled workflow.
- Add generated Supabase TypeScript types for stricter DB contracts.
- Add real-device QA for iOS Safari, Android Chrome and installable PWA behavior.

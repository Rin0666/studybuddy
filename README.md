1 file changed
+119
-1
studybuddy/README.md
# StudyForge

StudyForge turns a topic into a structured, AI-generated study guide. Choose a scope and model, then explore a summary, lesson plan, quiz, and export-ready materials from one responsive web app.

## Features

- Generate guides at Quick, Standard, or Comprehensive scope
- Choose from Qwen 2.5 7B, Qwen 3 32B, and Llama 3.1 70B
- Explore nested subtopics and request focused deep dives
- Review an automatically generated quiz
- Export study materials as JSON, PDF, or PowerPoint
- Sign up, sign in, and reset passwords with Supabase Auth
- Save study sets to an account and reopen them later
- Share lessons privately by email or publish them with a public link

## Tech stack

- React 18 and TypeScript
- Vite 7
- Tailwind CSS 4
- Supabase Auth, Postgres, and Edge Functions
- Featherless AI for model inference
- Zod for response validation
- pdf-lib and PptxGenJS for client-side exports

## Prerequisites

- Node.js `^20.19.0` or `>=22.12.0`
- npm

Supabase CLI access and a Featherless API key are only required when changing or deploying the backend.

## Getting started

```bash
git clone https://github.com/Rin0666/studybuddy.git
# studybuddy
cd studybuddy
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

The app uses the deployed Supabase project by default, so no environment file is required for normal local frontend development.

### Use a different Supabase project

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-anon-key
```

Only use a Supabase publishable/anonymous key in a `VITE_` variable. Never expose a service-role key in the frontend or commit it to the repository.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |

## Backend development

The frontend calls three Supabase Edge Functions:

| Function | Responsibility |
| --- | --- |
| `studyforge-generate` | Generate the initial study guide |
| `studyforge-dive` | Produce a focused explanation and discover related material |
| `studyforge-add-subtopic` | Add a new root or nested subtopic |

To deploy them to a linked Supabase project:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set FEATHERLESS_API_KEY=YOUR_KEY
supabase functions deploy studyforge-generate
supabase functions deploy studyforge-dive
supabase functions deploy studyforge-add-subtopic
```

SQL files under `supabase/migrations/` add lesson-sharing behavior. They are incremental migrations and assume the project's core tables, including `study_sets` and `shared_study_sets`, already exist.

## Project structure

```text
src/
  components/          Pages, forms, sharing UI, and result tabs
  hooks/               Generation, deep-dive, save, and subtopic state
  lib/                 Supabase client, auth, persistence, and utilities
  types/               Shared TypeScript types and Zod schemas
supabase/
  functions/           Deno Edge Functions for AI generation
  migrations/          Incremental lesson-sharing migrations
scripts/               Administrative helper scripts
public/                 Static assets
```

## Production deployment

Build the app with:

```bash
npm run build
```

Deploy the generated `dist/` directory to any static host. Because the app uses client-side routes such as `/saved`, `/reset-password`, and `/s/:slug`, configure the host to rewrite unknown paths to `index.html`.

For authentication flows, add the production site URL and allowed redirect URLs in the Supabase Auth URL configuration.

## Security notes

- Keep `FEATHERLESS_API_KEY` in Supabase Edge Function secrets.
- Keep Supabase service-role keys server-side and out of source control.
- The Supabase anonymous/publishable key is intended for browser use; database access must still be protected by Row Level Security policies.

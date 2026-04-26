# Corto · Garden Planner

See it live:
[CORTO Demo](https://corto.vercel.app/)

Prototype **2D garden planner** (square-foot gardening style): draggable beds on a canvas, internal grid with plant **drag & drop**, **companion planting**, **seasonal** filtering, stats, and **PNG** export. State is saved in **localStorage** (no backend).


## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Script

```bash
npm run dev      # dev server
npm run build    # production build
npm run start    # serve production
npm run lint     # eslint
npm run test     # node --test (TS via tsx)
```

## AI suggestions (optional)

The “Suggestions” feature uses a server-side route handler (`src/app/api/suggestions/route.ts`).
To enable it, create `.env.local` and set:

- `OPENAI_API_KEY` (**required**)
- `OPENAI_MODEL` (default: `gpt-4o-mini`)
- `OPENAI_BASE_URL` (default: `https://api.openai.com/v1`)

Without a key the app still works, but the panel will show an error when you request suggestions.

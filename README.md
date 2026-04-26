# Corto · Garden Planner

Prototipo di **garden planner 2D** (stile *square‑foot gardening*): aiuole trascinabili su canvas, griglia interna con **drag & drop** delle piante, **companion planting**, filtro **stagionale**, statistiche ed export **PNG**. Stato salvato in **localStorage** (nessun backend).

## Requisiti

- **Node.js** (consigliato: versione recente LTS)
- **npm** (repo include `package-lock.json`)

## Avvio rapido

```bash
npm install
npm run dev
```

Apri `http://localhost:3000`.

## Script

```bash
npm run dev      # dev server
npm run build    # build produzione
npm run start    # serve produzione
npm run lint     # eslint
npm run test     # node --test (TS via tsx)
```

## Suggerimenti AI (opzionale)

La feature “Suggerimenti” usa un route handler server-side (`src/app/api/suggestions/route.ts`).
Per abilitarla crea `.env.local` e imposta:

- `OPENAI_API_KEY` (**required**)
- `OPENAI_MODEL` (default: `gpt-4o-mini`)
- `OPENAI_BASE_URL` (default: `https://api.openai.com/v1`)

Senza chiave l’app funziona comunque, ma il pannello mostrerà errore quando richiedi suggerimenti.

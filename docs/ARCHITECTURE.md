# Architecture — Windoors 11.3 Caretaker

## Stack

| Layer | Choice |
|-------|--------|
| UI | React 19 |
| Routing / app shell | TanStack Router + TanStack Start |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 + custom CSS (`src/styles.css`) |
| Icons | `lucide-react` |
| Language | TypeScript |
| Deploy target | Vercel / Grok hosting (`*.grok.me`) |

The Grok workspace also scaffolds optional **auth**, **PGlite/Neon**, and **multiplayer** packages. The caretaker game itself is a **client-only** interactive desktop and does not require accounts to play.

## Runtime model

```
Browser
  └── TanStack Router (/)
        └── ClientOnly fallback (“Starting Windoors 11.3…”)
              └── <CaretakerGame />
                    ├── Desktop wallpaper + icons
                    ├── System Health HUD
                    ├── Window stack (apps)
                    ├── Taskbar + toasts
                    ├── Remote Support / credits
                    └── BSOD overlay
```

SSR paints a lightweight boot message; gameplay state runs entirely in the browser after hydration (`ClientOnly` in `src/routes/index.tsx`).

## Key modules

### `src/components/windoors/caretaker-game.tsx`

Main game controller (~thousands of lines). Responsibilities:

- Health state, drain tick, drain levels, support freeze  
- Window open/close/drag/z-order  
- Per-app UI (update catalog, security log, drivers table, BIOS phases, support panel, …)  
- Toast queue  
- BSOD + restart  
- Clock and responsive breakpoints  

### `src/components/windoors/defrag-map.tsx`

Procedural cluster map for Optimize Drives (seeded layout, read/write animation).

### `src/lib/windoors/config.ts`

Static game design data:

- `TASKS` / `APP_KEYS`  
- `COLOR_STYLES` (full Tailwind class maps — required because dynamic class strings don’t work with Tailwind purge)  
- `DRAIN_BY_LEVEL`, `SUPPORT_DRAIN_BUMP`, `BIOS_BSOD_CHANCE`  
- `VERSION` (`11.3`), `PRODUCT_NAME`, `FULL_TITLE`  
- `CREATOR_X_URL`, `CREATOR_X_HANDLE`  

### `src/lib/windoors/updates.ts`

Fake Windows Update catalog scenarios (security, preview, feature 26H2, .NET, Defender, OOB). Random scenario pick per check.

### `src/components/created-with-grok-banner.tsx`

Optional top “Built with Grok” bar controlled by Vite env:

- `VITE_SHOW_BUILT_WITH_GROK`  
- `VITE_ALLOW_FORKING` / `VITE_PROJECT_ID`  

### `src/assets/qr-thimothybsirius.svg`

QR used on BSOD / credit surfaces → creator X profile.

## Supporting scaffold (workspace defaults)

Present in the repo but not required for basic play:

| Path | Role |
|------|------|
| `src/lib/auth/*` | better-auth integration scaffolding |
| `src/lib/db.ts` | DB helpers |
| `src/lib/multiplayer/*` | WebRTC P2P helpers |
| `migrations/` | SQL migrations |
| `scripts/migrate.mjs` | migrate on build |
| `scripts/browser-smoke.mjs` | Playwright-oriented smoke |
| `.grok/skills/` | Grok Build agent skills used during creation |

## Scripts

From `package.json`:

```bash
npm run dev          # vite dev --host 0.0.0.0 --port 8080
npm run build        # vite build && db:migrate
npm run preview      # production preview :8080
npm run typecheck
npm run lint
npm run format
```

## Environment

Typical local play needs **no secrets**. Deploy / Grok banner may set:

| Variable | Purpose |
|----------|---------|
| `VITE_SHOW_BUILT_WITH_GROK` | Show official Grok banner |
| `VITE_PROJECT_ID` | Remix / project identity |
| `VITE_ALLOW_FORKING` | Show remix control when project id set |

Database / auth env vars apply only if you enable those features.

## Asset & screenshot policy

- Gameplay screenshots live in `/screenshots` and are referenced from README and docs.  
- Presentation deck: `/docs/presentation/Windoors-11.3-Caretaker.pptx`.  
- Do not commit `node_modules/` or large local-only build caches beyond what the Grok export already includes (`.vercel/output` may exist from export; prefer regenerating via `npm run build`).

## Extending the game

1. **New tool** — add `AppKey` + `TASKS` entry in `config.ts`, then window body branch in `caretaker-game.tsx`.  
2. **New update scenario** — append to `UPDATE_SCENARIOS` in `updates.ts`.  
3. **Balance** — tweak drain constants and durations only in `config.ts` first.  
4. **Creator branding** — `CREATOR_X_URL`, QR asset, BSOD copy, Remote Support panel.

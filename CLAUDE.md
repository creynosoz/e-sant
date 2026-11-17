# CLAUDE.md

This file guides Claude Code when working in this repository.

## Project overview

`e-sant` is a site of helper tools for an accounting firm. It is a home page with one tile per
tool; tools are added over time. Everything runs **100% client-side** in the browser — no
backend, and user data (Excel files, CUITs, amounts) never leaves the user's machine. Keep it
that way unless the user explicitly decides otherwise.

Current tools:

- `sifere-retenciones` — converts an Excel of IIBB withholdings into the SIFERE WEB import
  file (Formato Nº 2, 90-char fixed-width records). See `README.md` for the file format.

## Stack

Vite + React 19 + TypeScript (strict), Vitest for tests, SheetJS (`xlsx`) for Excel reading.
Package manager: **npm**. Plain CSS (no framework) in `src/styles.css`.

## Commands

```bash
npm install
npm run dev                      # dev server at http://localhost:5173
npm test                         # all tests (vitest run)
npx vitest run src/tools/sifere-retenciones/domain/sifere.test.ts   # single file
npx vitest run -t "nombre del test"                                 # tests matching a name
npm run build                    # tsc type-check + vite build → dist/index.html
npm run preview                  # serve the build locally
```

There is no linter configured; `tsc` (run by `npm run build`) is the type/unused-code check.

## Build and deploy

- `vite-plugin-singlefile` inlines all JS and CSS into a **single `dist/index.html`**, with
  `base: './'`. The build must keep working when opened from `file://` (double-click) and on
  any static host. Don't add things that break this (server routes, lazy-loaded chunks,
  absolute asset paths, fetches to local files).
- Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`, which runs
  `npm ci`, `npm test` and `npm run build`. A failing test blocks the deploy.

## Architecture

```
src/
  main.tsx           entry point, renders <App/> and imports styles.css
  App.tsx            site shell: top bar ("e-sant" → home) + route → Home | tool | not found
  router.ts          hash router: useRoute() over location.hash, hrefFor(route)
  home/Home.tsx      home page, one tile per registered tool
  tools/
    registry.ts      TOOLS: { id, title, description, component }[]
    <tool-id>/       one self-contained folder per tool
  styles.css         global styles and design tokens (CSS variables, light/dark)
```

- **Routing is hash-based** (`#/`, `#/<tool-id>`) so it works on `file://` and GitHub Pages
  without server config. Don't switch to history/path routing or add a router library without
  asking.
- **Adding a tool:** create `src/tools/<id>/` with a default-exported component, then add an
  entry to `TOOLS` in `src/tools/registry.ts`. The tile and route come from the
  registry; nothing else needs to change. Each tool renders its own `<div className="app">`
  page container.
- Tools should not import from each other. If something becomes shared, move it to a shared
  folder under `src/` first.

### `sifere-retenciones` tool

- `domain/` — pure logic, no React or DOM: parsing, validation (CUIT mod 11, dates, amounts),
  record building. `RecordFormat` is the extension point for other SIFERE formats.
- `io/readExcel.ts` — SheetJS reading and normalization (Excel serial dates, amounts).
- `components/` — presentational React components.
- `storage.ts` — `localStorage` for the last jurisdiction, wrapped in try/catch.

## Conventions

- **Code and comments in English** (identifiers, comments, test names). Only user-facing UI
  text is in Spanish (es-AR, voseo: "Elegí", "Corregí"). Commit messages are in English,
  conventional-commit style (`feat: ...`).
- Money is handled as **integer centavos with `BigInt`** and half-up rounding — never floats.
- Keep domain logic pure and covered by Vitest tests next to the source (`*.test.ts`).
- Any `localStorage` access goes through try/catch and must degrade gracefully.
- Colors come from the CSS variables in `:root` (with a dark-mode override); don't hardcode
  colors in components.
- Development happens on Windows. Shell examples should work in PowerShell or Git Bash.
- Never commit secrets: `.env` and `.env*.local` are gitignored on purpose.

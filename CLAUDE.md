# CLAUDE.md

This file guides Claude Code when working in this repository.

## Project status

`e-sant` is a brand-new repository with no application code yet. It contains only:

- `README.md` — the project title, nothing more.
- `.gitignore` — the standard Next.js / Node template (ignores `node_modules`, `.next/`, `out/`, `build/`, `coverage/`, `.env` and `.env*.local`, `.vercel`, `*.tsbuildinfo`, `next-env.d.ts`).

The `.gitignore` suggests the plan is a **Next.js app (likely TypeScript, possibly deployed on Vercel)**, but nothing is set up yet: no `package.json`, no framework, no build, lint, or test commands.

## Working in this repo

- Don't assume tooling exists. Check for `package.json` and config files before running `npm`/`pnpm`/`yarn` commands.
- When scaffolding, ask the user before choosing the package manager, router (App vs Pages), styling, or test framework.
- Never commit secrets: `.env` and `.env*.local` are gitignored on purpose.
- Development happens on Windows. Shell examples should work in PowerShell or Git Bash.

## To update

Once the project is scaffolded, replace this section with:
- Build, dev, lint, and test commands (including how to run a single test)
- A high-level architecture overview (routing, data layer, external services)
- Project-specific conventions

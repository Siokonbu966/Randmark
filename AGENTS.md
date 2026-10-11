# AGENTS.md

Randmark: a browser-only Vue 3 app that imports a browser bookmark HTML export and suggests 10 random links. No backend.

## Commands

Package manager is **bun** (`bun.lock`); do not use npm/pnpm/yarn.

- `bun install`
- `bun run dev` — Vite dev server
- `bun run build` — runs `vue-tsc -b` (typecheck) then `vite build`; this is the only verification step
- `bun run preview`

There is **no test, lint, or formatter config**. To typecheck alone: `bunx vue-tsc -b`.

## Environment

Nix flake + direnv (`.envrc` = `use flake`) provides `nodejs_24` and `bun`. Run `direnv allow` (or `nix develop`) before working; do not assume `node`/`bun` are on PATH otherwise.

## Structure / quirks

- `src/bookmark.ts` — `parseBookmarkFile` uses the browser `DOMParser` (Netscape bookmark HTML), `pickRandom` is a Fisher-Yates shuffle. Browser-only APIs; not runnable in plain Node.
- `src/type/vite-env.d.ts` is the single type-declaration entry (holds the `*.vue` module shim) — not the usual root `env.d.ts`. Keep `.d.ts` declarations here.
- tsconfig uses project references: `tsconfig.app.json` (`src/**`) and `tsconfig.node.json` (`vite.config.ts`). Strict-ish flags are on: `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`.
- `index.html` mounts `#app` via `src/main.ts`; `src/App.vue` is the whole UI.
- Git uses `main` / `develop` / feature branches; commits follow Conventional Commits (`feat:`, `fix:`, `chore:`, `wip:`) with English or Japanese text.

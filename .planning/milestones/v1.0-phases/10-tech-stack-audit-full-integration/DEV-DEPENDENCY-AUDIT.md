# Dev Dependency Audit — ink37-tattoos

**Date:** 2026-03-26
**Node.js runtime:** v24.14.0 (LTS)
**Package manager:** bun
**Total dev dependencies:** 20

---

## Version Summary

| Package | Installed | Latest | Status |
|---|---|---|---|
| @eslint/js | 10.0.1 | 10.0.1 | Current |
| @next/eslint-plugin-next | 16.2.1 | 16.2.1 | Current |
| @tailwindcss/postcss | 4.2.2 | 4.2.2 | Current |
| @types/node | 22.15.0 | 24.12.0* | **Wrong major** |
| @types/pg | 8.11.11 | 8.20.0 | Behind (minor) |
| @types/react | 19.2.0 | 19.2.14 | Behind (patch) |
| @types/react-dom | 19.2.0 | 19.2.3 | Behind (patch) |
| @types/ws | 8.18.1 | 8.18.1 | Current |
| @vitejs/plugin-react | 4.4.1 | 6.0.1 | **2 majors behind** |
| drizzle-kit | 0.31.10 | 0.31.10 | Current |
| eslint | 10.1.0 | 10.1.0 | Current |
| eslint-plugin-import-x | 4.16.2 | 4.16.2 | Current |
| eslint-plugin-jsx-a11y | 6.10.2 | 6.10.2 | Current |
| eslint-plugin-react-hooks | 7.0.1 | 7.0.1 | Current |
| globals | 16.4.0 | 17.4.0 | **Major behind** |
| postcss | 8.5.3 | 8.5.8 | Behind (patch) |
| tailwindcss | 4.2.2 | 4.2.2 | Current |
| typescript | 5.9.3 | 6.0.2 | **Major behind** |
| typescript-eslint | 8.57.2 | 8.57.2 | Current |
| vitest | 3.1.1 | 4.1.1 | **Major behind** |

\* Should match Node.js runtime major version (24), not latest npm tag (25).

---

## Individual Audits

### @eslint/js v10.0.1
**Purpose:** ESLint's official recommended JS rules (flat config compatible)
**Config location:** `eslint.config.mjs` line 1, 14
**Current config:** Used as `js.configs.recommended` base layer
**Version status:** Current (10.0.1)
**Optimization opportunities:** None — recommended config is the right starting point. Any additional rules should be added via project-specific overrides.
**Recommendation:** KEEP as-is

---

### @next/eslint-plugin-next v16.2.1
**Purpose:** Next.js-specific ESLint rules (image optimization, link usage, metadata, core web vitals)
**Config location:** `eslint.config.mjs` lines 66-73
**Current config:** Uses both `recommended` and `core-web-vitals` rule sets via manual plugin registration (correct flat config pattern)
**Version status:** Current (16.2.1) — matches Next.js 16.2.0 in dependencies
**Optimization opportunities:** None — both recommended + core-web-vitals are enabled, which is the ideal setup.
**Recommendation:** KEEP as-is. Bump in lockstep with `next` upgrades.

---

### @tailwindcss/postcss v4.2.2
**Purpose:** Tailwind CSS v4 PostCSS plugin (replaces old tailwindcss postcss plugin)
**Config location:** `postcss.config.mjs`
**Current config:** Minimal `{ "@tailwindcss/postcss": {} }` — correct for Tailwind v4 which uses CSS-based config
**Version status:** Current (4.2.2) — matches tailwindcss version
**Optimization opportunities:** None. Tailwind v4 moved configuration to CSS (`@theme`, `@import`), so no JS config needed.
**Recommendation:** KEEP as-is. Always upgrade in lockstep with `tailwindcss`.

---

### @types/node v22.15.0
**Purpose:** TypeScript type definitions for Node.js built-in APIs
**Config location:** Referenced implicitly by TypeScript
**Current config:** Installed as v22.15.0
**Version status:** **WRONG MAJOR** — Runtime is Node.js v24.14.0 (LTS) but types are for Node.js 22. Missing types for Node 24 APIs (e.g., `require(esm)` stability, new `fs.glob`, `AbortSignal.any`). Latest @types/node@24 is 24.12.0.
**Optimization opportunities:** Upgrade to `@types/node@^24` to match runtime. Do NOT use @types/node@25 — Node 25 is an odd-numbered non-LTS release.
**Recommendation:** **UPGRADE** to `@types/node@^24.12.0`

---

### @types/pg v8.11.11
**Purpose:** TypeScript type definitions for the `pg` (node-postgres) package
**Config location:** Referenced implicitly by TypeScript when importing from `pg`
**Current config:** v8.11.11
**Version status:** Behind — latest is 8.20.0. Significant jump (8.11→8.20) adds types for newer pg features.
**Optimization opportunities:** Upgrade to latest for better type coverage.
**Recommendation:** **UPGRADE** to `@types/pg@^8.20.0`

---

### @types/react v19.2.0
**Purpose:** TypeScript type definitions for React 19
**Config location:** Referenced implicitly by TypeScript
**Current config:** v19.2.0
**Version status:** Behind (patch) — latest is 19.2.14. Patches fix edge-case type issues.
**Optimization opportunities:** Routine update.
**Recommendation:** **UPGRADE** to `@types/react@^19.2.14`

---

### @types/react-dom v19.2.0
**Purpose:** TypeScript type definitions for ReactDOM 19
**Config location:** Referenced implicitly by TypeScript
**Current config:** v19.2.0
**Version status:** Behind (patch) — latest is 19.2.3.
**Optimization opportunities:** Routine update.
**Recommendation:** **UPGRADE** to `@types/react-dom@^19.2.3`

---

### @types/ws v8.18.1
**Purpose:** TypeScript type definitions for the `ws` WebSocket package
**Config location:** Referenced implicitly by TypeScript when importing from `ws`
**Current config:** v8.18.1
**Version status:** Current (8.18.1)
**Optimization opportunities:** None.
**Recommendation:** KEEP as-is

---

### @vitejs/plugin-react v4.4.1
**Purpose:** Vite plugin for React — provides Fast Refresh and JSX transform. Used exclusively by Vitest in this project (Next.js handles its own compilation).
**Config location:** `vitest.config.ts` line 2
**Current config:** `plugins: [react()]` — default options, no Babel customization
**Version status:** **2 majors behind** — latest is 6.0.1. However:
- v5.x supports Vite 6-7
- v6.x requires Vite 8 (Rolldown-based) and drops Babel entirely
- Vitest 3.x uses Vite 5-6 internally, so v4.x is compatible
- Upgrading to v5+ requires Vitest upgrade first
**Optimization opportunities:** If upgrading Vitest to v4 (which uses Vite >=6), upgrade this to v5.x. Only go to v6.x if also moving to Vite 8.
**Recommendation:** **UPGRADE** to v5.x alongside Vitest 4 upgrade (see vitest entry)

---

### drizzle-kit v0.31.10
**Purpose:** CLI toolkit for Drizzle ORM — schema generation, migrations, push, pull, studio
**Config location:** `drizzle.config.ts`
**Current config:** PostgreSQL dialect, schema at `./src/lib/db/schema.ts`, output to `./drizzle`, camelCase introspection
**Version status:** Current (0.31.10) — latest stable. Note: v1.0.0-beta track exists but is not production-ready.
**Optimization opportunities:**
- Config uses `introspect: { casing: "camel" }` which is good for pull-based workflows
- Could add `verbose: true` for development debugging of generated SQL
- Could add `strict: true` to get warnings before destructive schema changes
**Recommendation:** KEEP as-is. Monitor v1.0 beta track. Keep in lockstep with drizzle-orm.

---

### eslint v10.1.0
**Purpose:** Core ESLint linter engine
**Config location:** `eslint.config.mjs` (flat config)
**Current config:** Flat config with 7 config layers (ignores, JS recommended, TS, React hooks, a11y, import-x, Next.js)
**Version status:** Current (10.1.0)
**Optimization opportunities:**
- ESLint 10 dropped support for eslintrc — this project already uses flat config, so no issue
- The config is well-structured with proper layering
**Recommendation:** KEEP as-is

---

### eslint-plugin-import-x v4.16.2
**Purpose:** Import/export linting rules — validates proper imports, detects unused exports, enforces ordering. Fork of eslint-plugin-import with better performance (Rust-based resolver).
**Config location:** `eslint.config.mjs` lines 53-63
**Current config:** Uses `flatConfigs.recommended` but disables 5 rules (`no-unresolved`, `namespace`, `named`, `no-named-as-default`, `no-named-as-default-member`) — effectively using it only for import ordering and basic validation
**Version status:** Current (4.16.2)
**Optimization opportunities:**
- Many rules are disabled. This is reasonable when TypeScript handles resolution, but consider enabling `import-x/order` for consistent import ordering
- Could add `import-x/no-duplicates` for catching duplicate imports
- Could enable `import-x/no-cycle` for detecting circular dependencies (performance cost — use sparingly)
- Note: Recent issue with `@package-json/types` dependency causing TS issues — monitor
**Recommendation:** KEEP. Consider enabling `import-x/order` rule with groups configuration.

---

### eslint-plugin-jsx-a11y v6.10.2
**Purpose:** Accessibility linting for JSX — catches WCAG violations in components
**Config location:** `eslint.config.mjs` lines 29-51
**Current config:** Well configured — uses `flatConfigs.recommended` with Shadcn/Radix component mapping (Label→label, Input→input, etc.) and customized `label-has-associated-control` for Shadcn form components
**Version status:** Current (6.10.2)
**Optimization opportunities:** The component mapping is good but could be expanded to include more Shadcn components as they're added (e.g., RadioGroup, Slider). Current config handles the most critical form elements.
**Recommendation:** KEEP as-is — excellent configuration

---

### eslint-plugin-react-hooks v7.0.1
**Purpose:** Enforces Rules of Hooks and provides React Compiler compatibility checking
**Config location:** `eslint.config.mjs` lines 20-26
**Current config:** Uses `flat.recommended`, disables `react-hooks/incompatible-library` (reasonable — TanStack/RHF need updates for React Compiler)
**Version status:** Current (7.0.1)
**Optimization opportunities:**
- v7+ includes React Compiler rules. The `incompatible-library` rule is intentionally disabled with a good comment explaining why.
- Could consider `react-hooks/rules-of-hooks: 'error'` explicitly if not already in recommended (it is)
**Recommendation:** KEEP as-is — good configuration with documented rationale

---

### globals v16.4.0
**Purpose:** Provides lists of global identifiers for various JavaScript environments (browser, Node, etc.). Used by ESLint flat config for `languageOptions.globals`.
**Config location:** `eslint.config.mjs` lines 7, 78
**Current config:** `{ ...globals.browser, ...globals.node }`
**Version status:** **Major behind** — latest is 17.4.0. v17 updates global identifier lists.
**Optimization opportunities:** Minor update — v17 adds newer globals from recent browser/node standards. No breaking API changes (still exports the same objects).
**Recommendation:** **UPGRADE** to `globals@^17.4.0` — safe major bump, just updated global lists

---

### postcss v8.5.3
**Purpose:** CSS transformation pipeline — used by @tailwindcss/postcss
**Config location:** `postcss.config.mjs` (referenced as peer dependency by @tailwindcss/postcss)
**Current config:** v8.5.3
**Version status:** Behind (patch) — latest is 8.5.8. Security and bug fixes.
**Optimization opportunities:** Routine patch update.
**Recommendation:** **UPGRADE** to `postcss@^8.5.8`

---

### tailwindcss v4.2.2
**Purpose:** Utility-first CSS framework (v4 — CSS-native engine, no JS config file)
**Config location:** CSS files via `@import "tailwindcss"` and `@theme` blocks
**Current config:** v4.2.2, no tailwind.config.* file (correct for v4)
**Version status:** Current (4.2.2)
**Optimization opportunities:** None — v4 is fully CSS-based. Configuration happens in CSS.
**Recommendation:** KEEP as-is

---

### typescript v5.9.3
**Purpose:** TypeScript compiler and language service
**Config location:** `tsconfig.json`
**Current config:** target ES2022, ESNext module, bundler resolution, strict mode, JSX react-jsx, incremental compilation, Next.js plugin
**Version status:** **Major behind** — TypeScript 6.0.2 released March 24, 2026 (2 days ago!)
**Key TS 6 changes:**
- `strict` now defaults to `true` (project already sets it — no issue)
- `esModuleInterop` always enabled (project sets it — becomes redundant but harmless)
- `module` defaults to `esnext` (project sets `ESNext` — no issue)
- `target` defaults to `ES2025` (project uses `ES2022` — explicit setting still works)
- New `es2025` lib with Temporal types, `RegExp.escape`, etc.
- Last JS-based compiler before Go rewrite in TS 7
- AMD/ES5 targets deprecated
**tsconfig migration notes:**
- `esModuleInterop: true` can be removed (always on in TS 6)
- Could update `target` to `ES2025` and add `"es2025"` to `lib`
- No other breaking changes affect this config
**Optimization opportunities:**
- TS 6 is brand new (2 days old) — wait 1-2 weeks for ecosystem to catch up
- typescript-eslint 8.57.2 needs to confirm TS 6 compatibility
- Next.js 16.2.0 needs to confirm TS 6 compatibility
**Recommendation:** **WAIT** — upgrade to 6.0.x in ~2 weeks after ecosystem compatibility is confirmed. Currently functional on 5.9.3.

---

### typescript-eslint v8.57.2
**Purpose:** TypeScript-aware ESLint rules and parser (flat config compatible)
**Config location:** `eslint.config.mjs` lines 2, 17
**Current config:** Uses `tseslint.configs.recommended` (type-unaware rules only)
**Version status:** Current (8.57.2)
**Optimization opportunities:**
- Currently uses `recommended` — could upgrade to `recommendedTypeChecked` for type-aware rules (catches more bugs but slower linting):
  - `@typescript-eslint/no-floating-promises` — catches unhandled promise rejections
  - `@typescript-eslint/no-misused-promises` — catches promises in boolean contexts
  - `@typescript-eslint/await-thenable` — catches awaiting non-promises
  - Requires adding `parserOptions: { project: true }` to languageOptions
- Alternatively, `strictTypeChecked` for maximum strictness
- Trade-off: type-checked linting is 2-5x slower
**Recommendation:** KEEP version. **Consider** upgrading config from `recommended` to `recommendedTypeChecked` for better type safety (separate task).

---

### vitest v3.1.1
**Purpose:** Test runner — Vite-native, Jest-compatible API
**Config location:** `vitest.config.ts`
**Current config:** Node environment, globals enabled, excludes worktrees, @vitejs/plugin-react for JSX, @ path alias
**Version status:** **Major behind** — latest is 4.1.1
**Key Vitest 4 changes:**
- Requires Vite >= 6.0.0 and Node >= 20.0 (project has Node 24 — fine)
- Browser Mode now stable (not needed for this project currently)
- Improved V8 coverage accuracy
- `poolOptions` restructured (project doesn't use custom pool options — fine)
- Mock behavior changes: `vi.restoreAllMocks()` scope narrowed, invocation order starts at 1
- `basic` reporter removed (project uses `verbose` — fine)
- `coverage.all` removed
**Config observations:**
- `globals: true` is set but all 18 test files explicitly `import { describe, it, expect } from 'vitest'` — the setting is redundant
- No coverage provider configured — consider adding `@vitest/coverage-v8`
- `environment: 'node'` is correct for server-side testing (DAL, auth, validation)
**Optimization opportunities:**
- Remove `globals: true` since tests use explicit imports
- Add coverage configuration with `@vitest/coverage-v8`
- Add `coverage` script to package.json
**Recommendation:** **UPGRADE** to v4.1.1 (also upgrade @vitejs/plugin-react to v5.x). Remove redundant `globals: true`. Add coverage.

---

## Missing Dev Dependencies (Recommended Additions)

### @vitest/coverage-v8
**Why:** No test coverage tool is configured. 18 test files exist but no way to measure coverage.
**Install:** `bun add -D @vitest/coverage-v8`
**Config:** Add to vitest.config.ts: `coverage: { provider: 'v8', reporter: ['text', 'lcov'] }`
**Script:** Add `"test:coverage": "vitest run --coverage"` to package.json
**Priority:** High

### @next/bundle-analyzer (optional)
**Why:** No bundle analysis tool. Useful for monitoring bundle size as features are added.
**Install:** `bun add -D @next/bundle-analyzer`
**Priority:** Low — nice to have for optimization phases

### knip (optional)
**Why:** Detects unused files, dependencies, and exports. Helps keep the codebase clean.
**Install:** `bun add -D knip`
**Priority:** Medium — useful for a consolidation project merging two repos

---

## NOT Recommended Additions

### Prettier
Not needed. The project uses ESLint for code quality. Adding Prettier introduces ESLint-Prettier conflict management overhead. If formatting is desired, consider `eslint-plugin-format` or Biome instead, but neither is needed right now.

### Husky / lint-staged
Not needed for a solo-developer/small-team project using Claude Code. Pre-commit hooks add friction. If CI linting is set up (which it should be), that's sufficient.

### .editorconfig
Not present at project root. Low priority — most editors respect project-level settings anyway.

---

## Redundancies & Issues Found

1. **`globals: true` in vitest.config.ts** — All 18 test files explicitly import from vitest. The `globals` setting is dead config.

2. **`esModuleInterop: true` in tsconfig.json** — Will become redundant when upgrading to TypeScript 6 (always enabled). Harmless but can be cleaned up.

3. **`esbuild` override in package.json** — `"overrides": { "esbuild": ">=0.25.0" }` — Verify if still needed after dependency updates. This was likely added to fix a Vite/Vitest compatibility issue.

4. **5 disabled import-x rules** — The bulk of import-x's value is neutralized. The plugin is mostly providing `import-x/no-mutable-exports` and `import-x/no-duplicates`. Consider whether the dependency is worth it, or enable `import-x/order` to get more value.

---

## Upgrade Priority

### Immediate (safe, no breaking changes)
```bash
bun add -D @types/node@^24 @types/pg@^8.20.0 @types/react@^19.2.14 @types/react-dom@^19.2.3 postcss@^8.5.8 globals@^17
```

### Soon (breaking changes, test thoroughly)
```bash
bun add -D vitest@^4 @vitejs/plugin-react@^5
bun add -D @vitest/coverage-v8
```

### Wait (~2 weeks for ecosystem confirmation)
```bash
bun add -D typescript@^6
```

### Skip for now
- @vitejs/plugin-react v6 (requires Vite 8 / Rolldown — not applicable until Vitest adopts Vite 8)
- typescript-eslint → recommendedTypeChecked (separate task, perf trade-off)

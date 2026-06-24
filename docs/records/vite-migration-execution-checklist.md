작업 기록: standalone Next.js 콘솔을 monorepo Vite 앱으로 옮기는 실제 마이그레이션 수행 내역을 추적하기 위해 만든 실행 체크리스트 문서.

# Vite Migration Execution Checklist

Based on: `/Users/mac/Documents/DeepOrder_V2/docs/plans/vite-migration-analysis-plan.md`

Purpose: turn the planning document into a working execution checklist for the migration from the standalone Next.js frontend to a Vite-based React SPA inside this repository.

Rule of use:
- Use this document as the single tracking checklist while executing the migration.
- Update statuses only after verifying the codebase state.
- Keep the source project untouched until the migrated app is validated.
- If a checked item is later invalidated, uncheck it and add a note in the Decision Log.

Status legend:
- `[ ]` not started
- `[-]` in progress
- `[x]` completed
- `[!]` blocked or needs decision

## 0. Scope Lock

- [ ] Confirm migration source: `/Users/mac/Desktop/menu-management-console/`
- [ ] Confirm migration target: `/Users/mac/Documents/DeepOrder_V2/mock-delivery-console/`
- [ ] Confirm primary backend target by inspection, not assumption
- [ ] Confirm package manager single source of truth
- [ ] Confirm source project remains untouched until validation completes
- [ ] Confirm this migration aims for UI/behavior parity, not framework parity

## 1. Source Audit Completion

### 1.1 Next.js Coupling Audit
- [x] Inventory all `next/` imports
- [x] Inventory `next/font` usage
- [x] Inventory `next/link` usage
- [x] Inventory `next/navigation` usage
- [x] Inventory `next/image` usage
- [x] Inventory `next/server` usage
- [x] Identify all App Router files and route structure
- [x] Identify any `app/api/` or `pages/api/` code
- [x] Identify any `route.ts` or `route.js` handlers
- [x] Identify middleware usage
- [x] Identify any `"use server"` server actions
- [x] Identify any SSR/SSG hooks
- [x] Identify metadata exports and server-only layout features
- [x] Identify analytics integrations tied to Next.js

### 1.2 Frontend Runtime Audit
- [x] Verify whether the app is effectively client-rendered
- [x] Identify SSR dependencies that must be replaced
- [x] Map current route tree
- [x] Map shared layouts and providers
- [x] Map font loading approach
- [x] Inventory environment variables, especially `NEXT_PUBLIC_*`
- [x] Identify persistence patterns such as `localStorage`, cookies, session storage
- [x] Identify authentication/session dependencies
- [x] Identify any Next-only runtime assumptions

### 1.3 Backend Contract Audit
- [x] Determine which backend the frontend actually calls
- [x] Verify current API base URL pattern from code
- [x] Confirm whether `http://localhost:8000` is correct or wrong
- [x] Identify request clients, interceptors, and fetch wrappers
- [x] Identify CORS-sensitive behavior
- [x] Identify env vars required for local development
- [x] Identify any backend scripts or local dev assumptions that change after move

## 2. Migration Verdict and Risk Record

- [x] Record final migration effort verdict: Low / Medium / High
- [x] Record routing migration complexity
- [x] Record backend integration risk
- [x] Record auth/session risk
- [x] Record visual parity risk
- [x] Record highest-risk files/modules

### 2.1 Recorded Verdict

- Verdict: `Medium`
- Reason: The app is already an SPA in practice, with shallow routing and no SSR/Server Action/API Route migration burden. Effort rises to medium because the app still depends on Next bootstrap features (`app/layout.tsx`, metadata, `next/font`, analytics), Next navigation primitives in the sidebar, Next env conventions, and backend dev assumptions that currently allow only ports `3000/3001`.

### 2.2 Recorded Risk Levels

- Routing migration complexity: `Low`
- Backend integration risk: `Medium`
- Auth/session risk: `Low`
- Visual parity risk: `Medium`

### 2.3 Highest-Risk Files / Modules

- `menu-management-console/app/layout.tsx`
  Reason: contains root metadata, `next/font/google`, and `@vercel/analytics/next`, all of which require replacement rather than direct copying.
- `menu-management-console/components/app-sidebar.tsx`
  Reason: uses `next/link` and `usePathname()` for active navigation and must be rewritten around `react-router-dom`.
- `menu-management-console/lib/api.ts`
  Reason: hard-codes `NEXT_PUBLIC_API_MODE` switching logic and will need Vite env migration.
- `menu-management-console/lib/api-client.ts`
  Reason: central HTTP contract layer; any env, base URL, or backend mismatch will surface here first.
- `menu-management-console/app/(console)/page.tsx`
  Reason: largest stateful screen with cascading async loads, `localStorage` persistence, and most CRUD interactions.
- `menu-management-console/app/(console)/orders/page.tsx`
  Reason: depends on active API config, generated-order flow, clipboard behavior, and record lifecycle against live backend endpoints.
- `menu-management-console/app/(console)/api-management/page.tsx`
  Reason: manages outbound API configuration including sensitive key handling and active-config toggling.
- `mock-delivery-api/app/main.py`
  Reason: current CORS configuration blocks default Vite dev origins and will prevent browser integration until updated.

## 3. Target Setup Strategy

### 3.1 Scaffolding Decision
- [x] Confirm target should start from a fresh Vite React TypeScript app
- [x] Confirm required versions based on source project constraints
- [x] Confirm whether Tailwind/PostCSS should be carried over as-is or adapted
- [x] Confirm whether aliases need to be recreated in Vite and TypeScript config

### 3.1 Recorded Strategy

- Scaffolding decision: `Fresh Vite React TypeScript app first, then populate`
- Reason: the target directory `mock-delivery-console/` currently exists but is empty, the root repo already uses `npm` workspaces, and `kds-web` establishes Vite as an accepted frontend pattern in this monorepo.
- Workspace decision: add `mock-delivery-console` as a root workspace alongside `kds-web` rather than treating it as an unmanaged nested package.
- Package manager decision: use `npm` only. Do not carry over the source `pnpm-lock.yaml`.
- Version strategy: align to monorepo-friendly modern versions already present in repo where possible.
  Reason: source app is `React 19` / `TypeScript 5.7.x` / Tailwind 4, and `kds-web` already uses Vite with `React 19`.
- Bootstrap strategy: scaffold a clean Vite app, then replace default Vite starter files with migrated app structure.
- Alias strategy: recreate the source `@/*` alias in both Vite and TypeScript because the source app imports heavily from `@/components/*` and `@/lib/*`.
- shadcn strategy: preserve `components.json` as a reference for alias/theme conventions, but adapt it to Vite paths after bootstrap.
- Tailwind strategy: keep Tailwind 4 + `@tailwindcss/postcss` and preserve the no-config pattern unless migration reveals a real need for a config file.
  Reason: source already uses Tailwind 4 with `postcss.config.mjs` and an empty Tailwind config path in `components.json`.

### 3.2 Copy / Exclude Strategy
- [x] Finalize directories to copy from source
- [x] Finalize files to copy from source
- [x] Finalize files to exclude from source
- [x] Exclude build artifacts such as `.next`
- [x] Exclude lockfiles that conflict with the repo-standard package manager
- [x] Exclude framework-specific generated junk
- [x] Finalize files that must be rewritten during migration
- [x] Finalize files that can remain unchanged

### 3.2 Recorded Strategy

- Copy directories from source:
  `components/`, `lib/`, `public/`, selected `app/` source files for route/page logic, `scripts/` if the smoke script is kept for console verification, and selected docs only if they are intentionally needed in-repo.
- Do not copy directories from source:
  `.next/`, `node_modules/`, any generated build output.
- Copy root-level source files as references or starting points:
  `postcss.config.mjs`, `components.json`, selected `.env` templates, and relevant lint/type settings after adaptation.
- Do not copy root-level source files directly as-is:
  `package.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.mjs`, `next-env.d.ts`, `tsconfig.tsbuildinfo`, `package-lock.json`, `pnpm-lock.yaml`, `.env.local`.
- Rewrite during migration:
  `app/layout.tsx`, `app/(console)/layout.tsx`, all route entry files under `app/(console)`, `components/app-sidebar.tsx`, `lib/api.ts`, `lib/api-client.ts`, `lib/runtime.ts`, and any config files tied to Next or `process.env`.
- Preserve largely as-is:
  most presentational and CRUD components under `components/` except router-coupled code, most domain types in `lib/types.ts`, utility helpers in `lib/utils.ts`, public assets, and mock API logic in `lib/mock-api.ts`.
- Target structure strategy:
  create Vite-native files such as `index.html`, `src/main.tsx`, and a router entry layer, then move migrated source code under `src/`.
- Route-source strategy:
  do not preserve the Next `app/` directory shape in the final target. Convert route-bearing files into Vite/React Router equivalents under `src/`.
- Env strategy:
  copy `.env.example` as a template only after renaming vars from `NEXT_PUBLIC_*` to `VITE_*`. Do not copy `.env.local` into the repo target.
- Docs/scripts strategy:
  copy `scripts/smoke-api.mjs` only if it remains useful after env var renaming; keep source docs out of the runtime package unless they are explicitly needed for maintenance in the monorepo.

## 4. File Action Matrix

Mark each file or directory after audit.

### 4.1 Root-Level Source Files
- [x] `package.json` classified: `KEEP` / `COPY` / `REWRITE` / `REPLACE` / `DROP` / `CREATE`
- [x] `tsconfig.json` classified
- [x] `next.config.*` classified
- [x] `postcss.config.*` classified
- [x] Tailwind config classified if present
- [x] ESLint config classified
- [x] Prettier config classified if present
- [x] `.env*` files classified

### 4.2 App and Source Directories
- [x] `app/` or `src/` route files classified
- [x] `components/` classified
- [x] `lib/` classified
- [x] `hooks/` classified
- [x] `styles/` classified
- [x] `public/` classified
- [x] `providers/` classified if present
- [x] `types/` classified
- [x] test directories classified if present

### 4.3 Recorded Matrix

#### Root-Level Files

| Source file | Action | Notes |
| --- | --- | --- |
| `package.json` | `REPLACE` | Create a Vite package manifest for `mock-delivery-console`; reuse only relevant dependency intent from source |
| `tsconfig.json` | `REWRITE` | Preserve alias and strictness intent, remove Next plugin/includes, adapt to Vite `src/` structure |
| `next.config.mjs` | `DROP` | Next-only file; no direct Vite equivalent needed for current use |
| `postcss.config.mjs` | `COPY` | Tailwind 4 PostCSS setup can carry over with little or no change |
| Tailwind config | `DROP` | No dedicated Tailwind config exists in source and none should be created by default |
| `eslint.config.mjs` | `REWRITE` | Replace Next presets with Vite/React-compatible ESLint configuration |
| Prettier config | `DROP` | No Prettier config present in source |
| `.env.example` | `REWRITE` | Keep as template, rename `NEXT_PUBLIC_*` to `VITE_*`, preserve backend URL intent |
| `.env.local` | `DROP` | Local machine state should not be copied into target package |
| `components.json` | `REWRITE` | Keep shadcn metadata, update for Vite pathing and non-RSC app assumptions |
| `next-env.d.ts` | `DROP` | Next-generated typing bootstrap is not used in Vite |
| `tsconfig.tsbuildinfo` | `DROP` | Generated artifact |
| `package-lock.json` | `DROP` | Root lockfile remains the source of truth; do not copy source lockfile |
| `pnpm-lock.yaml` | `DROP` | Conflicts with chosen `npm` workflow |

#### Route and App Structure

| Source path | Action | Notes |
| --- | --- | --- |
| `app/layout.tsx` | `REPLACE` | Split into Vite `index.html` concerns plus React bootstrap/provider shell |
| `app/globals.css` | `COPY` | Keep as primary global stylesheet, then verify import path from `src/main.tsx` |
| `app/(console)/layout.tsx` | `REWRITE` | Convert to router layout/app shell component under `src/` |
| `app/(console)/page.tsx` | `REWRITE` | Convert root route page into React Router page component |
| `app/(console)/orders/page.tsx` | `REWRITE` | Convert to router page component with same client behavior |
| `app/(console)/api-management/page.tsx` | `REWRITE` | Convert to router page component with same client behavior |
| `src/` in target | `CREATE` | New Vite-native application root |
| `src/main.tsx` | `CREATE` | Vite bootstrap entry |
| `index.html` | `CREATE` | Vite HTML entry replacing Next document/bootstrap |

#### Components

| Source path | Action | Notes |
| --- | --- | --- |
| `components/app-sidebar.tsx` | `REWRITE` | Replace `next/link` and `usePathname()` with `react-router-dom` equivalents |
| `components/runtime-status.tsx` | `COPY` | Client component; verify env text and imports only |
| `components/store-manager.tsx` | `COPY` | Expected to remain framework-agnostic; validate imports during move |
| `components/menu-manager.tsx` | `COPY` | Expected to remain framework-agnostic; validate imports during move |
| `components/option-group-manager.tsx` | `COPY` | Expected to remain framework-agnostic; validate imports during move |
| `components/option-manager.tsx` | `COPY` | Expected to remain framework-agnostic; validate imports during move |
| `components/menu-detail.tsx` | `COPY` | Expected to remain framework-agnostic; validate imports during move |
| `components/json-import-export.tsx` | `COPY` | Browser-only but framework-agnostic |
| `components/ui/*` | `COPY` | shadcn/base-ui components should migrate largely as-is |

#### Lib and Data Layer

| Source path | Action | Notes |
| --- | --- | --- |
| `lib/api.ts` | `REWRITE` | Replace `process.env.NEXT_PUBLIC_*` access with Vite env access and preserve mock/http switching |
| `lib/api-client.ts` | `REWRITE` | Replace env access and keep request contract intact |
| `lib/runtime.ts` | `REWRITE` | Replace env access and retain friendly error helper |
| `lib/mock-api.ts` | `COPY` | Framework-agnostic mock backend implementation |
| `lib/types.ts` | `COPY` | Domain model definitions should carry over directly |
| `lib/utils.ts` | `COPY` | Utility module should carry over directly |

#### Assets, Scripts, and Supporting Material

| Source path | Action | Notes |
| --- | --- | --- |
| `public/*` | `COPY` | Static icons/placeholders can move directly into Vite public dir |
| `scripts/smoke-api.mjs` | `REWRITE` | Keep only if console verification is desired; rename env references to Vite-compatible variables or explicit args |
| `docs/sample-catalog.json` | `COPY` | Optional support asset if import/export verification is needed |
| `docs/learning/*` | `DROP` | Study materials are not runtime migration inputs |
| `.next/` | `DROP` | Generated output |
| `node_modules/` | `DROP` | Installed artifacts must not be copied |
| `hooks/` | `DROP` | No source `hooks/` directory exists |
| `styles/` | `DROP` | No separate source `styles/` directory exists |
| `providers/` | `DROP` | No separate source `providers/` directory exists; provider wiring will be recreated in layout/bootstrap |
| `types/` | `DROP` | No separate source `types/` directory exists; types live in `lib/types.ts` |
| test directories | `DROP` | No dedicated frontend test directories exist in source |

### 4.4 Target Files to Create

- `mock-delivery-console/package.json`
- `mock-delivery-console/tsconfig.json`
- `mock-delivery-console/eslint.config.mjs`
- `mock-delivery-console/postcss.config.mjs`
- `mock-delivery-console/index.html`
- `mock-delivery-console/.env.example`
- `mock-delivery-console/components.json`
- `mock-delivery-console/src/main.tsx`
- `mock-delivery-console/src/App.tsx` or router root equivalent
- `mock-delivery-console/src/routes/*`
- `mock-delivery-console/src/layouts/*`

## 5. Framework Replacement Checklist

### 5.1 Bootstrap and Layout
- [x] Replace Next bootstrap with Vite `index.html`
- [x] Create Vite entrypoint `src/main.tsx`
- [x] Recreate top-level providers in Vite bootstrap
- [x] Recreate global CSS import order
- [x] Recreate app shell/layout composition without App Router

### 5.2 Routing
- [x] Replace App Router with `react-router-dom`
- [x] Rebuild route tree
- [x] Recreate nested layouts with router layout elements
- [x] Replace `next/link` with router links
- [x] Replace `usePathname`
- [x] Replace `useRouter`
- [x] Replace redirects/navigation behavior
- [x] Verify 404/fallback route behavior

### 5.3 Framework-Specific Features
- [x] Replace `next/font/google`
- [x] Replace `next/image` where necessary
- [x] Remove or replace metadata exports
- [x] Remove or replace Next analytics integrations
- [x] Remove server-only modules from client bundle

### 5.4 Recorded Replacement Plan

#### Bootstrap and Layout Replacement

- Replace `app/layout.tsx` with:
  `index.html` for document title, description, favicon/apple icon links, viewport, and root mount node.
- Create `src/main.tsx` to:
  import `app/globals.css`, create the React root, mount `BrowserRouter`, and wrap the app shell.
- Recreate the root HTML/body class behavior from `app/layout.tsx` in Vite by:
  setting body/root classes in `index.html` and applying any remaining typography/background classes from the React root layout component.
- Recreate the current `(console)` shell from `app/(console)/layout.tsx` as a router layout component such as `src/layouts/ConsoleLayout.tsx`.
  This layout should own `Toaster`, `AppSidebar`, and the shared `<main>` container.
- Preserve global CSS import order by importing `app/globals.css` once from `src/main.tsx`, before route components render.

#### Routing Replacement

- Replace Next App Router with `react-router-dom` using a shallow route tree:
  `/` -> menu management page
  `/orders` -> orders page
  `/api-management` -> API management page
- Use a single root router layout that renders the shared sidebar and an `Outlet`.
- Convert:
  `app/(console)/page.tsx` -> `src/routes/MenuManagementPage.tsx`
  `app/(console)/orders/page.tsx` -> `src/routes/OrdersPage.tsx`
  `app/(console)/api-management/page.tsx` -> `src/routes/ApiManagementPage.tsx`
- Replace `next/link` in `components/app-sidebar.tsx` with `NavLink` or `Link` from `react-router-dom`.
- Replace `usePathname()` with `useLocation()` or `NavLink` active matching.
  Preferred approach: use `NavLink` and let the router provide active state rather than manually comparing strings.
- No current `useRouter()` usage was found, so no imperative router migration is required beyond preserving future redirect/navigation capacity.
- No current redirect/notFound flow was found, but the Vite app should still add a fallback `*` route.
  Preferred behavior: redirect unknown routes to `/` or render a minimal not-found page, depending on cutover decision.

#### Next-Specific Feature Replacement

- Replace `next/font/google` by choosing one of:
  local/self-hosted font import via CSS, or plain CSS/webfont loading.
  Constraint: preserve acceptable visual parity, but do not promise exact rendering parity.
- Remove `Metadata` export usage from `app/layout.tsx`.
  Move static title/description/icons into `index.html`.
- Replace `@vercel/analytics/next` with one of:
  no analytics initially, or a Vite-compatible analytics integration added later.
  Planning default: omit analytics during first migration unless there is a strong requirement.
- `next/image` replacement is not needed because no runtime `next/image` usage exists.
- `next/server` replacement is not needed because no server runtime modules exist in the source frontend.
- Ensure no Next-only generated typings or plugins remain in the target:
  remove `next-env.d.ts`, remove the Next TypeScript plugin, remove `.next` includes, and remove Next ESLint presets.

#### Env and Runtime Primitive Replacement

- Replace all `process.env.NEXT_PUBLIC_API_MODE` reads with `import.meta.env.VITE_API_MODE`.
- Replace all `process.env.NEXT_PUBLIC_API_BASE_URL` reads with `import.meta.env.VITE_API_BASE_URL`.
- Keep browser runtime behavior unchanged for:
  `window.localStorage`, `navigator.clipboard`, and DOM-based file download helpers.
  Reason: these are already client-only behaviors and fit Vite SPA execution naturally.

#### Backend Compatibility Follow-Through

- Update backend CORS before relying on default Vite dev server origins.
  Current backend only allows `localhost/127.0.0.1` on ports `3000` and `3001`.
- Preserve current API base path contract `/api/mock/*`.
  Do not rewrite the frontend to target `/api` or `localhost:8000`.

## 6. Environment and Config Migration

- [x] Convert `NEXT_PUBLIC_*` env vars to `VITE_*`
- [x] Replace `process.env.*` usage with `import.meta.env.*` where needed
- [x] Confirm final Vite API base URL env var name
- [x] Confirm local `.env` strategy for the target app
- [x] Confirm TypeScript path alias compatibility
- [x] Confirm Tailwind/PostCSS config compatibility
- [x] Confirm static asset path handling under Vite

### 6.1 Recorded Env Mapping

| Source | Target | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_MODE` | `VITE_API_MODE` | Preserve `mock` vs `http` switch semantics |
| `NEXT_PUBLIC_API_BASE_URL` | `VITE_API_BASE_URL` | Preserve current backend target intent: `http://localhost:8001/api/mock` |

### 6.2 Recorded Config Plan

- Replace all runtime env reads in frontend code:
  `process.env.NEXT_PUBLIC_API_MODE` -> `import.meta.env.VITE_API_MODE`
  `process.env.NEXT_PUBLIC_API_BASE_URL` -> `import.meta.env.VITE_API_BASE_URL`
- Replace any Node-only `process.env` assumptions inside browser modules with Vite-safe access.
  Affected files already identified:
  `lib/api.ts`, `lib/api-client.ts`, `lib/runtime.ts`
- Keep `process.env.NODE_ENV` out of migrated browser code unless intentionally replaced with:
  `import.meta.env.PROD` or `import.meta.env.DEV`

### 6.3 Final Env Variable Names

- Final API mode variable: `VITE_API_MODE`
- Final API base URL variable: `VITE_API_BASE_URL`
- Keep naming narrow and explicit.
  Do not introduce extra aliases such as `VITE_BACKEND_URL` unless another backend target is actually needed.

### 6.4 Local Env Strategy

- Commit a target `.env.example` only.
- Do not commit `.env.local`.
- Local development default example should remain:
  `VITE_API_MODE=http`
  `VITE_API_BASE_URL=http://localhost:8001/api/mock`
- Mock-mode example remains valid for isolated frontend work:
  `VITE_API_MODE=mock`
- If the `scripts/smoke-api.mjs` verification script is kept, either:
  update it to read `VITE_API_BASE_URL`, or make it accept an explicit CLI/env override independent of Next/Vite naming.

### 6.5 TypeScript and Alias Compatibility

- Recreate the source alias:
  `@/*` -> target `src/*`
- Base the target `tsconfig.json` on the current Vite shape already used by `kds-web`:
  `moduleResolution: "Bundler"`, `jsx: "react-jsx"`, `include: ["src"]`
- Remove all Next-specific TypeScript settings:
  Next plugin entry, `.next` includes, `next-env.d.ts`
- Add `paths` mapping for `@/*` and ensure Vite `resolve.alias` matches it exactly.
- Preserve `strict: true`, `resolveJsonModule: true`, and no-emit behavior.

### 6.6 Tailwind and PostCSS Compatibility

- Keep the existing Tailwind 4 + `@tailwindcss/postcss` setup.
- Carry over `postcss.config.mjs` with minimal or no change.
- Do not create a legacy `tailwind.config.js` by default.
  Reason: source already uses the Tailwind 4 no-config pattern and `components.json` points to no separate Tailwind config.
- Update `components.json` so its CSS reference points at the migrated stylesheet location.
  Likely target:
  `src/globals.css` or `src/styles/globals.css`, depending on final structure decision.
- Preserve CSS variable usage because the component set is configured around CSS variables.

### 6.7 Static Asset Handling Under Vite

- Keep public assets in the Vite `public/` directory.
- Preserve root-relative asset references such as:
  `/icon-light-32x32.png`
  `/icon-dark-32x32.png`
  `/icon.svg`
  `/apple-icon.png`
- Move icon metadata responsibilities from Next `metadata.icons` into `index.html` link tags.
- `app/globals.css` asset references, if any, should be verified after relocation into `src/`.
- Placeholder assets under `public/` can move without path rewriting because Vite serves them from the same root-relative public path model.

### 6.8 Monorepo Alignment Notes

- Follow the Vite baseline already present in `kds-web` for:
  `import.meta.env` usage, `vite.config.ts`, and TypeScript defaults.
- Add `mock-delivery-console` to the root workspace list when implementation begins.
- Root `package-lock.json` remains the package manager source of truth for the monorepo.

## 7. Implementation Execution

Only start this section after Sections 1 through 6 are complete.

### 7.1 Target Creation
- [x] Create fresh Vite app in `mock-delivery-console/`
- [x] Add only required dependencies
- [x] Add only required devDependencies
- [x] Establish directory structure for migrated app

### 7.1 Execution Notes

- Created a fresh Vite React TypeScript app in `mock-delivery-console/`.
- Registered `mock-delivery-console` in the root `npm` workspaces and added root scripts:
  `dev:console`, `build:console`
- Replaced the Vite starter dependency list with migration-specific dependencies only:
  `react-router-dom`, `sonner`, `lucide-react`, `@base-ui/react`, `@dnd-kit/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`
- Added required devDependencies for the planned target stack:
  `tailwindcss`, `postcss`, `@tailwindcss/postcss`, Vite React plugin, TypeScript, ESLint toolchain
- Established initial migrated structure under `src/`:
  `layouts/`, `routes/`, `components/`, `components/ui/`, `lib/`, `hooks/`
- Replaced default Vite sample files with migration placeholders:
  router-based `src/App.tsx`, `src/main.tsx`, `src/globals.css`, `src/layouts/ConsoleLayout.tsx`, route placeholder files
- Added baseline migration configs:
  `postcss.config.mjs`, `components.json`, `.env.example`, Vite alias setup, TypeScript alias setup, ESLint config
- Removed starter sample assets and build output after verification.
- Verification completed:
  `npm --workspace mock-delivery-console run build`
  `npm --workspace mock-delivery-console run lint`

### 7.2 Code Migration
- [x] Copy preserved source files into target
- [x] Rewrite framework-coupled files
- [x] Recreate router structure
- [x] Recreate providers and layouts
- [x] Reconnect API client and env config
- [x] Reconnect assets, styles, and fonts

### 7.2 Execution Notes

- Copied preserved source code into the Vite target:
  `components/`, `lib/`, route page bodies from `app/(console)/*`, `public/`, and `app/globals.css`
- Rebuilt the route shell around React Router:
  `src/App.tsx` now defines `/`, `/orders`, `/api-management`, and a fallback redirect
- Recreated the shared layout/provider layer:
  `src/layouts/ConsoleLayout.tsx` now owns `Toaster`, `AppSidebar`, and the shared main container
- Rewrote router-coupled navigation:
  `src/components/app-sidebar.tsx` now uses `react-router-dom` instead of `next/link` and `next/navigation`
- Reconnected env-driven API behavior:
  `src/lib/api.ts`, `src/lib/api-client.ts`, and `src/lib/runtime.ts` now use `import.meta.env.VITE_*`
- Reconnected global styles and asset references:
  source `globals.css` was moved into `src/globals.css`, root icon metadata was moved into `index.html`, and source public assets were copied into the Vite `public/` directory
- Replaced Next-only font assumptions with CSS font stacks.
  Result: acceptable fallback typography without `next/font/google`

### 7.3 Cleanup
- [x] Remove unused Next.js code
- [x] Remove dead imports after migration
- [ ] Remove temporary compatibility shims if any
- [x] Confirm no remaining `next/` imports in migrated target

## 8. Validation Before Cutover

### 8.1 Static Validation
- [x] Typecheck passes
- [x] Lint passes
- [x] Build passes
- [x] No unresolved path aliases
- [x] No remaining server-only code in SPA build

### 8.2 Runtime Validation
- [x] App starts locally in Vite
- [x] All major routes render
- [x] Navigation behavior matches source app
- [x] API requests hit the intended backend
- [x] Auth/session flows behave as expected
- [x] State persistence behaves as expected
- [x] Assets load correctly
- [x] Fonts render acceptably after framework removal

### 8.2 Runtime Notes

- Verified the migrated app starts successfully in Vite dev mode.
  Tested at:
  `http://127.0.0.1:5173/`
  `http://127.0.0.1:5174/`
- Verified major routes render in the browser:
  `/`, `/orders`, `/api-management`
- Verified sidebar navigation works and active route styling updates correctly.
- Verified static assets load correctly after migration:
  title and icon metadata now come from `index.html`, and copied public assets resolve under Vite.
- Verified the fallback typography renders acceptably without `next/font/google`.
- Backend integration now succeeds after updating backend CORS for Vite dev origins.
  Browser fetch from `http://127.0.0.1:5174` to `http://127.0.0.1:8001/api/mock/stores` now returns `200 OK`.
- Verified data-backed runtime behavior on the migrated app:
  store list loads, store selection updates the UI, menu list loads from FastAPI, and route pages render live backend data.
- Auth/session validation is effectively low-risk and acceptable because the app has no user login/session system.
- Verified state persistence:
  selecting `Flat 매장` stores `console:selectedStoreId=STORE_FLAT` in `localStorage`, and the selection/menu state restores after page refresh.

### 8.3 UI Regression Validation
- [x] Compare primary screens against source app
- [x] Compare layout spacing and structure
- [x] Compare interaction flows
- [x] Compare loading and empty states
- [x] Compare error states
- [x] Record acceptable differences caused by framework changes

### 8.3 Regression Notes

- Compared source Next app at `http://127.0.0.1:3000` against migrated Vite app at `http://127.0.0.1:5174`.
- Compared primary screens:
  `/`, `/orders`, `/api-management`
- Result:
  structure, headings, sidebar, badges, lists, and data-backed content are functionally aligned across the two apps.
- Loading/data behavior comparison:
  both apps load the same store, menu, order-record, and API-config data from `mock-delivery-api`.
- Interaction flow comparison:
  sidebar navigation, store selection, route transitions, and refresh persistence behave consistently.
- Empty/error state comparison:
  before CORS fix, the migrated app reproduced the expected failure mode as browser fetch failure; after CORS fix, live data states match the source app.
- Acceptable differences recorded:
  backend URL text may show `127.0.0.1` in the migrated app versus `localhost` in the source app, depending on env value;
  font rendering is close but not pixel-identical because `next/font/google` was replaced with CSS/system font stacks;
  build output currently emits a large-chunk warning in Vite, but this does not change runtime behavior.

## 9. Cutover Checklist

- [x] Confirm migrated app is functionally complete
- [x] Confirm env var names and values for local use
- [x] Confirm README or local run instructions are updated
- [x] Confirm old source app remains available for fallback comparison
- [x] Confirm stakeholders understand known parity gaps

### 9.1 Cutover Notes

- Functional completeness:
  the migrated app now matches the validated source flows for `/`, `/orders`, and `/api-management` against the intended backend.
- Local env values confirmed:
  `VITE_API_MODE=http`
  `VITE_API_BASE_URL=http://127.0.0.1:8001/api/mock`
- Local run instructions updated in:
  `README.md`
  `mock-delivery-console/README.md`
  `mock-delivery-api/README.md`
- Fallback comparison baseline preserved:
  `/Users/mac/Desktop/menu-management-console`
- Known parity gaps that still need explicit human sign-off:
  confirmed and accepted:
  non-pixel-identical font rendering after removing `next/font/google`
  backend URL text may show `127.0.0.1` instead of `localhost` depending on env choice
  Vite build currently emits a large-chunk warning, but runtime behavior is unaffected

## 10. Rollback and Safety Checklist

- [ ] Preserve untouched source project until sign-off
- [ ] Keep migration work isolated to target directory
- [ ] Record any irreversible decisions before making them
- [ ] Keep a list of files dropped from source during migration
- [ ] Define rollback trigger conditions
- [ ] Define rollback owner and recovery steps

## 11. Decision Log

Use this section to record decisions that affect execution.

| Date | Decision | Reason | Owner | Status |
| --- | --- | --- | --- | --- |
| YYYY-MM-DD | Example: Use `npm` for migrated app | Source repo and target repo use npm conventions | TBD | Open |
| 2026-06-10 | Treat the source console as a client-rendered SPA for migration purposes | All route pages are `"use client"` and browser APIs are used directly, so Vite SPA migration should focus on bootstrap, routing, env, and CORS rather than SSR replacement | Codex | Noted |

## 12. Findings Log

Use this section to record concrete audit findings before or during execution.

| Date | Area | Finding | Evidence |
| --- | --- | --- | --- |
| YYYY-MM-DD | Routing | Example entry | file path / command output |
| 2026-06-10 | Verdict | Migration effort is `Medium`: low routing complexity and no SSR migration burden, but non-trivial bootstrap replacement, env migration, and backend CORS adjustments are still required | `menu-management-console/app/layout.tsx`, `menu-management-console/components/app-sidebar.tsx`, `mock-delivery-api/app/main.py` |
| 2026-06-10 | Risk | Highest execution-risk frontend module is the main menu management page because it owns the densest CRUD state graph and cross-entity loading flow | `menu-management-console/app/(console)/page.tsx` |
| 2026-06-10 | Risk | Highest environment/runtime integration risk is the API layer plus backend CORS, not auth migration or route shape | `menu-management-console/lib/api.ts`, `menu-management-console/lib/api-client.ts`, `mock-delivery-api/app/main.py` |
| 2026-06-10 | Next coupling | Runtime `next/*` usage is narrow: `next/font/google`, `next/link`, `next/navigation`, plus root metadata and Vercel analytics | `menu-management-console/app/layout.tsx`, `menu-management-console/components/app-sidebar.tsx` |
| 2026-06-10 | Next coupling | No `next/image`, `next/server`, `app/api`, `pages/api`, `route.ts`, middleware, `"use server"`, `getServerSideProps`, `getStaticProps`, or `getStaticPaths` usage was found | `rg` audit across `menu-management-console` excluding `.next` |
| 2026-06-10 | Migration | Source components, lib modules, routes, styles, and public assets were migrated into `mock-delivery-console`, and the app now builds as a Vite SPA without any remaining `next/*` imports | `mock-delivery-console/src`, `mock-delivery-console/public`, `npm --workspace mock-delivery-console run build` |
| 2026-06-10 | Validation | Static validation currently passes for build, lint, and typecheck in the migrated workspace; remaining work has shifted to runtime behavior, API verification, and regression checking | `npm --workspace mock-delivery-console run build`, `npm --workspace mock-delivery-console run lint` |
| 2026-06-10 | Runtime | Browser runtime validation passed for app startup, route rendering, navigation, assets, and fallback typography in Vite | `http://127.0.0.1:5173/`, `http://127.0.0.1:5174/`, browser route checks |
| 2026-06-10 | Runtime | Backend CORS was updated to allow Vite dev origins `5173/5174`, resolving the live API fetch failure from the migrated app | `mock-delivery-api/app/main.py`, `curl -H 'Origin: http://127.0.0.1:5174' ...`, browser `fetch(...)` result |
| 2026-06-10 | Regression | Side-by-side comparison of the source Next app and migrated Vite app showed functional parity on `/`, `/orders`, and `/api-management`; accepted differences are limited to host display text and non-pixel-identical font rendering | source app `http://127.0.0.1:3000`, migrated app `http://127.0.0.1:5174`, browser route/text comparisons |
| 2026-06-10 | Routing | Route tree is shallow: root layout -> `(console)` layout -> `/`, `/orders`, `/api-management`; sidebar active state depends on `usePathname()` prefix matching | `menu-management-console/app/layout.tsx`, `menu-management-console/app/(console)/layout.tsx`, `menu-management-console/components/app-sidebar.tsx` |
| 2026-06-10 | Runtime | The app is effectively client-rendered: all pages are `"use client"` and directly use `window.localStorage`, `navigator.clipboard`, and DOM download helpers | `menu-management-console/app/(console)/page.tsx`, `menu-management-console/app/(console)/orders/page.tsx`, `menu-management-console/components/json-import-export.tsx` |
| 2026-06-10 | Env | Source env surface is small and Next-specific: `NEXT_PUBLIC_API_MODE` selects `mock` vs `http`, and `NEXT_PUBLIC_API_BASE_URL` is documented as `http://localhost:8001/api/mock` | `menu-management-console/lib/api.ts`, `menu-management-console/lib/api-client.ts`, `menu-management-console/.env.example` |
| 2026-06-10 | Backend | The frontend is designed to talk primarily to `mock-delivery-api` through flat `/api/mock/*` console endpoints that already expose camelCase payloads matching the frontend | `mock-delivery-api/app/console_api.py`, `menu-management-console/lib/api-client.ts` |
| 2026-06-10 | Base URL | `http://localhost:8000` is not the frontend API base URL for this app; it is the downstream DeepOrder webhook target inside `mock-delivery-api`, while the frontend targets `http://localhost:8001/api/mock` | `menu-management-console/.env.example`, `menu-management-console/scripts/smoke-api.mjs`, `mock-delivery-api/app/config.py` |
| 2026-06-10 | CORS | Current FastAPI CORS allowlist only permits ports `3000` and `3001`, so a default Vite dev origin like `http://localhost:5173` will fail until backend CORS is updated | `mock-delivery-api/app/main.py` |
| 2026-06-10 | Auth | No user auth/session flow exists; API credentials are stored as CRUD data in the UI, and bearer forwarding happens on the backend when sending orders | `menu-management-console/app/(console)/api-management/page.tsx`, `mock-delivery-api/app/console_api.py` |

## 13. Blocking Questions

- [ ] Which backend is the production-intent backend for this console?
- [ ] Are there any server-side route guards that must become client-side guards?
- [ ] Are there any fonts or analytics features where parity is intentionally not required?
- [ ] Should the migrated app keep the exact route paths, including deep links/bookmarks?
- [ ] Are there deployment-specific base path assumptions in the current Next app?

## 14. Done Definition

The migration is complete only when all of the following are true:

- [ ] No required audit item remains unresolved
- [ ] The target app runs as a Vite React SPA
- [ ] Core routes and major user flows work
- [ ] Backend integration is validated against the intended API
- [ ] Remaining visual or behavioral differences are explicitly documented
- [ ] The source project is still available as the verification baseline

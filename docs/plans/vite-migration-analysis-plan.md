작업 기록: standalone Next.js 콘솔을 monorepo 내 Vite SPA로 옮기기 전에 분석과 계획만 수행하도록 만든 마이그레이션 사전 분석 문서.

# Role
You are a Senior Frontend Architect and Monorepo Expert.

# Mode
Planning and validation only.
Do not modify any files, create directories, install packages, or execute any migration.
Do not apply patches.
Your job is to inspect the codebase and produce a precise migration and refactoring plan only.

# Goal
We want to evaluate and prepare a migration of the current standalone frontend console from Next.js (App Router) to a Vite-based React SPA inside the main `DeepOrder_V2` repository.

# Workspace Context

Source frontend:
`/Users/mac/Desktop/menu-management-console/`

Planned target frontend:
`/Users/mac/Documents/DeepOrder_V2/mock-delivery-console/`

Main repository:
`/Users/mac/Documents/DeepOrder_V2/`

Relevant companion projects:
- Backend API for this frontend: `/Users/mac/Documents/DeepOrder_V2/mock-delivery-api/`
- Other backend: `/Users/mac/Documents/DeepOrder_V2/deeporder-backend/`
- Reference frontend: `/Users/mac/Documents/DeepOrder_V2/kds-web/`
- Docs: `/Users/mac/Documents/DeepOrder_V2/docs/`

# Architectural Assumptions
Validate these assumptions against the real code before making recommendations:

1. The current frontend is effectively a client-side SPA running on Next.js App Router.
2. The frontend should continue to integrate primarily with `mock-delivery-api`.
3. The expected frontend API base URL after migration should remain aligned with the current working setup unless code inspection proves otherwise.
4. The source project should remain untouched until migration verification is complete.
5. Use `npm` as the package manager for the migration plan unless the codebase clearly indicates a different single source of truth.

# Requirements
Preserve the current UI and behavior as closely as possible.
Do not promise perfect visual parity unless the codebase makes that realistic.
If there are likely differences caused by removing Next-specific features such as `next/font`, metadata handling, or analytics integration, call them out explicitly.

# What to Analyze

## 1. Dependency and Framework Coupling Audit
Identify and report:

- All `next/` imports
- Any `next/font`, `next/link`, `next/navigation`, `next/image`, `next/server` usage
- Any App Router-specific structure that must be replaced
- Any API Routes under `app/api/` or `pages/api/`
- Any Route Handlers (`route.ts`)
- Any middleware
- Any Server Actions (`"use server"`)
- Any SSR/SSG hooks such as `getServerSideProps`, `getStaticProps`, `getStaticPaths`
- Any metadata exports or other server-only layout features
- Any analytics or runtime features tied to Next.js

## 2. Frontend Architecture Audit
Evaluate:

- Whether the UI is truly client-rendered or meaningfully coupled to SSR
- Routing complexity and what is required to replace it with `react-router-dom`
- Global layout dependencies
- Font loading approach
- Environment variable usage, especially `NEXT_PUBLIC_*`
- State persistence patterns such as `localStorage`
- Authentication/session complexity
- Whether the app is tightly coupled to any Next.js-only runtime assumptions

## 3. Monorepo Migration Planning
Produce a safe migration plan for moving this app into:
`/Users/mac/Documents/DeepOrder_V2/mock-delivery-console/`

The plan must specify:

- Which files and directories should be copied from the source project
- Which files should not be copied
  Examples: `.next`, lockfile conflicts, build artifacts, framework-specific junk
- Whether any source files should be rewritten during migration
- Which parts can be preserved as-is
- Which parts require framework replacement
- Whether the target should be created as a fresh Vite React TypeScript app first, then populated

## 4. Configuration Planning
Plan the required replacements for:

- Next.js layout bootstrapping to Vite `index.html` and `src/main.tsx`
- App Router layout and nested routes to `react-router-dom`
- `next/link` to SPA router links
- `usePathname` or other Next navigation hooks
- `next/font/google`
- static metadata exports
- `@vercel/analytics/next` or similar features
- `NEXT_PUBLIC_*` to `VITE_*`

Respect the actual Tailwind/PostCSS version used in the source project.
Do not assume `tailwind.config.js` or legacy config files are required unless the current codebase actually needs them.

## 5. Backend Integration Validation
Inspect the current frontend and backend contract and determine:

- Which backend this frontend is actually designed to talk to
- The currently correct API base URL pattern
- Whether the prompt assumption of `http://localhost:8000` is wrong
- What the correct Vite env vars should be for the migrated app
- Whether any import paths, CORS assumptions, or local scripts need to change when moved into `DeepOrder_V2`

# Deliverables

Provide the output in the following structure:

## A. Audit Summary
A concise table summarizing:
- Next.js coupling points
- Server-side dependencies
- Routing migration complexity
- Backend/API coupling
- Authentication complexity
- Migration risk level

## B. Migration Verdict
State whether the migration appears:
- Low effort
- Medium effort
- High effort

Include a short explanation tied to actual code findings.

## C. Step-by-Step Migration Plan
Provide an exact sequential plan, but planning only.
Do not perform any actions.

Include:
1. Target directory creation strategy
2. Fresh Vite scaffolding strategy
3. Copy-preserve-rewrite matrix
4. Router migration plan
5. Layout/bootstrap migration plan
6. Env/config migration plan
7. Validation checklist before cutover
8. Cutover checklist
9. Rollback/safety checklist

## D. Exact Commands Draft
Provide draft shell commands that would likely be used later for the migration.
These are draft commands only.
Do not execute them.

## E. File Change Plan
Provide a file-by-file change plan using:
- `KEEP`
- `COPY`
- `REWRITE`
- `REPLACE`
- `DROP`
- `CREATE`

## F. Risks and Open Questions
List concrete technical risks, assumptions that need confirmation, and places where visual or behavioral regressions are most likely.

# Constraints
- Do not execute the migration.
- Do not edit files.
- Do not create directories.
- Do not install packages.
- Do not return vague advice.
- Base every conclusion on actual code inspection.
- If an assumption is wrong, explicitly correct it in the report.

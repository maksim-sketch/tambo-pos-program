# Basic Structure Bootstrap Instructions

**Goal:** Create the minimum project structure required to start the Tambo-first POS build without over-scaffolding the whole system.

**Stop point:** When the workspace folders exist, the root and workspace config files are in place, `bun install` succeeds, and `bunx tsc --noEmit --project tsconfig.base.json` runs without configuration errors.

---

## What You Are Creating

Create only this day-0 structure first:

```text
.
|-- .env.example
|-- .gitignore
|-- bunfig.toml
|-- drizzle.config.ts
|-- package.json
|-- tsconfig.base.json
|-- apps
|   |-- api
|   |   |-- package.json
|   |   |-- tsconfig.json
|   |   `-- src
|   |       |-- db
|   |       |-- routes
|   |       `-- services
|   `-- web
|       |-- package.json
|       |-- tsconfig.json
|       `-- src
|           |-- app
|           `-- features
|               |-- ai
|               `-- cart
`-- packages
    `-- shared
        |-- package.json
        |-- tsconfig.json
        `-- src
            `-- contracts
```

Do not create the full inventory, customer, reports, and test file tree yet. Those belong to later milestones in the main plan.

---

## Before You Start

Make sure these commands work in PowerShell:

```powershell
bun --version
git --version
```

If `bun` is missing, install Bun first. If `git` is missing, install Git before creating the repo.

---

## Step 1: Open The Project Root

From PowerShell:

```powershell
Set-Location "C:\Users\dimov\OneDrive\Documents\test-project-vibecode"
```

Confirm you are in the correct folder:

```powershell
Get-Location
Get-ChildItem -Force
```

Expected:

- You should be inside `C:\Users\dimov\OneDrive\Documents\test-project-vibecode`
- You should already see `docs` and `AGENTS.md`

---

## Step 2: Initialize Git If Needed

Run:

```powershell
if (-not (Test-Path ".git")) { git init }
```

Verify:

```powershell
git status --short
```

Expected:

- Git should no longer report "not a git repository"

---

## Step 3: Create The Minimal Folder Tree

Run this exact PowerShell block:

```powershell
$dirs = @(
  "apps",
  "apps/api",
  "apps/api/src",
  "apps/api/src/db",
  "apps/api/src/routes",
  "apps/api/src/services",
  "apps/web",
  "apps/web/src",
  "apps/web/src/app",
  "apps/web/src/features",
  "apps/web/src/features/ai",
  "apps/web/src/features/cart",
  "packages",
  "packages/shared",
  "packages/shared/src",
  "packages/shared/src/contracts"
)

foreach ($dir in $dirs) {
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
}
```

Verify:

```powershell
Get-ChildItem -Recurse apps, packages
```

Expected:

- `apps/api/src/db`
- `apps/api/src/routes`
- `apps/api/src/services`
- `apps/web/src/app`
- `apps/web/src/features/ai`
- `apps/web/src/features/cart`
- `packages/shared/src/contracts`

---

## Step 4: Create The Required Root Files

Run:

```powershell
$rootFiles = @(
  ".gitignore",
  ".env.example",
  "package.json",
  "bunfig.toml",
  "tsconfig.base.json",
  "drizzle.config.ts"
)

foreach ($file in $rootFiles) {
  if (-not (Test-Path $file)) {
    New-Item -ItemType File -Path $file | Out-Null
  }
}
```

Then fill those files using the exact content blocks from `Task 1` in:

- `docs/superpowers/plans/2026-05-14-tambo-pos.md`

Required files to complete at this step:

- `.gitignore`
- `.env.example`
- `package.json`
- `bunfig.toml`
- `tsconfig.base.json`
- `drizzle.config.ts`

Important:

- Keep `package.json` at the repo root because Bun workspaces are discovered from the root `workspaces` field.
- Keep `apps/*` and `packages/*` in the root `workspaces` array because later commands use `bun run --filter web ...` and `bun run --filter api ...`.

This follows the Bun workspace setup pattern documented in Bun's official workspace docs.

---

## Step 5: Create The Workspace Manifest And TypeScript Files

Run:

```powershell
$workspaceFiles = @(
  "apps/api/package.json",
  "apps/api/tsconfig.json",
  "apps/web/package.json",
  "apps/web/tsconfig.json",
  "packages/shared/package.json",
  "packages/shared/tsconfig.json"
)

foreach ($file in $workspaceFiles) {
  $parent = Split-Path $file -Parent
  if ($parent -and -not (Test-Path $parent)) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }

  if (-not (Test-Path $file)) {
    New-Item -ItemType File -Path $file | Out-Null
  }
}
```

Then fill those files using the exact content blocks from `Task 1` in:

- `docs/superpowers/plans/2026-05-14-tambo-pos.md`

Required files:

- `apps/api/package.json`
- `apps/api/tsconfig.json`
- `apps/web/package.json`
- `apps/web/tsconfig.json`
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`

Important:

- The API workspace should be named `api`
- The frontend workspace should be named `web`
- The shared package should export from `packages/shared/src`

Those names matter because the plan later runs:

```powershell
bun run --filter api dev
bun run --filter web dev
```

This matches Bun's recommended use of filtered workspace scripts.

---

## Step 6: Leave Runtime Source Files For The Next Milestone

At this stage, do **not** create the full implementation files yet unless you are immediately moving into the next plan tasks.

You may leave these directories empty for now:

- `apps/api/src/db`
- `apps/api/src/routes`
- `apps/api/src/services`
- `apps/web/src/app`
- `apps/web/src/features/ai`
- `apps/web/src/features/cart`
- `packages/shared/src/contracts`

Why:

- The current objective is to establish the workspace structure
- The next milestone is the retail shell and Tambo setup, not the complete backend
- Creating dozens of empty files too early makes the repo noisy and harder to verify

---

## Step 7: Install Dependencies

Run from the repo root:

```powershell
bun install
```

Expected:

- A root `node_modules` directory appears
- Bun links workspace packages automatically
- No workspace resolution errors should appear

If Bun reports a workspace error, re-check:

- root `package.json` exists
- root `package.json` has `"workspaces": ["apps/*", "packages/*"]`
- `apps/api/package.json` exists
- `apps/web/package.json` exists
- `packages/shared/package.json` exists

---

## Step 8: Verify TypeScript Configuration

Run:

```powershell
bunx tsc --noEmit --project tsconfig.base.json
```

Expected:

- TypeScript exits without config-level errors
- If source folders are still empty, that is fine

If you get path-related errors, check:

- `tsconfig.base.json` exists at the root
- `apps/api/tsconfig.json` extends `../../tsconfig.base.json`
- `apps/web/tsconfig.json` extends `../../tsconfig.base.json`
- `packages/shared/tsconfig.json` extends `../../tsconfig.base.json`

---

## Step 9: Check What Changed

Run:

```powershell
git status --short
```

Expected:

- New files under `apps/`
- New files under `packages/`
- Root config files listed as untracked or modified

At this point, the basic structure is ready.

---

## What To Do Next

After the structure is ready, continue with the Tambo-first execution order from the main plan:

1. Build the retail shell in `apps/web`
2. Register Tambo components and the persistent cart
3. Add mock command handling for early demos
4. Then return to backend contracts and Hono routes

Do not jump straight into the full database schema or every API route before the shell exists.

---

## Common Mistakes To Avoid

- Creating the full file tree from the big plan before the first shell milestone
- Forgetting the root `workspaces` field in `package.json`
- Naming the frontend workspace something other than `web`
- Naming the backend workspace something other than `api`
- Creating feature files before the folder structure and workspace manifests are valid
- Running `bun install` from inside `apps/web` instead of the repo root

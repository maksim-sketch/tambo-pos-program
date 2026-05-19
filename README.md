# Tambo POS - Next-Gen Retail AI Prototype

## Table of Contents

- [Overview](#overview)
- [Demo Commands](#demo-commands)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Assignment Requirements Coverage](#assignment-requirements-coverage)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Tambo Integration](#tambo-integration)
- [Backend and Database](#backend-and-database)
- [Data Flow](#data-flow)
- [Performance Notes](#performance-notes)
- [Development Approach](#development-approach)

## Overview

Tambo POS is a demo-ready, full-stack retail console where a Tambo-powered AI agent turns natural language commands into real POS actions and dynamically rendered UI.

Instead of navigating static dashboards, a cashier or store manager can type commands such as:

- `Add 2 espressos`
- `Check stock for Blue Shirt in all branches`
- `Pull up profile for Ada Lovelace`
- `Show me a chart of today's sales`
- `Checkout this order`

The application is built as a Bun workspace with:

- a Bun + Hono + Drizzle + SQLite backend
- a React + Vite frontend
- shared Zod contracts
- `@tambo-ai/react` component registration and tool orchestration
- realtime inventory updates over SSE

The demo tenant is `demo-retail`, with two branches:

- `branch-a` / `Branch A`
- `branch-b` / `Branch B`

## Demo Commands

These prompts are the fastest way to validate the experience:

- `Add 2 espressos`
- `Check stock for Blue Shirt in all branches`
- `Check stock for espresso in all branches`
- `Pull up profile for Ada Lovelace`
- `Show me a chart of today's sales`
- `Show me a chart of this week's sales`
- `Show me a chart of this year's sales`
- `Checkout this order`

## Agent Modes

The app supports two agent modes:

- `live` — uses the real Tambo thread and tool orchestration.
- `mock` — uses deterministic local command handling for reliable demos, tests, and fallback behavior.

Use `VITE_AGENT_MODE=live` when testing the real Tambo integration.
Use `VITE_AGENT_MODE=mock` if you want to demonstrate the POS flow without waiting for LLM responses.

## Tech Stack

- Runtime / workspace: Bun
- Backend: Hono, Drizzle ORM, SQLite
- Frontend: React 19, Vite
- Generative UI: `@tambo-ai/react`
- Validation / contracts: Zod
- Charts: Recharts
- Realtime sync: Server-Sent Events (SSE)
- Testing:
  - Bun test for backend services and routes
  - Vitest + Testing Library for frontend
  - Playwright available for end-to-end testing

## Features

- Conversational POS shell with live Tambo mode and deterministic mock mode
- Persistent cart rail that stays visible while the workspace changes
- Required Tambo-rendered retail components:
  - `PersistentCart`
  - `InventoryStatus`
  - `CustomerLoyaltyCard`
  - `SalesChart`
- Cross-branch inventory lookup
- Shared customer history and loyalty profile
- Sales reporting for `today`, `week`, `month`, and `year`
- Real checkout flow that:
  - writes `sales`
  - writes `sale_items`
  - decrements `inventory_levels`
  - writes `inventory_events`
- Receipt-style checkout toast feedback
- Tenant-scoped realtime inventory sync across branches via SSE

## Assignment Requirements Coverage

- Conversational POS shell
  - live Tambo thread and mock-safe demo path are both implemented
- Tambo-first UI
  - the app renders registered components from typed Tambo outputs
- 4 required Tambo components
  - all required components are registered with descriptions and Zod prop schemas
- Multi-tenant capable schema
  - backend schema uses `tenantId` and `branchId`
- Shared customer data across branches
  - customer profile aggregates cross-branch spend, visits, and purchase history
- Inventory manager / stock view
  - real backend inventory lookup with branch-by-branch availability
- Sales reporting
  - real backend report aggregation with chart data, top items, and VIP customers
- Checkout flow
  - sale persistence, stock decrement, receipt/toast feedback
- Realtime branch sync
  - checkout publishes inventory update events and the frontend subscribes over SSE
- README explaining Tambo registration and schema strategy

## Project Structure

```text
.
|- apps/
|  |- api/
|  |  |- src/
|  |  |  |- db/                # Drizzle schema, client, migrations, seed
|  |  |  |- events/            # SSE broadcaster
|  |  |  |- routes/            # Hono route modules
|  |  |  |- services/          # inventory, customer, reports, cart, checkout
|  |  |  `- test/              # temporary database helper for tests
|  |  `- dev.db                # local SQLite database
|  `- web/
|     |- src/
|     |  |- app/               # shell layout and command flow
|     |  |- features/ai/       # Tambo provider, schemas, tools, workspace
|     |  |- features/cart/
|     |  |- features/customers/
|     |  |- features/inventory/
|     |  |- features/notifications/
|     |  `- features/reports/
|- packages/
|  `- shared/
|     `- src/
|        |- contracts/         # shared Zod API contracts
|        `- finance.ts         # shared tax/total helpers
`- docs/
   `- superpowers/             # design specs and implementation plans
```

## Getting Started

### Install dependencies

```bash
bun install
```

### Environment variables

There are two practical env locations in this repo:

1. `apps/web/.env.local` for the Vite frontend
2. optional root `.env` for backend overrides

Create `apps/web/.env.local` with:

```env
VITE_TAMBO_API_KEY=your_tambo_project_api_key
VITE_TAMBO_USER_KEY=cashier-demo
VITE_API_BASE_URL=http://localhost:3001
VITE_AGENT_MODE=live
VITE_TENANT_SLUG=demo-retail
```

Optional root `.env` or shell env for the backend:

```env
DATABASE_URL=./dev.db
PORT=3001
```

### Database setup

Generate, apply, and seed the SQLite schema:

```bash
bun run db:generate
bun run db:migrate
bun run db:seed
```

This creates and populates:

- `apps/api/dev.db`

### Run development servers

Start the API in one terminal:

```bash
bun run dev:api
```

Start the web app in another terminal:

```bash
bun run dev:web
```

Then open the URL Vite prints, usually:

- `http://localhost:5173`

Backend health endpoint:

- `http://localhost:3001/`

Example direct API checks:

- `http://localhost:3001/api/inventory/status?tenantSlug=demo-retail&productQuery=Blue%20Shirt`
- `http://localhost:3001/api/customers/profile?tenantSlug=demo-retail&customerQuery=Ada%20Lovelace`
- `http://localhost:3001/api/reports/sales?tenantSlug=demo-retail&range=week`

## Tambo Integration

The Tambo integration is centered in `apps/web/src/features/ai`.

### Frontend Tambo File Map

- Owns the `TamboProvider` wiring for the whole retail shell, registers the required components through `tamboComponents`, builds the typed tool list with `createTamboTools(...)`, and exposes the `retail_session` context helper. (`apps/web/src/features/ai/tambo-provider.tsx`)
- Contains the frontend Zod schemas that describe what Tambo may render, including `CartLineItemSchema`, `PersistentCartPropsSchema`, `InventoryStatusPropsSchema`, `CustomerLoyaltyCardPropsSchema`, and `SalesChartPropsSchema`. (`apps/web/src/features/ai/tambo-schemas.ts`)
- Defines the typed frontend tools that Tambo can call: `prepareCart`, `checkInventory`, `getCustomerProfile`, `getSalesSnapshot`, and `checkoutSale`. It injects internal values like the default tenant slug and active branch, then bridges tool calls to the real backend with `apiGet(...)` and `apiPost(...)`. (`apps/web/src/features/ai/tambo-tools.ts`)
- Renders the message feed for both mock mode and live mode, reads `useTambo()` thread state, collapses noisy intermediate messages into cleaner cashier -> assistant turns, and auto-scrolls the internal workspace feed. Key helpers include `buildLiveTurns(...)`, `getMeaningfulContents(...)`, `useAutoScroll(...)`, and `renderLiveContent(...)`. (`apps/web/src/features/ai/TamboWorkspace.tsx`)
- Provides the deterministic local demo path used for CI and fallback behavior, including `createEmptyCart(...)`, `createDemoCart(...)`, `createInventoryDemo(...)`, `createCustomerDemoProfile(...)`, `createSalesDemoSnapshot(...)`, and `runMockCommand(...)`. (`apps/web/src/features/ai/mock-agent.ts`)
- Exports the `RetailBranch` interface used across the Tambo shell, tools, and provider. (`apps/web/src/features/ai/retail-branch.ts`)

### Component registration strategy

Each retail surface is registered with:

- a stable component name
- a description explaining when Tambo should use it
- a strict Zod prop schema

Registered components:

- `PersistentCart`
- `InventoryStatus`
- `CustomerLoyaltyCard`
- `SalesChart`

`PersistentCart` is also wrapped with `withTamboInteractable(...)` so it can stay pinned while Tambo updates the rest of the workspace.

### Schema strategy

There are two schema layers:

1. **Frontend component prop schemas**
   - used by Tambo to understand what each registered component can render
   - optimized to be stream-safe by using defaults and tolerant nested shapes where partial content may arrive first

2. **Shared backend/API contracts**
   - defined in `packages/shared/src/contracts`
   - used by both frontend tools and backend routes/services
   - keep request/response shapes aligned across the monorepo

This split keeps Tambo rendering concerns separate from backend domain contracts while still preserving end-to-end typing.

### Tool strategy

The frontend exposes typed Tambo tools for:

- cart preparation
- inventory lookup
- customer profile lookup
- sales reporting
- checkout

## Backend and Database

The backend is a Hono app mounted in:

- `apps/api/src/app.ts`
- `apps/api/src/index.ts`

Core backend modules:

- `inventory-service.ts`
- `customer-service.ts`
- `reports-service.ts`
- `cart-service.ts`
- `checkout-service.ts`

The SQLite schema includes:

- `tenants`
- `branches`
- `products`
- `inventory_levels`
- `customers`
- `sales`
- `sale_items`
- `inventory_events`

Key backend responsibilities:

- enforce tenant and branch scoping
- aggregate customer and reporting data
- own checkout mutations and stock decrements
- publish inventory change events for realtime sync

## Data Flow

### Inventory / customer / report reads

1. Cashier types a natural-language command.
2. Tambo chooses a registered component and tool. (`apps/web/src/features/ai/tambo-provider.tsx`, `apps/web/src/features/ai/tambo-tools.ts`)
3. The frontend tool calls the Bun API using shared contracts. (`apps/web/src/lib/api.ts`, `apps/api/src/app.ts`, `packages/shared/src/contracts/`)
4. Hono validates input and calls a backend service. (`apps/api/src/routes/`, `apps/api/src/services/`)
5. Drizzle queries SQLite. (`apps/api/src/db/`)
6. The response returns to Tambo and renders as a component. (`apps/web/src/features/ai/TamboWorkspace.tsx`)

### Checkout flow

1. Cashier adds items to the active cart.
2. Tambo updates the persistent cart.
3. Cashier submits `Checkout this order`.
4. The checkout tool posts the cart to `/api/checkout`. (`apps/web/src/features/ai/tambo-tools.ts`, `apps/api/src/routes/checkout.ts`)
5. The backend transaction:
   - validates branch and products (`apps/api/src/services/checkout-service.ts`)
   - writes `sales` (`apps/api/src/db/schema.ts`)
   - writes `sale_items` (`apps/api/src/db/schema.ts`)
   - decrements `inventory_levels` (`apps/api/src/db/schema.ts`)
   - writes `inventory_events` (`apps/api/src/db/schema.ts`)
6. The frontend shows a receipt-style toast. (`apps/web/src/features/notifications/receipt-toast.tsx`)
7. The backend publishes an SSE inventory update. (`apps/api/src/routes/events.ts`)
8. Open inventory views update live across branches. (`apps/web/src/features/inventory/inventory-sync-store.ts`)

## Performance Notes

Local backend timings are fast; the slow part of the experience is the live Tambo / LLM round-trip, not SQLite or Drizzle.

Example local API timings observed during development:

- inventory: about `6 ms`
- customer profile: about `5 ms`
- sales report: around `10 ms`

Important distinction:

- `runs?userKey=...` in DevTools measures the Tambo/model step and can take several seconds
- `status?...`, `profile?...`, and `sales?...` are the real backend API timings
- the long-lived `EventSource` request for inventory sync is **not latency**; it stays open by design

In practice, full live prompts may take around `4-7 seconds` because they include:

- Tambo run creation
- model reasoning
- tool selection
- API call
- UI rendering

## Development Approach

The project was built with a Tambo-first delivery order:

1. get the conversational shell and persistent cart working
2. register the required Tambo components with strict schemas
3. add deterministic mock behavior for reliable local testing
4. fill in real backend services and routes behind the tools
5. add checkout mutations and realtime inventory sync

Implementation principles used throughout:

- strict TypeScript everywhere
- small, testable service and route modules
- shared Zod contracts in `packages/shared`
- demo reliability over unnecessary complexity
- UI polish focused on a retail-console feel rather than a generic dashboard

Current testing coverage includes:

- backend route/service tests with Bun
- frontend component and shell tests with Vitest + Testing Library
- optional Playwright support for end-to-end flows

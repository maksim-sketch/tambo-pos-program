# Tambo POS Design Spec

## Goal

Build a multi-tenant capable POS application where the primary interface is a conversational retail workspace. Instead of clicking through fixed dashboards, staff will use natural language and Tambo will render the right React components for carting, inventory, CRM, and reporting.

## Constraints

- Use TypeScript in strict mode.
- Use React + Vite + Tailwind on the frontend.
- Use Bun with Hono on the backend.
- Use Drizzle with SQLite for the test-project baseline.
- Use Zod for all Tambo component props and API contracts.
- Demonstrate real-time inventory changes across Branch A and Branch B.
- Keep the scope tight enough to deliver a polished demo rather than a half-finished ERP.

## Approach Options

### Option 1: Classic dashboard with AI shortcuts

Keep the usual inventory, customer, and report screens, then bolt a chat box onto the side.

- Pros: fastest to scaffold
- Cons: misses the spirit of the brief because AI does not truly orchestrate the interface

### Option 2: Tambo-first command workspace with persistent retail surfaces

Build a single retail shell with a command panel, a persistent cart, and a dynamic canvas where Tambo renders components such as stock views, customer cards, and charts.

- Pros: matches the assignment closely, highlights component registration and Zod schema design, keeps the demo focused
- Cons: requires tighter frontend architecture and better typed contracts

### Option 3: Backend-generated UI manifest

Interpret commands on the backend, return a custom UI manifest, and render it in React with minimal Tambo usage.

- Pros: deterministic and easy to test
- Cons: weakens the Tambo story and moves the most important work away from the requested integration

## Recommended Direction

Choose Option 2.

This is now the selected implementation strategy for the project. It keeps the value centered on Tambo while still using the backend for the heavy lifting: inventory lookups, checkout mutations, customer history aggregation, and sales reporting. The frontend becomes a curated command workspace with a persistent cart, while the backend stays fast and predictable.

## Architecture

Use a Bun workspace with three top-level areas:

- `apps/api`: Hono server, Drizzle schema, seed data, tenant-aware services, SSE event stream
- `apps/web`: Vite React app, Tambo provider, component registry, retail shell, realtime subscriptions
- `packages/shared`: shared Zod contracts and utility types used by both apps

The data flow should be:

1. The cashier enters a natural language command.
2. Tambo selects a registered component and invokes typed client tools when data is needed.
3. Client tools call the Bun API using shared contracts.
4. The API queries or mutates SQLite through Drizzle.
5. The response feeds a Tambo-rendered component or updates an interactable component already on screen.
6. Inventory mutations emit SSE updates so other open branch views refresh immediately.

## Tambo-First Implementation Order

The project should be built in this order:

1. Create the minimal workspace structure and tooling.
2. Build the retail shell and command workspace in `apps/web`.
3. Register Tambo components and make `PersistentCart` interactable.
4. Add a deterministic mock command mode so the core prompts can be demoed and tested early.
5. Fill in the backend contracts, database schema, and Hono route modules behind the UI.
6. Add real checkout mutations, SSE inventory sync, CRM aggregation, and sales reporting.
7. Finish automated tests, README, and GitHub-ready delivery steps.

This ordering intentionally proves the Generative UI experience before expanding the full backend surface area.

## Core Domain Model

Use tenant-scoped tables from day one:

- `tenants`
- `branches`
- `products`
- `inventory_levels`
- `customers`
- `sales`
- `sale_items`
- `inventory_events`

Every business table except immutable lookup data should carry `tenantId`. Branch-specific data should also carry `branchId`.

## Tambo Component Strategy

Register at least these four components:

### `PersistentCart`

- Purpose: stay on screen while the cashier adds, removes, or checks out items
- Tambo note: make props stream-friendly by using defaults for collections and totals
- Interaction model: wrap with `withTamboInteractable` and use stable `cartId`

### `InventoryStatus`

- Purpose: render stock for a queried product across all branches
- Main data: product name, branch rows, quantity, low-stock state, last updated timestamp

### `CustomerLoyaltyCard`

- Purpose: show cross-branch purchase history and loyalty summary for a customer
- Main data: name, points, total spend, branches visited, recent purchases

### `SalesChart`

- Purpose: render an aggregated chart for today's sales plus top items and high-value customers
- Main data: hourly totals, top products, VIP customers, revenue summary

## Backend Responsibilities

- Enforce tenant and branch scoping
- Own all stock decrements and sales writes
- Aggregate customer history across branches
- Publish inventory update events after checkout
- Provide small, composable endpoints for Tambo client tools

## Frontend Responsibilities

- Provide a polished "Retail Dark Mode" shell
- Host the Tambo provider and component registry
- Keep the cart visually persistent even as the dynamic canvas changes
- Subscribe to the inventory SSE stream and refresh relevant branch views
- Show toast and receipt feedback after checkout

The frontend is the first delivery milestone. The earliest usable demo should already support a command box, dynamic component canvas, and persistent cart before the backend is fully complete.

## Testing Strategy

Use a two-track testing model:

- Deterministic local tests: Bun tests for services and routes, Vitest and Testing Library for React, Playwright for end-to-end flows
- Live integration testing: manual dev verification with a real Tambo API key

Because live LLM responses are nondeterministic, introduce a lightweight mock agent mode for CI and local automation as an early milestone, not just a final testing aid. The production path still uses `TamboProvider`; the mock path exists so tests can assert that commands map to the right tool calls and rendered components while the backend is still being filled in.

## Error Handling

- Unknown command: show a helpful assistant reply with example prompts
- Product not found: render an empty-state inventory or cart response rather than a raw error
- Low stock: show warning state in cart and inventory components
- Checkout conflict: reject sale if requested quantity exceeds current branch stock
- Missing customer: show searchable fallback rather than a blank card

## Definition of Done Mapping

- Functional generative POS: `Add 2 espressos` updates `PersistentCart`
- Tambo integration: 4+ components registered with Zod schemas
- Inventory manager: CRUD or AI-triggered stock view backed by real data
- Customer CRM: searchable shared customer database
- Sync logic: branch view A and B update from the same sale event
- GitHub-ready delivery: README documents Tambo registration logic and demo steps

## Out of Scope For v1

- Payments gateway
- Hardware peripherals
- Offline-first sync
- True multi-server replication
- Full MCP wiring directly into Drizzle

MCP support can be a stretch follow-up after the core demo is stable.

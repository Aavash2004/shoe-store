# ADR-001: Integrated Next.js Backend & Scaling Boundaries

**Status:** Accepted  
**Applies to:** Shoe Store — MVP / early-growth stage  
**Last reviewed:** 2026-09-09  

---

## 1. Decision Summary

We build the backend directly into Next.js (App Router) — Server Components, Route Handlers (`/api/*`), and Server Actions — rather than standing up a separate Express/NestJS/FastAPI service, for the MVP and early-growth stage of this project.

This gives us:
* **Shared types end-to-end**: Prisma models, Zod schemas, and TypeScript types are defined once and consumed by both the UI and the API/mutation layer. No DTO duplication, no drift.
* **Fewer network hops for reads**: Server Components query the database directly during server render, instead of the browser calling a frontend server that calls a separate backend that calls the database.
* **One deployable, one pipeline**: Single build (`pnpm build`), single origin (no CORS configuration needed), and a single unified service to monitor and scale on day one.
* **Isolated server execution**: Secrets stay server-side by construction, and Server Actions get CSRF protection out of the box.

This is the right default for a single-team, single-client (web) product at this stage. It is not a claim that this architecture has no limits — see §3 and §4.

---

## 2. Critical Production Hazards & Mitigations

These are not edge cases. Each one is a common, documented failure mode for Next.js + Postgres on serverless infrastructure, and each needs to be deliberately configured — none of them are solved automatically by "the backend being integrated."

### 2.1 Database Connection Pooling

**Hazard:**  
Every Server Component render, Route Handler invocation, or Server Action can run as a separate serverless function instance. Under load (e.g., a flash sale event), platforms like Vercel spin up dozens of concurrent instances. If each one opens its own direct Postgres (TCP) connection via `pg` / `@prisma/adapter-pg`, we exhaust Postgres's connection limit (`max_connections`) and the site crashes with:
```
FATAL: remaining connection slots are reserved for non-replication superuser connections
```
or
```
FATAL: too many connections
```
typically at the worst possible moment (peak customer traffic).

**Mitigation:**
1. Use Neon's pooled connection string (PgBouncer-backed, `-pooler` host suffix, or `?pgbouncer=true&sslmode=require`) for all application code running in serverless / production runtime.
2. For Edge runtimes specifically (Edge Middleware, Edge Route Handlers), raw TCP is unavailable — use `@neondatabase/serverless` (WebSocket/HTTP driver) instead of standard `pg`.
3. In [`lib/db/prisma.ts`](../lib/db/prisma.ts), `DATABASE_URL` (pooled) must be prioritized over any unpooled direct connections during application runtime. Set connection pool limits per instance (e.g. `max: 1` or `max: 2`) so concurrent lambdas don't hoard idle connection slots.
4. Reserve the direct (unpooled) connection string (`DIRECT_URL` / `DATABASE_URL_UNPOOLED`) strictly for long-lived CLI operations: Prisma migrations (`prisma migrate deploy`), schema pushes, and seed scripts (`prisma/seed.ts`).

---

### 2.2 Server Action Performance Nuance

**Hazard:**  
"No network round-trip" is only true for RSC reads during initial page render. Server Actions are still real client-to-server HTTP `POST` requests, typically taking 200–500ms depending on client network conditions, payload size, serverless cold starts, and database query latency. 

Treating Server Actions as free, synchronous function calls leads to:
* Chained/sequential Server Actions in a single flow (e.g., checkout step-by-step) with no intermediate loading state, producing a UI that feels completely frozen or unresponsive.
* Under-building optimistic UI because low latency was mistakenly assumed.

**Mitigation:**
1. Document Server Actions as remote RPC network calls in development guidelines, not local in-memory function calls.
2. Avoid sequential "waterfall" Server Action invocations where one action's result is needed before starting the next; batch mutations into a single action where appropriate.
3. Use optimistic UI patterns (such as React 19's `useOptimistic` or Zustand optimistic state) for cart updates, wishlist toggles, and frequent low-risk mutations so the UI updates instantaneously.
4. Always pair mutating Server Actions with explicit pending states (`useTransition`, `useFormStatus`, disabled buttons, and loading spinners).

---

### 2.3 Security Guarantees vs. Developer Duties

**Hazard:**  
Server Actions are, under the hood, public HTTP `POST` endpoints with obfuscated identifiers. Next.js's automatic CSRF protection prevents cross-site forgery, but it does not:
* Authenticate the caller.
* Authorize what the caller is permitted to do.
* Validate or sanitize the incoming payload.

Assuming "the framework handles security" creates dangerous vulnerabilities where anyone with browser DevTools can invoke the action directly with arbitrary, malicious, or malformed data.

**Mitigation:**  
Every Server Action and Route Handler that mutates data must enforce three defensive layers:
1. **Authentication**: Re-check the session using `auth()` from NextAuth — never trust client-side state or route guards alone.
2. **Authorization**: Verify permissions and enforce data ownership at the query level (e.g., scoping writes with `where: { userId: session.user.id }` or calling `requireAdmin()` for administrative routes).
3. **Strict Validation**: Validate and sanitize every input parameter with a dedicated `Zod` schema before passing data into Prisma queries.
4. Treat every Server Action as if it were a public REST endpoint, because over the wire, it is one.

---

## 3. Coupled Scaling & Failure Domains (The Cost of Monolith)

This is the architectural trade-off most likely to cause incidents if not continuously monitored.

### 3.1 Resource Competition
Admin-facing workloads (e.g., bulk CSV product exports, complex analytics aggregation, sales reporting) and customer-facing operations (store browsing, cart additions, checkout) run within the same application deployment. A slow or memory-heavy admin query can consume available compute, trigger CPU throttling, or exhaust database connections, degrading customer storefront performance.

### 3.2 Deployment Risk & Blast Radius
A single deployable artifact means a regression in one domain (e.g., an unhandled error in admin category management or an outdated dependency) has the potential to break storefront navigation or checkout flows. There is no infrastructure isolation between administrative tools and customer revenue paths.

### 3.3 Why This Is Acceptable Now
At MVP and early-growth scale, team size and concurrent traffic make this coupling an advantageous trade for development speed, rapid iterations, and zero DevOps overhead. Documenting this ensures the coupling is an intentional choice, not an invisible blindspot.

---

## 4. Concrete Triggers for Service Extraction (When to Split)

Extract a capability into a dedicated, decoupled service or worker when any of the following triggers are met:

| Trigger | Real-World Example | Why It Forces a Split |
| :--- | :--- | :--- |
| **Long-running / Background Work** | Batch image resizing/optimization, large data exports, scheduled invoice generation | Exceeds serverless execution timeout limits (10s–60s); must not block HTTP request/response loops. |
| **Persistent Connections** | Live order tracking over WebSockets, real-time customer support chat | Requires long-lived server processes; incompatible with stateless serverless execution models. |
| **Resource Asymmetry** | Heavy search indexing, personalized recommendations engine | Scaling the entire frontend deployment to meet the CPU/memory demands of one isolated path wastes budget and introduces instability. |
| **Dedicated Event / Webhook Workers** | Payment webhooks (e.g., Khalti, Stripe), external inventory feeds | Requires guaranteed delivery, automated retries, and complete isolation from user-facing traffic surges. |
| **Multiple Client Platforms** | Native iOS/Android mobile apps, third-party B2B integration APIs | Demands a stable, versioned, independently released REST/GraphQL API contract decoupled from web frontend releases. |
| **Rate Limiting & Public Exposure** | Public-facing partner or affiliate APIs | Requires edge rate-limiting, distinct API keys, and independent DDoS throttling rules. |
| **Polyglot Stack Requirements** | Machine learning recommendation models (Python), high-throughput telemetry (Go/Rust) | Capabilities outside the primary Node.js runtime strengths. |
| **Team / Organizational Boundaries** | Dedicated frontend and backend engineering squads with distinct sprints | Monolithic deploy pipelines become a coordination bottleneck. |

> **Rule of Thumb**: When **2 or more** of these triggers apply to the same capability, extract *only that capability* into an isolated microservice or worker queue. Do not perform a full-system rewrite.

---

## 5. Verification Checklist

- [x] **Dependency Versions Verified:** Confirmed against [`package.json`](../package.json):
  - `@prisma/client`: `^7.9.1`
  - `@prisma/adapter-pg`: `^7.10.0`
  - `@neondatabase/serverless`: `^1.1.0`
  - `pg`: `^8.23.0`
  - `zod`: `^4.4.3`
  - `next-auth`: `5.0.0-beta.32`
- [x] **Connection Pooling Guard:** `DATABASE_URL` (pooled) is prioritized in [`lib/db/prisma.ts`](../lib/db/prisma.ts) for production runtime with `max: 2` container limit; `DIRECT_URL` / `DATABASE_URL_UNPOOLED` is reserved strictly for migrations and seed scripts.
- [x] **Edge Runtime Support:** Driver adapters configured for both serverless `@prisma/adapter-pg` and `@neondatabase/serverless`.
- [x] **Zero-Trust Server Actions:** Server Actions (reviews, coupons, categories, products, orders) perform explicit session authentication, role checks (`requireAdmin`), and strict Zod schema validation before database execution.
- [x] **Optimistic UI & Pending Feedback:** Cart and wishlist stores use Zustand optimistic state; review and order forms use `useTransition` / `isPending` state handling.
- [ ] **Quarterly Architecture Review:** This document is re-evaluated quarterly or as soon as any trigger in §4 is reached.

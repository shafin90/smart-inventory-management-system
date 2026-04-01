# Smart Inventory & Order Management System

A full-stack, production-ready web application for managing products, stock levels, customer orders and fulfillment workflows. Built with a clean 4-layer architecture, containerised infrastructure, role-based access control, atomic concurrency-safe stock operations, and real-time queue-based event processing.

**Live Demo →** [https://smart-inventory-management-system-frontend-p4g7f33us.vercel.app](https://smart-inventory-management-system-frontend-p4g7f33us.vercel.app)

| Role | Email | Password |
|---|---|---|
| Admin | demo@inventory.com | password123 |
| Manager | manager@demo.com | password123 |

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Design](#system-design)
  - [High-Level Architecture](#high-level-architecture)
  - [Database Design & Decisions](#database-design--decisions)
  - [Caching Strategy](#caching-strategy)
  - [Message Queue Design](#message-queue-design)
  - [Concurrency & Race Condition Handling](#concurrency--race-condition-handling)
  - [Authentication & Security Design](#authentication--security-design)
  - [Role-Based Access Control Design](#role-based-access-control-design)
  - [Frontend Architecture Decisions](#frontend-architecture-decisions)
  - [Backend Architecture Decisions](#backend-architecture-decisions)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [Creating the First Admin](#creating-the-first-admin)
- [Role & Permission Matrix](#role--permission-matrix)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Deployment](#deployment)
- [Production Checklist](#production-checklist)

---

## Features

| Module | Description |
|---|---|
| **Authentication** | Email + password login, JWT tokens (12h expiry), demo credentials |
| **Manager Signup** | Public registration collects name / phone / address, starts as *pending* |
| **Admin Approval** | Admin approves or rejects managers; email sent via SMTP on each decision |
| **Products & Categories** | CRUD with trigram full-text search, pagination, stock threshold tracking |
| **Order Management** | Multi-item orders, auto price calculation, status workflow, conflict detection |
| **Stock Handling** | Atomic stock deduction with `SELECT … FOR UPDATE`, auto Out-of-Stock flip |
| **Restock Queue** | Auto-enqueued when stock < threshold, priority sorting, manual restock |
| **Dashboard** | KPI cards + all-status bar chart, low-stock summary, pending manager alert |
| **Activity Log** | Last 10 system events with timestamp and semantic icons |
| **RBAC** | Admin (superpower) vs Manager (business operations) with backend enforcement |
| **Caching** | Redis caches dashboard data (60s TTL), invalidated on mutation |
| **Message Queue** | RabbitMQ `restock_events` queue with consumer prefetch and auto-reconnect |

---

## Tech Stack

### Frontend
| Layer | Technology | Why |
|---|---|---|
| UI | React 19 + Vite | Component model, fast HMR, ES module native |
| State | MobX + mobx-react-lite | Observable state, less boilerplate than Redux |
| HTTP | Axios | Interceptors for auto-attaching JWT tokens |
| Charts | Recharts | Composable chart primitives for React |
| Icons | Lucide React | Consistent SVG icon set, tree-shakeable |

### Backend
| Layer | Technology | Why |
|---|---|---|
| Server | Node.js 20 + Express | Non-blocking I/O ideal for high-concurrency REST APIs |
| Database | PostgreSQL 16 | ACID compliance, row-level locking, rich indexing |
| Cache | Redis 7 | Sub-millisecond reads, TTL support, atomic operations |
| Queue | RabbitMQ 3 | Reliable async messaging, consumer acknowledgment |
| Auth | JWT + bcryptjs | Stateless tokens, no server-side session storage needed |
| Validation | Zod | Type-safe schema validation at the controller boundary |
| Email | Nodemailer | SMTP abstraction with console fallback for dev |
| Testing | Jest + Supertest | Isolated unit + integration tests with mocked services |

### Infrastructure
| Component | Technology | Why |
|---|---|---|
| Containerisation | Docker + Docker Compose | Reproducible environments, service orchestration |
| Security | Helmet, express-rate-limit, CORS | Defense-in-depth HTTP security headers + abuse prevention |
| Performance | gzip compression, pg_trgm indexes, connection pooling | Reduce payload size, fast searches, reuse DB connections |
| Observability | Morgan, request correlation IDs, graceful shutdown | Traceable logs, clean process termination |

---

## System Design

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      Client (Browser)                            │
│                                                                  │
│   UI Component                                                   │
│       └── Custom Hook (local state + side effects)               │
│               └── Service (data transform, error unwrap)         │
│                       └── Axios HTTP Client (auth header)        │
└─────────────────────────────┬────────────────────────────────────┘
                              │ HTTPS / REST
┌─────────────────────────────▼────────────────────────────────────┐
│                    Express API  (port 4000)                       │
│                                                                  │
│  Rate Limiter → CORS → Helmet → Morgan → Request ID              │
│                                                                  │
│  Router                                                          │
│    └── Auth Middleware (JWT verify)                              │
│          └── Role Middleware (admin / manager guard)             │
│                └── Controller (Zod validation + HTTP response)   │
│                      └── Service (business logic)                │
│                            ├── PostgreSQL  (primary store)       │
│                            ├── Redis       (read cache)          │
│                            └── RabbitMQ   (async events)         │
│                                                                  │
│  Global Error Middleware (ZodError | ApiError | DB errors | 500) │
└──────────────────────────────────────────────────────────────────┘
```

**Impact of this layered design:**
- Each layer has a **single responsibility** — UI knows nothing about HTTP, services know nothing about HTTP verbs
- Swapping the database or cache requires changes only in the service layer
- Controller-level Zod validation rejects bad input before it reaches business logic, reducing attack surface
- Global error middleware prevents accidental information leakage in stack traces

---

### Database Design & Decisions

```
users ──────────────────────── orders ─────────── order_items
  │ id, email, role, status      │ id, status          │ order_id
  │ name, phone, address         │ customer_name        │ product_id
  │                              │ total_price          │ quantity, unit_price
categories ──── products         │ created_by (→users)
  │ id, name     │ id, name      │
                 │ category_id   restock_queue
                 │ price         │ product_id (UNIQUE)
                 │ stock_qty     │ priority
                 │ min_threshold
                 │ status        activity_logs
                                 │ message, user_id
```

**Key decisions and their impact:**

| Decision | Reasoning | Impact |
|---|---|---|
| `order_items` separate table | Normalisation — one order can have many products | Prevents data duplication, enables per-item price history |
| `unit_price` stored in order_items | Price can change later; historical orders must remain accurate | Order totals are immutable after creation |
| `min_stock_threshold` per product | Different products have different reorder points | Flexible low-stock detection without hardcoded values |
| `status` as PostgreSQL ENUM | Constrains valid values at DB level | DB rejects invalid status strings — no application-level bug can corrupt data |
| `created_by` FK on orders | Audit trail | Know which user placed each order |
| `product_id UNIQUE` on restock_queue | A product can only appear once in the queue | Prevents duplicate restock notifications |
| `user_status` ENUM (pending/active/rejected) | Manager approval workflow | Rejected managers cannot log in even if they know the password |

**Performance indexes:**
- `pg_trgm` GIN index on `products.name` → supports `ILIKE '%search%'` without full-table scan
- Composite index on `orders(status, created_at)` → fast dashboard aggregation
- FK indexes on `order_items(order_id)`, `order_items(product_id)` → fast JOIN without sequential scan
- `users(status)` index → fast pending-manager lookup

---

### Caching Strategy

```
Request → Redis.get("dashboard:today")
            │
    HIT ────┴──► Return cached JSON (< 1ms)
            │
    MISS ───┴──► Query PostgreSQL (aggregation)
                    └──► Redis.set(..., EX 60)
                              └──► Return to client

On any mutation (order create/update, product restock):
    └──► Redis.del("dashboard:today")  (cache invalidation)
```

**Why this approach:**
- Dashboard runs 5 parallel SQL aggregation queries — expensive under high load
- 60-second TTL means data is at most 1 minute stale — acceptable for a KPI dashboard
- **Write-through invalidation** (not TTL-only): mutations immediately bust the cache so the next load is always fresh
- **Graceful degradation**: if Redis goes down, the app falls back to direct DB queries — no outage

**Impact:** Under 100 concurrent dashboard polls, Redis absorbs ~99% of the read load. PostgreSQL only serves the first request per minute.

---

### Message Queue Design

```
Order Created / Stock Updated
          │
          ▼
   orderService / productService
          │
          └──► RabbitMQ.publish("restock_events", { productId, stock, threshold })
                        │
                        ▼
               Consumer (consumer.js)
                        │
                        ├── channel.ack(msg)    ← success
                        └── channel.nack(msg)   ← failure, requeue
```

**Why RabbitMQ instead of direct function call:**
- **Decoupling**: the order service doesn't need to know who processes restock events
- **Reliability**: if the consumer crashes, messages are not lost — RabbitMQ holds them until requeued
- **Backpressure**: `prefetch(10)` means the consumer processes at most 10 messages at a time, preventing memory overload
- **Auto-reconnect**: exponential backoff reconnection on disconnect — survives RabbitMQ restarts without app restart

**Current consumer behaviour:** Logs received events. In a real production extension this would trigger warehouse system webhooks, Slack alerts, or purchase order automation.

---

### Concurrency & Race Condition Handling

**The Problem — Stock Overselling:**

Without locking, two simultaneous orders for the last item both read `stock=1`, both pass validation, and both deduct — resulting in `stock=-1`.

```
Time   Request A          Request B
 1     SELECT stock=1      SELECT stock=1
 2     validate: ok        validate: ok
 3     UPDATE stock=0      UPDATE stock=0   ← both succeed, stock goes to -1
```

**The Solution — `SELECT … FOR UPDATE`:**

```sql
SELECT id, name, price, status, stock_quantity, min_stock_threshold
FROM products
WHERE id = ANY($1)
FOR UPDATE          ← acquires row-level lock
```

```
Time   Request A                  Request B
 1     BEGIN                      BEGIN
 2     SELECT ... FOR UPDATE      SELECT ... FOR UPDATE (BLOCKED)
 3     validate: ok
 4     UPDATE stock=0
 5     COMMIT
 6                                (lock released, B reads stock=0)
 7                                validate: FAIL → 400 "Only 0 items available"
 8                                ROLLBACK
```

**Impact:**
- Zero possibility of stock going below 0 regardless of concurrent load
- Lock is held only for the duration of the transaction (milliseconds)
- Paired with connection pool `statement_timeout: 30s` to prevent lock starvation

**Transaction atomicity:** `updateRestockQueue` runs inside the same transaction as the stock deduction — if stock update succeeds but restock queue update fails, the entire transaction rolls back. No partial state.

---

### Authentication & Security Design

**JWT Flow:**
```
Login → bcrypt.compare(password, hash)
          └── jwt.sign({ id, email, role }, SECRET, { expiresIn: "12h" })
                └── Client stores token in localStorage
                      └── Every request: Authorization: Bearer <token>
                            └── authMiddleware: jwt.verify(token, SECRET)
                                  └── req.user = { id, email, role }
```

**Security layers applied:**

| Layer | Mechanism | Protects Against |
|---|---|---|
| Password storage | bcrypt (cost 10) | Brute-force even with DB dump |
| Tokens | JWT HS256, 12h expiry | Replay attacks become invalid after expiry |
| Rate limiting | 300 req/min global, 20 req/min on `/auth` | Brute-force login, DDoS |
| HTTP headers | Helmet (CSP, HSTS, X-Frame-Options…) | XSS, clickjacking, MIME sniffing |
| Input validation | Zod schemas at every controller | Injection, malformed payloads |
| Body size limit | 100kb max | Memory exhaustion via large payloads |
| Admin creation | Internal route + secret header | No one can self-register as admin |
| CORS | Configurable origin whitelist | Cross-origin request forgery |
| Request IDs | UUID on every request | Traceable error logs without PII |

---

### Role-Based Access Control Design

RBAC is enforced at **two independent layers** — UI and API. This is defence-in-depth: even if the frontend is bypassed (e.g. Postman), the backend enforces permissions.

```
HTTP Request
    │
    ├── authMiddleware        ← Is the token valid? (401 if not)
    │
    └── requireRole("admin") ← Is the role correct? (403 if not)
              │
              └── Controller / Service
```

**Manager Order Flow Enforcement:**

Managers cannot skip steps or revert orders. The backend validates the transition:

```
currentStatus → requestedStatus

Pending   → Confirmed  ✅ allowed
Confirmed → Shipped    ✅ allowed
Shipped   → Delivered  ✅ allowed
Pending   → Shipped    ❌ 403 "Can only move to Confirmed"
Shipped   → Cancelled  ❌ 403 "Cannot cancel after shipping"
```

**Why enforce in the backend and not just the frontend?**

A malicious or buggy client can send any HTTP request. Backend enforcement means the database can never be put into an invalid state regardless of what the client sends.

---

### Frontend Architecture Decisions

**4-Layer separation:**

```
UI (JSX)         ← renders, no business logic
   │
Hook (useXxx)    ← local state, calls service, exposes to UI
   │
Service          ← data transform, error normalisation
   │
API (Axios)      ← one function per HTTP endpoint
```

**Why this matters:**
- The UI component is a pure rendering function — it can be redesigned without touching business logic
- The API layer is the only place HTTP is mentioned — swapping from REST to GraphQL requires only changing this layer
- Services normalise errors so the UI always receives a consistent error shape regardless of whether it's a network error, a 4xx, or a 5xx

**MobX for state:**
- `rootStore` holds `token`, `user`, `activeTab` as observable
- Any component wrapped in `observer()` re-renders automatically when these change
- No prop-drilling, no Context boilerplate
- `isAdmin` is a computed getter — derived from `user.role`, always in sync

---

### Backend Architecture Decisions

**Feature-based directory structure** (not layer-based):

```
features/
├── auth/       ← router + controller + service together
├── product/
├── order/
├── admin/
└── internal/
```

**Why feature-based over layer-based (`routes/`, `controllers/`, `services/`):**
- Adding a new feature requires touching one folder, not four
- Deleting a feature is a single folder delete — no orphaned files across directories
- Easier to reason about — all code for "orders" is in one place

**Fail-fast environment validation:**

```javascript
const REQUIRED = ["DATABASE_URL", "JWT_SECRET", "REDIS_URL", "RABBITMQ_URL"];
REQUIRED.forEach(key => {
  if (!process.env[key]) throw new Error(`Missing required env: ${key}`);
});
```

**Impact:** The app crashes immediately at startup with a clear error if configuration is missing — rather than silently failing hours later when the missing variable is first used.

**Graceful shutdown:**
```javascript
process.on("SIGTERM", async () => {
  await server.close();
  await db.pool.end();
  await redis.quit();
  process.exit(0);
});
```

**Impact:** In-flight requests complete before the process exits. Kubernetes / Railway rolling deploys have zero dropped requests.

---

## Project Structure

```
monorepo/
├── frontend/                   # React/Vite (deployed to Vercel)
│   ├── src/
│   │   ├── features/           # auth | dashboard | products | orders
│   │   │                       # restock | activity | admin
│   │   ├── stores/
│   │   │   └── rootStore.js    # MobX global state
│   │   └── shared/api/
│   │       └── httpClient.js   # Axios with JWT interceptor
│   └── package.json
│
├── backend/                    # Express API (deployed to Railway)
│   ├── src/
│   │   ├── features/           # auth | category | product | order
│   │   │                       # restock | dashboard | activity | admin | internal
│   │   ├── db/                 # postgres.js (Pool) · redis.js (client)
│   │   ├── queue/              # rabbitmq.js · consumer.js
│   │   ├── middleware/         # authMiddleware · roleMiddleware · errorMiddleware
│   │   ├── utils/              # apiError · mailer · cache
│   │   └── config/env.js       # Fail-fast env validation
│   ├── sql/
│   │   ├── schema.sql          # Full schema (Docker initdb)
│   │   ├── seed.sql            # Demo credentials
│   │   └── migrations/         # 001_initial · 002_indexes · 003_user_profile
│   ├── src/__tests__/          # Jest + Supertest (49 tests)
│   ├── .env.example
│   └── Dockerfile
│
├── docker-compose.yml          # backend · postgres · redis · rabbitmq
├── README.md
└── package.json                # npm workspaces root
```

---

## Getting Started

### Prerequisites

- **Node.js** v20+
- **Docker Desktop** (for backend services)
- **npm** v9+

### 1 — Clone and install

```bash
git clone https://github.com/shafin90/smart-inventory-management-system.git
cd smart-inventory-management-system/monorepo
npm install
```

### 2 — Configure environment

```bash
cp backend/.env.example backend/.env.docker
```

Edit `backend/.env.docker` — set service hostnames to Docker service names:

```env
DATABASE_URL=postgres://postgres:postgres@postgres:5432/inventory_db
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://rabbitmq:5672
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
```

### 3 — Start all backend services

```bash
docker-compose up --build -d
```

| Container | Port | Description |
|---|---|---|
| `inventory-backend` | 4000 | Express API |
| `inventory-postgres` | 5432 | PostgreSQL 16 |
| `inventory-redis` | 6379 | Redis 7 |
| `inventory-rabbitmq` | 5672 / 15672 | RabbitMQ (15672 = management UI) |

On first launch PostgreSQL auto-runs `schema.sql` and `seed.sql`.

### 4 — Start frontend dev server

```bash
npm run dev --workspace=frontend
```

Open **http://localhost:5173**

### Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | demo@inventory.com | password123 |
| Manager | manager@demo.com | password123 |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No (4000) | Express server port |
| `NODE_ENV` | No (development) | `development` or `production` |
| `JWT_SECRET` | **Yes** | 64-byte random hex. `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string |
| `DB_POOL_MAX` | No (20) | Max DB connections |
| `DB_POOL_MIN` | No (2) | Min idle connections |
| `REDIS_URL` | **Yes** | Redis connection string |
| `RABBITMQ_URL` | **Yes** | RabbitMQ AMQP URL |
| `CORS_ORIGIN` | No (*) | Comma-separated allowed origins |
| `SMTP_HOST` | No | SMTP hostname (e.g. `smtp.gmail.com`). If unset, emails log to console. |
| `SMTP_PORT` | No (587) | SMTP port |
| `SMTP_SECURE` | No (false) | `true` for SSL (port 465) |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASS` | No | SMTP password or app password |
| `SMTP_FROM` | No | Sender address |
| `INTERNAL_SECRET` | No | Required for `POST /api/internal/create-admin` |

---

## Database Migrations

```bash
npm run db:migrate   --workspace=backend   # apply all pending
npm run db:rollback  --workspace=backend   # roll back latest
npm run db:status    --workspace=backend   # show applied/pending
```

Migrations are tracked in a `schema_migrations` table. Each migration runs in a transaction — partial migrations are automatically rolled back on failure.

### Migration history

| # | File | Changes |
|---|---|---|
| 001 | `initial` | Full schema: all 7 tables + ENUMs + basic indexes |
| 002 | `performance_indexes` | `pg_trgm` GIN on product name, composite order indexes, FK indexes |
| 003 | `user_profile` | `user_status` ENUM + `name`, `phone`, `address` on users |

---

## Creating the First Admin

Public signup creates **managers only**. Admin accounts are provisioned via an internal endpoint:

```http
POST https://<your-backend>/api/internal/create-admin
X-Internal-Secret: <INTERNAL_SECRET>
Content-Type: application/json

{
  "email": "admin@yourcompany.com",
  "password": "StrongPassword123"
}
```

Inside the app, an admin can promote any active manager to admin via **User Management → Make Admin**.

---

## Role & Permission Matrix

| Action | Admin | Manager |
|---|---|---|
| Login | Yes | Yes (after admin approval) |
| View dashboard | Yes | Yes |
| View products | Yes | Yes |
| Create / edit product | Yes | No |
| Delete product | Yes | No |
| Change product price | Yes | No |
| Create category | Yes | No |
| Restock product | Yes | Yes |
| Create order | Yes | Yes |
| Update order status | Any → Any | Sequential flow only |
| Cancel order | Any time | Before Shipped only |
| View activity log | Yes | Yes |
| View restock queue | Yes | Yes |
| Approve / reject managers | Yes | No |
| Delete users | Yes (non-admin only) | No |
| Change user roles | Yes | No |
| Internal admin creation | Via secret header | No |

> **Manager order flow:** `Pending → Confirmed → Shipped → Delivered`. Steps cannot be skipped. Backend enforces this independently of the frontend.

---

## API Reference

All endpoints prefixed `/api`. Auth-protected routes require:
```
Authorization: Bearer <JWT>
```

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | Public | Register manager (pending approval) |
| POST | `/auth/login` | Public | Login → JWT + user |

### Products
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/products` | Any | List with `search`, `page`, `limit` |
| POST | `/products` | Admin | Create product |
| PATCH | `/products/:id/restock` | Any | Add stock |
| DELETE | `/products/:id` | Admin | Delete product |

### Categories
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/categories` | Any | List all |
| POST | `/categories` | Admin | Create |

### Orders
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/orders` | Any | List with `status`, `date`, `page` |
| POST | `/orders` | Any | Create (atomic stock deduction) |
| GET | `/orders/:id` | Any | Detail with items |
| PATCH | `/orders/:id/status` | Any | Update status (role-enforced) |

### Restock Queue
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/restock-queue` | Any | Low-stock items by priority |
| DELETE | `/restock-queue/:id` | Any | Remove from queue |

### Dashboard
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/dashboard` | Any | KPIs, per-status counts, product summary, `pending_managers` (admin only) |

### Activity Log
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/activities` | Any | Latest 10 events |

### Admin
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/users` | Admin | List users; `?status=pending\|active\|rejected` |
| PATCH | `/admin/users/:id/approve` | Admin | Approve + send email |
| PATCH | `/admin/users/:id/reject` | Admin | Reject + send email |
| PATCH | `/admin/users/:id/role` | Admin | Change role |
| DELETE | `/admin/users/:id` | Admin | Delete (non-admin only) |

### Internal
| Method | Path | Header | Description |
|---|---|---|---|
| POST | `/internal/create-admin` | `X-Internal-Secret` | Create first admin |

---

## Testing

```bash
npm run test       --workspace=backend   # run all 49 tests
npm run test:watch --workspace=backend   # watch mode
```

All external services (PostgreSQL, Redis, RabbitMQ) are mocked. Tests are isolated and run in-band (`--runInBand`) to avoid shared state between suites.

**Test coverage:**

| Suite | What is tested |
|---|---|
| `01_auth` | Signup, login, JWT validation, pending block, rejected block |
| `02_products` | CRUD, admin-only gates, search, pagination |
| `03_orders` | Create with stock deduction, status transitions |
| `04_stock` | FOR UPDATE clause presence, oversell prevention |
| `05_restock` | Auto-enqueue, manual restock, remove, transaction atomicity |
| `06_conflicts` | Duplicate product in order, inactive product |
| `07_dashboard` | KPI aggregation, all-status counts |
| `08_activity` | Log creation, retrieval |

---

## Deployment

### Live Environment

| Service | Platform | URL |
|---|---|---|
| Frontend | Vercel | https://smart-inventory-management-system-frontend-p4g7f33us.vercel.app |
| Backend API | Railway | https://backend-production-c2e12.up.railway.app |
| Database | Railway PostgreSQL | (private) |
| Cache | Railway Redis | (private) |
| Queue | CloudAMQP | (private) |

### Deploy Backend (Railway)

1. Connect GitHub repo to Railway
2. Set **Root Directory** → `monorepo/backend`
3. Set **Start Command** → `npm run start`
4. Set **Pre-deploy Command** → `node src/db/migrate.js up`
5. Add environment variables (see [Environment Variables](#environment-variables))
6. Add PostgreSQL and Redis plugins — Railway auto-injects `DATABASE_URL` and `REDIS_URL`

### Deploy Frontend (Vercel)

1. Import GitHub repo in Vercel
2. Set **Root Directory** → `monorepo/frontend`
3. Set **Build Command** → `npm run build`
4. Set **Output Directory** → `dist`
5. Add environment variable: `VITE_API_URL=https://backend-production-c2e12.up.railway.app/api`

---

## Production Checklist

- [x] Strong random `JWT_SECRET` (64+ bytes)
- [x] `NODE_ENV=production`
- [x] CORS restricted to frontend domain
- [x] SMTP configured for real email delivery
- [x] `INTERNAL_SECRET` set and not committed to VCS
- [x] DB migrations run on each deploy (Pre-deploy Command)
- [x] gzip compression enabled
- [x] Helmet security headers
- [x] Rate limiting (global + auth-specific)
- [x] Request correlation IDs for traceable logs
- [x] Graceful shutdown on SIGTERM / SIGINT
- [x] `unhandledRejection` + `uncaughtException` handlers
- [x] Connection pool with timeouts (`statement_timeout`, `connectionTimeoutMillis`)
- [x] Redis graceful fallback (serves DB directly if Redis is down)
- [x] RabbitMQ auto-reconnect with exponential backoff
- [ ] Set up log aggregation (e.g. Railway Logs → Datadog / Papertrail)
- [ ] Configure database backups (Railway auto-backups or pg_dump cron)
- [ ] Set `maxmemory-policy allkeys-lru` on Redis for cache-only workloads
- [ ] Add uptime monitoring (e.g. UptimeRobot → `/health` endpoint)

---

## License

MIT

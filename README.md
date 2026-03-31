# Smart Inventory & Order Management System

A full-stack, production-ready web application for managing products, stock levels, customer orders and fulfillment workflows. Built with a clean 4-layer architecture on both frontend and backend, containerised infrastructure, role-based access control, and real-time queue-based event processing.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [Creating the First Admin](#creating-the-first-admin)
- [Role & Permission Matrix](#role--permission-matrix)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Production Checklist](#production-checklist)

---

## Features

| Module | Description |
|---|---|
| **Authentication** | Email + password login, JWT tokens (12h expiry), demo credentials |
| **Manager Signup** | Public registration collects name / phone / address, starts as *pending* |
| **Admin Approval** | Admin approves or rejects managers; email sent via SMTP on each decision |
| **Products & Categories** | CRUD with search (trigram full-text), pagination, stock threshold tracking |
| **Order Management** | Multi-item orders, auto price calculation, status workflow, conflict detection |
| **Stock Handling** | Atomic stock deduction with `SELECT … FOR UPDATE`, auto Out-of-Stock flip |
| **Restock Queue** | Auto-enqueued when stock < threshold, priority sorting, manual restock |
| **Dashboard** | KPI cards + all-status bar chart, low-stock summary, pending manager alert |
| **Activity Log** | Last 10 system events with timestamp |
| **RBAC** | Admin (superpower) vs Manager (business operations) with backend enforcement |
| **Caching** | Redis caches dashboard data (60 s TTL), invalidated on mutation |
| **Message Queue** | RabbitMQ `restock_events` queue with consumer prefetch and auto-reconnect |

---

## Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| UI | React 19 + Vite |
| State | MobX + mobx-react-lite |
| HTTP | Axios |
| Charts | Recharts |
| Icons | Lucide React |

### Backend
| Layer | Technology |
|---|---|
| Server | Node.js 20 + Express |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Queue | RabbitMQ 3 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | Zod |
| Email | Nodemailer (SMTP / console fallback) |
| Testing | Jest + Supertest |

### Infrastructure
| Component | Technology |
|---|---|
| Containerisation | Docker + Docker Compose |
| Security | Helmet, express-rate-limit, CORS |
| Performance | compression (gzip), pg_trgm indexes, connection pooling |
| Observability | Morgan logging, request correlation IDs, graceful shutdown |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (React)                       │
│                                                             │
│   UI Component → Custom Hook → Service → Axios HTTP Client  │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP (REST)
┌────────────────────────────▼────────────────────────────────┐
│                   Express API (port 4000)                    │
│                                                             │
│   Router → Controller → Service → Utils / DB / Cache        │
│                                                             │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│   │ PostgreSQL│  │  Redis   │  │ RabbitMQ │  │  Mailer   │  │
│   │  (data)  │  │ (cache)  │  │ (queue)  │  │  (email)  │  │
│   └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Backend Layers

```
src/
├── features/<feature>/
│   ├── router/       ← Express routes + middleware guards
│   ├── controller/   ← Input validation (Zod), HTTP response shaping
│   └── service/      ← Business logic, DB queries, cache reads/writes
├── middleware/       ← Auth (JWT), role guard, global error handler
├── db/               ← pg Pool, Redis client
├── queue/            ← RabbitMQ connection, consumer, publisher
├── utils/            ← ApiError, mailer, cache invalidation
└── config/env.js     ← Fail-fast env validation
```

### Frontend Layers

```
src/
├── features/<feature>/
│   ├── ui/           ← React component (presentation only)
│   ├── hook/         ← useXxx — local state + service calls
│   ├── service/      ← Data transformation, error unwrapping
│   └── api/          ← Axios calls (one function per endpoint)
├── stores/
│   └── rootStore.js  ← MobX: token, user, active tab
└── shared/api/
    └── httpClient.js ← Axios instance with Authorization header
```

---

## Project Structure

```
monorepo/
├── frontend/                   # React/Vite application (no Docker)
│   ├── src/
│   │   ├── features/           # auth | dashboard | products | orders
│   │   │                       # restock | activity | admin
│   │   ├── stores/
│   │   └── shared/
│   └── package.json
│
├── backend/                    # Express API (runs in Docker)
│   ├── src/
│   │   ├── features/           # auth | category | product | order
│   │   │                       # restock | dashboard | activity | admin | internal
│   │   ├── db/                 # postgres.js · redis.js
│   │   ├── queue/              # rabbitmq.js · consumer.js
│   │   ├── middleware/         # authMiddleware · roleMiddleware · errorMiddleware
│   │   ├── utils/              # apiError · mailer · cache
│   │   └── config/env.js
│   ├── sql/
│   │   ├── schema.sql          # Full schema (used by Docker initdb)
│   │   ├── seed.sql            # Demo user credentials
│   │   └── migrations/        # Numbered up/down SQL migrations
│   ├── src/__tests__/          # Jest + Supertest test suites
│   ├── .env.example
│   └── Dockerfile
│
├── docker-compose.yml          # backend · postgres · redis · rabbitmq
└── package.json                # npm workspaces root
```

---

## Getting Started

### Prerequisites

- **Node.js** v20+
- **Docker Desktop** (for backend services)
- **npm** v9+

### 1 — Clone and install dependencies

```bash
git clone https://github.com/shafin90/smart-inventory-management-system.git
cd smart-inventory-management-system/monorepo

npm install          # installs both workspaces (frontend + backend)
```

### 2 — Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your local values (see [Environment Variables](#environment-variables)).

For Docker the app uses `backend/.env.docker` (not committed — create from the example):

```bash
cp backend/.env.example backend/.env.docker
# Update DATABASE_URL, REDIS_URL, RABBITMQ_URL to use Docker service names:
#   postgres://postgres:postgres@postgres:5432/inventory_db
#   redis://redis:6379
#   amqp://rabbitmq:5672
```

### 3 — Start backend services

```bash
# From monorepo/ root
docker-compose up --build -d
```

This starts four containers:

| Container | Service | Port |
|---|---|---|
| `inventory-backend` | Express API | 4000 |
| `inventory-postgres` | PostgreSQL 16 | 5432 |
| `inventory-redis` | Redis 7 | 6379 |
| `inventory-rabbitmq` | RabbitMQ 3 | 5672 / 15672 (management UI) |

On first launch PostgreSQL runs `backend/sql/schema.sql` and `backend/sql/seed.sql` automatically.

### 4 — Start the frontend

```bash
npm run dev --workspace=frontend
# or
cd frontend && npm run dev
```

Open **http://localhost:5173** in your browser.

### Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | demo@inventory.com | password123 |
| Manager | manager@demo.com | password123 |

---

## Environment Variables

### `backend/.env` (local) / `backend/.env.docker` (Docker)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `4000` | Express server port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `JWT_SECRET` | **Yes** | — | Random 64-byte hex string. Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `DB_POOL_MAX` | No | `20` | Max DB connections in pool |
| `DB_POOL_MIN` | No | `2` | Min idle DB connections |
| `REDIS_URL` | **Yes** | — | Redis connection string |
| `RABBITMQ_URL` | **Yes** | — | RabbitMQ AMQP URL |
| `CORS_ORIGIN` | No | `*` | Comma-separated allowed origins e.g. `https://app.example.com` |
| `SMTP_HOST` | No | — | SMTP server hostname (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_SECURE` | No | `false` | `true` for port 465 (SSL) |
| `SMTP_USER` | No | — | SMTP login username |
| `SMTP_PASS` | No | — | SMTP password / app password |
| `SMTP_FROM` | No | — | From address e.g. `Inventory OS <noreply@example.com>` |
| `INTERNAL_SECRET` | No | — | Secret header value for `POST /api/internal/create-admin` |

> **Note:** If `SMTP_HOST` is not set, approval/rejection emails are printed to the console instead of sent. Set it in production.

---

## Database Migrations

Migrations live in `backend/sql/migrations/` as numbered `<N>_name.up.sql` / `<N>_name.down.sql` pairs. A `schema_migrations` table tracks applied versions.

```bash
# Run all pending migrations
npm run db:migrate --workspace=backend

# Roll back the latest migration
npm run db:rollback --workspace=backend

# Show migration status
npm run db:status --workspace=backend
```

### Applying migrations to a running Docker container

```bash
docker cp backend/sql/migrations/003_user_profile.up.sql inventory-postgres:/tmp/
docker exec inventory-postgres psql -U postgres -d inventory_db -f /tmp/003_user_profile.up.sql
```

### Migration history

| # | Name | Description |
|---|---|---|
| 001 | `initial` | Full schema: users, categories, products, orders, order_items, restock_queue, activity_logs |
| 002 | `performance_indexes` | `pg_trgm` GIN index for product search, composite and FK indexes |
| 003 | `user_profile` | `user_status` enum, `name` / `phone` / `address` columns on users |

---

## Creating the First Admin

Admin accounts are **never** created via the public signup form. Use the internal endpoint from Postman or any HTTP client:

```
POST http://localhost:4000/api/internal/create-admin
X-Internal-Secret: <value of INTERNAL_SECRET in .env.docker>
Content-Type: application/json

{
  "email": "admin@yourcompany.com",
  "password": "StrongPassword123"
}
```

The account is created with `role=admin` and `status=active` immediately.

Inside the app an admin can promote any active manager to admin via **User Management → Make Admin**.

---

## Role & Permission Matrix

| Action | Admin | Manager |
|---|---|---|
| Login | Yes | Yes (after approval) |
| View dashboard | Yes | Yes |
| View products | Yes | Yes |
| Add / edit product | Yes | No |
| Delete product | Yes | No |
| Change product price | Yes | No |
| Add category | Yes | No |
| Restock product | Yes | Yes |
| Create order | Yes | Yes |
| Update order status | Any status | Sequential flow only* |
| Cancel order | Any time | Before Shipped only |
| View activity log | Yes | Yes |
| View restock queue | Yes | Yes |
| Manage users (approve / reject / delete) | Yes | No |
| Change user roles | Yes | No |
| Access internal API | Via secret header | No |

> **Manager order status flow:** `Pending → Confirmed → Shipped → Delivered`
> Steps cannot be skipped. Cancellation is blocked once the order is Shipped.

---

## API Reference

All endpoints are prefixed `/api`. Protected routes require:
```
Authorization: Bearer <JWT>
```

### Auth
| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/auth/signup` | Public | Register a new manager (pending approval) |
| `POST` | `/auth/login` | Public | Login, returns JWT + user object |

### Products
| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/products` | Auth | List products with search, page, limit |
| `POST` | `/products` | Admin | Create product |
| `PATCH` | `/products/:id/restock` | Auth | Add stock quantity |
| `DELETE` | `/products/:id` | Admin | Delete product |

### Categories
| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/categories` | Auth | List all categories |
| `POST` | `/categories` | Admin | Create category |

### Orders
| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/orders` | Auth | List orders with status/date filters, pagination |
| `POST` | `/orders` | Auth | Create order (atomic stock deduction) |
| `GET` | `/orders/:id` | Auth | Order detail with items |
| `PATCH` | `/orders/:id/status` | Auth | Update order status (role-enforced) |

### Restock Queue
| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/restock-queue` | Auth | List low-stock items by priority |
| `DELETE` | `/restock-queue/:id` | Auth | Remove item from queue |

### Dashboard
| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/dashboard` | Auth | KPIs, per-status counts, product summary. Admin also sees `pending_managers`. |

### Activity Log
| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/activities` | Auth | Latest 10 system events |

### Admin — User Management
| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/admin/users` | Admin | List users; filter by `status` query param |
| `PATCH` | `/admin/users/:id/approve` | Admin | Approve manager (sends email) |
| `PATCH` | `/admin/users/:id/reject` | Admin | Reject manager (sends email) |
| `PATCH` | `/admin/users/:id/role` | Admin | Change role (`admin` / `manager`) |
| `DELETE` | `/admin/users/:id` | Admin | Delete user (non-admin only) |

### Internal (Postman / CLI only)
| Method | Path | Header | Description |
|---|---|---|---|
| `POST` | `/internal/create-admin` | `X-Internal-Secret` | Create first admin account |

---

## Testing

```bash
# Run all tests
npm run test --workspace=backend

# Watch mode
npm run test:watch --workspace=backend
```

Tests use **Jest + Supertest** with all external services mocked (PostgreSQL, Redis, RabbitMQ). There are 49 tests covering:

- Authentication (signup, login, token validation)
- Products (CRUD, restock, search, pagination)
- Orders (create, status flow, stock deduction)
- Stock concurrency (FOR UPDATE presence assertion)
- Restock queue (auto-enqueue, manual restock, remove)
- Conflict detection (duplicate items, inactive products)
- Dashboard (KPI aggregation)
- Activity log

---

## Production Checklist

- [ ] Set a strong random `JWT_SECRET` (64+ bytes)
- [ ] Set `NODE_ENV=production`
- [ ] Set `CORS_ORIGIN` to your frontend domain (not `*`)
- [ ] Configure `SMTP_*` variables for real email delivery
- [ ] Set `INTERNAL_SECRET` and keep it out of version control
- [ ] Run `npm run db:migrate` after each deployment
- [ ] Place the API behind a reverse proxy (nginx / Caddy) with TLS
- [ ] Set resource limits and replicas in your container orchestration (Docker Swarm / Kubernetes)
- [ ] Configure a log aggregation service (e.g. Loki, Datadog) to capture Morgan + error logs
- [ ] Set up database backups for the `postgres_data` volume
- [ ] Enable RabbitMQ management credentials (do not use default guest/guest in prod)
- [ ] Monitor Redis memory usage and set `maxmemory-policy allkeys-lru` for caching workloads

---

## License

MIT

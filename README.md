# Smart Inventory & Order Management System

Feature-based monorepo with:
- `frontend`: React + MobX (`UI -> hook -> service -> API`)
- `backend`: Express + PostgreSQL + Redis + RabbitMQ (`router -> controller -> service -> utils`)

## Run with Docker (backend + infra)

```bash
docker compose up --build
```

Backend API: `http://localhost:4000`

## Run frontend locally

```bash
cd frontend
npm install
npm run dev
```

Set frontend API url in `.env`:

```bash
VITE_API_URL=http://localhost:4000/api
```

## Initialize Database

Run SQL from `backend/sql/schema.sql` against PostgreSQL.

## Demo Login

- Email: `demo@inventory.com`
- Password: `password123`

Create this user first via signup endpoint or insert manually.

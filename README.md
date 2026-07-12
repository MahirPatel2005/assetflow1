# AssetFlow

Enterprise Asset & Resource Management System — React (Vite + TS) + Node/Express (TS) + PostgreSQL + Redis + JWT.

## Stack
- **Frontend:** React 18, Vite, TypeScript, React Router, TanStack Query, Zustand, Tailwind CSS, Axios, Recharts
- **Backend:** Node 20, Express, TypeScript, Zod, bcrypt, jsonwebtoken, pg, ioredis, multer
- **DB:** PostgreSQL 16
- **Cache/Locks:** Redis 7

## Quick start (Docker)

```bash
docker compose up --build
```
- API: http://localhost:3000
- Web: http://localhost:5173
- Postgres: localhost:5432
- Redis: localhost:6379

## Manual setup

### 1. Database
```bash
createdb assetflow
psql assetflow < server/src/db/schema.sql
psql assetflow < server/src/db/seed.sql
```

### 2. Backend
```bash
cd server
cp .env.example .env   # fill in DB/Redis/JWT values
npm install
npm run dev             # http://localhost:3000
```

### 3. Frontend
```bash
cd client
cp .env.example .env
npm install
npm run dev              # http://localhost:5173
```

## Default seeded accounts (password: `Passw0rd!`)
| Role | Email |
|---|---|
| Admin | admin@assetflow.io |
| Asset Manager | manager@assetflow.io |
| Department Head | head@assetflow.io |
| Employee | employee@assetflow.io |

## What's implemented (MVP "Must Have")
- JWT auth (access + refresh) with bcrypt hashing, employee-only signup, admin-only role promotion
- Role-based middleware (Admin / Asset Manager / Department Head / Employee)
- Departments, asset categories, employee directory
- Asset registration, search/filter, lifecycle status
- Allocation with Redis distributed lock (prevents double-allocation) + Postgres transaction
- Return flow
- Transfer request → approve/reject
- Resource booking with overlap validation (DB-level `tstzrange` exclusion + application check)
- Maintenance request → approve/reject → resolve
- Dashboard KPI aggregation endpoint + cached in Redis (60s TTL)
- Activity log middleware on all mutating routes
- Centralized error handling & Zod validation on every input boundary

Audits, notifications delivery workers, QR codes, and report exports are scaffolded (routes/tables exist) as extension points — see `## Next steps` below.

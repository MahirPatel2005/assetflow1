# AssetFlow

> **Enterprise Asset & Resource Management System** — A full-stack application for tracking, allocating, maintaining, and auditing company assets across departments, with integrated AI-powered agents.

---

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, React Router, Zustand, Axios, Recharts, Tailwind CSS |
| **Backend** | Node 20, Express, TypeScript, Zod, pg, ioredis, bcrypt, jsonwebtoken |
| **AI Service** | Python 3.11, FastAPI, google-genai (Gemini 2.5 Flash), psycopg2 |
| **Database** | PostgreSQL 16 |
| **Cache / Locks** | Redis 7 |
| **Containerization** | Docker & Docker Compose |

---

## ✨ Features

### 🔐 Authentication & Role Management
- JWT authentication with access + refresh token rotation
- bcrypt password hashing
- Employee self-signup (admin approves role promotions)
- Four roles with distinct permission scopes:
  - **Admin** — full system access
  - **Asset Manager** — manage assets, approve transfers and maintenance
  - **Department Head** — manage department bookings, approve dept transfers
  - **Employee** — view own assets, request transfers, raise maintenance tickets

---

### 🏢 Organisation Setup
- Create, edit, and delete **Departments**
- Create, edit, and delete **Asset Categories**
- View employee directory scoped to department/role

---

### 📦 Asset Management
- Register assets with metadata (name, tag, category, condition, purchase info, location)
- Search and filter assets by category, status, or condition
- Full asset lifecycle tracking: `available → allocated → under maintenance → retired`
- Role-scoped asset visibility (employees only see their own assigned assets)

---

### 🔄 Allocation & Transfer
- **Asset Allocations** tab — view all allocated and unallocated assets; admins/managers can allocate or return assets
- **Peer Transfers** tab — employees can request transfers to colleagues; managers/admins approve or reject
- Redis distributed lock prevents double-allocation race conditions
- Full allocation history per asset

---

### 📅 Resource Booking
- Book shared bookable assets (e.g. conference rooms, shared laptops) for a specific time slot
- Overlap validation at both DB-level (`tstzrange` exclusion) and application level
- Department Heads can book on behalf of their department
- Cancel or reschedule existing bookings (role-scoped)

---

### 🔧 Maintenance
- Employees raise maintenance requests with priority (low / medium / high / critical)
- Managers approve, assign, and resolve requests
- Full request history per asset
- **AI-powered Predictive Maintenance** — AI analyses asset conditions and maintenance history to flag anomalies and generate a risk report

---

### 📋 Audits
- Create audit sessions for specific departments or all assets
- Add individual audit items; mark each as **Verified**, **Missing**, or **Damaged**
- Full audit detail view with verification counts
- **Smart Inventory Auditor** — AI agent analyses audit results, highlights anomalies (e.g. clusters of missing items in a single room), and generates a structured risk report in Markdown

---

### 📊 Reports & Analytics
- Dashboard with KPI metrics (total assets, allocated, under maintenance, bookings) — cached in Redis (60s TTL)
- Role-scoped metrics (employees see their own data, managers see company-wide data)
- Visual charts for asset distribution by category, maintenance trends, and booking patterns (via Recharts)
- Export-ready report summaries

---

### 🔔 Notifications
- In-app notification system for transfer approvals/rejections, maintenance updates, and audit completions
- Mark notifications as read; badge count in sidebar

---

### 🤖 AI Agents (Powered by Gemini 2.5 Flash)

#### 💬 AI Asset Assistant (Chat)
- A conversational chatbot accessible from the sidebar for all roles
- Natural language interactions — ask about your assets, book resources, request transfers, or raise maintenance tickets
- Tool-equipped: `list_my_assets`, `request_transfer`, `book_resource`, `raise_maintenance_request`
- Example prompts:
  - *"What assets do I currently hold?"*
  - *"Book the conference room for tomorrow 2–4 PM"*
  - *"Transfer my Dell laptop to John"*
  - *"Report damage on my laptop"*

#### 🔮 Predictive Maintenance Agent
- Admins/Managers can trigger a full AI analysis of asset conditions and repair logs
- Flags high-frequency failure patterns, recurring issues, and priority spikes
- Generates a Markdown report with risk ranking and proactive recommendations

#### 🕵️ Smart Inventory Auditor
- Available on any open audit record
- AI reviews the audit checklist — verified vs. missing vs. damaged items
- Detects anomaly clusters (e.g., all missing assets from the same location)
- Flags theft/structural risks and generates a professional Markdown audit report

---

## 🚀 How to Run

### Prerequisites
- [Docker](https://www.docker.com/get-started) & Docker Compose installed
- A **Gemini API key** — get one free at [https://aistudio.google.com/app/api-keys](https://aistudio.google.com/app/api-keys)

---

### 1. Clone the Repository

```bash
git clone https://github.com/MahirPatel2005/assetflow1.git
cd assetflow1
```

---

### 2. Set up Environment Variables

Create a `.env` file in the project root:

```bash
# .env
GEMINI_API_KEY=your_gemini_api_key_here
```

> **Note:** The `.env` file is gitignored. Never commit your API key.

---

### 3. Start with Docker Compose

```bash
docker compose up --build
```

This spins up **5 services**:

| Service | URL | Description |
|---|---|---|
| `client` | http://localhost:5173 | React frontend |
| `server` | http://localhost:3000 | Express API |
| `ai-service` | http://localhost:8000 | Python AI microservice |
| `postgres` | localhost:5435 | PostgreSQL database |
| `redis` | localhost:6380 | Redis cache |

The database is automatically seeded with demo data on first run.

---

### 4. Log In

Use these pre-seeded accounts (password: **`Passw0rd!`**):

| Role | Email |
|---|---|
| 👑 Admin | admin@assetflow.io |
| 🗂 Asset Manager | manager@assetflow.io |
| 🏢 Department Head | head@assetflow.io |
| 👤 Employee | employee@assetflow.io |

---

### Manual Setup (without Docker)

#### Database
```bash
createdb assetflow
psql assetflow < server/src/db/schema.sql
psql assetflow < server/src/db/seed.sql
```

#### Backend
```bash
cd server
npm install
# Create a .env with DATABASE_URL, REDIS_URL, JWT secrets, AI_SERVICE_URL
npm run dev        # http://localhost:3000
```

#### Frontend
```bash
cd client
npm install
npm run dev        # http://localhost:5173
```

#### AI Service
```bash
cd ai-service
pip install -r requirements.txt
# Export GEMINI_API_KEY and DATABASE_URL
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 📁 Project Structure

```
assetflow/
├── client/              # React + Vite frontend
│   └── src/
│       ├── features/    # Page components per domain
│       │   ├── ai/          # AI Assistant chat page
│       │   ├── assets/      # Asset list & detail pages
│       │   ├── allocations/ # Allocation & transfer tabs
│       │   ├── bookings/    # Resource booking page
│       │   ├── maintenance/ # Maintenance requests page
│       │   ├── audits/      # Audits page with smart auditor
│       │   ├── reports/     # Reports & charts page
│       │   ├── departments/ # Org Setup page
│       │   ├── dashboard/   # KPI dashboard
│       │   └── notifications/
│       ├── components/  # Shared UI components
│       ├── services/    # API client functions
│       └── store/       # Zustand auth store
│
├── server/              # Express + TypeScript API
│   └── src/
│       ├── controllers/ # Route handlers
│       ├── services/    # Business logic layer
│       ├── routes/      # Express router definitions
│       ├── validators/  # Zod schemas
│       ├── middleware/  # Auth, roles, error handler, activity logger
│       └── db/          # schema.sql, seed.sql, db pool config
│
├── ai-service/          # Python FastAPI AI microservice
│   ├── agents/
│   │   ├── asset_assistant.py    # Chat agent with tools
│   │   ├── maintenance_agent.py  # Predictive maintenance agent
│   │   └── audit_agent.py        # Smart inventory auditor
│   ├── main.py          # FastAPI app & endpoints
│   └── requirements.txt
│
├── docker-compose.yml   # Full stack orchestration
└── .env                 # GEMINI_API_KEY (not committed)
```

---

## 🔑 Key Architecture Decisions

- **Redis distributed locks** on asset allocation prevent double-allocation under concurrent requests
- **Role-scoped queries** — every service layer filters data based on the authenticated user's role
- **AI microservice isolation** — the Python AI service runs independently, querying Postgres directly and called via HTTP proxy from the Node backend
- **Refresh token rotation** — tokens stored securely, rotated on every refresh call

---

## 📝 License

MIT

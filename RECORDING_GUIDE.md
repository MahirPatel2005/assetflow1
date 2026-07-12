# 🎬 AssetFlow — Video Recording Guide
> Step-by-step script for recording a full product demo showcasing all user roles, features, and AI capabilities.

---

## 📋 Prerequisites Before Recording

### App Must Be Running
```bash
cd /path/to/assetflow
docker compose up -d
```
Open **http://localhost:5173** in your browser.

### Accounts to Use (Password: `Passw0rd!`)

| Role | Email | What They See |
|---|---|---|
| **Admin** | admin@assetflow.io | Everything, full control |
| **AssetManager** | manager@assetflow.io | All assets, allocations, maintenance |
| **DepartmentHead** | head@assetflow.io | Dept-scoped data, approve transfers |
| **Employee** | employee@assetflow.io | Only their own assigned assets |

### Recommended Recording Setup
- **Screen recorder**: OBS Studio, Loom, or QuickTime
- **Resolution**: 1920×1080 (Full HD)
- **Browser zoom**: 90% for best fit
- **Duration target**: ~8–12 min total

---

## 🎬 Recording Script

### SCENE 1 — Introduction (30 sec)
- Navigate to `http://localhost:5173/login`
- Say: *"AssetFlow — a full-stack enterprise asset management platform with role-based access and AI features."*

---

### SCENE 2 — Admin Role (3–4 min)
> Login: admin@assetflow.io | Passw0rd!

**2a. Dashboard** — Show KPI cards (Total Assets, Allocated, Bookings, Transfers, Maintenance)

**2b. Asset Management**
- Show full asset list (all 6 assets visible)
- Allocate an asset to Priya Sharma
- Show filters (status, category, condition)

**2c. Allocation & Transfer**
- Asset Allocations tab → Return an asset
- Peer Transfers tab → Approve or reject a transfer request

**2d. Resource Booking**
- Book Meeting Room (AF-0003) for a future time slot

**2e. Maintenance**
- Show maintenance requests list
- Click **Run AI Analysis** → wait for Predictive Maintenance AI report

**2f. Audits**
- Create a new audit
- Mark items as Damaged / Missing
- Click **Run Smart Auditor AI** → show anomaly report with markdown rendering

**2g. Reports** — Show valuation chart and category breakdown

**2h. Org Setup**
- Edit a category name
- Delete a department (with confirmation)

**2i. Notifications** — Show unread events, mark all as read

---

### SCENE 3 — AssetManager Role (1.5 min)
> Log out → Login: manager@assetflow.io | Passw0rd!

- Dashboard with all-asset KPIs
- Full asset list visible (all 6)
- Create a maintenance request for an asset
- Note: *"No Org Setup or delete-department access"*

---

### SCENE 4 — Department Head Role (1.5 min)
> Log out → Login: head@assetflow.io | Passw0rd!

- Dashboard scoped to IT department
- Peer Transfers tab → Approve a team member's transfer request
- Book a resource on behalf of the department

---

### SCENE 5 — Employee Role (1.5 min)
> Log out → Login: employee@assetflow.io | Passw0rd!

- Dashboard shows only personal assets (2 assets, not 6)
- Assets page → only sees AF-0001 and AF-0006
- Asset detail → no Allocate/Return button; **Request Transfer** only
- Submit a transfer request
- **AI Assistant** → ask "List assets currently assigned to me"
- AI Assistant → "Report screen damage on AF-0001, High priority" → ticket created

---

### SCENE 6 — AI Assistant Showcase (2 min)
> AI Assistant page (any role)

1. **List Assets chip** → AI returns formatted asset list
2. Type: *"Report a screen damage issue on AF-0001 with High priority"* → maintenance ticket created
3. Type: *"Book AF-0003 from 2026-07-20T10:00 to 2026-07-20T12:00"* → booking confirmed
4. Type: *"Transfer AF-0006 to user 5 because switching teams"* → transfer request created

Show the **markdown rendering** — tables and bullet points render cleanly, not raw `**` characters.

---

### SCENE 7 — Closing (30 sec)
- Summarize all roles and key AI features
- End on dashboard

---

## ✅ Role Verification Results (API-Tested)

| Role | Login | Assets Visible | KPIs Scoped |
|---|---|---|---|
| **Admin** | ✅ Works | All 6 assets | Global (6 available, 1 allocated) |
| **AssetManager** | ✅ Works | All 6 assets | All assets |
| **DepartmentHead** | ✅ Works | Dept assets | Dept-scoped (1 available) |
| **Employee** | ✅ Works | Own 2 only | Personal (1 available, 1 allocated) |

---

## 🔐 All Credentials

```
Admin:          admin@assetflow.io       / Passw0rd!
AssetManager:   manager@assetflow.io     / Passw0rd!
DepartmentHead: head@assetflow.io        / Passw0rd!
Employee:       employee@assetflow.io    / Passw0rd!
Employee 2:     raj@assetflow.io         / Passw0rd!
```

---

## 🗂 Feature Checklist

- [ ] Admin: Dashboard KPIs, full asset list, allocate/return
- [ ] Admin: Approve/reject transfer request
- [ ] Admin: Create booking
- [ ] Admin: AI Predictive Maintenance report
- [ ] Admin: AI Smart Audit report with markdown rendering
- [ ] Admin: Reports chart
- [ ] Admin: Org Setup edit/delete + Notifications
- [ ] AssetManager: Full asset visibility, raise maintenance
- [ ] DepartmentHead: Dept-scoped dashboard, approve transfer, book for dept
- [ ] Employee: Only own assets visible, no allocate button, request transfer
- [ ] Employee: AI Assistant — list / report / book / transfer via natural language

---

## 🎨 Recording Tips

1. Slow down on AI sections — let the loading animation play
2. Use suggestion chips first — they look polished
3. Show sidebar transitions and active link highlights
4. Zoom in on AI responses so markdown tables are readable
5. Keep narration calm: describe what each role *can't* do as well as what it can

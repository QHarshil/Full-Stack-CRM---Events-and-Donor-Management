# BC Cancer Foundation - Donor Management CRM Industry Project

Full-stack donor engagement platform with event management, multi-criteria donor matching, and audit logging. NestJS backend with React dashboard.

## Features

- **Donor matching** — Weighted scoring across interests, geography, donation history, recency, and capacity with explainable breakdowns
- **Event management** — Create/track events, invitations, attendance, and fundraising progress
- **Audit trail** — All mutations logged with actor, entity metadata, before/after diffs, and IP signatures
- **Analytics dashboards** — Donor segmentation, geographic distribution, gift velocity, engagement channels
- **RBAC** — Role-based access control with guards across the stack

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                  Frontend (React + Vite)                    │
│   Dashboard │ Donor Directory │ Events │ Admin Console     │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│                   Backend (NestJS)                          │
│  Auth │ Admin │ Events │ Donors │ Analytics │ AuditTrail   │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│                 Database (TypeORM)                          │
│   User │ Donor │ Event │ EventDonor │ AuditLog             │
└────────────────────────────────────────────────────────────┘
```

| Layer | Stack |
|-------|-------|
| Frontend | React 18, Vite, Tailwind, shadcn/ui |
| Backend | NestJS, TypeScript, TypeORM |
| Database | SQLite (dev), PostgreSQL/MySQL (prod) |
| Auth | Session cookies, RBAC guards |

## Quick Start

```bash
# Backend
cd backend
npm install
npm run build
npm start
# API: http://localhost:3001
# Docs: http://localhost:3001/api/docs

# Frontend (separate terminal)
cd frontend
npm install --legacy-peer-deps
npm run dev
# UI: http://localhost:3000
```

Seeder populates 500 donors, sample events, and audit history on first boot.

## Demo Credentials

| Role | Login |
|------|-------|
| Admin | `admin / password123` |
| Manager | `manager / password123` |
| Staff | `staff / password123` |

## API

| Endpoint | Description |
|----------|-------------|
| `POST /auth/signin` | Login |
| `GET /auth/whoami` | Current session |
| `GET /donors` | Donor directory |
| `GET /events` | Event list |
| `GET /analytics/*` | Dashboard metrics |
| `GET /admin/audit-logs` | Audit trail (admin only) |
| `/api/docs` | Swagger UI |

**Audit logs query params:** `page`, `limit`, `action`, `entityType`, `userId`, `startDate`, `endDate`

## Donor Matching

Weighted multi-criteria scoring:

| Factor | Weight |
|--------|--------|
| Interest alignment | Configurable |
| Geographic proximity | Configurable |
| Donation history | Configurable |
| Recency | Configurable |
| Engagement level | Configurable |
| Capacity | Configurable |

Returns ranked donor list with per-factor score breakdown.

## Audit Trail

All administrative mutations logged to `audit_logs`:
- Actor ID and role
- Entity type and ID
- Action performed
- Before/after state diffs
- Sanitized request payload
- IP address and timestamp

Queryable via API and filterable in Admin UI with CSV/JSON export.

## Testing

```bash
cd backend && npm test
cd frontend && npm run test
```

CI runs on every push via GitHub Actions.

## License

MIT

# User Management System

Fullstack reference app: Express + JWT + MongoDB (profiles) + PostgreSQL (auth/audit) + React/TS + Docker + K8s + Terraform + CI.

## Quick Start (Local)
- Windows PowerShell helper: `powershell -ExecutionPolicy Bypass -File .\run.ps1 up`
- Classic Compose: `docker compose -f infrastructure/docker-compose.yml up -d`
- Copy `backend/.env.example` to `backend/.env` and update `ADMIN_INVITE_SECRET`, `JWT_SECRET`, and database URIs as needed.
- `cd backend && npm run dev`
- `cd ../frontend && npm run dev`
- Swagger: http://localhost:4000/docs
- Frontend: http://localhost:5173

## run.ps1 helper
Available commands (run from repo root):
- `./run.ps1 up` - build/start containers and run Prisma migrations with retries.
- `./run.ps1 restart` - rebuild images (if needed) and restart backend/frontend.
- `./run.ps1 down` - stop and remove containers (volumes preserved).
- `./run.ps1 logs` - tail backend logs (Ctrl+C to exit).
- `./run.ps1 ps` - show container status.
- `./run.ps1 seed` - execute `backend/scripts/seed.js` inside the backend container to create demo admin/user accounts.

Notes:
- Use PowerShell Core (`pwsh`) or Windows PowerShell (`powershell -ExecutionPolicy Bypass -File .\run.ps1 up`).
- The script auto-detects `docker compose` vs `docker-compose` and prints endpoint URLs on success.

## Backend Setup
1. cd backend
2. npm install (already run during scaffolding)
3. npm run prisma:generate
4. Ensure `.env` defines `ADMIN_INVITE_SECRET` for privileged registrations.
5. npm run dev to start the API (requires Postgres and Mongo running).

## Frontend Setup
1. cd frontend
2. npm install (already run during scaffolding)
3. npm run dev to start the Vite dev server.

## Admin Accounts
- The registration form allows selecting **Administrator**; provide the same `ADMIN_INVITE_SECRET` configured on the backend when prompted.
- Requests that fail validation or privilege checks return JSON errors with `message`, `reason`, `status`, `details`, and `stack` fields so the UI can surface complete diagnostics.

## Tests
**Backend (Jest + Supertest):**
- `cd backend`
- Start Postgres and Mongo (e.g., `./run.ps1 up` or docker compose).
- Run API suite with verbose logs: `npm test -- --runInBand --verbose`

**Frontend (Vitest + RTL):**
- Watch mode for local dev: `cd frontend && npm run test:watch`
- Single-run/CI reporter: `cd frontend && npm run test:ci`

## Database Schema
- **PostgreSQL (Prisma):** `UserAuth` table stores credentials, roles, timestamps; `AuditLog` captures user actions with optional IP/user-agent metadata.
- **MongoDB (Mongoose):** `UserProfile` collection mirrors the auth UUID `_id` and keeps display name, email, and preference document (`theme`, `language`).
- Cross-database consistency is maintained by creating both records inside the register flow and rolling back the SQL row if Mongo persistence fails.

## Deployment Guide
1. **Local Compose:** `docker compose -f infrastructure/docker-compose.yml up -d --build` builds containers, starts Postgres, Mongo, backend, and frontend.
2. **Kubernetes:** apply `infrastructure/kubernetes/namespace.yaml`, create the `ums-secrets` secret with JWT/database credentials (including `ADMIN_INVITE_SECRET`), then apply the backend/frontend deployment and service manifests.
3. **Terraform:** `cd infrastructure/terraform && terraform init && terraform apply` provisions AWS S3 for logs and ECR repositories for container pushes.
4. **Helm:** choose an environment file (e.g., `values-dev.yaml` or `values-prod.yaml`) and deploy with `helm upgrade --install ums infrastructure/helm/ums -f infrastructure/helm/ums/values.yaml -f infrastructure/helm/ums/values-dev.yaml`.
5. **CI/CD:** `.github/workflows/ci.yml` runs backend migrations/tests against containerized Postgres/Mongo and builds the frontend on every push/PR to `main`.

## Infrastructure Notes
- Docker Compose bundles Postgres, Mongo, backend, and frontend (infrastructure/docker-compose.yml).
- Kubernetes manifests under infrastructure/kubernetes expect a secret named ums-secrets.
- Terraform (infrastructure/terraform) provisions AWS S3 and ECR repositories.

## API Docs
- Swagger UI: http://localhost:4000/docs
- Markdown summary in docs/api/openapi.md


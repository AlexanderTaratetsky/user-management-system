# UMS API Reference

- POST /auth/register — body `{name,email,password,role?,adminSecret?}` ? `{token,role}`
- POST /auth/login — body `{email,password}` ? `{token,role}`
- GET /me (JWT) — returns profile with `role`, `preferences`
- PUT /me (JWT) — body `{name?,email?,preferences?}` updates profile and login email
- DELETE /me (JWT) — deletes Mongo profile and PostgreSQL credential
- GET /admin/users (JWT admin) — returns array of profiles including `role`
- GET /health — service heartbeat
- GET /metrics — Prometheus metrics (requires ENABLE_METRICS=true)
- Swagger UI available at `/docs`
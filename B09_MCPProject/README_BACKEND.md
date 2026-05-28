# Backend Startup Guide (Cloud Nacos / Redis / MySQL)

> Backend services are already deployed in the cloud. You can use the system by starting the frontend only.
>
> If you need to run backend services locally, follow this guide.

This guide explains how to start backend services using cloud middleware only:

- Nacos (remote)
- Redis (remote)
- MySQL (remote)

Do not start local Nacos, Redis, or MySQL.

---

## 1. Prerequisites

- Docker Desktop (or any working Docker Engine) is installed and running.
- You can access your cloud endpoints for:
  - Nacos
  - Redis
  - MySQL

---

## 2. Configure Environment Variables

Run in the project root `B09_MCPProject`:

1. Copy template file:

```bash
cp .env.example .env
```

2. Edit `.env` and verify at least the following keys:

- `NACOS_SERVER_ADDR`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `DB_USERNAME`
- `DB_PASSWORD`
- `USER_DB_URL`
- `ORG_DB_URL`
- `MENTORING_DB_URL`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`

> Note: `GATEWAY_USER_SERVICE_URI` defaults to `http://user-service:8081` and usually does not need to be changed.

---

## 3. Build Backend Images

In `B09_MCPProject`:

```bash
docker compose build
```

If your network is unstable, build services one by one:

```bash
docker compose build user-service
docker compose build organizational-service
docker compose build mentoring-service
docker compose build gateway
```

---

## 4. Start Backend Services

```bash
docker compose up -d
```

Check status:

```bash
docker compose ps
```

Check logs:

```bash
docker compose logs -f gateway
docker compose logs -f user-service
docker compose logs -f organizational-service
docker compose logs -f mentoring-service
```

---

## 5. Service Ports

- Gateway: `8080`
- User-Service: `8081`
- Organizational-Service: `8083`
- Mentoring-Service: `8084`

---

## 6. Troubleshooting

### 6.1 Docker daemon is not running

Error example:

`Cannot connect to the Docker daemon ...`

Fix:

- Start Docker Desktop and try again.
- Run `docker info` to verify the engine is available.

### 6.2 Maven dependency handshake failure

Error contains:

`Remote host terminated the handshake`

Fix:

- This is usually a transient network/TLS issue while downloading dependencies.
- Re-run the build, preferably service-by-service.


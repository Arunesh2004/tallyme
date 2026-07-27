# Docker Deployment Report

## Container Architecture
A multi-stage `Dockerfile` has been authored to isolate compile-time typescript dependencies from the production runner. A corresponding `docker-compose.yml` mounts the required services (`backend`, `postgres`, `redis`).

## Specifications
- **PostgreSQL**: Bound to a persistent volume `tallyme-pgdata` with a 10s health check interval.
- **Redis**: Booted with `--appendonly yes` bound to `tallyme-redisdata` to ensure BullMQ queue job persistence across container reboots.
- **Backend**: Injects `NODE_ENV=production` natively, mapping internal port `3000`. Storage is explicitly mounted to `tallyme-uploads` to secure OCR file processing.

## Runtime Status: `UNVERIFIED`
Because Docker Desktop / Docker Engine is not verified to be running locally in this exact execution namespace, we explicitly mark `DOCKER_RUNTIME = UNVERIFIED`. The configuration files are present and syntactically correct, however.

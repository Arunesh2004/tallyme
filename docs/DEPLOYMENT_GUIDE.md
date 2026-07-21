# TallyMe Enterprise - Deployment Guide

## Architecture Overview
TallyMe is a multi-container application comprising:
- **Backend API**: NestJS web server
- **Backend Worker**: NestJS background job processor (BullMQ)
- **Frontend**: Next.js (App Router) client
- **PostgreSQL**: Primary data store
- **Redis**: Queue and Idempotency store
- **Nginx**: Reverse proxy for routing and SSL

## Prerequisite Configuration
Before deploying, create a `.env` file from `.env.example` and set highly secure secrets for `JWT_SECRET`, `POSTGRES_PASSWORD`, etc.

## 1. Single Node Deployment (Linux VPS)
The simplest production deployment leverages `docker-compose.prod.yml`.

1. Clone the repository to the VPS.
2. Ensure Docker and Docker Compose are installed.
3. Build the images:
   ```bash
   docker-compose -f docker-compose.prod.yml build
   ```
4. Start the stack:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### 1.1 SSL Configuration
The provided `nginx.conf` can be extended with Certbot to issue Let's Encrypt certificates.
Run Certbot in a standalone container pointing to the Nginx webroot, and reload Nginx.

## 2. Advanced: Blue/Green Deployment
For zero-downtime updates:
1. Maintain two environments in Nginx upstream blocks (`backend_blue` and `backend_green`).
2. Deploy the new image to the inactive color (e.g., Green).
3. Run DB migrations explicitly on the Green container.
4. Execute health checks against Green `/api/health/ready`.
5. Update Nginx configuration to point to Green and execute `nginx -s reload`.
6. Spin down the Blue environment.

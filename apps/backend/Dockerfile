# Build Stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies (assuming monorepo root)
COPY package*.json ./
COPY tsconfig*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/backend/prisma ./apps/backend/prisma

# Clean install
RUN npm ci

# Copy backend source
COPY apps/backend ./apps/backend

# Generate Prisma and Build
WORKDIR /app/apps/backend
RUN npx prisma generate
RUN npm run build

# Production Stage
FROM node:18-alpine AS production

WORKDIR /app

# Switch to non-root user
USER node

COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/apps/backend/package*.json ./apps/backend/
COPY --chown=node:node --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --chown=node:node --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --chown=node:node --from=builder /app/node_modules ./node_modules

WORKDIR /app/apps/backend

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "run", "start:prod"]

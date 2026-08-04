# Build Stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY tsconfig*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/backend/prisma ./apps/backend/prisma

# Clean install all dependencies (including dev)
RUN npm ci

# Copy backend source
COPY apps/backend ./apps/backend

# Generate Prisma and Build
WORKDIR /app/apps/backend
RUN npx prisma generate
RUN npm run build

# Production Dependencies Stage
FROM node:18-alpine AS deps

WORKDIR /app
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/backend/prisma ./apps/backend/prisma

# Install ONLY production dependencies
ENV NODE_ENV=production
RUN npm ci --omit=dev

# Generate Prisma Client for production
WORKDIR /app/apps/backend
RUN npx prisma generate

# Production Stage
FROM node:18-alpine AS production

WORKDIR /app

# Switch to non-root user
USER node

# Copy from deps stage
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --chown=node:node --from=deps /app/package*.json ./

# Copy from builder stage
COPY --chown=node:node --from=builder /app/apps/backend/package*.json ./apps/backend/
COPY --chown=node:node --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --chown=node:node --from=builder /app/apps/backend/prisma ./apps/backend/prisma

WORKDIR /app/apps/backend

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health/live || exit 1

CMD ["npm", "run", "start:prod"]

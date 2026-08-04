# Multi-stage production build for TallyMe Enterprise Backend
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /usr/src/app/apps/backend

COPY apps/backend/package*.json ./

# Install all dependencies (including devDependencies) for building
RUN npm ci

COPY apps/backend/ .

# Generate Prisma client and build NestJS
RUN npx prisma generate
RUN npm run build

# Stage 2: Production
FROM node:18-alpine AS production

WORKDIR /usr/src/app/apps/backend

# Set node environment
ENV NODE_ENV=production

# Install production dependencies only
COPY apps/backend/package*.json ./
RUN npm ci --omit=dev

# Copy build artifacts and Prisma client from builder
COPY --from=builder /usr/src/app/apps/backend/dist ./dist
COPY --from=builder /usr/src/app/apps/backend/prisma ./prisma
COPY --from=builder /usr/src/app/apps/backend/node_modules/.prisma ./node_modules/.prisma

# Expose the API port
EXPOSE 3001
CMD ["node", "dist/src/main"]

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the application
CMD ["npm", "run", "start:prod"]

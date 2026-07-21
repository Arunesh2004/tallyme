# apps/backend/Dockerfile
# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app
# Copy package.json and lockfile
COPY package*.json ./
# Install dependencies
RUN npm ci
# Copy source
COPY . .
# Generate Prisma Client
RUN npx prisma generate
# Build NestJS App
RUN npm run build

# Production Stage
FROM node:20-alpine AS production
WORKDIR /app
# Use non-root user for security
RUN addgroup -S tallyme && adduser -S tallyme -G tallyme

# Copy built assets and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

# Change ownership
RUN chown -R tallyme:tallyme /app

USER tallyme

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "run", "start:prod"]

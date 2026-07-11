# Multi-stage Dockerfile for DineSync API
# Stage 1: Build
FROM node:22-alpine AS builder

# Install pnpm globally
RUN npm install -g pnpm@latest

WORKDIR /app

# Copy all files
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build all packages (types, db, then api)
RUN pnpm build

# Stage 2: Runtime
FROM node:22-alpine

# Install pnpm globally in runtime image too
RUN npm install -g pnpm@latest

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy built applications and packages from builder
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/apps/api

# Expose port
EXPOSE 4000

# Start the API
CMD ["pnpm", "start"]

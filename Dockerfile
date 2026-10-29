# ==============================================================
# QuickPulse Multi-Stage Production Container Build
# ==============================================================

# Stage 1: Client Build
FROM node:20-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# Stage 2: Production Server Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies for server
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm ci --only=production && cd server && npm ci --only=production

# Copy server code
COPY server/ ./server/

# Copy compiled frontend from Stage 1 into client/dist
COPY --from=client-builder /app/client/dist ./client/dist

# Security: Run as non-root node user
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "server/server.js"]

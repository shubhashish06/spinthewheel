# Multi-stage Dockerfile for Spin the Wheel Application
# This is optional - you can use this for containerized deployment

# Stage 1: Build frontend applications
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY mobile-form/package*.json ./mobile-form/
COPY signage-display/package*.json ./signage-display/
COPY admin-dashboard/package*.json ./admin-dashboard/

# Install root dependencies
RUN npm install

# Install frontend dependencies
RUN cd mobile-form && npm install && cd .. && \
    cd signage-display && npm install && cd .. && \
    cd admin-dashboard && npm install

# Copy source files
COPY mobile-form ./mobile-form
COPY signage-display ./signage-display
COPY admin-dashboard ./admin-dashboard

# Build frontends
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine

WORKDIR /app

# Install PostgreSQL client (for migrations/backups)
RUN apk add --no-cache postgresql-client

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install production dependencies
RUN npm install --production && \
    cd backend && npm install --production

# Copy backend source
COPY backend ./backend

# Copy built frontends from builder stage
COPY --from=frontend-builder /app/mobile-form/dist ./mobile-form/dist
COPY --from=frontend-builder /app/signage-display/dist ./signage-display/dist
COPY --from=frontend-builder /app/admin-dashboard/dist ./admin-dashboard/dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/signage/DEFAULT', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "backend/server.js"]

# Multi-stage Production Dockerfile for Apex Institute LMS Frontend (React/Vite)
# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig*.json vite.config.ts index.html ./
RUN npm ci

COPY src/ ./src/
COPY public/ ./public/
RUN npm run build

# Stage 2: Production NGINX Web Server
FROM nginx:alpine AS production

# Copy custom NGINX configuration
COPY ../nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy production build artifacts
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

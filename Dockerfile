FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Nginx proxies API calls at runtime — no secrets baked into the bundle
ENV NODE_ENV production

# Build the application (relative URLs; nginx handles proxying to backend)
RUN bun run build

# Production image - Nginx serving static files + proxying API calls
FROM nginx:alpine

# envsubst is used to inject CF credentials into nginx config at startup
RUN apk add --no-cache gettext

# Copy nginx template and entrypoint
COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10 --activate \
    && apk add --no-cache libc6-compat python3 make g++ vips-dev

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATA_DIR=/data
ENV HOSTNAME=0.0.0.0
RUN apk add --no-cache vips tini \
    && addgroup -g 1001 -S nodejs \
    && adduser -S -u 1001 -G nodejs garden

COPY --from=builder /app/public ./public
COPY --from=builder --chown=garden:nodejs /app/.next/standalone ./
COPY --from=builder --chown=garden:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=garden:nodejs /app/lib/db/migrations ./lib/db/migrations
COPY --chown=garden:nodejs docker ./docker

RUN mkdir -p /data/uploads && chown -R garden:nodejs /data
USER garden
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--", "/app/docker/entrypoint.sh"]

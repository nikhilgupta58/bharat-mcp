FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace manifests and lockfile first for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.json ./
COPY packages/ packages/
COPY docker/ docker/

# Install all workspace deps and build packages + combined server
RUN corepack enable pnpm && \
    pnpm install --frozen-lockfile && \
    pnpm build && \
    cd docker && npx tsc --project tsconfig.json

# ── Runtime image ─────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Copy per-package node_modules (pnpm layout)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=builder /app/packages/gst/node_modules ./packages/gst/node_modules
COPY --from=builder /app/packages/mca/node_modules ./packages/mca/node_modules
COPY --from=builder /app/docker/node_modules ./docker/node_modules

# Compiled package outputs
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/core/package.json ./packages/core/package.json
COPY --from=builder /app/packages/gst/dist ./packages/gst/dist
COPY --from=builder /app/packages/gst/package.json ./packages/gst/package.json
COPY --from=builder /app/packages/mca/dist ./packages/mca/dist
COPY --from=builder /app/packages/mca/package.json ./packages/mca/package.json

# Bundled static data files (read at runtime from source paths via symlink)
COPY --from=builder /app/packages/gst/src/data ./packages/gst/src/data
COPY --from=builder /app/packages/mca/src/data ./packages/mca/src/data

# Compiled combined server entry point
COPY --from=builder /app/docker/combined-server.js ./docker/combined-server.js
COPY --from=builder /app/docker/package.json ./docker/package.json

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "docker/combined-server.js"]

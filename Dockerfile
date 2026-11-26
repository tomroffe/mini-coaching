FROM node:24-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build && node scripts/bundle-db-scripts.mjs

FROM base AS run
# Links the GHCR package to the GitHub repo
LABEL org.opencontainers.image.source="https://github.com/tomroffe/mini-coaching"
LABEL org.opencontainers.image.description="Minis Coach: training plans, drills, registers and awards for minis rugby"
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
# Standalone output carries only the node_modules the server needs; migrate/seed are
# pre-bundled into dist-db (see scripts/bundle-db-scripts.mjs)
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/dist-db ./dist-db
COPY docker/entrypoint.sh ./entrypoint.sh
EXPOSE 3000
CMD ["sh", "./entrypoint.sh"]

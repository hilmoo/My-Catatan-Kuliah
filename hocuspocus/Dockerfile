FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY . .

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter proto install --frozen-lockfile

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter hocuspocus install --frozen-lockfile

RUN pnpm --filter proto run build
RUN pnpm --filter hocuspocus run build

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm deploy --filter hocuspocus --prod --legacy /app/out

FROM node:24-slim AS prod
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/out/node_modules ./node_modules
COPY --from=build /app/hocuspocus/dist ./dist

CMD ["node", "dist/index.js"]
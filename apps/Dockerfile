FROM node:24-slim AS frontend-builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

COPY . .

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter frontend install --frozen-lockfile

RUN pnpm --filter frontend run build

FROM golang:1.26 AS backend-builder
WORKDIR /app

COPY . .

RUN go mod download

COPY --from=frontend-builder /app/apps/frontend/dist ./apps/backend/internal/app/dist

RUN CGO_ENABLED=0 GOOS=linux go build -o app ./apps/backend/cmd/main.go

FROM alpine:3.23 AS prod
WORKDIR /app
ENV APP_ENV=production

COPY --from=backend-builder /app/apps/migration ./migration
COPY --from=backend-builder /app/app ./app
COPY --from=backend-builder /app/apps/entrypoint.sh ./entrypoint.sh

RUN chmod +x ./app
RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
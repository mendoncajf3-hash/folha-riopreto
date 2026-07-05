# Build multi-stage da API. Executado a partir da raiz do monorepo.
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

# Instala dependências do workspace (api + shared)
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile=false

# Copia código e gera artefatos
COPY packages/shared packages/shared
COPY apps/api apps/api
WORKDIR /repo/apps/api
RUN pnpm exec prisma generate && pnpm build

FROM node:22-alpine AS runtime
RUN corepack enable
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=base /repo /repo
WORKDIR /repo/apps/api
# Aplica migrations e sobe a API
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/index.js"]

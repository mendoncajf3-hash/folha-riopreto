# Portal de Gestão Operacional

Plataforma central de gestão operacional — **monólito modular** com front-end e back-end separados, preparada para crescer sem ser refeita.

> Arquitetura completa (as 10 entregas) em [`docs/arquitetura.md`](docs/arquitetura.md).
> Como criar um novo módulo em [`docs/como-criar-modulo.md`](docs/como-criar-modulo.md).

## Stack

| Camada | Tecnologia |
| --- | --- |
| Front-end | React 18 · TypeScript · Vite · Tailwind · TanStack Query · Zustand |
| Back-end | Node 22 · Express · TypeScript · Zod |
| Banco | PostgreSQL 16 · Prisma ORM |
| Auth | JWT (access) + refresh rotativo em cookie httpOnly · RBAC |
| Infra | Docker Compose · Nginx · pnpm workspaces |

## Estrutura

```
portal/
├─ apps/
│  ├─ api/         # Back-end: core + módulos (auth, admin, escalas, notificações)
│  └─ web/         # Front-end: shell + módulos (dashboard, escalas, admin)
├─ packages/
│  └─ shared/      # Contratos e tipos compartilhados web ↔ api
├─ infra/          # docker-compose, Dockerfiles, nginx
└─ docs/           # arquitetura, ADRs, guia de módulos
```

## Rodando localmente

Pré-requisitos: Node 22+, pnpm 10+, e um PostgreSQL acessível.

```bash
pnpm install

# API
cd apps/api
cp .env.example .env            # ajuste DATABASE_URL e segredos
pnpm exec prisma migrate dev    # cria o schema
pnpm seed                       # cria perfis, base e admin inicial
pnpm dev                        # API em http://localhost:3333

# Web (em outro terminal)
cd apps/web
pnpm dev                        # http://localhost:5173 (proxy /api -> 3333)
```

Login inicial (do seed): **admin@portal.local** / **Admin@123**.

### Verificação

```bash
cd apps/api
pnpm exec tsx scripts/smoke.ts  # teste ponta a ponta (login → escalas → auditoria)
pnpm test                       # testes unitários (Vitest)
```

## Produção (VPS com Docker)

```bash
cd infra
cp .env.example .env            # defina senhas e segredos fortes
docker compose up -d --build
```

O Nginx serve o front-end na porta 80 e faz proxy de `/api` para a API. As
migrations são aplicadas automaticamente no start do container da API.

## Módulos

| Módulo | Status |
| --- | --- |
| Administração (usuários, perfis, auditoria) | ✅ implementado |
| Escalas (equipes, turnos, substituições, férias) | ✅ implementado |
| Dashboard | ✅ base implementada |
| Notificações (via event bus) | ✅ base implementada |
| Tarefas · Leitura · Diário · Indicadores · Documentos · Integrações | 🔜 roadmap |

## Princípio de arquitetura

Nenhum módulo importa outro. A comunicação acontece por **serviços internos** e
pelo **event bus** (`apps/api/src/core/events/bus.ts`). Adicionar um módulo novo
não exige alterar os existentes — veja o guia de módulos.

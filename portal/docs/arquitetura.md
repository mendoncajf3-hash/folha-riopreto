# Arquitetura — Portal de Gestão Operacional

Documento técnico das 10 entregas de arquitetura. Versão navegável (com
diagramas) foi apresentada como artefato visual; este é o registro no repositório.

## 1. Arquitetura do sistema

Monólito modular em camadas, cada módulo um *bounded context*:

```
Cliente (React PWA)
   │  HTTPS · JSON · JWT
Nginx (TLS, estáticos, proxy, rate-limit)
   │
API REST (Express) — middleware transversal: auth · RBAC · validação · auditoria · logs
   │
Módulos de domínio (serviços isolados) + Event Bus
   │
Prisma → PostgreSQL   |   Integrações ⇄ sistemas externos
```

**Decisões-chave:** (1) monólito modular, não microserviços; (2) nenhum módulo
importa outro — comunicação por serviço interno e event bus; (3) multi-base
(`base_id`) desde o início. Ver `adr-0001-monolito-modular.md`.

## 2. Estrutura de pastas

Monorepo pnpm: `apps/api`, `apps/web`, `packages/shared`, `infra`, `docs`.
Cada módulo (api e web) tem estrutura simétrica. Ver `README.md`.

## 3. Modelagem do banco

Núcleo: `bases`, `users`, `roles`, `permissions`, `user_roles`,
`role_permissions`, `sessions`, `audit_logs`, `notifications`, `files`.
Módulo Escalas: `teams`, `team_members`, `shifts`, `substitutions`, `vacations`.
Convenções: UUID, timestamps automáticos, soft delete (`deletedAt`),
índices em FKs e campos de filtro. Fonte da verdade: `apps/api/prisma/schema.prisma`.

## 4. Fluxo entre módulos

Módulos publicam eventos tipados (`shift.created`, `shift.substituted`, …);
outros (Notificações, Indicadores, Auditoria, Dashboard) reagem sem conhecê-los.
Exemplo implementado: substituir um turno → o módulo de Notificações cria uma
notificação para o substituto, sem importar o módulo Escalas.

## 5. Diagrama da arquitetura

Ver a versão visual (camadas 1–5 + lateral de Integrações). Resumo na seção 1.

## 6. Tecnologias e justificativa

React/TS/Vite (definidos) · Tailwind + TanStack Query + Zustand no front ·
Express/TS + Prisma + Zod no back · PostgreSQL · JWT+refresh · Docker/Nginx.
Justificativas por linha no artefato e no ADR.

## 7. Plano por fases

0. Fundação · 1. Auth/RBAC/Admin · 2. Dashboard/Tarefas · 3. Escalas/Leitura/Diário ·
4. Indicadores/Documentos/Notificações · 5. Integrações + hardening (PWA, filas, WebSocket).

## 8. Ordem de implementação

Fundação → Auth/RBAC → Admin/Auditoria → (módulos) → Indicadores → Integrações →
polimento (PWA, realtime, segurança). **Entregue nesta fase:** 0, 1 e o módulo Escalas.

## 9. Escalabilidade e manutenção

Fronteiras de módulo (recomenda-se lint), template de módulo, contratos tipados
ponta a ponta, migrations versionadas, auditoria/observabilidade desde o início,
extração para serviço possível sem reescrita, escala vertical primeiro.

## 10. Melhorias para robustez

Senhas com hash (implementado), segredos em ambiente, refresh rotativo
(implementado), backups de banco com teste de restauração, busca global indexada,
painel personalizável, feature flags, realtime via WebSocket, IA como serviço interno.

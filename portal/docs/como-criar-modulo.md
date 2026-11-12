# Como criar um novo módulo

O sistema é um monólito modular: cada módulo é um *bounded context* isolado.
Adicionar um módulo **não deve alterar nenhum módulo existente**. Este guia usa
um módulo fictício `frota` como exemplo.

## Regras invioláveis

1. Um módulo **nunca** importa código de outro módulo (`modules/x` não importa `modules/y`).
2. Comunicação entre módulos só por: **serviços internos** (síncrono) ou **event bus** (assíncrono).
3. Todo tipo trocado com o front-end vive em `packages/shared`.
4. Toda ação relevante gera **auditoria** (`core/services/audit.ts`).

## Back-end — `apps/api/src/modules/frota/`

Crie a pasta com o padrão simétrico dos demais módulos:

```
frota/
├─ frota.routes.ts    # controller fino: valida (Zod) e chama o service
├─ frota.service.ts   # regras de negócio; publica eventos no bus
├─ frota.schema.ts    # (opcional) schemas Zod reutilizáveis
└─ frota.test.ts      # testes do módulo
```

Registre o router em `core/registry/modules.ts` — **uma linha**:

```ts
import { frotaRouter } from "../../modules/frota/frota.routes.js";

export const httpModules: ModuleDefinition[] = [
  // ...existentes (nenhum alterado)
  { id: "frota", basePath: "/frota", router: frotaRouter },
];
```

Adicione o identificador do módulo e suas permissões em `packages/shared`
(`modules.ts` e `permissions.ts`) e rode o `seed` para criar as permissões.

## Reagindo a eventos de outros módulos

Se `frota` precisa reagir a algo que acontece em `escalas`, **não importe escalas**.
Assine o evento:

```ts
bus.on("shift.substituted", (payload) => {
  // ...lógica da frota
});
```

Registre os listeners em `registerEventListeners()` (mesmo arquivo de registry).

## Front-end — `apps/web/src/modules/frota/`

1. Crie `FrotaPage.tsx` seguindo o padrão de `EscalasPage.tsx` (TanStack Query + `api`).
2. Adicione a entrada em `app/navigation.tsx` com a permissão mínima.
3. Adicione a rota em `app/App.tsx`.

Pronto. O item aparece no menu apenas para quem tem permissão, e o módulo está
isolado dos demais.

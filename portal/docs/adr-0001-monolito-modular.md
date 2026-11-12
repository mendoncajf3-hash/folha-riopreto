# ADR 0001 — Monólito modular em vez de microserviços

- **Status:** aceito
- **Data:** 2026-07
- **Contexto:** ~20 usuários iniciais, hospedagem em uma VPS Linux, equipe enxuta,
  requisito de crescer sem refazer e de módulos independentes.

## Decisão

Construir o sistema como um **monólito modular**: um único deploy de API e um
único banco PostgreSQL, com fronteiras rígidas de código entre módulos
(pastas + interfaces + event bus), em vez de microserviços.

## Justificativa

- Microserviços trariam custo operacional (orquestração, rede, observabilidade
  distribuída, consistência) desproporcional à escala atual.
- As fronteiras de desacoplamento exigidas são obtidas por **código** (nenhum
  módulo importa outro; comunicação por serviço interno e event bus), não por rede.
- Um módulo isolado pode ser **extraído** para um serviço próprio no futuro, sem
  reescrita, se e quando a escala justificar.

## Consequências

- Simplicidade de deploy e diagnóstico; um pipeline, um banco, um log.
- Necessário disciplinar as fronteiras (recomendado: regra de lint que proíba
  imports entre módulos).
- Escala inicialmente vertical (VPS maior); Redis/cache/replica entram por evolução.

## Decisões relacionadas

- **Auth:** JWT de acesso curto + refresh rotativo em cookie httpOnly; senhas com
  bcrypt (corrige o modelo anterior em `db.json` com senha em texto puro).
- **Multi-base:** `base_id` nas entidades operacionais desde o início.
- **Event bus:** EventEmitter em processo agora; interface preparada para trocar
  por fila (Redis/BullMQ) na fase de Integrações sem mudar os módulos.

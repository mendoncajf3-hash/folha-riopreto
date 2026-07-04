/**
 * @portal/shared — contratos e tipos compartilhados entre a API e o Web.
 * Regra de arquitetura: este pacote NÃO importa de nenhum módulo.
 * É a única dependência de código que web e api compartilham.
 */
export * from "./roles.js";
export * from "./modules.js";
export * from "./permissions.js";
export * from "./dtos.js";

/**
 * Configuração central lida do ambiente. Falha cedo (fail-fast) se algo
 * essencial estiver ausente, para não subir o servidor mal configurado.
 */
import fs from "node:fs";
import path from "node:path";

/**
 * Carrega um arquivo .env local sem dependências externas (apenas em dev).
 * Em produção as variáveis vêm do ambiente/Docker e este arquivo não existe.
 */
function loadDotEnv(): void {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadDotEnv();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

export const config = {
  env: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT ?? 3333),
  databaseUrl: required("DATABASE_URL"),
  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET", "dev-access-secret-troque-em-producao"),
    refreshSecret: required("JWT_REFRESH_SECRET", "dev-refresh-secret-troque-em-producao"),
    accessTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
    refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7),
  },
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
} as const;

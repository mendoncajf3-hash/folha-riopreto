import type { RoleName } from "./roles.js";

/** Formato padrão de resposta da API. Todo endpoint responde neste envelope. */
export interface ApiOk<T> {
  ok: true;
  data: T;
}
export interface ApiErr {
  ok: false;
  error: { code: string; message: string; details?: unknown };
}
export type ApiResponse<T> = ApiOk<T> | ApiErr;

/** Usuário retornado pela API (nunca inclui hash de senha). */
export interface UserDTO {
  id: string;
  name: string;
  email: string;
  active: boolean;
  baseId: string | null;
  baseName?: string | null;
  roles: RoleName[];
  permissions: string[];
  createdAt: string;
}

export interface BaseDTO {
  id: string;
  name: string;
  code: string;
  active: boolean;
}

export interface LoginResponse {
  user: UserDTO;
  accessToken: string;
}

/** Escalas — DTOs do primeiro módulo funcional. */
export type ShiftStatus = "PLANEJADA" | "CONFIRMADA" | "AUSENTE" | "SUBSTITUIDA";
export type ShiftPeriod = "MANHA" | "TARDE" | "NOITE" | "INTEGRAL";

export interface TeamDTO {
  id: string;
  name: string;
  baseId: string;
  baseName?: string;
  memberCount: number;
  active: boolean;
}

export interface ShiftDTO {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  period: ShiftPeriod;
  status: ShiftStatus;
  userId: string;
  userName?: string;
  teamId: string | null;
  teamName?: string | null;
  note?: string | null;
}

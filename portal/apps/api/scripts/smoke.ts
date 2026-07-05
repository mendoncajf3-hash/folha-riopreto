/**
 * Smoke test de ponta a ponta (sem framework): sobe o app em uma porta de teste,
 * exercita login → escalas → substituição → auditoria e encerra.
 * Roda em primeiro plano: `pnpm exec tsx scripts/smoke.ts`
 */
import { createApp } from "../src/app.js";

const PORT = 3999;
const BASE = `http://localhost:${PORT}/api/v1`;
let failures = 0;

function check(name: string, cond: boolean, extra?: unknown) {
  const mark = cond ? "✓" : "✗";
  console.log(`  ${mark} ${name}${cond ? "" : "  << FALHOU"}`);
  if (!cond) {
    failures++;
    if (extra !== undefined) console.log("     ", JSON.stringify(extra));
  }
}

async function main() {
  const app = createApp();
  const server = app.listen(PORT);
  await new Promise((r) => server.once("listening", r));

  try {
    // health
    const health = await fetch(`http://localhost:${PORT}/api/health`).then((r) => r.json());
    check("health up", health?.data?.status === "up");

    // login admin
    const loginRes = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@portal.local", password: "Admin@123" }),
    });
    const login = await loginRes.json();
    check("login admin", login.ok === true, login);
    const token = login.data?.accessToken as string;
    const auth = { authorization: `Bearer ${token}`, "content-type": "application/json" };
    check("admin tem permissões", (login.data?.user?.permissions?.length ?? 0) > 0);

    // login inválido
    const bad = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@portal.local", password: "errada" }),
    });
    check("login inválido rejeitado (401)", bad.status === 401);

    // /me
    const me = await fetch(`${BASE}/auth/me`, { headers: auth }).then((r) => r.json());
    check("/me retorna usuário", me.data?.email === "admin@portal.local");

    // sem token -> 401
    const noAuth = await fetch(`${BASE}/admin/users`);
    check("rota protegida sem token (401)", noAuth.status === 401);

    // bases
    const bases = await fetch(`${BASE}/admin/bases`, { headers: auth }).then((r) => r.json());
    check("lista bases (seed Rio Preto)", bases.data?.length >= 1, bases.data);
    const baseId = bases.data[0].id;

    // cria operador
    const opEmail = `op_${Date.now()}@portal.local`;
    const created = await fetch(`${BASE}/admin/users`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ name: "Operador Teste", email: opEmail, password: "Op@1234", baseId, roles: ["OPERADOR"] }),
    }).then((r) => r.json());
    check("cria operador", created.ok === true, created);
    const opId = created.data?.id;

    // cria equipe
    const team = await fetch(`${BASE}/escalas/teams`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ name: "Equipe Alpha", baseId, memberIds: [opId] }),
    }).then((r) => r.json());
    check("cria equipe com membro", team.ok === true && team.data?.memberCount === 1, team);

    // cria turno
    const shift = await fetch(`${BASE}/escalas/shifts`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ baseId, userId: opId, teamId: team.data.id, date: "2026-07-10", period: "MANHA" }),
    }).then((r) => r.json());
    check("cria turno", shift.ok === true, shift);
    const shiftId = shift.data?.id;

    // confirma turno
    const confirm = await fetch(`${BASE}/escalas/shifts/${shiftId}/status`, {
      method: "PATCH",
      headers: auth,
      body: JSON.stringify({ status: "CONFIRMADA" }),
    }).then((r) => r.json());
    check("atualiza status do turno", confirm.data?.status === "CONFIRMADA", confirm);

    // cria 2º operador e substitui
    const op2 = await fetch(`${BASE}/admin/users`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ name: "Substituto", email: `sub_${Date.now()}@portal.local`, password: "Op@1234", baseId, roles: ["OPERADOR"] }),
    }).then((r) => r.json());
    const sub = await fetch(`${BASE}/escalas/shifts/${shiftId}/substitute`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ substituteId: op2.data.id, reason: "Atestado médico" }),
    }).then((r) => r.json());
    check("substitui turno", sub.data?.status === "SUBSTITUIDA", sub);

    // aguarda o event bus criar a notificação para o substituto
    await new Promise((r) => setTimeout(r, 200));
    const { prisma } = await import("../src/core/db.js");
    const notif = await prisma.notification.findFirst({ where: { userId: op2.data.id } });
    check("event bus criou notificação p/ substituto", !!notif, notif);

    // lista turnos por período
    const shifts = await fetch(`${BASE}/escalas/shifts?from=2026-07-01&to=2026-07-31&baseId=${baseId}`, { headers: auth }).then((r) => r.json());
    check("lista turnos do período", (shifts.data?.length ?? 0) >= 1);

    // auditoria registrou ações
    const audit = await fetch(`${BASE}/admin/audit`, { headers: auth }).then((r) => r.json());
    check("auditoria registrou eventos", (audit.data?.length ?? 0) >= 3, audit.data?.length);

    await prisma.$disconnect();
  } finally {
    server.close();
  }

  console.log(failures === 0 ? "\n✅ SMOKE OK — todos os checks passaram" : `\n❌ ${failures} check(s) falharam`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

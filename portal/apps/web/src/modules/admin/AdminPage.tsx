import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BaseDTO, UserDTO } from "@portal/shared";
import { ROLE_LABELS, ROLES } from "@portal/shared";
import { api } from "../../lib/api";
import { Button, Card, Input, PageHeader } from "../../shared/ui";
import { useAuth } from "../../store/auth";

interface AuditRow {
  id: string;
  userName: string;
  module: string;
  entity: string;
  action: string;
  at: string;
}

export function AdminPage() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const [tab, setTab] = useState<"users" | "audit">("users");

  const users = useQuery({ queryKey: ["users"], queryFn: () => api.get<UserDTO[]>("/admin/users") });
  const bases = useQuery({ queryKey: ["bases"], queryFn: () => api.get<BaseDTO[]>("/admin/bases") });
  const audit = useQuery({
    queryKey: ["audit"],
    queryFn: () => api.get<AuditRow[]>("/admin/audit?limit=50"),
    enabled: tab === "audit",
  });

  const [form, setForm] = useState({ name: "", email: "", password: "", baseId: "", role: ROLES.OPERADOR });
  const createUser = useMutation({
    mutationFn: () =>
      api.post("/admin/users", {
        name: form.name,
        email: form.email,
        password: form.password,
        baseId: form.baseId || null,
        roles: [form.role],
      }),
    onSuccess: () => {
      setForm({ name: "", email: "", password: "", baseId: "", role: ROLES.OPERADOR });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const canCreate = can("admin:create");

  return (
    <div>
      <PageHeader title="Administração" subtitle="Usuários, perfis e auditoria" />

      <div className="mb-5 flex gap-1">
        {(["users", "audit"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === t ? "bg-brand-soft text-brand-ink dark:bg-brand/20 dark:text-brand-soft" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {t === "users" ? "Usuários" : "Auditoria"}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <>
          {canCreate && (
            <Card className="mb-6 p-4">
              <div className="mb-3 text-sm font-medium">Novo usuário</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input placeholder="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input placeholder="Senha" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                >
                  {Object.values(ROLES).map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <Button onClick={() => createUser.mutate()} disabled={!form.name || !form.email || form.password.length < 6 || createUser.isPending}>
                  {createUser.isPending ? "Criando…" : "Criar"}
                </Button>
              </div>
              <div className="mt-2 flex gap-3">
                <select
                  value={form.baseId}
                  onChange={(e) => setForm({ ...form, baseId: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="">Sem base</option>
                  {bases.data?.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              {createUser.isError && <div className="mt-2 text-sm text-red-600">Falha ao criar usuário (e-mail já existe?).</div>}
            </Card>
          )}

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left font-mono text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                    <th className="px-5 py-3">Nome</th>
                    <th className="px-5 py-3">E-mail</th>
                    <th className="px-5 py-3">Perfis</th>
                    <th className="px-5 py-3">Base</th>
                    <th className="px-5 py-3">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.data?.map((u) => (
                    <tr key={u.id}>
                      <td className="px-5 py-3 font-medium">{u.name}</td>
                      <td className="px-5 py-3 text-slate-500">{u.email}</td>
                      <td className="px-5 py-3 font-mono text-xs">{u.roles.join(", ")}</td>
                      <td className="px-5 py-3 text-slate-500">{u.baseName ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${u.active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>
                          {u.active ? "ativo" : "inativo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === "audit" && (
        <Card className="divide-y divide-slate-100 dark:divide-slate-800">
          {audit.data?.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
              <div>
                <span className="font-mono text-xs text-brand-ink dark:text-brand-soft">{a.module}:{a.action}</span>
                <span className="ml-2 text-slate-500">{a.entity}</span>
              </div>
              <div className="text-right">
                <div className="text-xs">{a.userName}</div>
                <div className="font-mono text-[11px] text-slate-400">{new Date(a.at).toLocaleString("pt-BR")}</div>
              </div>
            </div>
          ))}
          {audit.data?.length === 0 && <div className="px-5 py-8 text-center text-slate-400">Sem registros.</div>}
        </Card>
      )}
    </div>
  );
}

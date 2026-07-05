import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BaseDTO, ShiftDTO, TeamDTO, UserDTO } from "@portal/shared";
import { api } from "../../lib/api";
import { Button, Card, Input, PageHeader, StatusPill } from "../../shared/ui";
import { useAuth } from "../../store/auth";

const PERIODS = ["MANHA", "TARDE", "NOITE", "INTEGRAL"] as const;

export function EscalasPage() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const [baseId, setBaseId] = useState<string>("");

  const bases = useQuery({ queryKey: ["bases"], queryFn: () => api.get<BaseDTO[]>("/admin/bases") });
  const activeBase = baseId || bases.data?.[0]?.id || "";

  const users = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<UserDTO[]>("/admin/users"),
    enabled: can("admin:read"),
  });
  const teams = useQuery({
    queryKey: ["teams", activeBase],
    queryFn: () => api.get<TeamDTO[]>(`/escalas/teams?baseId=${activeBase}`),
    enabled: !!activeBase,
  });
  const shifts = useQuery({
    queryKey: ["shifts", activeBase],
    queryFn: () => api.get<ShiftDTO[]>(`/escalas/shifts?baseId=${activeBase}`),
    enabled: !!activeBase,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["shifts"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/escalas/shifts/${id}/status`, { status }),
    onSuccess: invalidate,
  });

  const [form, setForm] = useState({ userId: "", teamId: "", date: "", period: "INTEGRAL" });
  const createShift = useMutation({
    mutationFn: () =>
      api.post("/escalas/shifts", {
        baseId: activeBase,
        userId: form.userId,
        teamId: form.teamId || null,
        date: form.date,
        period: form.period,
      }),
    onSuccess: () => {
      setForm({ userId: "", teamId: "", date: "", period: "INTEGRAL" });
      invalidate();
    },
  });

  const canCreate = can("escalas:create");
  const canUpdate = can("escalas:update");

  return (
    <div>
      <PageHeader
        title="Escalas"
        subtitle="Planejamento de turnos, equipes e substituições"
        action={
          <select
            value={activeBase}
            onChange={(e) => setBaseId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            {bases.data?.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        }
      />

      {canCreate && (
        <Card className="mb-6 p-4">
          <div className="mb-3 text-sm font-medium">Novo turno</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <select
              value={form.userId}
              onChange={(e) => setForm({ ...form, userId: e.target.value })}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">Colaborador…</option>
              {users.data?.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <select
              value={form.teamId}
              onChange={(e) => setForm({ ...form, teamId: e.target.value })}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">Sem equipe</option>
              {teams.data?.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <select
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              {PERIODS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <Button
              onClick={() => createShift.mutate()}
              disabled={!form.userId || !form.date || createShift.isPending}
            >
              {createShift.isPending ? "Salvando…" : "Adicionar"}
            </Button>
          </div>
          {createShift.isError && (
            <div className="mt-2 text-sm text-red-600">Não foi possível criar o turno.</div>
          )}
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left font-mono text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Período</th>
                <th className="px-5 py-3">Colaborador</th>
                <th className="px-5 py-3">Equipe</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {shifts.data?.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3 tabular-nums">{s.date}</td>
                  <td className="px-5 py-3 font-mono text-xs">{s.period}</td>
                  <td className="px-5 py-3 font-medium">{s.userName}</td>
                  <td className="px-5 py-3 text-slate-500">{s.teamName ?? "—"}</td>
                  <td className="px-5 py-3"><StatusPill status={s.status} /></td>
                  <td className="px-5 py-3 text-right">
                    {canUpdate && s.status !== "CONFIRMADA" && s.status !== "SUBSTITUIDA" && (
                      <button
                        onClick={() => setStatus.mutate({ id: s.id, status: "CONFIRMADA" })}
                        className="text-xs font-medium text-emerald-600 hover:underline"
                      >
                        Confirmar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {shifts.data?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    Nenhum turno para esta base.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

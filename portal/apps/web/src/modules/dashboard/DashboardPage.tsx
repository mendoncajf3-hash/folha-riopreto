import { useQuery } from "@tanstack/react-query";
import type { ShiftDTO } from "@portal/shared";
import { api } from "../../lib/api";
import { Card, PageHeader, StatusPill } from "../../shared/ui";
import { useAuth } from "../../store/auth";

export function DashboardPage() {
  const { user } = useAuth();
  const { data: shifts } = useQuery({
    queryKey: ["dashboard", "shifts"],
    queryFn: () => api.get<ShiftDTO[]>("/escalas/shifts"),
    enabled: user?.permissions.some((p) => p.startsWith("escalas:")) ?? false,
  });

  const confirmadas = shifts?.filter((s) => s.status === "CONFIRMADA").length ?? 0;
  const substituidas = shifts?.filter((s) => s.status === "SUBSTITUIDA").length ?? 0;
  const planejadas = shifts?.filter((s) => s.status === "PLANEJADA").length ?? 0;

  const cards = [
    { label: "Turnos planejados", value: planejadas, hint: "aguardando confirmação" },
    { label: "Turnos confirmados", value: confirmadas, hint: "prontos para a operação" },
    { label: "Substituições", value: substituidas, hint: "no período" },
    { label: "Total de turnos", value: shifts?.length ?? 0, hint: "cadastrados" },
  ];

  return (
    <div>
      <PageHeader
        title={`Olá, ${user?.name?.split(" ")[0] ?? ""}`}
        subtitle="Visão geral da operação"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="font-mono text-xs uppercase tracking-wide text-slate-400">{c.label}</div>
            <div className="mt-2 text-3xl font-semibold tabular-nums">{c.value}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{c.hint}</div>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Atividade recente — Escalas
      </h2>
      <Card className="divide-y divide-slate-100 dark:divide-slate-800">
        {(shifts ?? []).slice(0, 6).map((s) => (
          <div key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
            <div>
              <span className="font-medium">{s.userName}</span>
              <span className="ml-2 text-slate-400">{s.date} · {s.period}</span>
            </div>
            <StatusPill status={s.status} />
          </div>
        ))}
        {(!shifts || shifts.length === 0) && (
          <div className="px-5 py-8 text-center text-sm text-slate-400">Nenhum turno cadastrado ainda.</div>
        )}
      </Card>
    </div>
  );
}

import { PageHeader } from "../../shared/ui";

/** Placeholder padrão para módulos previstos na arquitetura, ainda não implementados. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} subtitle="Módulo previsto na arquitetura" />
      <div className="grid place-items-center rounded-xl border border-dashed border-slate-300 py-20 text-center dark:border-slate-700">
        <div className="font-mono text-sm uppercase tracking-widest text-slate-400">Em desenvolvimento</div>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Este módulo faz parte do roadmap aprovado e será entregue em uma próxima fase, seguindo o mesmo
          padrão de módulo isolado.
        </p>
      </div>
    </div>
  );
}

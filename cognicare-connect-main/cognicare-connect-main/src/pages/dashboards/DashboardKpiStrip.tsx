type KpiItem = { label: string; value: string | number };

export function DashboardKpiStrip({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {items.map((x) => (
        <div
          key={x.label}
          className="rounded-xl bg-[#F0F2F4] px-3 py-5 sm:px-4 text-center shadow-sm border border-black/[0.03]"
        >
          <p className="text-[11px] sm:text-xs text-gray-500 font-medium uppercase tracking-wide leading-tight">{x.label}</p>
          <p className="mt-2 text-xl sm:text-2xl font-bold text-gray-900 tabular-nums">{x.value}</p>
        </div>
      ))}
    </div>
  );
}

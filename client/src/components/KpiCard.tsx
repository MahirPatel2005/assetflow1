import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "default" | "warning";
}

export function KpiCard({ label, value, icon: Icon, tone = "default" }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <Icon size={18} className={tone === "warning" ? "text-amber-500" : "text-brand-500"} />
      </div>
      <div className={`mt-2 text-2xl font-semibold ${tone === "warning" ? "text-amber-600" : "text-slate-900"}`}>
        {value}
      </div>
    </div>
  );
}

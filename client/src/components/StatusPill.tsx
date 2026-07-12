const STATUS_STYLES: Record<string, string> = {
  Available: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Allocated: "bg-blue-50 text-blue-700 ring-blue-600/20",
  Reserved: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  "Under Maintenance": "bg-amber-50 text-amber-700 ring-amber-600/20",
  Lost: "bg-red-50 text-red-700 ring-red-600/20",
  Retired: "bg-slate-100 text-slate-600 ring-slate-500/20",
  Disposed: "bg-slate-100 text-slate-500 ring-slate-500/20",
  Pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Rejected: "bg-red-50 text-red-700 ring-red-600/20",
  Resolved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Upcoming: "bg-blue-50 text-blue-700 ring-blue-600/20",
  Cancelled: "bg-slate-100 text-slate-500 ring-slate-500/20",
};

export function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600 ring-slate-500/20";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}>
      {status}
    </span>
  );
}

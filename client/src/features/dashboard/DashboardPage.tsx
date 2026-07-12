import { useQuery } from "@tanstack/react-query";
import { Boxes, CheckCircle2, Wrench, CalendarClock, ArrowLeftRight, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { dashboardApi } from "../../services/domainApi";
import { KpiCard } from "../../components/KpiCard";

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: dashboardApi.getKpis,
    refetchInterval: 60_000,
  });

  const chartData = data
    ? Object.entries(data.assetsByStatus).map(([status, count]) => ({ status, count }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Organization-wide snapshot, refreshed every minute.</p>
      </div>

      {isLoading || !data ? (
        <div className="text-sm text-slate-500">Loading KPIs…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <KpiCard label="Available" value={data.assetsAvailable} icon={CheckCircle2} />
            <KpiCard label="Allocated" value={data.assetsAllocated} icon={Boxes} />
            <KpiCard label="Maintenance Today" value={data.maintenanceToday} icon={Wrench} />
            <KpiCard label="Active Bookings" value={data.activeBookings} icon={CalendarClock} />
            <KpiCard label="Pending Transfers" value={data.pendingTransfers} icon={ArrowLeftRight} />
            <KpiCard label="Overdue Returns" value={data.overdueReturns} icon={AlertTriangle} tone="warning" />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">Assets by status</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b6fed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

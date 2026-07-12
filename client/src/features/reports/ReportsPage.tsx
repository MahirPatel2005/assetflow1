import { useQuery } from "@tanstack/react-query";
import { reportApi } from "../../services/domainApi";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export default function ReportsPage() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["reports-summary"],
    queryFn: reportApi.getSummary,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Analytics & Reports</h1>
        <p className="text-sm text-slate-500">Asset distribution, values, and category breakdowns.</p>
      </div>

      {isLoading || !summary ? (
        <div className="text-sm text-slate-500">Loading report metrics…</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">Active Asset Count</span>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{summary.totalAssets}</h3>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">Total Valuation (Acquisition Cost)</span>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">
                ${summary.totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown Chart */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">Valuation by Category</h3>
                <p className="text-2xs text-slate-400">Total acquisition cost grouped by asset categories</p>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={summary.byCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="categoryName" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => [`$${value}`, "Valuation"]} />
                  <Bar dataKey="valuation" fill="#3b6fed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Status Breakdown Table & Chart */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">Asset Count by Status</h3>
                <p className="text-2xs text-slate-400">Inventory counts grouped by asset statuses</p>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={summary.byStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

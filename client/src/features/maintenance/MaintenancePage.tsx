import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { maintenanceApi, aiApi } from "../../services/domainApi";
import { assetApi } from "../../services/assetApi";
import { StatusPill } from "../../components/StatusPill";
import { useAuthStore } from "../../store/authStore";
import { Sparkles } from "lucide-react";

interface FormValues {
  assetId: number;
  priority: string;
  issueDescription: string;
}

export default function MaintenancePage() {
  const [showForm, setShowForm] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canApprove = user?.role === "Admin" || user?.role === "AssetManager";

  const { data: requests, isLoading } = useQuery({ queryKey: ["maintenance"], queryFn: maintenanceApi.list });
  const { data: assets } = useQuery({ queryKey: ["all-assets"], queryFn: () => assetApi.search({ pageSize: 100 }) });

  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: { priority: "Medium" } });

  const aiMutation = useMutation({
    mutationFn: () => aiApi.analyzeMaintenance(),
    onSuccess: (data) => {
      setAiReport(data.report);
      toast.success("Predictive Maintenance Report generated");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? "AI analysis failed");
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["maintenance"] });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => maintenanceApi.create({ ...values, assetId: Number(values.assetId) }),
    onSuccess: () => {
      toast.success("Maintenance request raised");
      invalidate();
      reset();
      setShowForm(false);
    },
    onError: () => toast.error("Failed to raise request"),
  });

  const approveMutation = useMutation({ mutationFn: (id: number) => maintenanceApi.approve(id), onSuccess: invalidate });
  const rejectMutation = useMutation({ mutationFn: (id: number) => maintenanceApi.reject(id), onSuccess: invalidate });
  const resolveMutation = useMutation({
    mutationFn: (id: number) => maintenanceApi.resolve(id, { resolutionNotes: "Resolved via UI" }),
    onSuccess: () => {
      toast.success("Marked resolved");
      invalidate();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Maintenance</h1>
          <p className="text-sm text-slate-500">Raise, approve, and track repair requests.</p>
        </div>
        <div className="flex gap-2">
          {canApprove && (
            <button
              onClick={() => aiMutation.mutate()}
              disabled={aiMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
            >
              <Sparkles size={15} className={aiMutation.isPending ? "animate-spin" : ""} />
              {aiMutation.isPending ? "Analyzing…" : "Run AI Analysis"}
            </button>
          )}
          <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            {showForm ? "Close" : "Raise request"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              {user?.role === "Employee" ? "Assigned Asset" : "Asset"}
            </label>
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" {...register("assetId", { required: true })}>
              <option value="">Select…</option>
              {assets?.items.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Priority</label>
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" {...register("priority")}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Issue</label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" {...register("issueDescription", { required: true })} placeholder="Describe the issue" />
          </div>
          <div className="col-span-2 md:col-span-4">
            <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
              Submit request
            </button>
          </div>
        </form>
      )}

      {/* AI Predictive Maintenance Report */}
      {aiReport && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-indigo-800 flex items-center gap-1.5">
              <Sparkles size={15} /> Predictive Maintenance Report
            </h3>
            <button onClick={() => setAiReport(null)} className="text-xs text-slate-500 hover:underline">Dismiss</button>
          </div>
          <div className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">{aiReport}</div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3">Issue</th>
              <th className="px-4 py-3">Raised By</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>
            ) : requests?.length ? (
              requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <div>{r.asset_name}</div>
                    <div className="text-3xs font-mono text-slate-400">{r.asset_tag}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{r.issue_description}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{r.raised_by_name ?? `User #${r.raised_by_user_id}`}</td>
                  <td className="px-4 py-3 text-slate-500">{r.priority}</td>
                  <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                  <td className="px-4 py-3 text-right space-x-3">
                    {canApprove && r.status === "Pending" && (
                      <>
                        <button onClick={() => approveMutation.mutate(r.id)} className="text-xs font-medium text-emerald-600 hover:underline">Approve</button>
                        <button onClick={() => rejectMutation.mutate(r.id)} className="text-xs font-medium text-red-600 hover:underline">Reject</button>
                      </>
                    )}
                    {canApprove && (r.status === "Approved" || r.status === "In Progress") && (
                      <button onClick={() => resolveMutation.mutate(r.id)} className="text-xs font-medium text-brand-600 hover:underline">Mark resolved</button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No maintenance requests.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

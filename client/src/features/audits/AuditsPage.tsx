import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auditApi, aiApi, orgApi, type Audit, type AuditItem } from "../../services/domainApi";
import { useAuthStore } from "../../store/authStore";
import { Plus, Check, AlertCircle, X, ShieldAlert, ClipboardCheck, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";

export default function AuditsPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [selectedAuditId, setSelectedAuditId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [aiAuditReport, setAiAuditReport] = useState<string | null>(null);

  const { data: audits, isLoading } = useQuery({
    queryKey: ["audits"],
    queryFn: auditApi.list,
  });

  const { data: activeAudit, isLoading: loadingActive } = useQuery({
    queryKey: ["audit-detail", selectedAuditId],
    queryFn: () => auditApi.getOne(selectedAuditId!),
    enabled: selectedAuditId !== null,
  });

  const closeAuditMutation = useMutation({
    mutationFn: (id: number) => auditApi.close(id),
    onSuccess: () => {
      toast.success("Audit closed successfully");
      queryClient.invalidateQueries({ queryKey: ["audits"] });
      if (selectedAuditId) {
        queryClient.invalidateQueries({ queryKey: ["audit-detail", selectedAuditId] });
      }
    },
  });

  const verifyItemMutation = useMutation({
    mutationFn: ({
      auditId,
      itemId,
      status,
      remarks,
    }: {
      auditId: number;
      itemId: number;
      status: string;
      remarks: string;
    }) => auditApi.updateItem(auditId, itemId, { status, remarks }),
    onSuccess: () => {
      toast.success("Item verification recorded");
      queryClient.invalidateQueries({ queryKey: ["audit-detail", selectedAuditId] });
      queryClient.invalidateQueries({ queryKey: ["audits"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
    onError: () => toast.error("Verification failed"),
  });

  const isAdmin = user?.role === "Admin";
  const isAuditor = user?.role === "AssetManager";

  const aiAuditMutation = useMutation({
    mutationFn: (auditId: number) => aiApi.analyzeAudit(auditId),
    onSuccess: (data) => {
      setAiAuditReport(data.report);
      toast.success("Smart Auditor report generated");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? "AI audit analysis failed");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Stock Audits</h1>
          <p className="text-sm text-slate-500">Plan, track, and verify physical asset inventory.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <Plus size={16} /> Schedule audit
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Audits List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Audits list</h2>
          {isLoading ? (
            <div className="text-sm text-slate-500">Loading audits…</div>
          ) : audits?.length ? (
            <div className="space-y-3">
              {audits.map((audit: Audit) => (
                <button
                  key={audit.id}
                  onClick={() => setSelectedAuditId(audit.id)}
                  className={`w-full text-left rounded-xl border p-4 shadow-sm transition-all ${
                    selectedAuditId === audit.id
                      ? "border-brand-500 bg-brand-50/20 ring-1 ring-brand-500"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold uppercase text-slate-500">
                      Scope: {audit.scope_type} {audit.scope_value ? `(${audit.scope_value})` : ""}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${
                        audit.status === "Closed"
                          ? "bg-slate-100 text-slate-700"
                          : "bg-amber-100 text-amber-700 animate-pulse"
                      }`}
                    >
                      {audit.status}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-800 mt-1">Audit #{audit.id}</h3>
                  <p className="text-xs text-slate-400 mt-1">Started: {new Date(audit.start_date).toLocaleDateString()}</p>
                  {audit.total_items !== undefined && (
                    <div className="mt-3">
                      <div className="flex justify-between text-2xs font-medium text-slate-500 mb-1">
                        <span>Progress</span>
                        <span>
                          {audit.verified_items} / {audit.total_items} items
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 transition-all duration-300"
                          style={{
                            width: `${audit.total_items ? (audit.verified_items! / audit.total_items) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-400 italic">No audits found.</div>
          )}
        </div>

        {/* Audit Details Panel */}
        <div className="lg:col-span-2">
          {selectedAuditId === null ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white p-6 text-slate-400">
              <ClipboardCheck size={36} className="text-slate-300 mb-2" />
              <p className="text-sm font-medium">Select an audit from the list to view items</p>
            </div>
          ) : loadingActive || !activeAudit ? (
            <div className="text-sm text-slate-500">Loading audit details…</div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Audit #{activeAudit.id} Details</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Created by: <span className="font-semibold text-slate-700">{activeAudit.creator_name ?? "Admin"}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  {(isAdmin || isAuditor) && (
                    <button
                      onClick={() => aiAuditMutation.mutate(activeAudit.id)}
                      disabled={aiAuditMutation.isPending}
                      className="flex items-center gap-1.5 rounded border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                    >
                      <Sparkles size={13} className={aiAuditMutation.isPending ? "animate-spin" : ""} />
                      {aiAuditMutation.isPending ? "Analyzing…" : "Smart Auditor"}
                    </button>
                  )}
                  {isAdmin && activeAudit.status === "In Progress" && (
                    <button
                      onClick={() => closeAuditMutation.mutate(activeAudit.id)}
                      disabled={closeAuditMutation.isPending}
                      className="rounded bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                    >
                      Close Audit
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Asset Checklist</h3>
                <div className="divide-y divide-slate-100">
                  {activeAudit.items?.map((item: AuditItem) => (
                    <AuditItemRow
                      key={item.id}
                      item={item}
                      auditStatus={activeAudit.status}
                      canVerify={isAuditor || isAdmin}
                      onVerify={(status, remarks) =>
                        verifyItemMutation.mutate({
                          auditId: activeAudit.id,
                          itemId: item.id,
                          status,
                          remarks,
                        })
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Smart Auditor AI Report */}
              {aiAuditReport && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-indigo-800 flex items-center gap-1.5">
                      <Sparkles size={15} /> Smart Auditor Report
                    </h3>
                    <button onClick={() => setAiAuditReport(null)} className="text-xs text-slate-500 hover:underline">Dismiss</button>
                  </div>
                  <div className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">{aiAuditReport}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && <CreateAuditModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}

function AuditItemRow({
  item,
  auditStatus,
  canVerify,
  onVerify,
}: {
  item: AuditItem;
  auditStatus: string;
  canVerify: boolean;
  onVerify: (status: string, remarks: string) => void;
}) {
  const [showVerifyPanel, setShowVerifyPanel] = useState(false);
  const [status, setStatus] = useState<string>(item.verification_status);
  const [remarks, setRemarks] = useState<string>(item.remarks ?? "");

  const isPending = item.verification_status === "Pending";

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-slate-600">{item.asset_tag}</span>
            <span className="font-semibold text-slate-800 text-sm">{item.asset_name}</span>
          </div>
          <p className="text-2xs text-slate-500 mt-0.5">
            Location: {item.asset_location ?? "—"} | Auditor: {item.auditor_name ?? "Unassigned"}
          </p>
          {item.remarks && <p className="text-2xs italic text-slate-400 mt-1">Remarks: {item.remarks}</p>}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${
              item.verification_status === "Verified"
                ? "bg-emerald-50 text-emerald-700"
                : item.verification_status === "Missing"
                ? "bg-rose-50 text-rose-700"
                : item.verification_status === "Damaged"
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-50 text-slate-600"
            }`}
          >
            {item.verification_status}
          </span>

          {canVerify && auditStatus === "In Progress" && isPending && (
            <button
              onClick={() => setShowVerifyPanel(!showVerifyPanel)}
              className="rounded border border-slate-200 p-1 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            >
              Verify
            </button>
          )}
        </div>
      </div>

      {showVerifyPanel && (
        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xs font-semibold text-slate-600">Verification Result:</span>
            <div className="flex gap-1.5">
              {["Verified", "Damaged", "Missing"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setStatus(opt)}
                  className={`rounded px-2 py-0.5 text-2xs font-medium border ${
                    status === opt
                      ? "bg-brand-500 text-white border-brand-500"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 items-end">
            <input
              placeholder="Add audit notes/remarks..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs"
            />
            <button
              onClick={() => {
                onVerify(status, remarks);
                setShowVerifyPanel(false);
              }}
              className="rounded bg-brand-500 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-600"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateAuditModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, watch } = useForm({
    defaultValues: { scopeType: "all", scopeValue: "", auditorUserId: "", startDate: new Date().toISOString().split("T")[0] },
  });

  const scopeType = watch("scopeType");

  const { data: departments } = useQuery({ queryKey: ["departments"], queryFn: orgApi.listDepartments });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: orgApi.listCategories });
  const { data: employees } = useQuery({ queryKey: ["employees"], queryFn: orgApi.listEmployees });

  const createMutation = useMutation({
    mutationFn: (values: any) =>
      auditApi.create({
        scopeType: values.scopeType,
        scopeValue: values.scopeType !== "all" ? values.scopeValue : undefined,
        startDate: values.startDate,
        auditorUserId: values.auditorUserId ? Number(values.auditorUserId) : undefined,
      }),
    onSuccess: () => {
      toast.success("Stock audit scheduled");
      queryClient.invalidateQueries({ queryKey: ["audits"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="text-lg font-semibold text-slate-900">Schedule Stock Audit</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Audit Scope Type</label>
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" {...register("scopeType")}>
              <option value="all">Entire Register (All Assets)</option>
              <option value="department">By Department</option>
              <option value="category">By Asset Category</option>
            </select>
          </div>

          {scopeType === "department" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Select Department</label>
              <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" {...register("scopeValue", { required: true })}>
                <option value="">Choose department...</option>
                {departments?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {scopeType === "category" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Select Category</label>
              <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" {...register("scopeValue", { required: true })}>
                <option value="">Choose category...</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Assign Lead Auditor</label>
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" {...register("auditorUserId")}>
              <option value="">Unassigned</option>
              {employees?.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Start Date</label>
            <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" {...register("startDate", { required: true })} />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {createMutation.isPending ? "Scheduling…" : "Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

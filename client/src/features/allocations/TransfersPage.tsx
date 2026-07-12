import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assetApi, type TransferRequest, type Allocation } from "../../services/assetApi";
import { orgApi } from "../../services/domainApi";
import { useAuthStore } from "../../store/authStore";
import toast from "react-hot-toast";

type TabType = "workspace" | "approvals";

export default function TransfersPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("workspace");

  // Selection state
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [transferReason, setTransferReason] = useState<string>("");

  // Direct Allocation Form state
  const [allocateUserId, setAllocateUserId] = useState<string>("");
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>("");

  // State-based Return Modal (fixes window.prompt closing bug!)
  const [returnModalAlloc, setReturnModalAlloc] = useState<Allocation | null>(null);
  const [returnCondition, setReturnCondition] = useState<string>("Good");

  // State-based confirmation modal for approvals/rejections (fixes window.confirm bug!)
  const [confirmModalData, setConfirmModalData] = useState<{ id: number; action: "approve" | "reject" } | null>(null);

  // Queries
  const { data: assets } = useQuery({
    queryKey: ["all-assets-list"],
    queryFn: () => assetApi.search({ pageSize: 100 }),
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-list"],
    queryFn: orgApi.listEmployees,
  });

  const { data: assetDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["asset-history", selectedAssetId],
    queryFn: () => assetApi.getOne(selectedAssetId!),
    enabled: selectedAssetId !== null,
  });

  const { data: transfers, isLoading: loadingTransfers } = useQuery({
    queryKey: ["transfers"],
    queryFn: assetApi.listTransfers,
  });

  const { data: activeAllocations, isLoading: loadingAllocations } = useQuery({
    queryKey: ["active-allocations-tab"],
    queryFn: assetApi.listActiveAllocations,
  });

  // Mutations
  const transferMutation = useMutation({
    mutationFn: (payload: { assetId: number; requestedToUserId: number; reason: string }) =>
      assetApi.requestTransfer(payload),
    onSuccess: () => {
      toast.success("Transfer request submitted successfully");
      setTargetUserId("");
      setTransferReason("");
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      if (selectedAssetId) {
        queryClient.invalidateQueries({ queryKey: ["asset-history", selectedAssetId] });
      }
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Transfer failed";
      toast.error(msg);
    },
  });

  const allocateMutation = useMutation({
    mutationFn: (payload: { assetId: number; userId: number; expectedReturnDate?: string }) =>
      assetApi.allocate(payload.assetId, {
        userId: payload.userId,
        expectedReturnDate: payload.expectedReturnDate || null,
      }),
    onSuccess: () => {
      toast.success("Asset allocated successfully");
      setAllocateUserId("");
      setExpectedReturnDate("");
      queryClient.invalidateQueries({ queryKey: ["active-allocations-tab"] });
      queryClient.invalidateQueries({ queryKey: ["all-assets-list"] });
      if (selectedAssetId) {
        queryClient.invalidateQueries({ queryKey: ["asset-history", selectedAssetId] });
      }
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Allocation failed";
      toast.error(msg);
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => assetApi.approveTransfer(id),
    onSuccess: () => {
      toast.success("Transfer approved");
      setConfirmModalData(null);
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["active-allocations-tab"] });
      queryClient.invalidateQueries({ queryKey: ["all-assets-list"] });
      if (selectedAssetId) {
        queryClient.invalidateQueries({ queryKey: ["asset-history", selectedAssetId] });
      }
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Approval failed";
      toast.error(msg);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => assetApi.rejectTransfer(id),
    onSuccess: () => {
      toast.success("Transfer request rejected");
      setConfirmModalData(null);
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
    },
    onError: () => toast.error("Rejection failed"),
  });

  const returnMutation = useMutation({
    mutationFn: ({ assetId, condition }: { assetId: number; condition: string }) =>
      assetApi.return(assetId, condition),
    onSuccess: () => {
      toast.success("Asset returned successfully");
      setReturnModalAlloc(null);
      queryClient.invalidateQueries({ queryKey: ["active-allocations-tab"] });
      queryClient.invalidateQueries({ queryKey: ["all-assets-list"] });
      if (selectedAssetId) {
        queryClient.invalidateQueries({ queryKey: ["asset-history", selectedAssetId] });
      }
    },
    onError: () => toast.error("Return failed"),
  });

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !targetUserId) return;
    transferMutation.mutate({
      assetId: selectedAssetId,
      requestedToUserId: Number(targetUserId),
      reason: transferReason,
    });
  };

  const handleAllocateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !allocateUserId) return;
    allocateMutation.mutate({
      assetId: selectedAssetId,
      userId: Number(allocateUserId),
      expectedReturnDate: expectedReturnDate || undefined,
    });
  };

  const isManager = user?.role === "Admin" || user?.role === "AssetManager";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Allocation & Transfer</h1>
        <p className="text-sm text-slate-500">Track and manage asset allocations and request peer transfers.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("workspace")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "workspace"
              ? "border-brand-500 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Asset Workspace
        </button>
        <button
          onClick={() => setActiveTab("approvals")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "approvals"
              ? "border-brand-500 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Active Allocations & Pending Transfers
        </button>
      </div>

      {activeTab === "workspace" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Form Side */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Asset Selection</h2>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Select Asset</label>
                <select
                  value={selectedAssetId ?? ""}
                  onChange={(e) => {
                    setSelectedAssetId(e.target.value ? Number(e.target.value) : null);
                    setTargetUserId("");
                    setTransferReason("");
                    setAllocateUserId("");
                    setExpectedReturnDate("");
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Choose asset...</option>
                  {assets?.items.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.asset_tag} — {a.name} ({a.status})
                    </option>
                  ))}
                </select>
              </div>

              {selectedAssetId && loadingDetail && (
                <div className="text-sm text-slate-400 italic">Fetching asset details…</div>
              )}

              {selectedAssetId && assetDetail && (
                <>
                  {/* Status Banner */}
                  {assetDetail.status === "Allocated" ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-4 space-y-1">
                      <div className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                        Already Allocated to {assetDetail.current_holder_name ?? `User #${assetDetail.current_holder_user_id}`}
                        {assetDetail.current_department_name ? ` (${assetDetail.current_department_name})` : ""}
                      </div>
                      <p className="text-2xs text-rose-600">
                        Direct re-allocation is blocked — submit a transfer request below.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                      <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                        Asset is Available
                      </div>
                      <p className="text-2xs text-emerald-600">
                        You can directly allocate this asset to an employee.
                      </p>
                    </div>
                  )}

                  {/* Dynamic Form block */}
                  {assetDetail.status === "Allocated" ? (
                    <form onSubmit={handleTransferSubmit} className="space-y-4 pt-2 border-t">
                      <h3 className="text-sm font-semibold text-slate-700">Submit Transfer Request</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs text-slate-500 font-medium">From</label>
                          <input
                            disabled
                            value={assetDetail.current_holder_name ?? `User #${assetDetail.current_holder_user_id}`}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-slate-500 font-medium">To</label>
                          <select
                            required
                            value={targetUserId}
                            onChange={(e) => setTargetUserId(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          >
                            <option value="">Select Employee...</option>
                            {employees
                              ?.filter((e) => e.id !== assetDetail.current_holder_user_id)
                              .map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.name} ({emp.role})
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500 font-medium">Reason</label>
                        <textarea
                          required
                          rows={3}
                          value={transferReason}
                          onChange={(e) => setTransferReason(e.target.value)}
                          placeholder="Why is this transfer requested?"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={transferMutation.isPending}
                        className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                      >
                        Submit Request
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleAllocateSubmit} className="space-y-4 pt-2 border-t">
                      <h3 className="text-sm font-semibold text-slate-700">Direct Allocation Form</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs text-slate-500 font-medium">Allocate To</label>
                          <select
                            required
                            value={allocateUserId}
                            onChange={(e) => setAllocateUserId(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          >
                            <option value="">Select Employee...</option>
                            {employees?.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name} ({emp.role})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-slate-500 font-medium">Expected Return Date</label>
                          <input
                            type="date"
                            value={expectedReturnDate}
                            onChange={(e) => setExpectedReturnDate(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={allocateMutation.isPending}
                        className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                      >
                        Confirm Allocation
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>

          {/* History Side */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 min-h-[300px]">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Allocation history</h2>
              {!selectedAssetId ? (
                <div className="text-sm text-slate-400 italic">Select an asset to view its history.</div>
              ) : loadingDetail ? (
                <div className="text-sm text-slate-400 italic">Loading history logs…</div>
              ) : assetDetail?.history?.length ? (
                <div className="relative border-l border-slate-200 pl-4 space-y-4">
                  {assetDetail.history.map((log: any) => (
                    <div key={log.id} className="text-xs">
                      <span className="font-semibold text-slate-500 block">
                        {new Date(log.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      <p className="text-slate-700 mt-0.5">
                        {log.status === "Active" ? "Allocated to " : "Returned by "}
                        <span className="font-semibold text-slate-800">{log.allocated_to_name}</span>
                        {log.department_name ? ` (${log.department_name})` : ""}
                        {log.condition_on_return ? (
                          <span className="text-slate-400 italic block mt-0.5">Condition: {log.condition_on_return}</span>
                        ) : null}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">No allocation events logged for this asset.</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Allocations Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 p-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Active Allocations</h3>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Asset Tag</th>
                  <th className="px-4 py-3">Asset Name</th>
                  <th className="px-4 py-3">Allocated To</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Allocated By</th>
                  <th className="px-4 py-3">Expected Return</th>
                  {isManager && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingAllocations ? (
                  <tr>
                    <td colSpan={isManager ? 7 : 6} className="px-4 py-6 text-center text-slate-400">
                      Loading allocations…
                    </td>
                  </tr>
                ) : activeAllocations?.length ? (
                  activeAllocations.map((alloc) => (
                    <tr key={alloc.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-600">
                        {alloc.asset_tag}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{alloc.asset_name}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {alloc.allocated_to_name ?? `User #${alloc.allocated_to_user_id}`}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{alloc.department_name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {alloc.allocated_by_name ?? `User #${alloc.allocated_by_user_id}`}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {alloc.expected_return_date
                          ? new Date(alloc.expected_return_date).toLocaleDateString()
                          : "—"}
                      </td>
                      {isManager && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setReturnModalAlloc(alloc)}
                            className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Mark Returned
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isManager ? 7 : 6} className="px-4 py-6 text-center text-slate-400">
                      No active allocations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pending Transfer Requests */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 p-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Pending Transfer Requests</h3>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Asset Tag</th>
                  <th className="px-4 py-3">Asset Name</th>
                  <th className="px-4 py-3">From (Requester)</th>
                  <th className="px-4 py-3">To (User/Dept)</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingTransfers ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                      Loading transfer requests…
                    </td>
                  </tr>
                ) : transfers?.length ? (
                  transfers.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-600">
                        {req.asset_tag}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{req.asset_name}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {req.requester_name ?? `User #${req.requested_by_user_id}`}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {req.receiver_name ? `${req.receiver_name} ` : ""}
                        {req.department_name ? `(${req.department_name})` : ""}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs italic">{req.reason ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            req.status === "Approved"
                              ? "bg-emerald-50 text-emerald-700"
                              : req.status === "Rejected"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {req.status === "Pending" && (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setConfirmModalData({ id: req.id, action: "approve" })}
                              className="rounded bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-600"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setConfirmModalData({ id: req.id, action: "reject" })}
                              className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                      No transfer requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Return Modal (Replaces window.prompt) */}
      {returnModalAlloc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-md font-semibold text-slate-900">Return Asset: {returnModalAlloc.asset_name}</h3>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Condition on Return</label>
              <select
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="Good">Good</option>
                <option value="Scratched">Scratched</option>
                <option value="Damaged">Damaged</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setReturnModalAlloc(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  returnMutation.mutate({
                    assetId: returnModalAlloc.asset_id,
                    condition: returnCondition,
                  })
                }
                disabled={returnMutation.isPending}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                Confirm Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal (Replaces window.confirm for approvals/rejections) */}
      {confirmModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-md font-semibold text-slate-900">Confirm Action</h3>
            <p className="text-sm text-slate-500">
              Are you sure you want to {confirmModalData.action} this transfer request?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setConfirmModalData(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmModalData.action === "approve") {
                    approveMutation.mutate(confirmModalData.id);
                  } else {
                    rejectMutation.mutate(confirmModalData.id);
                  }
                }}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

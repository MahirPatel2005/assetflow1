import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { assetApi } from "../../services/assetApi";
import { StatusPill } from "../../components/StatusPill";
import { useAuthStore } from "../../store/authStore";

export default function AssetDetailPage() {
  const { id } = useParams();
  const assetId = Number(id);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === "Admin" || user?.role === "AssetManager";

  const { data: asset, isLoading } = useQuery({
    queryKey: ["asset", assetId],
    queryFn: () => assetApi.getOne(assetId),
  });

  const { register, handleSubmit, reset } = useForm<{ userId: number; expectedReturnDate: string }>();

  const allocateMutation = useMutation({
    mutationFn: (values: { userId: number; expectedReturnDate: string }) =>
      assetApi.allocate(assetId, { userId: Number(values.userId), expectedReturnDate: values.expectedReturnDate || null }),
    onSuccess: () => {
      toast.success("Asset allocated");
      queryClient.invalidateQueries({ queryKey: ["asset", assetId] });
      reset();
    },
    onError: (err: unknown) => {
      const data = (err as { response?: { data?: { error?: string; details?: { canRequestTransfer?: boolean } } } })
        ?.response?.data;
      toast.error(data?.error ?? "Allocation failed");
    },
  });

  const returnMutation = useMutation({
    mutationFn: () => assetApi.return(assetId, "Good"),
    onSuccess: () => {
      toast.success("Asset returned");
      queryClient.invalidateQueries({ queryKey: ["asset", assetId] });
    },
    onError: () => toast.error("Return failed"),
  });

  const transferMutation = useMutation({
    mutationFn: (userId: number) => assetApi.requestTransfer({ assetId, requestedToUserId: userId, reason: "Requested via UI" }),
    onSuccess: () => toast.success("Transfer request submitted"),
    onError: () => toast.error("Transfer request failed"),
  });

  if (isLoading || !asset) return <div className="text-sm text-slate-500">Loading asset…</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{asset.name}</h1>
          <StatusPill status={asset.status} />
        </div>
        <p className="font-mono text-sm text-slate-500">{asset.asset_tag}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-sm">
        <Field label="Location" value={asset.location ?? "—"} />
        <Field label="Condition" value={asset.condition} />
        <Field label="Serial number" value={asset.serial_number ?? "—"} />
        <Field label="Shared / bookable" value={asset.shared_bookable ? "Yes" : "No"} />
      </div>

      {canManage && asset.status === "Available" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Allocate this asset</h2>
          <form
            onSubmit={handleSubmit((v) => allocateMutation.mutate(v))}
            className="flex flex-wrap items-end gap-3"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">User ID</label>
              <input
                type="number"
                className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                {...register("userId", { required: true })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Expected return</label>
              <input type="date" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" {...register("expectedReturnDate")} />
            </div>
            <button
              type="submit"
              disabled={allocateMutation.isPending}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              Allocate
            </button>
          </form>
        </div>
      )}

      {asset.status === "Allocated" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Allocation Actions</h2>
          <div className="flex gap-3">
            {canManage && (
              <button
                onClick={() => returnMutation.mutate()}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Mark returned
              </button>
            )}
            <button
              onClick={() => {
                const targetUser = window.prompt("User ID to transfer this asset to:");
                if (targetUser) transferMutation.mutate(Number(targetUser));
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Request transfer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-400">{label}</div>
      <div className="mt-0.5 text-slate-800">{value}</div>
    </div>
  );
}

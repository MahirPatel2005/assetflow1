import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { assetApi, type Asset } from "../../services/assetApi";
import { StatusPill } from "../../components/StatusPill";
import { useAuthStore } from "../../store/authStore";

const STATUSES = ["Available", "Allocated", "Reserved", "Under Maintenance", "Lost", "Retired", "Disposed"];

export default function AssetsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const user = useAuthStore((s) => s.user);
  const canRegister = user?.role === "Admin" || user?.role === "AssetManager";

  const { data, isLoading } = useQuery({
    queryKey: ["assets", q, status, page],
    queryFn: () => assetApi.search({ q: q || undefined, status: status || undefined, page, pageSize: 10 }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Assets</h1>
          <p className="text-sm text-slate-500">Search, filter, and manage the asset register.</p>
        </div>
        {canRegister && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <Plus size={16} /> Register asset
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search by name or tag…"
            className="w-64 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Tag</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Bookable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Loading assets…
                </td>
              </tr>
            ) : data?.items.length ? (
              data.items.map((asset: Asset) => (
                <tr key={asset.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    <Link to={`/assets/${asset.id}`} className="text-brand-600 hover:underline">
                      {asset.asset_tag}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{asset.name}</td>
                  <td className="px-4 py-3 text-slate-500">{asset.location ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={asset.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{asset.shared_bookable ? "Yes" : "No"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No assets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {data.page} of {Math.ceil(data.total / data.pageSize)}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              disabled={page >= Math.ceil(data.total / data.pageSize)}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showForm && <RegisterAssetModal onClose={() => setShowForm(false)} />}
    </div>
  );
}

interface RegisterFormValues {
  assetTag: string;
  name: string;
  location: string;
  condition: string;
  sharedBookable: boolean;
}

function RegisterAssetModal({ onClose }: { onClose: () => void }) {
  const { register, handleSubmit } = useForm<RegisterFormValues>({
    defaultValues: { condition: "Good", sharedBookable: false },
  });
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: RegisterFormValues) => assetApi.create(values),
    onSuccess: () => {
      toast.success("Asset registered");
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      onClose();
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to register asset";
      toast.error(message);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Register asset</h2>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Asset tag</label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" {...register("assetTag", { required: true })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" {...register("name", { required: true })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Location</label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" {...register("location")} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" {...register("sharedBookable")} /> Shared / bookable resource
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {mutation.isPending ? "Saving…" : "Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

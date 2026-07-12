import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { bookingApi } from "../../services/domainApi";
import { assetApi } from "../../services/assetApi";
import { StatusPill } from "../../components/StatusPill";
import { useAuthStore } from "../../store/authStore";

interface FormValues {
  assetId: number;
  resourceName: string;
  startTime: string;
  endTime: string;
  notes?: string;
  userId?: number;
}

export default function BookingsPage() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isDeptHead = user?.role === "DepartmentHead";

  const { data: bookings, isLoading } = useQuery({ queryKey: ["bookings"], queryFn: () => bookingApi.list() });
  const { data: assets } = useQuery({
    queryKey: ["bookable-assets"],
    queryFn: () => assetApi.search({ pageSize: 100 }),
  });
  const bookableAssets = assets?.items.filter((a) => a.shared_bookable) ?? [];

  const { register, handleSubmit, reset } = useForm<FormValues>();

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      bookingApi.create({
        ...values,
        assetId: Number(values.assetId),
        startTime: new Date(values.startTime).toISOString(),
        endTime: new Date(values.endTime).toISOString(),
        userId: values.userId ? Number(values.userId) : undefined,
      }),
    onSuccess: () => {
      toast.success("Booking confirmed");
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      reset();
      setShowForm(false);
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Booking failed";
      toast.error(message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => bookingApi.cancel(id),
    onSuccess: () => {
      toast.success("Booking cancelled");
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Cancel failed";
      toast.error(message);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Resource bookings</h1>
          <p className="text-sm text-slate-500">Overlapping time slots for the same resource are rejected automatically.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          {showForm ? "Close" : "New booking"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit((v) => createMutation.mutate(v))}
          className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-4"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Resource</label>
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" {...register("assetId", { required: true })}>
              <option value="">Select…</option>
              {bookableAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Label</label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" {...register("resourceName", { required: true })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Start</label>
            <input type="datetime-local" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" {...register("startTime", { required: true })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">End</label>
            <input type="datetime-local" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" {...register("endTime", { required: true })} />
          </div>
          {isDeptHead && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">On Behalf of User (ID)</label>
              <input type="number" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="User ID..." {...register("userId")} />
            </div>
          )}
          <div className="col-span-2 md:col-span-4">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {createMutation.isPending ? "Checking availability…" : "Confirm booking"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Resource</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">End</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">Loading…</td>
              </tr>
            ) : bookings?.length ? (
              bookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {b.resource_name}
                    {b.user_name && <span className="text-3xs text-slate-400 block font-normal">Booked by {b.user_name}</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{format(new Date(b.start_time), "MMM d, HH:mm")}</td>
                  <td className="px-4 py-3 text-slate-500">{format(new Date(b.end_time), "MMM d, HH:mm")}</td>
                  <td className="px-4 py-3"><StatusPill status={b.status} /></td>
                  <td className="px-4 py-3 text-right">
                    {b.status === "Upcoming" && (
                      <button onClick={() => cancelMutation.mutate(b.id)} className="text-xs font-medium text-red-600 hover:underline">
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">No bookings yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "../../services/domainApi";
import { Check, MailOpen } from "lucide-react";
import toast from "react-hot-toast";

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationApi.list,
  });

  const readMutation = useMutation({
    mutationFn: (id: number) => notificationApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-sidebar"] });
    },
    onError: () => toast.error("Failed to mark read"),
  });

  const markAllRead = async () => {
    if (!notifications) return;
    const unread = notifications.filter((n) => !n.read_status);
    await Promise.all(unread.map((n) => notificationApi.markRead(n.id)));
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-sidebar"] });
    toast.success("All marked read");
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500">Stay up to date with allocation activities and alerts.</p>
        </div>
        {notifications && notifications.some((n) => !n.read_status) && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <MailOpen size={14} /> Mark all read
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-6 text-center text-slate-400 text-sm">Loading notifications…</div>
        ) : notifications?.length ? (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 flex gap-4 items-start transition-colors ${
                notif.read_status ? "bg-white" : "bg-brand-50/10"
              }`}
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm ${notif.read_status ? "text-slate-700" : "font-semibold text-slate-900"}`}>
                    {notif.title}
                  </h3>
                  <span className="text-3xs text-slate-400">
                    {new Date(notif.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{notif.message}</p>
              </div>

              {!notif.read_status && (
                <button
                  onClick={() => readMutation.mutate(notif.id)}
                  disabled={readMutation.isPending}
                  className="rounded border border-slate-200 p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                  title="Mark as read"
                >
                  <Check size={14} />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-slate-400 text-sm">You have no notifications.</div>
        )}
      </div>
    </div>
  );
}

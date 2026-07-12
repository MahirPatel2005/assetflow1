import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Boxes, 
  CalendarClock, 
  Wrench, 
  Building2, 
  LogOut, 
  ArrowLeftRight, 
  ClipboardCheck, 
  BarChart3, 
  Bell,
  Sparkles
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { authApi } from "../services/authApi";
import { useQuery } from "@tanstack/react-query";
import { notificationApi } from "../services/domainApi";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ai-assistant", label: "AI Assistant", icon: Sparkles },
  { to: "/assets", label: "Assets", icon: Boxes },
  { to: "/transfers", label: "Allocation & Transfer", icon: ArrowLeftRight },
  { to: "/bookings", label: "Resource Booking", icon: CalendarClock },
  { to: "/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/audits", label: "Audits", icon: ClipboardCheck, roles: ["Admin", "AssetManager", "DepartmentHead"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["Admin", "AssetManager", "DepartmentHead"] },
  { to: "/org-setup", label: "Org Setup", icon: Building2, roles: ["Admin"] },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();

  const { data: notifications } = useQuery({
    queryKey: ["notifications-sidebar"],
    queryFn: notificationApi.list,
    refetchInterval: 15_000,
    enabled: !!user,
  });

  const unreadCount = notifications?.filter((n) => !n.read_status).length ?? 0;

  async function handleLogout() {
    await authApi.logout().catch(() => undefined);
    clear();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
          <div className="h-8 w-8 rounded-lg bg-brand-500" />
          <span className="text-lg font-semibold text-slate-900">AssetFlow</span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {navItems
            .filter((item) => !item.roles || (user?.role && item.roles.includes(user.role)))
            .map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                <Icon size={18} />
                <span className="flex-1">{label}</span>
                {label === "Notifications" && unreadCount > 0 && (
                  <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-xs font-semibold text-white">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="text-sm text-slate-500">
            Signed in as <span className="font-medium text-slate-800">{user?.name}</span>{" "}
            <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{user?.role}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            <LogOut size={16} /> Logout
          </button>
        </header>
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

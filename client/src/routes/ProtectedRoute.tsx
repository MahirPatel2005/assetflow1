import { type ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore, type Role } from "../store/authStore";

interface Props {
  children: ReactElement;
  roles?: Role[];
}

export function ProtectedRoute({ children, roles }: Props) {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

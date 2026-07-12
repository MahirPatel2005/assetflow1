import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "Admin" | "AssetManager" | "DepartmentHead" | "Employee";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  departmentId: number | null;
  status: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  setSession: (user: AuthUser, accessToken: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setSession: (user, accessToken) => set({ user, accessToken }),
      clear: () => set({ user: null, accessToken: null }),
    }),
    {
      name: "assetflow-auth",
      // Only persist the user for a nicer reload UX; the access token is short-lived
      // and gets refreshed via the httpOnly cookie on load.
      partialize: (state) => ({ user: state.user }),
    }
  )
);

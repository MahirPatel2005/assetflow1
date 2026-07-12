import { api } from "../lib/api";
import type { AuthUser } from "../store/authStore";

export interface SessionResponse {
  user: AuthUser;
  accessToken: string;
}

export const authApi = {
  signup: (payload: { name: string; email: string; password: string }) =>
    api.post<SessionResponse>("/auth/signup", payload).then((r) => r.data),
  login: (payload: { email: string; password: string }) =>
    api.post<SessionResponse>("/auth/login", payload).then((r) => r.data),
  refresh: () => api.post<SessionResponse>("/auth/refresh").then((r) => r.data),
  logout: () => api.post("/auth/logout"),
};

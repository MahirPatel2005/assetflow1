import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/authStore";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api",
  withCredentials: true, // send the httpOnly refresh cookie
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      refreshPromise ??= refreshAccessToken();
      const newToken = await refreshPromise;
      refreshPromise = null;

      if (newToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      useAuthStore.getState().clear();
    }
    return Promise.reject(error);
  }
);

async function refreshAccessToken(): Promise<string | null> {
  try {
    const { data } = await axios.post(
      `${import.meta.env.VITE_API_URL ?? "http://localhost:3000/api"}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    useAuthStore.getState().setSession(data.user, data.accessToken);
    return data.accessToken as string;
  } catch {
    return null;
  }
}

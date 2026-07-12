import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { authApi } from "../../services/authApi";
import { useAuthStore } from "../../store/authStore";

interface FormValues {
  name: string;
  email: string;
  password: string;
}

export default function SignupPage() {
  const { register, handleSubmit } = useForm<FormValues>();
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const data = await authApi.signup(values);
      setSession(data.user, data.accessToken);
      toast.success("Account created as Employee");
      navigate("/dashboard");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Signup failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand-500" />
          <span className="text-lg font-semibold">AssetFlow</span>
        </div>
        <h1 className="mb-1 text-xl font-semibold text-slate-900">Create your account</h1>
        <p className="mb-6 text-sm text-slate-500">Signup always creates an Employee account. An admin can promote your role later.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              {...register("name", { required: true })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              {...register("email", { required: true })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              {...register("password", { required: true })}
            />
            <p className="mt-1 text-xs text-slate-400">Min 8 chars, upper/lowercase, number & symbol.</p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

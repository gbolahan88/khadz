"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "@/lib/auth";
import { getUserRole } from "@/lib/get-user-role";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      await signIn(email, password);

      const role = await getUserRole();

      console.log("USER ROLE:", role);

      if (
        role === "admin" ||
        role === "super_admin"
      ) {
        router.push("/admin/dashboard");
      } else if (role === "rider") {
        router.push("/rider/dashboard");
      } else {
        setError("Unauthorized access");
      }

    } catch (err: unknown) {
    setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="mb-2 text-3xl font-bold text-black text-center">
          Khadz Staff
        </h1>

        <p className="mb-6 text-sm text-gray-500 text-center">
          Welcome back to Work.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Email
            </label>

            <input
              type="email"
              placeholder="staff@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-black text-black"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Password
            </label>

            <input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-black text-black"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-black py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Login"}
          </button>

          {/* <div className="text-center">
            <p className="text-sm text-gray-600">
              Create an account?{" "}
              <Link href="/admin/signup" className="font-medium text-blue-600 hover:text-blue-500">
                Sign Up
              </Link>
            </p>
          </div> */}
        </form>
      </div>
    </main>
  );
}
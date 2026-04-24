import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  generateSessionToken,
  getCurrentUser,
  setSessionCookie,
} from "@/lib/auth/session";
import { Bloom } from "@/components/watercolor/Bloom";

export const metadata = { title: "Sign in" };

async function login(formData: FormData) {
  "use server";
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) {
    redirect("/admin/login?error=missing");
  }
  const user = db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .get();
  if (!user) redirect("/admin/login?error=invalid");
  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) redirect("/admin/login?error=invalid");

  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await createSession(token, user.id);
  await setSessionCookie(token, expiresAt);
  redirect("/admin");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { user } = await getCurrentUser();
  if (user) redirect("/admin");
  const { error } = await searchParams;
  const msg =
    error === "invalid"
      ? "Those details didn't match. Try again."
      : error === "missing"
        ? "Please fill in both fields."
        : null;

  return (
    <main className="relative mx-auto flex min-h-[80vh] w-full max-w-md flex-col items-center justify-center px-6">
      <Bloom size={120} />
      <div className="paper mt-6 w-full p-8">
        <h1 className="text-center text-3xl text-moss-deep">Welcome back</h1>
        <p className="mt-1 text-center text-sm text-ink-soft">
          Sign in to tend the diary.
        </p>
        <form action={login} className="mt-6 space-y-3">
          <label className="block">
            <span className="text-sm text-ink-soft">Username</span>
            <input
              name="username"
              className="field mt-1"
              autoFocus
              autoComplete="username"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink-soft">Password</span>
            <input
              type="password"
              name="password"
              className="field mt-1"
              autoComplete="current-password"
              required
            />
          </label>
          {msg && <p className="text-sm text-rose">{msg}</p>}
          <button className="btn w-full" type="submit">
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}

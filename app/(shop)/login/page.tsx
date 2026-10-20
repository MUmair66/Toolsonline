import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/permissions";
import type { Metadata } from "next";
import { LoginForm } from "@/components/shop/AuthForms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(isStaffRole(user.role) ? "/admin" : "/account");
  return (
    <div className="container-x flex justify-center py-16">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 mb-8 text-sm text-slate-500">Sign in to your account to continue.</p>
        <LoginForm next={next} />
        <div className="mt-8 rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
          <p className="mb-1 font-semibold text-slate-700">Demo accounts</p>
          <p>Admin: <span className="font-mono">admin@shopnext.com</span> / <span className="font-mono">admin123</span></p>
          <p>Staff: <span className="font-mono">staff@shopnext.com</span> / <span className="font-mono">staff123</span></p>
          <p>Customer:<span className="font-mono">john@example.com</span> / <span className="font-mono">password123</span></p>
        </div>
      </div>
    </div>
  );
}

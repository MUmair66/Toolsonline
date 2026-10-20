import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/permissions";
import type { Metadata } from "next";
import { RegisterForm } from "@/components/shop/AuthForms";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(isStaffRole(user.role) ? "/admin" : "/account");
  return (
    <div className="container-x flex justify-center py-16">
      <div className="card w-full max-w-lg p-8">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="mt-1 mb-8 text-sm text-slate-500">Track orders, save addresses and check out faster.</p>
        <RegisterForm next={next} />
      </div>
    </div>
  );
}

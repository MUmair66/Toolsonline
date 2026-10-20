import type { Metadata } from "next";
import { KeyRound, ShieldAlert, UserCog } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { PasswordForm, ProfileForm } from "@/components/shop/AccountForms";
import { DeleteAccountForm } from "@/components/account/DeleteAccountForm";

export const metadata: Metadata = { title: "Profile & security" };

export default async function AccountSettingsPage() {
  const user = await requireUser();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile & security</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your personal details and keep your account secure.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <section className="card p-6 xl:col-span-3">
          <h2 className="mb-5 flex items-center gap-2 font-semibold"><UserCog className="h-5 w-5 text-brand-600" /> Personal information</h2>
          <ProfileForm user={user} />
        </section>
        <div className="space-y-6 xl:col-span-2">
          <section className="card p-6">
            <h2 className="mb-5 flex items-center gap-2 font-semibold"><KeyRound className="h-5 w-5 text-brand-600" /> Change password</h2>
            <PasswordForm />
          </section>
          <section className="card p-6 text-sm">
            <h2 className="font-semibold">Account details</h2>
            <dl className="mt-3 space-y-2">
              <div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd className="font-medium">{user.email}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Member since</dt><dd className="font-medium">{formatDate(user.createdAt)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Account type</dt><dd className="font-medium capitalize">{user.role.toLowerCase()}</dd></div>
            </dl>
          </section>
        </div>
      </div>

      {user.role === "CUSTOMER" && (
        <section className="card border-red-200 p-6">
          <h2 className="flex items-center gap-2 font-semibold text-red-700"><ShieldAlert className="h-5 w-5" /> Delete account</h2>
          <p className="mt-1 text-sm text-slate-500">This permanently removes your profile, addresses and reviews. Your past orders are kept for our records.</p>
          <DeleteAccountForm />
        </section>
      )}
    </div>
  );
}

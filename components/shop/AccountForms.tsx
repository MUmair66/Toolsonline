"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword, updateProfile } from "@/actions/shop";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";

type U = {
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
};

export function ProfileForm({ user }: { user: U }) {
  const [state, action] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="p-name">Full name</label>
        <input id="p-name" name="name" defaultValue={user.name} className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="p-email">Email</label>
        <input id="p-email" value={user.email} className="input bg-slate-50 text-slate-500" disabled />
      </div>
      <div>
        <label className="label" htmlFor="p-phone">Phone</label>
        <input id="p-phone" name="phone" defaultValue={user.phone ?? ""} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="p-address">Address</label>
        <input id="p-address" name="address" defaultValue={user.address ?? ""} className="input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="p-city">City</label>
          <input id="p-city" name="city" defaultValue={user.city ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="p-postal">Postal code</label>
          <input id="p-postal" name="postalCode" defaultValue={user.postalCode ?? ""} className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="p-country">Country</label>
        <input id="p-country" name="country" defaultValue={user.country ?? ""} className="input" />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Saving...">Save changes</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="pw-current">Current password</label>
        <input id="pw-current" name="current" type="password" className="input" required autoComplete="current-password" />
      </div>
      <div>
        <label className="label" htmlFor="pw-new">New password</label>
        <input id="pw-new" name="password" type="password" className="input" required autoComplete="new-password" />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full" variant="secondary" pendingText="Updating...">Update password</SubmitButton>
    </form>
  );
}

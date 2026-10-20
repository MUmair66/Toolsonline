"use client";

import { useActionState, useState } from "react";
import { deleteMyAccount } from "@/actions/account";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteMyAccount, undefined);
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn mt-4 border border-red-200 text-red-600 hover:bg-red-50">
        I want to delete my account
      </button>
    );
  }
  return (
    <form action={action} className="mt-4 grid max-w-xl gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor="del-pw" className="label">Your password</label>
        <input id="del-pw" name="password" type="password" required className="input" autoComplete="current-password" />
      </div>
      <div>
        <label htmlFor="del-confirm" className="label">Type DELETE to confirm</label>
        <input id="del-confirm" name="confirm" required className="input font-mono" placeholder="DELETE" />
      </div>
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <div className="flex gap-2 sm:col-span-2">
        <SubmitButton variant="danger" pendingText="Deleting…">Permanently delete</SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

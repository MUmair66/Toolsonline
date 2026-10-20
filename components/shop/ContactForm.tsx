"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendMessage } from "@/actions/shop";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";

export function ContactForm() {
  const [state, action] = useActionState(sendMessage, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="grid gap-5 sm:grid-cols-2">
      <div>
        <label htmlFor="c-name" className="label">Name</label>
        <input id="c-name" name="name" required className="input" />
      </div>
      <div>
        <label htmlFor="c-email" className="label">Email</label>
        <input id="c-email" name="email" type="email" required className="input" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="c-subject" className="label">Subject</label>
        <input id="c-subject" name="subject" className="input" placeholder="Order question, product info, ..." />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="c-message" className="label">Message</label>
        <textarea id="c-message" name="message" rows={6} required className="input" />
      </div>
      <div className="sm:col-span-2">
        <FormMessage state={state} />
      </div>
      <div className="sm:col-span-2">
        <SubmitButton pendingText="Sending..." className="!px-8">Send message</SubmitButton>
      </div>
    </form>
  );
}

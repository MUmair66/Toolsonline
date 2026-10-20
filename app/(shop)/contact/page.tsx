import type { Metadata } from "next";
import { Clock, Mail, Phone } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { ContactForm } from "@/components/shop/ContactForm";

export const metadata: Metadata = { title: "Contact us" };

export default async function ContactPage() {
  const s = await getSettings();
  return (
    <div className="container-x py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">Get in touch</h1>
        <p className="mt-3 text-lg text-slate-500">Questions about an order or a product? We&apos;re happy to help.</p>
      </div>
      <div className="mt-12 grid gap-8 lg:grid-cols-3">
        <div className="space-y-4">
          {[
            { icon: Mail, title: "Email", text: s.contactEmail },
            { icon: Phone, title: "Phone", text: s.contactPhone },
            { icon: Clock, title: "Hours", text: "Mon–Fri, 9am – 6pm" },
          ].map((c) => (
            <div key={c.title} className="card flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{c.title}</p>
                <p className="font-semibold">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="card p-6 sm:p-8 lg:col-span-2">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}

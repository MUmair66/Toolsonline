import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { STORE, telHref, whatsappHref } from "@/lib/store";
import { ContactForm } from "@/components/shop/ContactForm";

export const metadata: Metadata = { title: "Contact us" };

export default function ContactPage() {
  const items = [
    { icon: Phone, title: "Phone", lines: STORE.phones.map((p) => ({ text: p, href: telHref(p) })) },
    { icon: MessageCircle, title: "WhatsApp", lines: [{ text: STORE.whatsappDisplay, href: whatsappHref(), external: true }] },
    ...(STORE.email ? [{ icon: Mail, title: "Email", lines: [{ text: STORE.email, href: `mailto:${STORE.email}` }] }] : []),
    { icon: MapPin, title: "Address", lines: [{ text: STORE.address, href: STORE.mapsUrl, external: true }] },
    { icon: Clock, title: "Hours", lines: [{ text: STORE.hours }] },
  ];

  return (
    <div className="container-x py-12 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Get in touch</h1>
        <p className="mt-3 text-base text-slate-500 sm:text-lg">Questions about an order or a product? Call, WhatsApp or visit us. We&apos;re happy to help.</p>
      </div>

      <div className="mt-10 grid gap-6 lg:mt-12 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-3">
          {items.map((c) => (
            <div key={c.title} className="card flex items-start gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <c.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-slate-500">{c.title}</p>
                {c.lines.map((l) =>
                  "href" in l && l.href ? (
                    <a
                      key={l.text}
                      href={l.href}
                      {...("external" in l && l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="block font-semibold break-words hover:text-brand-700 hover:underline"
                    >
                      {l.text}
                    </a>
                  ) : (
                    <p key={l.text} className="font-semibold">{l.text}</p>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="card p-6 sm:p-8 lg:col-span-2">
          <ContactForm />
        </div>
      </div>

      <div className="relative mt-8 h-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:h-[400px]">
        <iframe
          src={STORE.mapsEmbed}
          title={`Map: ${STORE.address}`}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}

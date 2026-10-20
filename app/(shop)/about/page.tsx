import type { Metadata } from "next";
import Link from "next/link";
import { Award, Heart, Leaf, Users } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { SafeImage } from "@/components/ui/SafeImage";

export const metadata: Metadata = { title: "About us" };

export default async function AboutPage() {
  const s = await getSettings();
  const values = [
    { icon: Award, title: "Quality first", text: "Every product is hand-picked and quality-checked before it reaches you." },
    { icon: Heart, title: "Customer obsessed", text: "Friendly support, easy returns and fast shipping — always." },
    { icon: Leaf, title: "Sustainable", text: "Recyclable packaging and responsible sourcing wherever possible." },
    { icon: Users, title: "Community", text: "Thousands of happy customers trust us for their everyday needs." },
  ];
  return (
    <div>
      <section className="bg-slate-50">
        <div className="container-x grid items-center gap-10 py-16 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold tracking-wide text-brand-600 uppercase">About {s.storeName}</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight">We make shopping simple, honest and enjoyable.</h1>
            <p className="mt-5 text-lg text-slate-600">
              {s.storeName} started with a simple idea: great products shouldn&apos;t be hard to find. Today we curate the best
              in electronics, fashion, home and lifestyle — and deliver them straight to your door.
            </p>
            <Link href="/products" className="btn-primary mt-8">Explore the shop</Link>
          </div>
          <div className="aspect-[4/3] overflow-hidden rounded-3xl">
            <SafeImage src="https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=1200&q=80&auto=format&fit=crop" alt="Our team" className="h-full w-full object-cover" />
          </div>
        </div>
      </section>
      <section className="container-x py-16">
        <h2 className="text-center text-3xl font-bold">What we stand for</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <div key={v.title} className="card p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <v.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold">{v.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{v.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

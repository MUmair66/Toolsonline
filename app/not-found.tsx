import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-7xl font-black text-brand-600">404</p>
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-slate-500">Sorry, we couldn&apos;t find the page you&apos;re looking for.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="btn-primary">
          Go home
        </Link>
        <Link href="/products" className="btn-secondary">
          Browse products
        </Link>
      </div>
    </div>
  );
}

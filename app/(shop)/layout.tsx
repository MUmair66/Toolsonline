import { Header } from "@/components/shop/Header";
import { Footer } from "@/components/shop/Footer";
import { MobileBottomNav } from "@/components/shop/HeaderClient";
import { getCurrentUser } from "@/lib/auth";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    // Bottom padding on phones keeps content clear of the fixed bottom navigation bar.
    <div className="flex min-h-screen flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <MobileBottomNav signedIn={!!user} />
    </div>
  );
}

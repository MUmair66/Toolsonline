import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import { StoreProvider } from "@/components/providers/StoreProvider";
import { CartProvider } from "@/components/providers/CartProvider";
import { WishlistProvider } from "@/components/providers/WishlistProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { NavProgress } from "@/components/ui/NavProgress";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: { default: `${s.storeName} — ${s.tagline}`, template: `%s | ${s.storeName}` },
    description: s.tagline,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const settings = {
    storeName: s.storeName,
    tagline: s.tagline,
    contactEmail: s.contactEmail,
    contactPhone: s.contactPhone,
    currency: s.currency,
    shippingFee: s.shippingFee,
    freeShippingThreshold: s.freeShippingThreshold,
    taxRate: s.taxRate,
    announcement: s.announcement,
  };

  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans">
        <NavProgress />
        <StoreProvider settings={settings}>
          <ToastProvider>
            <CartProvider>
              <WishlistProvider>{children}</WishlistProvider>
            </CartProvider>
          </ToastProvider>
        </StoreProvider>
      </body>
    </html>
  );
}

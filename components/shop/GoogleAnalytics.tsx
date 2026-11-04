import Script from "next/script";

/**
 * Google Analytics 4 (gtag.js). Loaded only in the shop layout, so admin pages are not tracked.
 * Page changes inside the app are counted automatically by GA4's "Enhanced measurement"
 * (browser history events), which is on by default.
 * The ID can be overridden with NEXT_PUBLIC_GA_ID; set it to "off" to disable tracking.
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-Z6L8CYMGPV";

export function GoogleAnalytics() {
  if (!GA_ID || GA_ID === "off") return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}

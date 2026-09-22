import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yuanta Wealth",
  description: "Yuanta Wealth on Webflow Cloud (Supabase-backed PoC)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&family=Cormorant+Garamond:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/vendor/template_bootstrap.min.css" />
        <link rel="stylesheet" href="/vendor/template_swiper-bundle.min.css" />
        <link rel="stylesheet" href="/vendor/template_main.min.css" />
        {/*
          beforeInteractive: these must exist in the DOM/global scope before any
          page's own inline script runs (Swiper carousels, Bootstrap navbar
          collapse) — required in the root layout for that guarantee.
        */}
        <Script
          src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"
          strategy="beforeInteractive"
        />
        <Script src="/vendor/template_bootstrap.bundle.min.js" strategy="beforeInteractive" />
        <Script src="/vendor/template_main.min.js" strategy="beforeInteractive" />
      </head>
      <body>{children}</body>
    </html>
  );
}

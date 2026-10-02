import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { SITE_TITLE, SITE_URL } from "./_components/seo";

const ANALYTICS_HOST = "wealth.yuanta.co.th";
const GA4_ID = "G-FGQHP67CNS";
const GTM_ID = "GTM-TB9V4FG5";

// Defaults only; every route sets its own title + canonical (see _components/seo.ts).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  openGraph: { title: SITE_TITLE, images: ["/images/og.jpg"] },
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
        {/*
          GA4 + GTM, same IDs and Consent Mode v2 defaults as production's HubSpot
          integrations. Only loads on the real domain so staging traffic on
          *.webflow.io never lands in production analytics. No consent banner
          here yet, so consent stays at production's "denied" default.
        */}
        <Script id="analytics" strategy="afterInteractive">{`
          if (location.hostname === "${ANALYTICS_HOST}") {
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              'ad_storage': 'denied', 'analytics_storage': 'denied',
              'ad_user_data': 'denied', 'ad_personalization': 'denied',
              'wait_for_update': 1000
            });
            gtag('js', new Date());
            gtag('config', '${GA4_ID}');
            var ga = document.createElement('script');
            ga.async = true;
            ga.src = 'https://www.googletagmanager.com/gtag/js?id=${GA4_ID}';
            document.head.appendChild(ga);
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          }
        `}</Script>
      </head>
      <body>{children}</body>
    </html>
  );
}

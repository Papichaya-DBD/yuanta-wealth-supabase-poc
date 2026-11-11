import { NextResponse, type NextRequest } from "next/server";

// Content-Security-Policy with a fresh nonce per request (SecurityScorecard
// findings 2026-11-03: "CSP Missing" and "CSP Contains Broad Directives").
//
// Scripts: only nonce-carrying scripts run. Next.js reads the nonce from the request's
// CSP header and stamps it on its own scripts; layout.tsx passes it to <Script>.
// 'strict-dynamic' lets those trusted scripts load others (GTM and the tags it
// fires), so script-src needs no host list or 'unsafe-inline'.
// Styles keep 'unsafe-inline': pages and Supabase article HTML use style="" attributes.
//
// This stays middleware.ts (edge runtime) rather than Next 16's proxy.ts, because
// proxy.ts always runs on Node.js, which OpenNext marks experimental on Cloudflare.

// Webflow Cloud serves /_next and public/ files from a per-environment host.
const ASSET_ORIGINS = [
  "https://8cb3be85-0953-4a9b-8a8b-ad33c9f905d5.wf-app-prod.cosmic.webflow.services", // production
  "https://90cacf82-1440-415a-b6fc-a75bf822ae0c.wf-app-prod.cosmic.webflow.services", // staging
];
const SUPABASE = "https://kqgdvpqygepvaifzrxki.supabase.co";

// Beacons and pixels from the tags in GTM-TB9V4FG5 (GA4, Google Ads, Meta, TikTok,
// LINE, X, Clarity), taken from what production actually requested on 2026-11-11.
// A new GTM vendor that sends data to another host needs it here.
const TRACKING = [
  "https://www.googletagmanager.com",
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
  "https://*.doubleclick.net",
  "https://www.googleadservices.com",
  "https://pagead2.googlesyndication.com",
  "https://mpc-pilot-1-s6uit34pua-uc.a.run.app",
  "https://mpc-pilot-2-s6uit34pua-ue.a.run.app",
  "https://analytics-ipv6.tiktokw.us",
  "https://www.google.com",
  "https://www.google.co.th",
  "https://*.clarity.ms",
  "https://c.bing.com",
  "https://www.facebook.com",
  "https://connect.facebook.net",
  "https://analytics.tiktok.com",
  "https://tr.line.me",
  "https://d.line-scdn.net",
  "https://static.ads-twitter.com",
  "https://analytics.twitter.com",
  "https://t.co",
];

function buildCsp(nonce: string) {
  const dev = process.env.NODE_ENV === "development";
  const assets = ASSET_ORIGINS.join(" ");
  const tracking = TRACKING.join(" ");
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline' ${assets}`,
    `img-src 'self' data: blob: ${assets} ${SUPABASE} ${tracking}`,
    `font-src 'self' data: ${assets}`,
    `connect-src 'self' ${assets} ${SUPABASE} ${tracking}`,
    `media-src 'self' ${assets} ${SUPABASE}`,
    "frame-src https://yuantasecuritiesthailand.setmore.com https://www.googletagmanager.com https://td.doubleclick.net https://www.facebook.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: static files and Next's own assets don't need a CSP.
      source: "/((?!_next/static|_next/image|vendor/|fonts/|images/|favicon.ico|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};

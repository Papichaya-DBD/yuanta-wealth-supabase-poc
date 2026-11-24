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

// CPU cost (Webflow Cloud bills CPU time over 30 min/month): the first request an
// idle worker gets loads the whole Next.js server (~110-150 ms CPU), and with our
// traffic most requests are such cold starts. A Response returned from here skips
// loading the Next server entirely (OpenNext imports it only when middleware lets
// the request through), so requests that need no page are answered here.
const SITE_HOST = "wealth.yuanta.co.th";

// Same headers next.config.ts sets on Next's responses; they aren't applied to
// responses created in middleware.
const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'",
};

// Every page route is "/" or starts with "/wealth-" (legacy short paths like
// /why-us are 301'd by next.config.ts redirects, which run before middleware).
function isSitePath(path: string) {
  return path === "/" || path.startsWith("/wealth-") || path.startsWith("/_next/") || path === "/icon.png";
}

// Crawlable only on the real domain; any other host (e.g. the *.webflow.io staging
// URL) tells crawlers to stay out so staging never gets indexed.
// The report pages are disallowed even on the real domain: they only redirect to the
// PDF in Supabase Storage, and crawlers following them were ~85% of its egress
// (2026-11-23, 9-27 MB per report).
function robotsTxt(host: string) {
  return host === SITE_HOST
    ? `User-Agent: *\nDisallow: /wealth-weekly-report\nDisallow: /wealth-monthly-report\nAllow: /\n\nSitemap: https://${SITE_HOST}/sitemap.xml\n`
    : "User-Agent: *\nDisallow: /\n";
}

// Report pages redirect to the PDF client-side, so any crawler that runs JS downloads
// the whole file. Self-declared bots get a small static page instead, answered here
// so it doesn't boot the Next server either. Crawlers posing as a browser still get
// through; robots.txt and noindex are the other layers.
const REPORT_PATH = /^\/wealth-(weekly|monthly)-report(\/|$)/;
const BOT_UA =
  /bot\b|bot\/|crawl|spider|slurp|facebookexternalhit|meta-externalagent|headless|python|curl|wget|scrapy|httpclient|okhttp|go-http|java\/|axios|node-fetch/i;

const REPORT_BOT_HTML = `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>Yuanta Wealth Report</title></head><body style="font-family:sans-serif;text-align:center;padding:80px 16px;color:#333"><p>เปิดรายงานได้จากหน้าบทความบน <a href="/wealth-insights">wealth.yuanta.co.th</a></p></body></html>`;

const NOT_FOUND_HTML = `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>ไม่พบหน้านี้ | Yuanta Wealth Management</title></head><body style="font-family:sans-serif;text-align:center;padding:80px 16px;color:#333"><h1 style="font-size:24px">ไม่พบหน้าที่คุณต้องการ</h1><p><a href="/" style="color:#ff6600">กลับหน้าแรก</a></p></body></html>`;

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/robots.txt") {
    return new NextResponse(robotsTxt(request.headers.get("host") || ""), {
      headers: { ...SECURITY_HEADERS, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  // Bot probes (/wp-login.php, /.env, /favicon.ico, ...) would otherwise boot Next
  // just to render its 404.
  if (!isSitePath(path)) {
    return new NextResponse(NOT_FOUND_HTML, {
      status: 404,
      headers: { ...SECURITY_HEADERS, "Content-Type": "text/html; charset=utf-8" },
    });
  }
  if (REPORT_PATH.test(path) && BOT_UA.test(request.headers.get("user-agent") || "")) {
    return new NextResponse(REPORT_BOT_HTML, {
      headers: {
        ...SECURITY_HEADERS,
        "Content-Type": "text/html; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

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
      // Pages only (static files and Next's own assets don't need a CSP), plus
      // robots.txt and unknown paths, which are answered above.
      source: "/((?!_next/static|_next/image|vendor/|fonts/|images/|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};

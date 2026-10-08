import type { NextConfig } from "next";

const basePath = process.env.BASE_URL || "";

// 301s mirrored from production HubSpot's URL Redirects (probed live 2026-10-01):
// bare-week URLs from before hot-issue / asset-class-outlook were split into one
// page per topic, plus the footer's old short paths (404 on production too).
// New split weeks need a line here, same as adding one in HubSpot today.
const LEGACY_REDIRECTS: [string, string][] = [
  ["/wealth-single-weekly-hotissue/2026-04-20", "/wealth-single-weekly-hotissue/2026-04-20-ai-semiconductor-supercycle"],
  ["/wealth-single-weekly-hotissue/2026-05-25", "/wealth-single-weekly-hotissue/2026-05-25-ai-infrastructure-supercycle"],
  ["/wealth-single-weekly-hotissue/2026-06-15", "/wealth-single-weekly-hotissue/2026-06-15-ai-semis"],
  ["/wealth-single-weekly-hotissue/2026-06-22", "/wealth-single-weekly-hotissue/2026-06-22-fed-watch-portfolio"],
  ["/wealth-single-weekly-hotissue/2026-09-28", "/wealth-single-weekly-hotissue/2026-09-28-ai-infrastructure-memory"],
  ["/wealth-single-monthly-hotissue/2026-05-01", "/wealth-single-monthly-hotissue/2026-05-01-ai-infrastructure-gems"],
  ["/wealth-single-monthly-hotissue/2026-06-01", "/wealth-single-monthly-hotissue/2026-06-01-fed-watch"],
  ["/wealth-single-monthly-hotissue/2026-07-01", "/wealth-single-monthly-hotissue/2026-07-01-semis-memory-upcycle"],
  ["/wealth-single-monthly-asset-class-outlook/2026-05-01", "/wealth-single-monthly-asset-class-outlook/2026-05-01-equity"],
  ["/wealth-single-monthly-asset-class-outlook/2026-06-01", "/wealth-single-monthly-asset-class-outlook/2026-06-01-equity"],
  ["/wealth-single-monthly-asset-class-outlook/2026-07-01", "/wealth-single-monthly-asset-class-outlook/2026-07-01-equity"],
  ["/why-us", "/wealth-whyus"],
  ["/privileges-events", "/wealth-privilegesandevents"],
  ["/contact-us", "/wealth-contactus"],
];

// Article routes with no slug (production lists them in its sitemap). Same rule as
// an unknown slug: send the reader to Insights. Temporary, since these may get a
// real listing page later.
const BARE_ARTICLE_ROUTES = [
  "weekly-hotissue",
  "weekly-asset-performance",
  "weekly-buy-list",
  "weekly-market-calendar",
  "monthly-hotissue",
  "monthly-asset-class-outlook",
  "monthly-asset-performance",
  "monthly-buy-list",
  "monthly-market-calendar",
  "monthly-market-outlook",
].map((r) => `/wealth-single-${r}`);

// Production's internal preview pages are public and in its sitemap; each preview
// article 301s to the same article's real page (an unknown slug then falls through
// to Insights), and the preview listings go to Insights.
const PREVIEW_ARTICLE_ROUTES: [string, string][] = [
  ["/wealth-hotissue-preview", "/wealth-single-weekly-hotissue"],
  ["/wealth-single-monthly-hotissue-preview", "/wealth-single-monthly-hotissue"],
  ["/wealth-single-monthly-asset-class-outlook-preview", "/wealth-single-monthly-asset-class-outlook"],
];
const PREVIEW_LISTINGS = ["/wealth-insights-preview", "/wealth-insight-perview-2"];

const nextConfig: NextConfig = {
  // Webflow Cloud serves /_next assets from its own *.webflow.services origin, which
  // external scanners flag as cross-origin resources without SRI. sri adds integrity
  // hashes to the script tags; inlineCss drops the cross-origin stylesheet link.
  experimental: {
    sri: { algorithm: "sha256" },
    inlineCss: true,
  },
  ...(basePath && {
    basePath,
    assetPrefix: process.env.ASSETS_PREFIX || basePath,
  }),
  async redirects() {
    return [
      ...LEGACY_REDIRECTS.map(([source, destination]) => ({ source, destination, statusCode: 301 as const })),
      ...PREVIEW_ARTICLE_ROUTES.flatMap(([preview, real]) => [
        { source: `${preview}/:slug`, destination: `${real}/:slug`, statusCode: 301 as const },
        { source: preview, destination: "/wealth-insights", statusCode: 301 as const },
      ]),
      ...PREVIEW_LISTINGS.map((source) => ({ source, destination: "/wealth-insights", statusCode: 301 as const })),
      ...BARE_ARTICLE_ROUTES.map((source) => ({ source, destination: "/wealth-insights", statusCode: 302 as const })),
    ];
  },
};

export default nextConfig;

// Enable getCloudflareContext() in `next dev`
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();

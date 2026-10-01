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

const nextConfig: NextConfig = {
  ...(basePath && {
    basePath,
    assetPrefix: process.env.ASSETS_PREFIX || basePath,
  }),
  async redirects() {
    return LEGACY_REDIRECTS.map(([source, destination]) => ({ source, destination, statusCode: 301 }));
  },
};

export default nextConfig;

// Enable getCloudflareContext() in `next dev`
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();

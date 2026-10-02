// Crawlable only on the real domain; any other host (e.g. the *.webflow.io
// staging URL) tells crawlers to stay out so staging never gets indexed.
import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { SITE_URL } from "./_components/seo";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host") || "";
  if (host !== new URL(SITE_URL).host) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${SITE_URL}/sitemap.xml` };
}

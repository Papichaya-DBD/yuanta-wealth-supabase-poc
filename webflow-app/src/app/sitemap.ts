// sitemap.xml built from Supabase on each request, covering the same kinds of URLs
// as production's HubSpot sitemap: site pages, every article, and weekly report
// pages (production lists those by date). Preview pages are left out on purpose.
import type { MetadataRoute } from "next";
import { sbServerRows, SITE_URL } from "./_components/seo";

export const dynamic = "force-dynamic";

const SITE_PAGES = ["/", "/wealth-insights", "/wealth-whyus", "/wealth-privilegesandevents", "/wealth-contactus"];

const ARTICLES: [route: string, table: string, key: "path" | "week_slug"][] = [
  ["/wealth-single-weekly-hotissue", "weekly_hot_issue", "path"],
  ["/wealth-single-weekly-asset-performance", "weekly_asset_performance", "week_slug"],
  ["/wealth-single-weekly-buy-list", "weekly_buy_list", "week_slug"],
  ["/wealth-single-weekly-market-calendar", "weekly_market_calendar", "week_slug"],
  ["/wealth-single-monthly-hotissue", "monthly_hot_issue", "path"],
  ["/wealth-single-monthly-asset-class-outlook", "monthly_asset_class_outlook", "path"],
  ["/wealth-single-monthly-asset-performance", "monthly_asset_performance", "week_slug"],
  ["/wealth-single-monthly-buy-list", "monthly_buy_list", "week_slug"],
  ["/wealth-single-monthly-market-calendar", "monthly_market_calendar", "week_slug"],
  ["/wealth-single-monthly-market-outlook", "monthly_market_outlook", "week_slug"],
  ["/wealth-weekly-report", "weekly_pdf", "week_slug"],
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lists = await Promise.all(
    ARTICLES.map(async ([route, table, key]) => {
      const rows = await sbServerRows(table, `select=${key}&order=${key}.desc`);
      const slugs = Array.from(new Set(rows.map((r) => r[key]).filter(Boolean)));
      return slugs.map((s) => `${route}/${encodeURIComponent(s)}`);
    })
  );
  return [...SITE_PAGES, ...lists.flat()].map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : path}` }));
}

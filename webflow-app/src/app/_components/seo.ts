// Server-side metadata, mirroring production HubSpot: fixed titles for site
// pages, the article's main_title for article pages, and a canonical URL on the
// real domain. Article pages are client components, so their metadata comes from
// a small [slug]/layout.tsx that calls articleMetadata().
import type { Metadata } from "next";

export const SITE_URL = "https://wealth.yuanta.co.th";
export const SITE_TITLE = "Yuanta Wealth Management";
const OG_IMAGE = "/images/og.jpg";

const SUPABASE_URL = "https://kqgdvpqygepvaifzrxki.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_6khmxt87r-YGlSxyF9d9XA_G0NNDTbp";

export async function sbServerRows(table: string, query: string): Promise<any[]> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      cache: "no-store",
    });
    if (!r.ok) return [];
    const rows = await r.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export function pageMetadata(title: string, path: string, description?: string): Metadata {
  return {
    title,
    ...(description && { description }),
    alternates: { canonical: path },
    openGraph: { title, url: path, images: [OG_IMAGE], ...(description && { description }) },
  };
}

function plainText(html?: string) {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

/** Article page metadata from its Supabase row; keyColumn is "path" for split tables, else "week_slug". */
export async function articleMetadata(
  table: string,
  keyColumn: "path" | "week_slug",
  route: string,
  slug: string
): Promise<Metadata> {
  const rows = await sbServerRows(
    table,
    `select=main_title,description&${keyColumn}=eq.${encodeURIComponent(slug)}&limit=1`
  );
  const row = rows[0];
  const description = plainText(row?.description).slice(0, 300) || undefined;
  return pageMetadata(row?.main_title || SITE_TITLE, `${route}/${slug}`, description);
}

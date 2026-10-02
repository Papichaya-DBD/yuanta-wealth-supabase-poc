import { articleMetadata } from "@/app/_components/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return articleMetadata("monthly_asset_performance", "week_slug", "/wealth-single-monthly-asset-performance", decodeURIComponent(slug));
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

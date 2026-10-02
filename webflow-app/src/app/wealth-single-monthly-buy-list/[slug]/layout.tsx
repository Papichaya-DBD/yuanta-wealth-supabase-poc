import { articleMetadata } from "@/app/_components/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return articleMetadata("monthly_buy_list", "week_slug", "/wealth-single-monthly-buy-list", decodeURIComponent(slug));
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

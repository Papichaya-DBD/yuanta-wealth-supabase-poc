import { articleMetadata } from "@/app/_components/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return articleMetadata("monthly_hot_issue", "path", "/wealth-single-monthly-hotissue", decodeURIComponent(slug));
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

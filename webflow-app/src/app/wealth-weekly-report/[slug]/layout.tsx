import { pageMetadata } from "@/app/_components/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return pageMetadata("Weekly Report – Yuanta Wealth", `/wealth-weekly-report/${slug}`);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

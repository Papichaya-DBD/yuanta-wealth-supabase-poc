import { articleMetadata } from "@/app/_components/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return articleMetadata("special_insight", "path", "/wealth-editions", decodeURIComponent(slug));
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

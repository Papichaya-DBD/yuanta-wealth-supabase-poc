import { pageMetadata } from "@/app/_components/seo";

// Redirect-to-PDF page: crawlers following it download the whole report from
// Supabase Storage (egress), so keep it out of search engines.
export const metadata = { ...pageMetadata("Monthly Report – Yuanta Wealth", "/wealth-monthly-report"), robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

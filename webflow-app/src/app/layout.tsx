import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yuanta Wealth",
  description: "Yuanta Wealth on Webflow Cloud (Supabase-backed PoC)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}

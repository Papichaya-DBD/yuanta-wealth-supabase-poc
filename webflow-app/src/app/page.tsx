import { pageMetadata, SITE_TITLE } from "@/app/_components/seo";
import HomeContent from "./HomeContent";

export const metadata = pageMetadata(SITE_TITLE, "/");

export default function Home() {
  return <HomeContent />;
}

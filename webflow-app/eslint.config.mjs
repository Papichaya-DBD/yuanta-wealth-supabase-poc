import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // This is a byte-for-byte port of a plain multi-page HTML site (each
      // route is its own independently-ported page, not an SPA) — plain
      // <a>/<img> tags are intentional, matching the source templates.
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "off",
      "@next/next/no-page-custom-font": "off",
      "@next/next/no-css-tags": "off",
      // Supabase rows are untyped dynamic JSON here, same as every other PoC page.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;

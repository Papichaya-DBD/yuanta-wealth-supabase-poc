// Special Insight labels per asset_type (the column the AI pipeline sets per paper).
// Unknown types fall back to the raw value with its first letter capitalised.
const ASSET_TYPE_LABELS: Record<string, string> = {
  gold: "Gold",
};

export function assetTypeLabel(assetType?: string) {
  const t = (assetType || "").trim();
  if (!t) return "Special Insight";
  return ASSET_TYPE_LABELS[t.toLowerCase()] || t.charAt(0).toUpperCase() + t.slice(1);
}

export const SPECIAL_INSIGHT_THUMB = "/images/theme/thumb-asset-class-outlook.png";

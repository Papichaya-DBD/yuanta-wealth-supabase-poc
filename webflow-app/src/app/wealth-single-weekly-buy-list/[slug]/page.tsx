"use client";

// PoC: port of yuanta-wealth-supabase-poc/single-buy-list.html onto Webflow
// Cloud (Next.js). Row content (title/CIO box/donut/portfolio cards/perf bar)
// is driven by React state + derived JSX instead of the original's
// querySelector-based imperative DOM mutation, since that content is fetched
// on mount and rendered into elements that are part of the initial JSX tree
// (a raw injected script mutating those directly races React hydration —
// see the home.html port notes). The fund drawer and week modal are
// populated only on user click (well after mount), so those stay as plain
// imperative DOM functions, matching the original almost verbatim — no
// hydration risk there.

import { useEffect, useState } from "react";

const SUPABASE_URL = "https://kqgdvpqygepvaifzrxki.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_6khmxt87r-YGlSxyF9d9XA_G0NNDTbp";
const CIRC = 502.65;

function sbFetch(table: string, query: string): Promise<any[]> {
  return fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  })
    .then((r) => r.json() as Promise<any[]>)
    .catch(() => []);
}

function openMeetingModal() {
  const modal = document.getElementById("meeting-modal");
  const iframe = document.getElementById("setmore-iframe") as HTMLIFrameElement | null;
  if (!modal || !iframe) return;
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
  if (!iframe.getAttribute("data-loaded")) {
    iframe.src = "https://yuantasecuritiesthailand.setmore.com";
    iframe.setAttribute("data-loaded", "true");
  }
}
function closeMeetingModal() {
  document.getElementById("meeting-modal")?.classList.remove("active");
  document.body.style.overflow = "";
}
function shareToFacebook() {
  window.open("https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(location.href), "_blank");
}
function shareToX() {
  window.open("https://x.com/intent/tweet?url=" + encodeURIComponent(location.href), "_blank");
}
function copyLink() {
  navigator.clipboard.writeText(location.href).then(() => alert("คัดลอกลิงก์แล้ว"));
}
function shareByEmail() {
  location.href = "mailto:?subject=Weekly Buy List — Yuanta Wealth&body=" + encodeURIComponent(location.href);
}
function openMonthlyModal() {
  document.getElementById("monthlyModalOverlay")?.classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeMonthlyModalDirect() {
  document.getElementById("monthlyModalOverlay")?.classList.remove("open");
  document.body.style.overflow = "";
}
function closeWeeklyModalDirect() {
  document.getElementById("weeklyModalOverlay")?.classList.remove("open");
  document.body.style.overflow = "";
}
function closeDrawer() {
  document.getElementById("fundOverlay")?.classList.remove("open");
  document.getElementById("fundDrawer")?.classList.remove("open");
  document.body.style.overflow = "";
}

function thaiDate(s?: string) {
  if (!s) return "";
  const d = new Date(s + "T00:00:00Z");
  const m = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  return d.getUTCDate() + " " + m[d.getUTCMonth()] + " " + (d.getUTCFullYear() + 543);
}
function stripHtml(html?: string) {
  return (html || "").replace(/<[^>]+>/g, "").trim();
}
function excerptText(values: Record<string, any>) {
  return values.description || stripHtml(values.ai_summary);
}
function parseFunds(str?: string) {
  if (!str || !str.trim()) return [];
  return str
    .split(",")
    .map((f) => {
      const parts = f.trim().split(":");
      return { ticker: parts[0].trim(), type: (parts[1] || "mf").trim() };
    })
    .filter((f) => f.ticker);
}
function fundTagsHtml(fundsStr?: string) {
  const funds = parseFunds(fundsStr);
  if (!funds.length) return "";
  const typesPresent: Record<string, boolean> = {};
  const tags = funds
    .map((f) => {
      typesPresent[f.type] = true;
      const cls = f.type === "dr" ? " dr" : f.type === "etf" ? " etf" : "";
      return (
        `<button class="ftag${cls}" onclick="window.__openFundDrawer('${f.ticker}')">` +
        f.ticker +
        ' <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 4l4 4-4 4"/></svg></button>'
      );
    })
    .join("");
  const leg: string[] = [];
  if (typesPresent["mf"]) leg.push('<span class="legend-itm"><span class="ldot mf"></span> Mutual fund</span>');
  if (typesPresent["dr"]) leg.push('<span class="legend-itm"><span class="ldot dr"></span> DR</span>');
  if (typesPresent["etf"]) leg.push('<span class="legend-itm"><span class="ldot etf"></span> ETF/Offshore</span>');
  return (
    '<div class="fund-heading">สินทรัพย์แนะนำ</div>' +
    `<div class="fund-tags">${tags}</div>` +
    `<div class="legend-row">${leg.join("")}</div>`
  );
}
function assetItemHtml(name: string, sub: string, pct: number, lt: string, t12: string, eps: string, fundsStr: string, isLast: boolean) {
  const border = isLast ? ' style="border-bottom:none;"' : "";
  const hasStats = (lt && lt !== "-") || (t12 && t12 !== "-") || (eps && eps !== "-");
  const hasDivider = sub || hasStats;
  const subHtml = sub ? `<div class="asset-name-sub">${sub}</div>` : "";
  const statsHtml = hasStats
    ? '<div class="asset-stats">' +
      `<div><div class="stat-lbl">LT Return</div><div class="stat-val">${lt && lt !== "-" ? lt + "%" : "-"}</div></div>` +
      `<div><div class="stat-lbl">12M Target</div><div class="stat-val">${t12 || "-"}</div></div>` +
      `<div><div class="stat-lbl">12M EPS GR.</div><div class="stat-val">${eps && eps !== "-" ? eps + "%" : "-"}</div></div>` +
      "</div>"
    : "";
  return (
    `<div class="asset-item"${border}>` +
    '<div class="asset-row-labels"><span class="asset-lbl">Asset class</span><span class="asset-lbl">สัดส่วน</span></div>' +
    `<div class="asset-row-name"><span class="asset-name">${name}</span><span class="asset-pct">${pct}%</span></div>` +
    (hasDivider ? '<div class="asset-divider"></div>' : "") +
    subHtml +
    statsHtml +
    (fundsStr ? fundTagsHtml(fundsStr) : "") +
    "</div>"
  );
}
function coreCardHtml(v: Record<string, any>) {
  const corePct = v.core_pct != null ? v.core_pct : 78;
  return (
    '<div class="pc-header">' +
    '<div><div class="pc-name">Core portfolio</div><div class="pc-sub">ผลตอบแทนระยะยาว ลงทุนสม่ำเสมอ และปรับสมดุลพอร์ต</div></div>' +
    `<div class="pc-pct">${corePct}%</div>` +
    "</div>" +
    assetItemHtml("Global Fixed Income", "", v.gfi_weight || 0, v.gfi_lt_return, v.gfi_target_12m, v.gfi_eps_12m, v.gfi_funds, false) +
    assetItemHtml("Global Equity", "", v.geq_weight || 0, v.geq_lt_return, v.geq_target_12m, v.geq_eps_12m, v.geq_funds, true)
  );
}
function satelliteCardHtml(v: Record<string, any>) {
  const satPct = v.satellite_pct != null ? v.satellite_pct : 22;
  const satItems: any[] = [];
  for (let i = 1; i <= 8; i++) {
    const sName = v["sat_" + i + "_name"];
    if (!sName) continue;
    satItems.push({
      name: sName,
      sub: v["sat_" + i + "_sub"] || "",
      wt: v["sat_" + i + "_weight"] || 0,
      lt: v["sat_" + i + "_lt_return"] || "",
      t12: v["sat_" + i + "_target_12m"] || "",
      eps: v["sat_" + i + "_eps_12m"] || "",
      funds: v["sat_" + i + "_funds"] || "",
    });
  }
  let html =
    '<div class="pc-header" style="background:#a2603c;">' +
    '<div><div class="pc-name">Satellite portfolio</div><div class="pc-sub">ผลตอบแทนระยะสั้น เน้นเลือกสินทรัพย์ และจับจังหวะตลาด</div></div>' +
    `<div class="pc-pct">${satPct}%</div>` +
    "</div>";
  satItems.forEach((s, idx) => {
    html += assetItemHtml(s.name, s.sub, s.wt, s.lt, s.t12, s.eps, s.funds, idx === satItems.length - 1);
  });
  return html;
}

type WTable = { id: string; type?: string; label: string; cls: string; path: string; usePath?: boolean; multi?: boolean; aiFallback?: boolean };
const RELATED_TABLES: WTable[] = [
  { id: "weekly_hot_issue", type: "hot-issue", label: "Hot issue", cls: "tag-hot-issue", path: "/wealth-single-weekly-hotissue/" },
  { id: "weekly_asset_performance", type: "asset-performance", label: "Asset performance", cls: "tag-asset-perf", path: "/wealth-single-weekly-asset-performance/" },
  { id: "weekly_market_calendar", type: "market-calendar", label: "Market calendar", cls: "tag-mkt-calendar", path: "/wealth-single-weekly-market-calendar/" },
];
const SPLIT_WEEKLY_TABLE_IDS: Record<string, boolean> = { weekly_hot_issue: true };
const MONTHLY_TABLES: WTable[] = [
  { id: "monthly_hot_issue", label: "Hot issue", cls: "tag-hot-issue", path: "/wealth-single-monthly-hotissue/", usePath: true, multi: true, aiFallback: true },
  { id: "monthly_asset_performance", label: "Asset performance", cls: "tag-asset-perf", path: "/wealth-single-monthly-asset-performance/" },
  { id: "monthly_buy_list", label: "Buy list", cls: "tag-buy-list", path: "/wealth-single-monthly-buy-list/" },
  { id: "monthly_market_calendar", label: "Market calendar", cls: "tag-mkt-calendar", path: "/wealth-single-monthly-market-calendar/" },
  { id: "monthly_market_outlook", label: "Market outlook", cls: "tag-mkt-outlook", path: "/wealth-single-monthly-market-outlook/" },
  { id: "monthly_asset_class_outlook", label: "Asset class outlook", cls: "tag-asset-outlook", path: "/wealth-single-monthly-asset-class-outlook/", usePath: true, multi: true, aiFallback: true },
];
const FALLBACK_IMG = "/images/theme/comingsoon.png";
const THUMB: Record<string, string> = {
  weekly_hot_issue: "/images/theme/thumb-hot-issue.png",
  weekly_asset_performance: "/images/theme/thumb-asset-performance.png",
  weekly_buy_list: "/images/theme/thumb-buy-list.png",
  weekly_market_calendar: "/images/theme/thumb-market-calendar.png",
  monthly_hot_issue: "/images/theme/thumb-hot-issue.png",
  monthly_asset_performance: "/images/theme/thumb-asset-performance.png",
  monthly_buy_list: "/images/theme/thumb-buy-list.png",
  monthly_market_calendar: "/images/theme/thumb-market-calendar.png",
  monthly_market_outlook: "/images/theme/thumb-market-outlook.png",
  monthly_asset_class_outlook: "/images/theme/thumb-asset-class-outlook.png",
};
function fetchWeekRows(t: WTable, week: string) {
  const limit = SPLIT_WEEKLY_TABLE_IDS[t.id] ? 50 : 1;
  return sbFetch(t.id, `week_slug=eq.${encodeURIComponent(week)}&limit=${limit}`).then((rows) =>
    (rows || []).map((row) => ({ values: row, _table: t }))
  );
}
function relatedCardHtml(a: { values: Record<string, any>; _table: WTable }) {
  const t = a._table;
  const src = THUMB[t.id] || FALLBACK_IMG;
  const url = t.path + (a.values.week_slug || "");
  return (
    '<div class="swiper-slide">' +
    `<div class="insight-card" onclick="location.href='${url}'">` +
    `<div class="insight-card-img-wrap"><img class="insight-card-img" src="${src}" alt="" /></div>` +
    '<div class="insight-card-content">' +
    `<span class="insight-card-img-tag insight-tag ${t.cls}">${t.label}</span>` +
    `<h4 class="insight-card-title">${a.values.main_title || ""}</h4>` +
    `<p class="insight-card-date">${thaiDate(a.values.page_date)}</p>` +
    `<p class="insight-card-excerpt">${excerptText(a.values)}</p>` +
    "</div></div></div>"
  );
}
function weekModalCardHtml(a: { values: Record<string, any>; _table: WTable }) {
  const t = a._table;
  const src = THUMB[t.id] || FALLBACK_IMG;
  const url = t.path + (a.values.week_slug || "");
  return (
    '<div class="col-6 col-lg-3">' +
    `<div class="insight-card" onclick="location.href='${url}'">` +
    `<div class="insight-card-img-wrap"><img class="insight-card-img" src="${src}" alt="" /></div>` +
    '<div class="insight-card-content">' +
    `<span class="insight-card-img-tag insight-tag ${t.cls}">${t.label}</span>` +
    `<h4 class="insight-card-title">${a.values.main_title || ""}</h4>` +
    `<p class="insight-card-date">${thaiDate(a.values.page_date)}</p>` +
    `<p class="insight-card-excerpt">${excerptText(a.values)}</p>` +
    "</div></div></div>"
  );
}
function monthlyCardHtml(t: WTable, row: Record<string, any>) {
  const src = THUMB[t.id] || FALLBACK_IMG;
  const slugPart = t.usePath ? row.path || "" : (row.week_slug || "").trim();
  const url = t.path + slugPart;
  const excerpt = row.description || (t.aiFallback ? stripHtml(row.ai_summary) : "");
  return (
    '<div class="col-6 col-lg-3">' +
    `<div class="insight-card" onclick="location.href='${url}'">` +
    `<div class="insight-card-img-wrap"><img class="insight-card-img" src="${src}" alt="" /></div>` +
    '<div class="insight-card-content">' +
    `<span class="insight-card-img-tag insight-tag ${t.cls}">${t.label}</span>` +
    `<h4 class="insight-card-title">${row.main_title || ""}</h4>` +
    `<p class="insight-card-date">${thaiDate(row.page_date)}</p>` +
    (excerpt ? `<p class="insight-card-excerpt">${excerpt}</p>` : "") +
    "</div></div></div>"
  );
}

const EXPERTS = [
  { name: "Danai Aroonkittichai", credentials: "CFA", photo: "/images/theme/expert-d6c3628f8f.jpg" },
  { name: "Visakorn Kirivan", credentials: "CFA, PhD", photo: "/images/theme/expert-99d9ed77ce.jpg" },
  { name: "Natakit Karnkriangkrai", credentials: "", photo: "/images/theme/expert-f80e3df909.jpg" },
];

const CSS = `
  html, body { overflow-x: hidden; margin: 0; }
  .insight-page { margin-top: 90px; background: #fff; }
  .insight-breadcrumb { padding: 30px 0; background: #fff; }
  .insight-breadcrumb ol { margin:0; padding:0; list-style:none; display:flex; align-items:center; gap:6px; font-family:'Noto Sans Thai',sans-serif; font-size:13px; color:#8f9aac; }
  .insight-breadcrumb li a { color:#8f9aac; text-decoration:none; }
  .insight-breadcrumb li a:hover { color:#a2603c; }
  .insight-breadcrumb li.active { color:#a2603c; }
  .insight-breadcrumb li.sep { color:#ccc; }
  .article-header { padding:0 0 32px; text-align:left; }
  .article-category-tag { display:inline-block; font-family:'Cormorant Garamond','Noto Sans Thai',Georgia,serif; font-size:13px; font-weight:500; padding:4px 14px; background:#CBD4D0; color:#2c4a42; border:1px solid rgba(44,74,66,.15); margin-bottom:18px; letter-spacing:.03em; }
  .article-title { font-family:'Noto Sans Thai',sans-serif; font-size:32px; font-weight:700; color:#0c244a; line-height:1.3; margin-bottom:12px; }
  .article-subtitle { font-family:'Noto Sans Thai',sans-serif; font-size:24px; font-weight:700; color:#3D506E; margin-bottom:0; padding-bottom:16px; border-bottom:1px solid rgba(0,0,0,.1); }
  .article-meta-row { display:flex; align-items:center; justify-content:space-between; margin-top:16px; }
  .article-date { font-family:'Noto Sans Thai',sans-serif; font-size:14px; color:#3D506E; font-weight:600; }
  .article-share { display:flex; align-items:center; gap:8px; }
  .article-share-label { font-family:'Noto Sans Thai',sans-serif; font-size:14px; color:#3d506e; margin-right:4px; }
  .share-btn { width:36px; height:36px; border:1px solid rgba(0,0,0,.12); background:#fff; border-radius:0; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:background .15s; }
  .share-btn:hover { background:#f5f5f5; }
  .share-btn svg { width:16px; height:16px; }
  @media (max-width:767px) {
    .article-header { padding:0 0 20px; }
    .article-title { font-size:24px; }
    .article-subtitle { font-size:18px; }
    .article-meta-row { flex-direction:column; align-items:flex-start; gap:12px; }
  }
  .article-body { padding: 0; }
  .cio-box { background:#f8f7f3; border:1px solid #e2ddd4; padding:24px 28px 20px; margin-bottom:32px; }
  .cio-box-title { font-family:'Noto Sans Thai',sans-serif; font-size:17px; font-weight:700; color:#0c244a; margin-bottom:14px; }
  .cio-box ul { list-style:none; padding:0; margin:0; }
  .cio-box ul li { font-family:'Noto Sans Thai',sans-serif; font-size:14px; color:#3d506e; line-height:1.8; padding-left:16px; position:relative; margin-bottom:8px; }
  .cio-box ul li:last-child { margin-bottom:0; }
  .cio-box ul li::before { content:'•'; position:absolute; left:0; color:#3d506e; }
  @media (max-width:767px) { .cio-box ul li { font-size:16px; } }
  .pm-header { background:#f5f7fa; padding:24px 24px 0; }
  .pm-title { font-family:'Noto Sans Thai',sans-serif; font-size:24px; font-weight:700; color:#0c244a; margin-bottom:4px; }
  .pm-tabs { display:flex; gap:0; overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch; }
  .pm-tabs::-webkit-scrollbar { display:none; }
  .pm-tab { font-family:'Noto Sans Thai',sans-serif; font-size:14px; font-weight:500; padding:10px 24px; border:none; background:transparent; color:#8f9aac; cursor:pointer; border-bottom:2px solid transparent; transition:all .15s; white-space:nowrap; }
  .pm-tab.active { color:#0c244a; font-weight:700; border-bottom-color:#0c244a; }
  .pm-tab:hover:not(.active) { color:#3d506e; }
  .pm-content { background:#fff; box-shadow:0 0 1px rgba(102,102,102,.14), 0 2px 8px rgba(102,102,102,.08); padding:24px 24px 0; margin-bottom:0; }
  .pm-layout { display:grid; grid-template-columns:300px 1fr; gap:24px; align-items:start; }
  @media (max-width:900px) { .pm-layout { grid-template-columns:1fr; } }
  .donut-col { background:#fff; padding:20px; box-shadow:0 0 1px rgba(102,102,102,.14), 0 2px 8px rgba(102,102,102,.08); position:sticky; top:100px; }
  @media (max-width:900px) { .donut-col { position:static; } }
  .donut-wrap { display:flex; justify-content:center; margin-bottom:16px; }
  .donut-wrap svg circle { transition: stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1), stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1); }
  .donut-legend { display:flex; flex-direction:column; gap:8px; margin-bottom:12px; }
  .donut-legend-row { display:flex; align-items:center; gap:8px; font-family:'Noto Sans Thai',sans-serif; font-size:13px; color:#3d506e; }
  .donut-dot { width:12px; height:12px; border-radius:2px; flex-shrink:0; }
  .donut-note { font-family:'Noto Sans Thai',sans-serif; font-size:14px; color:#3D506E; line-height:1.6; }
  @media (max-width:767px) { .pm-title { font-size:18px; } .pm-tab { font-size:16px; } .donut-note { font-size:16px; } .pm-content { padding:24px 8px 0; } }
  .portfolio-card { box-shadow:0 0 1px rgba(102,102,102,.14), 0 2px 8px rgba(102,102,102,.08); margin-bottom:16px; overflow:hidden; }
  .portfolio-card:last-child { margin-bottom:0; }
  #pc-core { background:#E7E9ED; }
  #pc-satellite { background:#F9F7F4; }
  .pc-header { background:#0c244a; color:#fff; padding:14px 20px; display:flex; justify-content:space-between; align-items:flex-start; }
  .pc-name { font-family:'Noto Sans Thai',sans-serif; font-size:20px; font-weight:700; }
  .pc-pct { font-family:'Noto Sans Thai',sans-serif; font-size:20px; font-weight:700; }
  .pc-sub { font-family:'Noto Sans Thai',sans-serif; font-size:16px; color:rgba(255,255,255,.7); margin-top:3px; }
  @media (max-width:767px) { .pc-sub { font-size:14px; } }
  .asset-item { background:#fff; box-shadow:0 0 1px rgba(102,102,102,.14), 0 2px 8px rgba(102,102,102,.08); margin:12px; padding:20px; }
  @media (max-width:767px) { .asset-item { margin:8px; } }
  .asset-row-labels { display:flex; justify-content:space-between; margin-bottom:4px; }
  .asset-lbl { font-family:'Noto Sans Thai',sans-serif; font-size:14px; color:#8f9aac; }
  .asset-row-name { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:10px; }
  .asset-name { font-family:'Noto Sans Thai',sans-serif; font-size:18px; font-weight:700; color:#0c244a; }
  .asset-name-sub { font-family:'Noto Sans Thai',sans-serif; font-size:16px; color:#000; font-weight:700; margin-bottom:10px; }
  .asset-pct { font-family:'Noto Sans Thai',sans-serif; font-size:18px; font-weight:700; color:#0c244a; }
  .asset-divider { height:1px; background:#e8ecf2; margin-bottom:10px; }
  .asset-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:4px; margin-bottom:12px; background:#F9FAFB; padding:14px 16px; text-align:center; }
  .stat-lbl { font-family:'Noto Sans Thai',sans-serif; font-size:11px; color:#8f9aac; margin-bottom:2px; }
  .stat-val { font-family:'Noto Sans Thai',sans-serif; font-size:16px; font-weight:700; color:#0c244a; }
  @media (max-width:767px) { .stat-lbl { font-size:12px; } .stat-val { font-size:14px; } }
  .fund-heading { font-family:'Noto Sans Thai',sans-serif; font-size:14px; color:#3d506e; font-weight:600; margin-bottom:8px; }
  .fund-tags { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px; }
  .ftag { font-family:'Noto Sans Thai',sans-serif; font-size:13px; font-weight:600; color:#615FFF; background:#c6d2ff5c; border:1px solid #c5c4ff; padding:6px 10px; cursor:pointer; display:inline-flex; align-items:center; gap:5px; transition:all .15s; white-space:nowrap; }
  .ftag:hover { background:#dddcff; border-color:#615FFF; }
  .ftag svg { width:12px; height:12px; flex-shrink:0; }
  .ftag.dr { color:#D08700; background:#fff8e6; border-color:#f5d980; }
  .ftag.dr:hover { background:#ffefc0; border-color:#D08700; }
  .ftag.etf { color:#0084D1; background:#e6f4ff; border-color:#99d1f5; }
  .ftag.etf:hover { background:#cce8ff; border-color:#0084D1; }
  .legend-row { display:flex; gap:16px; flex-wrap:wrap; border-top:1px dashed #d8dee8; padding-top:10px; }
  .legend-itm { display:flex; align-items:center; gap:5px; font-family:'Noto Sans Thai',sans-serif; font-size:11px; color:#8f9aac; }
  .ldot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
  .ldot.mf { background:#615FFF; }
  .ldot.dr { background:#D08700; }
  .ldot.etf { background:#0084D1; }
  .perf-bar { display:flex; align-items:stretch; margin-top:20px; margin-bottom:0; }
  .perf-sec { display:flex; align-items:center; flex:1; }
  .perf-sec:first-of-type { flex:3; }
  .perf-sec:last-of-type { flex:2; }
  .perf-lbl-box { padding:12px 18px; text-align:center; display:flex; align-items:center; justify-content:center; align-self:stretch; min-width:80px; }
  .perf-lbl { font-family:'Noto Sans Thai',sans-serif; font-size:16px; font-weight:700; color:#0c244a; }
  .perf-items { display:flex; flex:1; }
  .perf-item { flex:1; padding:16px 14px; }
  .perf-val { font-family:'Noto Sans Thai',sans-serif; font-size:22px; font-weight:700; color:#27ae60; margin-bottom:4px; }
  .perf-val.neutral { color:#0c244a; }
  .perf-val.neg { color:#c0392b; }
  .perf-name { font-family:'Noto Sans Thai',sans-serif; font-size:14px; color:#8f9aac; display:flex; align-items:center; gap:4px; }
  .info-icon { width:13px; height:13px; flex-shrink:0; color:#b0bac8; cursor:pointer; }
  .info-tip { position:relative; display:inline-flex; align-items:center; }
  .info-tip::after { content:attr(data-tip); position:absolute; top:calc(100% + 6px); left:50%; transform:translateX(-50%); background:#1a2e4a; color:#fff; font-size:11px; font-family:'Noto Sans Thai',sans-serif; font-weight:400; line-height:1.6; padding:8px 12px; border-radius:8px; width:210px; pointer-events:none; opacity:0; transition:opacity .15s; z-index:200; text-align:left; white-space:normal; }
  .info-tip:hover::after { opacity:1; }
  .info-tip:hover .info-icon { color:#3b5278; }
  .invest-btn-wrap { padding:50px 0; display:flex; justify-content:center; }
  .invest-btn { font-family:'Noto Sans Thai',sans-serif; font-size:14px; font-weight:600; background:#0c244a; color:#fff; border:none; padding:12px 32px; cursor:pointer; transition:background .2s; text-decoration:none; display:inline-block; }
  .invest-btn:hover { background:#1a3a6b; color:#fff; }
  .perf-divider { width:1px; background:#e2e8f0; }
  @media (min-width:768px) and (max-width:991px) {
    .perf-sec { flex-direction:column; }
    .perf-lbl-box { min-width:unset; padding:10px 0; }
    .perf-items { width:100%; }
  }
  @media (max-width:767px) {
    .perf-bar { flex-direction:column; align-items:center; }
    .perf-sec { flex-direction:column; align-items:flex-start; }
    .perf-lbl-box { min-width:unset; align-self:stretch; }
    .perf-item { border-right:none; padding:12px 6px; text-align:center; }
    .perf-val { font-size:18px; }
    .perf-name { font-size:14px; justify-content:center; }
    .perf-divider { height:1px; width:100%; }
  }
  .source-text { font-family:'Noto Sans Thai',sans-serif; font-size:16px; color:#8f9aac; line-height:1.6; margin:16px 0 40px; }
  .article-cta-row { display: grid; grid-template-columns: 3fr 1fr; gap: 16px; margin-bottom: 32px; }
  .article-cta-left { border: 1.5px solid #0000001A; background: url('/images/theme/bgoverall.jpg') center/cover no-repeat; padding: 44px 40px; }
  .article-cta-right { border: 1.5px solid #0000001A; background: url('/images/theme/bg-seeall.jpg') center/cover no-repeat; padding: 27px 40px; display: flex; flex-direction: column; justify-content: center; align-items: center; }
  .article-cta-title { font-family: 'Noto Sans Thai', sans-serif; font-size: 32px; font-weight: 700; color: #0c244a; margin-bottom: 10px; line-height: 1.3; }
  .article-cta-sub { font-family: 'Noto Sans Thai', sans-serif; font-size: 16px; color: #3d506e; margin-bottom: 24px; line-height: 1.6; }
  @media (max-width: 767px) { .article-cta-title { font-size: 20px; } .article-cta-sub { font-size: 14px; } }
  .article-cta-btn { font-family: 'Noto Sans Thai', sans-serif; font-size: 14px; font-weight: 600; background: #0c244a; color: #fff; border: none; padding: 11px 22px; border-radius: 0; cursor: pointer; white-space: nowrap; transition: background .2s; text-decoration: none; display: inline-block; }
  .article-cta-btn:hover { background: #1a3a6b; color: #fff; }
  .article-cta-right-title { font-family: 'Noto Sans Thai', sans-serif; font-size: 22px; font-weight: 700; color: #0c244a; margin-bottom: 24px; line-height: 1.4; text-align: center; }
  .article-cta-outline-btn { font-family: 'Noto Sans Thai', sans-serif; font-size: 14px; font-weight: 600; background: #fff; color: #0c244a; border: 1.5px solid #0c244a; padding: 10px 22px; border-radius: 0; cursor: pointer; white-space: nowrap; transition: all .2s; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
  .article-cta-outline-btn:hover { background: #0c244a; color: #fff; }
  @media (max-width: 767px) { .article-cta-row { grid-template-columns: 1fr; } .article-cta-left, .article-cta-right { padding: 24px 20px; } .article-cta-right { align-items: flex-start; } .article-cta-right-title { text-align: left; font-size: 20px; } }
  @media (min-width: 768px) and (max-width: 991px) { .article-cta-left, .article-cta-right { padding: 24px 16px; } .article-cta-title { font-size: 24px; } }
  .experts-section { margin-bottom: 0; padding-top: 32px; background: transparent; }
  .experts-title { font-family: 'Noto Sans Thai', sans-serif; font-size: 24px; font-weight: 700; color: #0c244a; margin-bottom: 20px; }
  .expert-item { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; background: #fff; border-radius: 0; overflow: hidden; padding: 0; }
  .expert-avatar { width: 100px; height: 100px; border-radius: 0; object-fit: cover; flex-shrink: 0; display: block; }
  .expert-info { padding: 14px 16px; flex: 1; }
  .expert-name { font-family: 'Noto Sans Thai', sans-serif; font-size: 14px; font-weight: 700; color: #0c244a; margin-bottom: 4px; }
  .expert-title { font-family: 'Noto Sans Thai', sans-serif; font-size: 12px; color: #8f9aac; line-height: 1.5; }
  .bottom-share-row { display: flex; align-items: center; gap: 8px; padding: 20px 0 32px; }
  .related-section { background: #F9F7F4; width: 100vw; position: relative; left: 50%; right: 50%; margin-left: -50vw; margin-right: -50vw; padding: 32px 0 48px; }
  .related-week-header-row { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid rgba(0,0,0,.08); }
  .related-week-chip { font-family: 'Cormorant Garamond', serif; font-size: 13px; font-weight: 600; background: #3D506E; color: #fff; padding: 3px 10px; flex-shrink: 0; } .related-week-chip-monthly { background: #0C244A; }
  .related-week-label { font-family: 'Noto Sans Thai', sans-serif; font-size: 20px; font-weight: 700; color: #0c244a; }
  .weekly-related-wrapper { position: relative; padding: 0 44px; }
  .weekly-related-swiper { position: relative; overflow: hidden; padding: 8px 0; margin: -8px 0; }
  .weekly-related-swiper .insight-card,
  .week-modal-body .insight-card { position: relative; }
  .weekly-related-wrapper .swiper-button-prev,
  .weekly-related-wrapper .swiper-button-next { position: absolute; top: 38%; width: 32px; height: 32px; background: #fff; border: 1px solid rgba(0,0,0,.15); border-radius: 0; color: #0c244a; margin-top: 0; }
  .weekly-related-wrapper .swiper-button-prev { left: 0; }
  .weekly-related-wrapper .swiper-button-next { right: 0; }
  .weekly-related-wrapper .swiper-button-prev::after,
  .weekly-related-wrapper .swiper-button-next::after { font-size: 11px; font-weight: 700; }
  .weekly-related-wrapper .swiper-button-disabled { opacity: 0.35; cursor: default; }
  @media (max-width: 767px) {
    .weekly-related-wrapper { padding: 0; }
    .weekly-related-swiper .swiper-wrapper { display: block; transform: none !important; }
    .weekly-related-swiper .swiper-button-prev,
    .weekly-related-swiper .swiper-button-next { display: none; }
    .weekly-related-swiper .swiper-slide { width: 100% !important; margin-bottom: 10px; }
    .weekly-related-swiper .insight-card { flex-direction: row; align-items: stretch; box-shadow: none; padding-right: 14px; }
    .weekly-related-swiper .insight-card:hover { box-shadow: none; transform: none; }
    .weekly-related-swiper .insight-card-img-wrap { width: 110px; min-height: 90px; flex-shrink: 0; order: 2; background: transparent; }
    .weekly-related-swiper .insight-card-img { width: 110px; height: 100%; object-fit: contain; }
    .weekly-related-swiper .insight-card-img-tag { position: static; margin-bottom: 6px; align-self: flex-start; }
    .weekly-related-swiper .insight-card-excerpt { display: none; }
    .weekly-related-swiper .insight-card-content { order: 1; flex: 1; min-width: 0; }
  }
  .insight-card { background: #fff; display: flex; flex-direction: column; height: 100%; cursor: pointer; transition: box-shadow .2s, transform .18s; box-shadow: 0 0 1px rgba(102,102,102,.14), 0 2px 6px rgba(102,102,102,.08); }
  .insight-card:hover { box-shadow: 0 4px 18px rgba(0,0,0,.11); transform: translateY(-2px); }
  .insight-card-img-wrap { position: relative; flex-shrink: 0; }
  .insight-card-img { width: 100%; aspect-ratio: 16/9; height: auto; object-fit: cover; display: block; }
  .insight-card-img-tag { position: absolute; top: 8px; left: 8px; }
  .insight-card-content { padding: 14px; display: flex; flex-direction: column; flex: 1; }
  .insight-card-date { font-family: 'Noto Sans Thai', sans-serif; font-size: 11px; color: #8f9aac; margin-bottom: 6px; }
  .insight-card-title { font-family: 'Noto Sans Thai', sans-serif; font-size: 16px; font-weight: 700; color: #0c244a; line-height: 1.45; margin-bottom: 7px; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .insight-card-excerpt { font-family: 'Noto Sans Thai', sans-serif; font-size: 13px; color: #3d506e; line-height: 1.55; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .insight-tag { font-family: 'Noto Sans Thai', sans-serif; font-size: 11px; font-weight: 600; padding: 2px 9px; white-space: nowrap; display: inline-block; }
  .tag-hot-issue     { background: #F9EDED; color: #7a1c1c; border: 1px solid #EBC7C7; }
  .tag-buy-list      { background: #EEF1F0; color: #2c4a42; border: 1px solid #CBD4D0; }
  .tag-asset-perf    { background: #F8F4ED; color: #92600a; border: 1px solid #E9DEC7; }
  .tag-mkt-calendar  { background: #E7E9ED; color: #0c244a; border: 1px solid #B4BBC7; }
  .tag-asset-outlook { background: #F2F0EE; color: #3d2c1e; border: 1px solid #D6D1CB; }
  .tag-mkt-outlook   { background: #F0EFF5; color: #3d2260; border: 1px solid #D1CCDF; }
  .fund-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:1040; opacity:0; pointer-events:none; transition:opacity .3s; }
  .fund-overlay.open { opacity:1; pointer-events:all; }
  .fund-drawer { position:fixed; top:0; right:0; bottom:0; width:700px; max-width:100vw; background:#fff; z-index:1050; transform:translateX(100%); transition:transform .35s cubic-bezier(.25,.46,.45,.94); display:flex; flex-direction:column; overflow:hidden; box-shadow:-4px 0 32px rgba(0,0,0,.15); }
  .fund-drawer.open { transform:translateX(0); }
  @media (max-width:600px) { .fund-drawer { width:100vw; } }
  .fd-head { padding:20px 24px 16px; border-bottom:1px solid #e8ecf2; flex-shrink:0; display:flex; justify-content:space-between; align-items:flex-start; }
  @media (max-width:767px) {
    .fund-drawer { top:auto; left:0; right:0; bottom:0; width:100%; max-width:100%; height:auto; max-height:88vh; border-radius:16px 16px 0 0; transform:translateY(100%); box-shadow:0 -4px 32px rgba(0,0,0,.15); }
    .fund-drawer.open { transform:translateY(0); }
    .fd-head { position:relative; padding-top:22px; }
    .fd-head::before { content:''; position:absolute; top:8px; left:50%; transform:translateX(-50%); width:36px; height:4px; border-radius:2px; background:rgba(0,0,0,.15); }
  }
  .fd-name { font-family:'Noto Sans Thai',sans-serif; font-size:24px; font-weight:700; color:#0c244a; margin-bottom:6px; }
  .fd-type-badge { display:inline-flex; align-items:center; gap:6px; font-family:'Noto Sans Thai',sans-serif; font-size:13px; color:#8f9aac; padding:3px 10px; }
  .fd-type-badge.dr { color:#8f9aac; }
  .fd-type-badge.etf { color:#8f9aac; }
  .fd-type-badge svg circle { fill:#615FFF; }
  .fd-type-badge.dr svg circle { fill:#D08700; }
  .fd-type-badge.etf svg circle { fill:#0084D1; }
  .fd-close { width:32px; height:32px; border:1px solid #e2e8f0; background:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; margin-left:12px; }
  .fd-close:hover { background:#f5f5f5; }
  .fd-body { overflow-y:auto; flex:1; padding:24px; }
  .fd-ai-box { background: url('/images/theme/bgaisummary.jpg') center/cover no-repeat; border:1px solid #3b537829; padding:20px 24px; margin-bottom:24px; }
  .fd-ai-header { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
  .fd-ai-icon { width:32px; height:32px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .fd-ai-icon img { width:32px; height:32px; object-fit:contain; }
  .fd-ai-lbl { font-family:'Noto Sans Thai',sans-serif; font-size:14px; font-weight:700; color:#0c244a; display:block; margin-bottom:2px; }
  .fd-ai-sublbl { font-family:'Noto Sans Thai',sans-serif; font-size:12px; color:#8f9aac; margin:0; }
  .fd-ai-text { font-family:'Noto Sans Thai',sans-serif; font-size:13px; color:#3d506e; line-height:1.75; }
  .fd-ai-text p { margin-bottom:8px; }
  .fd-ai-text p:last-child { margin-bottom:0; }
  .fd-section-title { font-family:'Noto Sans Thai',sans-serif; font-size:15px; font-weight:700; color:#0c244a; margin-bottom:12px; padding-bottom:8px; border-bottom:2px solid #0c244a; display:inline-block; }
  .fd-highlights { margin-bottom:0; }
  .fd-highlights ul { list-style:none; padding:0; margin:0; }
  .fd-highlights ul li { font-family:'Noto Sans Thai',sans-serif; font-size:13px; color:#3d506e; line-height:1.75; padding-left:14px; position:relative; margin-bottom:6px; }
  .fd-highlights ul li::before { content:'•'; position:absolute; left:0; color:#1a3a6b; }
  .fd-highlights span { font-size:16px !important; }
  .fd-highlights h3,
  .fd-highlights h3 span { font-size:20px !important; }
  @media (max-width:767px) { .fd-highlights h3, .fd-highlights h3 span { font-size:18px !important; } }
  .tbl-scroll-inner { overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
  .tbl-scroll-inner::-webkit-scrollbar { display:none; }
  .tbl-scroll-inner table { min-width:620px; border-collapse:collapse; font-family:'Noto Sans Thai',sans-serif; font-size:13px; }
  .tbl-scroll-inner table th { background:#a2603c; color:#fff; font-weight:600; padding:10px 16px; text-align:center; white-space:nowrap; letter-spacing:.02em; }
  .tbl-scroll-inner table td { padding:10px 16px; border-bottom:1px solid #e8ecf2; color:#3d506e; vertical-align:middle; white-space:nowrap; text-align:center; }
  .tbl-scroll-inner table tr:last-child td { border-bottom:none; }
  .tbl-scroll-inner table tr:nth-child(even) td { background:#f8f6f3; }
  .tbl-scroll-inner table tr:hover td { background:#f0ede8; }
  .tbl-scroll-nav { display:flex; align-items:center; justify-content:center; gap:10px; padding:10px 0 4px; }
  .tbl-scroll-nav span { font-family:'Noto Sans Thai',sans-serif; font-size:12px; color:#8f9aac; }
  .tbl-scroll-btn { background:none; border:none; padding:3px 12px; cursor:pointer; color:#8f9aac; font-size:16px; line-height:1.4; transition:color .15s; }
  .tbl-scroll-btn:hover { color:#3d506e; }
  .fd-cta { background: url('/images/theme/bginvest.jpg') center/cover no-repeat; padding:28px 24px; text-align:center; }
  .fd-cta-title { font-family:'Noto Sans Thai',sans-serif; font-size:16px; font-weight:700; color:#fff; margin-bottom:8px; line-height:1.4; }
  .fd-cta-desc { font-family:'Noto Sans Thai',sans-serif; font-size:13px; color:rgba(255,255,255,0.75); margin-bottom:20px; line-height:1.6; }
  .fd-cta-btn { font-family:'Noto Sans Thai',sans-serif; font-size:14px; font-weight:600; background:#a2603c; color:#fff; border:none; padding:11px 28px; cursor:pointer; transition:background .2s; }
  .fd-cta-btn:hover { background:#c07844; }
  .week-modal-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,.55); z-index: 1050; align-items: center; justify-content: center; padding: 16px; }
  .week-modal-overlay.open { display: flex; }
  .week-modal { background: #fff; width: 100%; max-width: 1100px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; }
  .week-modal-body { overflow-y: auto; -webkit-overflow-scrolling: touch; flex: 1; padding: 24px 28px 32px; }
  .week-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 28px; border-bottom: 1px solid rgba(0,0,0,.08); position: sticky; top: 0; background: #fff; z-index: 1; }
  .week-modal-title { font-family: 'Noto Sans Thai', sans-serif; font-size: 16px; font-weight: 700; color: #0c244a; margin: 0; }
  .week-modal-close { width: 32px; height: 32px; border: none; background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #3d506e; transition: background .15s; }
  .week-modal-close:hover { background: #f0f0f0; }
  @media (max-width: 767px) {
    .week-modal-overlay { align-items: flex-end; padding: 0; }
    .week-modal { width: 100%; max-width: 100%; max-height: 88vh; border-radius: 16px 16px 0 0; }
    .week-modal-header { padding-top: 22px; }
    .week-modal-header::before { content: ''; position: absolute; top: 8px; left: 50%; transform: translateX(-50%); width: 36px; height: 4px; border-radius: 2px; background: rgba(0,0,0,.15); }
    .week-modal-body .insight-card { flex-direction: row; align-items: stretch; box-shadow: none; padding-bottom: 16px; margin-bottom: 16px; border-bottom: 1px solid rgba(0,0,0,.08); }
    .week-modal-body .insight-card:hover { box-shadow: none; transform: none; }
    .week-modal-body .col-6:last-child .insight-card { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .week-modal-body .insight-card-img-wrap { width: 110px; min-height: 90px; flex-shrink: 0; order: 2; background: transparent; }
    .week-modal-body .insight-card-img { width: 110px; height: 100%; object-fit: contain; }
    .week-modal-body .insight-card-img-tag { position: static; margin-bottom: 6px; align-self: flex-start; }
    .week-modal-body .insight-card-excerpt { display: none; }
    .week-modal-body .insight-card-content { order: 1; flex: 1; min-width: 0; }
    .week-modal-body .col-6 { width: 100%; }
    .week-modal-body .row.g-3 { --bs-gutter-y: 0; }
  }
  @media (min-width: 768px) {
    .weekly-related-swiper .swiper-slide { display: flex; }
    .weekly-related-swiper .insight-card { height: 100%; }
    .weekly-related-swiper .insight-card-title { display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .weekly-related-swiper .insight-card-excerpt { display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  }
  @media (min-width: 768px) and (max-width: 991px) {
    .weekly-related-wrapper { padding: 0; margin-right: -40px; }
    .weekly-related-wrapper .swiper-button-prev,
    .weekly-related-wrapper .swiper-button-next { display: none; }
    .weekly-related-swiper { overflow: visible; }
    .weekly-related-swiper .swiper-wrapper {
      display: flex;
      transform: none !important;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      gap: 14px;
    }
    .weekly-related-swiper .swiper-wrapper::-webkit-scrollbar { display: none; }
    .weekly-related-swiper .swiper-wrapper::after { content: ''; flex: 0 0 24px; }
    .weekly-related-swiper .swiper-slide {
      flex: 0 0 244px !important;
      max-width: calc(100vw - 56px);
      width: auto !important;
      margin: 0 !important;
      scroll-snap-align: start;
    }
  }
`;

export default function SingleBuyListPage() {
  const [models, setModels] = useState<Record<string, any>>({});
  const [activeModel, setActiveModel] = useState("defender");
  const [weekSlug, setWeekSlug] = useState("");
  const [relatedHtml, setRelatedHtml] = useState<string | null>(null);
  const [monthlyHtml, setMonthlyHtml] = useState<string | null>(null);

  const v = models[activeModel] || {};
  const corePct = v.core_pct != null ? v.core_pct : 78;
  const satPct = v.satellite_pct != null ? v.satellite_pct : 22;
  const coreArc = ((corePct / 100) * CIRC).toFixed(2);
  const satArc = ((satPct / 100) * CIRC).toFixed(2);

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeMeetingModal();
        closeWeeklyModalDirect();
        closeMonthlyModalDirect();
      }
    }
    document.addEventListener("keydown", onKeydown);
    (window as any).__openFundDrawer = openDrawer;
    return () => {
      document.removeEventListener("keydown", onKeydown);
    };
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    document.querySelectorAll("#navbarMenu a[data-nav-match]").forEach((a) => {
      const m = a.getAttribute("data-nav-match");
      if (m === "/" ? path === "/" : path.indexOf(m || "") !== -1) a.classList.add("active");
    });
  }, []);

  useEffect(() => {
    const weekParam = new URLSearchParams(location.search).get("week");
    function start(week: string) {
      setWeekSlug(week);
      sbFetch("weekly_buy_list", `week_slug=eq.${encodeURIComponent(week)}`).then((rows) => {
        if (!rows.length) return;
        const m: Record<string, any> = {};
        rows.forEach((row) => { m[row.model || "defender"] = row; });
        setModels(m);
        setActiveModel((prev) => (m[prev] ? prev : Object.keys(m)[0]));
      });
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(weekParam || "")) {
      start(weekParam as string);
    } else {
      sbFetch("weekly_buy_list", "select=week_slug&order=week_slug.desc&limit=1").then((rows) => {
        if (rows.length) start(rows[0].week_slug);
      });
    }
  }, []);

  useEffect(() => {
    if (!weekSlug) return;
    Promise.all(RELATED_TABLES.map((t) => fetchWeekRows(t, weekSlug))).then((results) => {
      const valid = ([] as any[]).concat(...results);
      if (valid.length) setRelatedHtml(valid.map(relatedCardHtml).join(""));
    });
    const monthSlug = weekSlug.slice(0, 7) + "-01";
    Promise.all(
      MONTHLY_TABLES.map((t) => {
        const limit = t.multi ? 50 : 1;
        return sbFetch(t.id, `week_slug=eq.${encodeURIComponent(monthSlug)}&limit=${limit}`).then((rows) =>
          (rows || []).map((row) => monthlyCardHtml(t, row))
        );
      })
    ).then((results) => {
      const cards = ([] as string[]).concat(...results);
      setMonthlyHtml(cards.length ? '<div class="row g-3">' + cards.join("") + "</div>" : "");
    });
  }, [weekSlug]);

  useEffect(() => {
    if (!relatedHtml) return;
    const SwiperCtor = (window as any).Swiper;
    if (!SwiperCtor) return;
    new SwiperCtor(".weekly-related-swiper", {
      slidesPerView: 4,
      spaceBetween: 16,
      watchOverflow: false,
      navigation: { prevEl: ".weekly-prev", nextEl: ".weekly-next", disabledClass: "swiper-button-disabled" },
      breakpoints: { 0: { enabled: false }, 768: { enabled: false }, 992: { enabled: true, slidesPerView: 4, spaceBetween: 16 } },
    });
  }, [relatedHtml]);

  function openWeeklyModal() {
    document.getElementById("weeklyModalOverlay")?.classList.add("open");
    document.body.style.overflow = "hidden";
    const grid = document.getElementById("weeklyModalGrid");
    if (!grid) return;
    grid.innerHTML = '<p style="color:#8f9aac;font-size:14px;font-family:\'Noto Sans Thai\',sans-serif;padding:8px 0;">กำลังโหลด...</p>';
    Promise.all(RELATED_TABLES.map((t) => fetchWeekRows(t, weekSlug))).then((results) => {
      const valid = ([] as any[]).concat(...results);
      grid.innerHTML = valid.length
        ? valid.map(weekModalCardHtml).join("")
        : '<p style="color:#8f9aac;font-size:14px;font-family:\'Noto Sans Thai\',sans-serif;padding:8px 0;">ไม่พบบทความในสัปดาห์เดียวกัน</p>';
    });
  }

  function wrapTableScroll(container: HTMLElement | null) {
    if (!container) return;
    container.querySelectorAll("table").forEach((tbl) => {
      const parent = tbl.parentNode as HTMLElement;
      if (parent.classList && parent.classList.contains("tbl-scroll-inner")) return;
      const inner = document.createElement("div");
      inner.className = "tbl-scroll-inner";
      parent.insertBefore(inner, tbl);
      inner.appendChild(tbl);
      const wrap = document.createElement("div");
      inner.parentNode!.insertBefore(wrap, inner);
      wrap.appendChild(inner);
      const nav = document.createElement("div");
      nav.className = "tbl-scroll-nav";
      nav.innerHTML =
        '<button class="tbl-scroll-btn" onclick="this.parentNode.previousElementSibling.scrollBy({left:-140,behavior:\'smooth\'})">&#8249;</button>' +
        "<span>เลื่อนดูเพิ่มเติม</span>" +
        '<button class="tbl-scroll-btn" onclick="this.parentNode.previousElementSibling.scrollBy({left:140,behavior:\'smooth\'})">&#8250;</button>';
      wrap.appendChild(nav);
      const checkNav = () => { nav.style.display = inner.scrollWidth > inner.clientWidth ? "flex" : "none"; };
      requestAnimationFrame(checkNav);
      window.addEventListener("resize", checkNav);
      let isDragging = false, startX = 0, scrollLeft = 0;
      inner.style.cursor = "grab";
      inner.addEventListener("mousedown", (e) => { isDragging = true; startX = e.pageX - inner.offsetLeft; scrollLeft = inner.scrollLeft; inner.style.cursor = "grabbing"; inner.style.userSelect = "none"; });
      inner.addEventListener("mouseleave", () => { isDragging = false; inner.style.cursor = "grab"; });
      inner.addEventListener("mouseup", () => { isDragging = false; inner.style.cursor = "grab"; inner.style.userSelect = ""; });
      inner.addEventListener("mousemove", (e) => { if (!isDragging) return; e.preventDefault(); inner.scrollLeft = scrollLeft - (e.pageX - inner.offsetLeft - startX); });
    });
  }

  const fundCache: Record<string, any> = (globalThis as any).__fundCache || ((globalThis as any).__fundCache = {});
  function openDrawer(ticker: string) {
    document.getElementById("fundOverlay")?.classList.add("open");
    document.getElementById("fundDrawer")?.classList.add("open");
    document.body.style.overflow = "hidden";
    if (fundCache[ticker]) { renderDrawer(fundCache[ticker]); return; }
    const nameEl = document.getElementById("fdName");
    if (nameEl) nameEl.textContent = ticker;
    const aiEl = document.getElementById("fdAiText");
    if (aiEl) aiEl.innerHTML = "<p>กำลังโหลด...</p>";
    const hlEl = document.getElementById("fdHighlights");
    if (hlEl) hlEl.innerHTML = "";
    sbFetch("fund_detail", `ticker=eq.${encodeURIComponent(ticker)}`).then((rows) => {
      const val = rows.length ? rows[0] : { ticker, fund_name: ticker, fund_type: "mf", ai_summary: "", content: "" };
      fundCache[ticker] = val;
      renderDrawer(val);
    });
  }
  function renderDrawer(val: Record<string, any>) {
    const typeMap: Record<string, string> = { mf: "Mutual fund", dr: "DR", etf: "ETF/Offshore" };
    const typeName = val.fund_type || "mf";
    const nameEl = document.getElementById("fdName");
    if (nameEl) nameEl.textContent = val.fund_name || val.ticker || "";
    const badge = document.getElementById("fdType");
    if (badge) {
      badge.innerHTML = '<svg width="8" height="8"><circle cx="4" cy="4" r="4" fill="currentColor"/></svg> ' + (typeMap[typeName] || typeName);
      badge.className = "fd-type-badge" + (typeName === "dr" ? " dr" : typeName === "etf" ? " etf" : "");
    }
    const aiBox = document.getElementById("fdAiBox");
    const aiText = val.ai_summary && val.ai_summary.trim();
    if (aiBox) (aiBox as HTMLElement).style.display = aiText ? "" : "none";
    const aiTextEl = document.getElementById("fdAiText");
    if (aiTextEl) aiTextEl.innerHTML = aiText || "";
    const contentWrap = document.getElementById("fdContentWrap");
    const content = val.content && val.content.trim();
    if (contentWrap) (contentWrap as HTMLElement).style.display = content ? "" : "none";
    const hlEl = document.getElementById("fdHighlights");
    if (hlEl) hlEl.innerHTML = content || "";
    wrapTableScroll(document.getElementById("fdHighlights"));
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <nav className="navbar navbar-expand-lg">
        <div className="container">
          <div className="navbar-left">
            <a href="https://www.yuanta.co.th/" target="_blank" rel="noreferrer" className="navbar-main-site-btn d-none d-lg-inline-flex">
              <img src="/images/theme/wh.png" width={16} height={16} alt="" style={{ objectFit: "contain", flexShrink: 0 }} />
              เว็บไซต์หลัก
            </a>
            <a href="https://wealth.yuanta.co.th/" className="navbar-logo">
              <img src="/images/theme/Logo-wealth.svg" alt="Yuanta Wealth" />
            </a>
          </div>
          <div className="d-flex d-lg-none align-items-center" style={{ gap: 20 }}>
            <a href="#" className="btn-book-meeting d-none d-sm-inline-flex" onClick={(e) => { e.preventDefault(); openMeetingModal(); }}>Book a meeting</a>
            <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarMain" aria-controls="navbarMain" aria-expanded="false" aria-label="Toggle navigation">
              <span className="navbar-toggler-icon"></span>
            </button>
          </div>
          <div className="collapse navbar-collapse" id="navbarMain">
            <div className="navbar-right">
              <nav className="navbar-menu" id="navbarMenu">
                <a href="/" data-nav-match="/">Home</a>
                <a href="/wealth-whyus" data-nav-match="/wealth-whyus">Why us</a>
                <a href="/wealth-privilegesandevents" data-nav-match="/wealth-privileges">Privileges &amp; events</a>
                <a href="/wealth-insights" data-nav-match="/wealth-insights">Insights</a>
                <a href="/wealth-contactus" data-nav-match="/wealth-contact">Contact us</a>
              </nav>
              <a href="#" className="btn-book-meeting" onClick={(e) => { e.preventDefault(); openMeetingModal(); }}>Book a meeting</a>
            </div>
          </div>
        </div>
      </nav>

      <div className="insight-page">
        <div className="insight-breadcrumb">
          <div className="container">
            <div className="col-12 col-lg-9 mx-auto">
              <ol>
                <li><a href="https://wealth.yuanta.co.th/">Home</a></li>
                <li className="sep">/</li>
                <li><a href="/wealth-insights">Insights</a></li>
                <li className="sep">/</li>
                <li className="active">Weekly Buy List</li>
              </ol>
            </div>
          </div>
        </div>

        <section className="article-header">
          <div className="container">
            <div className="row g-5">
              <div className="col-12 col-lg-9 mx-auto">
                <span className="article-category-tag">Buy list</span>
                <h1 className="article-title">{v.main_title || "Weekly Buy List"}</h1>
                <p className="article-subtitle">{v.page_subtitle || "ปรับพอร์ตล่าสุด"}</p>
                <div className="article-meta-row">
                  <p className="article-date">{thaiDate(v.page_date)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="article-body">
          <div className="container">
            <div className="row g-5">
              <div className="col-12 col-lg-9 mx-auto">
                <div className="cio-box">
                  <p className="cio-box-title">Yuanta CIO Office</p>
                  {v.cio_content ? <div dangerouslySetInnerHTML={{ __html: v.cio_content }} /> : <ul></ul>}
                </div>

                <div className="pm-header">
                  <p className="pm-title">Portfolio models</p>
                  <div className="pm-tabs">
                    {(["defender", "flexible", "growth"] as const).map((mode) =>
                      models[mode] ? (
                        <button
                          key={mode}
                          className={`pm-tab${activeModel === mode ? " active" : ""}`}
                          onClick={() => setActiveModel(mode)}
                        >
                          {mode === "defender" ? "Defender (30/70)" : mode === "flexible" ? "Flexible (60/40)" : "Growth (70/30)"}
                        </button>
                      ) : null
                    )}
                  </div>
                </div>
                <div className="pm-content">
                  <div className="pm-layout">
                    <div className="donut-col">
                      <div className="donut-wrap">
                        <svg viewBox="0 0 200 200" width="200" height="200">
                          <circle cx="100" cy="100" r="80" fill="none" stroke="#0c244a" strokeWidth="34" strokeDasharray={`${coreArc} ${CIRC}`} transform="rotate(-90 100 100)" />
                          <circle cx="100" cy="100" r="80" fill="none" stroke="#a2603c" strokeWidth="34" strokeDasharray={`${satArc} ${CIRC}`} strokeDashoffset={`-${coreArc}`} transform="rotate(-90 100 100)" />
                          <text x="100" y="72" textAnchor="middle" fontFamily="'Noto Sans Thai',sans-serif" fontSize="11" fill="#8f9aac">Core</text>
                          <text x="100" y="97" textAnchor="middle" fontFamily="'Noto Sans Thai',sans-serif" fontSize="22" fontWeight="700" fill="#0c244a">{corePct}%</text>
                          <text x="100" y="118" textAnchor="middle" fontFamily="'Noto Sans Thai',sans-serif" fontSize="11" fill="#a2603c">Satellite</text>
                          <text x="100" y="143" textAnchor="middle" fontFamily="'Noto Sans Thai',sans-serif" fontSize="22" fontWeight="700" fill="#a2603c">{satPct}%</text>
                        </svg>
                      </div>
                      <p className="donut-note">*นักลงทุนไม่จำเป็นต้องลงทุนทุกสินทรัพย์ใน Portfolio โดย Yuanta CIO แนะนำให้จัดสัดส่วนให้เหมาะสมและเลือกสินทรัพย์ตามความเสี่ยงที่รับได้</p>
                    </div>
                    <div className="cards-col">
                      <div className="portfolio-card" id="pc-core" dangerouslySetInnerHTML={{ __html: coreCardHtml(v) }} />
                      <div className="portfolio-card" id="pc-satellite" dangerouslySetInnerHTML={{ __html: satelliteCardHtml(v) }} />
                    </div>
                  </div>
                  <div className="invest-btn-wrap">
                    <a href="#" className="invest-btn">สนใจลงทุน</a>
                  </div>
                </div>

                <div className="perf-bar">
                  <div className="perf-sec">
                    <div className="perf-lbl-box"><span className="perf-lbl">ผลตอบแทน</span></div>
                    <div className="perf-items">
                      <div className="perf-item"><div className={`perf-val${v.perf_lt_return ? "" : " neutral"}`}>{v.perf_lt_return ? `${v.perf_lt_return}%` : "-"}</div><div className="perf-name">Portfolio LT Return <span className="info-tip" data-tip="คาดการณ์อัตราผลตอบแทนเฉลี่ยของพอร์ตการลงทุนในระยะยาว (5-10 ปีขึ้นไป)"><svg className="info-icon" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/><path d="M8 7v5M8 5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg></span></div></div>
                      <div className="perf-item"><div className={`perf-val${v.perf_core_return ? "" : " neutral"}`}>{v.perf_core_return ? `${v.perf_core_return}%` : "-"}</div><div className="perf-name">Core Return <span className="info-tip" data-tip="คาดการณ์ผลตอบแทนของพอร์ตหลัก (Core portfolio) ที่เน้นการลงทุนระยะยาว เพื่อสร้างความมั่นคง"><svg className="info-icon" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/><path d="M8 7v5M8 5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg></span></div></div>
                      <div className="perf-item"><div className={`perf-val${v.perf_sat_return ? "" : " neutral"}`}>{v.perf_sat_return ? `${v.perf_sat_return}%` : "-"}</div><div className="perf-name">Satellite Return <span className="info-tip" data-tip="คาดการณ์ผลตอบแทนของพอร์ตเสริม (Satellite portfolio) ที่เน้นการเพิ่มโอกาส รับผลตอบแทนส่วนเพิ่ม"><svg className="info-icon" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/><path d="M8 7v5M8 5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg></span></div></div>
                    </div>
                  </div>
                  <div className="perf-divider"></div>
                  <div className="perf-sec">
                    <div className="perf-lbl-box"><span className="perf-lbl">ความเสี่ยง</span></div>
                    <div className="perf-items">
                      <div className="perf-item"><div className="perf-val neutral">{v.perf_risk_sd ? `${v.perf_risk_sd}%` : "-"}</div><div className="perf-name">Portfolio Risk (SD) <span className="info-tip" data-tip="ความเสี่ยงคาดการณ์ของพอร์ตโฟลิโอ วัดจากส่วนเบี่ยงเบนมาตรฐาน (Standard Deviation) ยิ่งสูงแสดงถึงความผันผวนที่มากขึ้น"><svg className="info-icon" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/><path d="M8 7v5M8 5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg></span></div></div>
                      <div className="perf-item"><div className="perf-val neg">{v.perf_var_95 ? `${v.perf_var_95}%` : "-"}</div><div className="perf-name">Portfolio VaR (95%) <span className="info-tip" data-tip="มูลค่าความเสียหายสูงสุดที่คาดว่าจะเกิดขึ้น ณ ระดับความเชื่อมั่น 95% สื่อถึงมีโอกาส 5% ที่ขาดทุนเกินกว่าค่านี้"><svg className="info-icon" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/><path d="M8 7v5M8 5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg></span></div></div>
                    </div>
                  </div>
                </div>

                <p className="source-text">{v.source_text || ""}</p>

                <div className="article-cta-row">
                  <div className="article-cta-left">
                    <p className="article-cta-title">ต้องการดูภาพรวมทั้งสัปดาห์?</p>
                    <p className="article-cta-sub">เนื้อหานี้เป็นส่วนหนึ่งของบทวิเคราะห์ฉบับเต็มที่ครอบคลุมเนื้อหาทุก asset class</p>
                    <a className="article-cta-btn" id="ctaPdfBtn" href={`/wealth-weekly-report?week=${encodeURIComponent(weekSlug)}`} target="_blank" rel="noreferrer">ดูมุมมองเพิ่มเติม</a>
                  </div>
                  <div className="article-cta-right">
                    <p className="article-cta-right-title">ดูมุมมอง<br />บทวิเคราะห์อื่นในเดือนนี้</p>
                    <button className="article-cta-outline-btn" onClick={() => openMonthlyModal()}>บทวิเคราะห์ประจำเดือน &gt;</button>
                  </div>
                </div>

                <div className="experts-section" id="expertsSection">
                  <p className="experts-title">บทวิเคราะห์โดย</p>
                  <div className="row g-3" id="expertsGrid">
                    {EXPERTS.map((e) => (
                      <div className="col-12 col-sm-4" key={e.name}>
                        <div className="expert-item d-flex align-items-stretch">
                          <img className="expert-avatar" src={e.photo} alt={e.name} />
                          <div className="expert-info">
                            <p className="expert-name">{e.name}</p>
                            {e.credentials && <p className="expert-title" style={{ color: "#3d506e", fontWeight: 600, marginBottom: 4 }}>{e.credentials}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bottom-share-row">
                  <span className="article-share-label">แชร์</span>
                  <button className="share-btn" onClick={() => shareToFacebook()} title="Facebook">
                    <svg viewBox="0 0 20 20" fill="none"><path d="M11 10.5h2l.5-2.5H11V6.5c0-.7.35-1.5 1.5-1.5H13.5V2.5A13 13 0 0011.5 2.5C9.14 2.5 8 3.9 8 6v2H5.5v2.5H8V18h3v-7.5z" fill="#1877F2"/></svg>
                  </button>
                  <button className="share-btn" onClick={() => shareToX()} title="X">
                    <svg viewBox="0 0 20 20" fill="none"><path d="M15.5 3h-2.1l-3.4 4.3L6.4 3H2l5.7 7.3L2.1 17H4.2l3.7-4.6 3.7 4.6H16l-6-7.7L15.5 3z" fill="#000"/></svg>
                  </button>
                  <button className="share-btn" onClick={() => copyLink()} title="คัดลอก">
                    <svg viewBox="0 0 20 20" fill="none"><path d="M8.5 11.5a4 4 0 005.66 0l2-2a4 4 0 00-5.66-5.66l-1 1" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/><path d="M11.5 8.5a4 4 0 00-5.66 0l-2 2a4 4 0 005.66 5.66l1-1" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                  <button className="share-btn" onClick={() => shareByEmail()} title="อีเมล">
                    <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2" stroke="#555" strokeWidth="1.5"/><path d="M2 7l8 5 8-5" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                </div>

                {relatedHtml && (
                  <div className="related-section" id="relatedSection">
                    <div className="container">
                      <div className="col-12 col-lg-9 mx-auto">
                        <div className="related-week-header-row">
                          <span className="related-week-chip">Weekly</span>
                          <span className="related-week-label" id="relatedWeekLabel">{v.page_subtitle || "บทวิเคราะห์รายสัปดาห์เดียวกัน"}</span>
                        </div>
                        <div className="weekly-related-wrapper">
                          <div className="swiper weekly-related-swiper">
                            <div className="swiper-wrapper" id="relatedSwiperWrapper" dangerouslySetInnerHTML={{ __html: relatedHtml }} />
                          </div>
                          <div className="swiper-button-prev weekly-prev"></div>
                          <div className="swiper-button-next weekly-next"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="week-modal-overlay" id="monthlyModalOverlay" onClick={(e) => { if (e.target === e.currentTarget) closeMonthlyModalDirect(); }}>
        <div className="week-modal">
          <div className="week-modal-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
              <span className="related-week-chip related-week-chip-monthly">Monthly</span>
              <span className="related-week-label">บทวิเคราะห์รายเดือนเดียวกัน</span>
            </div>
            <button className="week-modal-close" onClick={() => closeMonthlyModalDirect()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="week-modal-body" id="monthlyModalBody">
            {monthlyHtml ? (
              <div dangerouslySetInnerHTML={{ __html: monthlyHtml }} />
            ) : (
              <p style={{ color: "#8f9aac", fontSize: 14, fontFamily: "'Noto Sans Thai',sans-serif", padding: "8px 0" }}>{monthlyHtml === "" ? "ยังไม่มีบทวิเคราะห์ประจำเดือนนี้" : "กำลังโหลด..."}</p>
            )}
          </div>
        </div>
      </div>

      <div className="week-modal-overlay" id="weeklyModalOverlay" onClick={(e) => { if (e.target === e.currentTarget) closeWeeklyModalDirect(); }}>
        <div className="week-modal">
          <div className="week-modal-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
              <span className="related-week-chip">Weekly</span>
              <span className="related-week-label" id="modalWeekLabel">{v.page_subtitle || "บทวิเคราะห์รายสัปดาห์เดียวกัน"}</span>
            </div>
            <button className="week-modal-close" onClick={() => closeWeeklyModalDirect()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="week-modal-body">
            <div className="row g-3" id="weeklyModalGrid"></div>
          </div>
        </div>
      </div>

      <div className="fund-overlay" id="fundOverlay" onClick={() => closeDrawer()}></div>
      <div className="fund-drawer" id="fundDrawer">
        <div className="fd-head">
          <div>
            <div className="fd-name" id="fdName"></div>
            <span className="fd-type-badge" id="fdType"><svg width="8" height="8"><circle cx="4" cy="4" r="4" fill="currentColor"/></svg> Mutual fund</span>
          </div>
          <button className="fd-close" onClick={() => closeDrawer()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="fd-body">
          <div className="fd-ai-box" id="fdAiBox">
            <div className="fd-ai-header">
              <div className="fd-ai-icon"><img src="/images/theme/ai-icon.png" alt="AI" /></div>
              <div>
                <span className="fd-ai-lbl">AI Summary</span>
                <p className="fd-ai-sublbl">บทสรุปจาก AI อ้างอิงโดยบทวิเคราะห์</p>
              </div>
            </div>
            <div className="fd-ai-text" id="fdAiText"></div>
          </div>
          <div className="fd-highlights" id="fdContentWrap">
            <div id="fdHighlights"></div>
          </div>
          <div className="fd-cta">
            <p className="fd-cta-title">ปรึกษาแผนการลงทุนกับผู้เชี่ยวชาญ</p>
            <p className="fd-cta-desc">นัดหมายพูดคุยแผนการลงทุน เพื่อรับคำแนะนำด้านการลงทุน<br />ที่เหมาะกับเป้าหมายและแผนการเงินของท่าน</p>
            <button className="fd-cta-btn">นัดหมาย</button>
          </div>
        </div>
      </div>

      <footer className="footer">
        <div className="container">
          <div className="row gy-4 align-items-start">
            <div className="col-12 col-lg-3">
              <div className="footer-brand">
                <img className="footer-logo" src="/images/theme/Logo-wealth.svg" alt="Yuanta Wealth" />
              </div>
            </div>
            <div className="col-12 col-lg-4">
              <div className="footer-nav-wrap">
                <ul className="footer-nav-links">
                  <li><a href="/why-us">Why us</a></li>
                  <li><a href="/wealth-insights">Insights</a></li>
                </ul>
                <ul className="footer-nav-links">
                  <li><a href="/privileges-events">Privileges &amp; Events</a></li>
                  <li><a href="/contact-us">Contact Us</a></li>
                </ul>
              </div>
            </div>
            <div className="col-12 col-lg-3">
              <div className="footer-contact-col">
                <div className="footer-contact-item">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/></svg>
                  <a href="tel:020098000">0-2009-8000</a>
                </div>
                <div className="footer-contact-item">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>
                  <a href="mailto:online@yuanta.co.th">online@yuanta.co.th</a>
                </div>
                <div className="footer-social">
                  <a href="https://www.facebook.com/yuantathai" target="_blank" rel="noreferrer"><img src="/images/theme/Facebook.png" alt="Facebook" /></a>
                  <a href="https://line.me/R/ti/p/@sxk4157s" target="_blank" rel="noreferrer"><img src="/images/theme/Line.png" alt="Line" /></a>
                  <a href="https://www.youtube.com/channel/UCqpfaQS5MRpI_As13qX3-hA" target="_blank" rel="noreferrer"><img src="/images/theme/Youtube.png" alt="YouTube" /></a>
                  <a href="https://www.instagram.com/yuantathai" target="_blank" rel="noreferrer"><img src="/images/theme/Instagram.png" alt="Instagram" /></a>
                  <a href="https://t.me/Yuantathai" target="_blank" rel="noreferrer"><img src="/images/theme/Telegram.png" alt="Telegram" /></a>
                  <a href="https://x.com/yuantathai" target="_blank" rel="noreferrer"><img src="/images/theme/X.png" alt="X" /></a>
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-2">
              <p className="footer-address-text">เลขที่ 127 อาคารเกษร ทาวเวอร์ ชั้น 14-16 ถนนราชดำริ แขวงลุมพินี เขตปทุมวัน กรุงเทพมหานคร 10330</p>
            </div>
          </div>
        </div>
      </footer>

      <div id="meeting-modal" className="meeting-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeMeetingModal(); }}>
        <div className="meeting-modal-box">
          <button className="meeting-modal-close" type="button" onClick={() => closeMeetingModal()}>&#10005;</button>
          <div className="meeting-loading" id="meeting-loading"><div className="meeting-loading-spinner"></div></div>
          <iframe
            id="setmore-iframe"
            style={{ width: "100%", height: "calc(90vh - 40px)", border: "none", borderRadius: "12px 12px 0 0" }}
            allowFullScreen
            onLoad={() => {
              const el = document.getElementById("meeting-loading");
              if (el) el.style.display = "none";
            }}
          />
        </div>
      </div>
    </>
  );
}

"use client";

// PoC: port of yuanta-wealth-supabase-poc/single-hot-issue.html onto Webflow
// Cloud (Next.js). Design/CSS unchanged; dynamic sections (row content,
// related swiper, monthly modal, experts) use React state + useEffect
// instead of a raw injected <script> — see the home.html port for why
// (a plain injected script mutating a JSX-managed container races React
// hydration and gets reverted).
//
// The [slug] folder name only exists so Next accepts an arbitrary trailing
// URL segment, matching production's /wealth-single-weekly-hotissue/<path>
// convention. The identifier is read from window.location (path segment or
// ?path=), never from Next's params — same as every other PoC page.

import { useEffect, useState } from "react";

const SUPABASE_URL = "https://kqgdvpqygepvaifzrxki.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_6khmxt87r-YGlSxyF9d9XA_G0NNDTbp";

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
  const modal = document.getElementById("meeting-modal");
  if (!modal) return;
  modal.classList.remove("active");
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
  location.href = "mailto:?subject=Hot Issue — Yuanta Wealth&body=" + encodeURIComponent(location.href);
}

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
type WTable = { id: string; label: string; cls: string; path: string; useId?: boolean; limit?: number };
const WEEKLY_TABLES: WTable[] = [
  { id: "weekly_hot_issue", label: "Hot issue", cls: "tag-hot-issue", path: "/wealth-single-weekly-hotissue/" },
  { id: "weekly_asset_performance", label: "Asset performance", cls: "tag-asset-perf", path: "/wealth-single-weekly-asset-performance/" },
  { id: "weekly_buy_list", label: "Buy list", cls: "tag-buy-list", path: "/wealth-single-weekly-buy-list/" },
  { id: "weekly_market_calendar", label: "Market calendar", cls: "tag-mkt-calendar", path: "/wealth-single-weekly-market-calendar/" },
];
const RELATED_TABLES = WEEKLY_TABLES.filter((t) => t.id !== "weekly_hot_issue");
const MONTHLY_TABLES: WTable[] = [
  { id: "monthly_hot_issue", label: "Hot issue", cls: "tag-hot-issue", path: "/wealth-single-monthly-hotissue/", useId: true },
  { id: "monthly_asset_performance", label: "Asset performance", cls: "tag-asset-perf", path: "/wealth-single-monthly-asset-performance/", limit: 1 },
  { id: "monthly_buy_list", label: "Buy list", cls: "tag-buy-list", path: "/wealth-single-monthly-buy-list/", limit: 1 },
  { id: "monthly_market_calendar", label: "Market calendar", cls: "tag-mkt-calendar", path: "/wealth-single-monthly-market-calendar/", limit: 1 },
  { id: "monthly_market_outlook", label: "Market outlook", cls: "tag-mkt-outlook", path: "/wealth-single-monthly-market-outlook/", limit: 1 },
  { id: "monthly_asset_class_outlook", label: "Asset class outlook", cls: "tag-asset-outlook", path: "/wealth-single-monthly-asset-class-outlook/", useId: true },
];

function thaiDate(s?: string) {
  if (!s) return "";
  const d = new Date(s + "T00:00:00Z");
  const m = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  return d.getUTCDate() + " " + m[d.getUTCMonth()] + " " + (d.getUTCFullYear() + 543);
}
function thaiDateM(s?: string) {
  if (!s) return "";
  const d = new Date(s + "T00:00:00Z");
  const m = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return d.getUTCDate() + " " + m[d.getUTCMonth()] + " " + (d.getUTCFullYear() + 543);
}
function stripHtml(html?: string) {
  if (typeof document === "undefined") return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  return tmp.textContent || "";
}
function cardHtml(t: WTable, row: Record<string, any>, url: string) {
  const src = THUMB[t.id] || FALLBACK_IMG;
  const excerpt = row.description || stripHtml(row.ai_summary);
  return (
    '<div class="swiper-slide">' +
    `<div class="insight-card" onclick="location.href='${url}'">` +
    `<div class="insight-card-img-wrap"><img class="insight-card-img" src="${src}" alt="" /></div>` +
    '<div class="insight-card-content">' +
    `<span class="insight-card-img-tag insight-tag ${t.cls}">${t.label}</span>` +
    `<h4 class="insight-card-title">${row.main_title || ""}</h4>` +
    `<p class="insight-card-date">${thaiDateM(row.page_date)}</p>` +
    (excerpt ? `<p class="insight-card-excerpt">${excerpt}</p>` : "") +
    "</div></div></div>"
  );
}
function monthlyCardHtml(t: WTable, row: Record<string, any>) {
  const src = THUMB[t.id] || FALLBACK_IMG;
  const url = t.path + (t.useId ? row.path || "" : (row.week_slug || "").trim());
  const excerpt = row.description || stripHtml(row.ai_summary);
  return (
    '<div class="col-6 col-lg-3">' +
    `<div class="insight-card" onclick="location.href='${url}'">` +
    `<div class="insight-card-img-wrap"><img class="insight-card-img" src="${src}" alt="" /></div>` +
    '<div class="insight-card-content">' +
    `<span class="insight-card-img-tag insight-tag ${t.cls}">${t.label}</span>` +
    `<h4 class="insight-card-title">${row.main_title || ""}</h4>` +
    `<p class="insight-card-date">${thaiDateM(row.page_date)}</p>` +
    (excerpt ? `<p class="insight-card-excerpt">${excerpt}</p>` : "") +
    "</div></div></div>"
  );
}

function wrapTableScroll(root: HTMLElement | null) {
  if (!root) return;
  root.querySelectorAll("table").forEach((tbl) => {
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
    const checkNav = () => {
      nav.style.display = inner.scrollWidth > inner.clientWidth ? "flex" : "none";
    };
    requestAnimationFrame(checkNav);
    window.addEventListener("resize", checkNav);
    let isDragging = false,
      startX = 0,
      scrollLeft = 0;
    inner.style.cursor = "grab";
    inner.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.pageX - inner.offsetLeft;
      scrollLeft = inner.scrollLeft;
      inner.style.cursor = "grabbing";
      inner.style.userSelect = "none";
    });
    inner.addEventListener("mouseleave", () => {
      isDragging = false;
      inner.style.cursor = "grab";
    });
    inner.addEventListener("mouseup", () => {
      isDragging = false;
      inner.style.cursor = "grab";
      inner.style.userSelect = "";
    });
    inner.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      e.preventDefault();
      inner.scrollLeft = scrollLeft - (e.pageX - inner.offsetLeft - startX);
    });
  });
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

const CSS = `
  .insight-page { margin-top: 90px; background: #fff; }
  .insight-breadcrumb { padding: 30px 0; background: #fff; }
  .insight-breadcrumb ol { margin: 0; padding: 0; list-style: none; display: flex; align-items: center; gap: 6px; font-family: 'Noto Sans Thai', sans-serif; font-size: 13px; color: #8f9aac; }
  .insight-breadcrumb li a { color: #8f9aac; text-decoration: none; }
  .insight-breadcrumb li a:hover { color: #a2603c; }
  .insight-breadcrumb li.active { color: #a2603c; }
  .insight-breadcrumb li.sep { color: #ccc; }
  .article-header { padding: 0 0 32px; text-align: left; }
  .article-category-tag { display: inline-block; font-family: 'Cormorant Garamond','Noto Sans Thai',Georgia,serif; font-size: 14px; font-weight: 500; padding: 4px 16px; background: #F9EDED; color: #7a1c1c; border: 1px solid #EBC7C7; border: 1px solid rgba(122,28,28,.15); margin-bottom: 20px; letter-spacing: .03em; }
  .article-title { font-family: 'Noto Sans Thai', sans-serif; font-size: 35px; font-weight: 700; color: #0c244a; line-height: 1.3; margin-bottom: 16px; padding: 0; }
  .article-subtitle { font-family: 'Noto Sans Thai', sans-serif; font-size: 24px; font-weight: 700; color: #3D506E; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid rgba(0,0,0,0.1); }
  @media (max-width: 991px) { .article-title { font-size: 28px; } }
  @media (max-width: 767px) {
    .article-header { padding: 0 0 24px; }
    .article-title { font-size: 24px; }
    .article-subtitle { font-size: 18px; }
  }
  .article-date { font-family: 'Noto Sans Thai', sans-serif; font-size: 14px; color: #3D506E; font-weight: 600; }
  .article-share { display: flex; align-items: center; gap: 8px; margin-bottom: 50px; }
  .article-share-label { font-family: 'Noto Sans Thai', sans-serif; font-size: 14px; color: #3d506e; margin-right: 4px; }
  .share-btn { width: 36px; height: 36px; border: 1px solid rgba(0,0,0,.12); background: #fff; border-radius: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background .15s; }
  .share-btn:hover { background: #f5f5f5; }
  .share-btn svg { width: 16px; height: 16px; }
  .article-body { padding: 0; }
  @media (max-width: 767px) { .article-body { padding: 0; } }
  .ai-summary-box { background: url('/images/theme/bgaisummary.jpg') center/cover no-repeat; border: 1px solid #3b537829; padding: 28px 32px; margin-bottom: 40px; }
  @media (max-width: 767px) { .ai-summary-box { padding: 20px; background: url('/images/theme/Mobile-Ai-summary.jpg') center/cover no-repeat; } }
  .ai-summary-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
  .ai-summary-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ai-summary-icon img { width: 32px; height: 32px; object-fit: contain; }
  .ai-summary-label { font-family: 'Cormorant Garamond', sans-serif; font-size: 32px; font-weight: 700; color: #0c244a; display: block; margin-bottom: 2px; }
  @media (max-width: 767px) { .ai-summary-label { font-size: 24px; } }
  .ai-summary-sublabel { font-family: 'Noto Sans Thai', sans-serif; font-size: 16px; color: #8f9aac; margin: 0; }
  .ai-summary-text { font-family: 'Noto Sans Thai', sans-serif; font-size: 16px; color: #0C244A; line-height: 1.75; }
  .ai-summary-text p { margin-bottom: 8px; }
  .ai-summary-text p:last-child { margin-bottom: 0; }
  .article-content { font-family: 'Noto Sans Thai', sans-serif; font-size: 16px; color: #1a2e44; line-height: 1.75; }
  .article-content h2 { font-family: 'Noto Sans Thai', sans-serif; font-size: 18px; font-weight: 700; color: #0c244a; margin: 32px 0 16px; padding-bottom: 12px; border-bottom: 2px solid #0c244a; display: inline-block; }
  .article-content h3 { font-family: 'Noto Sans Thai', sans-serif; font-size: 20px; font-weight: 700; color: #0c244a; margin: 24px 0 12px; }
  .article-content p { margin-bottom: 14px; }
  @media (max-width: 767px) { .article-content h3 { font-size: 18px; } .article-content p { font-size: 16px; } }
  .article-content tbody, .article-content td, .article-content tfoot, .article-content th, .article-content thead, .article-content tr { border-width: 1px; }
  .article-content img { width: 100%; border-radius: 4px; margin: 16px 0; display: block; }
  .article-content ul, .article-content ol { padding-left: 20px; margin-bottom: 14px; }
  .article-content ul { list-style: disc; }
  .article-content ol { list-style: decimal; }
  .article-content li { margin-bottom: 6px; }
  .article-cta-row { display: grid; grid-template-columns: 3fr 1fr; gap: 16px; margin-bottom: 32px; margin-top: 48px; }
  .article-cta-left { border: 1.5px solid #0000001A; background: url('/images/theme/bgoverall.jpg') center/cover no-repeat; padding: 44px 40px; }
  .article-cta-right { border: 1.5px solid #0000001A; background: url('/images/theme/bg-seeall.jpg') center/cover no-repeat; padding: 27px 40px; display: flex; flex-direction: column; justify-content: center; align-items: center; }
  .article-cta-title { font-family: 'Noto Sans Thai', sans-serif; font-size: 32px; font-weight: 700; color: #0c244a; margin-bottom: 10px; line-height: 1.3; }
  .article-cta-sub { font-family: 'Noto Sans Thai', sans-serif; font-size: 16px; color: #3d506e; margin-bottom: 24px; line-height: 1.6; }
  @media (max-width: 767px) { .article-cta-title { font-size: 20px; } .article-cta-sub { font-size: 14px; } }
  .article-cta-right-title { font-family: 'Noto Sans Thai', sans-serif; font-size: 22px; font-weight: 700; color: #0c244a; margin-bottom: 24px; line-height: 1.4; text-align: center; }
  .article-cta-btn { font-family: 'Noto Sans Thai', sans-serif; font-size: 14px; font-weight: 600; background: #0c244a; color: #fff; border: none; padding: 11px 22px; border-radius: 0; cursor: pointer; white-space: nowrap; transition: background .2s; text-decoration: none; display: inline-block; }
  .article-cta-btn:hover { background: #1a3a6b; color: #fff; }
  .article-cta-outline-btn { font-family: 'Noto Sans Thai', sans-serif; font-size: 14px; font-weight: 600; background: #fff; color: #0c244a; border: 1.5px solid #0c244a; padding: 10px 22px; border-radius: 0; cursor: pointer; white-space: nowrap; transition: all .2s; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
  .article-cta-outline-btn:hover { background: #0c244a; color: #fff; }
  @media (max-width: 767px) { .article-cta-row { grid-template-columns: 1fr; } .article-cta-left, .article-cta-right { padding: 24px 20px; } .article-cta-right { align-items: flex-start; } .article-cta-right-title { text-align: left; font-size: 20px; } }
  @media (min-width: 768px) and (max-width: 991px) { .article-cta-left, .article-cta-right { padding: 24px 16px; } .article-cta-title { font-size: 24px; } }
  .experts-section { margin-bottom: 0; background: transparent; }
  .experts-title { font-family: 'Noto Sans Thai', sans-serif; font-size: 24px; font-weight: 700; color: #0c244a; margin-bottom: 20px; }
  .expert-item { display: flex; align-items: stretch; background: #fff; border-radius: 0; overflow: hidden; margin-bottom: 16px; }
  .expert-avatar { width: 100px; height: 100px; object-fit: cover; flex-shrink: 0; display: block; }
  .expert-info { padding: 14px 16px; flex: 1; }
  .expert-name { font-family: 'Noto Sans Thai', sans-serif; font-size: 14px; font-weight: 700; color: #0c244a; margin-bottom: 4px; }
  .expert-credentials { font-family: 'Noto Sans Thai', sans-serif; font-size: 12px; color: #3d506e; font-weight: 600; margin-bottom: 0; }
  .tbl-scroll-inner { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
  .tbl-scroll-inner::-webkit-scrollbar { display: none; }
  .tbl-scroll-nav { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 10px 0 4px; }
  .tbl-scroll-nav span { font-family: 'Noto Sans Thai', sans-serif; font-size: 12px; color: #8f9aac; }
  .tbl-scroll-btn { background: none; border: none; padding: 3px 12px; cursor: pointer; color: #8f9aac; font-size: 16px; line-height: 1.4; transition: color .15s; }
  .tbl-scroll-btn:hover { color: #3d506e; }
  .insight-card { background: #fff; display: flex; flex-direction: column; height: 100%; cursor: pointer; transition: box-shadow .2s, transform .18s; box-shadow: 0 0 1px rgba(102,102,102,.14), 0 2px 6px rgba(102,102,102,.08); }
  .insight-card:hover { box-shadow: 0 4px 18px rgba(0,0,0,.11); transform: translateY(-2px); }
  .insight-card-img-wrap { position: relative; flex-shrink: 0; }
  .insight-card-img { width: 100%; aspect-ratio: 16/9; height: auto; object-fit: cover; display: block; }
  .insight-card-img-tag { position: absolute; top: 8px; left: 8px; }
  .insight-card-content { padding: 14px; display: flex; flex-direction: column; flex: 1; }
  .insight-card-date { font-family: 'Noto Sans Thai', sans-serif; font-size: 11px; color: #8f9aac; margin-bottom: 6px; }
  .insight-card-title { font-family: 'Noto Sans Thai', sans-serif; font-size: 16px; font-weight: 700; color: #0c244a; line-height: 1.45; margin-bottom: 7px; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .insight-card-excerpt { font-family: 'Noto Sans Thai', sans-serif; font-size: 13px; color: #3d506e; line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .insight-tag { font-family: 'Noto Sans Thai', sans-serif; font-size: 11px; font-weight: 600; padding: 2px 9px; white-space: nowrap; display: inline-block; }
  .tag-hot-issue { background: #F9EDED; color: #7a1c1c; border: 1px solid #EBC7C7; }
  .tag-asset-perf { background: #F8F4ED; color: #92600a; border: 1px solid #E9DEC7; }
  .tag-mkt-calendar { background: #E7E9ED; color: #0c244a; border: 1px solid #B4BBC7; }
  .tag-asset-outlook { background: #F2F0EE; color: #3d2c1e; border: 1px solid #D6D1CB; }
  .tag-buy-list { background: #EEF1F0; color: #2c4a42; border: 1px solid #CBD4D0; }
  .tag-mkt-outlook { background: #F0EFF5; color: #3d2260; border: 1px solid #D1CCDF; }
  .related-section { background: #F9F7F4; width: 100vw; position: relative; left: 50%; right: 50%; margin-left: -50vw; margin-right: -50vw; padding: 32px 0 48px; }
  .related-week-header-row { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid rgba(0,0,0,.08); }
  .related-week-chip { font-family: 'Cormorant Garamond', serif; font-size: 13px; font-weight: 600; background: #3D506E; color: #fff; padding: 3px 10px; flex-shrink: 0; } .related-week-chip-monthly { background: #0C244A; }
  .related-week-label { font-family: 'Noto Sans Thai', sans-serif; font-size: 20px; font-weight: 700; color: #0c244a; }
  .related-week-date { font-family: 'Noto Sans Thai', sans-serif; font-size: 13px; color: #3D506E; margin-left: 4px; }
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
    .weekly-related-swiper .insight-card,
    .week-modal-body .insight-card { flex-direction: row; align-items: stretch; }
    .weekly-related-swiper .insight-card { box-shadow: none; padding-right: 14px; }
    .weekly-related-swiper .insight-card:hover { box-shadow: none; transform: none; }
    .weekly-related-swiper .insight-card-img-wrap,
    .week-modal-body .insight-card-img-wrap { width: 110px; min-height: 90px; flex-shrink: 0; order: 2; background: transparent; }
    .weekly-related-swiper .insight-card-img,
    .week-modal-body .insight-card-img { width: 110px; height: 100%; object-fit: contain; }
    .weekly-related-swiper .insight-card-img-tag,
    .week-modal-body .insight-card-img-tag { position: static; margin-bottom: 6px; align-self: flex-start; }
    .weekly-related-swiper .insight-card-excerpt,
    .week-modal-body .insight-card-excerpt { display: none; }
    .weekly-related-swiper .insight-card-content,
    .week-modal-body .insight-card-content { order: 1; flex: 1; min-width: 0; }
    .week-modal-body .col-6 { width: 100%; }
    .week-modal-body .row.g-3 { --bs-gutter-y: 0; }
    .week-modal-body .insight-card { box-shadow: none; padding-bottom: 16px; margin-bottom: 16px; border-bottom: 1px solid rgba(0,0,0,.08); }
    .week-modal-body .insight-card:hover { box-shadow: none; transform: none; }
    .week-modal-body .col-6:last-child .insight-card { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
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
  .week-modal-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,.55); z-index: 1050; align-items: center; justify-content: center; padding: 16px; }
  .week-modal-overlay.open { display: flex; }
  .week-modal { background: #fff; width: 100%; max-width: 1100px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; }
  .week-modal-body { overflow-y: auto; -webkit-overflow-scrolling: touch; flex: 1; padding: 24px 28px 32px; }
  .week-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 28px; border-bottom: 1px solid rgba(0,0,0,.08); position: sticky; top: 0; background: #fff; z-index: 1; }
  .week-modal-title { font-family: 'Noto Sans Thai', sans-serif; font-size: 16px; font-weight: 700; color: #0c244a; margin: 0; }
  @media (max-width: 767px) {
    .week-modal-overlay { align-items: flex-end; padding: 0; }
    .week-modal { width: 100%; max-width: 100%; max-height: 88vh; border-radius: 16px 16px 0 0; }
    .week-modal-header { padding-top: 22px; }
    .week-modal-header::before { content: ''; position: absolute; top: 8px; left: 50%; transform: translateX(-50%); width: 36px; height: 4px; border-radius: 2px; background: rgba(0,0,0,.15); }
  }
  .week-modal-close { width: 32px; height: 32px; border: none; background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #3d506e; transition: background .15s; }
  .week-modal-close:hover { background: #f0f0f0; }
`;

export default function SingleHotIssuePage() {
  const [row, setRow] = useState<Record<string, any> | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [relatedHtml, setRelatedHtml] = useState<string | null>(null);
  const [monthlyHtml, setMonthlyHtml] = useState<string | null>(null);
  const [expertsHtml, setExpertsHtml] = useState<string | null>(null);

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeMeetingModal();
        closeWeeklyModalDirect();
        closeMonthlyModalDirect();
      }
    }
    document.addEventListener("keydown", onKeydown);
    return () => document.removeEventListener("keydown", onKeydown);
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    document.querySelectorAll("#navbarMenu a[data-nav-match]").forEach((a) => {
      const m = a.getAttribute("data-nav-match");
      if (m === "/" ? path === "/" : path.indexOf(m || "") !== -1) a.classList.add("active");
    });
  }, []);

  // Load the main row
  useEffect(() => {
    let path = new URLSearchParams(location.search).get("path");
    if (!path) {
      const segs = location.pathname.split("/").filter(Boolean);
      if (segs.length > 1) path = decodeURIComponent(segs[segs.length - 1]);
    }
    const filter = path ? `&path=eq.${encodeURIComponent(path)}` : "";
    sbFetch("weekly_hot_issue", `select=*&order=page_date.desc&limit=1${filter}`).then((rows) => {
      if (!rows || !rows.length) {
        setNotFound(true);
        return;
      }
      setRow(rows[0]);
    });
  }, []);

  // Wrap tables once body content is in the DOM
  useEffect(() => {
    if (!row) return;
    document.querySelectorAll<HTMLElement>(".article-content").forEach((ac) => wrapTableScroll(ac));
  }, [row]);

  // Related: same-week siblings first, then cross-category
  useEffect(() => {
    if (!row) return;
    const week = row.week_slug;
    const excludePath = row.path;
    const siblingsP = sbFetch("weekly_hot_issue", `select=*&week_slug=eq.${encodeURIComponent(week)}&limit=50`).then((rows) =>
      (rows || []).filter((r) => r.path !== excludePath)
    );
    const crossP = Promise.all(
      RELATED_TABLES.map((t) =>
        sbFetch(t.id, `select=*&week_slug=eq.${encodeURIComponent(week)}&limit=1`).then((rows) => (rows || []).map((r) => ({ t, row: r })))
      )
    ).then((results) => ([] as any[]).concat(...results));

    Promise.all([siblingsP, crossP]).then(([siblings, cross]) => {
      const hotT = WEEKLY_TABLES[0];
      const html =
        siblings.map((r: any) => cardHtml(hotT, r, hotT.path + (r.path || ""))).join("") +
        cross.map((item: any) => cardHtml(item.t, item.row, item.t.path + (item.row.week_slug || ""))).join("");
      if (html) setRelatedHtml(html);
    });
  }, [row]);

  // Init the related swiper once its cards are in the DOM
  useEffect(() => {
    if (!relatedHtml) return;
    const SwiperCtor = (window as any).Swiper;
    if (!SwiperCtor) return;
    new SwiperCtor(".weekly-related-swiper", {
      slidesPerView: 4,
      spaceBetween: 16,
      watchOverflow: false,
      navigation: { prevEl: ".weekly-prev", nextEl: ".weekly-next", disabledClass: "swiper-button-disabled" },
      breakpoints: {
        0: { enabled: false },
        768: { enabled: false },
        992: { enabled: true, slidesPerView: 4, spaceBetween: 16 },
      },
    });
  }, [relatedHtml]);

  // Monthly cross-link modal content
  useEffect(() => {
    if (!row) return;
    const week = row.week_slug;
    const monthSlug = week ? week.slice(0, 7) + "-01" : "";
    if (!monthSlug) return;
    Promise.all(
      MONTHLY_TABLES.map((t) => {
        const q = `select=*&week_slug=eq.${encodeURIComponent(monthSlug)}${t.limit ? `&limit=${t.limit}` : ""}`;
        return sbFetch(t.id, q).then((rows) => (rows || []).map((r) => ({ t, row: r })));
      })
    ).then((results) => {
      const valid = ([] as any[]).concat(...results);
      if (!valid.length) return;
      setMonthlyHtml('<div class="row g-3">' + valid.map((item: any) => monthlyCardHtml(item.t, item.row)).join("") + "</div>");
    });
  }, [row]);

  // Experts
  useEffect(() => {
    sbFetch("experts", "select=*&order=order.asc").then((rows) => {
      rows = rows || [];
      if (!rows.length) return;
      setExpertsHtml(
        rows
          .map((ex: any) => {
            const photo = ex.photo && ex.photo.url ? ex.photo.url : "";
            return (
              '<div class="col-12 col-sm-4">' +
              '<div class="expert-item">' +
              (photo ? `<img class="expert-avatar" src="${photo}" alt="${ex.name || ""}" />` : "") +
              '<div class="expert-info">' +
              `<p class="expert-name">${ex.name || ""}</p>` +
              (ex.credentials ? `<p class="expert-credentials">${ex.credentials}</p>` : "") +
              "</div></div></div>"
            );
          })
          .join("")
      );
    });
  }, []);

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

      {!notFound && (
        <div className="insight-page" id="mainContent">
          <div className="insight-breadcrumb">
            <div className="container">
              <div className="col-12 col-lg-9 mx-auto">
                <ol>
                  <li><a href="https://wealth.yuanta.co.th/">Home</a></li>
                  <li className="sep">/</li>
                  <li><a href="/wealth-insights">Insights</a></li>
                  <li className="sep">/</li>
                  <li className="active">Hot issue</li>
                </ol>
              </div>
            </div>
          </div>

          <section className="article-header">
            <div className="container">
              <div className="col-12 col-lg-9 mx-auto">
                <span className="article-category-tag">Hot issue</span>
                <h1 className="article-title" id="f-title">{row?.main_title || ""}</h1>
                <p className="article-subtitle" id="f-subtitle">{row?.page_subtitle || ""}</p>
                <p className="article-date" id="f-date">{thaiDate(row?.page_date)}</p>
              </div>
            </div>
          </section>

          <section className="article-body">
            <div className="container">
              <div className="col-12 col-lg-9 mx-auto">
                <div className="ai-summary-box">
                  <div className="ai-summary-header">
                    <div className="ai-summary-icon">
                      <img src="/images/theme/ai-icon.png" alt="AI" />
                    </div>
                    <div>
                      <span className="ai-summary-label">AI Summary</span>
                      <p className="ai-summary-sublabel">บทสรุปจาก AI อ้างอิงโดยบทวิเคราะห์</p>
                    </div>
                  </div>
                  <div className="ai-summary-text" id="f-ai-summary" dangerouslySetInnerHTML={{ __html: row?.ai_summary || "" }} />
                </div>
                <div className="article-content" id="f-body" dangerouslySetInnerHTML={{ __html: row?.body || "" }} />

                <div className="article-cta-row">
                  <div className="article-cta-left">
                    <p className="article-cta-title">ต้องการดูภาพรวมทั้งสัปดาห์?</p>
                    <p className="article-cta-sub">เนื้อหานี้เป็นส่วนหนึ่งของบทวิเคราะห์ฉบับเต็มที่ครอบคลุมเนื้อหาทุก asset class</p>
                    <a className="article-cta-btn" id="ctaPdfBtn" href={`/wealth-weekly-report?week=${encodeURIComponent(row?.week_slug || "")}`} target="_blank" rel="noopener noreferrer">ดูมุมมองเพิ่มเติม</a>
                  </div>
                  <div className="article-cta-right">
                    <p className="article-cta-right-title">ดูมุมมอง<br />บทวิเคราะห์อื่นในเดือนนี้</p>
                    <button className="article-cta-outline-btn" onClick={() => openMonthlyModal()}>บทวิเคราะห์ประจำเดือน &gt;</button>
                  </div>
                </div>

                {expertsHtml && (
                  <div className="experts-section" id="expertsSection">
                    <p className="experts-title">บทวิเคราะห์โดย</p>
                    <div className="row g-3" id="expertsGrid" dangerouslySetInnerHTML={{ __html: expertsHtml }} />
                  </div>
                )}

                <div className="article-share">
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
                          <span className="related-week-label" id="relatedWeekLabel">{row?.page_subtitle || ""}</span>
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
          </section>
        </div>
      )}

      {notFound && (
        <section id="notFoundSection" style={{ padding: "80px 0", textAlign: "center" }}>
          <div className="container">
            <p style={{ color: "#3d506e", fontSize: 16 }}>ไม่พบบทวิเคราะห์ที่ระบุ</p>
            <a href="/wealth-insights" style={{ color: "#a2603c" }}>← กลับไปหน้า Insights</a>
          </div>
        </section>
      )}

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
              <p style={{ color: "#8f9aac", fontSize: 14, fontFamily: "'Noto Sans Thai',sans-serif", padding: "8px 0" }}>ยังไม่มีบทวิเคราะห์ประจำเดือนนี้</p>
            )}
          </div>
        </div>
      </div>

      <div className="week-modal-overlay" id="weeklyModalOverlay" onClick={(e) => { if (e.target === e.currentTarget) closeWeeklyModalDirect(); }}>
        <div className="week-modal">
          <div className="week-modal-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
              <span className="related-week-chip">Weekly</span>
              <span className="related-week-label" id="modalWeekLabel">{row?.page_subtitle || ""}</span>
              <span className="related-week-date" id="modalWeekDate"></span>
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

      <section className="newsletter-section">
        <div className="container">
          <div className="row align-items-center gy-5">
            <div className="col-12">
              <p className="newsletter-label">Exclusive Insights</p>
              <h2 className="newsletter-title">Unlock Insights &amp;<br />Market Intelligence</h2>
              <p className="newsletter-desc">รับข้อมูลเชิงลึกด้านการลงทุน บทวิเคราะห์ตลาด และโอกาสการลงทุนพิเศษ ส่งตรงถึงอีเมลของคุณทุกสัปดาห์</p>
            </div>
          </div>
        </div>
      </section>

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

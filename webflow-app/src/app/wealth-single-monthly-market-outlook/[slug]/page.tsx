"use client";

// PoC: port of yuanta-wealth-supabase-poc/single-monthly-market-outlook.html (byte-for-byte
// copy of the real production template) onto Webflow Cloud (Next.js). Single-row-per-month
// table, selected via `?week=` query param (defaults to newest row when absent — the `[slug]`
// folder just lets Next accept an arbitrary trailing path segment; `params` is unused). Async
// sections use React state + effects (not a raw injected script) to avoid the hydration-mismatch
// bug hit while porting the home page. No week-modal on this page (source has none).

import { useEffect, useRef, useState } from "react";

const SUPABASE_URL = "https://kqgdvpqygepvaifzrxki.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_6khmxt87r-YGlSxyF9d9XA_G0NNDTbp";

function sbFetch(table: string, query: string): Promise<any[]> {
  return fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  })
    .then((r) => r.json() as Promise<any[]>)
    .catch(() => []);
}
function stripHtml(html?: string) {
  if (typeof document === "undefined") return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  return tmp.textContent || "";
}
const THAI_MONTHS_FULL = ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
function thaiMonthYear(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00Z");
  return d.getUTCDate() + " " + THAI_MONTHS_FULL[d.getUTCMonth() + 1] + " " + d.getUTCFullYear();
}
function shortDate(s?: string) {
  if (!s) return "";
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const d = new Date(s + "T00:00:00Z");
  return d.getUTCDate() + " " + months[d.getUTCMonth()] + " " + (d.getUTCFullYear() + 543);
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
function shareToFacebook() { window.open("https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(location.href), "_blank"); }
function shareToX() { window.open("https://x.com/intent/tweet?url=" + encodeURIComponent(location.href), "_blank"); }
function copyLink() { navigator.clipboard.writeText(location.href).then(() => alert("คัดลอกลิงก์แล้ว")); }
function shareByEmail() { location.href = "mailto:?subject=Market Outlook — Yuanta Wealth&body=" + encodeURIComponent(location.href); }

const THUMB = {
  hotIssue: "/images/theme/thumb-hot-issue.png",
  assetPerf: "/images/theme/thumb-asset-performance.png",
  assetOutlook: "/images/theme/thumb-asset-class-outlook.png",
  mktCalendar: "/images/theme/thumb-market-calendar.png",
  buyList: "/images/theme/thumb-buy-list.png",
};
function insightCardHtml(row: any, cls: string, label: string, thumb: string, url: string, excerpt: string) {
  return (
    '<div class="swiper-slide">' +
    `<div class="insight-card" onclick="location.href='${url}'">` +
    '<div class="insight-card-img-wrap">' +
    `<img class="insight-card-img" src="${thumb}" alt="${row.main_title || ""}" />` +
    "</div>" +
    '<div class="insight-card-content">' +
    `<span class="insight-card-img-tag insight-tag ${cls}">${label}</span>` +
    `<h4 class="insight-card-title">${row.main_title || ""}</h4>` +
    `<p class="insight-card-date">${shortDate(row.page_date)}</p>` +
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
  });
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
  .article-category-tag { display: inline-block; font-family: 'Cormorant Garamond','Noto Sans Thai',Georgia,serif; font-size: 14px; font-weight: 500; padding: 4px 16px; background: #F0EFF5; color: #3d2260; border: 1px solid #D1CCDF; border: 1px solid rgba(61,34,96,.2); margin-bottom: 20px; letter-spacing: .03em; }
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
  .article-content table { width: 100% !important; border-collapse: collapse; margin: 20px 0; font-family: 'Noto Sans Thai', sans-serif; font-size: 13px; }
  .article-content table th { background: #0c244a; color: #fff; padding: 10px 14px; text-align: left; font-weight: 600; word-break: break-word; overflow-wrap: anywhere; }
  .article-content table td { padding: 10px 14px; border-bottom: 1px solid #eaeaea; color: #1a2e44; vertical-align: top; word-break: break-word; overflow-wrap: anywhere; }
  .article-content table tr:nth-child(even) td { background: #f9f7f4; }
  .article-content img { width: 100%; border-radius: 4px; margin: 16px 0; display: block; }
  .article-content ul, .article-content ol { padding-left: 20px; margin-bottom: 14px; }
  .article-content ul { list-style: disc; }
  .article-content ol { list-style: decimal; }
  .article-content li { margin-bottom: 6px; }
  .article-cta-row { margin-bottom: 32px; margin-top: 48px; }
  .article-cta-left { border: 1.5px solid #0000001A; background: url('/images/theme/bgoverall.jpg') center/cover no-repeat; padding: 44px 40px; }
  .article-cta-title { font-family: 'Noto Sans Thai', sans-serif; font-size: 32px; font-weight: 700; color: #0c244a; margin-bottom: 10px; line-height: 1.3; }
  .article-cta-sub { font-family: 'Noto Sans Thai', sans-serif; font-size: 16px; color: #3d506e; margin-bottom: 24px; line-height: 1.6; }
  @media (max-width: 767px) { .article-cta-title { font-size: 20px; } .article-cta-sub { font-size: 14px; } }
  .article-cta-btn { font-family: 'Noto Sans Thai', sans-serif; font-size: 14px; font-weight: 600; background: #0c244a; color: #fff; border: none; padding: 11px 22px; border-radius: 0; cursor: pointer; white-space: nowrap; transition: background .2s; text-decoration: none; display: inline-block; }
  .article-cta-btn:hover { background: #1a3a6b; color: #fff; }
  @media (max-width: 767px) { .article-cta-left { padding: 24px 20px; } }
  @media (min-width: 768px) and (max-width: 991px) { .article-cta-left { padding: 24px 16px; } .article-cta-title { font-size: 24px; } }
  .experts-section { margin-bottom: 0; background: transparent; }
  .experts-title { font-family: 'Noto Sans Thai', sans-serif; font-size: 24px; font-weight: 700; color: #0c244a; margin-bottom: 20px; }
  .expert-item { display: flex; align-items: stretch; background: #fff; border-radius: 0; overflow: hidden; margin-bottom: 16px; }
  .expert-avatar { width: 100px; height: 100px; object-fit: cover; flex-shrink: 0; display: block; }
  .expert-info { padding: 14px 16px; flex: 1; }
  .expert-name { font-family: 'Noto Sans Thai', sans-serif; font-size: 14px; font-weight: 700; color: #0c244a; margin-bottom: 4px; }
  .expert-credentials { font-family: 'Noto Sans Thai', sans-serif; font-size: 12px; color: #3d506e; font-weight: 600; margin-bottom: 0; }
  .related-section { background: #F9F7F4; width: 100vw; position: relative; left: 50%; right: 50%; margin-left: -50vw; margin-right: -50vw; padding: 32px 0 48px; }
  .related-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .related-title { font-family: 'Noto Sans Thai', sans-serif; font-size: 18px; font-weight: 700; color: #0c244a; margin: 0; }
  .related-week-header { display: none; align-items: center; gap: 10px; margin-bottom: 16px; }
  .related-week-chip { font-family: 'Cormorant Garamond', serif; font-size: 13px; font-weight: 600; background: #3D506E; color: #fff; padding: 3px 10px; } .related-week-chip-monthly { background: #0C244A; }
  .related-week-label { font-family: 'Noto Sans Thai', sans-serif; font-size: 20px; font-weight: 700; color: #0c244a; }
  @media (max-width: 767px) { .related-week-header { display: flex; } .related-grid { display: none !important; } }
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
  .weekly-related-wrapper { position: relative; padding: 14px 44px; overflow: hidden; }
  .weekly-related-swiper { position: relative; overflow: clip; overflow-clip-margin: 10px; }
  .weekly-related-swiper .insight-card { position: relative; }
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
  }
  @media (min-width: 768px) {
    .weekly-related-swiper { overflow: hidden; }
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

type Row = Record<string, any>;

export default function SingleMonthlyMarketOutlookPage() {
  const [row, setRow] = useState<Row | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [expertsHtml, setExpertsHtml] = useState<string | null>(null);
  const [relatedHtml, setRelatedHtml] = useState<string | null>(null);
  const [relatedLabel, setRelatedLabel] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") closeMeetingModal();
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

  // Ported verbatim from source's DOMContentLoaded handler — sets --nav-height (real effect)
  // and inline-styles .article-content tables (a no-op in the source too: it fires before the
  // async row fetch populates article-content, so it never finds any tables — kept for parity).
  useEffect(() => {
    const nav = document.querySelector(".navbar, nav, header");
    if (nav) document.documentElement.style.setProperty("--nav-height", (nav as HTMLElement).offsetHeight + "px");
    document.querySelectorAll(".article-content table").forEach((tbl) => {
      const el = tbl as HTMLTableElement;
      el.style.width = "100%";
      el.style.tableLayout = "fixed";
      el.style.borderColor = "#eaeaea";
      el.querySelectorAll("col, th, td").forEach((c) => { (c as HTMLElement).style.width = ""; c.removeAttribute("width"); });
      el.querySelectorAll("td").forEach((c) => { (c as HTMLElement).style.padding = "10px"; });
    });
  }, []);

  useEffect(() => {
    let week = new URLSearchParams(window.location.search).get("week");
    if (!week) {
      const segs = window.location.pathname.split("/").filter(Boolean);
      if (segs.length > 1) week = decodeURIComponent(segs[segs.length - 1]);
    }
    const filter = week ? "&week_slug=eq." + encodeURIComponent(week) : "";
    sbFetch("monthly_market_outlook", "select=*&order=week_slug.desc&limit=1" + filter).then((rows) => {
      if (!rows || !rows.length) { setNotFound(true); return; }
      setRow(rows[0]);
    });
  }, []);

  useEffect(() => {
    if (!row) return;
    wrapTableScroll(contentRef.current);

    sbFetch("experts", "select=*&order=order.asc").then((rows) => {
      if (!rows || !rows.length) return;
      setExpertsHtml(
        rows
          .map((ex) => {
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

    const weekSlug = row.week_slug;
    Promise.all([
      sbFetch("monthly_hot_issue", "select=*&week_slug=eq." + encodeURIComponent(weekSlug)),
      sbFetch("monthly_asset_performance", "select=*&week_slug=eq." + encodeURIComponent(weekSlug) + "&limit=1"),
      sbFetch("monthly_asset_class_outlook", "select=*&week_slug=eq." + encodeURIComponent(weekSlug)),
      sbFetch("monthly_market_calendar", "select=*&week_slug=eq." + encodeURIComponent(weekSlug) + "&limit=1"),
      sbFetch("monthly_buy_list", "select=*&week_slug=eq." + encodeURIComponent(weekSlug) + "&limit=1"),
    ]).then((results) => {
      const hotIssue = results[0] || [], assetPerf = results[1] || [], assetOutlook = results[2] || [],
        mktCalendar = results[3] || [], buyList = results[4] || [];
      const slides: string[] = ([] as string[])
        .concat(hotIssue.map((r) => insightCardHtml(r, "tag-hot-issue", "Hot issue", THUMB.hotIssue, "/wealth-single-monthly-hotissue/" + (r.path || ""), r.description || stripHtml(r.ai_summary))))
        .concat(assetPerf.map((r) => insightCardHtml(r, "tag-asset-perf", "Asset performance", THUMB.assetPerf, "/wealth-single-monthly-asset-performance/" + (r.week_slug || ""), r.description)))
        .concat(assetOutlook.map((r) => insightCardHtml(r, "tag-asset-outlook", "Asset class outlook", THUMB.assetOutlook, "/wealth-single-monthly-asset-class-outlook/" + (r.path || ""), r.description || stripHtml(r.ai_summary))))
        .concat(mktCalendar.map((r) => insightCardHtml(r, "tag-mkt-calendar", "Market calendar", THUMB.mktCalendar, "/wealth-single-monthly-market-calendar/" + (r.week_slug || ""), r.description)))
        .concat(buyList.map((r) => insightCardHtml(r, "tag-buy-list", "Buy list", THUMB.buyList, "/wealth-single-monthly-buy-list/" + (r.week_slug || ""), r.description)));

      if (!slides.length) return;

      const y = parseInt(weekSlug.slice(0, 4), 10) + 543;
      const m = parseInt(weekSlug.slice(5, 7), 10);
      setRelatedLabel(THAI_MONTHS_FULL[m] + " " + y);
      setRelatedHtml(slides.join(""));
    });
  }, [row]);

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
        <div className="insight-page">
          <div className="insight-breadcrumb">
            <div className="container">
              <div className="col-12 col-lg-9 mx-auto">
                <ol>
                  <li><a href="https://wealth.yuanta.co.th/">Home</a></li>
                  <li className="sep">/</li>
                  <li><a href="/wealth-insights">Insights</a></li>
                  <li className="sep">/</li>
                  <li className="active">Market outlook</li>
                </ol>
              </div>
            </div>
          </div>

          <section className="article-header">
            <div className="container">
              <div className="col-12 col-lg-9 mx-auto">
                <span className="article-category-tag">Market outlook</span>
                <h1 className="article-title">{row?.main_title || ""}</h1>
                <p className="article-subtitle">{row?.page_subtitle || ""}</p>
                <p className="article-date">{thaiMonthYear(row?.page_date)}</p>
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
                  <div className="ai-summary-text" dangerouslySetInnerHTML={{ __html: row?.ai_summary || "" }} />
                </div>

                <div className="article-content" ref={contentRef} dangerouslySetInnerHTML={{ __html: row?.body || "" }} />

                <div className="article-cta-row">
                  <div className="article-cta-left">
                    <p className="article-cta-title">ต้องการดูภาพรวมทั้งสัปดาห์?</p>
                    <p className="article-cta-sub">เนื้อหานี้เป็นส่วนหนึ่งของบทวิเคราะห์ฉบับเต็มที่ครอบคลุมเนื้อหาทุก asset class</p>
                    <a className="article-cta-btn" href={row ? `/wealth-monthly-report?week=${encodeURIComponent(row.week_slug)}` : "#"} target="_blank" rel="noopener noreferrer">ดูมุมมองเพิ่มเติม</a>
                  </div>
                </div>

                {expertsHtml && (
                  <div className="experts-section">
                    <p className="experts-title">บทวิเคราะห์โดย</p>
                    <div className="row g-3" dangerouslySetInnerHTML={{ __html: expertsHtml }} />
                  </div>
                )}

                <div className="article-share">
                  <span className="article-share-label">แชร์</span>
                  <button className="share-btn" onClick={shareToFacebook} title="Facebook">
                    <svg viewBox="0 0 20 20" fill="none"><path d="M11 10.5h2l.5-2.5H11V6.5c0-.7.35-1.5 1.5-1.5H13.5V2.5A13 13 0 0011.5 2.5C9.14 2.5 8 3.9 8 6v2H5.5v2.5H8V18h3v-7.5z" fill="#1877F2"/></svg>
                  </button>
                  <button className="share-btn" onClick={shareToX} title="X">
                    <svg viewBox="0 0 20 20" fill="none"><path d="M15.5 3h-2.1l-3.4 4.3L6.4 3H2l5.7 7.3L2.1 17H4.2l3.7-4.6 3.7 4.6H16l-6-7.7L15.5 3z" fill="#000"/></svg>
                  </button>
                  <button className="share-btn" onClick={copyLink} title="คัดลอก">
                    <svg viewBox="0 0 20 20" fill="none"><path d="M8.5 11.5a4 4 0 005.66 0l2-2a4 4 0 00-5.66-5.66l-1 1" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/><path d="M11.5 8.5a4 4 0 00-5.66 0l-2 2a4 4 0 005.66 5.66l1-1" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                  <button className="share-btn" onClick={shareByEmail} title="อีเมล">
                    <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2" stroke="#555" strokeWidth="1.5"/><path d="M2 7l8 5 8-5" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                </div>

                {relatedHtml && (
                  <div className="related-section">
                    <div className="container">
                      <div className="col-12 col-lg-9 mx-auto">
                        <div className="related-week-header-row">
                          <span className="related-week-chip related-week-chip-monthly">Monthly</span>
                          <span className="related-week-label">{relatedLabel}</span>
                        </div>
                        <div className="weekly-related-wrapper">
                          <div className="swiper weekly-related-swiper">
                            <div className="swiper-wrapper" dangerouslySetInnerHTML={{ __html: relatedHtml }} />
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
        <section style={{ padding: "80px 0", textAlign: "center" }}>
          <div className="container">
            <p style={{ color: "#3d506e", fontSize: 16 }}>ไม่พบบทวิเคราะห์ที่ระบุ</p>
            <a href="/wealth-insights" style={{ color: "#a2603c" }}>← กลับไปหน้า Insights</a>
          </div>
        </section>
      )}

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
            onLoad={() => { const el = document.getElementById("meeting-loading"); if (el) el.style.display = "none"; }}
          />
        </div>
      </div>
    </>
  );
}

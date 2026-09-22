"use client";

// PoC: port of single-monthly-market-calendar.html (byte-for-byte copy of
// yuanta-wealth-theme/templates/single-monthly-market-calendar.html) onto
// Webflow Cloud (Next.js). Single-row-per-month page, selected via `?week=`
// (defaults to newest). Data source: Supabase, same publishable/anon
// read-only key used by every other PoC page.

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
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || "";
}
function thaiMonthYear(dateStr?: string) {
  if (!dateStr) return "";
  const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const d = new Date(dateStr + "T00:00:00Z");
  return d.getUTCDate() + " " + months[d.getUTCMonth()] + " " + (d.getUTCFullYear() + 543);
}
function shortDate(s?: string) {
  if (!s) return "";
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const d = new Date(s + "T00:00:00Z");
  return d.getUTCDate() + " " + months[d.getUTCMonth()] + " " + (d.getUTCFullYear() + 543);
}
const THAI_MONTHS_FULL = ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

type RelatedTable = { id: string; label: string; cls: string; path: string; usePath?: boolean; multi?: boolean };

const THUMB_MONTHLY: Record<string, string> = {
  monthly_hot_issue: "/images/theme/thumb-hot-issue.png",
  monthly_asset_performance: "/images/theme/thumb-asset-performance.png",
  monthly_market_outlook: "/images/theme/thumb-market-outlook.png",
  monthly_asset_class_outlook: "/images/theme/thumb-asset-class-outlook.png",
  monthly_buy_list: "/images/theme/thumb-buy-list.png",
};
const RELATED_TABLES: RelatedTable[] = [
  { id: "monthly_hot_issue", label: "Hot issue", cls: "tag-hot-issue", path: "/wealth-single-monthly-hotissue/", usePath: true, multi: true },
  { id: "monthly_asset_performance", label: "Asset performance", cls: "tag-asset-perf", path: "/wealth-single-monthly-asset-performance/" },
  { id: "monthly_market_outlook", label: "Market outlook", cls: "tag-mkt-outlook", path: "/wealth-single-monthly-market-outlook/" },
  { id: "monthly_asset_class_outlook", label: "Asset class outlook", cls: "tag-asset-outlook", path: "/wealth-single-monthly-asset-class-outlook/", usePath: true, multi: true },
  { id: "monthly_buy_list", label: "Buy list", cls: "tag-buy-list", path: "/wealth-single-monthly-buy-list/" },
];

function relatedCardHtml(t: RelatedTable, row: Record<string, any>) {
  const src = THUMB_MONTHLY[t.id];
  const slugPart = t.usePath ? row.path || "" : (row.week_slug || "").trim();
  const url = t.path + slugPart;
  const excerpt = row.description || stripHtml(row.ai_summary);
  return (
    '<div class="swiper-slide">' +
    `<div class="insight-card" onclick="location.href='${url}'">` +
    `<div class="insight-card-img-wrap"><img class="insight-card-img" src="${src}" alt="" /></div>` +
    '<div class="insight-card-content">' +
    `<span class="insight-card-img-tag insight-tag ${t.cls}">${t.label}</span>` +
    `<h4 class="insight-card-title">${row.main_title || ""}</h4>` +
    `<p class="insight-card-date">${shortDate(row.page_date)}</p>` +
    (excerpt ? `<p class="insight-card-excerpt">${excerpt}</p>` : "") +
    "</div></div></div>"
  );
}

// Monthly calendar grid transform — ported verbatim from production, DOM-only
function processBodyCalendar(weekSlug: string) {
  const ac = document.getElementById("f-body");
  if (!ac) return;
  const tbl = ac.querySelector("table");
  if (!tbl) return;

  tbl.classList.add("monthly-cal");
  tbl.removeAttribute("style");

  const mobileMap: Record<string, string> = { Mon: "จ", Tue: "อ", Wed: "พ", Thu: "พฤ", Fri: "ศ", Sat: "ส", Sun: "อา" };
  tbl.querySelectorAll("thead th").forEach((th) => {
    th.setAttribute("data-mobile", mobileMap[(th.textContent || "").trim()] || (th.textContent || "").trim());
    th.removeAttribute("style");
  });

  const slugParts = weekSlug.split("-");
  const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const slugYear = parseInt(slugParts[0], 10);
  const slugMonth = parseInt(slugParts[1], 10) - 1;
  const thaiYear = slugYear + 543;
  const monthName = thaiMonths[slugMonth] || "";

  tbl.querySelectorAll("tbody td").forEach((tdEl) => {
    const td = tdEl as HTMLTableCellElement;
    const spans = Array.prototype.slice.call(td.querySelectorAll("span")) as HTMLElement[];
    td.removeAttribute("style");
    td.innerHTML = "";

    if (!spans.length) {
      td.classList.add("cal-empty");
      return;
    }

    const dateNum = parseInt((spans[0].textContent || "").trim(), 10);
    if (isNaN(dateNum) || dateNum < 1) {
      td.classList.add("cal-empty");
      return;
    }

    const numEl = document.createElement("span");
    numEl.className = "cal-date-num";
    numEl.textContent = String(dateNum);
    td.appendChild(numEl);
    td.setAttribute("data-date", dateNum + " " + monthName + " " + thaiYear);

    const eventTexts = spans.slice(1).map((s) => (s.textContent || "").trim()).filter(Boolean);
    if (!eventTexts.length) return;

    const ul = document.createElement("ul");
    ul.className = "cal-events";
    eventTexts.forEach((text) => {
      const item = document.createElement("div");
      item.className = "cal-event-item";
      item.textContent = text;
      ul.appendChild(item);
    });
    if (eventTexts.length > 3) {
      const more = document.createElement("span");
      more.className = "cal-more-label";
      more.textContent = "+" + (eventTexts.length - 3) + " more";
      ul.appendChild(more);
    }
    td.appendChild(ul);
  });
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
  location.href = "mailto:?subject=Market Calendar — Yuanta Wealth&body=" + encodeURIComponent(location.href);
}

const CSS = `
  html, body { overflow-x: hidden; }
  .insight-page { margin-top: 90px; background: #fff; }
  .insight-breadcrumb { padding: 30px 0; background: #fff; }
  .insight-breadcrumb ol { margin: 0; padding: 0; list-style: none; display: flex; align-items: center; gap: 6px; font-family: 'Noto Sans Thai', sans-serif; font-size: 13px; color: #8f9aac; }
  .insight-breadcrumb li a { color: #8f9aac; text-decoration: none; }
  .insight-breadcrumb li a:hover { color: #a2603c; }
  .insight-breadcrumb li.active { color: #a2603c; }
  .insight-breadcrumb li.sep { color: #ccc; }
  .article-header { padding: 0 0 32px; text-align: left; }
  .article-category-tag { display: inline-block; font-family: 'Cormorant Garamond','Noto Sans Thai',Georgia,serif; font-size: 14px; font-weight: 500; padding: 4px 16px; background: #b4bbc77a; color: #0c244a; border: 1px solid rgba(0,0,0,.1); margin-bottom: 20px; letter-spacing: .03em; }
  .article-title { font-family: 'Noto Sans Thai', sans-serif; font-size: 35px; font-weight: 700; color: #0c244a; line-height: 1.3; margin-bottom: 16px; padding: 0; }
  .article-subtitle { font-family: 'Noto Sans Thai', sans-serif; font-size: 24px; font-weight: 700; color: #3D506E; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid rgba(0,0,0,0.1); }
  @media (max-width: 991px) { .article-title { font-size: 28px; } }
  @media (max-width: 767px) { .article-header { padding: 0 0 24px; } .article-title { font-size: 24px; } .article-subtitle { font-size: 18px; } }
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

  .monthly-cal-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: 48px; }
  .monthly-cal { width: 100%; border-collapse: collapse; table-layout: fixed; font-family: 'Noto Sans Thai', sans-serif; min-width: 560px; }
  .monthly-cal th { background: #0c244a; color: #fff; padding: 10px 8px; text-align: center; font-size: 13px; font-weight: 600; white-space: nowrap; }
  .monthly-cal th.weekend { background: #0c244a; color: #fff; }
  .monthly-cal th.sunday { background: #0c244a; color: #fff; }
  .monthly-cal td { border: 1px solid rgba(0,0,0,.1); vertical-align: top; padding: 10px 8px !important; min-height: 100px; height: auto; position: relative; }
  .monthly-cal td.cal-empty { background: #fafafa; }
  .monthly-cal td.weekend, .monthly-cal td.sunday { background: #fff; }
  .monthly-cal td.weekend .cal-date-num, .monthly-cal td.sunday .cal-date-num { color: #b4bbc7; }
  .cal-date-num { font-size: 20px; font-weight: 700; color: #0c244a; margin-bottom: 4px; display: block; }
  .cal-date-num.today { background: #0c244a; color: #fff; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; }
  .cal-events { list-style: none; padding: 0; margin: 0; }
  .cal-event-item { font-size: 16px; color: #3d506e; line-height: 1.5; margin-bottom: 3px; padding-bottom: 0; }
  .cal-event-item::before { content: "• "; }
  .cal-event-tag { font-size: 10px; font-weight: 700; padding: 1px 5px; display: inline-block; margin-bottom: 2px; }
  .cal-tag-macro { background: #e8f0fb; color: #1a3a6b; }
  .cal-tag-micro { background: #fef3cd; color: #92600a; }
  .cal-tag-earnings { background: #d4edda; color: #155724; }
  .cal-tag-global { background: #e2d9f3; color: #4a235a; }
  .cal-event-time { color: #a2603c; font-weight: 600; font-size: 10px; margin-right: 2px; }
  .cal-more-label { display: none; }
  @media (min-width: 768px) and (max-width: 991px) {
    .monthly-cal th { font-size: 14px; }
    .cal-event-item { font-size: 12px; }
  }
  @media (max-width: 767px) {
    .monthly-cal-wrap { overflow-x: hidden; margin-bottom: 32px; }
    .monthly-cal { min-width: unset; width: 100%; }
    .monthly-cal th { font-size: 0; padding: 0; height: 28px; border-bottom: 2px solid rgba(0,0,0,.08); }
    .monthly-cal th::after { content: attr(data-mobile); font-size: 12px; font-weight: 400; line-height: 28px; display: block; text-align: center; }
    .monthly-cal tr:nth-child(odd) td { background: #fff; }
    .monthly-cal tr:nth-child(even) td { background: #f9fafb; }
    .monthly-cal td.weekend, .monthly-cal td.sunday { background: inherit; }
    .article-content .monthly-cal td, .monthly-cal td { min-height: unset; height: auto !important; padding: 4px 2px !important; vertical-align: top; cursor: pointer; border: none; border-bottom: 1px solid rgba(0,0,0,.08); }
    .monthly-cal td.cal-empty { cursor: default; }
    .cal-date-num { font-size: 9px; font-weight: 700; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 4px; border-radius: 50%; line-height: 1; }
    .monthly-cal td.weekend .cal-date-num, .monthly-cal td.sunday .cal-date-num { color: #b4bbc7; }
    .monthly-cal .cal-events { display: flex; flex-direction: column; gap: 2px; }
    .cal-event-item { background: #f6f3ef; height: 14px; border-radius: 2px; font-size: 9px; color: #0c244a; padding: 0 0 0 4px; overflow: hidden; white-space: nowrap; display: flex; align-items: center; margin-bottom: 0; }
    .cal-event-item::before { display: none; }
    .cal-event-item:nth-child(n+4) { display: none; }
    .cal-more-label { font-size: 9px; color: rgba(0,0,0,0.4); text-align: center; display: block; line-height: 14px; margin-top: 2px; }
  }

  .cal-popup-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 9000; }
  .cal-popup-overlay.active { display: block; }
  .cal-popup-sheet { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-radius: 20px 20px 0 0; z-index: 9001; max-height: 80vh; overflow-y: auto; transform: translateY(100%); transition: transform .32s cubic-bezier(.4,0,.2,1); padding-bottom: env(safe-area-inset-bottom, 20px); }
  .cal-popup-sheet.active { transform: translateY(0); }
  .cal-popup-handle { width: 40px; height: 4px; background: #d0d5df; border-radius: 2px; margin: 14px auto 0; }
  .cal-popup-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid rgba(0,0,0,.08); }
  .cal-popup-date-title { font-family: 'Noto Sans Thai', sans-serif; font-size: 20px; font-weight: 700; color: #0c244a; margin: 0; }
  .cal-popup-close-btn { width: 36px; height: 36px; border: none; background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; flex-shrink: 0; }
  .cal-popup-events-list { padding: 8px 20px 32px; }
  .cal-popup-event-item { font-family: 'Noto Sans Thai', sans-serif; font-size: 15px; color: #1a2e44; line-height: 1.65; padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,.06); }
  .cal-popup-event-item:last-child { border-bottom: none; }

  .article-content { font-family: 'Noto Sans Thai', sans-serif; font-size: 16px; color: #1a2e44; line-height: 1.75; }
  .article-content h2 { font-family: 'Noto Sans Thai', sans-serif; font-size: 18px; font-weight: 700; color: #0c244a; margin: 32px 0 16px; padding-bottom: 12px; border-bottom: 2px solid #0c244a; display: inline-block; }
  .article-content p { margin-bottom: 14px; }
  @media (max-width: 767px) { .article-content p { font-size: 16px; } }
  .article-content ul, .article-content ol { padding-left: 20px; margin-bottom: 14px; }
  .article-content ul { list-style: disc; }
  .article-content .cal-events { padding-left: 0; margin-bottom: 0; list-style: none; }
  .article-content ol { list-style: decimal; }
  .article-content li { margin-bottom: 6px; }
  .article-content img { width: 100%; border-radius: 4px; margin: 16px 0; display: block; }
  .article-content td { padding: 10px 20px !important; }
  .article-content .monthly-cal td { padding: 10px 8px !important; }
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
  .related-week-header-row { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid rgba(0,0,0,.08); }
  .related-week-chip { font-family: 'Cormorant Garamond', serif; font-size: 13px; font-weight: 600; background: #3D506E; color: #fff; padding: 3px 10px; flex-shrink: 0; } .related-week-chip-monthly { background: #0C244A; }
  .related-week-label { font-family: 'Noto Sans Thai', sans-serif; font-size: 20px; font-weight: 700; color: #0c244a; }
  .weekly-related-wrapper { position: relative; padding: 14px 44px; overflow: hidden; }
  .weekly-related-swiper { position: relative; overflow: clip; overflow-clip-margin: 10px; }
  .weekly-related-swiper .insight-card { position: relative; }
  .weekly-related-wrapper .swiper-button-prev, .weekly-related-wrapper .swiper-button-next { position: absolute; top: 38%; width: 32px; height: 32px; background: #fff; border: 1px solid rgba(0,0,0,.15); border-radius: 0; color: #0c244a; margin-top: 0; }
  .weekly-related-wrapper .swiper-button-prev { left: 0; }
  .weekly-related-wrapper .swiper-button-next { right: 0; }
  .weekly-related-wrapper .swiper-button-prev::after, .weekly-related-wrapper .swiper-button-next::after { font-size: 11px; font-weight: 700; }
  .weekly-related-wrapper .swiper-button-disabled { opacity: 0.35; cursor: default; }
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
  .tag-buy-list { background: #EEF1F0; color: #2c4a42; border: 1px solid #CBD4D0; }
  .tag-mkt-outlook { background: #F0EFF5; color: #3d2260; border: 1px solid #D1CCDF; }
  .tag-asset-outlook { background: #F2F0EE; color: #3d2c1e; border: 1px solid #D6D1CB; }
  @media (max-width: 767px) {
    .weekly-related-wrapper { padding: 0; }
    .weekly-related-swiper .swiper-wrapper { display: block; transform: none !important; }
    .weekly-related-swiper .swiper-button-prev, .weekly-related-swiper .swiper-button-next { display: none; }
    .weekly-related-swiper .swiper-slide { width: 100% !important; margin-bottom: 10px; }
    .weekly-related-swiper .insight-card { flex-direction: row; align-items: stretch; box-shadow: none; padding-right: 14px; }
    .weekly-related-swiper .insight-card:hover { box-shadow: none; transform: none; }
    .weekly-related-swiper .insight-card-img-wrap { width: 110px; min-height: 90px; flex-shrink: 0; order: 2; background: transparent; }
    .weekly-related-swiper .insight-card-img { width: 110px; height: 100%; object-fit: contain; }
    .weekly-related-swiper .insight-card-img-tag { position: static; margin-bottom: 6px; align-self: flex-start; }
    .weekly-related-swiper .insight-card-excerpt { display: none; }
    .weekly-related-swiper .insight-card-content { order: 1; flex: 1; min-width: 0; }
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
    .weekly-related-wrapper .swiper-button-prev, .weekly-related-wrapper .swiper-button-next { display: none; }
    .weekly-related-swiper { overflow: visible; }
    .weekly-related-swiper .swiper-wrapper { display: flex; transform: none !important; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; scrollbar-width: none; gap: 14px; }
    .weekly-related-swiper .swiper-wrapper::-webkit-scrollbar { display: none; }
    .weekly-related-swiper .swiper-wrapper::after { content: ''; flex: 0 0 24px; }
    .weekly-related-swiper .swiper-slide { flex: 0 0 244px !important; max-width: calc(100vw - 56px); width: auto !important; margin: 0 !important; scroll-snap-align: start; }
  }

  .week-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 1060; opacity: 0; pointer-events: none; transition: opacity .25s; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .week-modal-overlay.open { opacity: 1; pointer-events: all; }
  .week-modal { background: #fff; width: 100%; max-width: 1040px; max-height: 85vh; overflow-y: auto; box-shadow: 0 12px 48px rgba(0,0,0,.2); }
  .week-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #eaeaea; position: sticky; top: 0; background: #fff; z-index: 2; }
  .week-modal-title { font-family: 'Noto Sans Thai', sans-serif; font-size: 17px; font-weight: 700; color: #0c244a; margin: 0; }
  .week-modal-close { width: 32px; height: 32px; border: 1px solid #e2e8f0; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; }
  .week-modal-close:hover { background: #f5f5f5; }
  .week-modal-body { padding: 24px; }
`;

export default function SingleMonthlyMarketCalendarPage() {
  const [row, setRow] = useState<Record<string, any> | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [experts, setExperts] = useState<string | null>(null);
  const [relatedHtml, setRelatedHtml] = useState<string | null>(null);
  const [relatedLabel, setRelatedLabel] = useState("");
  const currentWeekRef = useRef("");
  const [weekModalOpen, setWeekModalOpen] = useState(false);
  const [weekModalHtml, setWeekModalHtml] = useState("");

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeMeetingModal();
        setWeekModalOpen(false);
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

  // Load main row by ?week= (defaults to newest)
  useEffect(() => {
    const week = new URLSearchParams(window.location.search).get("week");
    const filter = week ? "&week_slug=eq." + encodeURIComponent(week) : "";
    sbFetch("monthly_market_calendar", "select=*&order=week_slug.desc&limit=1" + filter).then((rows) => {
      if (!rows || !rows.length) {
        setNotFound(true);
        return;
      }
      setRow(rows[0]);
    });
  }, []);

  useEffect(() => {
    if (!row) return;
    currentWeekRef.current = row.week_slug;
    document.title = (row.main_title || "Market Calendar") + " — Supabase PoC";

    sbFetch("experts", "select=*&order=order.asc").then((rows) => {
      if (!rows || !rows.length) return;
      setExperts(
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

    Promise.all(
      RELATED_TABLES.map((t) => {
        const limit = t.multi ? 50 : 1;
        return sbFetch(t.id, "select=*&week_slug=eq." + encodeURIComponent(row.week_slug) + "&limit=" + limit).then((rows) =>
          (rows || []).map((r) => relatedCardHtml(t, r))
        );
      })
    ).then((results) => {
      const cards = ([] as string[]).concat(...results);
      if (!cards.length) return;
      const y = parseInt(row.week_slug.slice(0, 4), 10) + 543;
      const m = parseInt(row.week_slug.slice(5, 7), 10);
      setRelatedLabel(THAI_MONTHS_FULL[m] + " " + y);
      setRelatedHtml(cards.join(""));
    });
  }, [row]);

  // Calendar grid transform + table style tweaks, run after body content commits to the DOM
  useEffect(() => {
    if (!row) return;
    processBodyCalendar(row.week_slug);
    document.querySelectorAll("#f-body table:not(.monthly-cal)").forEach((tblEl) => {
      const tbl = tblEl as HTMLTableElement;
      tbl.style.width = "100%";
      tbl.style.tableLayout = "fixed";
      tbl.style.borderColor = "#eaeaea";
      tbl.querySelectorAll("col, th, td").forEach((el) => {
        (el as HTMLElement).style.width = "";
        el.removeAttribute("width");
      });
      tbl.querySelectorAll("td").forEach((el) => ((el as HTMLElement).style.padding = "10px"));
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

  // Calendar date bottom sheet (mobile only) — event delegation, set up once
  useEffect(() => {
    const overlay = document.getElementById("calPopupOverlay");
    const sheet = document.getElementById("calPopupSheet");
    const dateEl = document.getElementById("calPopupDate");
    const eventsEl = document.getElementById("calPopupEvents");
    const closeBtn = document.getElementById("calPopupCloseBtn");
    if (!overlay || !sheet || !dateEl || !eventsEl || !closeBtn) return;

    function openPopup(td: Element) {
      let date = td.getAttribute("data-date") || "";
      if (!date) {
        const numEl = td.querySelector(".cal-date-num");
        date = numEl ? (numEl.textContent || "").trim() : "";
      }
      dateEl!.textContent = date;

      const items = td.querySelectorAll(".cal-event-item, .cal-events li");
      let html = "";
      if (items.length) {
        items.forEach((item) => {
          const t = (item.textContent || "").trim();
          if (t) html += `<div class="cal-popup-event-item">• ${t}</div>`;
        });
      } else {
        const clone = td.cloneNode(true) as HTMLElement;
        const n = clone.querySelector(".cal-date-num");
        if (n) n.remove();
        clone.querySelectorAll(".cal-event-tag, .cal-event-time").forEach((el) => el.remove());
        const lines = (clone.textContent || "").split("\n").map((l) => l.trim()).filter(Boolean);
        lines.forEach((line) => (html += `<div class="cal-popup-event-item">• ${line}</div>`));
      }
      eventsEl!.innerHTML = html || '<div class="cal-popup-event-item" style="color:#8f9aac">ไม่มีเหตุการณ์</div>';

      overlay!.classList.add("active");
      sheet!.classList.add("active");
      document.body.style.overflow = "hidden";
    }

    function closePopup() {
      overlay!.classList.remove("active");
      sheet!.classList.remove("active");
      document.body.style.overflow = "";
    }

    function onDocClick(e: MouseEvent) {
      if (window.innerWidth > 767) return;
      const target = e.target as HTMLElement;
      const td = target.closest(".monthly-cal td");
      if (!td || td.classList.contains("cal-empty")) return;
      openPopup(td);
    }
    function onOverlayClick() {
      closePopup();
    }
    function onCloseBtnClick(e: MouseEvent) {
      e.stopPropagation();
      closePopup();
    }
    let swipeStartY = 0;
    function onTouchStart(e: TouchEvent) {
      swipeStartY = e.touches[0].clientY;
    }
    function onTouchEnd(e: TouchEvent) {
      if (e.changedTouches[0].clientY - swipeStartY > 70) closePopup();
    }

    document.addEventListener("click", onDocClick);
    overlay.addEventListener("click", onOverlayClick);
    closeBtn.addEventListener("click", onCloseBtnClick as EventListener);
    sheet.addEventListener("touchstart", onTouchStart as EventListener, { passive: true });
    sheet.addEventListener("touchend", onTouchEnd as EventListener, { passive: true });

    return () => {
      document.removeEventListener("click", onDocClick);
      overlay.removeEventListener("click", onOverlayClick);
      closeBtn.removeEventListener("click", onCloseBtnClick as EventListener);
      sheet.removeEventListener("touchstart", onTouchStart as EventListener);
      sheet.removeEventListener("touchend", onTouchEnd as EventListener);
    };
  }, []);

  const WEEKLY_THUMB: Record<string, string> = {
    weekly_hot_issue: "/images/theme/thumb-hot-issue.png",
    weekly_asset_performance: "/images/theme/thumb-asset-performance.png",
    weekly_buy_list: "/images/theme/thumb-buy-list.png",
  };
  const WEEKLY_TABLES: RelatedTable[] = [
    { id: "weekly_hot_issue", label: "Hot issue", cls: "tag-hot-issue", path: "/wealth-single-weekly-hotissue/", usePath: true, multi: true },
    { id: "weekly_asset_performance", label: "Asset performance", cls: "tag-asset-perf", path: "/wealth-single-weekly-asset-performance/" },
    { id: "weekly_buy_list", label: "Buy list", cls: "tag-buy-list", path: "/wealth-single-weekly-buy-list/" },
  ];

  function openWeekModal() {
    setWeekModalOpen(true);
    setWeekModalHtml('<p style="color:#8f9aac;font-size:14px;font-family:\'Noto Sans Thai\',sans-serif;padding:8px 0;">กำลังโหลด...</p>');
    Promise.all(
      WEEKLY_TABLES.map((t) => {
        const limit = t.multi ? 50 : 1;
        return sbFetch(t.id, "select=*&week_slug=eq." + encodeURIComponent(currentWeekRef.current) + "&limit=" + limit).then((rows) =>
          rows.map((r) => ({ ...r, _table: t }))
        );
      })
    ).then((results) => {
      const valid = ([] as any[]).concat(...results);
      if (!valid.length) {
        setWeekModalHtml('<p style="color:#8f9aac;font-size:14px;font-family:\'Noto Sans Thai\',sans-serif;padding:8px 0;">ไม่พบบทความในสัปดาห์เดียวกัน</p>');
        return;
      }
      setWeekModalHtml(
        valid
          .map((a) => {
            const t: RelatedTable = a._table;
            const src = WEEKLY_THUMB[t.id] || "";
            const slugPart = t.usePath ? a.path || "" : a.week_slug || "";
            const url = t.path + slugPart;
            const excerpt = a.description || stripHtml(a.ai_summary);
            return (
              '<div class="col-6 col-lg-3"><div class="insight-card" onclick="location.href=\'' +
              url +
              '\'">' +
              `<div class="insight-card-img-wrap"><img class="insight-card-img" src="${src}" alt="" /></div>` +
              '<div class="insight-card-content">' +
              `<span class="insight-card-img-tag insight-tag ${t.cls}">${t.label}</span>` +
              `<h4 class="insight-card-title">${a.main_title || ""}</h4>` +
              `<p class="insight-card-date">${shortDate(a.page_date)}</p>` +
              `<p class="insight-card-excerpt">${excerpt}</p>` +
              "</div></div></div>"
            );
          })
          .join("")
      );
    });
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
                  <li className="active">Market calendar</li>
                </ol>
              </div>
            </div>
          </div>

          <section className="article-header">
            <div className="container">
              <div className="col-12 col-lg-9 mx-auto">
                <span className="article-category-tag">Market calendar</span>
                <h1 className="article-title" id="f-title">{row?.main_title || ""}</h1>
                <p className="article-subtitle" id="f-subtitle">{row?.page_subtitle || ""}</p>
                <p className="article-date" id="f-date">{thaiMonthYear(row?.page_date)}</p>
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

                <div className="article-content" id="f-body" dangerouslySetInnerHTML={{ __html: row?.body || "" }} />

                <div className="article-cta-row">
                  <div className="article-cta-left">
                    <p className="article-cta-title">ต้องการดูภาพรวมทั้งเดือน?</p>
                    <p className="article-cta-sub">เนื้อหานี้เป็นส่วนหนึ่งของบทวิเคราะห์ฉบับเต็มที่ครอบคลุมเนื้อหาทุก asset class</p>
                    <a className="article-cta-btn" id="f-cta-link" href={row ? `/wealth-monthly-report?week=${encodeURIComponent(row.week_slug)}` : "#"} target="_blank" rel="noopener">ดูมุมมองเพิ่มเติม</a>
                  </div>
                </div>

                {experts && (
                  <div className="experts-section">
                    <p className="experts-title">บทวิเคราะห์โดย</p>
                    <div className="row g-3" dangerouslySetInnerHTML={{ __html: experts }} />
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

      <div className={"week-modal-overlay" + (weekModalOpen ? " open" : "")} onClick={(e) => { if (e.target === e.currentTarget) setWeekModalOpen(false); }}>
        <div className="week-modal">
          <div className="week-modal-header">
            <h3 className="week-modal-title">มุมมองเพิ่มเติมสัปดาห์เดียวกัน</h3>
            <button className="week-modal-close" onClick={() => setWeekModalOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="week-modal-body">
            <div className="related-week-header-row" style={{ marginBottom: 16 }}>
              <span className="related-week-chip">Weekly</span>
              <span className="related-week-label">บทวิเคราะห์รายสัปดาห์เดียวกัน</span>
            </div>
            <div className="row g-3" dangerouslySetInnerHTML={{ __html: weekModalHtml }} />
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

      <div className="cal-popup-overlay" id="calPopupOverlay"></div>
      <div className="cal-popup-sheet" id="calPopupSheet">
        <div className="cal-popup-handle"></div>
        <div className="cal-popup-header">
          <p className="cal-popup-date-title" id="calPopupDate"></p>
          <button className="cal-popup-close-btn" id="calPopupCloseBtn" aria-label="ปิด">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <line x1="15" y1="5" x2="5" y2="15" stroke="#0c244a" strokeWidth="2" strokeLinecap="round"/>
              <line x1="5" y1="5" x2="15" y2="15" stroke="#0c244a" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="cal-popup-events-list" id="calPopupEvents"></div>
      </div>
    </>
  );
}

"use client";

// PoC: port of yuanta-wealth-supabase-poc/home.html (itself a byte-for-byte
// copy of the real production yuanta-wealth-theme/templates/home.html) onto
// Webflow Cloud (Next.js). Design/CSS/data-fetching logic unchanged — only
// the hosting layer changes (HubL -> plain HTML -> this React shell).
// Data source: Supabase (see [[project_hubspot_migration_poc]] memory),
// same publishable/anon read-only key already used by every other PoC page.
//
// Note: the dynamic Insights/Events sections are driven by React state
// (fetch in useEffect, render via dangerouslySetInnerHTML once loaded)
// rather than a raw injected <script> mutating the DOM directly — a plain
// injected script that swaps a JSX-managed container's innerHTML races
// React's hydration and gets reverted (confirmed while porting this page:
// hydration-mismatch error, tree "regenerated on the client" wiped the
// fetched content right back to the loading placeholder). State-driven
// rendering avoids that entirely.

import { useEffect, useState } from "react";

const SUPABASE_URL = "https://kqgdvpqygepvaifzrxki.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_6khmxt87r-YGlSxyF9d9XA_G0NNDTbp"; // publishable key, safe client-side, RLS = read-only

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

// ── Home Insights (weekly) ──────────────────────────────────────────────
type WeeklyTable = { id: string; type: string; label: string; cls: string; path: string };
type Article = { values: Record<string, any>; path?: string; _table: WeeklyTable };

const HOME_FALLBACK_IMG = "/images/theme/comingsoon.png";
const THUMB: Record<string, string> = {
  weekly_hot_issue: "/images/theme/thumb-hot-issue.png",
  weekly_asset_performance: "/images/theme/thumb-asset-performance.png",
  weekly_buy_list: "/images/theme/thumb-buy-list.png",
  weekly_market_calendar: "/images/theme/thumb-market-calendar.png",
};
const WEEKLY_TABLES: WeeklyTable[] = [
  { id: "weekly_hot_issue", type: "hot-issue", label: "Hot issue", cls: "tag-hot-issue", path: "/wealth-single-weekly-hotissue/" },
  { id: "weekly_asset_performance", type: "asset-performance", label: "Asset performance", cls: "tag-asset-perf", path: "/wealth-single-weekly-asset-performance/" },
  { id: "weekly_buy_list", type: "buy-list", label: "Buy list", cls: "tag-buy-list", path: "/wealth-single-weekly-buy-list/" },
  { id: "weekly_market_calendar", type: "market-calendar", label: "Market calendar", cls: "tag-mkt-calendar", path: "/wealth-single-weekly-market-calendar/" },
];
const SVG_ARROW = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SVG_PREV = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>';
const SVG_NEXT = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>';
const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function parseDate(s?: string) {
  return s ? new Date(s + "T00:00:00Z") : null;
}
function thaiDate(s?: string) {
  const d = parseDate(s);
  if (!d) return "";
  return d.getUTCDate() + " " + THAI_MONTHS[d.getUTCMonth()] + " " + (d.getUTCFullYear() + 543);
}
function thaiDateRange(articles: Article[]) {
  const first = articles[0] || ({} as Article);
  const v = first.values || {};
  let start = v.week_start_date;
  let end = v.week_end_date;
  if (!start) {
    const dates = articles.map((a) => a.values.page_date).filter(Boolean).sort();
    if (!dates.length) return "";
    start = dates[0];
    end = dates[dates.length - 1];
  }
  const dS = parseDate(start)!;
  const dE = parseDate(end || start)!;
  const y = dE.getUTCFullYear() + 543;
  if (dS.getUTCMonth() === dE.getUTCMonth()) {
    return dS.getUTCDate() + "–" + dE.getUTCDate() + " " + THAI_MONTHS[dE.getUTCMonth()] + " " + y;
  }
  return dS.getUTCDate() + " " + THAI_MONTHS[dS.getUTCMonth()] + "–" + dE.getUTCDate() + " " + THAI_MONTHS[dE.getUTCMonth()] + " " + y;
}
function imgUrl(a: Article) {
  return (a._table && THUMB[a._table.id]) || HOME_FALLBACK_IMG;
}
function articleUrl(a: Article) {
  const slug = a.path || a.values.week_slug || "";
  return a._table.path + slug;
}
function mobileCardHtml(a: Article) {
  const t = a._table,
    url = articleUrl(a);
  return (
    `<div class="home-insight-card" onclick="location.href='${url}'">` +
    '<div class="home-insight-card-img-wrap">' +
    `<img class="home-insight-card-img" src="${imgUrl(a)}" alt="" onerror="this.onerror=null;this.src='${HOME_FALLBACK_IMG}'" />` +
    `<span class="home-insight-card-img-tag insight-tag ${t.cls}">${t.label}</span>` +
    "</div><div class=\"home-insight-card-content\">" +
    `<p class="home-insight-card-date">${thaiDate(a.values.page_date)}</p>` +
    `<h4 class="home-insight-card-title">${a.values.main_title || ""}</h4>` +
    `<p class="home-insight-card-excerpt">${a.values.description || ""}</p>` +
    "</div></div>"
  );
}

function buildHomeWeekHtml(articles: Article[]): string {
  const sorted = articles.slice().sort((a, b) => (b.values.page_date || "").localeCompare(a.values.page_date || ""));
  const feat = sorted[0];
  const ft = feat._table;
  const featUrl = articleUrl(feat);

  const listHtml = sorted
    .slice(1, 4)
    .map((a) => {
      const t = a._table,
        url = articleUrl(a);
      return (
        `<div class="home-article-list-item" onclick="location.href='${url}'">` +
        '<div class="home-article-list-text">' +
        `<span class="insight-tag ${t.cls}">${t.label}</span>` +
        `<h4 class="home-article-list-title">${a.values.main_title || ""}</h4>` +
        `<p class="home-article-list-date">${thaiDate(a.values.page_date)}</p>` +
        "</div>" +
        '<div class="home-article-list-thumb-wrap">' +
        `<img src="${imgUrl(a)}" alt="" onerror="this.onerror=null;this.src='${HOME_FALLBACK_IMG}'" />` +
        "</div></div>"
      );
    })
    .join("");

  const mobileCards = sorted.map((a) => `<div class="col-card">${mobileCardHtml(a)}</div>`).join("");

  const headerHtml =
    '<div class="home-week-header">' +
    '<div class="home-week-section-left">' +
    '<span class="home-week-chip">Weekly</span>' +
    `<span class="home-week-label">${thaiDateRange(articles)}</span>` +
    "</div></div>";

  return (
    headerHtml +
    '<div class="home-week-featured-layout home-d-lg-grid">' +
    `<div class="home-featured-card" onclick="location.href='${featUrl}'">` +
    '<div class="home-featured-card-img-wrap">' +
    `<img src="${imgUrl(feat)}" alt="" onerror="this.onerror=null;this.src='${HOME_FALLBACK_IMG}'" />` +
    `<span class="home-featured-card-tag insight-tag ${ft.cls}">${ft.label}</span>` +
    "</div>" +
    '<div class="home-featured-card-content">' +
    `<p class="home-featured-card-date">${thaiDate(feat.values.page_date)}</p>` +
    `<h2 class="home-featured-card-title">${feat.values.main_title || ""}</h2>` +
    `<p class="home-featured-card-excerpt">${feat.values.description || ""}</p>` +
    `<a href="${featUrl}" class="home-read-more" onclick="event.stopPropagation()">อ่านเพิ่มเติม ${SVG_ARROW}</a>` +
    "</div></div>" +
    `<div class="home-article-list">${listHtml}</div>` +
    "</div>" +
    '<div class="home-week-carousel home-d-lg-none" id="homeWeekCarousel">' +
    `<button class="home-carousel-nav prev" id="homeCarouselPrev" disabled>${SVG_PREV}</button>` +
    `<div class="home-week-carousel-track-wrap"><div class="home-week-carousel-track" id="homeCarouselTrack">${mobileCards}</div></div>` +
    `<button class="home-carousel-nav next" id="homeCarouselNext">${SVG_NEXT}</button>` +
    "</div>"
  );
}

// ── Exclusive Events ─────────────────────────────────────────────────────
function eventDateText(s?: string) {
  if (!s) return "";
  const d = new Date(s + "T00:00:00Z");
  return d.getUTCDate() + " " + THAI_MONTHS[d.getUTCMonth()] + " " + (d.getUTCFullYear() + 543);
}
function eventCardHtml(ev: Record<string, any>) {
  const img = ev.image && ev.image.url ? ev.image.url : HOME_FALLBACK_IMG;
  const timeHtml = ev.event_time ? `<span class="event-date-sep"></span><span class="event-time">${ev.event_time}</span>` : "";
  const locHtml = ev.location
    ? `<p class="event-location"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 14s5-4.686 5-8a5 5 0 10-10 0c0 3.314 5 8 5 8z" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="6" r="1.5" stroke="currentColor" stroke-width="1.5"/></svg><span>${ev.location}</span></p>`
    : "";
  return (
    '<div class="swiper-slide">' +
    `<div class="event-card" style="cursor:pointer;" onclick="location.href='/wealth-single-events?slug=${encodeURIComponent(ev.slug || "")}'">` +
    `<img class="event-img" src="${img}" alt="${ev.title || ""}" />` +
    '<div class="event-card-content">' +
    `<h3 class="event-title">${ev.title || ""}</h3>` +
    '<div class="event-meta">' +
    '<p class="event-datetime">' +
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 1v4M11 1v4M2 7h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
    `<span class="event-date-text">${eventDateText(ev.event_date)}</span>${timeHtml}` +
    "</p>" +
    locHtml +
    "</div></div></div></div>"
  );
}

const CSS = `
    /* ── Category tag chip ── */
    .insight-tag {
      font-family: 'Cormorant Garamond', serif;
      font-size: 12px;
      font-weight: 600;
      padding: 2px 9px;
      white-space: nowrap;
      display: inline-block;
    }
    .tag-hot-issue     { background: #F9EDED; color: #7a1c1c; border: 1px solid #EBC7C7; }
    .tag-buy-list      { background: #EEF1F0; color: #2c4a42; border: 1px solid #CBD4D0; }
    .tag-asset-perf    { background: #F8F4ED; color: #92600a; border: 1px solid #E9DEC7; }
    .tag-mkt-calendar  { background: #E7E9ED; color: #0c244a; border: 1px solid #B4BBC7; }

    /* ── Week header ── */
    .home-week-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }
    .home-week-header::after {
      content: '';
      flex: 1;
      height: 1px;
      background: rgba(0,0,0,.12);
    }
    .home-week-section-left { display: flex; align-items: center; gap: 12px; }
    .home-week-chip {
      font-family: 'Cormorant Garamond', serif;
      font-size: 13px;
      font-weight: 600;
      background: #3D506E;
      color: #fff;
      padding: 3px 10px;
      white-space: nowrap;
    }
    .home-week-label {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 20px;
      font-weight: 700;
      color: #0c244a;
    }

    /* ── Featured + list layout ── */
    .home-week-featured-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
    }
    .home-featured-card {
      position: relative;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      border-right: 1px solid rgba(0,0,0,.07);
      box-shadow: 0 0 1px rgba(102,102,102,.14), 0 2px 8px rgba(102,102,102,.08);
    }
    .home-featured-card-img-wrap {
      position: relative;
      overflow: hidden;
    }
    .home-featured-card-img-wrap img {
      width: 100%;
      height: 320px;
      object-fit: cover;
      display: block;
    }
    .home-featured-card-tag {
      position: absolute;
      top: 12px;
      left: 12px;
    }
    .home-featured-card-content {
      padding: 24px 28px 28px;
      background: #fff;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .home-featured-card-date {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 12px;
      color: #8f9aac;
      margin-bottom: 10px;
    }
    .home-featured-card-title {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: #0c244a;
      line-height: 1.45;
      margin-bottom: 10px;
    }
    .home-featured-card-excerpt {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 14px;
      color: #3d506e;
      line-height: 1.65;
      margin-bottom: 20px;
      flex: 1;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .home-read-more {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: #a2603c;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      text-decoration: none;
      padding-top: 16px;
      border-top: 1px solid rgba(0,0,0,.1);
      transition: gap .15s;
    }
    .home-read-more:hover { gap: 9px; color: #a2603c; }

    /* ── Article list (right side) ── */
    .home-article-list {
      display: flex;
      flex-direction: column;
      margin-left: 18px;
    }
    .home-week-nav-row {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 8px;
      padding: 14px 20px 4px;
    }
    .home-week-nav-btn {
      width: 32px; height: 32px;
      border: 1.5px solid rgba(0,0,0,.18);
      background: #fff;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: background .15s;
      flex-shrink: 0;
    }
    .home-week-nav-btn::after {
      content: '';
      display: inline-block;
      width: 7px; height: 7px;
      border-top: 2px solid #0c244a;
      border-right: 2px solid #0c244a;
    }
    .home-week-nav-btn.wk-prev::after { transform: rotate(-135deg) translateX(-1px); }
    .home-week-nav-btn.wk-next::after { transform: rotate(45deg) translateX(-1px); }
    .home-week-nav-btn:hover:not(:disabled) { background: #f0f0f0; }
    .home-week-nav-btn:disabled { opacity: .3; cursor: default; }
    .home-article-list-item {
      display: flex;
      align-items: stretch;
      gap: 0;
      padding: 18px 20px;
      border-bottom: 1px solid rgba(0,0,0,.07);
      cursor: pointer;
      transition: background .15s;
      flex: 1;
    }
    .home-article-list-item:last-of-type { border-bottom: none; }
    .home-article-list-item:hover { background: #fafafa; }
    .home-article-list-text {
      flex: 1;
      min-width: 0;
      padding-right: 14px;
    }
    .home-article-list-date {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 11px;
      color: #8f9aac;
      margin-top: 6px;
    }
    .home-article-list-title {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 16px;
      font-weight: 700;
      color: #0c244a;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-top: 6px;
    }
    .home-article-list-thumb-wrap {
      position: relative;
      flex-shrink: 0;
      width: 180px;
      height: 120px;
    }
    .home-article-list-thumb-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .home-article-list-thumb-tag {
      position: absolute;
      top: 6px;
      left: 6px;
      font-family: 'Cormorant Garamond', serif;
      font-weight: 500;
      border: 1px solid rgba(0,0,0,.12);
      letter-spacing: .03em;
    }

    /* ── Mobile cards ── */
    .home-week-carousel {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0;
    }
    .home-week-carousel-track-wrap {
      flex: 1;
      overflow: hidden;
      min-width: 0;
      padding: 8px 0;
      margin: -8px 0;
    }
    .home-week-carousel-track {
      display: flex;
      gap: 16px;
      transition: transform .35s ease;
    }
    .home-week-carousel-track .col-card {
      flex: 0 0 calc(25% - 12px);
      min-width: 0;
    }
    .home-carousel-nav {
      width: 36px;
      height: 36px;
      border: 1.5px solid rgba(0,0,0,.15);
      background: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background .15s, opacity .15s;
      flex-shrink: 0;
      color: #0c244a;
      z-index: 1;
    }
    .home-carousel-nav:hover { background: #f0f0f0; }
    .home-carousel-nav.prev { margin-right: 12px; }
    .home-carousel-nav.next { margin-left: 12px; }
    .home-carousel-nav:disabled { opacity: .3; cursor: default; }
    .home-insight-card {
      background: #fff;
      display: flex;
      flex-direction: column;
      height: 100%;
      cursor: pointer;
      transition: box-shadow .2s, transform .18s;
      box-shadow: 0 0 1px rgba(102,102,102,.14), 0 2px 6px rgba(102,102,102,.08);
    }
    .home-insight-card:hover {
      box-shadow: 0 4px 18px rgba(0,0,0,.11);
      transform: translateY(-2px);
    }
    .home-insight-card-img-wrap { position: relative; flex-shrink: 0; }
    .home-insight-card-img {
      width: 100%;
      height: 160px;
      object-fit: cover;
      display: block;
    }
    .home-insight-card-img-tag { position: absolute; top: 8px; left: 8px; }
    .home-insight-card-content {
      padding: 14px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .home-insight-card-date {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 12px;
      color: #8f9aac;
      margin-bottom: 6px;
    }
    .home-insight-card-title {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 16px;
      font-weight: 700;
      color: #0c244a;
      line-height: 1.45;
      margin-bottom: 7px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .home-insight-card-excerpt {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 13px;
      color: #3d506e;
      line-height: 1.55;
      flex: 1;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* ── Toggle desktop/mobile ── */
    .home-d-lg-grid { display: grid; }
    .home-d-lg-none { display: none !important; }
    @media (max-width: 991px) {
      .home-week-featured-layout { grid-template-columns: 1fr; }
      .home-week-carousel-track .col-card { flex: 0 0 calc(50% - 8px); }
      .home-featured-card-content { padding: 18px 20px 20px; }
      .home-featured-card-title { font-size: 16px; }
    }
    @media (max-width: 991px) {
      .home-article-list { border-left: none; border-top: 1px solid rgba(0,0,0,.08); margin-left: 0; }
      .home-article-list-item { padding: 18px 0; }
    }
    @media (max-width: 767px) {
      .home-week-label { font-size: 16px; }
      .home-article-list-thumb-wrap { width: 123px; height: 80px; }
      .home-article-list-item { padding: 18px 0; }
      .home-featured-card-img-wrap img { height: 200px; }
      .home-week-carousel-track .col-card { flex: 0 0 100%; }
      .home-carousel-nav { width: 30px; height: 30px; }
    }
`;

export default function HomePage() {
  const [homeWeekHtml, setHomeWeekHtml] = useState<string | null>(null);
  const [homeLoaded, setHomeLoaded] = useState(false);
  const [eventsHtml, setEventsHtml] = useState<string | null>(null);

  // Escape key closes the meeting modal
  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") closeMeetingModal();
    }
    document.addEventListener("keydown", onKeydown);
    return () => document.removeEventListener("keydown", onKeydown);
  }, []);

  // Nav active-link state (client-only, matches current path)
  useEffect(() => {
    const path = window.location.pathname;
    document.querySelectorAll("#navbarMenu a[data-nav-match]").forEach((a) => {
      const m = a.getAttribute("data-nav-match");
      if (m === "/" ? path === "/" : path.indexOf(m || "") !== -1) a.classList.add("active");
    });
  }, []);

  // Hero + experts Swiper (static markup, safe to init on mount)
  useEffect(() => {
    const SwiperCtor = (window as any).Swiper;
    if (!SwiperCtor) return;
    new SwiperCtor(".hero-swiper", {
      slidesPerView: 1,
      spaceBetween: 0,
      loop: true,
      grabCursor: true,
      autoplay: { delay: 10000, disableOnInteraction: false },
      pagination: { el: ".hero-pagination", clickable: true },
    });
    if (window.innerWidth <= 991) {
      new SwiperCtor(".experts-swiper", {
        slidesPerView: 1.2,
        spaceBetween: 16,
        grabCursor: true,
        watchOverflow: false,
        pagination: { el: ".experts-swiper .swiper-pagination", clickable: true },
        breakpoints: { 576: { slidesPerView: 2.2, spaceBetween: 24 } },
      });
    }
  }, []);

  // Fetch latest weekly insights from Supabase
  useEffect(() => {
    Promise.all(
      WEEKLY_TABLES.map((t) =>
        sbFetch(t.id, "select=*&order=page_date.desc&limit=20").then((rows) =>
          (rows || []).map((row) => ({ values: row, path: row.path, _table: t }) as Article)
        )
      )
    )
      .then((results) => {
        let allArticles = ([] as Article[]).concat(...results);
        if (!allArticles.length) {
          setHomeLoaded(true);
          return;
        }

        const SPLIT_TABLE_IDS: Record<string, boolean> = { weekly_hot_issue: true };
        const seenPerType: Record<string, boolean> = {};
        allArticles = allArticles.filter((a) => {
          const type = a._table.type;
          if (type !== "buy-list" && type !== "hot-issue") return true;
          const slug = a.values.week_slug || a.path || "";
          const key = SPLIT_TABLE_IDS[a._table.id] ? `row|${a._table.id}|${a.values.id || a.path}` : `${type}|${slug}`;
          if (seenPerType[key]) return false;
          seenPerType[key] = true;
          return true;
        });

        const weekMap: Record<string, Article[]> = {};
        allArticles.forEach((a) => {
          const slug = a.values.week_slug || a.path || "";
          if (slug) {
            if (!weekMap[slug]) weekMap[slug] = [];
            weekMap[slug].push(a);
          }
        });
        const slugs = Object.keys(weekMap).sort().reverse();
        if (slugs.length) setHomeWeekHtml(buildHomeWeekHtml(weekMap[slugs[0]]));
        setHomeLoaded(true);
      })
      .catch(() => setHomeLoaded(true));
  }, []);

  // Mobile carousel: wire up nav buttons once the fetched week HTML is in the DOM
  useEffect(() => {
    if (!homeWeekHtml) return;
    const track = document.getElementById("homeCarouselTrack");
    const prevBtn = document.getElementById("homeCarouselPrev") as HTMLButtonElement | null;
    const nextBtn = document.getElementById("homeCarouselNext") as HTMLButtonElement | null;
    if (!track || !prevBtn || !nextBtn) return;
    const cards = track.querySelectorAll(".col-card");
    const total = cards.length;
    let current = 0;
    function getPerPage() {
      if (window.innerWidth <= 767) return 1;
      if (window.innerWidth <= 991) return 2;
      return 4;
    }
    function updateCarousel() {
      const perPage = getPerPage();
      const pages = Math.ceil(total / perPage);
      if (current >= pages) current = pages - 1;
      if (current < 0) current = 0;
      const wrapWidth = track!.parentElement!.offsetWidth;
      const gap = 16;
      const cardWidth = (wrapWidth - gap * (perPage - 1)) / perPage;
      const offset = current * (cardWidth + gap) * perPage;
      track!.style.transform = `translateX(-${offset}px)`;
      prevBtn!.disabled = current === 0;
      nextBtn!.disabled = current >= pages - 1;
      const showNav = pages > 1;
      prevBtn!.style.visibility = showNav ? "" : "hidden";
      nextBtn!.style.visibility = showNav ? "" : "hidden";
    }
    function onPrev() {
      if (current > 0) {
        current--;
        updateCarousel();
      }
    }
    function onNext() {
      const pages = Math.ceil(total / getPerPage());
      if (current < pages - 1) {
        current++;
        updateCarousel();
      }
    }
    prevBtn.addEventListener("click", onPrev);
    nextBtn.addEventListener("click", onNext);
    updateCarousel();
    function onResize() {
      current = 0;
      updateCarousel();
    }
    window.addEventListener("resize", onResize);
    return () => {
      prevBtn.removeEventListener("click", onPrev);
      nextBtn.removeEventListener("click", onNext);
      window.removeEventListener("resize", onResize);
    };
  }, [homeWeekHtml]);

  // Fetch Exclusive Events from Supabase
  useEffect(() => {
    sbFetch("events", "select=*&category=eq.events&is_published=eq.true&order=event_date.asc&limit=8").then((rows) => {
      rows = rows || [];
      if (rows.length) setEventsHtml(rows.map(eventCardHtml).join(""));
    });
  }, []);

  // Init events Swiper once the fetched cards are in the DOM
  useEffect(() => {
    if (!eventsHtml) return;
    const SwiperCtor = (window as any).Swiper;
    if (!SwiperCtor) return;
    new SwiperCtor(".events-swiper", {
      slidesPerView: 1.15,
      slidesPerGroup: 1,
      spaceBetween: 24,
      centerInsufficientSlides: true,
      pagination: { el: ".events-swiper .swiper-pagination", clickable: true },
      breakpoints: {
        576: { slidesPerView: 2, slidesPerGroup: 2 },
        992: { slidesPerView: 3, slidesPerGroup: 3 },
        1200: { slidesPerView: 4, slidesPerGroup: 4 },
      },
    });
    const slideCount = document.querySelectorAll(".events-swiper .swiper-slide").length;
    if (slideCount <= 4) {
      const el = document.querySelector<HTMLElement>(".events-swiper .swiper-pagination");
      if (el) el.style.display = "none";
    }
  }, [eventsHtml]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* [POC] Global header/nav — copied from templates/partials/header.html */}
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

      {/* HERO BANNER */}
      <div className="hero-banner">
        <div className="swiper hero-swiper">
          <div className="swiper-wrapper">
            <div className="swiper-slide">
              <div className="hero-bg" style={{ backgroundImage: "url('/images/theme/homebanner.jpg')" }}></div>
            </div>
            <div className="swiper-slide">
              <div className="hero-bg" style={{ backgroundImage: "url('/images/theme/contactbanner.png')" }}></div>
            </div>
            <div className="swiper-slide">
              <div className="hero-bg" style={{ backgroundImage: "url('/images/theme/privilegesbanner.png')" }}></div>
            </div>
          </div>
        </div>
        <div className="hero-overlay"></div>
        <div className="hero-content-fixed">
          <div className="container">
            <div className="hero-home-inner">
              <h1 className="hero-title">Yuanta Securities</h1>
              <h3 className="hero-label">Wealth Management</h3>
              <p>บริการจัดการความมั่งคั่งอย่างครบวงจร ด้วยทีมผู้เชี่ยวชาญที่มีประสบการณ์ระดับสากล</p>
              <a href="#" className="btn btn-primary" onClick={(e) => { e.preventDefault(); openMeetingModal(); }}>Book a meeting</a>
            </div>
          </div>
        </div>
      </div>
      <div className="hero-pagination-wrap">
        <div className="swiper-pagination hero-pagination"></div>
      </div>

      {/* INSIGHTS (Dynamic Weekly) */}
      <section className="insights-section">
        <div className="container">
          <div className="section-header-center">
            <h2 className="section-title">Insights</h2>
          </div>
          <div id="homeInsightsContainer" style={{ minHeight: 320 }}>
            {!homeLoaded && (
              <div id="homeInsightsLoading" style={{ textAlign: "center", padding: "60px 0", color: "#8f9aac", fontFamily: "'Noto Sans Thai',sans-serif", fontSize: 15 }}>
                กำลังโหลดบทวิเคราะห์...
              </div>
            )}
            {homeWeekHtml && <div dangerouslySetInnerHTML={{ __html: homeWeekHtml }} />}
          </div>
          <div className="section-view-all-center">
            <a href="/wealth-insights" className="view-all">
              ดูบทวิเคราะห์ทั้งหมด
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
          </div>
        </div>
      </section>

      <hr className="section-sep" />

      {/* EXCLUSIVE EVENTS */}
      <section className="events-section">
        <div className="container">
          <div className="section-header-center">
            <h2 className="section-title">Exclusive Events</h2>
          </div>
          <div className="swiper events-swiper" id="eventsSwiper" style={{ display: eventsHtml ? "" : "none" }}>
            <div className="swiper-wrapper" id="eventsSwiperWrapper" dangerouslySetInnerHTML={{ __html: eventsHtml || "" }} />
            <div className="swiper-pagination"></div>
          </div>
          {!eventsHtml && (
            <p id="eventsEmptyMsg" style={{ textAlign: "center", color: "#8f9aac", fontFamily: "'Noto Sans Thai',sans-serif", fontSize: 15, padding: "40px 0" }}>
              ยังไม่มี Events ในขณะนี้
            </p>
          )}
        </div>
      </section>

      {/* CTA BOOK A MEETING */}
      <section className="cta-section" style={{ backgroundImage: "url('/images/consult-banner.jpg')" }}>
        <div className="cta-overlay"></div>
        <div className="cta-content">
          <div className="container">
            <div className="row align-items-center gy-4">
              <div className="col-12 col-lg-8">
                <div className="cta-text">
                  <p className="section-label" style={{ color: "var(--color-brand-soft)" }}>Private Consultation</p>
                  <p className="cta-main-text">ขอคำแนะนำจากผู้เชี่ยวชาญด้านการเงิน ติดต่อเราเพื่อเริ่มต้นสร้างอนาคตทางการเงินที่ดียิ่งขึ้น</p>
                </div>
              </div>
              <div className="col-12 col-lg-4 d-flex justify-content-lg-end">
                <a href="#" className="btn btn-primary" onClick={(e) => { e.preventDefault(); openMeetingModal(); }}>Book a meeting</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OUR EXPERTS */}
      <section className="experts-section">
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div className="section-header experts-section-header">
            <div className="section-header-left">
              <h2 className="section-title">Expert</h2>
            </div>
            <a href="/wealth-whyus" className="view-all">
              ดูเพิ่มเติม
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
          </div>
          <div className="swiper experts-swiper experts-grid-wrap">
            <div className="swiper-wrapper">
              <div className="swiper-slide">
                <div className="expert-card">
                  <div className="expert-photo-wrap">
                    <img className="expert-photo" src="/images/theme/expert-d6c3628f8f.jpg" alt="Danai Aroonkittichai" />
                  </div>
                  <div className="expert-card-body">
                    <p className="expert-name">Danai Aroonkittichai</p>
                    <p className="expert-role">CFA</p>
                    <div className="expert-divider-strip"></div>
                    <p className="expert-title-th">Chief Retail Business Office at Yuanta Securities</p>
                  </div>
                </div>
              </div>
              <div className="swiper-slide">
                <div className="expert-card">
                  <div className="expert-photo-wrap">
                    <img className="expert-photo" src="/images/theme/expert-99d9ed77ce.jpg" alt="Visakorn Kirivan" />
                  </div>
                  <div className="expert-card-body">
                    <p className="expert-name">Visakorn Kirivan</p>
                    <p className="expert-role">CFA, PhD</p>
                    <div className="expert-divider-strip"></div>
                    <p className="expert-title-th">Senior Investment Strategist, Fundamental Investment Analyst</p>
                  </div>
                </div>
              </div>
              <div className="swiper-slide">
                <div className="expert-card">
                  <div className="expert-photo-wrap">
                    <img className="expert-photo" src="/images/theme/expert-f80e3df909.jpg" alt="Natakit Karnkriangkrai" />
                  </div>
                  <div className="expert-card-body">
                    <p className="expert-name">Natakit Karnkriangkrai</p>
                    <p className="expert-role">&nbsp;</p>
                    <div className="expert-divider-strip"></div>
                    <p className="expert-title-th">Investment Strategist with a passion for global investing and portfolio solutions.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="swiper-pagination"></div>
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="newsletter-section">
        <div className="container">
          <div className="row align-items-center gy-5">
            <div className="col-12">
              <p className="newsletter-label">Exclusive Insights</p>
              <h2 className="newsletter-title">Unlock Insights &amp; Market Intelligence</h2>
              <p className="newsletter-desc">รับข้อมูลเชิงลึกด้านการลงทุน บทวิเคราะห์ตลาด และโอกาสการลงทุนพิเศษ ส่งตรงถึงอีเมลของคุณทุกสัปดาห์</p>
            </div>
          </div>
        </div>
      </section>

      {/* [POC] Global footer — copied from templates/partials/footer.html */}
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

      {/* [POC] Setmore booking modal — copied from templates/layouts/base.html */}
      <div
        id="meeting-modal"
        className="meeting-modal-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) closeMeetingModal(); }}
      >
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

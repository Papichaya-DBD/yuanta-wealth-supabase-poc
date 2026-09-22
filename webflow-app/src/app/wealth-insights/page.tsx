"use client";

// PoC: port of yuanta-wealth-supabase-poc/insights.html (byte-for-byte copy of the
// real production yuanta-wealth-theme/templates/insights.html) onto Webflow Cloud
// (Next.js). Design/CSS and the Supabase-backed fetch/grouping logic are unchanged;
// only the rendering mechanism differs — this page is written as real JSX
// components driven by React state (not raw HTML-string building + a single
// injected <script>, which is how the original vanilla-JS file worked) so that
// the filter/pagination/carousel/modal interactions are ordinary React state
// updates instead of direct DOM mutation racing hydration (see the hydration-bug
// note in the home page port, `src/app/page.tsx`, for why raw injected scripts
// mutating a JSX-managed container are unsafe here).

import { useEffect, useMemo, useRef, useState } from "react";

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

// ── Table config ─────────────────────────────────────────────────────────
type TableDef = { id: string; type: string; label: string; cls: string; path: string };
type Article = { values: Record<string, any>; path?: string; _table: TableDef };

const FALLBACK_IMG =
  "data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%204%203%27%3E%3Crect%20width%3D%274%27%20height%3D%273%27%20fill%3D%27%23c8cdd5%27/%3E%3Cpath%20transform%3D%27translate%281.5%2C1%29%20scale%280.042%29%27%20fill%3D%27rgba%28255%2C255%2C255%2C.7%29%27%20d%3D%27M21%2019V5c0-1.1-.9-2-2-2H5c-1.1%200-2%20.9-2%202v14c0%201.1.9%202%202%202h14c1.1%200%202-.9%202-2zM8.5%2013.5l2.5%203.01L14.5%2012l4.5%206H5l3.5-4.5z%27/%3E%3C/svg%3E";

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

const WEEKLY_TABLES: TableDef[] = [
  { id: "weekly_hot_issue", type: "hot-issue", label: "Hot issue", cls: "tag-hot-issue", path: "/wealth-single-weekly-hotissue/" },
  { id: "weekly_asset_performance", type: "asset-performance", label: "Asset performance", cls: "tag-asset-perf", path: "/wealth-single-weekly-asset-performance/" },
  { id: "weekly_buy_list", type: "buy-list", label: "Buy list", cls: "tag-buy-list", path: "/wealth-single-weekly-buy-list/" },
  { id: "weekly_market_calendar", type: "market-calendar", label: "Market calendar", cls: "tag-mkt-calendar", path: "/wealth-single-weekly-market-calendar/" },
];
const MONTHLY_TABLES: TableDef[] = [
  { id: "monthly_hot_issue", type: "hot-issue", label: "Hot issue", cls: "tag-hot-issue", path: "/wealth-single-monthly-hotissue/" },
  { id: "monthly_asset_performance", type: "asset-performance", label: "Asset performance", cls: "tag-asset-perf", path: "/wealth-single-monthly-asset-performance/" },
  { id: "monthly_buy_list", type: "buy-list", label: "Buy list", cls: "tag-buy-list", path: "/wealth-single-monthly-buy-list/" },
  { id: "monthly_market_calendar", type: "market-calendar", label: "Market calendar", cls: "tag-mkt-calendar", path: "/wealth-single-monthly-market-calendar/" },
  { id: "monthly_market_outlook", type: "market-outlook", label: "Market outlook", cls: "tag-mkt-outlook", path: "/wealth-single-monthly-market-outlook/" },
  { id: "monthly_asset_class_outlook", type: "asset-class-outlook", label: "Asset class outlook", cls: "tag-asset-outlook", path: "/wealth-single-monthly-asset-class-outlook/" },
];
const ALL_TABLES = WEEKLY_TABLES.concat(MONTHLY_TABLES);

// split tables: several topic rows can share one week_slug, so each row's real
// identity is its `path` column, not week_slug (which only tells you the period).
const SPLIT_TABLE_IDS: Record<string, boolean> = {
  weekly_hot_issue: true,
  monthly_hot_issue: true,
  monthly_asset_class_outlook: true,
};

const FILTERS = [
  { key: "", label: "All" },
  { key: "hot-issue", label: "Hot issue" },
  { key: "buy-list", label: "Buy list" },
  { key: "asset-performance", label: "Asset performance" },
  { key: "market-calendar", label: "Market calendar" },
  { key: "asset-class-outlook", label: "Asset class outlook" },
  { key: "market-outlook", label: "Market outlook" },
];

const SVG_ARROW = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Thai date helpers (Supabase returns ISO date strings, not HubDB epoch-ms) ──
const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const THAI_MONTHS_FULL = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

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
function thaiMonthLabel(articles: Article[]) {
  const slug = (articles[0] && articles[0].values.week_slug) || "";
  const d = parseDate(slug);
  if (!d) return "";
  return THAI_MONTHS_FULL[d.getUTCMonth()] + " " + (d.getUTCFullYear() + 543);
}
function imgUrl(a: Article) {
  return (a._table && THUMB[a._table.id]) || FALLBACK_IMG;
}
function stripHtml(html?: string) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  return tmp.textContent || "";
}
function excerptOf(a: Article) {
  return a.values.description || stripHtml(a.values.ai_summary);
}
function articleUrl(a: Article) {
  const t = a._table;
  const slug = SPLIT_TABLE_IDS[t.id] ? a.path || a.values.week_slug || "" : a.values.week_slug || a.path || "";
  return t.path + slug;
}

// ── Week grouping ────────────────────────────────────────────────────────
type WeekGroup = { slug: string; isMonthly: boolean; chip: string; label: string; articles: Article[] };

function buildWeekGroups(articles: Article[]): WeekGroup[] {
  const weekMap: Record<string, Article[]> = {};
  articles.forEach((a) => {
    const slug = a.values.week_slug || a.path || "";
    if (slug) {
      if (!weekMap[slug]) weekMap[slug] = [];
      weekMap[slug].push(a);
    }
  });
  const slugs = Object.keys(weekMap).sort().reverse();
  return slugs.map((slug) => {
    const arts = weekMap[slug];
    const isMonthly = /^\d{4}-\d{2}-01$/.test(slug);
    return {
      slug,
      isMonthly,
      chip: isMonthly ? "Monthly" : "Weekly",
      label: isMonthly ? thaiMonthLabel(arts) : thaiDateRange(arts),
      articles: arts,
    };
  });
}

// ── Presentational pieces ────────────────────────────────────────────────
function ArticleCard({ a }: { a: Article }) {
  const t = a._table;
  return (
    <div className="insight-card" onClick={() => (location.href = articleUrl(a))}>
      <div className="insight-card-img-wrap">
        <img
          className="insight-card-img"
          src={imgUrl(a)}
          alt=""
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).onerror = null;
            e.currentTarget.src = FALLBACK_IMG;
          }}
        />
        <span className={`insight-card-img-tag insight-tag ${t.cls}`}>{t.label}</span>
      </div>
      <div className="insight-card-content">
        <p className="insight-card-date">{thaiDate(a.values.page_date)}</p>
        <h4 className="insight-card-title">{a.values.main_title || ""}</h4>
        <p className="insight-card-excerpt">{excerptOf(a)}</p>
      </div>
    </div>
  );
}

function WeekSectionHeader({ w, onSeeAll }: { w: WeekGroup; onSeeAll?: () => void }) {
  return (
    <div className="week-section-header">
      <div className="week-section-left">
        <span className={`week-chip${w.isMonthly ? " week-chip-monthly" : ""}`}>{w.chip}</span>
        <span className="week-label">{w.label}</span>
      </div>
      {onSeeAll && (
        <a
          href="#"
          className="week-see-all"
          onClick={(e) => {
            e.preventDefault();
            onSeeAll();
          }}
        >
          ดูทั้งหมด {SVG_ARROW}
        </a>
      )}
    </div>
  );
}

function WeekCarousel({ articles, mobileOnly }: { articles: Article[]; mobileOnly?: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [perPage, setPerPage] = useState(4);

  useEffect(() => {
    function getPerPage() {
      if (window.innerWidth <= 767) return 1;
      if (window.innerWidth <= 991) return 2;
      return 4;
    }
    function onResize() {
      setPerPage(getPerPage());
      setCurrent(0);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const total = articles.length;
  const pages = Math.max(1, total - perPage + 1);
  const cur = Math.min(current, pages - 1);
  const wrapWidth = wrapRef.current?.offsetWidth || 0;
  const gap = 16;
  const cardWidth = perPage > 0 ? (wrapWidth - gap * (perPage - 1)) / perPage : 0;
  const offset = cur * (cardWidth + gap);
  const showNav = total > perPage;
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 767;
  const navHidden = !showNav && isMobile;

  return (
    <div className={`week-carousel${mobileOnly ? " d-lg-none" : ""}`} data-perpage="4">
      <button
        className="carousel-nav prev"
        style={{ display: navHidden ? "none" : "" }}
        disabled={!showNav || cur === 0}
        onClick={() => setCurrent((c) => Math.max(0, c - 1))}
      />
      <div className="week-carousel-track-wrap" ref={wrapRef}>
        <div className="week-carousel-track" style={{ transform: `translateX(-${offset}px)` }}>
          {articles.map((a, i) => (
            <div className="col-card" data-category={a._table.type} key={a._table.id + "|" + (a.path || a.values.week_slug || i)}>
              <ArticleCard a={a} />
            </div>
          ))}
        </div>
      </div>
      <button
        className="carousel-nav next"
        style={{ display: navHidden ? "none" : "" }}
        disabled={!showNav || cur >= pages - 1}
        onClick={() => setCurrent((c) => Math.min(pages - 1, c + 1))}
      />
    </div>
  );
}

function HeroWeekSection({ w, onSeeAll }: { w: WeekGroup; onSeeAll: () => void }) {
  const sorted = useMemo(
    () => w.articles.slice().sort((a, b) => (b.values.page_date || "").localeCompare(a.values.page_date || "")),
    [w.articles]
  );
  const feat = sorted[0];
  const rest = sorted.slice(1);
  const [liCur, setLiCur] = useState(0);
  const liPerPage = 3;
  const liPages = Math.ceil(rest.length / liPerPage) || 1;
  const cur = Math.min(liCur, liPages - 1);
  if (!feat) return null;
  const ft = feat._table;
  const featUrl = articleUrl(feat);

  return (
    <div className="week-section">
      <WeekSectionHeader w={w} onSeeAll={onSeeAll} />
      <div className="week-featured-layout d-none d-lg-grid">
        <div className="featured-card" data-category={ft.type} onClick={() => (location.href = featUrl)}>
          <div className="featured-card-img-wrap">
            <img
              src={imgUrl(feat)}
              alt=""
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).onerror = null;
                e.currentTarget.src = FALLBACK_IMG;
              }}
            />
            <span className={`featured-card-tag insight-tag ${ft.cls}`}>{ft.label}</span>
          </div>
          <div className="featured-card-content">
            <p className="featured-card-date">{thaiDate(feat.values.page_date)}</p>
            <h2 className="featured-card-title">{feat.values.main_title || ""}</h2>
            <p className="featured-card-excerpt">{excerptOf(feat)}</p>
            <a href={featUrl} className="read-more" onClick={(e) => e.stopPropagation()}>
              อ่านเพิ่มเติม {SVG_ARROW}
            </a>
          </div>
        </div>
        <div className="article-list">
          {rest.map((a, i) => {
            const t = a._table;
            const visible = i >= cur * liPerPage && i < (cur + 1) * liPerPage;
            const lastIdx = Math.min((cur + 1) * liPerPage - 1, rest.length - 1);
            return (
              <div
                className="article-list-item"
                data-category={t.type}
                key={t.id + "|" + (a.path || a.values.week_slug || i)}
                style={{ display: visible ? "" : "none", borderBottom: i === lastIdx ? "none" : "" }}
                onClick={() => (location.href = articleUrl(a))}
              >
                <div className="article-list-text">
                  <p className="article-list-date">{thaiDate(a.values.page_date)}</p>
                  <h4 className="article-list-title">{a.values.main_title || ""}</h4>
                </div>
                <div className="article-list-thumb-wrap">
                  <img
                    src={imgUrl(a)}
                    alt=""
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).onerror = null;
                      e.currentTarget.src = FALLBACK_IMG;
                    }}
                  />
                  <span className={`article-list-thumb-tag insight-tag ${t.cls}`}>{t.label}</span>
                </div>
              </div>
            );
          })}
          <div className="week-nav-row">
            <button
              className="week-nav-btn wk-prev"
              disabled={cur === 0}
              onClick={(e) => {
                e.stopPropagation();
                setLiCur((c) => Math.max(0, c - 1));
              }}
            />
            <button
              className="week-nav-btn wk-next"
              disabled={cur >= liPages - 1}
              onClick={(e) => {
                e.stopPropagation();
                setLiCur((c) => Math.min(liPages - 1, c + 1));
              }}
            />
          </div>
        </div>
      </div>
      <WeekCarousel articles={sorted} mobileOnly />
    </div>
  );
}

function CarouselWeekSection({ w, onSeeAll }: { w: WeekGroup; onSeeAll: () => void }) {
  const sorted = useMemo(
    () => w.articles.slice().sort((a, b) => (b.values.page_date || "").localeCompare(a.values.page_date || "")),
    [w.articles]
  );
  return (
    <div className="week-section">
      <WeekSectionHeader w={w} onSeeAll={onSeeAll} />
      <WeekCarousel articles={sorted} />
    </div>
  );
}

function FilterGrid({ groups }: { groups: WeekGroup[] }) {
  return (
    <div id="filterResultsGrid">
      {groups.map((w) => (
        <div className="week-section" key={w.slug}>
          <div className="week-section-header">
            <div className="week-section-left">
              <span className={`week-chip${w.isMonthly ? " week-chip-monthly" : ""}`}>{w.chip}</span>
              <span className="week-label">{w.label}</span>
            </div>
          </div>
          <div className="row g-3">
            {w.articles.map((a, i) => (
              <div className="col-12 col-md-4 col-lg-3" key={a._table.id + "|" + (a.path || a.values.week_slug || i)}>
                <ArticleCard a={a} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

type ModalData = { label: string; articles: Article[]; isMobile: boolean };

function WeekModal({ data, onClose }: { data: ModalData; onClose: () => void }) {
  return (
    <div
      className="week-modal-overlay open"
      id="weekModalOverlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="week-modal" id="weekModal">
        <div className="week-modal-header">
          <h3 className="week-modal-title" id="weekModalTitle">
            {data.label}
          </h3>
          <button className="week-modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="week-modal-body">
          {data.isMobile ? (
            <div id="weekModalGrid">
              {data.articles.map((a, i) => {
                const t = a._table;
                return (
                  <div
                    className="week-modal-item"
                    key={t.id + "|" + (a.path || a.values.week_slug || i)}
                    onClick={() => (location.href = articleUrl(a))}
                  >
                    <div className="week-modal-item-text">
                      <span className={`week-modal-item-chip ${t.cls}`}>{t.label}</span>
                      <p className="week-modal-item-title">{a.values.main_title || ""}</p>
                      <p className="week-modal-item-date">{thaiDate(a.values.page_date)}</p>
                    </div>
                    <img className="week-modal-item-img" src={imgUrl(a)} alt="" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div id="weekModalGrid" className="row g-3">
              {data.articles.map((a, i) => (
                <div className="col-6 col-lg-3" key={a._table.id + "|" + (a.path || a.values.week_slug || i)}>
                  <ArticleCard a={a} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const [loaded, setLoaded] = useState(false);
  const [allArticlesData, setAllArticlesData] = useState<Article[]>([]);
  const [weeks, setWeeks] = useState<WeekGroup[]>([]);
  const [activeFilter, setActiveFilter] = useState("");
  const [modal, setModal] = useState<ModalData | null>(null);

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeMeetingModal();
        setModal(null);
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

  useEffect(() => {
    Promise.all(
      ALL_TABLES.map((t) =>
        sbFetch(t.id, "select=*&order=page_date.desc&limit=50").then((rows) =>
          (rows || []).map((row) => ({ values: row, path: row.path, _table: t }) as Article)
        )
      )
    )
      .then((results) => {
        let all = ([] as Article[]).concat(...results);
        setLoaded(true);
        if (!all.length) return;

        const seenPerType: Record<string, boolean> = {};
        all = all.filter((a) => {
          const t = a._table;
          const key = t.id + "|" + (SPLIT_TABLE_IDS[t.id] ? a.path || "" : a.values.week_slug || a.path || "");
          if (seenPerType[key]) return false;
          seenPerType[key] = true;
          return true;
        });

        setAllArticlesData(all);
        setWeeks(buildWeekGroups(all));
      })
      .catch(() => setLoaded(true));
  }, []);

  const filteredGroups = useMemo(() => {
    if (!activeFilter) return [];
    const matching = allArticlesData
      .filter((a) => a._table.type === activeFilter)
      .sort((a, b) => (b.values.page_date || "").localeCompare(a.values.page_date || ""));
    return buildWeekGroups(matching);
  }, [allArticlesData, activeFilter]);

  function onFilterClick(key: string) {
    setActiveFilter((prev) => (key === "" || key === prev ? "" : key));
  }

  function openWeekModal(w: WeekGroup) {
    setModal({ label: w.label, articles: w.articles, isMobile: window.innerWidth < 768 });
  }

  const showEmpty = loaded && (activeFilter ? filteredGroups.length === 0 : weeks.length === 0);

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

      {/* HERO */}
      <section className="hero" style={{ backgroundImage: "url('/images/theme/privilegesbanner.png')" }}>
        <div className="hero-overlay"></div>
        <div className="hero-inner hero-content" style={{ width: "100%" }}>
          <div className="container">
            <div style={{ textAlign: "center", width: "100%" }}>
              <h1 className="hero-title">Insights</h1>
              <p className="hero-subtitle">บทวิเคราะห์และมุมมองการลงทุนจากผู้เชี่ยวชาญ Yuanta Wealth Management</p>
            </div>
          </div>
        </div>
      </section>

      {/* FILTER BAR */}
      <div className="insights-filter-bar">
        <div className="container">
          <div className="filter-bar-inner">
            <div className="filter-pills" id="filterPills">
              {FILTERS.map((f) => (
                <button
                  key={f.key || "all"}
                  className={`filter-pill${(f.key === "" && activeFilter === "") || f.key === activeFilter ? " active" : ""}`}
                  onClick={() => onFilterClick(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <section className="insights-content">
        <div className="container" id="insightsContainer">
          {!loaded && (
            <div id="insightsLoading" style={{ textAlign: "center", padding: "60px 0", color: "#8f9aac", fontFamily: "'Noto Sans Thai',sans-serif", fontSize: 15 }}>
              กำลังโหลดบทวิเคราะห์...
            </div>
          )}

          {loaded && !activeFilter &&
            weeks.map((w, i) =>
              i === 0 ? (
                <HeroWeekSection key={w.slug} w={w} onSeeAll={() => openWeekModal(w)} />
              ) : (
                <CarouselWeekSection key={w.slug} w={w} onSeeAll={() => openWeekModal(w)} />
              )
            )}

          {loaded && activeFilter && <FilterGrid groups={filteredGroups} />}

          <div id="insightsEmpty" className="insights-empty" style={{ display: showEmpty ? "" : "none" }}>
            ไม่พบบทความที่ตรงกับเงื่อนไขที่เลือก
          </div>
        </div>
      </section>

      {modal && <WeekModal data={modal} onClose={() => setModal(null)} />}

      {/* NEWSLETTER */}
      <section className="newsletter-section">
        <div className="container">
          <div className="row align-items-center gy-5">
            <div className="col-12">
              <div className="newsletter-left">
                <p className="newsletter-label">Exclusive Insights</p>
                <h2 className="newsletter-title">
                  Unlock Insights &amp;
                  <br />
                  Market Intelligence
                </h2>
                <p className="newsletter-desc">
                  รับข้อมูลเชิงลึกด้านการลงทุน บทวิเคราะห์ตลาด และโอกาสการลงทุนพิเศษ
                  <br />
                  ส่งตรงถึงอีเมลของคุณทุกสัปดาห์
                </p>
              </div>
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

const CSS = `
    /* ── Filter bar ── */
    .insights-filter-bar {
      background: #fff;
      padding: 40px 0;
      position: sticky;
      top: 60px;
      z-index: 100;
    }
    .filter-bar-inner {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .filter-pills {
      display: flex;
      gap: 8px;
      flex-wrap: nowrap;
      overflow-x: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      flex: 1;
    }
    .filter-pills::-webkit-scrollbar { display: none; }
    .filter-pill {
      font-family: 'Cormorant Garamond', 'Noto Sans Thai', Georgia, serif;
      font-size: 15px;
      font-weight: 500;
      color: #3d506e;
      background: #f0f0f0;
      border: 1.5px solid transparent;
      padding: 5px 14px;
      white-space: nowrap;
      cursor: pointer;
      transition: all .18s;
      flex-shrink: 0;
    }
    .filter-pill:hover { background: #e5e0d8; color: #0c244a; }
    .filter-pill.active {
      background: #0c244a;
      color: #fff;
      border-color: #0c244a;
    }
    .filter-pills { flex-wrap: nowrap; }

    /* ── Content area ── */
    .insights-content {
      background: #ffffff;
      padding: 40px 0 80px;
    }

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
    .tag-asset-outlook { background: #F2F0EE; color: #3d2c1e; border: 1px solid #D6D1CB; }
    .tag-mkt-outlook   { background: #F0EFF5; color: #3d2260; border: 1px solid #D1CCDF; }

    .insight-date {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 12px;
      color: #3D506E;
    }

    /* ── Week section ── */
    .week-section { margin-bottom: 48px; }
    .week-section-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }
    .week-section-left { order: 1; }
    .week-section-header::after {
      content: '';
      flex: 1;
      height: 1px;
      background: rgba(0,0,0,.12);
      order: 2;
    }
    .week-see-all { order: 3; }
    .week-section-left { display: flex; align-items: center; gap: 12px; }
    .week-chip {
      font-family: 'Cormorant Garamond', serif;
      font-size: 13px;
      font-weight: 600;
      background: #3D506E;
      color: #fff;
      padding: 3px 10px;
      white-space: nowrap;
    }
    .week-chip-monthly {
      background: #0C244A;
    }
    .week-label {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 20px;
      font-weight: 700;
      color: #0c244a;
    }
    .week-see-all {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 16px;
      color: #a2603c;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: gap .15s;
      flex-shrink: 0;
    }
    .week-see-all:hover { gap: 7px; color: #a2603c; }

    /* ── Featured + list layout (first week) ── */
    .week-featured-layout {
      display: grid;
      grid-template-columns: 3fr 2fr;
      gap: 0;
    }
    .featured-card {
      position: relative;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      border-right: 1px solid rgba(0,0,0,.07);
      box-shadow: 0 0 1px rgba(102,102,102,.14), 0 2px 8px rgba(102,102,102,.08);
    }
    .featured-card-img-wrap {
      position: relative;
      overflow: hidden;
    }
    .featured-card-img-wrap img {
      width: 100%;
      height: 320px;
      object-fit: cover;
      display: block;
    }
    .featured-card-tag {
      position: absolute;
      top: 12px;
      left: 12px;
    }
    .featured-card-content {
      padding: 24px 28px 28px;
      background: #fff;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .featured-card-date {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 12px;
      color: #3D506E;
      margin-bottom: 10px;
    }
    .featured-card-title {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: #0c244a;
      line-height: 1.45;
      margin-bottom: 10px;
    }
    .featured-card-excerpt {
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
    .featured-card-content .read-more {
      padding-top: 16px;
      border-top: 1px solid rgba(0,0,0,.1);
      width: 100%;
      justify-content: flex-end;
    }

    /* ── Article list (right side) ── */
    .article-list {
      display: flex;
      flex-direction: column;
      margin-left: 18px;
    }
    .article-list-item {
      display: flex;
      align-items: stretch;
      gap: 0;
      padding: 18px 20px;
      border-bottom: 1px solid rgba(0,0,0,.07);
      cursor: pointer;
      transition: background .15s;
      flex: 1;
    }
    .article-list-item:last-of-type { border-bottom: none; }
    .article-list-item:nth-last-child(2) { border-bottom: none; }
    .article-list-item:hover { background: #fafafa; }
    /* ── Hero article-list nav ── */
    .week-nav-row {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 8px;
      padding: 12px 20px 8px;
    }
    .week-nav-btn {
      width: 32px; height: 32px;
      border: 1.5px solid rgba(0,0,0,.18);
      background: #fff;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: background .15s;
      flex-shrink: 0;
      padding: 0;
    }
    .week-nav-btn::after {
      content: '';
      display: inline-block;
      width: 7px; height: 7px;
      border-top: 2px solid #0c244a;
      border-right: 2px solid #0c244a;
    }
    .week-nav-btn.wk-prev::after { transform: rotate(-135deg) translateX(-1px); }
    .week-nav-btn.wk-next::after { transform: rotate(45deg) translateX(-1px); }
    .week-nav-btn:hover:not(:disabled) { background: #f0f0f0; }
    .week-nav-btn:disabled { opacity: .3; cursor: default; }
    .article-list-text {
      flex: 1;
      min-width: 0;
      padding-right: 14px;
    }
    .article-list-date {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 11px;
      color: #3D506E;
      margin-bottom: 5px;
    }
    .article-list-title {
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
    }
    .article-list-thumb-wrap {
      position: relative;
      flex-shrink: 0;
      width: 180px;
      height: 120px;
    }
    .article-list-thumb-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .article-list-thumb-tag {
      position: absolute;
      top: 6px;
      left: 6px;
      font-family: 'Cormorant Garamond', serif;
      font-weight: 500;
      border: 1px solid rgba(0,0,0,.12);
      letter-spacing: .03em;
    }
    .article-list-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 12px 20px;
      gap: 8px;
    }
    .list-nav-btn {
      width: 32px;
      height: 32px;
      border: 1px solid rgba(0,0,0,.15);
      background: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background .15s;
      color: #3d506e;
    }
    .list-nav-btn:hover { background: #f0f0f0; }
    .list-nav-btn:disabled { opacity: .35; cursor: default; }

    /* ── Week carousel ── */
    .week-carousel {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0;
    }
    .week-carousel-track-wrap {
      flex: 1;
      overflow: hidden;
      min-width: 0;
      padding: 8px 0;
      margin: -8px 0;
    }
    .week-carousel-track {
      display: flex;
      gap: 16px;
      transition: transform .35s ease;
    }
    .week-carousel-track .col-card {
      flex: 0 0 calc(25% - 12px);
      min-width: 0;
    }
    .carousel-nav {
      width: 36px;
      height: 36px;
      border: 1.5px solid rgba(0,0,0,.2);
      background: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background .15s, opacity .15s;
      flex-shrink: 0;
      z-index: 1;
      padding: 0;
      overflow: visible;
    }
    .carousel-nav::after {
      content: '';
      display: inline-block;
      width: 8px;
      height: 8px;
      border-top: 2px solid #0c244a;
      border-right: 2px solid #0c244a;
      flex-shrink: 0;
    }
    .carousel-nav.prev::after { transform: rotate(-135deg) translateX(-1px); }
    .carousel-nav.next::after { transform: rotate(45deg) translateX(-1px); }
    .carousel-nav:hover { background: #f0f0f0; }
    .carousel-nav.prev { margin-right: 12px; }
    .carousel-nav.next { margin-left: 12px; }
    .carousel-nav:disabled { opacity: .3; cursor: default; }

    /* ── Featured article ── */
    .featured-article {
      background: #fff;
      margin-bottom: 16px;
      cursor: pointer;
      transition: box-shadow .2s;
      box-shadow: 0 0 1px rgba(102,102,102,.12), 0 2px 8px rgba(102,102,102,.08);
    }
    .featured-article:hover { box-shadow: 0 4px 24px rgba(0,0,0,.11); }
    .featured-article-img {
      width: 100%;
      height: 100%;
      min-height: 260px;
      object-fit: cover;
    }
    .featured-article-content {
      padding: 32px 36px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      height: 100%;
    }
    .featured-article-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }
    .featured-article-title {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 20px;
      font-weight: 700;
      color: #0c244a;
      line-height: 1.45;
      margin-bottom: 10px;
    }
    .featured-article-excerpt {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 14px;
      color: #3d506e;
      line-height: 1.65;
      margin-bottom: 18px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .read-more {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: #a2603c;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      text-decoration: none;
      transition: gap .15s;
    }
    .read-more:hover { gap: 9px; color: #a2603c; }

    /* ── Article card ── */
    .insight-card {
      background: #fff;
      display: flex;
      flex-direction: column;
      height: 100%;
      cursor: pointer;
      transition: box-shadow .2s, transform .18s;
      box-shadow: 0 0 1px rgba(102,102,102,.14), 0 2px 6px rgba(102,102,102,.08);
    }
    .insight-card:hover {
      box-shadow: 0 4px 18px rgba(0,0,0,.11);
      transform: translateY(-2px);
    }
    .insight-card-img-wrap {
      position: relative;
      flex-shrink: 0;
    }
    .insight-card-img {
      width: 100%;
      height: 160px;
      object-fit: cover;
      display: block;
    }
    .insight-card-img-tag {
      position: absolute;
      top: 8px;
      left: 8px;
    }
    .insight-card-content {
      padding: 14px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .insight-card-date {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 11px;
      color: #3D506E;
      margin-bottom: 6px;
    }
    .insight-card-title {
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
    .insight-card-excerpt {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 16px;
      color: #3d506e;
      line-height: 1.55;
      flex: 1;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* ── No results ── */
    .insights-empty {
      text-align: center;
      padding: 60px 0;
      color: #3D506E;
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 15px;
    }


    /* ── Week modal ── */
    .week-modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.55);
      z-index: 1050;
      overflow-y: auto;
      padding: 40px 0;
    }
    .week-modal-overlay.open { display: flex; align-items: flex-start; justify-content: center; }
    .week-modal {
      background: #fff;
      width: 100%;
      max-width: 1200px;
      margin: auto;
      border-radius: 4px;
      overflow: hidden;
    }
    .week-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 28px;
      border-bottom: 1px solid rgba(0,0,0,.08);
      position: sticky;
      top: 0;
      background: #fff;
      z-index: 1;
    }
    .week-modal-title {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 16px;
      font-weight: 700;
      color: #0c244a;
      margin: 0;
    }
    .week-modal-close {
      width: 32px;
      height: 32px;
      border: none;
      background: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #3d506e;
      border-radius: 50%;
      transition: background .15s;
      flex-shrink: 0;
    }
    .week-modal-close:hover { background: #f0f0f0; }
    .week-modal-body { padding: 24px 28px 32px; }
    @keyframes sheetUp {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
    .week-modal-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 24px;
      border-bottom: 1px solid rgba(0,0,0,.07);
      cursor: pointer;
    }
    .week-modal-item:last-child { border-bottom: none; }
    .week-modal-item:hover { background: #f9f9f9; }
    .week-modal-item-text { flex: 1; min-width: 0; }
    .week-modal-item-chip {
      display: inline-block;
      font-family: 'Cormorant Garamond', serif;
      font-size: 12px;
      font-weight: 600;
      padding: 2px 9px;
      white-space: nowrap;
      margin-bottom: 5px;
    }
    .week-modal-item-title {
      font-family: 'Noto Sans Thai', sans-serif;
      font-weight: 600;
      font-size: 14px;
      line-height: 1.45;
      color: #0c244a;
      margin: 0 0 4px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .week-modal-item-date {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 12px;
      color: #7a8ca0;
      margin: 0;
    }
    .week-modal-item-img {
      width: 72px;
      height: 56px;
      object-fit: cover;
      flex-shrink: 0;
    }

    /* ── Responsive ── */
    @media (max-width: 991px) {
      .featured-card-content { padding: 18px 20px 20px; }
      .featured-card-title { font-size: 16px; }
      .week-carousel-track .col-card { flex: 0 0 calc(50% - 8px); }
    }

    @media (max-width: 767px) {
      .insights-content { padding: 24px 0 60px; }
      .insights-filter-bar { padding: 16px 0; }

      .week-label { font-size: 16px; }
      .week-section { margin-bottom: 32px; }

      /* Featured layout: stack vertically on mobile */
      .week-featured-layout { grid-template-columns: 1fr; }
      .article-list { border-left: none; border-top: 1px solid rgba(0,0,0,.08); }
      .featured-card-img-wrap img { min-height: 200px; }

      /* Carousel: edge-to-edge native scroll */
      .carousel-nav { display: none; }
      .week-carousel-track-wrap {
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        padding: 8px 0;
        margin: -8px -40px -8px 0;
      }
      .week-carousel-track-wrap::-webkit-scrollbar { display: none; }
      .week-carousel-track {
        transform: none !important;
        gap: 12px;
      }
      .week-carousel-track .col-card {
        flex: 0 0 244px;
        max-width: calc(100vw - 56px);
        scroll-snap-align: start;
      }
      .week-carousel-track::after { content: ''; flex: 0 0 24px; }

      .insight-card-img { height: 130px; }
      .article-list-item { padding: 14px 16px; }
      .article-list-thumb-wrap { width: 80px; }

      /* Modal → bottom sheet on mobile */
      .week-modal-overlay { overflow-y: visible; padding: 0; }
      .week-modal-overlay.open { align-items: flex-end; }
      .week-modal {
        border-radius: 20px 20px 0 0;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: sheetUp .25s ease;
        max-width: 100%;
        margin: 0;
      }
      .week-modal-header { padding: 20px 24px 16px; border-bottom: none; position: static; }
      .week-modal-body { overflow-y: auto; flex: 1; padding: 0; }


    }

    @media (max-width: 576px) {
      .week-carousel-track-wrap { margin-right: -20px; }
    }

    /* Toggle desktop/mobile layouts */
    .d-lg-grid { display: grid; }
    .d-lg-none { display: flex !important; }
    @media (min-width: 992px) {
      .d-lg-grid { display: grid !important; }
      .d-lg-none { display: none !important; }
    }
`;

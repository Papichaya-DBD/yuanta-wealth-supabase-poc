"use client";

// Special Insight list: every published special_insight row as cards (same card
// as the Insights page), newest first, 40 per page with ?page=N pagination.

import { useEffect, useState } from "react";
import { assetTypeLabel, SPECIAL_INSIGHT_THUMB } from "./asset-types";

const SUPABASE_URL = "https://kqgdvpqygepvaifzrxki.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_6khmxt87r-YGlSxyF9d9XA_G0NNDTbp";
const PER_PAGE = 40;
const FALLBACK_IMG = "/images/theme/comingsoon.png";
const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

type Row = Record<string, any>;

function thaiDate(s?: string) {
  if (!s) return "";
  const d = new Date(s + "T00:00:00Z");
  return d.getUTCDate() + " " + THAI_MONTHS[d.getUTCMonth()] + " " + (d.getUTCFullYear() + 543);
}
function stripHtml(html?: string) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  return tmp.textContent || "";
}
function readPage() {
  const n = parseInt(new URLSearchParams(window.location.search).get("page") || "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
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

const CSS = `
  .special-content { background: #fff; padding: 60px 0; }
  .insight-tag { font-family: 'Cormorant Garamond', serif; font-size: 12px; font-weight: 600; padding: 2px 9px; white-space: nowrap; display: inline-block; }
  .tag-special { background: #F2F0EE; color: #3d2c1e; border: 1px solid #D6D1CB; }
  .insight-card { background: #fff; display: flex; flex-direction: column; height: 100%; cursor: pointer; transition: box-shadow .2s, transform .18s; box-shadow: 0 0 1px rgba(102,102,102,.14), 0 2px 6px rgba(102,102,102,.08); }
  .insight-card:hover { box-shadow: 0 4px 18px rgba(0,0,0,.11); transform: translateY(-2px); }
  .insight-card-img-wrap { position: relative; flex-shrink: 0; }
  .insight-card-img { width: 100%; height: 160px; object-fit: cover; display: block; }
  .insight-card-img-tag { position: absolute; top: 8px; left: 8px; }
  .insight-card-content { padding: 14px; display: flex; flex-direction: column; flex: 1; }
  .insight-card-date { font-family: 'Noto Sans Thai', sans-serif; font-size: 11px; color: #3D506E; margin-bottom: 6px; }
  .insight-card-title { font-family: 'Noto Sans Thai', sans-serif; font-size: 16px; font-weight: 700; color: #0c244a; line-height: 1.45; margin-bottom: 7px; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .insight-card-excerpt { font-family: 'Noto Sans Thai', sans-serif; font-size: 16px; color: #3d506e; line-height: 1.55; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .special-status { text-align: center; padding: 60px 0; color: #3D506E; font-family: 'Noto Sans Thai', sans-serif; font-size: 15px; }
  .special-pagination { display: flex; justify-content: center; align-items: center; gap: 6px; margin-top: 40px; flex-wrap: wrap; }
  .special-page-btn { min-width: 36px; height: 36px; padding: 0 10px; border: 1px solid rgba(0,0,0,.15); background: #fff; color: #0c244a; font-family: 'Noto Sans Thai', sans-serif; font-size: 14px; cursor: pointer; }
  .special-page-btn:hover:not(:disabled) { background: #f5f5f5; }
  .special-page-btn.active { background: #0c244a; border-color: #0c244a; color: #fff; }
  .special-page-btn:disabled { opacity: .35; cursor: default; }
  @media (max-width: 767px) {
    .special-content { padding: 40px 0; }
    .insight-card-img { height: 130px; }
  }
`;

function SpecialCard({ row }: { row: Row }) {
  const url = "/wealth-special-insight/" + encodeURIComponent(row.path || "");
  // Fixed thumbnail like every Insights card; cover_image is a report page scan, not a thumbnail.
  const img = SPECIAL_INSIGHT_THUMB;
  return (
    <div className="insight-card" onClick={() => (location.href = url)}>
      <div className="insight-card-img-wrap">
        <img
          className="insight-card-img"
          src={img}
          alt=""
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).onerror = null;
            e.currentTarget.src = FALLBACK_IMG;
          }}
        />
        <span className="insight-card-img-tag insight-tag tag-special">{assetTypeLabel(row.asset_type)}</span>
      </div>
      <div className="insight-card-content">
        <p className="insight-card-date">{thaiDate(row.page_date)}</p>
        <h4 className="insight-card-title">{row.main_title || ""}</h4>
        <p className="insight-card-excerpt">{row.description || stripHtml(row.ai_summary)}</p>
      </div>
    </div>
  );
}

export default function SpecialInsightList() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [page, setPage] = useState(1);

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
    setPage(readPage());
    const onPop = () => setPage(readPage());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    fetch(
      `${SUPABASE_URL}/rest/v1/special_insight?select=path,asset_type,main_title,description,ai_summary,page_date&is_published=eq.true&order=page_date.desc,id.desc`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    )
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]));
  }, []);

  const total = rows ? rows.length : 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const cur = Math.min(page, pages);
  const visible = rows ? rows.slice((cur - 1) * PER_PAGE, cur * PER_PAGE) : [];

  function goTo(p: number) {
    const url = p > 1 ? `?page=${p}` : window.location.pathname;
    window.history.pushState(null, "", url);
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
                <a href="/wealth-special-insight" data-nav-match="/wealth-special-insight">Special Insights</a>
                <a href="/wealth-contactus" data-nav-match="/wealth-contact">Contact us</a>
              </nav>
              <a href="#" className="btn-book-meeting" onClick={(e) => { e.preventDefault(); openMeetingModal(); }}>Book a meeting</a>
            </div>
          </div>
        </div>
      </nav>

      <section className="hero" style={{ backgroundImage: "url('/images/theme/privilegesbanner.png')" }}>
        <div className="hero-overlay"></div>
        <div className="hero-inner hero-content" style={{ width: "100%" }}>
          <div className="container">
            <div style={{ textAlign: "center", width: "100%" }}>
              <h1 className="hero-title">Special Insights</h1>
              <p className="hero-subtitle">บทวิเคราะห์เชิงลึกเฉพาะเรื่องจากผู้เชี่ยวชาญ Yuanta Wealth Management</p>
            </div>
          </div>
        </div>
      </section>

      <section className="special-content">
        <div className="container">
          {rows === null && <div className="special-status">กำลังโหลดบทวิเคราะห์...</div>}
          {rows !== null && !rows.length && <div className="special-status">ยังไม่มีบทความ</div>}
          {visible.length > 0 && (
            <div className="row g-3">
              {visible.map((row) => (
                <div className="col-12 col-md-4 col-lg-3" key={row.path}>
                  <SpecialCard row={row} />
                </div>
              ))}
            </div>
          )}
          {pages > 1 && (
            <nav className="special-pagination" aria-label="Special Insights pages">
              <button className="special-page-btn" disabled={cur === 1} onClick={() => goTo(cur - 1)} aria-label="ก่อนหน้า">&lsaquo;</button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button key={p} className={"special-page-btn" + (p === cur ? " active" : "")} onClick={() => goTo(p)}>
                  {p}
                </button>
              ))}
              <button className="special-page-btn" disabled={cur === pages} onClick={() => goTo(cur + 1)} aria-label="ถัดไป">&rsaquo;</button>
            </nav>
          )}
        </div>
      </section>

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
                  <li><a href="/wealth-whyus">Why us</a></li>
                  <li><a href="/wealth-insights">Insights</a></li>
                  <li><a href="/wealth-special-insight">Special Insights</a></li>
                </ul>
                <ul className="footer-nav-links">
                  <li><a href="/wealth-privilegesandevents">Privileges &amp; Events</a></li>
                  <li><a href="/wealth-contactus">Contact Us</a></li>
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

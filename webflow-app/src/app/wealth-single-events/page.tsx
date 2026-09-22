"use client";

// PoC: port of yuanta-wealth-supabase-poc/single-event.html onto Webflow Cloud.
// Reads `?slug=` from the URL client-side (matches production's HubL query-param
// pattern) and fetches the row from Supabase's `events` table. Initial render
// (both SSR and pre-hydration client) matches the "not found" state, so no
// hydration mismatch — the fetch result only ever arrives post-mount.

import { useEffect, useState } from "react";

const SUPABASE_URL = "https://kqgdvpqygepvaifzrxki.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_6khmxt87r-YGlSxyF9d9XA_G0NNDTbp";
const EVENTS_FALLBACK_IMG = "/images/theme/comingsoon.png";
const THAI_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const THAI_MONTHS_ABBR = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function sbFetch(query: string): Promise<any[]> {
  return fetch(`${SUPABASE_URL}/rest/v1/events?${query}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  })
    .then((r) => r.json() as Promise<any[]>)
    .catch(() => []);
}

function fullDate(s?: string) {
  if (!s) return "";
  const d = new Date(s + "T00:00:00Z");
  return d.getUTCDate() + " " + THAI_MONTHS[d.getUTCMonth()] + " " + (d.getUTCFullYear() + 543);
}
function shortDate(s?: string) {
  if (!s) return "";
  const d = new Date(s + "T00:00:00Z");
  return d.getUTCDate() + " " + THAI_MONTHS_ABBR[d.getUTCMonth()] + " " + (d.getUTCFullYear() + 543);
}

function relatedCardHtml(ev: Record<string, any>) {
  const img = ev.image && ev.image.url ? ev.image.url : EVENTS_FALLBACK_IMG;
  const timeHtml = ev.event_time ? `<span class="event-date-sep"></span><span class="event-time">${ev.event_time}</span>` : "";
  const locHtml = ev.location
    ? `<p class="event-location"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 14s5-4.686 5-8a5 5 0 10-10 0c0 3.314 5 8 5 8z" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="6" r="1.5" stroke="currentColor" stroke-width="1.5"/></svg><span>${ev.location}</span></p>`
    : "";
  return (
    '<div class="col-12 col-sm-6 col-lg-3">' +
    `<a href="/wealth-single-events?slug=${encodeURIComponent(ev.slug || "")}" style="text-decoration:none;color:inherit;display:block;">` +
    '<div class="event-card">' +
    `<img class="event-img" src="${img}" alt="${ev.title || ""}" />` +
    '<div class="event-card-content">' +
    `<h3 class="event-title">${ev.title || ""}</h3>` +
    '<div class="event-meta">' +
    '<p class="event-datetime">' +
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 1v4M11 1v4M2 7h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
    `<span class="event-date-text">${shortDate(ev.event_date)}</span>${timeHtml}` +
    "</p>" +
    locHtml +
    "</div></div></div></a></div>"
  );
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
function shareByEmail(title: string) {
  location.href = "mailto:?subject=" + encodeURIComponent(title) + "&body=" + encodeURIComponent(location.href);
}

export default function SingleEventPage() {
  const [event, setEvent] = useState<Record<string, any> | null>(null);
  const [relatedHtml, setRelatedHtml] = useState("");
  const [notFound, setNotFound] = useState(false);

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

  useEffect(() => {
    const slug = new URLSearchParams(location.search).get("slug") || "";
    sbFetch(`select=*&slug=eq.${encodeURIComponent(slug)}&limit=1`).then((rows) => {
      if (rows && rows.length) {
        setEvent(rows[0]);
        sbFetch(`select=*&is_published=eq.true&slug=neq.${encodeURIComponent(rows[0].slug || "")}&order=event_date.asc&limit=4`).then((related) => {
          if (related && related.length) setRelatedHtml(related.map(relatedCardHtml).join(""));
        });
      } else {
        setNotFound(true);
      }
    });
  }, []);

  return (
    <>
      {/* [POC] Global header/nav */}
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

      {event && (
        <div id="eventFound">
          <div className="breadcrumb-bar">
            <div className="container">
              <ol className="breadcrumb">
                <li className="breadcrumb-item"><a href="/privileges-events">Privileges &amp; events</a></li>
                <li className="breadcrumb-item active" id="f-title-crumb">{event.title || ""}</li>
              </ol>
            </div>
          </div>

          <section className="event-hero">
            <div className="container">
              <div className="row align-items-center g-4">
                <div className="col-12 col-lg-6">
                  {event.image && event.image.url && (
                    <img src={event.image.url} alt={event.title || ""} className="event-hero-img" id="f-hero-img" />
                  )}
                </div>
                <div className="col-12 col-lg-6">
                  <h1 className="event-hero-title" id="f-title">{event.title || ""}</h1>
                  <div className="event-hero-meta">
                    {event.event_date && (
                      <div className="event-hero-meta-item" id="f-date-row">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="13" rx="2" stroke="#3d506e" strokeWidth="1.5"/><path d="M6 2v4M14 2v4M3 8h14" stroke="#3d506e" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        <span id="f-date-text">{fullDate(event.event_date) + (event.event_time ? " | " + event.event_time : "")}</span>
                      </div>
                    )}
                    {event.location && (
                      <div className="event-hero-meta-item" id="f-location-row">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 18s6-5.686 6-10a6 6 0 10-12 0c0 4.314 6 10 6 10z" stroke="#3d506e" strokeWidth="1.5"/><circle cx="10" cy="8" r="2" stroke="#3d506e" strokeWidth="1.5"/></svg>
                        <span id="f-location-text">{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="event-content-section">
            <div className="container">
              <div className="event-share-bar">
                <span className="event-share-label">แชร์</span>
                <button className="share-btn" onClick={shareToFacebook} title="Facebook">
                  <svg viewBox="0 0 20 20" fill="none"><path d="M11 10.5h2l.5-2.5H11V6.5c0-.7.35-1.5 1.5-1.5H13.5V2.5A13 13 0 0011.5 2.5C9.14 2.5 8 3.9 8 6v2H5.5v2.5H8V18h3v-7.5z" fill="#1877F2"/></svg>
                </button>
                <button className="share-btn" onClick={shareToX} title="X">
                  <svg viewBox="0 0 20 20" fill="none"><path d="M15.5 3h-2.1l-3.4 4.3L6.4 3H2l5.7 7.3L2.1 17H4.2l3.7-4.6 3.7 4.6H16l-6-7.7L15.5 3z" fill="#000"/></svg>
                </button>
                <button className="share-btn" onClick={copyLink} title="คัดลอกลิงก์">
                  <svg viewBox="0 0 20 20" fill="none"><path d="M8.5 11.5a4 4 0 005.66 0l2-2a4 4 0 00-5.66-5.66l-1 1" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/><path d="M11.5 8.5a4 4 0 00-5.66 0l-2 2a4 4 0 005.66 5.66l1-1" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
                <button className="share-btn" onClick={() => shareByEmail(event.title || "")} title="อีเมล">
                  <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2" stroke="#555" strokeWidth="1.5"/><path d="M2 7l8 5 8-5" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>

              <div className="event-body" id="f-body" dangerouslySetInnerHTML={{ __html: event.body || "" }} />
            </div>
          </section>

          {relatedHtml && (
            <section className="related-events-section" id="relatedSection">
              <div className="container">
                <div className="related-events-header">
                  <h2 className="related-events-title">กิจกรรมอื่นๆ</h2>
                  <a href="/privileges-events" className="related-see-all">
                    ดูทั้งหมด
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#a2603c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </a>
                </div>
                <div className="row g-4" id="relatedGrid" dangerouslySetInnerHTML={{ __html: relatedHtml }} />
              </div>
            </section>
          )}
        </div>
      )}

      {notFound && (
        <section id="eventNotFound" style={{ padding: "80px 0", textAlign: "center" }}>
          <div className="container">
            <p style={{ color: "#3d506e", fontSize: 16 }}>ไม่พบกิจกรรมที่ระบุ</p>
            <a href="/privileges-events" style={{ color: "#a2603c" }}>← กลับไปหน้ากิจกรรม</a>
          </div>
        </section>
      )}

      {/* [POC] Global footer */}
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

      {/* [POC] Setmore booking modal */}
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

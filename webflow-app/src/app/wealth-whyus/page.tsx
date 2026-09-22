"use client";

// PoC: port of yuanta-wealth-supabase-poc/why-us.html onto Webflow Cloud.
// No page-specific <style> block in the source (styling comes entirely from
// the shared template_main.min.css, already global via layout.tsx).

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

const AWARDS_FALLBACK_IMG = "/images/theme/comingsoon.png";

function awardItemHtml(v: Record<string, any>) {
  const thumb = v.thumbnail && v.thumbnail.url ? v.thumbnail.url : AWARDS_FALLBACK_IMG;
  return (
    '<div class="award-item-new">' +
    `<img class="award-thumb" src="${thumb}" alt="" />` +
    '<div class="award-content">' +
    `<span class="award-date-label">${v.date_label || ""}</span>` +
    `<h3 class="award-title-new">${v.title || ""}</h3>` +
    `<p class="award-desc-text">${v.description || ""}</p>` +
    "</div></div>"
  );
}

export default function WhyUsPage() {
  const [awardsHtml, setAwardsHtml] = useState<string | null>(null);

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
    sbFetch("awards", "select=*&order=order.asc").then((rows) => {
      setAwardsHtml((rows || []).map(awardItemHtml).join(""));
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

      {/* HERO */}
      <section className="hero" style={{ backgroundImage: "url('/images/theme/expertbanner.png')" }}>
        <div className="hero-overlay"></div>
        <div className="hero-inner hero-content" style={{ width: "100%" }}>
          <div className="container">
            <div style={{ textAlign: "center", width: "100%" }}>
              <h1 className="hero-title">Why us</h1>
              <p className="hero-subtitle">เหตุผลที่นักลงทุนระดับ High-Net-Worth ไว้วางใจ Yuanta Wealth</p>
            </div>
          </div>
        </div>
      </section>

      {/* DESCRIPTION */}
      <section className="whyus-desc-section">
        <div className="container">
          <div className="whyus-desc-center">
            <p className="whyus-desc-text">Yuanta Wealth Management ให้บริการที่ปรึกษาการลงทุนส่วนตัว ด้วยทีมผู้เชี่ยวชาญที่มีประสบการณ์ระดับนานาชาติ เราออกแบบพอร์ตการลงทุนที่ปรับแต่งเฉพาะบุคคล สอดคล้องกับเป้าหมายทางการเงิน ระดับความเสี่ยงที่ยอมรับได้ และแผนการส่งต่อความมั่งคั่งสู่คนรุ่นถัดไป</p>
            <p className="whyus-desc-text" style={{ marginTop: 16 }}>ด้วยความเชี่ยวชาญในตลาดทุนไทยและสากลกว่า 25 ปี เรามุ่งมั่นสร้างผลตอบแทนที่มั่นคงและยั่งยืน พร้อมดูแลความมั่งคั่งของคุณในทุกมิติ ตั้งแต่การลงทุน การวางแผนภาษี ไปจนถึงการส่งต่อมรดกสู่รุ่นถัดไป</p>
          </div>
        </div>
      </section>

      {/* EXPERTS */}
      <section className="experts-section">
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div className="section-header experts-section-header" style={{ justifyContent: "center", textAlign: "center", marginBottom: 48 }}>
            <div className="section-header-left" style={{ alignItems: "center" }}>
              <h2 className="section-title" style={{ textAlign: "center" }}>Expert</h2>
            </div>
          </div>
          <div className="row g-4 justify-content-center" id="expertsGrid">
            <div className="col-12 col-sm-6 col-lg-3">
              <div className="expert-card">
                <div className="expert-photo-wrap">
                  <img className="expert-photo" src="/images/theme/expert-d6c3628f8f.jpg" alt="Expert" />
                </div>
                <div className="expert-card-body">
                  <p className="expert-name">Danai Aroonkittichai</p>
                  <p className="expert-role">CFA</p>
                  <div className="expert-divider-strip"></div>
                  <p className="expert-title-th">Chief Retail Business Office at Yuanta Securities</p>
                </div>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <div className="expert-card">
                <div className="expert-photo-wrap">
                  <img className="expert-photo" src="/images/theme/expert-99d9ed77ce.jpg" alt="Expert" />
                </div>
                <div className="expert-card-body">
                  <p className="expert-name">Visakorn Kirivan</p>
                  <p className="expert-role">CFA, PhD</p>
                  <div className="expert-divider-strip"></div>
                  <p className="expert-title-th">Senior Investment Strategist , Fundamental Investment Analyst</p>
                </div>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <div className="expert-card">
                <div className="expert-photo-wrap">
                  <img className="expert-photo" src="/images/theme/expert-f80e3df909.jpg" alt="Expert" />
                </div>
                <div className="expert-card-body">
                  <p className="expert-name">Natakit Karnkriangkrai</p>
                  <p className="expert-role"></p>
                  <div className="expert-divider-strip"></div>
                  <p className="expert-title-th">Investment Strategist with a passion for global investing and portfolio solutions.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="experts-pagination" id="expertsPagination"></div>
        </div>
      </section>

      {/* AWARDS */}
      <section className="awards-section">
        <div className="container">
          <div className="section-header" style={{ justifyContent: "center", alignItems: "center", textAlign: "center", marginBottom: 48 }}>
            <div className="section-header-left" style={{ alignItems: "center" }}>
              <h2 className="section-title" style={{ textAlign: "center" }}>Awards</h2>
            </div>
          </div>
          <div className="awards-list" id="awards-list" dangerouslySetInnerHTML={{ __html: awardsHtml || "" }} />
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="newsletter-section">
        <div className="container">
          <div className="row align-items-center gy-5">
            <div className="col-12">
              <div className="newsletter-left">
                <p className="newsletter-label">Exclusive Insights</p>
                <h2 className="newsletter-title">Unlock Insights &amp;<br />Market Intelligence</h2>
                <p className="newsletter-desc">รับข้อมูลเชิงลึกด้านการลงทุน บทวิเคราะห์ตลาด และโอกาสการลงทุนพิเศษ<br />ส่งตรงถึงอีเมลของคุณทุกสัปดาห์</p>
              </div>
            </div>
          </div>
        </div>
      </section>

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

"use client";

// PoC: port of yuanta-wealth-supabase-poc/contact-us.html onto Webflow Cloud.
// No HubDB/HubL data dependency in the source — every section is static
// markup. The multi-step form (form -> consent -> success) and the custom
// select are pure post-mount client interactions (no SSR/hydration race, since
// nothing here depends on async data racing against the initial render), so
// they're implemented as ordinary React state instead of a raw injected script.

import { useEffect, useRef, useState } from "react";

const SUPABASE_URL = "https://kqgdvpqygepvaifzrxki.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_6khmxt87r-YGlSxyF9d9XA_G0NNDTbp";

const INVESTMENT_OPTIONS = [
  "ไม่เกิน 5 ล้านบาท",
  "5 – 30 ล้านบาท",
  "30 - 50 ล้านบาท",
  "100 - 500 ล้านบาท",
  "500 ล้านบาทขึ้นไป",
];

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
.custom-select {
  position: relative;
  user-select: none;
}
.custom-select__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: 0;
  padding: 12px 16px;
  font-size: 16px;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: border-color 0.2s;
}
.custom-select.has-value .custom-select__trigger {
  color: var(--color-text-primary);
}
.custom-select.open .custom-select__trigger {
  border-color: var(--color-brand);
}
.custom-select__trigger svg {
  flex-shrink: 0;
  transition: transform 0.2s;
  color: var(--color-text-muted);
}
.custom-select.open .custom-select__trigger svg {
  transform: rotate(180deg);
}
.custom-select__options {
  display: none;
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  right: 0;
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: 0;
  z-index: 100;
  overflow: hidden;
}
.custom-select.open .custom-select__options {
  display: block;
}
.custom-select__option {
  padding: 12px 16px;
  font-size: 15px;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background 0.15s;
}
.custom-select__option:hover {
  background: #F6F3EF;
}
.custom-select__option.selected {
  color: var(--color-brand);
  font-weight: 500;
}
`;

type Step = "form" | "consent" | "success";

export default function ContactUsPage() {
  const [step, setStep] = useState<Step>("form");
  const [selectOpen, setSelectOpen] = useState(false);
  const [investment, setInvestment] = useState<string | null>(null);
  const [consentComm, setConsentComm] = useState(false);
  const [consentData, setConsentData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const pendingFields = useRef<Record<string, string>>({});
  const selectRef = useRef<HTMLDivElement>(null);

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

  // Close the custom select when clicking outside it
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) setSelectOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;
    const fields: Record<string, string> = {};
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[name]").forEach((el) => {
      if (el.value.trim() !== "") fields[el.name] = el.value.trim();
    });
    pendingFields.current = fields;
    setStep("consent");
  }

  function handleBack() {
    setStep("form");
    setFormError("");
  }

  function handleConfirm() {
    if (!consentComm || !consentData) {
      setFormError("กรุณายอมรับเงื่อนไขทั้งหมดก่อนส่งข้อมูล");
      return;
    }
    setFormError("");
    setSubmitting(true);
    const f = pendingFields.current;
    // [POC] production POSTs to the live HubSpot portal — this writes to
    // Supabase's `contact_submissions` table instead (insert-only via RLS).
    fetch(`${SUPABASE_URL}/rest/v1/contact_submissions`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        firstname: f.firstname || null,
        lastname: f.lastname || null,
        phone: f.phone || null,
        email: f.email || null,
        investment_amount: f.investment_amount || null,
        message: f.message || null,
        consent_communication: consentComm,
        consent_data: consentData,
      }),
    })
      .then((r) => {
        setSubmitting(false);
        if (r.ok) {
          setStep("success");
        } else {
          setFormError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        }
      })
      .catch(() => {
        setSubmitting(false);
        setFormError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      });
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

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
      <section className="hero" style={{ backgroundImage: "url('/images/theme/contactbanner.png')" }}>
        <div className="hero-overlay"></div>
        <div className="hero-inner hero-content" style={{ width: "100%" }}>
          <div className="container">
            <div style={{ textAlign: "center", width: "100%" }}>
              <h1 className="hero-title">Contact Us</h1>
              <p className="hero-subtitle">พูดคุยกับทีมที่ปรึกษาของเรา เพื่อเริ่มต้นเส้นทางสู่ความมั่งคั่งที่ยั่งยืน</p>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT MAIN */}
      <section className="contact-main-section">
        <div className="container">
          <div className="row gy-5 align-items-start">

            <div className="col-12 col-lg-6">
              <div className="contact-info-list">

                <div className="contact-info-item">
                  <div className="contact-info-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>
                    </svg>
                  </div>
                  <div className="contact-info-text">
                    <span className="contact-info-label">Online service</span>
                    <span className="contact-info-value"><a href="tel:020098000">0-2009-8000</a></span>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-info-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z"/>
                    </svg>
                  </div>
                  <div className="contact-info-text">
                    <span className="contact-info-label">Fax</span>
                    <span className="contact-info-value">02-009-8089</span>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-info-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
                    </svg>
                  </div>
                  <div className="contact-info-text">
                    <span className="contact-info-label">Email</span>
                    <span className="contact-info-value"><a href="mailto:online@yuanta.co.th">online@yuanta.co.th</a></span>
                  </div>
                </div>

                <div className="contact-info-item" style={{ alignItems: "flex-start" }}>
                  <div className="contact-info-icon" style={{ marginTop: 2 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
                    </svg>
                  </div>
                  <div className="contact-info-text">
                    <span className="contact-info-value">หยวนต้า (สำนักงานใหญ่)</span>
                    <span className="contact-info-address" style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--color-text-muted)", display: "block", marginTop: 4, lineHeight: 1.6 }}>127 อาคารเกษร ทาวเวอร์ ชั้น 14-16 ถนนราชดำริ แขวงลุมพินี เขตปทุมวัน กรุงเทพฯ 10330</span>
                  </div>
                </div>

              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="contact-form-card">
                <h2 className="contact-form-card__title"><span style={{ fontFamily: "var(--font-sans)", fontWeight: 500 }}>สมัครบริการ</span> <span style={{ fontFamily: "var(--font-serif)", fontSize: "1.15em" }}>Yuanta Wealth</span></h2>

                {step === "form" && (
                  <form className="contact-form" id="contact-form" ref={formRef} onSubmit={handleFormSubmit}>
                    <div className="form-row">
                      <div className="form-group">
                        <input type="text" name="firstname" placeholder="ชื่อ" required />
                      </div>
                      <div className="form-group">
                        <input type="text" name="lastname" placeholder="นามสกุล" required />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <input type="tel" name="phone" placeholder="เบอร์โทรศัพท์" />
                      </div>
                      <div className="form-group">
                        <input type="email" name="email" placeholder="อีเมล" required />
                      </div>
                    </div>
                    <div className="form-group">
                      <input type="hidden" name="investment_amount" value={investment || ""} readOnly />
                      <div className={`custom-select${selectOpen ? " open" : ""}${investment ? " has-value" : ""}`} id="custom-select-investment" ref={selectRef}>
                        <div className="custom-select__trigger" onClick={(e) => { e.stopPropagation(); setSelectOpen((o) => !o); }}>
                          <span className="custom-select__label">{investment || "มูลค่าสินทรัพย์รวมที่ต้องการบริหาร"}</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>
                        <div className="custom-select__options">
                          {INVESTMENT_OPTIONS.map((opt) => (
                            <div
                              key={opt}
                              className={`custom-select__option${investment === opt ? " selected" : ""}`}
                              onClick={() => { setInvestment(opt); setSelectOpen(false); }}
                            >
                              {opt}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="form-group">
                      <textarea name="message" placeholder="ข้อความเพิ่มเติม..."></textarea>
                    </div>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <button type="submit" id="form-submit-btn" className="btn btn-primary" style={{ width: "50%", justifyContent: "center" }}>
                        ส่งข้อมูล
                      </button>
                    </div>
                  </form>
                )}

                {step === "consent" && (
                  <div id="consent-step">
                    <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, marginBottom: 20 }}>
                      Yuanta Securities มุ่งมั่นในการปกป้องและเคารพความเป็นส่วนตัวของคุณ และเราจะใช้ข้อมูลส่วนตัวของคุณเฉพาะเพื่อจัดการบัญชีของคุณ และเพื่อให้บริการผลิตภัณฑ์และบริการต่างๆ ที่คุณร้องขอจากเรา ในบางครั้งเราอาจติดต่อคุณเกี่ยวกับผลิตภัณฑ์และบริการของเรา รวมถึงเนื้อหาอื่นๆ ที่คุณอาจสนใจ หากคุณยินยอม ให้เราติดต่อคุณเพื่อจุดประสงค์นี้ โปรดกาเครื่องหมายด้านล่างเพื่อแจ้งว่าคุณต้องการให้เราติดต่อคุณอย่างไร:
                    </p>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 16 }}>
                      <input type="checkbox" checked={consentComm} onChange={(e) => setConsentComm(e.target.checked)} style={{ marginTop: 3, flexShrink: 0, accentColor: "#b8996a", width: 16, height: 16 }} />
                      <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>
                        ข้าพเจ้ายอมรับในการรับการสื่อสารอื่นๆ จาก Yuanta Securities <span style={{ color: "#ffaaaa" }}>*</span>
                      </span>
                    </label>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 24 }}>
                      <input type="checkbox" checked={consentData} onChange={(e) => setConsentData(e.target.checked)} style={{ marginTop: 3, flexShrink: 0, accentColor: "#b8996a", width: 16, height: 16 }} />
                      <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>
                        ข้าพเจ้าตกลงอนุญาตให้ Yuanta Securities เก็บและประมวลผลข้อมูลส่วนตัวของข้าพเจ้า <span style={{ color: "#ffaaaa" }}>*</span>
                      </span>
                    </label>
                    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                      <button id="consent-back-btn" type="button" className="btn" style={{ width: "35%", justifyContent: "center", background: "transparent", border: "1px solid rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.7)" }} onClick={handleBack}>
                        ย้อนกลับ
                      </button>
                      <button id="consent-confirm-btn" type="button" className="btn btn-primary" style={{ width: "55%", justifyContent: "center" }} onClick={handleConfirm} disabled={submitting}>
                        {submitting ? "กำลังส่ง..." : "ยืนยันและส่งข้อมูล"}
                      </button>
                    </div>
                    {formError && (
                      <p id="form-error" style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "#ffaaaa", marginTop: 12, textAlign: "center" }}>{formError}</p>
                    )}
                  </div>
                )}

                {step === "success" && (
                  <div id="success-step" style={{ textAlign: "center", padding: "32px 0" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#b8996a" strokeWidth="1.5" style={{ marginBottom: 16 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <p style={{ fontFamily: "var(--font-sans)", fontSize: 16, color: "rgba(255,255,255,0.9)", fontWeight: 500, marginBottom: 8 }}>ขอบคุณครับ</p>
                    <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "rgba(255,255,255,0.65)" }}>ทีมงานจะติดต่อกลับภายใน 1 วันทำการ</p>
                    <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 16 }}>(PoC) ข้อมูลนี้ถูกบันทึกไว้ใน Supabase ของ sandbox นี้เท่านั้น — ไม่ได้ส่งไปที่ HubSpot จริง</p>
                  </div>
                )}
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

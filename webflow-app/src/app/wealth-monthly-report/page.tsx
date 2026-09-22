"use client";

// PoC: port of yuanta-wealth-supabase-poc/monthly-pdf.html onto Webflow Cloud.
// Same pattern as wealth-weekly-report — see that page's header comment.

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

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Noto Sans Thai', sans-serif; background: #0c244a; min-height: 100vh; display: flex; align-items: center; justify-content: center; }

  .popup-card {
    background: #fff;
    width: 100%;
    max-width: 440px;
    margin: 24px;
    padding: 48px 40px;
    text-align: center;
    box-shadow: 0 8px 40px rgba(0,0,0,.35);
  }
  .popup-logo { height: 40px; width: auto; margin-bottom: 32px; }
  .popup-spinner {
    width: 48px; height: 48px;
    border: 3px solid rgba(12,36,74,.1);
    border-top-color: #0c244a;
    border-radius: 50%;
    animation: spin .8s linear infinite;
    margin: 0 auto 24px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .popup-label { font-family: 'Cormorant Garamond', serif; font-size: 14px; font-weight: 600; color: #8f9aac; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 12px; }
  .popup-title { font-size: 18px; font-weight: 700; color: #0c244a; line-height: 1.5; margin-bottom: 8px; }
  .popup-sub { font-size: 15px; color: #8f9aac; }

  .popup-error-icon { color: #c0392b; margin-bottom: 20px; }
  .popup-error-title { font-size: 20px; font-weight: 700; color: #0c244a; margin-bottom: 10px; }
  .popup-error-desc { font-size: 15px; color: #8f9aac; line-height: 1.7; }
  .popup-countdown { font-size: 14px; color: #b4bbc7; margin-top: 24px; }
`;

export default function MonthlyReportPage() {
  const [view, setView] = useState<"idle" | "loading" | "error">("idle");
  const [title, setTitle] = useState("");
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    const week = new URLSearchParams(location.search).get("week");
    if (!week) {
      setView("error");
      return;
    }
    sbFetch("monthly_pdf", `select=*&week_slug=eq.${encodeURIComponent(week)}&limit=1`).then((rows) => {
      if (!rows.length) {
        setView("error");
        return;
      }
      const row = rows[0];
      setTitle("บทวิเคราะห์ประจำเดือน " + row.week_slug);
      const pdfUrl = row.pdf_url && row.pdf_url.url;
      if (!pdfUrl) {
        setView("error");
        return;
      }
      setView("loading");
      setTimeout(() => {
        window.location.href = pdfUrl;
      }, 3000);
    });
  }, []);

  useEffect(() => {
    if (view !== "error") return;
    if (countdown <= 0) {
      if (document.referrer) window.location.href = document.referrer;
      else history.back();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [view, countdown]);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;700&family=Cormorant+Garamond:wght@600&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {view === "loading" && (
        <div className="popup-card" id="loadCard">
          <img className="popup-logo" src="/images/theme/Logo-1.png" alt="Yuanta Wealth" />
          <div className="popup-spinner"></div>
          <p className="popup-label">Monthly Report</p>
          <p className="popup-title" id="loadTitle">{title}</p>
          <p className="popup-sub">กำลังเปิดเอกสาร…</p>
        </div>
      )}

      {view === "error" && (
        <div className="popup-card" id="errorCard">
          <img className="popup-logo" src="/images/theme/Logo-1.png" alt="Yuanta Wealth" />
          <div className="popup-error-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <p className="popup-error-title">ไม่มีบทวิเคราะห์</p>
          <p className="popup-error-desc">ยังไม่มีบทวิเคราะห์สำหรับเดือนนี้<br />กำลังกลับไปหน้าหลัก…</p>
          <p className="popup-countdown" id="countdown">{countdown}…</p>
        </div>
      )}
    </>
  );
}

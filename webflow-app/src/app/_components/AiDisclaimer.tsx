"use client";

// Short disclaimer under every article's AI summary, with "อ่านเพิ่มเติม" opening
// the full Asset Allocation disclaimer: a bottom sheet on mobile, a centered
// modal on desktop. Shared by all 8 article page templates.

import { useEffect, useState } from "react";
import { DISCLAIMER_BLOCKS, DISCLAIMER_TITLE } from "./disclaimer-content";

// 2026-10-02: temporarily hidden on every page per user request. Component,
// content and all 8 page usages are left in place -- flip back to true to show it.
const DISCLAIMER_ENABLED = false;

const SHORT_TEXT =
  'ข้อมูล บทวิเคราะห์ มุมมองการจัดสรรการลงทุน (Asset Allocation) และแบบจำลองพอร์ตการลงทุน (Model Portfolio) ที่บริษัทหลักทรัพย์ หยวนต้า (ประเทศไทย) จำกัด ("บริษัทฯ") จัดทำหรือเผยแพร่ผ่านเอกสาร เว็บไซต์ หรือช่องทางสื่อสารของบริษัทฯ จัดทำขึ้นเพื่อเป็นข้อมูลทั่วไปและประกอบการตัดสินใจลงทุนในภาพรวม มิใช่คำแนะนำการลงทุนเฉพาะบุคคล';

const CSS = `
  .ai-disclaimer { display: flex; gap: 8px; align-items: flex-start; background: #F9FAFB; padding: 10px 12px; margin-top: 16px; font-family: 'Noto Sans Thai', sans-serif; font-size: 13px; line-height: 1.6; color: #4A5565; }
  .ai-disclaimer-icon { flex-shrink: 0; width: 16px; height: 16px; margin-top: 2px; color: #6A7282; }
  .ai-disclaimer-more { background: none; border: 0; padding: 0; margin-left: 4px; font: inherit; color: #155DFC; text-decoration: underline; cursor: pointer; }
  @media (max-width: 767px) { .ai-disclaimer { font-size: 14px; } }

  /* desktop: dims the page but stays under the fixed navbar (z-index 1000), as in the design */
  /* --disc-nav-h is the navbar's real rendered height, measured on open (it varies by viewport) */
  .disc-backdrop { position: fixed; top: var(--disc-nav-h, 80px); left: 0; right: 0; bottom: 0; z-index: 999; background: rgba(0, 0, 0, 0.35); display: flex; align-items: flex-start; justify-content: center; padding: 24px 24px 24px; }
  .disc-modal { background: #fff; width: 100%; max-width: 1060px; max-height: calc(100vh - var(--disc-nav-h, 80px) - 48px); display: flex; flex-direction: column; font-family: 'Noto Sans Thai', sans-serif; color: #0C244A; }
  .disc-handle { display: none; }
  .disc-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 24px; border-bottom: 1px solid #E5E7EB; flex-shrink: 0; }
  .disc-title { margin: 0; font-size: 18px; font-weight: 700; color: #0C244A; }
  .disc-close { background: none; border: 0; padding: 4px; cursor: pointer; color: #0C244A; line-height: 0; }
  .disc-body { overflow-y: auto; padding: 20px 24px 28px; font-size: 15px; line-height: 1.75; }
  .disc-body p { margin: 0 0 6px; }
  .disc-body .disc-heading { font-weight: 700; margin-top: 18px; }
  .disc-body .disc-heading:first-child { margin-top: 0; }
  .disc-body .disc-item { padding-left: 18px; margin-bottom: 4px; }
  .disc-body .disc-contact { font-weight: 700; margin-top: 18px; }
  .disc-body a { color: #155DFC; text-decoration: underline; }

  @media (max-width: 767px) {
    .disc-backdrop { top: 0; z-index: 2000; align-items: flex-end; padding: 0; }
    .disc-modal { max-height: 92vh; border-radius: 16px 16px 0 0; animation: disc-up .25s ease-out; }
    .disc-handle { display: block; width: 36px; height: 4px; border-radius: 2px; background: #D1D5DC; margin: 8px auto 0; flex-shrink: 0; }
    .disc-header { padding: 12px 16px 14px; }
    .disc-body { padding: 16px 16px 28px; font-size: 14px; line-height: 1.7; }
  }
  @keyframes disc-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
`;

export default function AiDisclaimer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const nav = document.querySelector<HTMLElement>(".navbar");
    if (nav) document.documentElement.style.setProperty("--disc-nav-h", `${nav.getBoundingClientRect().bottom}px`);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!DISCLAIMER_ENABLED) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="ai-disclaimer">
        <svg className="ai-disclaimer-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
          <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="8" cy="4.9" r="0.75" fill="currentColor" />
        </svg>
        <p style={{ margin: 0 }}>
          {SHORT_TEXT}
          <button type="button" className="ai-disclaimer-more" onClick={() => setOpen(true)}>
            อ่านเพิ่มเติม
          </button>
        </p>
      </div>

      {open && (
        <div className="disc-backdrop" onClick={() => setOpen(false)}>
          <div
            className="disc-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="disc-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="disc-handle" />
            <div className="disc-header">
              <h2 className="disc-title" id="disc-title">{DISCLAIMER_TITLE}</h2>
              <button type="button" className="disc-close" aria-label="ปิด" onClick={() => setOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="disc-body">
              {DISCLAIMER_BLOCKS.map((b, i) => (
                <p key={i} className={`disc-${b.kind}`} dangerouslySetInnerHTML={{ __html: b.html }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

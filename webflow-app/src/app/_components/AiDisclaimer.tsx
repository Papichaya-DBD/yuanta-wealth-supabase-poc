"use client";

// Short disclaimer with "อ่านเพิ่มเติม" opening a full text: a bottom sheet on
// mobile, a centered modal on desktop. Three variants:
//   "asset" (default) -- Asset Allocation; under every article's AI summary and
//                        at the end of the buy-list fund popup
//   "ai"              -- AI Summary; inside the buy-list popup's AI summary box
//   "fund"            -- mutual funds only, in the buy-list popup; opens the
//                        Conflict of Interest policy
// "asset" and "ai" open the same full Asset Allocation disclaimer.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DISCLAIMER_BLOCKS, DISCLAIMER_TITLE, type DisclaimerBlock } from "./disclaimer-content";
import { COI_BLOCKS, COI_TITLE } from "./disclaimer-coi-content";

// 2026-10-02 to 2026-10-14 this was false (hidden everywhere); turned back on with
// the buy-list popup disclaimers. Flip to false to hide every variant again.
const DISCLAIMER_ENABLED = true;

const ASSET_TEXT =
  'ข้อมูล บทวิเคราะห์ มุมมองการจัดสรรการลงทุน (Asset Allocation) และแบบจำลองพอร์ตการลงทุน (Model Portfolio) ที่บริษัทหลักทรัพย์ หยวนต้า (ประเทศไทย) จำกัด ("บริษัทฯ") จัดทำหรือเผยแพร่ผ่านเอกสาร เว็บไซต์ หรือช่องทางสื่อสารของบริษัทฯ จัดทำขึ้นเพื่อเป็นข้อมูลทั่วไปและประกอบการตัดสินใจลงทุนในภาพรวม มิใช่คำแนะนำการลงทุนเฉพาะบุคคล';

const AI_HEADING = "ข้อจำกัดความรับผิดเกี่ยวกับ AI Summary";
const AI_TEXT =
  "AI Summary เป็นบริการที่ใช้เทคโนโลยีปัญญาประดิษฐ์ในการสรุปข้อมูลจากบทวิเคราะห์ มุมมอง หรือคำแนะนำการลงทุนของ CIO และแหล่งข้อมูลที่บริษัทกำหนด โดย AI มิได้เป็นผู้จัดทำคำแนะนำการลงทุนขึ้นเอง";

const FUND_TEXT =
  "กองทุนรวมและการลงทุนแต่ละประเภทมีลักษณะและความเสี่ยงเฉพาะ ผู้ลงทุนควรทำความเข้าใจลักษณะ ความเสี่ยง เงื่อนไข และผลตอบแทนจากหนังสือชี้ชวน (Prospectus) ก่อนตัดสินใจลงทุน การลงทุนอาจมีความผันผวนและมีโอกาสได้รับเงินคืนต่ำกว่าเงินลงทุนเริ่มแรก บริษัทฯ ได้รับ Trailer Fee (ค่าธรรมเนียมทางอ้อม) จาก บลจ. โดยไม่เรียกเก็บค่าธรรมเนียมเพิ่มเติมจากผู้ลงทุน เพื่อให้บริการข้อมูล คำแนะนำ และบริการหลังการขาย ทั้งนี้ บริษัทฯ มีนโยบายจัดการความขัดแย้งทางผลประโยชน์ (Conflict of Interest) รายละเอียดศึกษาได้ที่";

type Variant = "asset" | "ai" | "fund";
const VARIANTS: Record<Variant, { heading?: string; text: string; title: string; blocks: DisclaimerBlock[] }> = {
  asset: { text: ASSET_TEXT, title: DISCLAIMER_TITLE, blocks: DISCLAIMER_BLOCKS },
  ai: { heading: AI_HEADING, text: AI_TEXT, title: DISCLAIMER_TITLE, blocks: DISCLAIMER_BLOCKS },
  fund: { text: FUND_TEXT, title: COI_TITLE, blocks: COI_BLOCKS },
};

const CSS = `
  .ai-disclaimer { display: flex; gap: 8px; align-items: flex-start; background: #F9FAFB; padding: 10px 12px; margin-top: 16px; font-family: 'Noto Sans Thai', sans-serif; font-size: 13px; line-height: 1.6; color: #4A5565; }
  .ai-disclaimer-icon { flex-shrink: 0; width: 16px; height: 16px; margin-top: 2px; color: #6A7282; }
  .ai-disclaimer-heading { display: block; }
  .ai-disclaimer-more { background: none; border: 0; padding: 0; margin-left: 4px; font: inherit; color: #155DFC; text-decoration: underline; cursor: pointer; }
  @media (max-width: 767px) { .ai-disclaimer { font-size: 14px; } }

  /* desktop: dims the page but stays under the fixed navbar (z-index 1000), as in the design */
  /* --disc-nav-h is the navbar's real rendered height, measured on open (it varies by viewport) */
  .disc-backdrop { position: fixed; top: var(--disc-nav-h, 80px); left: 0; right: 0; bottom: 0; z-index: 999; background: rgba(0, 0, 0, 0.35); display: flex; align-items: flex-start; justify-content: center; padding: 24px 24px 24px; }
  /* opened from the buy-list fund drawer (z-index 1050): cover the whole screen, above the drawer */
  .disc-backdrop.disc-over-drawer { top: 0; z-index: 2000; }
  @media (min-width: 768px) {
    .disc-backdrop.disc-over-drawer { align-items: center; }
    .disc-backdrop.disc-over-drawer .disc-modal { max-height: calc(100vh - 48px); }
  }
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

export default function AiDisclaimer({ variant = "asset", overDrawer = false }: { variant?: Variant; overDrawer?: boolean }) {
  const [open, setOpen] = useState(false);
  const v = VARIANTS[variant];

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
          {v.heading && <span className="ai-disclaimer-heading">{v.heading}</span>}
          {v.text}
          <button type="button" className="ai-disclaimer-more" onClick={() => setOpen(true)}>
            อ่านเพิ่มเติม
          </button>
        </p>
      </div>

      {/* Portaled to body: the buy-list drawer is transformed, which would trap a fixed-position modal inside it */}
      {open && createPortal(
        <div className={"disc-backdrop" + (overDrawer ? " disc-over-drawer" : "")} onClick={() => setOpen(false)}>
          <div
            className="disc-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`disc-title-${variant}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="disc-handle" />
            <div className="disc-header">
              <h2 className="disc-title" id={`disc-title-${variant}`}>{v.title}</h2>
              <button type="button" className="disc-close" aria-label="ปิด" onClick={() => setOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="disc-body">
              {v.blocks.map((b, i) => (
                <p key={i} className={`disc-${b.kind}`} dangerouslySetInnerHTML={{ __html: b.html }} />
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

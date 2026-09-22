"use client";

// PoC: port of yuanta-wealth-supabase-poc/privileges-events.html onto Webflow Cloud.
// Tab switch (Events/Privileges) is pure post-mount client state -> React state.
// The 3 dynamic-content sections (events list, benefits table, products table)
// are each driven by useState+useEffect, rendered via dangerouslySetInnerHTML
// bound to that state (not a raw injected script — see the hydration-mismatch
// note in the home page port).

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

const EVENTS_FALLBACK_IMG = "/images/theme/comingsoon.png";
const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function eventDateText(s?: string) {
  if (!s) return "";
  const d = new Date(s + "T00:00:00Z");
  return d.getUTCDate() + " " + THAI_MONTHS[d.getUTCMonth()] + " " + (d.getUTCFullYear() + 543);
}

function eventCardHtml(ev: Record<string, any>) {
  const img = ev.image && ev.image.url ? ev.image.url : EVENTS_FALLBACK_IMG;
  const timeHtml = ev.event_time ? `<span class="event-date-sep"></span><span class="event-time">${ev.event_time}</span>` : "";
  const locHtml = ev.location
    ? `<p class="event-location"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 14s5-4.686 5-8a5 5 0 10-10 0c0 3.314 5 8 5 8z" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="6" r="1.5" stroke="currentColor" stroke-width="1.5"/></svg><span>${ev.location}</span></p>`
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
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 1v4M11 1v4M2 7h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
    `<span class="event-date-text">${eventDateText(ev.event_date)}</span>${timeHtml}` +
    "</p>" +
    locHtml +
    "</div></div></div></a></div>"
  );
}

const CHECK_IMGS = ["/images/theme/check-elite.png", "/images/theme/check-prestige.png", "/images/theme/check-signature.png"];
const TIER_ICONS = ["/images/theme/icon-elite.png", "/images/theme/icon-prestige.png", "/images/theme/icon-signature.png"];
const TIER_LABELS = ["Elite", "Prestige", "Signature"];

function cell(val: any, idx: number) {
  if (!val) return "<td></td>";
  if (val === "check") return `<td><img src="${CHECK_IMGS[idx]}" class="priv-check-img" alt="✓" /></td>`;
  return `<td class="priv-val">${val}</td>`;
}

function box(rows: string) {
  return (
    '<div class="priv-section-box"><table class="priv-table"><colgroup>' +
    '<col class="priv-col-feature"><col class="priv-col-tier"><col class="priv-col-tier"><col class="priv-col-tier">' +
    "</colgroup><tbody>" + rows + "</tbody></table></div>"
  );
}

function mainHeaderBox(feature: string, addMargin: boolean) {
  const rows =
    `<tr class="priv-main-header-row"><td colspan="4">${feature}</td></tr>` +
    '<tr class="priv-tier-icons-row"><td>ระดับสมาชิก</td>' +
    TIER_ICONS.map((src, i) => `<td><img src="${src}" class="priv-tier-icon-sm" alt="${TIER_LABELS[i]}" /></td>`).join("") +
    "</tr>";
  return (
    `<div class="priv-section-box"${addMargin ? ' style="margin-top:24px;"' : ""}>` +
    '<table class="priv-table"><colgroup><col class="priv-col-feature"><col class="priv-col-tier"><col class="priv-col-tier"><col class="priv-col-tier"></colgroup>' +
    "<tbody>" + rows + "</tbody></table></div>"
  );
}

function buildBenefitsTable(rows: Record<string, any>[]) {
  let html = "";
  let currentRows = "";
  let mainHeaderCount = 0;

  rows.forEach((v) => {
    if (v.is_category && v.is_main_header) {
      if (currentRows) {
        html += box(currentRows);
        currentRows = "";
      }
      html += mainHeaderBox(v.feature, mainHeaderCount > 0);
      mainHeaderCount++;
    } else if (v.is_category) {
      if (currentRows) {
        html += box(currentRows);
        currentRows = "";
      }
      currentRows = `<tr class="priv-section-row"><td colspan="4">${v.feature}</td></tr>`;
    } else {
      currentRows += `<tr class="priv-row"><td>${v.feature}</td>${cell(v.tier_1, 0)}${cell(v.tier_2, 1)}${cell(v.tier_3, 2)}</tr>`;
    }
  });
  if (currentRows) html += box(currentRows);
  return html;
}

function buildProductsTable(rows: Record<string, any>[]) {
  const bodyRows = rows
    .map((v) => `<tr class="priv-row"><td>${v.product || ""}</td><td class="priv-val">${v.rc_rate || ""}</td></tr>`)
    .join("");
  return (
    '<div class="priv-section-box">' +
    '<table class="priv-table"><colgroup><col class="priv-col-half"><col class="priv-col-half"></colgroup>' +
    "<tbody>" +
    '<tr class="priv-main-header-row"><td colspan="2">การสะสม Yuanta Point จากผลิตภัณฑ์ลงทุน</td></tr>' +
    '<tr class="priv-section-row priv-col-header-row"><td>ผลิตภัณฑ์ลงทุน</td><td>รับ 1 RC</td></tr>' +
    bodyRows +
    "</tbody></table></div>"
  );
}

export default function PrivilegesEventsPage() {
  const [tab, setTab] = useState<"events" | "privileges">("events");
  const [eventsHtml, setEventsHtml] = useState<string | null>(null);
  const [benefitsHtml, setBenefitsHtml] = useState("");
  const [productsHtml, setProductsHtml] = useState("");

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
    sbFetch("events", "select=*&category=eq.events&is_published=eq.true&order=event_date.asc&limit=100").then((rows) => {
      if (rows && rows.length) setEventsHtml(rows.map(eventCardHtml).join(""));
    });
  }, []);

  useEffect(() => {
    sbFetch("privileges_benefits", "select=*&order=order.asc").then((rows) => {
      setBenefitsHtml(buildBenefitsTable(rows || []));
    });
  }, []);

  useEffect(() => {
    sbFetch("privileges_products", "select=*&order=order.asc").then((rows) => {
      setProductsHtml(buildProductsTable(rows || []));
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
      <section className="hero" style={{ backgroundImage: "url('/images/theme/privilegesbanner.png')" }}>
        <div className="hero-overlay"></div>
        <div className="hero-inner hero-content" style={{ width: "100%" }}>
          <div className="container">
            <div style={{ textAlign: "center", width: "100%" }}>
              <h1 className="hero-title hero-page">Privileges &amp; Events</h1>
              <p className="hero-subtitle">กิจกรรมพิเศษและสิทธิประโยชน์เฉพาะสำหรับลูกค้า Yuanta Wealth</p>
            </div>
          </div>
        </div>
      </section>

      {/* TABS + CARDS */}
      <section style={{ padding: "60px 0 0", background: "var(--color-white)" }}>
        <div className="container">
          <div className="tabs-outer">
            <div className="tabs-bar">
              <button className={`tab-chip${tab === "events" ? " active" : ""}`} onClick={() => setTab("events")}>Events</button>
              <button className={`tab-chip${tab === "privileges" ? " active" : ""}`} onClick={() => setTab("privileges")}>Privileges</button>
            </div>
          </div>

          {/* Events tab */}
          <div id="tab-events" className="row g-4" style={{ display: tab === "events" ? "" : "none" }}>
            {eventsHtml ? (
              <div dangerouslySetInnerHTML={{ __html: eventsHtml }} />
            ) : (
              <div id="eventsEmptyMsg" className="col-12" style={{ padding: "40px 0", textAlign: "center", color: "#3d506e" }}>
                <p>ไม่มีกิจกรรมในขณะนี้</p>
              </div>
            )}
          </div>

          {/* Privileges tab */}
          <div id="tab-privileges" style={{ display: tab === "privileges" ? "" : "none" }}>

            <div className="priv-rewards-box" style={{ backgroundImage: "url('/images/theme/bg-privilege.png')", backgroundPosition: "center", backgroundSize: "cover", backgroundRepeat: "no-repeat" }}>
              <p className="priv-rewards-heading">
                <img src="/images/theme/icon-prestige.png" alt="" className="priv-rewards-icon" />
                Yuanta Rewards
              </p>
              <p className="priv-rewards-tagline">เปลี่ยนทุกการลงทุนให้คุ้มค่ายิ่งขึ้น</p>
              <p className="priv-rewards-body"><strong>Yuanta Rewards</strong> คือ โปรแกรมสิทธิพิเศษที่ออกแบบมา เพื่อลูกค้าหยวนต้าโดยเฉพาะ</p>
              <p className="priv-rewards-body">สะสมคะแนนจากการลงทุนผ่านผลิตภัณฑ์ หรือบริการ ของ Yuanta และรับสิทธิพิเศษที่เพิ่มขึ้นตามระดับ สถานะของคุณ ยิ่งลงทุนมาก ยิ่งได้รับมาก ทั้งของรางวัลสุดพิเศษและสิทธิประโยชน์เฉพาะลูกค้าในแต่ละระดับ</p>
            </div>

            <div className="priv-card-heading">
              <p>สิทธิประโยชน์ที่คุณจะได้รับ</p>
              <p>จาก <strong>Yuanta Ultimate</strong></p>
            </div>

            <div className="priv-card-img-wrap">
              <img src="/images/theme/card.png" alt="Yuanta Elite, Signature, Prestige Cards" className="priv-card-img" />
            </div>

            <div className="priv-content-box">

              <div className="priv-section-heading">
                <p className="priv-section-num"><span>1</span> สิทธิพิเศษตามสถานะ</p>
                <p className="priv-section-sub">ไม่ว่าคุณจะอยู่ในสถานะใด ก็สามารถได้รับสิทธิประโยชน์ ที่ออกแบบมาเฉพาะสำหรับระดับนั้นๆทันที</p>
                <p className="priv-section-sub">เพียงสะสมคะแนนจากการลงทุนผ่านผลิตภัณฑ์หรือบริการของ Yuanta คุณก็สามารถคงระดับหรืออัปเกรดสถานะ เพื่อรับสิทธิประโยชน์ที่มากขึ้นได้อย่างต่อเนื่อง</p>
              </div>

              <div className="priv-table-area">
                <div id="priv-benefits-table" dangerouslySetInnerHTML={{ __html: benefitsHtml }} />
              </div>

              <div className="priv-footnote">
                <p>การรับสถานะสามารถทำได้ผ่าน 2 เงื่อนไข</p>
                <p>1. สะสมค่า RC ให้ถึงเกณฑ์ หรือ</p>
                <p>2. มีมูลค่าสินทรัพย์การลงทุนในพอร์ตกองทุน ถึงที่กำหนดในวันใดๆที่ได้ภายในช่วงเวลาที่กำหนด</p>
                <br />
                <p>รอบการคิดค่าธรรมเนียมสะสม, มูลค่าการลงทุนในหุ้นกู้ที่มีอนุพันธ์แฝง และหุ้นกู้ จะพิจารณาทุก 6 เดือน (2 รอบ/ปี) ได้แก่ :</p>
                <p>• รอบที่ 1: 1 มกราคม – 30 มิถุนายน</p>
                <p>• รอบที่ 2: 1 กรกฎาคม – 31 ธันวาคม</p>
                <p>โดยในแต่ละรอบจะเริ่มนับมูลค่าการลงทุนสะสมตั้งแต่ 0 บาท และจะมีการตัดยอดเมื่อสิ้นสุดรอบดังกล่าว</p>
              </div>

            </div>

            <div className="priv-content-box" style={{ marginTop: 24 }}>

              <div className="priv-section-heading">
                <p className="priv-section-num"><span>2</span> สะสมคะแนนจากการลงทุน หรือ ร่วมภารกิจพิเศษ</p>
                <p className="priv-section-sub">นำคะแนนไปแลกรางวัลที่คุณเลือกเองได้ตามความต้องการ ผ่าน YSInvest มูลค่าของคะแนน จะแตกต่างกันไปตามรางวัลที่คุณเลือก</p>
                <p className="priv-section-sub">ยิ่งสะสมมาก ยิ่งมีสิทธิ์เลือกของรางวัลพรีเมียม ที่ตรงใจคุณได้มากขึ้น</p>
              </div>

              <div className="priv-table-area">
                <div id="priv-products-table" dangerouslySetInnerHTML={{ __html: productsHtml }} />
              </div>

            </div>

            <div className="priv-section-box" style={{ marginTop: 16, backgroundImage: "url('/images/theme/bgoverall.jpg')", backgroundPosition: "center", backgroundSize: "cover", backgroundRepeat: "no-repeat" }}>
              <div className="priv-footnote" style={{ borderTop: "none" }}>
                <p className="priv-footnote-title">ระยะเวลาสะสมคะแนน Yuanta Points</p>
                <p className="priv-footnote-bold">คะแนน Yuanta Points จะสะสมตลอดทั้งปี และมีอายุ 1 ปีปฏิทิน</p>
                <p>เช่น คะแนนสะสมตลอดปี 2026 จะหมดอายุวันที่ 31 ธ.ค. 2027</p>
              </div>
            </div>

            <div className="tac-section" style={{ padding: "24px 0 60px" }}>
              <div className="tac-outer">
                <button className="tac-toggle" type="button" data-bs-toggle="collapse" data-bs-target="#tacContent" aria-expanded="false" aria-controls="tacContent">
                  <span>ข้อกำหนดและเงื่อนไขบริการ Yuanta Rewards</span>
                  <svg className="tac-chevron" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div id="tacContent" className="collapse">
                  <div className="tac-body">
                    <p>ผู้ขอใช้บริการตกลงยอมรับข้อกำหนดและเงื่อนไขเพิ่มเติมของโครงการ Yuanta Rewards ดังต่อไปนี้</p>

                    <p><strong>นิยามคำสำคัญ (Definitions)</strong><br />
                    ภายใต้ข้อกำหนดและเงื่อนไขฉบับนี้</p>
                    <ul>
                      <li>&quot;บริษัท&quot; หมายถึง บริษัทหลักทรัพย์ หยวนต้า (ประเทศไทย) จำกัด</li>
                      <li>&quot;โครงการ Yuanta Rewards&quot; หมายถึง โครงการสิทธิประโยชน์สำหรับลูกค้าของบริษัทตามที่บริษัทกำหนด</li>
                      <li>&quot;RC (Rewards Credit)&quot; หมายถึง หน่วยคะแนนที่ได้จากค่าคอมมิชชั่นหรือกิจกรรมที่บริษัทกำหนด ซึ่งใช้เป็นฐานในการคำนวณระดับสมาชิกและ Yuanta Points</li>
                      <li>&quot;Yuanta Points&quot; หมายถึง คะแนนสะสมที่คำนวณจาก RC ตามระดับสมาชิก และสามารถนำไปใช้แลกสิทธิประโยชน์ตามที่บริษัทกำหนด</li>
                      <li>&quot;Tier&quot; และ &quot;ระดับสมาชิก&quot; หมายถึง ระดับสถานะของลูกค้าในโครงการ Yuanta Rewards ซึ่งกำหนดจาก RC หรือ AUM ตามเงื่อนไขของบริษัท</li>
                      <li>&quot;Yuanta Ultimate&quot; หมายถึง ระดับสิทธิประโยชน์พิเศษเพิ่มเติมสำหรับลูกค้าที่เข้าเงื่อนไขเฉพาะ ตามที่บริษัทกำหนด</li>
                    </ul>
                    <p>หากไม่มีการกำหนดนิยามไว้เป็นการเฉพาะในข้อกำหนดและเงื่อนไขฉบับนี้ ให้ตีความตามนิยามที่ปรากฏในข้อกำหนดและเงื่อนไขการใช้บริการของบริษัทหลักทรัพย์หยวนต้า (ประเทศไทย) จำกัด</p>
                    <p>ข้อกำหนดและเงื่อนไขฉบับนี้ใช้บังคับเฉพาะกับผู้ขอใช้บริการที่มีสิทธิเข้าร่วมโครงการ Yuanta Rewards เท่านั้น</p>
                    <p>โครงการสะสมคะแนน Yuanta Rewards จัดขึ้นสำหรับผู้ลงทุนรายบุคคลหรือนิติบุคคล (ยกเว้นผู้ลงทุนสถาบันตามประกาศของคณะกรรมการกำกับตลาดทุน ทั้งในปัจจุบันและที่จะมีการแก้ไขเพิ่มเติมในอนาคต) ซึ่งมีคำสั่งซื้อและ/หรือขายสินทรัพย์ผ่านบัญชีของตนเองกับบริษัท และดำเนินรายการสำเร็จภายใต้ช่วงระยะเวลาโครงการ</p>
                    <p><strong>ระยะเวลาโครงการ</strong> : ตั้งแต่วันที่ 1 มกราคม 2569 – 31 ธันวาคม 2569</p>

                    <p><strong>ผลิตภัณฑ์ที่เข้าร่วมและอัตราการให้ RC</strong></p>

                    <div className="tac-product-section">
                      <h4>4.1 หุ้นไทย อนุพันธ์ หุ้นต่างประเทศ และกองทุนรวม</h4>
                      <table className="tac-table">
                        <tbody>
                        <tr>
                          <td className="tac-td-label">ผลิตภัณฑ์ที่ร่วมรายการ</td>
                          <td><ul><li>หลักทรัพย์ที่จดทะเบียนใน SET และ MAI</li><li>สัญญาซื้อขายล่วงหน้า (TFEX)</li><li>กองทุนรวม</li><li>หุ้นต่างประเทศ</li></ul></td>
                        </tr>
                        <tr>
                          <td className="tac-td-label">อัตราคะแนน</td>
                          <td>ทุกค่าธรรมเนียมการลงทุน 25 บาท จะได้รับ 1 RC</td>
                        </tr>
                        <tr>
                          <td className="tac-td-label">การคำนวณคะแนน</td>
                          <td>การคำนวณคะแนนจากคำสั่งซื้อ และ/หรือ ขายแยกตามแต่ละผลิตภัณฑ์ และ/หรือ แต่ละรายการลงทุน โดยจะทำการคำนวณและแสดงผลคะแนนสะสมผ่าน YSInvest</td>
                        </tr>
                        <tr>
                          <td className="tac-td-label">การตรวจสอบคะแนน</td>
                          <td>คะแนนจะถูกคำนวนทุกเดือน และจะอัพเดตคะแนนภายใน 5 วันทำการของเดือนถัดไป<br />ตรวจสอบคะแนนได้ทางแพลตฟอร์ม YSInvest</td>
                        </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="tac-product-section">
                      <h4>4.2 หุ้นกู้ที่มีอนุพันธ์แฝง</h4>
                      <table className="tac-table">
                        <tbody>
                        <tr>
                          <td className="tac-td-label">ผลิตภัณฑ์ที่ร่วมรายการ</td>
                          <td><ul><li>Thai Structure Note</li><li>Global Structured Note</li></ul></td>
                        </tr>
                        <tr>
                          <td className="tac-td-label">อัตราคะแนน</td>
                          <td>ทุกจำนวนเงินลงทุน 2,500 บาท<br />จะได้รับ 1 RC</td>
                        </tr>
                        <tr>
                          <td className="tac-td-label">การตรวจสอบคะแนน</td>
                          <td>คะแนนจะถูกคำนวนทุกเดือน และจะอัพเดตคะแนนภายใน 5 วันทำการของเดือนถัดไป<br />ตรวจสอบคะแนนได้ทางแพลตฟอร์ม YSInvest</td>
                        </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="tac-product-section">
                      <h4>4.3 หุ้นกู้</h4>
                      <table className="tac-table">
                        <tbody>
                        <tr>
                          <td className="tac-td-label">ผลิตภัณฑ์ที่ร่วมรายการ</td>
                          <td><ul><li>หุ้นกู้</li></ul></td>
                        </tr>
                        <tr>
                          <td className="tac-td-label">อัตราคะแนน</td>
                          <td>ทุกจำนวนเงินลงทุน 500,000 บาท จะได้รับ 1 RC</td>
                        </tr>
                        <tr>
                          <td className="tac-td-label">การตรวจสอบคะแนน</td>
                          <td>คะแนนจะถูกคำนวนทุกเดือน และจะอัพเดตคะแนนภายใน 5 วันทำการของเดือนถัดไป<br />ตรวจสอบคะแนนได้ทางแพลตฟอร์ม YSInvest</td>
                        </tr>
                        </tbody>
                      </table>
                    </div>

                    <p><strong>อายุคะแนน</strong> : คะแนน Yuanta Point มีอายุ 1 ปีปฏิทิน เช่น คะแนนที่สะสมตลอดปี 2569 จะหมดอายุในวันที่ 31 ธันวาคม 2570</p>

                    <p><strong>หลักเกณฑ์การสะสม RC</strong> : RC จะถูกคำนวณจากค่าธรรมเนียม ค่าคอมมิชชั่น และ/หรือจำนวนเงินลงทุนที่ลูกค้าชำระจริง โดยแยกการคำนวณตามประเภทผลิตภัณฑ์และคำสั่งซื้อขาย ตามหลักเกณฑ์ที่บริษัทกำหนด ทั้งนี้ เศษของยอดที่ไม่ครบตามเกณฑ์การคำนวณ RC จะถูกปัดลง การคำนวณ RC จะอ้างอิงข้อมูลที่บริษัทบันทึกไว้ในระบบ และดำเนินการตามรอบระยะเวลาที่บริษัทกำหนด RC ที่ได้รับจะถูกนำมาใช้เป็นฐานในการประเมินระดับสมาชิก (Tier) และคำนวณ Yuanta Points บริษัทขอสงวนสิทธิ์ในการกำหนด เปลี่ยนแปลง ระงับ หรือยกเลิกหลักเกณฑ์ วิธีการ และเงื่อนไขการสะสม RC ไม่ว่าทั้งหมดหรือบางส่วน โดยไม่ต้องแจ้งให้ทราบล่วงหน้า</p>

                    <p><strong>หลักเกณฑ์การคำนวณ Yuanta Points</strong> : Yuanta Points จะถูกคำนวณจากจำนวน RC ที่ลูกค้าได้รับ โดยอ้างอิงอัตราส่วน RC ต่อ 1 Yuanta Point ตามระดับสมาชิก (Tier) ที่บริษัทกำหนด การคำนวณ Yuanta Points จะอ้างอิงข้อมูล Outstanding ณ สิ้นเดือนของแต่ละรอบบัญชี ทั้งนี้ อัตราส่วน RC ต่อ 1 Yuanta Point จะแตกต่างกันไปตามระดับสมาชิกของลูกค้า บริษัทขอสงวนสิทธิ์ในการปรับเปลี่ยนหลักเกณฑ์ อัตราส่วน วิธีการคำนวณ หรือเงื่อนไขที่เกี่ยวข้องกับ Yuanta Points ตามที่บริษัทเห็นสมควร โดยไม่ต้องแจ้งให้ทราบล่วงหน้า</p>

                    <p><strong>การนำคะแนน Yuanta Point มาแลกส่วนลดค่าธรรมเนียม</strong></p>
                    <ul>
                      <li>8.1 ผู้ใช้บริการสามารถใช้ Yuanta Point แลกเป็นส่วนลดค่าธรรมเนียมการลงทุนผ่านทุกช่องทาง (ยกเว้นลูกค้านิติบุคคล, การซื้อกองทุนภาษีที่ไม่ร่วมรายการ) โดยปฏิบัติตามขั้นตอนของบริษัท</li>
                      <li>8.2 ผู้ขอใช้บริการจะต้องกดยืนยันแลกส่วนลดค่าธรรมเนียมอัตโนมัติ (Auto Cashback) เพื่อทำรายการส่วนลดค่าซื้ออัตโนมัติ</li>
                      <li>8.3 ผู้ขอใช้บริการจะได้รับส่วนลดค่าซื้อ เมื่อคำสั่งซื้อสินทรัพย์ดังกล่าวทำรายการสำเร็จ</li>
                      <li>8.4 คะแนนที่ใช้แลกส่วนลดจะเป็นไปตามเงื่อนไขของบริษัท</li>
                      <li>8.5 สามารถตรวจสอบประวัติรายการใช้ส่วนลดค่าธรรมเนียม ผ่านเมนูประวัติคะแนน บน YSInvest</li>
                      <li>8.6 หากผู้ขอใช้บริการทำการแลกคะแนน Yuanta Point หลายรายการต่อวัน คะแนน Yuanta Point ของผู้ขอใช้บริการจะถูกตัดตามลำดับการทำรายการ</li>
                      <li>8.7 ผู้ขอใช้บริการที่นำคะแนน Yuanta Point มาใช้แลกส่วนลดค่าธรรมเนียมไม่สามารถขอคืน แลกเปลี่ยน และ/หรือ โอนสิทธิส่วนลดค่าธรรมเนียมให้แก่บุคคลอื่นได้</li>
                      <li>8.8 หลังจากลูกค้าได้ทำการแลกคะแนน Yuanta Point แล้ว บริษัทฯ ขอสงวนสิทธิ์ในการแลกกลับมาเป็นคะแนน Yuanta Point หรือของรางวัลอื่นไม่ว่ากรณีใด</li>
                    </ul>

                    <p>กรณีที่มีความผิดพลาดไม่ว่าด้วยเหตุใด ๆ อันมีผลให้ผู้ขอใช้บริการได้รับคะแนน Yuanta Point และ/หรือ ใช้คะแนน Yuanta Point และ/หรือ ได้รับเครดิตเงินคืนค่าธรรมเนียม และ/หรือ ของรางวัล และ/หรือ สิ่งอื่นใดตามที่บริษัทกำหนด ไม่ถูกต้องตามสิทธิที่ผู้ขอใช้บริการจะได้รับ บริษัทมีสิทธิที่จะปรับปรุงให้ถูกต้องได้ทันที ทั้งนี้ กรณีมีข้อโต้แย้ง และ/หรือ ข้อพิพาท ให้ถือคำตัดสินของบริษัทถือเป็นที่สุด</p>
                    <p>บริษัทมีสิทธิที่จะระงับ หรือยกเลิกการสะสมคะแนน Yuanta Point จากการทำรายการ และการแลกคะแนน Yuanta Point เมื่อใดก็ได้ โดยแจ้งให้ผู้ขอใช้บริการทราบล่วงหน้า เว้นแต่ กรณีที่บริษัทเห็นว่าการดำเนินการตามข้อกำหนดและเงื่อนไขนี้ และ/หรือ ข้อกำหนดเพิ่มเติม อาจเป็นการขัดต่อกฎหมาย หรือความสงบเรียบร้อยหรือศีลธรรมอันดีของประชาชน หรือมีพฤติการณ์อันน่าเชื่อว่ามีการใช้บริการหรือการทำรายการในลักษณะ Robot หรือโดยทุจริต หรือโดยมิชอบไม่ว่าด้วยประการใด ๆ หรือมีเหตุจำเป็นอื่นซึ่งไม่อาจแจ้งล่วงหน้าได้ บริษัทมีสิทธิระงับ หรือยกเลิกการสะสมคะแนน Yuanta Point จากการทำรายการ และการแลกคะแนน Yuanta Point ได้ทันที โดยบริษัทจะแจ้งให้ผู้ขอใช้บริการทราบโดยเร็ว</p>
                    <p>ผู้ขอใช้บริการตกลงและรับทราบรายละเอียดของบริการ Yuanta Point ตามข้อกำหนดและเงื่อนไขการใช้บริการ และตกลงยอมรับผูกพันและปฏิบัติตามข้อกำหนดและเงื่อนไขนี้ และข้อกำหนดและเงื่อนไขอื่นใดตามที่บริษัทจะได้กำหนดเพิ่มเติม แก้ไข หรือเปลี่ยนแปลงในภายหน้า ซึ่งให้ถือเป็นส่วนหนึ่งของข้อกำหนดและเงื่อนไขนี้ด้วย</p>
                    <p><strong>หมายเหตุ</strong> : ผู้ลงทุนควรศึกษาข้อมูลผลิตภัณฑ์ เงื่อนไข ผลตอบแทน และความเสี่ยงก่อนตัดสินใจลงทุน เนื่องจากการลงทุนมีความเสี่ยง ควรลงทุนให้เหมาะสมกับระดับความเสี่ยงที่สามารถยอมรับได้</p>
                    <p>สอบถามข้อมูลเพิ่มเติมได้ที่ บริษัทหลักทรัพย์หยวนต้า (ประเทศไทย) จำกัด ทุกวันทำการ หรือ Yuanta Online Service โทร. 02-009-8000</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

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
                  <p className="section-label" style={{ color: "var(--color-brand-soft)" }}>Start Your Wealth Journey</p>
                  <p className="cta-main-text">พบกับที่ปรึกษาการลงทุนส่วนตัวของคุณ</p>
                </div>
              </div>
              <div className="col-12 col-lg-4 d-flex justify-content-lg-end">
                <a href="#" className="btn btn-primary" onClick={(e) => { e.preventDefault(); openMeetingModal(); }}>
                  Book a meeting
                </a>
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

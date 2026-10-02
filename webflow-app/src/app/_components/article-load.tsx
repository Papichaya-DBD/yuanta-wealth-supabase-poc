"use client";

// Main-row loading for article pages. Unlike each page's own sbFetch (which turns
// any failure into []), loadRows keeps "no such article" and "couldn't load"
// apart: an unknown slug sends the reader to /wealth-insights like production's
// HubL templates do, while a network/Supabase error shows a retry notice instead
// of bouncing everyone off the page during a brief outage.

const SUPABASE_URL = "https://kqgdvpqygepvaifzrxki.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_6khmxt87r-YGlSxyF9d9XA_G0NNDTbp";

/** Rows on success (possibly empty), or null if the request itself failed. */
export async function loadRows(table: string, query: string): Promise<any[] | null> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) ? rows : null;
  } catch {
    return null;
  }
}

export function goToInsights() {
  window.location.replace("/wealth-insights");
}

export function LoadErrorNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <section style={{ padding: "160px 16px 80px", textAlign: "center", fontFamily: "'Noto Sans Thai', sans-serif" }}>
      <p style={{ color: "#3d506e", fontSize: 16, marginBottom: 16 }}>โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{ background: "#0c244a", color: "#fff", border: 0, padding: "10px 24px", fontSize: 14, cursor: "pointer" }}
      >
        ลองใหม่
      </button>
    </section>
  );
}

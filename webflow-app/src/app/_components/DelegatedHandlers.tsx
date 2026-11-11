"use client";

import { useEffect } from "react";

// The pages build card/table HTML as strings. That HTML used to carry inline
// onclick/onerror attributes, which the nonce-based CSP (src/middleware.ts) blocks,
// so it now carries data-* attributes and these document-level listeners act on them:
//   data-href="/path"            click anywhere on the element navigates (a real
//                                <a> inside it keeps its own behaviour)
//   data-scroll-by="140"         scrolls the table wrapper just before the button's parent
//   data-fund-ticker / -type     opens the buy-list fund drawer (window.__openFundDrawer)
//   data-fallback="/img.jpg"     swaps a broken <img> to this image once
export default function DelegatedHandlers() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target?.closest) return;

      const scrollBtn = target.closest<HTMLElement>("[data-scroll-by]");
      if (scrollBtn) {
        const wrap = scrollBtn.parentElement?.previousElementSibling;
        wrap?.scrollBy({ left: Number(scrollBtn.dataset.scrollBy) || 0, behavior: "smooth" });
        return;
      }

      const fundBtn = target.closest<HTMLElement>("[data-fund-ticker]");
      if (fundBtn) {
        const open = (window as unknown as { __openFundDrawer?: (t: string, ty?: string) => void }).__openFundDrawer;
        open?.(fundBtn.dataset.fundTicker || "", fundBtn.dataset.fundType);
        return;
      }

      const card = target.closest<HTMLElement>("[data-href]");
      if (card) {
        const link = target.closest("a[href]");
        if (link && card.contains(link)) return;
        location.href = card.dataset.href || "";
      }
    };

    // error events don't bubble, so listen in the capture phase.
    const onError = (e: Event) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement)) return;
      const fallback = img.dataset.fallback;
      if (!fallback) return;
      img.removeAttribute("data-fallback");
      img.src = fallback;
    };

    document.addEventListener("click", onClick);
    document.addEventListener("error", onError, true);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("error", onError, true);
    };
  }, []);

  return null;
}

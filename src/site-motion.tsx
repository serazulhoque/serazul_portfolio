"use client";

import {useEffect} from "react";

/** Adds motion only after hydration. Nothing is hidden without JavaScript. */
export default function SiteMotion() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const selector = [
      ".about-main", ".about-columns p", ".journey-intro",
      ".journey-entry", ".extra-story", ".published-article-title",
      ".gallery-tile", ".contact-section", ".closing-section",
      ".visitor-wall", ".published-articles-intro",
    ].join(",");
    let intersection: IntersectionObserver | null = null;
    let mutation: MutationObserver | null = null;
    let frame = 0;

    const clear = () => {
      intersection?.disconnect();
      intersection = null;
      document.querySelectorAll<HTMLElement>(".site-motion-item").forEach(el => {
        el.classList.remove("site-motion-item", "site-motion-visible");
      });
    };

    const scan = () => {
      frame = 0;
      if (reduced.matches || !intersection) return;
      document.querySelectorAll<HTMLElement>(selector).forEach(el => {
        if (el.classList.contains("site-motion-item")) return;
        // Already visible content must never disappear on hydration.
        const bounds = el.getBoundingClientRect();
        const visible = bounds.top < window.innerHeight && bounds.bottom > 0;
        el.classList.add("site-motion-item");
        if (visible) el.classList.add("site-motion-visible");
        else intersection?.observe(el);
      });
    };

    const queueScan = () => {
      if (!frame) frame = window.requestAnimationFrame(scan);
    };

    const setup = () => {
      clear();
      if (reduced.matches || !("IntersectionObserver" in window)) return;
      intersection = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("site-motion-visible");
          intersection?.unobserve(entry.target);
        }
      }, {threshold: 0.06, rootMargin: "0px 0px -30px 0px"});
      queueScan();
    };

    setup();
    mutation = new MutationObserver(queueScan);
    mutation.observe(document.getElementById("root") ?? document.body, {childList: true, subtree: true});
    reduced.addEventListener("change", setup);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      mutation?.disconnect();
      reduced.removeEventListener("change", setup);
      clear();
    };
  }, []);
  return null;
}

"use client";

import { useEffect, useRef, useState } from "react";

function MenuIcon({ close = false }: { close?: boolean }) {
  return <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d={close ? "M8 8 20 20M20 8 8 20" : "M5 8h18M5 14h18M5 20h18"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

function ThemeToggle({ dark, ready, onToggle, inMenu = false, fade = 0 }: { dark: boolean; ready: boolean; onToggle: () => void; inMenu?: boolean; fade?: number }) {
  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  const hidden = !inMenu && fade >= 1;
  return <button type="button" className={`theme-toggle${inMenu ? " theme-toggle-menu" : ""}`} style={!inMenu ? { opacity: ready ? 1 - fade : .65, pointerEvents: hidden ? "none" : undefined } : undefined} inert={hidden} aria-hidden={hidden || undefined} tabIndex={hidden ? -1 : undefined} onClick={onToggle} disabled={!ready} aria-label={label} title={label}>
    <svg className="theme-symbol theme-moon" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.7 13.2A8.8 8.8 0 0 1 10.8 3.3a8.8 8.8 0 1 0 9.9 9.9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
    <svg className="theme-symbol theme-sun" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
  </button>;
}

function MenuSymbol({ name }: { name: "about" | "contact" | "publication" | "explore" | "home" }) {
  const paths = {
    about: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>,
    contact: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    publication: <><path d="M12 6c-3.4-2-6.3-2-9-1v14c3-.9 6-.8 9 1 3-1.8 6-1.9 9-1V5c-2.7-1-5.6-1-9 1Z" /><path d="M12 6v14" /></>,
    explore: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.5 4.5-4.5 2.5 2.5-4.5 4.5-2.5Z" /></>,
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" /><path d="M9 21v-8h6v8" /></>
  };
  return <svg className="menu-symbol" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function SiteHeader() {
  const dialog = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousOverflow = useRef("");
  const [closing, setClosing] = useState(false);
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);
  const [themeFade, setThemeFade] = useState(0);
  const [profilePhoto, setProfilePhoto] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("https://serazul-backend.vercel.app/api/public/profile", {
      signal: controller.signal, credentials: "omit", cache: "default"
    }).then(response => {
      if (!response.ok) throw new Error("Profile unavailable");
      return response.json();
    }).then(data => {
      if (!controller.signal.aborted && typeof data.url === "string" && /^https:\/\//.test(data.url)) {
        setProfilePhoto(data.url);
      }
    }).catch(() => {/* The placeholder remains when no photo has been assigned. */});
    return () => controller.abort();
  }, []);

  const isAboutPage = typeof window !== "undefined" && window.location.pathname.endsWith("/about.html");
  const homeHref = isAboutPage ? "/" : "#home";
  const sectionHref = (section: string) => isAboutPage ? `/${section}` : section;

  const brand = <><span className="brand-mark brand-avatar" aria-hidden="true">
    {profilePhoto ? <img src={profilePhoto} alt="" decoding="async" referrerPolicy="no-referrer" onError={() => setProfilePhoto("")} /> :
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="24" cy="17" r="8" fill="currentColor" opacity=".58" /><path d="M8 43c1-11 7-16 16-16s15 5 16 16" fill="currentColor" opacity=".58" /></svg>}
  </span><span className="brand-name">Serazul Hoque
    <svg className="brand-check" viewBox="0 0 24 24" role="img" aria-label="Blue check decoration">
      <path fill="#1877F2" d="m12 1.2 2.8 1.7 3.3-.1 1.5 3 3 1.6-.1 3.3 1.5 2.9-1.7 2.8.1 3.3-3 1.5-1.6 3-3.3-.1-2.5 1.5-2.9-1.7-3.3.1-1.5-3-3-1.6.1-3.3L1 13.2l1.7-2.8-.1-3.3 3-1.5 1.6-3 3.3.1L12 1.2Z" transform="translate(1.4 1.4) scale(.89)" />
      <path d="m7.2 12.2 3.1 3.1 6.6-6.7" stroke="white" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  </span></>;

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setThemeFade(Math.min(1, Math.max(0, window.scrollY / 160)));
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (frame) window.cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function syncTheme() {
      let saved: string | null = null;
      try { saved = window.localStorage.getItem("serazul-theme"); } catch { /* Theme still works when storage is unavailable. */ }
      const next = saved === "dark" || saved === "light" ? saved : media.matches ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      setDark(next === "dark");
    }
    syncTheme();
    setReady(true);
    const syncStorage = (event: StorageEvent) => { if (event.key === "serazul-theme" || event.key === null) syncTheme(); };
    media.addEventListener("change", syncTheme);
    window.addEventListener("storage", syncStorage);
    return () => { media.removeEventListener("change", syncTheme); window.removeEventListener("storage", syncStorage); };
  }, []);

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setDark(next === "dark");
    try { window.localStorage.setItem("serazul-theme", next); } catch { /* Use the chosen theme for this visit. */ }
  }

  function openMenu() {
    if (!dialog.current || dialog.current.open) return;
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setClosing(false);
    dialog.current.showModal();
  }

  function closeMenu(href?: string) {
    if (!dialog.current?.open || timer.current) return;
    setClosing(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timer.current = setTimeout(() => {
      dialog.current?.close();
      document.body.style.overflow = previousOverflow.current;
      setClosing(false);
      timer.current = null;
      if (href) {
        const target = document.querySelector<HTMLElement>(href);
        target?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
        target?.focus({ preventScroll: true });
        const heading = target?.querySelector<HTMLElement>("[data-reveal]");
        if (!reduced) heading?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, easing: "ease-in-out" });
        window.history.pushState(null, "", href);
      }
    }, reduced ? 0 : 300);
  }

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1001px)");
    const resize = () => { if (desktop.matches && dialog.current?.open) closeMenu(); };
    desktop.addEventListener("change", resize);
    return () => {
      desktop.removeEventListener("change", resize);
      if (timer.current) clearTimeout(timer.current);
      if (dialog.current?.open) document.body.style.overflow = previousOverflow.current;
    };
  }, []);

  function follow(event: React.MouseEvent<HTMLAnchorElement>) {
    const href = event.currentTarget.getAttribute("href") || "#home";
    if (!href.startsWith("#")) return;
    event.preventDefault();
    closeMenu(href);
  }

  return <>
    <header className="site-header wrap">
      <a className="wordmark" href={homeHref} aria-label="Serazul Hoque home">{brand}</a>
      <div className="header-actions"><nav className="desktop-nav" aria-label="Main navigation">
        <a href="/about.html">About me</a><a href={sectionHref("#contact")}>Get in touch</a><a href={sectionHref("#articles")}>Publication</a><a href={sectionHref("#explorations")}>What I’m exploring</a>
      </nav><ThemeToggle dark={dark} ready={ready} onToggle={toggleTheme} fade={themeFade} /></div>
      <button className="menu-orb" onClick={openMenu} disabled={!ready} aria-haspopup="dialog" aria-controls="portfolio-menu" aria-label="Open menu"><MenuIcon /></button>
    </header>
    <dialog ref={dialog} id="portfolio-menu" className={`menu-dialog${closing ? " is-closing" : ""}`} aria-labelledby="menu-title" onCancel={e => { e.preventDefault(); closeMenu(); }}>
      <div className="menu-panel">
        <a className="wordmark menu-wordmark" href="#home" onClick={follow} aria-label="Serazul Hoque home">{brand}</a>
        <button className="menu-orb menu-close" onClick={() => closeMenu()} aria-label="Close menu" autoFocus><MenuIcon close /></button>
        <ThemeToggle dark={dark} ready={ready} onToggle={toggleTheme} inMenu />
        <h2 id="menu-title" className="sr-only">Explore Serazul’s portfolio</h2>
        <nav className="menu-links" aria-label="Portfolio navigation">
          <a href="/about.html"><span className="menu-item-label">About me</span><MenuSymbol name="about" /></a>
          <a href={sectionHref("#contact")} onClick={follow}><span className="menu-item-label">Get in touch</span><MenuSymbol name="contact" /></a>
          <a href={sectionHref("#articles")} onClick={follow}><span className="menu-item-label">Publication</span><MenuSymbol name="publication" /></a>
          <a href={sectionHref("#explorations")} onClick={follow}><span className="menu-item-label">What I am exploring</span><MenuSymbol name="explore" /></a>
          <a href={homeHref} onClick={follow}><span className="menu-item-label">HOME</span><MenuSymbol name="home" /></a>
          <span className="menu-note">Engineering Student with a purpose.</span>
        </nav>
        <span className="menu-watermark" aria-hidden="true">sh.</span>
      </div>
    </dialog>
  </>;
}

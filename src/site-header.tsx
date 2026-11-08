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

export default function SiteHeader() {
  const dialog = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousOverflow = useRef("");
  const [closing, setClosing] = useState(false);
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);
  const [themeFade, setThemeFade] = useState(0);

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
    event.preventDefault();
    closeMenu(event.currentTarget.getAttribute("href") || "#home");
  }

  return <>
    <header className="site-header wrap">
      <a className="wordmark" href="#home" aria-label="Serazul Hoque home"><span className="brand-mark">s<span>.</span></span><span>Serazul Hoque</span></a>
      <div className="header-actions"><nav className="desktop-nav" aria-label="Main navigation">
        <a href="#about">About me</a><a href="#explorations">What I’m exploring</a><a className="desktop-project" href="#project"><span aria-hidden="true">→</span> The big idea</a>
      </nav><ThemeToggle dark={dark} ready={ready} onToggle={toggleTheme} fade={themeFade} /></div>
      <button className="menu-orb" onClick={openMenu} disabled={!ready} aria-haspopup="dialog" aria-controls="portfolio-menu" aria-label="Open menu"><MenuIcon /></button>
    </header>
    <dialog ref={dialog} id="portfolio-menu" className={`menu-dialog${closing ? " is-closing" : ""}`} aria-labelledby="menu-title" onCancel={e => { e.preventDefault(); closeMenu(); }}>
      <div className="menu-panel">
        <a className="wordmark menu-wordmark" href="#home" onClick={follow} aria-label="Serazul Hoque home"><span className="brand-mark">s<span>.</span></span><span>Serazul Hoque</span></a>
        <button className="menu-orb menu-close" onClick={() => closeMenu()} aria-label="Close menu" autoFocus><MenuIcon close /></button>
        <ThemeToggle dark={dark} ready={ready} onToggle={toggleTheme} inMenu />
        <h2 id="menu-title" className="sr-only">Explore Serazul’s portfolio</h2>
        <nav className="menu-links" aria-label="Portfolio navigation">
          <a href="#about" onClick={follow}>About me</a>
          <div className="menu-link-group"><a href="#project" onClick={follow}>The big idea</a><a className="menu-sublink" href="#project" onClick={follow}>Rohingya Voice</a></div>
          <div className="menu-link-group"><a href="#explorations" onClick={follow}>What I’m exploring</a><a className="menu-sublink" href="#explorations" onClick={follow}>Software · AI · Learning</a></div>
          <a href="#home" onClick={follow}>Back to the beginning</a>
          <span className="menu-note">Engineering Student with a purpose.</span>
        </nav>
        <span className="menu-watermark" aria-hidden="true">sh.</span>
      </div>
    </dialog>
  </>;
}

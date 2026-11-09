"use client";
import { useEffect, useRef, useState } from "react";
import SiteHeader from "./site-header";

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h15m-6-6 6 6-6 6"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function HeroPhoto() {
  const [photo,setPhoto]=useState<{url:string;alt:string}|null>(null);
  useEffect(()=>{
    const controller=new AbortController();
    fetch("https://serazul-backend.vercel.app/api/public/homepage-photo",{
      signal:controller.signal,credentials:"omit",cache:"no-store"
    }).then(response=>{
      if(!response.ok)throw new Error("Photo unavailable");
      return response.json();
    }).then(data=>{
      if(controller.signal.aborted)return;
      if(typeof data?.url==="string" && /^https:\/\//.test(data.url)){
        setPhoto({url:data.url,alt:typeof data.alt==="string"?data.alt:"Portrait of Serazul Hoque"});
      }
    }).catch(()=>{/* Show the neutral photo placeholder when no image is available. */});
    return ()=>controller.abort();
  },[]);
  return <div className="hero-photo" data-reveal>
    {photo
      ? <img src={photo.url} alt={photo.alt} referrerPolicy="no-referrer" onError={()=>setPhoto(null)} />
      : <div className="hero-photo-placeholder" role="img" aria-label="A personal photo will appear here">
          <span className="hero-photo-placeholder-mark" aria-hidden="true">SH.</span>
          <span className="hero-photo-placeholder-note">A PERSONAL PORTRAIT</span>
        </div>}
  </div>;
}

// Public content needs no password, Supabase key or admin token.
const ARTICLES_API = "https://serazul-backend.vercel.app/api/public/articles";
type PublishedArticle = { id: string; title: string; document: unknown; published_at: string | null };

function ArticleDocument({ content }: { content: unknown }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    const tags = new Set(["p", "div", "span", "strong", "b", "em", "i", "br", "ul", "ol", "li", "h2", "h3", "blockquote"]);
    const fonts = ["system-ui, sans-serif", "Arial, sans-serif", "Georgia, serif", "Times New Roman, serif", "Verdana, sans-serif", "Courier New, monospace", "Inter, system-ui, sans-serif", "Roboto, Arial, sans-serif", "Playfair Display, Georgia, serif", "Open Sans, Arial, sans-serif", "Montserrat, Arial, sans-serif", "Cardo, Georgia, serif"];
    const normalize = (value: string) => value.replace(/["'\s]/g, "").toLowerCase();
    let nodes = 0, characters = 0;
    function append(parent: Node, item: unknown, depth: number) {
      if (nodes >= 3000 || depth > 20 || !item || typeof item !== "object" || Array.isArray(item)) return;
      nodes++;
      const node = item as Record<string, unknown>;
      if (node.type === "text") {
        const text = typeof node.text === "string" ? node.text.slice(0, Math.max(0, 20000 - characters)) : "";
        characters += text.length;
        parent.appendChild(document.createTextNode(text));
        return;
      }
      if (typeof node.type !== "string" || !tags.has(node.type)) return;
      const element = document.createElement(node.type);
      if (node.styles && typeof node.styles === "object" && !Array.isArray(node.styles)) {
        const styles = node.styles as Record<string, unknown>;
        // Deliberately copy only these style properties. No raw HTML, CSS or URLs.
        if (typeof styles.fontFamily === "string") {
          const family = fonts.find(font => normalize(font) === normalize(styles.fontFamily as string));
          if (family) element.style.fontFamily = family;
        }
        if (typeof styles.fontSize === "string" && /^\d+(\.\d+)?px$/.test(styles.fontSize) && parseFloat(styles.fontSize) >= 8 && parseFloat(styles.fontSize) <= 96) element.style.fontSize = styles.fontSize;
        if (typeof styles.fontWeight === "string" && ["normal", "bold", "400", "700"].includes(styles.fontWeight)) element.style.fontWeight = styles.fontWeight;
        if (typeof styles.fontStyle === "string" && ["normal", "italic"].includes(styles.fontStyle)) element.style.fontStyle = styles.fontStyle;
        if (typeof styles.textAlign === "string" && ["left", "center", "right", "justify"].includes(styles.textAlign)) element.style.textAlign = styles.textAlign;
        if (typeof styles.color === "string") {
          const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/.exec(styles.color);
          if (/^#[\da-f]{6}$/i.test(styles.color) || (rgb && rgb.slice(1).every(value => Number(value) <= 255))) element.style.color = styles.color;
        }
      }
      if (node.type !== "br" && Array.isArray(node.children)) {
        for (const child of node.children) { if (nodes >= 3000) break; append(element, child, depth + 1); }
      }
      parent.appendChild(element);
    }
    const fragment = document.createDocumentFragment();
    for (const item of Array.isArray(content) ? content : [content]) { if (nodes >= 3000) break; append(fragment, item, 0); }
    container.current.replaceChildren(fragment);
  }, [content]);
  return <div ref={container} className="published-article-body" />;
}

function PublishedArticles() {
  const [articles, setArticles] = useState<PublishedArticle[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const limit = 8;
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setLoading(true); setError(""); setArticles([]);
    async function load() {
      try {
        const response = await fetch(`${ARTICLES_API}?page=${page}&limit=${limit}`, { signal: controller.signal, credentials: "omit", cache: "no-store" });
        if (!response.ok) throw new Error("Articles unavailable");
        const data = await response.json();
        if (!Array.isArray(data.items) || !Number.isInteger(data.total) || data.total < 0) throw new Error("Invalid article response");
        const items: PublishedArticle[] = data.items.slice(0, limit).filter((item: unknown) => {
          if (!item || typeof item !== "object") return false;
          const article = item as Record<string, unknown>;
          return typeof article.id === "string" && typeof article.title === "string" && article.status === "published";
        });
        if (active) { setArticles(items); setTotal(data.total); }
      } catch {
        if (active) setError("Articles couldn’t load right now. Please try again.");
      } finally {
        clearTimeout(timeout);
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [page, retry]);

  return <section id="articles" className="published-articles wrap section-space" aria-labelledby="articles-title" tabIndex={-1}>
    <style>{`
      .published-articles{border-top:1px solid var(--line)}
      .published-articles>h2{font-family:var(--font-display);font-size:clamp(36px,5vw,58px);font-weight:400;line-height:1.15;margin:24px 0 12px}
      .published-articles-intro{color:var(--muted);font-size:17px;line-height:1.6;margin-bottom:30px}
      .published-articles-list{display:grid;gap:24px}
      .published-article{min-width:0;border:1px solid var(--line);border-radius:14px;overflow:hidden}
      .published-article-heading{padding:24px clamp(18px,4vw,32px)}
      .published-article-heading h3{font-family:var(--font-display);font-size:clamp(26px,3vw,36px);font-weight:400;line-height:1.25;overflow-wrap:anywhere}
      .published-article-heading time{display:block;font-size:12px;color:var(--muted);margin-top:10px}
      .published-article-body{padding:24px clamp(18px,4vw,32px);background:#fffdf6;color:#20251e;font:17px/1.7 Georgia,serif;overflow-wrap:anywhere;white-space:pre-wrap}
      .published-article-body p,.published-article-body div{margin:0 0 12px}
      .published-article-body>:last-child{margin-bottom:0}
      .published-article-body ul{list-style:disc;padding-left:1.5em}
      .published-article-body ol{list-style:decimal;padding-left:1.5em}
      .published-article-body strong,.published-article-body b{font-weight:700}
      .published-article-body em,.published-article-body i{font-style:italic}
      .published-article-body h2{font-size:1.5em;margin:16px 0 10px}
      .published-article-body h3{font-size:1.25em;margin:16px 0 10px}
      .published-article-body blockquote{border-left:3px solid #a6be79;padding-left:16px;margin:16px 0}
      .published-articles-status{padding:20px 0;color:var(--muted);line-height:1.6}
      .published-articles-pagination{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:24px}
      .published-articles-pagination button:disabled{opacity:.45;cursor:default}
    `}</style>
    <div className="section-label"><span>03 / NOTES ALONG THE WAY</span><span className="small-line" /></div>
    <h2 id="articles-title">Latest writing.</h2>
    <p className="published-articles-intro">Thoughts, discoveries, and things I’m learning.</p>
    <div aria-busy={loading}>
      {loading && <p className="published-articles-status" role="status">Loading articles…</p>}
      {error && <div className="published-articles-status" role="status"><p>{error}</p><button type="button" className="button button-dark" onClick={() => setRetry(value => value + 1)}>Try again</button></div>}
      {!loading && !error && articles.length === 0 && <p className="published-articles-status">No articles on this page yet.</p>}
      <div className="published-articles-list">{articles.map(article => {
        const date = typeof article.published_at === "string" ? new Date(article.published_at) : null;
        const validDate = date && !Number.isNaN(date.getTime());
        return <article className="published-article" key={article.id}>
          <header className="published-article-heading"><h3>{article.title}</h3>{validDate && <time dateTime={date.toISOString()}>{date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</time>}</header>
          <ArticleDocument content={article.document} />
        </article>;
      })}</div>
    </div>
    {!error && (page > 1 || total > limit) && <nav className="published-articles-pagination" aria-label="Article pages">
      <button type="button" className="button button-dark" disabled={loading || page === 1} onClick={() => setPage(value => value - 1)}>Previous</button>
      <span>Page {page}</span>
      <button type="button" className="button button-dark" disabled={loading || page * limit >= total} onClick={() => setPage(value => value + 1)}>Next</button>
    </nav>}
  </section>;
}


type PageSections = {
  hero_line_one: string;
  hero_line_two: string;
  hero_phrase: string;
  hero_emphasis: string;
  hero_intro: string;
  about_line_one: string;
  about_line_two: string;
  about_paragraph_one: string;
  about_paragraph_two: string;
  contact_heading: string;
  contact_paragraph: string;
};
const DEFAULT_PAGE_SECTIONS: PageSections = {
  hero_line_one: "Engineering",
  hero_line_two: "Student",
  hero_phrase: "with a",
  hero_emphasis: "purpose",
  hero_intro: "Hi, I’m Serazul. A software engineering student drawn to useful AI, accessible technology, and the possibilities of a voice being understood.",
  about_line_one: "Learning the craft.",
  about_line_two: "Keeping people in mind.",
  about_paragraph_one: "I’m pursuing software engineering because I want to turn ideas into things people can use. Right now, that means learning the foundations, asking questions, and connecting the small steps to a bigger goal.",
  about_paragraph_two: "One idea keeps me curious: an AI people can talk to in Rohingya. It brings together my interest in technology and a language that matters to me. This is where I’m beginning.",
  contact_heading: "Let's connect.",
  contact_paragraph: "Have a question, idea, or something you'd like to discuss?"
};

export default function Home() {
  const [notice, setNotice] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [followOpen, setFollowOpen] = useState(false);
  const [pageCopy, setPageCopy] = useState<PageSections>(DEFAULT_PAGE_SECTIONS);
  useEffect(() => {
    const controller = new AbortController();
    fetch("https://serazul-backend.vercel.app/api/public/settings", { signal: controller.signal, credentials: "omit" })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(settings => {
        if (!controller.signal.aborted && typeof settings.contact_email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contact_email)) {
          setContactEmail(settings.contact_email);
        }
      }).catch(() => {/* No public address has been configured. */});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("https://serazul-backend.vercel.app/api/public/sections", {
      signal:controller.signal,credentials:"omit",cache:"no-store"
    }).then(response => {
      if(!response.ok)throw new Error("Sections unavailable");
      return response.json();
    }).then(data => {
      if(controller.signal.aborted || !data || typeof data !== "object")return;
      const next:PageSections = {...DEFAULT_PAGE_SECTIONS};
      const keys=(Object.keys(DEFAULT_PAGE_SECTIONS) as Array<keyof PageSections>);
      for(const key of keys) {
        const value=data[key];
        if(typeof value === "string" && value.trim().length > 0 &&
           value.length <= (key.includes("paragraph") || key === "hero_intro" ? 2500 : 160)) next[key]=value;
      }
      setPageCopy(next);
    }).catch(() => { /* Preserve existing text if the page-content API is unavailable. */ });
    return () => controller.abort();
  }, []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 3200); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08, rootMargin: "0px 0px -24px 0px" });
    elements.forEach(el => { el.classList.add("reveal-ready"); observer.observe(el); });
    const showAll = () => { if (reduced.matches) elements.forEach(el => el.classList.add("is-visible")); };
    reduced.addEventListener("change", showAll);
    return () => { observer.disconnect(); reduced.removeEventListener("change", showAll); elements.forEach(el => el.classList.remove("reveal-ready", "is-visible")); };
  }, []);

  async function copy(text: string, success: string) {
    try { await navigator.clipboard.writeText(text); setNotice(success); }
    catch { setNotice("Copy unavailable in this browser. You can copy the link from your address bar."); }
  }


  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <SiteHeader />
    <main id="main">
      <section className="hero wrap" id="home" tabIndex={-1}>
        <div className="hero-copy" data-reveal>
          <p className="eyebrow"><span className="status-dot" /> LEARNING. EXPLORING. BUILDING A DIRECTION.</p>
          <h1>{pageCopy.hero_line_one}{" "}<br />{pageCopy.hero_line_two}{" "}<span className="hero-purpose">{pageCopy.hero_phrase} <em>{pageCopy.hero_emphasis}</em><span className="green-period">.</span></span></h1>
          <p className="hero-intro">{pageCopy.hero_intro}</p>
          <a className="button button-dark" href="#contact">Get in touch <Arrow diagonal /></a>
          <a className="subtle-link" href="#about">A little about me <span aria-hidden="true">↓</span></a>
        </div><HeroPhoto />
      </section>
      <div className="intro-strip wrap"><span>A PERSONAL CORNER OF THE INTERNET</span><p>Curiosity in the details. <em>Purpose in the bigger picture.</em></p><span className="strip-star" aria-hidden="true">✳</span></div>
      <section className="about-section wrap section-space" id="about" tabIndex={-1}>
        <div className="section-label"><span>01 / A LITTLE CONTEXT</span><span className="small-line" /></div>
        <div className="about-main" data-reveal><h2>{pageCopy.about_line_one}<br /><em>{pageCopy.about_line_two}</em></h2><div className="about-columns"><p>{pageCopy.about_paragraph_one}</p><p>{pageCopy.about_paragraph_two}</p></div><div className="about-signature"><span className="handwriting">Serazul.</span><span>STUDENT · CURIOUS BY DEFAULT</span></div></div>
      </section>
      <section className="focus-section wrap section-space" id="explorations" tabIndex={-1}>
        <div className="section-label"><span>02 / BUILDING THE FOUNDATIONS</span><span className="small-line" /></div>
        <div className="focus-main"><div className="focus-heading" data-reveal><h2>Small steps.<br /><em>A bigger direction.</em></h2><p>The things I’m learning and the questions I want to keep exploring.</p></div><div className="focus-list">
          <article data-reveal><span className="focus-index">01</span><div><h3>Software foundations</h3><p>C, pseudocode, flowcharts, and the logic that helps turn a problem into a program.</p><span className="focus-tag">CURRENT LEARNING</span></div><span className="focus-symbol" aria-hidden="true">{`{ }`}</span></article>
          <article data-reveal><span className="focus-index">02</span><div><h3>AI with a practical purpose</h3><p>How could existing AI models become part of a useful, language-centered experience?</p><span className="focus-tag">AN OPEN QUESTION</span></div><span className="focus-symbol" aria-hidden="true">✳</span></article>
          <article data-reveal><span className="focus-index">03</span><div><h3>Clearer ways to learn</h3><p>Interactive examples, visual explanations, and making complicated ideas easier to approach.</p><span className="focus-tag">A PERSONAL INTEREST</span></div><span className="focus-symbol" aria-hidden="true"><Arrow diagonal /></span></article>
        </div></div>
      </section>
      <PublishedArticles />
      <section id="contact" className="contact-section wrap section-space" tabIndex={-1} aria-labelledby="contact-title">
        <div className="section-label"><span>04 / GET IN TOUCH</span><span className="small-line" /></div>
        <h2 id="contact-title">{pageCopy.contact_heading}</h2>
        <p>{pageCopy.contact_paragraph}</p>
        <div className="contact-actions">
          {contactEmail ? <a className="button button-dark" href={`mailto:${contactEmail}`}>Send an email <Arrow diagonal /></a> :
            <p className="contact-placeholder">Contact details will appear here when added in Site Settings.</p>}
          <button type="button" className="button button-outline" aria-expanded={followOpen} aria-controls="contact-social-links" onClick={() => setFollowOpen(open => !open)}>
            Follow me <span className="follow-chevron" aria-hidden="true">{followOpen ? "−" : "+"}</span>
          </button>
        </div>
        <nav id="contact-social-links" className="contact-social-links" aria-label="My social media profiles" hidden={!followOpen}>
          <a href="https://www.facebook.com/iamserazulhoque" target="_blank" rel="noopener noreferrer">Facebook <Arrow diagonal /></a>
          <a href="https://www.linkedin.com/in/iamserazulhoque" target="_blank" rel="noopener noreferrer">LinkedIn <Arrow diagonal /></a>
          <a href="https://www.x.com/Serazul_Hoque" target="_blank" rel="noopener noreferrer">X (Twitter) <Arrow diagonal /></a>
          <a href="https://www.instagram.com/iamserazulhoque" target="_blank" rel="noopener noreferrer">Instagram <Arrow diagonal /></a>
        </nav>
      </section>
      <section className="closing-section wrap" data-reveal><div className="closing-star" aria-hidden="true">✳</div><p className="eyebrow">STILL EARLY. ALREADY CURIOUS.</p><h2>Good software begins<br />with a <em>human question.</em></h2><p>Mine is how to help more people be understood.<br />This portfolio is a starting point for that journey.</p><button className="button button-dark" onClick={() => copy(new URL("./", window.location.href).href, "Portfolio link copied.")}>Share this portfolio <Arrow diagonal /></button></section>
    </main>
    <footer className="site-footer wrap"><a className="footer-name" href="#home">Serazul Hoque<span>Engineering Student with a purpose.</span></a><span>© 2026 · A WORK IN PROGRESS, WITH INTENTION.</span><a className="back-top" href="#home">Back to top ↑</a></footer>
    <div className={notice ? "toast visible" : "toast"} role="status" aria-live="polite">{notice}</div>
  </>;
}

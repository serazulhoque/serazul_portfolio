"use client";
import { useEffect, useRef, useState } from "react";
import SiteHeader from "./site-header";
import PortfolioAssistant from "./portfolio-assistant";
import VisitAnalytics from "./visit-analytics";
import {useSiteContent,textValue,ContentStories,type SiteEntry} from "./site-content";

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h15m-6-6 6 6-6 6"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function HeroPhoto() {
  const [photo,setPhoto]=useState<{url:string;alt:string}|null>(null);
  useEffect(()=>{
    const controller=new AbortController();
    fetch("https://serazul-backend.vercel.app/api/public/homepage-photo",{
      signal:controller.signal,credentials:"omit",cache:"default"
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
      ? <img src={photo.url} alt={photo.alt} decoding="async" fetchPriority="high" referrerPolicy="no-referrer" onError={()=>setPhoto(null)} />
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

function PublishedArticles({labels}: {labels:Record<string,string>}) {
  const [articles, setArticles] = useState<PublishedArticle[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    async function load() {
      try {
        const all: PublishedArticle[] = [];
        for (let page = 1; page <= 200; page++) {
          const response = await fetch(`${ARTICLES_API}?page=${page}&limit=50`, {
            signal: controller.signal, credentials: "omit", cache: "no-store"
          });
          if (!response.ok) throw new Error("Articles unavailable");
          const data = await response.json();
          if (!Array.isArray(data.items) || !Number.isInteger(data.total) || data.total < 0)
            throw new Error("Invalid article response");
          for (const item of data.items) {
            if (item && typeof item.id === "string" && typeof item.title === "string" && item.status === "published")
              all.push(item as PublishedArticle);
          }
          if (all.length >= data.total || data.items.length === 0) break;
        }
        if (!controller.signal.aborted) {
          setArticles(all);
          setSelected(null);
        }
      } catch {
        if (!controller.signal.aborted) setError("Articles couldn’t load right now. Please try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [retry]);

  const current = selected === null ? null : articles[selected];
  const move = (direction: number) => setSelected(index =>
    index === null ? null : Math.max(0, Math.min(articles.length - 1, index + direction))
  );
  const displayDate = (value: string | null) => {
    const date = typeof value === "string" ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
      : null;
  };

  return <section id="articles" className="published-articles wrap section-space" aria-labelledby="articles-title" tabIndex={-1}>
    <style>{`
      .published-articles{border-top:1px solid var(--line)}
      .published-articles>h2{font-family:var(--font-display);font-size:clamp(36px,5vw,58px);font-weight:400;line-height:1.15;margin:24px 0 12px}
      .published-articles-intro{color:var(--muted);font-size:17px;line-height:1.6;margin-bottom:30px}
      .published-articles-list{display:grid;gap:0}
      .published-article-title{display:flex;width:100%;align-items:center;justify-content:space-between;gap:20px;text-align:left;background:transparent;border:0;border-bottom:1px solid var(--line);color:inherit;padding:22px 4px;cursor:pointer}
      .published-article-title:first-child{border-top:1px solid var(--line)}
      .published-article-title:hover,.published-article-title:focus-visible{color:var(--accent)}
      .published-article-title strong{font-family:var(--font-display);font-size:clamp(21px,2.8vw,30px);font-weight:400;overflow-wrap:anywhere}
      .published-article-title small{display:block;color:var(--muted);font-size:12px;margin-top:7px}
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
      .published-reader-controls{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin:0 0 18px}
      .published-reader-navigation{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-top:18px}
      .published-reader-navigation button:disabled{opacity:.4;cursor:default}
      .published-reader-hint{font-size:12px;color:var(--muted)}
    `}</style>
    <div className="section-label"><span>{textValue(labels,"publications_label","03 / NOTES ALONG THE WAY")}</span><span className="small-line" /></div>
    <h2 id="articles-title">{textValue(labels,"publications_heading","Latest writing.")}</h2>
    <p className="published-articles-intro">{textValue(labels,"publications_intro","Thoughts, discoveries, and things I’m learning.")}</p>
    <div aria-busy={loading}>
      {loading && <p className="published-articles-status" role="status">Loading articles…</p>}
      {error && <div className="published-articles-status" role="status"><p>{error}</p><button type="button" className="button button-dark" onClick={() => setRetry(value => value + 1)}>Try again</button></div>}
      {!loading && !error && articles.length === 0 && <p className="published-articles-status">No published articles yet.</p>}
      {!loading && !error && selected === null && <div className="published-articles-list">
        {articles.map((article, index) => <button key={article.id} type="button" className="published-article-title" onClick={() => setSelected(index)}>
          <span><strong>{article.title}</strong>{displayDate(article.published_at) && <small>{displayDate(article.published_at)}</small>}</span>
          <span aria-hidden="true">↗</span>
        </button>)}
      </div>}
      {!loading && !error && current && <div>
        <div className="published-reader-controls">
          <button type="button" className="button button-dark" onClick={() => setSelected(null)}>← All article titles</button>
          <span className="published-reader-hint">Article {selected! + 1} of {articles.length}</span>
        </div>
        <article className="published-article"
          onTouchStart={event => {const t=event.touches[0];touchStart.current=t?{x:t.clientX,y:t.clientY}:null;}}
          onTouchEnd={event => {
            const first=touchStart.current;
            const t=event.changedTouches[0];
            touchStart.current=null;
            if (!first || !t) return;
            const dx=t.clientX-first.x,dy=t.clientY-first.y;
            if (Math.abs(dx)>65 && Math.abs(dx)>Math.abs(dy)*1.4) move(dx<0?1:-1);
          }}>
          <header className="published-article-heading">
            <h3>{current.title}</h3>
            {displayDate(current.published_at) && <time>{displayDate(current.published_at)}</time>}
          </header>
          <ArticleDocument content={current.document} />
        </article>
        <nav className="published-reader-navigation" aria-label="Article navigation">
          <button type="button" className="button button-dark" disabled={selected === 0} onClick={() => move(-1)}>← Previous</button>
          <span className="published-reader-hint">Swipe left or right to read another article</span>
          <button type="button" className="button button-dark" disabled={selected === articles.length-1} onClick={() => move(1)}>Next →</button>
        </nav>
      </div>}
    </div>
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

function Home() {
  const {items,entriesLoaded,labels}=useSiteContent();
  const t=(key:string,fallback:string)=>textValue(labels,key,fallback);
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
    <VisitAnalytics />
    <main id="main">
      <section className="hero wrap" id="home" tabIndex={-1}>
        <div className="hero-copy" data-reveal>
          <p className="eyebrow"><span className="status-dot" /> {t("hero_eyebrow","LEARNING. EXPLORING. BUILDING A DIRECTION.")}</p>
          <h1>{pageCopy.hero_line_one}{" "}<br />{pageCopy.hero_line_two}{" "}<span className="hero-purpose">{pageCopy.hero_phrase} <em>{pageCopy.hero_emphasis}</em><span className="green-period">.</span></span></h1>
          <p className="hero-intro">{pageCopy.hero_intro}</p>
          <a className="button button-dark" href="#contact">Get in touch <Arrow diagonal /></a>
          <a className="subtle-link" href="/about.html">A little about me <span aria-hidden="true">↗</span></a>
        </div><HeroPhoto />
      </section>
      <div className="intro-strip wrap"><span>{t("intro_label","A PERSONAL CORNER OF THE INTERNET")}</span><p>{t("intro_first","Curiosity in the details.")} <em>{t("intro_second","Purpose in the bigger picture.")}</em></p><span className="strip-star" aria-hidden="true">✳</span></div>
      <section className="focus-section wrap section-space" id="explorations" tabIndex={-1}>
        <div className="section-label"><span>{t("exploring_label","02 / BUILDING THE FOUNDATIONS")}</span><span className="small-line" /></div>
        <div className="focus-main"><div className="focus-heading" data-reveal><h2>{t("exploring_heading_one","Small steps.")}<br /><em>{t("exploring_heading_two","A bigger direction.")}</em></h2><p>{t("exploring_intro","The things I’m learning and the questions I want to keep exploring.")}</p></div><div className="focus-list">
          {entriesLoaded ? items.filter(i=>i.section==="exploring"&&i.kind==="story").map((item,index)=><article key={item.id}>
            <span className="focus-index">{String(index+1).padStart(2,"0")}</span>
            <div><h3>{item.title}</h3>{item.body&&<p>{item.body}</p>}{item.subtitle&&<p>{item.subtitle}</p>}<span className="focus-tag">{item.date_label}</span></div>
            <span className="focus-symbol" aria-hidden="true">{index===0?"{ }":index===1?"𝒮":"↗"}</span>
          </article>) : <>          <article data-reveal><span className="focus-index">01</span><div><h3>Software foundations</h3><p>C, pseudocode, flowcharts, and the logic that helps turn a problem into a program.</p><span className="focus-tag">CURRENT LEARNING</span></div><span className="focus-symbol" aria-hidden="true">{`{ }`}</span></article>
          <article data-reveal><span className="focus-index">02</span><div><h3>AI with a practical purpose</h3><p>How could existing AI models become part of a useful, language-centered experience?</p><span className="focus-tag">AN OPEN QUESTION</span></div><span className="focus-symbol" aria-hidden="true">✳</span></article>
          <article data-reveal><span className="focus-index">03</span><div><h3>Clearer ways to learn</h3><p>Interactive examples, visual explanations, and making complicated ideas easier to approach.</p><span className="focus-tag">A PERSONAL INTEREST</span></div><span className="focus-symbol" aria-hidden="true"><Arrow diagonal /></span></article>

          </>}
        </div></div>
      </section>
      <ContentStories items={items} section="home" />
      <PublishedArticles labels={labels} />
      <ContentStories items={items} section="publications" />
      <section id="contact" className="contact-section wrap section-space" tabIndex={-1} aria-labelledby="contact-title">
        <div className="section-label"><span>{t("contact_label","04 / GET IN TOUCH")}</span><span className="small-line" /></div>
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
          <a href={t("social_facebook","https://www.facebook.com/iamserazulhoque")} target="_blank" rel="noopener noreferrer">Facebook <Arrow diagonal /></a>
          <a href={t("social_linkedin","https://www.linkedin.com/in/iamserazulhoque")} target="_blank" rel="noopener noreferrer">LinkedIn <Arrow diagonal /></a>
          <a href={t("social_x","https://www.x.com/Serazul_Hoque")} target="_blank" rel="noopener noreferrer">X (Twitter) <Arrow diagonal /></a>
          <a href={t("social_instagram","https://www.instagram.com/iamserazulhoque")} target="_blank" rel="noopener noreferrer">Instagram <Arrow diagonal /></a>
        </nav>
      </section>
      <ContentStories items={items} section="contact" />
      <section className="closing-section wrap" data-reveal><div className="closing-star" aria-hidden="true">✳</div><p className="eyebrow">{t("closing_label","STILL EARLY. ALREADY CURIOUS.")}</p><h2>{t("closing_heading_one","Good software begins")}<br /><em>{t("closing_heading_two","with a human question.")}</em></h2><p>{t("closing_paragraph_one","Mine is how to help more people be understood.")}<br />{t("closing_paragraph_two","This portfolio is a starting point for that journey.")}</p><button className="button button-dark" onClick={() => copy(new URL("./", window.location.href).href, "Portfolio link copied.")}>Share this portfolio <Arrow diagonal /></button></section>
    </main>
    <footer className="site-footer wrap"><a className="footer-name" href="#home">Serazul Hoque<span>{t("footer_tagline","Engineering Student with a purpose.")}</span></a><span>{t("footer_note","© 2026 · A WORK IN PROGRESS, WITH INTENTION.")}</span><a className="back-top" href="#home">Back to top ↑</a></footer>
    <DesignerSignature />
    <div className={notice ? "toast visible" : "toast"} role="status" aria-live="polite">{notice}</div>
    <PortfolioAssistant />
  </>;
}

function DesignerSignature() {
  return <div className="designer-signature wrap" aria-label="Designed by Serazul Hoque">
    <span className="designer-signature-line" aria-hidden="true" />
    
    <span className="designer-signature-label">DESIGNED BY</span>
    <span className="designer-signature-name">Serazul <em>Hoque</em><span className="designer-signature-dot">.</span></span>
    <span className="designer-signature-line" aria-hidden="true" />
  </div>;
}

const journeyMilestones = [
  {
    number:"01", phase:"THE SPARK", title:"Curiosity became a direction",
    short:"Finding the question worth pursuing",
    detail:"I began with a simple interest in what technology could make possible. Over time, that curiosity became a bigger question: how can the things I build be genuinely useful to people?",
    symbol:"𝒮"
  },
  {
    number:"02", phase:"THE CHOICE", title:"Choosing software engineering",
    short:"Turning curiosity into a craft",
    detail:"I chose software engineering as the place to turn ideas into working tools. My focus is not just learning how to code, but understanding how to solve problems thoughtfully.",
    symbol:"{ }"
  },
  {
    number:"03", phase:"RIGHT NOW", title:"Building the foundations",
    short:"Learning the logic behind the code",
    detail:"I'm strengthening my foundations through C, pseudocode, flowcharts, and programming logic. Each small step is part of a much bigger direction.",
    symbol:"</>"
  },
  {
    number:"04", phase:"LOOKING AHEAD", title:"Making more voices understood",
    short:"Exploring useful, accessible AI",
    detail:"One idea I want to explore is conversational AI that can communicate in Rohingya. It brings together my interest in technology, language, and helping people feel understood. This is an ambition, not a completed project.",
    symbol:"↗"
  }
];

function JourneyTimeline({entries,entriesLoaded,labels}:{entries:SiteEntry[],entriesLoaded:boolean,labels:Record<string,string>}) {
  const [selected,setSelected]=useState(0);
  const timeline=entriesLoaded?entries.filter(item=>item.section==="about"&&item.kind==="timeline").map((item,index)=>({
    number:String(index+1).padStart(2,"0"),phase:item.date_label||"MILESTONE",title:item.title,
    short:item.subtitle,detail:item.body,symbol:index===0?"𝒮":index===1?"{ }":index===2?"</>":"↗"
  })):journeyMilestones;
  const current=timeline[selected]||timeline[0];
  if(!current)return null;
  return <section className="journey-section wrap section-space" id="my-journey" aria-labelledby="journey-title">
    <div className="section-label"><span>{textValue(labels,"journey_label","02 / THE PATH SO FAR")}</span><span className="small-line" /></div>
    <div className="journey-intro">
      <div><p className="journey-eyebrow">{textValue(labels,"journey_eyebrow","A JOURNEY STILL UNFOLDING")}</p><h2 id="journey-title">{textValue(labels,"journey_heading_one","Every step")}<br/><em>{textValue(labels,"journey_heading_two","has a story.")}</em></h2></div>
      <p>{textValue(labels,"journey_intro","No perfect straight line. Just curiosity, choices, lessons, and a direction worth following.")}</p>
    </div>
    <div className="journey-layout">
      <div className="journey-steps" aria-label="Explore journey milestones">
        {timeline.map((step,index)=><button type="button" key={step.number}
          className={"journey-step"+(selected===index?" is-active":"")}
          onClick={()=>setSelected(index)}
          aria-pressed={selected===index}
          aria-controls="journey-detail">
          <span className="journey-step-number">{step.number}</span>
          <span className="journey-step-copy"><small>{step.phase}</small><strong>{step.title}</strong></span>
          <span className="journey-step-arrow" aria-hidden="true">{selected===index?"↗":"→"}</span>
        </button>)}
      </div>
      <article className="journey-detail" id="journey-detail" aria-live="polite" aria-atomic="true">
        <div className="journey-detail-top"><span>CHAPTER {current.number} / {String(timeline.length).padStart(2,"0")}</span><span className="journey-detail-symbol" aria-hidden="true">{current.symbol}</span></div>
        <div className="journey-detail-body" key={current.number}>
          <p className="journey-detail-phase">{current.phase}</p>
          <h3>{current.title}</h3>
          <p className="journey-detail-short">{current.short}</p>
          <p className="journey-detail-description">{current.detail}</p>
        </div>
        <div className="journey-detail-bottom">
          <div className="journey-progress" aria-label={`Step ${selected+1} of ${timeline.length}`}>
            {timeline.map((step,index)=><span key={step.number} className={index<=selected?"filled":""} />)}
          </div>
          <div className="journey-controls">
            <button type="button" aria-label="Previous chapter" disabled={selected===0} onClick={()=>setSelected(v=>v-1)}>←</button>
            <button type="button" aria-label="Next chapter" disabled={selected===timeline.length-1} onClick={()=>setSelected(v=>v+1)}>→</button>
          </div>
        </div>
      </article>
    </div>
  </section>;
}

function AboutPage() {
  const {items,entriesLoaded,labels}=useSiteContent();
  const t=(key:string,fallback:string)=>textValue(labels,key,fallback);
  const [copy,setCopy] = useState({
    about_line_one: DEFAULT_PAGE_SECTIONS.about_line_one,
    about_line_two: DEFAULT_PAGE_SECTIONS.about_line_two,
    about_paragraph_one: DEFAULT_PAGE_SECTIONS.about_paragraph_one,
    about_paragraph_two: DEFAULT_PAGE_SECTIONS.about_paragraph_two
  });
  useEffect(() => {
    const controller = new AbortController();
    fetch("https://serazul-backend.vercel.app/api/public/sections", {
      signal: controller.signal, credentials: "omit", cache: "no-store"
    }).then(response => {
      if (!response.ok) throw new Error("About text unavailable");
      return response.json();
    }).then(data => {
      if (controller.signal.aborted || !data) return;
      setCopy(previous => {
        const next = {...previous};
        for (const key of Object.keys(next) as Array<keyof typeof next>) {
          if (typeof data[key] === "string" && data[key].trim() &&
              data[key].length <= (key.includes("paragraph") ? 2500 : 160)) next[key] = data[key];
        }
        return next;
      });
    }).catch(() => {/* Use the existing wording when offline. */});
    return () => controller.abort();
  }, []);
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <SiteHeader />
    <VisitAnalytics />
    <main id="main" className="about-page-main">
      <section className="about-section wrap section-space" id="about" tabIndex={-1}>
        <div className="section-label"><span>{t("about_label","01 / A LITTLE CONTEXT")}</span><span className="small-line" /></div>
        <div className="about-main">
          <h2>{copy.about_line_one}<br /><em>{copy.about_line_two}</em></h2>
          <div className="about-columns"><p>{copy.about_paragraph_one}</p><p>{copy.about_paragraph_two}</p></div>
          <div className="about-signature"><span className="handwriting">Serazul.</span><span>STUDENT · CURIOUS BY DEFAULT</span></div>
        </div>
      </section>
      <ContentStories items={items} section="about" />
      <JourneyTimeline entries={items} entriesLoaded={entriesLoaded} labels={labels} />
      <div className="journey-return wrap"><a className="subtle-link" href="/">← Back to homepage</a></div>
    </main>
    <footer className="site-footer wrap"><a className="footer-name" href="/">Serazul Hoque<span>{t("footer_tagline","Engineering Student with a purpose.")}</span></a><span>{t("footer_note","© 2026 · A WORK IN PROGRESS, WITH INTENTION.")}</span><a className="back-top" href="/">Back to home ↑</a></footer>
    <DesignerSignature />
    <PortfolioAssistant />
  </>;
}

export default function App() {
  return typeof window !== "undefined" && window.location.pathname.endsWith("/about.html")
    ? <AboutPage /> : <Home />;
}

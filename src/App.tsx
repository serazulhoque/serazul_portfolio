"use client";
import { useEffect, useRef, useState } from "react";
import {useLivePageCopy} from "./page-copy";
import {useSiteLayout,sectionOrder,styleFor,type LayoutConfig} from "./site-layout";
import {API_URL,requestJSON} from "./public-api";
import SiteHeader from "./site-header";
import Gallery from "./gallery";
import SiteDesign from "./site-design";
import PortfolioAssistant from "./portfolio-assistant";
import VisitorWall from "./visitor-wall";
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
const ARTICLES_API = API_URL + "/articles";
type PublishedArticle = { id: string; title: string; document: unknown; published_at: string | null };
function postSlug(title:string){
  return title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,110)||"post";
}
function postUrl(article:PublishedArticle){
  return "/blog/"+postSlug(article.title);
}
function selectedPostIndex(articles:PublishedArticle[]){
  const match=window.location.pathname.match(/^\/blog\/([^/]+)\/?$/);
  if(!match)return null;
  const index=articles.findIndex(article=>postSlug(article.title)===decodeURIComponent(match[1]));
  return index<0?null:index;
}


function ArticleDocument({ content, layout, articleId }: { content: unknown;layout?:LayoutConfig;articleId?:string }) {
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
  return <div ref={container} className="published-article-body" data-edit-key={articleId?"article:"+articleId+":body":"blog_body"} style={layout?styleFor(layout,"article:"+articleId,"body"):undefined} />;
}

function PublishedArticles({labels,limit,standalone=false,layout}:{labels:Record<string,string>;limit?:number;standalone?:boolean;layout?:LayoutConfig}) {
  const [articles, setArticles] = useState<PublishedArticle[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [shareNotice, setShareNotice] = useState("");
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [visible,setVisible] = useState(standalone);

  useEffect(() => {
    if(visible)return;
    const el=sectionRef.current;
    if(!el||typeof IntersectionObserver==="undefined"){setVisible(true);return;}
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:"650px"});
    observer.observe(el);
    return()=>observer.disconnect();
  },[visible]);

  useEffect(() => {
    if(!visible)return;
    const controller = new AbortController();
    setLoading(true); setError("");
    async function load() {
      try {
        const all: PublishedArticle[] = [];
        for (let page = 1; page <= (limit?1:20); page++) {
          const data = await requestJSON<{items: Array<PublishedArticle & {status:string}>;total:number}>(`${ARTICLES_API}?page=${page}&limit=${limit?Math.max(1,Math.min(50,limit)):50}`, {
            signal: controller.signal
          });
          if (!Array.isArray(data.items) || !Number.isInteger(data.total) || data.total < 0)
            throw new Error("Invalid article response");
          for (const item of data.items) {
            if (item && typeof item.id === "string" && typeof item.title === "string" && item.status === "published")
              all.push(item as PublishedArticle);
          }
          if (all.length >= data.total || (limit && all.length >= limit) || data.items.length === 0) break;
        }
        if (!controller.signal.aborted) {
          setArticles(limit?all.slice(0,limit):all);
          setSelected(selectedPostIndex(all));
        }
      } catch {
        if (!controller.signal.aborted) setError("Posts couldn’t load right now. Please try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [retry,limit,visible]);

  useEffect(()=>{
    const sync=()=>setSelected(selectedPostIndex(articles));
    window.addEventListener("popstate",sync);
    return ()=>window.removeEventListener("popstate",sync);
  },[articles]);
  function openPost(index:number){
    setSelected(index);
    window.history.pushState(null,"",postUrl(articles[index]));
    document.getElementById("articles")?.scrollIntoView({block:"start"});
  }
  function backToPosts(){
    setSelected(null);
    window.history.pushState(null,"",standalone?"/blog":"/#articles");
  }
  async function sharePost(article:PublishedArticle){
    const url=window.location.origin+postUrl(article);
    if(navigator.share){
      try{await navigator.share({title:article.title,text:article.title,url});return;}
      catch(error){if((error as Error)?.name==="AbortError")return;}
    }
    try{await navigator.clipboard.writeText(url);setShareNotice("Link copied!");}
    catch{setShareNotice(url);}
  }
  const current = selected === null ? null : articles[selected];
  const move=(direction:number)=>{
    if(selected===null)return;
    openPost(Math.max(0,Math.min(articles.length-1,selected+direction)));
  };
  const displayDate = (value: string | null) => {
    const date = typeof value === "string" ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
      : null;
  };

  return <section ref={sectionRef} id="articles" className="published-articles wrap section-space" aria-labelledby="articles-title" tabIndex={-1}>
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
      .post-share{border:1px solid var(--line);border-radius:999px;background:transparent;color:inherit;font:600 12px var(--font-body);padding:7px 14px;cursor:pointer}
      .post-share:hover{background:var(--lime);color:#202b26}
      .post-share-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:14px 0 0}
      .post-share-status{font-size:12px;color:var(--muted);overflow-wrap:anywhere}
    `}</style>
    <div className="section-label"><span>{textValue(labels,"publications_label","03 / NOTES ALONG THE WAY")}</span><span className="small-line" /></div>
    <h2 id="articles-title" data-edit-key="blog_title" style={layout?styleFor(layout,"blog","title"):undefined}>{textValue(labels,"blog_title","Posts")}</h2>
    <p className="published-articles-intro" data-edit-key="publications_intro">{textValue(labels,"publications_intro","Thoughts, discoveries, and things I’m learning.")}</p>
    <div aria-busy={loading}>
      {loading && <p className="published-articles-status" role="status">Loading posts…</p>}
      {error && <div className="published-articles-status" role="status"><p>{error}</p><button type="button" className="button button-dark" onClick={() => setRetry(value => value + 1)}>Try again</button></div>}
      {!loading && !error && articles.length === 0 && <p className="published-articles-status">No published posts yet.</p>}
      {!loading && !error && selected === null && <div className="published-articles-list">
        {articles.map((article, index) => <a key={article.id} href={postUrl(article)} className="published-article-title" onClick={event=>{if(standalone){event.preventDefault();openPost(index);}}}>
          <span><strong data-edit-key={"article:"+article.id+":title"} style={layout?styleFor(layout,"article:"+article.id,"title"):undefined}>{article.title}</strong>{displayDate(article.published_at) && <small>{displayDate(article.published_at)}</small>}</span>
          <span aria-hidden="true">↗</span>
        </a>)}
      </div>}
      {!standalone&&!loading&&<p className="published-all-link"><a href="/blog">See all blog posts →</a></p>}
      {!loading && !error && current && <div>
        <div className="published-reader-controls">
          <button type="button" className="button button-dark" onClick={backToPosts}>← All posts</button>
          <span className="published-reader-hint">Post {selected! + 1} of {articles.length}</span>
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
            <h3 data-edit-key={"article:"+current.id+":title"} style={layout?styleFor(layout,"article:"+current.id,"title"):undefined}>{current.title}</h3>
            {displayDate(current.published_at) && <time>{displayDate(current.published_at)}</time>}
          </header>
          <ArticleDocument content={current.document} layout={layout} articleId={current.id} />
          <div className="post-share-row" style={{padding:"0 clamp(18px,4vw,32px) 20px"}}>
            <button type="button" className="post-share" onClick={()=>void sharePost(current)} aria-label={"Share post: "+current.title}>↗ Share</button>
            {shareNotice&&<span className="post-share-status" role="status">{shareNotice}</span>}
          </div>
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


function Home() {
  const layout=useSiteLayout();
  const {items,entriesLoaded,labels,labelsLoaded}=useSiteContent();
  const t=(key:string,fallback:string)=>labelsLoaded?textValue(labels,key,fallback):"";
  const [notice, setNotice] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [followOpen, setFollowOpen] = useState(false);
  const pageCopy=useLivePageCopy();
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
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 3200); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".hero-photo[data-reveal]"));
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
        <div className="hero-copy">
          <p className="eyebrow" data-edit-key="hero_eyebrow"><span className="status-dot" /> {t("hero_eyebrow","LEARNING. EXPLORING. BUILDING A DIRECTION.")}</p>
          <h1 style={styleFor(layout,"hero","title")}><span data-edit-key="hero_line_one">{pageCopy?.hero_line_one}</span>{" "}<br /><span data-edit-key="hero_line_two">{pageCopy?.hero_line_two}</span>{" "}<span className="hero-purpose"><span data-edit-key="hero_phrase">{pageCopy?.hero_phrase}</span> <em data-edit-key="hero_emphasis">{pageCopy?.hero_emphasis}</em><span className="green-period">.</span></span></h1>
          <p className="hero-intro" data-edit-key="hero_intro" style={styleFor(layout,"hero","body")}>{pageCopy?.hero_intro}</p>
          <a className="button button-dark" href="#contact">Get in touch <Arrow diagonal /></a>
          <a className="subtle-link" href="/about.html">A little about me <span aria-hidden="true">↗</span></a>
        </div><HeroPhoto />
      </section>
      <div className="intro-strip wrap"><span data-edit-key="intro_label">{t("intro_label","A PERSONAL CORNER OF THE INTERNET")}</span><p><span data-edit-key="intro_first">{t("intro_first","Curiosity in the details.")}</span> <em data-edit-key="intro_second">{t("intro_second","Purpose in the bigger picture.")}</em></p><span className="strip-star" aria-hidden="true">✳</span></div>
      <div className="customizable-home-layout">
      <div data-custom-section="explorations" style={{order:sectionOrder(layout,"explorations")}} id="explorations"><JourneyTimeline entries={items} entriesLoaded={entriesLoaded} labels={labels} kind="experience" layout={layout} /><ContentStories items={items} section="exploring" layout={layout} /></div>
      <div data-custom-section="home_stories" style={{order:sectionOrder(layout,"home_stories")}}><ContentStories items={items} section="home" layout={layout} /></div>
      {layout.home_blog&&<div data-custom-section="blog" style={{order:sectionOrder(layout,"blog")}}><PublishedArticles labels={labels} limit={layout.home_blog_limit} layout={layout} /></div>}
      {layout.publications_home&&<div data-custom-section="publications" style={{order:sectionOrder(layout,"publications")}}><ContentStories items={items} section="publications" layout={layout} page="home" /></div>}
      <div data-custom-section="contact" style={{order:sectionOrder(layout,"contact")}}><section id="contact" className="contact-section wrap section-space" tabIndex={-1} aria-labelledby="contact-title">
        <div className="section-label"><span data-edit-key="contact_label">{t("contact_label","04 / GET IN TOUCH")}</span><span className="small-line" /></div>
        <h2 id="contact-title" data-edit-key="contact_heading" style={styleFor(layout,"contact","title")}>{pageCopy?.contact_heading}</h2>
        <p data-edit-key="contact_paragraph" style={styleFor(layout,"contact","body")}>{pageCopy?.contact_paragraph}</p>
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
      <ContentStories items={items} section="contact" layout={layout} /></div>
      <div data-custom-section="visitor_wall" style={{order:sectionOrder(layout,"visitor_wall")}}><VisitorWall /></div>
      <div data-custom-section="closing" style={{order:sectionOrder(layout,"closing")}}><section className="closing-section wrap"><div className="closing-star" aria-hidden="true">✳</div><p className="eyebrow" data-edit-key="closing_label">{t("closing_label","STILL EARLY. ALREADY CURIOUS.")}</p><h2 data-edit-key="closing_heading_one" style={styleFor(layout,"closing","title")}>{t("closing_heading_one","Good software begins")}<br /><em data-edit-key="closing_heading_two">{t("closing_heading_two","with a human question.")}</em></h2><p data-edit-key="closing_paragraph_one" style={styleFor(layout,"closing","body")}>{t("closing_paragraph_one","Mine is how to help more people be understood.")}<br /><span data-edit-key="closing_paragraph_two">{t("closing_paragraph_two","This portfolio is a starting point for that journey.")}</span></p><button className="button button-dark" onClick={() => copy(new URL("./", window.location.href).href, "Portfolio link copied.")}>Share this portfolio <Arrow diagonal /></button></section></div>
      </div>
    </main>
    <footer className="site-footer wrap"><a className="footer-name" href="#home">Serazul Hoque<span data-edit-key="footer_tagline">{t("footer_tagline","Engineering Student with a purpose.")}</span></a><span data-edit-key="footer_note">{t("footer_note","© 2026 · A WORK IN PROGRESS, WITH INTENTION.")}</span><a className="back-top" href="#home">Back to top ↑</a></footer>
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

function JourneyTimeline({entries,entriesLoaded,labels,kind,layout}:{entries:SiteEntry[],entriesLoaded:boolean,labels:Record<string,string>,kind:"timeline"|"experience",layout?:LayoutConfig}) {
  const [selected,setSelected]=useState<number|null>(null);
  const experience=kind==="experience";
  const timeline=entriesLoaded?entries.filter(item=>item.section==="about"&&item.kind===kind).map((item,index)=>({
    id:item.id,number:String(index+1).padStart(2,"0"),phase:item.date_label||"MILESTONE",title:item.title,
    short:item.subtitle,detail:item.body,symbol:index===0?"𝒮":index===1?"{ }":index===2?"</>":"↗"
  })):experience?[]:journeyMilestones.map(item=>({...item,id:null}));
  if(!entriesLoaded)return null;
  const id=experience?"experience":"education";
  return <section className={"journey-section journey-inline wrap section-space"+(experience?" experience-section":"")} id={id} aria-labelledby={id+"-title"}>
    <div className="section-label"><span>{experience?"EXPERIENCE":textValue(labels,"journey_label","THE PATH SO FAR").replace(/^\s*\d+\s*\/\s*/,"")}</span><span className="small-line" /></div>
    <div className="journey-intro">
      <div><p className="journey-eyebrow">{experience?"WHAT I'VE WORKED ON":textValue(labels,"journey_eyebrow","A JOURNEY STILL UNFOLDING")}</p>
        <h2 id={id+"-title"}>{experience?"Experience":"Education"}</h2></div>
      {!experience&&<p>{textValue(labels,"journey_intro","No perfect straight line. Just curiosity, choices, lessons, and a direction worth following.")}</p>}
    </div>
    {timeline.length>0?<div className="journey-layout"><div className="journey-steps" aria-label={experience?"Experience milestones":"Education milestones"}>
      {timeline.map((step,index)=><div className="journey-entry" key={step.number}>
        <button type="button" className={"journey-step"+(selected===index?" is-active":"")}
          onClick={()=>setSelected(selected===index?null:index)} aria-expanded={selected===index}
          aria-controls={id+"-detail-"+index}>
          <span className="journey-step-copy"><small>{step.phase}</small><strong data-edit-key={step.id?"content:"+step.id+":title":undefined} style={step.id&&layout?styleFor(layout,"content:"+step.id,"title"):undefined}>{step.title}</strong></span>
          <span className="journey-step-arrow" aria-hidden="true">{selected===index?"↘":"→"}</span>
        </button>
        {selected===index&&<article className="journey-detail" id={id+"-detail-"+index}>
          <div className="journey-detail-top"><span>{experience?"EXPERIENCE":"EDUCATION"}</span><span className="journey-detail-symbol" aria-hidden="true">{step.symbol}</span></div>
          <div className="journey-detail-body">
            <p className="journey-detail-phase">{step.phase}</p><h3 data-edit-key={step.id?"content:"+step.id+":title":undefined} style={step.id&&layout?styleFor(layout,"content:"+step.id,"title"):undefined}>{step.title}</h3>
            {step.short&&<p className="journey-detail-short">{step.short}</p>}
            {step.detail&&<p className="journey-detail-description" data-edit-key={step.id?"content:"+step.id+":body":undefined} style={step.id&&layout?styleFor(layout,"content:"+step.id,"body"):undefined}>{step.detail}</p>}
          </div>
        </article>}
      </div>)}
    </div></div>:<p className="journey-empty">Experience entries will appear here once added.</p>}
  </section>;
}

function AboutPage() {
  const {items,entriesLoaded,labels,labelsLoaded}=useSiteContent();
  const layout=useSiteLayout();
  const t=(key:string,fallback:string)=>labelsLoaded?textValue(labels,key,fallback):"";
  const copy=useLivePageCopy();
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <SiteHeader />
    <VisitAnalytics />
    <main id="main" className="about-page-main">
      <section className="about-section wrap section-space" id="about" tabIndex={-1}>
        <div className="section-label"><span>{t("about_label","01 / A LITTLE CONTEXT")}</span><span className="small-line" /></div>
        <div className="about-main">
          <h2 style={styleFor(layout,"about","title")}><span data-edit-key="about_line_one">{copy?.about_line_one}</span><br /><em data-edit-key="about_line_two">{copy?.about_line_two}</em></h2>
          <div className="about-columns"><p data-edit-key="about_paragraph_one" style={styleFor(layout,"about","body")}>{copy?.about_paragraph_one}</p><p data-edit-key="about_paragraph_two" style={styleFor(layout,"about","body")}>{copy?.about_paragraph_two}</p></div>
          <div className="about-signature"><span className="handwriting">Serazul.</span><span>STUDENT · CURIOUS BY DEFAULT</span></div>
        </div>
      </section>
      <ContentStories items={items} section="about" layout={layout} />
      <JourneyTimeline entries={items} entriesLoaded={entriesLoaded} labels={labels} kind="timeline" layout={layout} />
      <JourneyTimeline entries={items} entriesLoaded={entriesLoaded} labels={labels} kind="experience" layout={layout} />
      <div className="journey-return wrap"><a className="subtle-link" href="/">← Back to homepage</a></div>
    </main>
    <footer className="site-footer wrap"><a className="footer-name" href="/">Serazul Hoque<span data-edit-key="footer_tagline">{t("footer_tagline","Engineering Student with a purpose.")}</span></a><span data-edit-key="footer_note">{t("footer_note","© 2026 · A WORK IN PROGRESS, WITH INTENTION.")}</span><a className="back-top" href="/">Back to home ↑</a></footer>
    <DesignerSignature />
    <PortfolioAssistant />
  </>;
}

export function BlogPage() {
  const {labels,items}=useSiteContent();
  const layout=useSiteLayout();
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <SiteHeader />
    <main id="main" className="blog-page-main" tabIndex={-1}>
      {layout.blog_page?<><PublishedArticles labels={labels} standalone layout={layout} />{layout.publications_page&&<ContentStories items={items} section="publications" layout={layout} page="blog" />}</>:<section className="wrap section-space"><h1>Blog</h1><p>Blog posts are currently hidden on this page.</p></section>}
    </main>
    <footer className="site-footer wrap"><a className="footer-name" href="/">Serazul Hoque</a><span>© 2026 · A WORK IN PROGRESS, WITH INTENTION.</span><a className="back-top" href="/">Back to home ↑</a></footer>
    <PortfolioAssistant />
  </>;
}

export function AskMePage() {
  return <main className="askme-page" id="main" aria-label="Ask Me chatbot">
    <PortfolioAssistant standalone />
  </main>;
}

export default function App() {
  return <>
    <SiteDesign />
    {typeof window !== "undefined" && /^\/blog(?:\/.*)?$/.test(window.location.pathname)
      ? <BlogPage /> : typeof window !== "undefined" && /^\/askme\/?$/.test(window.location.pathname)
      ? <AskMePage /> : typeof window !== "undefined" && window.location.pathname.endsWith("/gallery.html")
      ? <Gallery /> : typeof window !== "undefined" && window.location.pathname.endsWith("/about.html")
      ? <AboutPage /> : <Home />}
  </>;
}


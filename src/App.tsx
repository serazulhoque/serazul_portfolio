"use client";
import { useEffect, useRef, useState } from "react";
import SiteHeader from "./site-header";

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h15m-6-6 6 6-6 6"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function BridgeArt() {
  return <div className="bridge-art" data-reveal role="img" aria-label="An illustrated bridge of sound connecting a human voice with new possibilities in AI">
    <div className="art-top"><span className="tiny-dot" /> AN IDEA WORTH EXPLORING <span>001</span></div>
    <div className="art-title">Language is<br />a <em>bridge.</em></div>
    <svg className="bridge-svg" viewBox="0 0 600 410" fill="none" aria-hidden="true">
      <defs><linearGradient id="bridge" x1="50" y1="100" x2="540" y2="360" gradientUnits="userSpaceOnUse"><stop stopColor="#d6ef9e" /><stop offset=".5" stopColor="#b5d86d" /><stop offset="1" stopColor="#657b57" /></linearGradient></defs>
      <g opacity=".2" stroke="#dce6cc" strokeWidth=".5"><path d="M0 345 600 70M0 385 600 110M60 410 600 160M150 410 600 205M0 300 600 25" /><path d="M-40 160 500 410M10 120 600 393M70 90 600 333M135 60 600 275M200 30 600 215" /></g>
      {Array.from({ length: 23 }, (_, i) => <path key={i} d={`M ${61 + i * 2.5} ${242 + i * 4} C ${205 + i * 2} ${13 + i * 6}, ${344 - i} ${440 - i * 6}, ${543 - i * 2.5} ${144 - i * 2}`} stroke="url(#bridge)" strokeWidth="1" opacity={.45 + i * .022} />)}
      <ellipse cx="85" cy="284" rx="58" ry="22" transform="rotate(-26 85 284)" stroke="#d3ed9d" strokeDasharray="2 5" />
      <ellipse cx="516" cy="126" rx="58" ry="22" transform="rotate(-26 516 126)" stroke="#d3ed9d" strokeDasharray="2 5" />
      <circle cx="85" cy="284" r="7" fill="#d3ed9d" /><circle cx="516" cy="126" r="7" fill="#d3ed9d" />
      <path d="M85 284v58m431-216V66" stroke="#d3ed9d" strokeWidth=".7" />
      <text x="68" y="365" fill="#e8ecdf" fontSize="11" fontFamily="monospace" letterSpacing="2">A VOICE</text>
      <text x="428" y="51" fill="#e8ecdf" fontSize="11" fontFamily="monospace" letterSpacing="2">A POSSIBILITY</text>
    </svg>
    <div className="art-bottom"><span>ROHINGYA × ARTIFICIAL INTELLIGENCE</span><span className="art-spark">✳</span></div>
    <div className="art-note">More people. More possibilities.</div>
  </div>;
}

const scenarios = [
  { label: "Everyday curiosity", title: "Ask a question in your own language.", text: "The idea starts with an ordinary moment: someone has a question and wants to ask it naturally, in Rohingya. A useful first experience would make that exchange feel simple.", input: "A spoken question", output: "An understandable response", note: "Start small: one short question, one clear answer." },
  { label: "Learning together", title: "Make a new idea easier to understand.", text: "Imagine asking for a simple explanation of a new topic in a familiar language. The goal would be to help people explore and learn while keeping their own voice in the conversation.", input: "Something new to learn", output: "A familiar way to explore it", note: "Try a simple learning topic and ask speakers to review it." },
  { label: "A first conversation", title: "Make the first interaction feel welcoming.", text: "A short greeting and a clear prompt could help someone take their first step with AI. Before adding features, the experience would need to work for the people it aims to serve.", input: "A simple hello", output: "A welcoming next step", note: "Observe a first-time user and listen to what feels unclear." },
];

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
    <div className="section-label"><span>04 / NOTES ALONG THE WAY</span><span className="small-line" /></div>
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


export default function Home() {
  const [scenario, setScenario] = useState(0);
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = scenarios[scenario];
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
  function changeTab(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + (event.key === "ArrowRight" ? 1 : 2)) % 3;
    setScenario(next); tabRefs.current[next]?.focus();
  }

  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <SiteHeader />
    <main id="main">
      <section className="hero wrap" id="home" tabIndex={-1}>
        <div className="hero-copy" data-reveal>
          <p className="eyebrow"><span className="status-dot" /> LEARNING. EXPLORING. BUILDING A DIRECTION.</p>
          <h1>Engineering{" "}<br />Student{" "}<span className="hero-purpose">with a <em>purpose</em><span className="green-period">.</span></span></h1>
          <p className="hero-intro">Hi, I’m Serazul. A software engineering student drawn to useful AI, accessible technology, and the possibilities of a voice being understood.</p>
          <a className="button button-dark" href="#project">Explore my big idea <Arrow diagonal /></a>
          <a className="subtle-link" href="#about">A little about me <span aria-hidden="true">↓</span></a>
        </div><BridgeArt />
      </section>
      <div className="intro-strip wrap"><span>A PERSONAL CORNER OF THE INTERNET</span><p>Curiosity in the details. <em>Purpose in the bigger picture.</em></p><span className="strip-star" aria-hidden="true">✳</span></div>
      <section className="about-section wrap section-space" id="about" tabIndex={-1}>
        <div className="section-label"><span>01 / A LITTLE CONTEXT</span><span className="small-line" /></div>
        <div className="about-main" data-reveal><h2>Learning the craft.<br /><em>Keeping people in mind.</em></h2><div className="about-columns"><p>I’m pursuing software engineering because I want to turn ideas into things people can use. Right now, that means learning the foundations, asking questions, and connecting the small steps to a bigger goal.</p><p>One idea keeps me curious: an AI people can talk to in Rohingya. It brings together my interest in technology and a language that matters to me. This is where I’m beginning.</p></div><div className="about-signature"><span className="handwriting">Serazul.</span><span>STUDENT · CURIOUS BY DEFAULT</span></div></div>
      </section>
      <section className="project-section" id="project" tabIndex={-1}><div className="wrap section-space">
        <div className="section-label light-label"><span>02 / THE IDEA I KEEP COMING BACK TO</span><span className="project-status"><span className="tiny-dot" /> CONCEPT & EXPLORATION</span></div>
        <div className="project-heading" data-reveal><h2>What if AI<br />spoke <em>Rohingya?</em></h2><div><p>A voice-first AI concept, with a simple ambition: let people have a conversation in their own language.</p><button className="text-button light-button" onClick={() => dialog.current?.showModal()}>Read the project brief <Arrow diagonal /></button></div></div>
        <div className="project-meta"><span className="project-name">Rohingya Voice <span>— a working title</span></span><span>LANGUAGE ACCESS</span><span>AI INTEGRATION</span><span>HUMAN-CENTERED THINKING</span></div>
        <div className="concept-explorer" data-reveal>
          <div className="explorer-heading"><span className="eyebrow">A FEW POSSIBILITIES</span><span>Explore the intended experience <span className="down-diagonal"><Arrow diagonal /></span></span></div>
          <div className="scenario-tabs" role="tablist" aria-label="Possible uses of Rohingya Voice">{scenarios.map((s, i) => <button key={s.label} id={`scenario-tab-${i}`} ref={el => { tabRefs.current[i] = el; }} role="tab" aria-selected={scenario === i} aria-controls="scenario-panel" tabIndex={scenario === i ? 0 : -1} onKeyDown={e => changeTab(e, i)} onClick={() => setScenario(i)}>{s.label}<span aria-hidden="true"><Arrow diagonal /></span></button>)}</div>
          <div id="scenario-panel" role="tabpanel" aria-labelledby={`scenario-tab-${scenario}`} tabIndex={0} className="scenario-panel" key={scenario}>
            <div className="scenario-copy"><span className="scenario-number">0{scenario + 1}</span><h3>{current.title}</h3><p>{current.text}</p></div>
            <div className="conversation-diagram"><div className="diagram-label">ILLUSTRATIVE FLOW · A FUTURE EXPERIENCE</div><div className="voice-node"><div className="waveform" aria-hidden="true">{[12, 23, 15, 34, 44, 26, 18, 38, 28, 14, 23, 12].map((h,i) => <i key={i} style={{height:h}} />)}</div><span>{current.input}</span><small>IN ROHINGYA</small></div><div className="flow-line" aria-hidden="true"><span />↓<span /></div><div className="answer-node"><span className="answer-icon" aria-hidden="true">✳</span><span>{current.output}</span></div><p className="diagram-note">{current.note}</p></div>
          </div>
          <div className="concept-disclaimer"><span className="mini-info" aria-hidden="true">i</span> Concept illustration. These scenarios show a proposed experience; this page does not provide live speech or translation.</div>
        </div>
        <div className="next-steps"><p className="eyebrow">A POSSIBLE PATH FORWARD</p><div><span>01</span><p>Define a small<br /><strong>first conversation.</strong></p></div><div><span>02</span><p>Explore models<br /><strong>and language support.</strong></p></div><div><span>03</span><p>Learn from<br /><strong>Rohingya speakers.</strong></p></div></div>
      </div></section>
      <section className="focus-section wrap section-space" id="explorations" tabIndex={-1}>
        <div className="section-label"><span>03 / BUILDING THE FOUNDATIONS</span><span className="small-line" /></div>
        <div className="focus-main"><div className="focus-heading" data-reveal><h2>Small steps.<br /><em>A bigger direction.</em></h2><p>The things I’m learning and the questions I want to keep exploring.</p></div><div className="focus-list">
          <article data-reveal><span className="focus-index">01</span><div><h3>Software foundations</h3><p>C, pseudocode, flowcharts, and the logic that helps turn a problem into a program.</p><span className="focus-tag">CURRENT LEARNING</span></div><span className="focus-symbol" aria-hidden="true">{`{ }`}</span></article>
          <article data-reveal><span className="focus-index">02</span><div><h3>AI with a practical purpose</h3><p>How could existing AI models become part of a useful, language-centered experience?</p><span className="focus-tag">AN OPEN QUESTION</span></div><span className="focus-symbol" aria-hidden="true">✳</span></article>
          <article data-reveal><span className="focus-index">03</span><div><h3>Clearer ways to learn</h3><p>Interactive examples, visual explanations, and making complicated ideas easier to approach.</p><span className="focus-tag">A PERSONAL INTEREST</span></div><span className="focus-symbol" aria-hidden="true"><Arrow diagonal /></span></article>
        </div></div>
      </section>
      <PublishedArticles />
      <section className="closing-section wrap" data-reveal><div className="closing-star" aria-hidden="true">✳</div><p className="eyebrow">STILL EARLY. ALREADY CURIOUS.</p><h2>Good software begins<br />with a <em>human question.</em></h2><p>Mine is how to help more people be understood.<br />This portfolio is a starting point for that journey.</p><button className="button button-dark" onClick={() => copy(new URL("./", window.location.href).href, "Portfolio link copied.")}>Share this portfolio <Arrow diagonal /></button></section>
    </main>
    <footer className="site-footer wrap"><a className="footer-name" href="#home">Serazul Hoque<span>Engineering Student with a purpose.</span></a><span>© 2026 · A WORK IN PROGRESS, WITH INTENTION.</span><a className="back-top" href="#home">Back to top ↑</a></footer>
    <dialog ref={dialog} className="brief-dialog" onClick={e => {if(e.target === dialog.current) dialog.current.close();}} aria-labelledby="brief-title">
      <div className="brief-header"><span className="eyebrow">PROJECT BRIEF / 001</span><button className="close-dialog" onClick={() => dialog.current?.close()} aria-label="Close project brief">×</button></div>
      <p className="brief-badge">CONCEPT STAGE</p><h2 id="brief-title">Rohingya <em>Voice.</em></h2><p className="brief-lead">A personal project idea by Serazul Hoque: let people talk to AI in Rohingya.</p>
      <div className="brief-block"><h3>The ambition</h3><p>Create a simple voice-first conversation experience that puts a familiar language at the center. The first version should be narrow enough to evaluate with real speakers.</p></div>
      <div className="brief-block"><h3>A proposed approach</h3><p>Explore speech input, an existing AI model, and spoken output. First assess Rohingya support, accuracy, data needs, and whether the available tools can support a useful prototype.</p></div>
      <div className="brief-block"><h3>What success could look like</h3><p>A speaker can ask one everyday question and understand the response. Review with Rohingya speakers should guide the next step.</p></div>
      <p className="brief-footnote">This brief describes a proposed direction and an initial prototype goal.</p>
      <button className="button button-dark" onClick={() => copy("Rohingya Voice — a project concept by Serazul Hoque. The goal: let people talk to AI in Rohingya. Proposed first step: explore model and speech support, then evaluate one short everyday conversation with Rohingya speakers. Stage: concept and exploration. " + new URL("./", window.location.href).href, "Project summary copied.")}>Copy project summary <Arrow /></button>
    </dialog>
    <div className={notice ? "toast visible" : "toast"} role="status" aria-live="polite">{notice}</div>
  </>;
}

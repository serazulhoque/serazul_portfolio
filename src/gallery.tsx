import {useEffect,useState} from "react";
import SiteHeader from "./site-header";
import PortfolioAssistant from "./portfolio-assistant";
import "./gallery.css";

const API="https://krtnmzfucyfgalxvnuwj.supabase.co/rest/v1/gallery_items";
const HEADERS={apikey:"sb_publishable_JBm0UjGe5L4S2FfLxwimGw_E0PTjx0N"};
const MEDIA="https://serazul-backend.vercel.app/api/public/media/";
type GalleryItem={id:string;title:string;caption:string;media_id:string;url?:string;alt?:string};

export default function Gallery(){
  const [items,setItems]=useState<GalleryItem[]>([]);
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState(false);
  const [retry,setRetry]=useState(0);
  const [active,setActive]=useState<GalleryItem|null>(null);
  useEffect(()=>{
    const controller=new AbortController();
    async function load(){
      setBusy(true);
      setError(false);
      try{
        const response=await fetch(API+"?select=id,title,caption,media_id&is_published=eq.true&order=sort_order.asc,created_at.desc&limit=100",{
          headers:HEADERS,signal:controller.signal,cache:"no-store"
        });
        if(!response.ok)throw new Error("Gallery unavailable");
        const rows=await response.json() as GalleryItem[];
        if(!Array.isArray(rows))throw new Error("Invalid gallery response");
        const images=await Promise.all(rows.map(async item=>{
          try{
            const r=await fetch(MEDIA+encodeURIComponent(item.media_id),{signal:controller.signal,cache:"no-store"});
            if(!r.ok)return null;
            const data=await r.json();
            return typeof data.url==="string"?{...item,url:data.url,alt:data.alt}:null;
          }catch{return null;}
        }));
        if(rows.length>0 && images.every(item=>item===null))throw new Error("Gallery media unavailable");
        if(!controller.signal.aborted)setItems(images.filter(item=>item!==null));
      }catch{if(!controller.signal.aborted)setError(true);}
      finally{if(!controller.signal.aborted)setBusy(false);}
    }
    void load();
    return ()=>controller.abort();
  },[retry]);
  useEffect(()=>{
    if(!active)return;
    const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setActive(null);};
    window.addEventListener("keydown",close);
    return ()=>window.removeEventListener("keydown",close);
  },[active]);
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <SiteHeader/>
    <main id="main" className="gallery-page wrap section-space">
      <p className="eyebrow">A PERSONAL COLLECTION</p>
      <h1>Gallery<span className="green-period">.</span></h1>
      <p className="gallery-intro">Moments, memories, and images worth sharing.</p>
      {busy?<p className="gallery-status" role="status">Loading gallery…</p>:error?<div className="gallery-status" role="status"><p>Gallery couldn’t load right now.</p><button type="button" className="button button-dark" onClick={()=>setRetry(n=>n+1)}>Try again</button></div>:items.length===0?<p className="gallery-status">No photos in the gallery yet.</p>:
        <div className="gallery-grid">{items.map(item=>
          <button type="button" key={item.id} className="gallery-tile" onClick={()=>setActive(item)}
            aria-label={"View "+(item.title||item.alt||"gallery photo")}>
            <img src={item.url} alt={item.alt||item.title||"Gallery photo"} loading="lazy"/>
            {(item.title||item.caption)&&<span className="gallery-tile-caption"><strong>{item.title}</strong>{item.caption&&<small>{item.caption}</small>}</span>}
          </button>
        )}</div>}
      <a className="subtle-link" href="/">← Back to homepage</a>
    </main>
    <footer className="site-footer wrap"><a className="footer-name" href="/">Serazul Hoque</a><a className="back-top" href="/">Back to home ↑</a></footer>
    <PortfolioAssistant/>
    {active&&<div className="gallery-lightbox" role="presentation" onClick={()=>setActive(null)}>
      <div className="gallery-lightbox-content" role="dialog" aria-modal="true" aria-label={active.title||"Gallery photo"} onClick={event=>event.stopPropagation()}>
        <button className="gallery-lightbox-close" type="button" autoFocus onClick={()=>setActive(null)} aria-label="Close photo">×</button>
        <img src={active.url} alt={active.alt||active.title||"Gallery photo"}/>
        {(active.title||active.caption)&&<p><strong>{active.title}</strong>{active.caption&&<span>{active.caption}</span>}</p>}
      </div>
    </div>}
  </>;
}

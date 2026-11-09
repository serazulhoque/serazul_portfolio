import {useEffect,useState} from "react";

export type SiteEntry={
  id:string;section:"home"|"about"|"contact"|"publications"|"exploring";
  kind:"story"|"timeline"|"experience";title:string;subtitle:string;body:string;date_label:string;sort_order:number
};
type SiteData={items:SiteEntry[];entriesLoaded:boolean;labels:Record<string,string>;labelsLoaded:boolean};
const BASE="https://serazul-backend.vercel.app/api/public";
export function useSiteContent():SiteData{
  const [items,setItems]=useState<SiteEntry[]>([]);
  const [entriesLoaded,setEntriesLoaded]=useState(false);
  const [labels,setLabels]=useState<Record<string,string>>({});
  const [labelsLoaded,setLabelsLoaded]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    // Restore the last published content immediately after hydration.
    try{
      const stored=JSON.parse(localStorage.getItem("serazul:site-content:v1")||"null");
      if(stored&&Array.isArray(stored.items)){
        setItems(stored.items);
        setEntriesLoaded(true);
      }
      if(stored&&stored.labels&&typeof stored.labels==="object"){
        setLabels(stored.labels);
        setLabelsLoaded(true);
      }
    }catch{/* Cached content is optional. */}

    // Refresh cached content without blocking the visible page.
    const write=(name:"items"|"labels",value:unknown)=>{
      try{
        const key="serazul:site-content:v1";
        const cached=JSON.parse(localStorage.getItem(key)||"{}")||{};
        localStorage.setItem(key,JSON.stringify({...cached,[name]:value}));
      }catch{/* Storage may be unavailable. */}
    };
    fetch(BASE+"/content-entries",{signal:controller.signal,cache:"no-store"})
      .then(r=>r.ok?r.json():Promise.reject())
      .then(data=>{
        if(controller.signal.aborted||!Array.isArray(data.items))return;
        const valid=data.items.filter((item:SiteEntry)=>item&&typeof item.title==="string");
        setItems(valid);
        write("items",valid);
      }).catch(()=>{}).finally(()=>{if(!controller.signal.aborted)setEntriesLoaded(true);});
    fetch(BASE+"/content-text",{signal:controller.signal,cache:"no-store"})
      .then(r=>r.ok?r.json():Promise.reject())
      .then(data=>{
        if(controller.signal.aborted||!data||typeof data!=="object"||Array.isArray(data))return;
        setLabels(data);
        write("labels",data);
      }).catch(()=>{}).finally(()=>{if(!controller.signal.aborted)setLabelsLoaded(true);});
    return ()=>controller.abort();
  },[]);
  return {items,entriesLoaded,labels,labelsLoaded};
}
export function textValue(values:Record<string,string>,key:string,fallback:string):string{
  return typeof values[key]==="string"?values[key]:fallback;
}
export function ContentStories({items,section}:{
  items:SiteEntry[];section:SiteEntry["section"]
}){
  const stories=items.filter(i=>i.section===section&&i.kind==="story");
  if(!stories.length)return null;
  return <div className="extra-stories wrap" aria-label={"More about "+section}>
    {stories.map(item=><article key={item.id} className="extra-story">
      {item.date_label&&<span className="extra-story-kicker">{item.date_label}</span>}
      <h3>{item.title}</h3>
      {item.subtitle&&<p className="extra-story-subtitle">{item.subtitle}</p>}
      {item.body&&<p className="extra-story-body">{item.body}</p>}
    </article>)}
  </div>;
}

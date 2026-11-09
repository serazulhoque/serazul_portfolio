import {useEffect,useState} from "react";

export type SiteEntry={
  id:string;section:"home"|"about"|"contact"|"publications"|"exploring";
  kind:"story"|"timeline"|"experience";title:string;subtitle:string;body:string;date_label:string;sort_order:number
};
type SiteData={items:SiteEntry[];entriesLoaded:boolean;labels:Record<string,string>;labelsLoaded:boolean};
const DATA="https://krtnmzfucyfgalxvnuwj.supabase.co/rest/v1";
const HEADERS={apikey:"sb_publishable_JBm0UjGe5L4S2FfLxwimGw_E0PTjx0N"};
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
    fetch(DATA+"/site_content_entries?select=id,section,kind,title,subtitle,body,date_label,sort_order&is_published=eq.true&order=sort_order.asc,created_at.asc&limit=300",{signal:controller.signal,cache:"no-store",headers:HEADERS})
      .then(r=>r.ok?r.json():Promise.reject())
      .then(data=>{
        if(controller.signal.aborted||!Array.isArray(data))return;
        const valid=data.filter((item:SiteEntry)=>item&&typeof item.title==="string");
        setItems(valid);
        write("items",valid);
      }).catch(()=>{}).finally(()=>{if(!controller.signal.aborted)setEntriesLoaded(true);});
    fetch(DATA+"/site_editable_text?select=key,value&limit=100",{signal:controller.signal,cache:"no-store",headers:HEADERS})
      .then(r=>r.ok?r.json():Promise.reject())
      .then(data=>{
        if(controller.signal.aborted||!Array.isArray(data))return;
        const values:Record<string,string>={};
        for(const item of data)if(typeof item.key==="string"&&typeof item.value==="string")values[item.key]=item.value;
        setLabels(values);
        write("labels",values);
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

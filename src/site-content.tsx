import {useEffect,useState} from "react";

export type SiteEntry={
  id:string;section:"home"|"about"|"contact"|"publications"|"exploring";
  kind:"story"|"timeline";title:string;subtitle:string;body:string;date_label:string;sort_order:number
};
type SiteData={items:SiteEntry[];entriesLoaded:boolean;labels:Record<string,string>};
const BASE="https://serazul-backend.vercel.app/api/public";
export function useSiteContent():SiteData{
  const [items,setItems]=useState<SiteEntry[]>([]);
  const [entriesLoaded,setEntriesLoaded]=useState(false);
  const [labels,setLabels]=useState<Record<string,string>>({});
  useEffect(()=>{
    const controller=new AbortController();
    fetch(BASE+"/content-entries",{signal:controller.signal,cache:"no-store"})
      .then(r=>r.ok?r.json():Promise.reject())
      .then(data=>{
        if(controller.signal.aborted||!Array.isArray(data.items))return;
        setItems(data.items.filter((item:SiteEntry)=>item&&typeof item.title==="string"));
        setEntriesLoaded(true);
      }).catch(()=>{});
    fetch(BASE+"/content-text",{signal:controller.signal,cache:"no-store"})
      .then(r=>r.ok?r.json():Promise.reject())
      .then(data=>{if(!controller.signal.aborted&&data&&typeof data==="object")setLabels(data);})
      .catch(()=>{});
    return ()=>controller.abort();
  },[]);
  return {items,entriesLoaded,labels};
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

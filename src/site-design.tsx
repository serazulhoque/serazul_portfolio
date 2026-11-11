import {useEffect} from "react";
import {parseLayout,loadDesignSettings} from "./site-layout";

// Public read-only design settings. Editing requires signed-in administrator access.
const scaleKeys:Record<string,string>={
  hero_scale:"--site-hero-scale",
  intro_scale:"--site-intro-scale",
  visitor_scale:"--site-visitor-scale",
  visitor_spacing:"--site-visitor-spacing",
  section_spacing:"--site-section-spacing",
  profile_scale:"--site-profile-scale"
};
const visibilityKeys:Record<string,string>={
  show_visitor_wall:"site-show-visitor-wall",
  show_education:"site-show-education",
  show_experience:"site-show-experience",
  show_ask_me:"site-show-ask-me",
  show_home_photo:"site-show-home-photo",
  menu_name_animation:"site-menu-name-animation"
};

export default function SiteDesign(){
  useEffect(()=>{
    let active=true;
    void loadDesignSettings().then(design=>{
        if(!active||!Object.keys(design).length)return;
        const root=document.documentElement;
        const layout=parseLayout(design.layout_config);
        const heroBodyColor=layout.styles.hero?.bodyColor;
        root.style.setProperty("--custom-hero-body-color",heroBodyColor||"#000000");
        root.dataset.blogOnHome=layout.home_blog?"true":"false";
        for(const [key,property] of Object.entries(scaleKeys)){
          const n=Number(design[key]);
          if(Number.isFinite(n)&&n>=.6&&n<=1.5)root.style.setProperty(property,String(n));
        }
        if(typeof design.accent_color==="string"&&/^#[0-9a-f]{6}$/i.test(design.accent_color)){
          root.style.setProperty("--lime",design.accent_color);
        }
        for(const [key,attribute] of Object.entries(visibilityKeys)){
          root.setAttribute("data-"+attribute,design[key]===false?"false":"true");
        }
      });
    return ()=>{active=false;};
  },[]);
  useEffect(()=>{
    if(typeof window==="undefined"||window.parent===window||
      !new URLSearchParams(window.location.search).has("customize-preview"))return;
    const parentOrigin="https://serazul-admin-serazulhoque.vercel.app";
    const root=document.documentElement;
    root.classList.add("customize-preview");
    const select=(event:MouseEvent)=>{
      const target=event.target;
      if(!(target instanceof Element))return;
      const item=target.closest("[data-edit-key]");
      if(!item)return;
      event.preventDefault();
      event.stopPropagation();
      window.parent.postMessage({type:"serazul:select-content",key:item.getAttribute("data-edit-key")},parentOrigin);
    };
    const containers=Array.from(document.querySelectorAll<HTMLElement>("[data-custom-section]"));
    for(const section of containers)section.draggable=true;
    const onDragStart=(event:DragEvent)=>{
      const target=event.target;
      if(!(target instanceof Element)||!event.dataTransfer)return;
      const section=target.closest<HTMLElement>("[data-custom-section]");
      if(!section)return;
      event.dataTransfer.setData("text/plain",section.dataset.customSection||"");
      event.dataTransfer.effectAllowed="move";
    };
    const onDragOver=(event:DragEvent)=>{
      if(event.target instanceof Element&&event.target.closest("[data-custom-section]"))
        event.preventDefault();
    };
    const onDrop=(event:DragEvent)=>{
      const target=event.target;
      if(!(target instanceof Element)||!event.dataTransfer)return;
      const destination=target.closest<HTMLElement>("[data-custom-section]");
      if(!destination)return;
      event.preventDefault();
      const from=event.dataTransfer.getData("text/plain");
      const to=destination.dataset.customSection;
      const ordered=[...containers].sort((a,b)=>Number(a.style.order)-Number(b.style.order));
      const start=ordered.findIndex(section=>section.dataset.customSection===from);
      const end=ordered.findIndex(section=>section.dataset.customSection===to);
      if(start<0||end<0||start===end)return;
      ordered.splice(end,0,ordered.splice(start,1)[0]);
      ordered.forEach((section,index)=>{section.style.order=String(index);});
      window.parent.postMessage({type:"serazul:section-order",
        order:ordered.map(section=>section.dataset.customSection)},parentOrigin);
    };
    document.addEventListener("click",select,true);
    document.addEventListener("dragstart",onDragStart);
    document.addEventListener("dragover",onDragOver);
    document.addEventListener("drop",onDrop);
    return()=>{
      root.classList.remove("customize-preview");
      document.removeEventListener("click",select,true);
      document.removeEventListener("dragstart",onDragStart);
      document.removeEventListener("dragover",onDragOver);
      document.removeEventListener("drop",onDrop);
      for(const section of containers)section.draggable=false;
    };
  },[]);
  return null;
}

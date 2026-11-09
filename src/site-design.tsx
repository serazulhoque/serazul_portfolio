import {useEffect} from "react";

// Public read-only design settings. Editing requires signed-in administrator access.
const API="https://krtnmzfucyfgalxvnuwj.supabase.co/rest/v1/site_design_settings";
const PUBLIC_KEY="sb_publishable_JBm0UjGe5L4S2FfLxwimGw_E0PTjx0N";
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
    const controller=new AbortController();
    fetch(API+"?select=*&id=eq.1",{
      headers:{"apikey":PUBLIC_KEY},
      credentials:"omit",cache:"no-store",signal:controller.signal
    }).then(response=>response.ok?response.json():Promise.reject())
      .then(data=>{
        if(controller.signal.aborted||!Array.isArray(data)||!data[0])return;
        const root=document.documentElement;
        const design=data[0] as Record<string,unknown>;
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
      }).catch(()=>{/* Website continues using the original design if settings are unavailable. */});
    return ()=>controller.abort();
  },[]);
  return null;
}

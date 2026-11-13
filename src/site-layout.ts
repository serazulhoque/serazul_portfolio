import {useLiveSite} from "./live-site";

export const HOME_SECTIONS=["explorations","home_stories","blog","publications","contact","visitor_wall","closing"] as const;
export type HomeSection=typeof HOME_SECTIONS[number];
export type ContentStyle={titleColor?:string;bodyColor?:string;titleSize?:number;bodySize?:number};
export type LayoutConfig={
  home_blog:boolean;
  blog_page:boolean;
  publications_home:boolean;
  publications_page:boolean;
  home_blog_limit:number;
  home_sections:HomeSection[];
  styles:Record<string,ContentStyle>;
  content_pages:Record<string,{home:boolean;blog:boolean}>;
};
export const DEFAULT_LAYOUT:LayoutConfig={
  home_blog:true,blog_page:true,publications_home:true,publications_page:true,home_blog_limit:3,
  home_sections:[...HOME_SECTIONS],styles:{},content_pages:{}
};
function hex(value:unknown):value is string{
  return typeof value==="string"&&/^#[\da-f]{6}$/i.test(value);
}
export function parseLayout(value:unknown):LayoutConfig {
  if(!value||typeof value!=="object"||Array.isArray(value))return DEFAULT_LAYOUT;
  const data=value as Record<string,unknown>;
  const available=new Set<string>(HOME_SECTIONS);
  const sections=Array.isArray(data.home_sections)
    ? data.home_sections.filter((v):v is HomeSection=>typeof v==="string"&&available.has(v))
    : [];
  const rawStyles=data.styles&&typeof data.styles==="object"&&!Array.isArray(data.styles)
    ? data.styles as Record<string,unknown>:{};
  const styles:Record<string,ContentStyle>={};
  for(const [key,value] of Object.entries(rawStyles).slice(0,160)){
    if(!/^(hero|about|contact|blog|closing|field:[a-z_]{2,80}|(?:content|article):[0-9a-f-]{36})$/.test(key)||
      !value||typeof value!=="object"||Array.isArray(value))continue;
    const style=value as Record<string,unknown>;
    const clean:ContentStyle={};
    if(hex(style.titleColor))clean.titleColor=style.titleColor;
    if(hex(style.bodyColor))clean.bodyColor=style.bodyColor;
    if(Number.isFinite(style.titleSize)&&Number(style.titleSize)>=12&&Number(style.titleSize)<=96)clean.titleSize=Number(style.titleSize);
    if(Number.isFinite(style.bodySize)&&Number(style.bodySize)>=10&&Number(style.bodySize)<=40)clean.bodySize=Number(style.bodySize);
    styles[key]=clean;
  }
  const rawPages=data.content_pages&&typeof data.content_pages==="object"&&!Array.isArray(data.content_pages)
    ?data.content_pages as Record<string,unknown>:{};
  const content_pages:Record<string,{home:boolean;blog:boolean}>={};
  for(const [id,visibility] of Object.entries(rawPages).slice(0,300)){
    if(!/^[0-9a-f-]{36}$/i.test(id)||!visibility||typeof visibility!=="object"||Array.isArray(visibility))continue;
    const pages=visibility as Record<string,unknown>;
    content_pages[id]={home:pages.home!==false,blog:pages.blog!==false};
  }
  return {
    content_pages,
    home_blog:data.home_blog!==false,
    blog_page:data.blog_page!==false,
    publications_home:data.publications_home!==false,
    publications_page:data.publications_page!==false,
    home_blog_limit:typeof data.home_blog_limit==="number"&&Number.isInteger(data.home_blog_limit)
      ?Math.max(1,Math.min(30,data.home_blog_limit)):3,
    home_sections:[...new Set([...sections,...HOME_SECTIONS])],
    styles
  };
}
// Layout and content are published together from one fresh database read.
export function useSiteLayout(){
  const {design}=useLiveSite();
  return parseLayout(design.layout_config);
}
export function sectionOrder(config:LayoutConfig,key:HomeSection){
  const index=config.home_sections.indexOf(key);
  return index<0?HOME_SECTIONS.indexOf(key):index;
}
export function styleFor(config:LayoutConfig,key:string,part:"title"|"body"){
  const setting=config.styles[key]||{};
  return {
    ...(part==="title"&&setting.titleColor?{color:setting.titleColor}:{}),
    ...(part==="body"&&setting.bodyColor?{color:setting.bodyColor}:{}),
    ...(part==="title"&&setting.titleSize?{fontSize:setting.titleSize+"px"}:{}),
    ...(part==="body"&&setting.bodySize?{fontSize:setting.bodySize+"px"}:{})
  };
}

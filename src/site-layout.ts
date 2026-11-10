import {useEffect,useState} from "react";
import {DATA_URL,PUBLIC_HEADERS} from "./public-api";

export const HOME_SECTIONS=["explorations","home_stories","blog","publications","contact","visitor_wall","closing"] as const;
export type HomeSection=typeof HOME_SECTIONS[number];
export type ContentStyle={titleColor?:string;bodyColor?:string;titleSize?:number;bodySize?:number};
export type LayoutConfig={
  home_blog:boolean;
  blog_page:boolean;
  home_blog_limit:number;
  home_sections:HomeSection[];
  styles:Record<string,ContentStyle>;
};
export const DEFAULT_LAYOUT:LayoutConfig={
  home_blog:true,blog_page:true,home_blog_limit:3,
  home_sections:[...HOME_SECTIONS],styles:{}
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
    if(!/^(hero|about|contact|blog|closing|content:[0-9a-f-]{36})$/.test(key)||
      !value||typeof value!=="object"||Array.isArray(value))continue;
    const style=value as Record<string,unknown>;
    const clean:ContentStyle={};
    if(hex(style.titleColor))clean.titleColor=style.titleColor;
    if(hex(style.bodyColor))clean.bodyColor=style.bodyColor;
    if(Number.isFinite(style.titleSize)&&Number(style.titleSize)>=12&&Number(style.titleSize)<=96)clean.titleSize=Number(style.titleSize);
    if(Number.isFinite(style.bodySize)&&Number(style.bodySize)>=10&&Number(style.bodySize)<=40)clean.bodySize=Number(style.bodySize);
    styles[key]=clean;
  }
  return {
    home_blog:data.home_blog!==false,
    blog_page:data.blog_page!==false,
    home_blog_limit:typeof data.home_blog_limit==="number"&&Number.isInteger(data.home_blog_limit)
      ?Math.max(1,Math.min(30,data.home_blog_limit)):3,
    home_sections:[...new Set([...sections,...HOME_SECTIONS])],
    styles
  };
}
let pending:Promise<LayoutConfig>|null=null;
export function loadSiteLayout(){
  if(!pending)pending=fetch(DATA_URL+"/site_design_settings?select=layout_config&id=eq.1",{
    credentials:"omit",cache:"no-store",headers:PUBLIC_HEADERS,signal:AbortSignal.timeout(8000)
  }).then(response=>response.ok?response.json():Promise.reject())
    .then(data=>parseLayout(Array.isArray(data)?data[0]?.layout_config:null))
    .catch(()=>DEFAULT_LAYOUT);
  return pending;
}
export function useSiteLayout(){
  const [layout,setLayout]=useState<LayoutConfig>(DEFAULT_LAYOUT);
  useEffect(()=>{let active=true;void loadSiteLayout().then(value=>{if(active)setLayout(value);});return()=>{active=false;};},[]);
  return layout;
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

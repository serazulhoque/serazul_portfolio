import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { render, renderAskMe, renderBlog, renderAbout, renderGallery } from "../.prerender/entry-server.js";
const file = new URL("../dist/index.html", import.meta.url);
const html = await readFile(file, "utf8");
const placeholder = '<div id="root"></div>';
if (!html.includes(placeholder)) throw new Error("Missing prerender root.");
const renderedHome=render();
const snapshot=JSON.parse(await readFile(new URL("../src/site-snapshot.json",import.meta.url),"utf8"));
// Fail the build instead of deploying a homepage with an empty hero heading.
if(!snapshot?.pageCopy?.hero_line_one || !renderedHome.includes(snapshot.pageCopy.hero_line_one))
  throw new Error("Homepage content was not included in initial HTML");
// Embed published custom text sizes/colors in the initial HTML. Otherwise
// field styles arrive only after a later API call and headings visibly jump.
const rules=Object.entries(snapshot.layout?.styles||{})
  .filter(([key])=>/^field:[a-z_]{2,80}$/.test(key))
  .map(([key,setting])=>{
    if(!setting||typeof setting!=="object")return "";
    const color=setting.titleColor||setting.bodyColor;
    const size=setting.titleSize||setting.bodySize;
    const declarations=[
      typeof color==="string"&&/^#[0-9a-f]{6}$/i.test(color)?"color:"+color+"!important":"",
      Number.isInteger(size)&&size>=10&&size<=96?"font-size:"+size+"px!important":""
    ].filter(Boolean).join(";");
    if(!declarations)return "";
    const selector='html [data-edit-key="'+key.slice(6)+'"]';
    // A saved light-theme color must not make text unreadable in dark mode.
    const darkRule=color?'html[data-theme="dark"] [data-edit-key="'+key.slice(6)+'"]{color:var(--ink)!important}':"";
    return selector+'{'+declarations+'}'+darkRule;
  }).filter(Boolean).join("\n");
const preparedHtml=rules?html.replace("</head>",'<style id="site-custom-field-styles">'+rules+"</style></head>"):html;
const output = preparedHtml.replace(placeholder, () => '<div id="root">' + renderedHome + '</div>');
await writeFile(file, output);
for (const [name, renderPage] of [["about.html",renderAbout],["gallery.html",renderGallery]]) {
  const path=new URL("../dist/"+name,import.meta.url);
  const original=await readFile(path,"utf8");
  if(!original.includes(placeholder))throw new Error("Missing prerender root in "+name);
  const withStyles=rules?original.replace("</head>",'<style id="site-custom-field-styles">'+rules+"</style></head>"):original;
  const rendered=renderPage();
  if(name==="about.html"&&!rendered.includes(snapshot.pageCopy.about_line_one))
    throw new Error("About text was not included in initial HTML");
  await writeFile(path,withStyles.replace(placeholder,()=>'<div id="root">'+rendered+'</div>'));
}
await mkdir(new URL("../dist/askme/", import.meta.url), {recursive:true});
const chatHtml = html.replace(placeholder, () => '<div id="root">' + renderAskMe() + '</div>')
  .replace(/<title>[^<]*<\/title>/,'<title>Ask Me — Serazul Hoque</title>')
  .replace(/<meta name="description" content="[^"]*"\s*\/>/,
    '<meta name="description" content="Ask questions and chat with Serazul Hoque’s website assistant." />')
  .replace("</head>", '<link rel="canonical" href="https://serazulhoque.github.io/askme" /></head>');
await writeFile(new URL("../dist/askme/index.html", import.meta.url), chatHtml);

// An unknown route (including an unpublished /blog/post-title) must render
// from the actual browser URL. Reusing homepage SSR markup causes React
// hydration mismatches on Blog routes and can leave stale homepage elements.
const fallbackHtml=html.replace(/<title>[^<]*<\/title>/,
  "<title>Serazul Hoque — Portfolio</title>");
if(!fallbackHtml.includes(placeholder))throw new Error("404 page is missing its empty root");
await writeFile(new URL("../dist/404.html", import.meta.url), fallbackHtml);
await mkdir(new URL("../dist/blog", import.meta.url), {recursive:true});
const blogHtml=preparedHtml.replace(placeholder,()=>'<div id="root">'+renderBlog()+'</div>')
  .replace(/<title>[^<]*<\/title>/,'<title>Blog — Serazul Hoque</title>')
  .replace(/<meta name="description" content="[^"]*"\s*\/>/,
    '<meta name="description" content="Read Serazul Hoque’s blog posts, writing, and reflections." />')
  .replace("</head>",'<link rel="canonical" href="https://serazulhoque.github.io/blog" /></head>');
await writeFile(new URL("../dist/blog/index.html", import.meta.url),blogHtml);
await rm(new URL("../.prerender", import.meta.url), { recursive: true, force: true });
console.log("Static HTML generated. Ready to deploy dist/.");

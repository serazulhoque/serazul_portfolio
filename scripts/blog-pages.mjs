import {readFile,writeFile,mkdir} from "node:fs/promises";
import {join} from "node:path";

const base=join(process.cwd(),"dist");
const template=await readFile(join(base,"index.html"),"utf8");
const escape=(text)=>String(text).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const slug=(title)=>title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
  .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,110)||"post";

try{
  const seen=new Set();
  let total=0;
  for(let page=1;page<=200;page++){
    const response=await fetch("https://serazul-backend.vercel.app/api/public/articles?page="+page+"&limit=50",{
      signal:AbortSignal.timeout(12000)
    });
    if(!response.ok)throw new Error("Public posts API unavailable");
    const {items=[]}=await response.json();
    if(!Array.isArray(items)||items.length===0)break;
    for(const item of items){
      if(item.status!=="published"||typeof item.title!=="string")continue;
      const name=slug(item.title);
      if(seen.has(name))continue;
      seen.add(name);
      const title=escape(item.title);
      const url="https://serazulhoque.github.io/blog/"+name;
      const description=escape("Read "+item.title+" by Serazul Hoque.");
      let html=template
        .replace(/<title>[^<]*<\/title>/,'<title>'+title+' — Serazul Hoque | Blog</title>')
        .replace(/<meta name="description" content="[^"]*"\s*\/>/,'<meta name="description" content="'+description+'" />')
        .replace(/<meta property="og:title" content="[^"]*"\s*\/>/,'<meta property="og:title" content="'+title+'" />')
        .replace(/<meta property="og:description" content="[^"]*"\s*\/>/,'<meta property="og:description" content="'+description+'" />')
        .replace(/<meta property="og:type" content="[^"]*"\s*\/>/,'<meta property="og:type" content="article" />');
      html=html.replace("</head>",'<meta property="og:url" content="'+url+'" /><meta name="twitter:card" content="summary" /><link rel="canonical" href="'+url+'" /></head>');
      const folder=join(base,"blog",name);
      await mkdir(folder,{recursive:true});
      await writeFile(join(folder,"index.html"),html);
      total++;
    }
    if(items.length<50)break;
  }
  console.log("Generated "+total+" static post page(s) with sharing previews.");
}catch(error){
  // Fresh posts still open through 404.html; a temporarily unavailable API
  // must not break deployment of the rest of the portfolio.
  console.warn("Could not pre-generate blog pages:",error.message);
}

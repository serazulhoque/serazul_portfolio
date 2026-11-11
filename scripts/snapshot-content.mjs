import {writeFile} from "node:fs/promises";

// Generate the initial visible page text at build time. The public browser
// API remains the authority for edits made after the latest deployment.
const base="https://krtnmzfucyfgalxvnuwj.supabase.co/rest/v1";
const headers={apikey:"sb_publishable_JBm0UjGe5L4S2FfLxwimGw_E0PTjx0N"};
async function load(path){
  const response=await fetch(base+path,{headers,signal:AbortSignal.timeout(12000),cache:"no-store"});
  if(!response.ok)throw new Error("Cannot snapshot public content: "+response.status+" "+path);
  const data=await response.json();
  if(!Array.isArray(data))throw new Error("Invalid public content response: "+path);
  return data;
}
const [pageRows,labelsRows,entryRows]=await Promise.all([
  load("/page_sections?select=*&id=eq.1"),
  load("/site_editable_text?select=key,value&limit=100"),
  load("/site_content_entries?select=id,section,kind,title,subtitle,body,date_label,sort_order&is_published=eq.true&order=sort_order.asc,created_at.asc&limit=300")
]);
if(!pageRows[0] || typeof pageRows[0].hero_line_one!=="string")
  throw new Error("Page copy missing; refusing to deploy an empty snapshot");
const labels=Object.fromEntries(labelsRows.filter(x=>typeof x.key==="string"&&typeof x.value==="string").map(x=>[x.key,x.value]));
const snapshot={pageCopy:pageRows[0],labels,items:entryRows};
await writeFile(new URL("../src/site-snapshot.json",import.meta.url),JSON.stringify(snapshot));
console.log("Loaded current public text into initial HTML build");

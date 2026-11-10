import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { render, renderAskMe } from "../.prerender/entry-server.js";
const file = new URL("../dist/index.html", import.meta.url);
const html = await readFile(file, "utf8");
const placeholder = '<div id="root"></div>';
if (!html.includes(placeholder)) throw new Error("Missing prerender root.");
const output = html.replace(placeholder, () => '<div id="root">' + render() + '</div>');
await writeFile(file, output);
await mkdir(new URL("../dist/askme/", import.meta.url), {recursive:true});
const chatHtml = html.replace(placeholder, () => '<div id="root">' + renderAskMe() + '</div>')
  .replace(/<title>[^<]*<\/title>/,'<title>Ask Me — Serazul Hoque</title>')
  .replace(/<meta name="description" content="[^"]*"\s*\/>/,
    '<meta name="description" content="Ask questions and chat with Serazul Hoque’s website assistant." />')
  .replace("</head>", '<link rel="canonical" href="https://serazulhoque.github.io/askme" /></head>');
await writeFile(new URL("../dist/askme/index.html", import.meta.url), chatHtml);

// GitHub Pages serves this fallback for /blog/post-title before a static
// post page exists. Root-relative assets keep it usable on deep URLs.
await writeFile(new URL("../dist/404.html", import.meta.url), output);
await mkdir(new URL("../dist/blog", import.meta.url), {recursive:true});
await writeFile(new URL("../dist/blog/index.html", import.meta.url), output);
await rm(new URL("../.prerender", import.meta.url), { recursive: true, force: true });
console.log("Static HTML generated. Ready to deploy dist/.");

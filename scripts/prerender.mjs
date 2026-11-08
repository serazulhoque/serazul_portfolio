import { readFile, writeFile, rm } from "node:fs/promises";
import { render } from "../.prerender/entry-server.js";
const file = new URL("../dist/index.html", import.meta.url);
const html = await readFile(file, "utf8");
const placeholder = '<div id="root"></div>';
if (!html.includes(placeholder)) throw new Error("Missing prerender root.");
await writeFile(file, html.replace(placeholder, () => '<div id="root">' + render() + '</div>'));
await rm(new URL("../.prerender", import.meta.url), { recursive: true, force: true });
console.log("Static HTML generated. Ready to deploy dist/.");

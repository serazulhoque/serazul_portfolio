import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = async (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

test("all public HTML entries hide outdated prerenders before the first paint", async () => {
  for (const path of ["index.html", "about.html", "gallery.html"]) {
    const html = await source(path);
    assert.ok(html.includes('document.documentElement.dataset.siteFresh="loading"'), path);
    assert.ok(html.includes('html[data-site-fresh="loading"] #root'), path);
    assert.ok(html.includes('id="site-content-error"'), path);
    assert.ok(html.includes("get_portfolio_public_content"), path);
    assert.doesNotMatch(html, /Loading the latest website content/i, path);
    assert.ok(html.indexOf('dataset.siteFresh="loading"') < html.indexOf('<div id="root">'), path);
  }
});

test("published content and design come from one uncached database refresh", async () => {
  const provider = await source("src/live-site.tsx");
  for (const key of ["pageCopy", "items", "labels", "design"])
    assert.ok(provider.includes(key), key);
  assert.match(provider, /get_portfolio_public_content/);
  assert.match(provider, /__portfolioFreshRequest/);
  assert.doesNotMatch(provider, /await Promise\.all\(/);
  assert.doesNotMatch(provider, /site-content-loading/);
  assert.match(provider, /data-site-fresh|dataset\.siteFresh/);
  assert.match(provider, /dataset\.siteFresh = "ready"/);
  assert.match(provider, /dataset\.siteFresh = "error"/);
  assert.match(provider, /visibilitychange/);
  assert.match(await source("src/public-api.ts"), /cache: "no-store"/);
  assert.match(await source("src/site-design.tsx"), /useLayoutEffect/);
  assert.doesNotMatch(await source("src/site-layout.ts"), /refreshAfterFirstPaint/);
  assert.doesNotMatch(await source("src/site-content.tsx"), /refreshAfterFirstPaint/);
});

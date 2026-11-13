import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getProfilePhoto, updateTabIcon } from "../src/profile-photo.ts";

test("site pages use the selected photo for the tab rather than the green S favicon", async () => {
  for (const page of ["index.html", "about.html", "gallery.html"]) {
    const html = await readFile(new URL("../" + page, import.meta.url), "utf8");
    assert.match(html, /data-profile-favicon/);
    assert.doesNotMatch(html, /href="\/favicon\.svg"/);
  }
  const main = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
  assert.match(main, /updateTabIcon\(\)/);
});

test("tab icon and header share one fresh profile lookup", async () => {
  const originalFetch = globalThis.fetch;
  const originalDocument = globalThis.document;
  let requested = 0;
  let iconHref = "data:,";
  const link = { set href(value) { iconHref = value; } };
  globalThis.fetch = async (url, options) => {
    requested++;
    assert.match(url, /\/api\/public\/profile$/);
    assert.equal(options.cache, "no-store");
    return {
      ok: true,
      json: async () => ({ url: "https://images.example.com/profile.webp" })
    };
  };
  globalThis.document = {
    querySelector: selector => selector === "link[data-profile-favicon]" ? link : null
  };
  try {
    assert.equal(await getProfilePhoto(), "https://images.example.com/profile.webp");
    await updateTabIcon();
    assert.equal(iconHref, "https://images.example.com/profile.webp");
    assert.equal(requested, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});

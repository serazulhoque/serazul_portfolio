import test from "node:test";
import assert from "node:assert/strict";
import { requestJSON, readCache, writeCache } from "../src/public-api.ts";
import { parsePageCopy, aboutIntroductionParagraphs } from "../src/page-copy-utils.ts";

const copy = {
  hero_line_one: "Engineering",
  hero_line_two: "Student",
  hero_phrase: "with a",
  hero_emphasis: "Purpose",
  hero_intro: "First paragraph.\n\nSecond paragraph.",
  about_line_one: "One",
  about_line_two: "Two",
  about_paragraph_one: "Three",
  about_paragraph_two: "Four",
  contact_heading: "Contact",
  contact_paragraph: "Hello.",
};

test("published page copy preserves paragraphs and rejects corrupt or incomplete caches", () => {
  assert.deepEqual(parsePageCopy(copy), copy);
  for (const value of [
    null,
    [],
    {},
    "broken",
    { ...copy, hero_intro: null },
    { ...copy, hero_intro: " " },
    { ...copy, hero_intro: "x".repeat(2501) },
  ]) {
    assert.equal(parsePageCopy(value), null);
  }
});

test("optional storage never prevents the site from loading", (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => "{broken",
      setItem: () => {
        throw new Error("Storage full");
      },
    },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  });
  assert.equal(readCache("copy"), null);
  assert.doesNotThrow(() => writeCache("copy", copy));
});

test("JSON requests reject HTTP failures and preserve successful empty responses", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(null, { status: 204 }),
  );
  assert.equal(await requestJSON("https://example.com"), null);
  globalThis.fetch = async () => new Response("{}", { status: 403 });
  await assert.rejects(
    requestJSON("https://example.com"),
    /could not be completed/,
  );
});

test("network timeout covers stalled response bodies, not only response headers", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url, { signal }) => ({
    ok: true,
    status: 200,
    json: () =>
      new Promise((_, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
      }),
  }));
  await assert.rejects(requestJSON("https://example.com", {}, 5), /timed out/);
});

test("unmount cancellation reaches the network request", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async (_url, { signal }) =>
      new Promise((_, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
      }),
  );
  const controller = new AbortController();
  const pending = requestJSON("https://example.com", {
    signal: controller.signal,
  });
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
});

test("About Me flows in reading order and preserves separately written paragraphs", () => {
  const sections = {
    about_paragraph_one: "First paragraph.\\n\\nSecond paragraph.",
    about_paragraph_two: "Third paragraph.\\n\\nFourth paragraph.",
  };
  assert.deepEqual(aboutIntroductionParagraphs(sections), [
    "First paragraph.", "Second paragraph.", "Third paragraph.", "Fourth paragraph.",
  ]);
  assert.deepEqual(aboutIntroductionParagraphs(null), []);
});

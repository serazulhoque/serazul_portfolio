import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

test("every Ask Me question uses the hosted language model",()=>{
  const source=readFileSync(new URL("../src/portfolio-assistant.tsx",import.meta.url),"utf8");
  assert.match(source,/fetch\(AI_URL/);
  assert.match(source,/body:JSON\.stringify\(\{question,history:/);
  assert.doesNotMatch(source,/findAnswer\(/);
  assert.doesNotMatch(source,/isRohingyaQuestion\(/);
  assert.match(source,/recordQuestion\(question,/);
});

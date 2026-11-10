import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

test("Ask Me recognizes Rohingya questions and doesn't reroute unrelated ones",()=>{
  const source=readFileSync(new URL("../src/portfolio-assistant.tsx",import.meta.url),"utf8");
  const line=source.split("\n").find(line=>line.startsWith("const isRohingyaQuestion ="));
  assert.ok(line,"Rohingya detector exists");
  const match=line.match(/=> \/(.*)\/i\.test\(text\)/);
  assert.ok(match,"Rohingya detector uses an explicit regex");
  const detects=new RegExp(match[1],"i");
  for(const question of [
    "Who are the Rohingya?","Why were Rohingya persecuted?",
    "Tell me about Arakan history","What happened in Myanmar?",
    "Where is the Rakhine State?"
  ])assert.ok(detects.test(question),question);
  for(const question of ["Who is Serazul?","How can I contact you?"])
    assert.equal(detects.test(question),false,question);
});

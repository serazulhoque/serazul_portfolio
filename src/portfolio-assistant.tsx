"use client";
import { useEffect, useRef, useState } from "react";
import "./portfolio-assistant.css";

type Message = { role: "visitor" | "guide"; text: string };
type PreparedAnswer = {
  id: string; question: string; answer: string; keywords: string;
  is_suggested: boolean; sort_order: number;
};
const welcome = "Hi! I'm Serazul's portfolio guide. Ask about his studies, interests, writing, or how to contact him. I use prepared website information, not a generative AI model.";
const fallback = "I don't have a prepared answer to that yet. Try a suggested question, or visit the About Me and Get in touch sections.";
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
const ignore = new Set(["a","an","the","is","are","was","does","do","what","who","where","how","can","i","he","his","him","me","you","your","of","for","to","in","on","about","and","tell","please"]);
function findAnswer(question: string, entries: PreparedAnswer[]) {
  const q = normalize(question);
  if(!q) return fallback;
  const qWords = q.split(" ").filter(word => word.length > 1 && !ignore.has(word));
  let best: PreparedAnswer | null = null;
  let highest = 0;
  for(const entry of entries){
    const exact = normalize(entry.question);
    const keywords = entry.keywords.split(",").map(normalize).filter(Boolean);
    let score = q===exact ? 100 : 0;
    if(exact.includes(q) && qWords.length>=2)score=Math.max(score,7);
    for(const keyword of keywords){
      if(q===keyword)score=Math.max(score,90);
      else if((" "+q+" ").includes(" "+keyword+" "))score=Math.max(score,5+keyword.split(" ").length);
    }
    const entryWords = new Set(exact.split(" ").filter(w=>w.length>1&&!ignore.has(w)));
    const shared = qWords.filter(w=>entryWords.has(w)).length;
    if(qWords.length>=2 && shared>=2 && shared/qWords.length>=.6) score=Math.max(score,4+shared);
    if(score>highest){highest=score;best=entry;}
  }
  return best && highest>=5 ? best.answer : fallback;
}

export default function PortfolioAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [entries,setEntries] = useState<PreparedAnswer[]>([]);
  const [messages, setMessages] = useState<Message[]>([{ role: "guide", text: welcome }]);
  const lastMessage = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const controller=new AbortController();
    fetch("https://serazul-backend.vercel.app/api/public/ask-me",{signal:controller.signal,credentials:"omit",cache:"no-store"})
      .then(response=>response.ok?response.json():Promise.reject())
      .then(data=>{
        if(!controller.signal.aborted && Array.isArray(data.items)){
          setEntries(data.items.filter((item:unknown)=>{
            if(!item||typeof item!=="object")return false;
            const v=item as Record<string,unknown>;
            return typeof v.question==="string"&&typeof v.answer==="string"&&typeof v.keywords==="string";
          }).slice(0,300));
        }
      }).catch(()=>{/* Show a useful fallback if answers are temporarily unavailable. */});
    return ()=>controller.abort();
  },[]);
  useEffect(() => { if (open) { field.current?.focus(); lastMessage.current?.scrollIntoView({ block: "end" }); } }, [open, messages]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  function send(value: string) {
    const question = value.trim().slice(0, 300);
    if (!question) return;
    setMessages(previous => [...previous, { role: "visitor", text: question }, { role: "guide", text: findAnswer(question, entries) }]);
    setInput("");
  }
  const topics=entries.filter(entry=>entry.is_suggested).slice(0,5);
  return <div className="portfolio-assistant">
    {open && <section className="assistant-panel" role="dialog" aria-modal="false" aria-label="Ask about Serazul">
      <header className="assistant-header">
        <div><strong>Ask about Serazul</strong><small>Free interactive portfolio guide</small></div>
        <button type="button" className="assistant-close" aria-label="Close assistant" onClick={() => setOpen(false)}>×</button>
      </header>
      <div className="assistant-messages" role="log" aria-live="polite" aria-label="Conversation">
        {messages.map((message, index) => <p key={index} className={"assistant-message assistant-" + message.role}>{message.text}</p>)}
        <div ref={lastMessage} />
      </div>
      {messages.length === 1 && topics.length>0 && <div className="assistant-topics">{topics.map(topic => <button type="button" key={topic.id} onClick={() => send(topic.question)}>{topic.question}</button>)}</div>}
      <form className="assistant-form" onSubmit={event => { event.preventDefault(); send(input); }}>
        <label className="assistant-sr" htmlFor="assistant-question">Ask a question</label>
        <input id="assistant-question" ref={field} value={input} onChange={event => setInput(event.target.value)} maxLength={300} placeholder="Ask me anything about Serazul…" autoComplete="off" />
        <button type="submit" disabled={!input.trim()} aria-label="Send question">↑</button>
      </form>
      <p className="assistant-disclaimer">Answers are based on prepared public information, not a live AI model. Don't enter private information.</p>
    </section>}
    <button type="button" className="assistant-launch" aria-expanded={open} aria-label={open ? "Close portfolio guide" : "Open portfolio guide"} onClick={() => setOpen(v => !v)}>
      <span aria-hidden="true">{open ? "×" : "✳"}</span>
      <span>{open ? "Close" : "Ask me"}</span>
    </button>
  </div>;
}

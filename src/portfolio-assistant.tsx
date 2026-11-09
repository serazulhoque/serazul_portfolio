"use client";
import { useEffect, useRef, useState } from "react";
import "./portfolio-assistant.css";

type Message = { role: "visitor" | "guide"; text: string };
type PreparedAnswer = {
  id: string; question: string; answer: string; keywords: string;
  is_suggested: boolean; sort_order: number;
};
const welcome = "Hi! I’m Serazul. I am studying Software Engineering. This is my portfolio website. Here you can find everything thing about me.";
const fallback = "Hey I am sorry I can’t answer to you right now. Instead, send here ";
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
  const [saveHistory,setSaveHistory] = useState(false);
  const conversationId=useRef<string>("");
  if(!conversationId.current)conversationId.current=crypto.randomUUID();
  const [profilePhoto,setProfilePhoto] = useState("");
  const [input, setInput] = useState("");
  const [entries,setEntries] = useState<PreparedAnswer[]>([]);
  const [messages, setMessages] = useState<Message[]>([{ role: "guide", text: welcome }]);
  const lastMessage = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const controller=new AbortController();
    fetch("https://serazul-backend.vercel.app/api/public/profile",{signal:controller.signal,credentials:"omit",cache:"default"})
      .then(response=>response.ok?response.json():Promise.reject())
      .then(data=>{if(!controller.signal.aborted && typeof data.url==="string" && /^https:\/\//.test(data.url))setProfilePhoto(data.url);})
      .catch(()=>{});
    return ()=>controller.abort();
  },[]);
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
  }, [open]);
  function send(value: string) {
    const question = value.trim().slice(0, 300);
    if (!question) return;
    const answer=findAnswer(question,entries);
    setMessages(previous => [...previous, { role: "visitor", text: question }, { role: "guide", text: answer }]);
    setInput("");
    // Messages are saved only when the visitor explicitly opts in.
    if(saveHistory){
      void fetch("https://krtnmzfucyfgalxvnuwj.supabase.co/rest/v1/ask_me_chat_history",{
        method:"POST",credentials:"omit",
        headers:{"apikey":"sb_publishable_JBm0UjGe5L4S2FfLxwimGw_E0PTjx0N","Content-Type":"application/json","Prefer":"return=minimal"},
        body:JSON.stringify({conversation_id:conversationId.current,question,answer:answer===fallback?fallback+"EMAIL":answer,
          unanswered:answer===fallback})
      }).catch(()=>{/* Chat stays usable even if optional history saving fails. */});
    }
  }
  const topics=entries.filter(entry=>entry.is_suggested).slice(0,5);
  const avatar=(size:"small"|"large"="small")=><span className={"assistant-avatar assistant-avatar-"+size}>
    {profilePhoto?<img src={profilePhoto} alt="" decoding="async" referrerPolicy="no-referrer" onError={()=>setProfilePhoto("")}/>:
      <span className="assistant-avatar-placeholder" aria-hidden="true">S</span>}
    {size==="large"&&<span className="assistant-status-dot" aria-hidden="true"/>}
  </span>;
  return <div className="portfolio-assistant">
    {open && <section className="assistant-panel" role="dialog" aria-modal="false" aria-label="Ask about Serazul">
      <div className="assistant-drag-indicator" aria-hidden="true"><span/><span/><span/></div>
      <header className="assistant-header">
        <button type="button" className="assistant-icon-button assistant-back" aria-label="Close conversation" onClick={()=>setOpen(false)}>
          <svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg>
        </button>
        {avatar("large")}
        <div className="assistant-heading"><a className="assistant-name-link" href="/" aria-label="Go to Serazul Hoque homepage"><strong>Serazul Hoque</strong></a><small>Active</small></div>
        <button type="button" className="assistant-icon-button assistant-close" aria-label="Close assistant" onClick={()=>setOpen(false)}>×</button>
      </header>
      <div className="assistant-messages" role="log" aria-live="polite" aria-label="Conversation">
        {messages.map((message,index)=><div className={"assistant-message-row assistant-row-"+message.role} key={index}>
          {message.role==="guide"&&avatar()}
          <p className={"assistant-message assistant-"+message.role}>{message.text}{message.role==="guide"&&message.text===fallback&&<a href="mailto:info.serazulh@gmail.com" aria-label="Email Serazul Hoque" style={{color:"inherit",fontWeight:700,textDecoration:"underline",textUnderlineOffset:"2px"}}>EMAIL</a>}</p>
        </div>)}
        <div ref={lastMessage}/>
      </div>
      {messages.length===1&&topics.length>0&&<div className="assistant-topics" aria-label="Suggested questions">
        {topics.map(topic=><button key={topic.id} type="button" onClick={()=>send(topic.question)}>{topic.question}</button>)}
      </div>}
      <label className="assistant-history-choice">
        <input type="checkbox" checked={saveHistory} onChange={event=>setSaveHistory(event.target.checked)}/>
        <span>Save my questions and replies for the site owner to review. Don't include private information.</span>
      </label>
      <form className="assistant-form" onSubmit={event=>{event.preventDefault();send(input);}}>
        <label className="assistant-sr" htmlFor="assistant-question">Ask a question</label>
        <input id="assistant-question" ref={field} value={input} onChange={event=>setInput(event.target.value)}
          maxLength={300} placeholder="Message" autoComplete="off"/>
        <button type="submit" disabled={!input.trim()} aria-label="Send question">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M12 3 4.7 10.3l1.4 1.4L11 6.8V21h2V6.8l4.9 4.9 1.4-1.4L12 3Z"/></svg>
        </button>
      </form>
      
    </section>}
    <button type="button" className="assistant-launch" aria-expanded={open} aria-label={open?"Close portfolio guide":"Open portfolio guide"} onClick={()=>setOpen(v=>!v)}>
      <span aria-hidden="true">{open?"×":"✳"}</span><span>{open?"Close":"Ask me"}</span>
    </button>
  </div>;
}

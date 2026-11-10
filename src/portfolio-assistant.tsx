"use client";
import { useEffect, useRef, useState } from "react";
import "./portfolio-assistant.css";

type Message = { role: "visitor" | "guide"; text: string; id?: string; sources?: {title:string;url:string}[] };
type PreparedAnswer = {
  id: string; question: string; answer: string; keywords: string;
  is_suggested: boolean; sort_order: number;
};
const welcome = "Hi! I’m AI Version of Serazul Hoque, the virtual version of Serazul on this portfolio. Ask me anything!";
const fallback = "Hey I am sorry I can’t answer to you right now. Instead, send here ";
const AI_URL = "https://serazul-backend.vercel.app/api/public/ask-ai";

export default function PortfolioAssistant({standalone=false}:{standalone?:boolean}) {
  const [open, setOpen] = useState(standalone);
  const conversationId=useRef<string>("");
  if(!conversationId.current)conversationId.current=crypto.randomUUID();
  const [profilePhoto,setProfilePhoto] = useState("");
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
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
  function recordQuestion(question:string,answer:string,unanswered:boolean){
    // Preserve the existing admin chat history, including research responses.
    void fetch("https://krtnmzfucyfgalxvnuwj.supabase.co/rest/v1/ask_me_chat_history",{
      method:"POST",credentials:"omit",
      headers:{"apikey":"sb_publishable_JBm0UjGe5L4S2FfLxwimGw_E0PTjx0N","Content-Type":"application/json","Prefer":"return=minimal"},
      body:JSON.stringify({conversation_id:conversationId.current,question,answer:answer.slice(0,2500),unanswered})
    }).catch(()=>{/* Chat stays usable when history storage is unavailable. */});
  }
  async function send(value: string) {
    const question=value.trim().slice(0,300);
    if(!question||thinking)return;
    setInput("");
    setThinking(true);
    const id=crypto.randomUUID();
    setMessages(old=>[...old,{role:"visitor",text:question},{role:"guide",id,text:"Thinking…"}]);
    let answer=fallback;
    let sources:{title:string;url:string}[]=[];
    try {
      const response=await fetch(AI_URL,{
        method:"POST",credentials:"omit",cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({question,history:messages.filter(message=>message.role==="visitor" || (message.role==="guide" && message.text!=="Thinking…" && message.text!==welcome)).slice(-8).map(message=>({role:message.role,text:message.text.slice(0,700)}))}),
        signal:AbortSignal.timeout(60000)
      });
      if(!response.ok)throw new Error("Model unavailable");
      const data=await response.json();
      if(typeof data.answer!=="string"||!data.answer.trim())throw new Error("Empty answer");
      answer=data.answer.trim().slice(0,1200);
      if(Array.isArray(data.sources))sources=data.sources.filter((source:unknown)=>{
        if(!source||typeof source!=="object")return false;
        const item=source as Record<string,unknown>;
        return typeof item.title==="string"&&typeof item.url==="string"
          &&(/^https:\/\/(?:rohingyaresearch\.org\/|en\.wikipedia\.org\/)/.test(item.url));
      }).slice(0,2);
    }catch{/* Preserve email fallback if inference is unavailable. */}
    setMessages(old=>old.map(message=>message.id===id?{...message,text:answer,sources}:message));
    recordQuestion(question,answer===fallback?fallback+"EMAIL":answer+(sources.length?" Source: "+sources[0].url:""),answer===fallback);
    setThinking(false);
  }
  const topics=entries.filter(entry=>entry.is_suggested).slice(0,5);
  const avatar=(size:"small"|"large"="small")=><span className={"assistant-avatar assistant-avatar-"+size}>
    {profilePhoto?<img src={profilePhoto} alt="" decoding="async" referrerPolicy="no-referrer" onError={()=>setProfilePhoto("")}/>:
      <span className="assistant-avatar-placeholder" aria-hidden="true">S</span>}
    {size==="large"&&<span className="assistant-status-dot" aria-hidden="true"/>}
  </span>;
  return <div className={"portfolio-assistant"+(standalone?" portfolio-assistant--standalone":"")}>
    {open && <section className="assistant-panel" role="dialog" aria-modal="false" aria-label="Ask about Serazul">
      <div className="assistant-drag-indicator" aria-hidden="true"><span/><span/><span/></div>
      <header className="assistant-header">
        <button type="button" className="assistant-icon-button assistant-back" aria-label={standalone?"Return to homepage":"Close conversation"} onClick={()=>standalone?window.location.assign("/"):setOpen(false)}>
          <svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg>
        </button>
        {avatar("large")}
        <div className="assistant-heading"><a className="assistant-name-link" href="/" aria-label="Go to Serazul Hoque homepage"><strong>AI Version of Serazul Hoque</strong></a><small>Active</small></div>
        <button type="button" className="assistant-icon-button assistant-close" aria-label={standalone?"Return to homepage":"Close assistant"} onClick={()=>standalone?window.location.assign("/"):setOpen(false)}>×</button>
      </header>
      <div className="assistant-messages" role="log" aria-live="polite" aria-label="Conversation">
        {messages.map((message,index)=><div className={"assistant-message-row assistant-row-"+message.role} key={index}>
          {message.role==="guide"&&avatar()}
          <p className={"assistant-message assistant-"+message.role}>{message.text}{message.role==="guide"&&message.text===fallback&&<a href="mailto:serazulhoque@proton.me" aria-label="Email Serazul Hoque" style={{color:"inherit",fontWeight:700,textDecoration:"underline",textUnderlineOffset:"2px"}}>EMAIL</a>}
          {message.sources?.map(source=><a key={source.url} className="assistant-research-link" href={source.url} target="_blank" rel="noopener noreferrer">Source: {source.title} ↗</a>)}</p>
        </div>)}
        <div ref={lastMessage}/>
      </div>
      {messages.length===1&&topics.length>0&&<div className="assistant-topics" aria-label="Suggested questions">
        {topics.map(topic=><button key={topic.id} type="button" onClick={()=>void send(topic.question)}>{topic.question}</button>)}
      </div>}
      <form className="assistant-form" onSubmit={event=>{event.preventDefault();void send(input);}}>
        <label className="assistant-sr" htmlFor="assistant-question">Ask a question</label>
        <input id="assistant-question" ref={field} value={input} onChange={event=>setInput(event.target.value)}
          maxLength={300} placeholder="Message" autoComplete="off"/>
        <button type="submit" disabled={!input.trim()||thinking} aria-label="Send question">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M12 3 4.7 10.3l1.4 1.4L11 6.8V21h2V6.8l4.9 4.9 1.4-1.4L12 3Z"/></svg>
        </button>
      </form>
      
    </section>}
    {!standalone&&<button type="button" className="assistant-launch" aria-expanded={open} aria-label={open?"Close portfolio guide":"Open portfolio guide"} onClick={()=>setOpen(v=>!v)}>
      <span aria-hidden="true">{open?"×":"✳"}</span><span>{open?"Close":"Ask me"}</span>
    </button>}
  </div>;
}

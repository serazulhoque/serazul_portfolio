"use client";
import { useEffect, useRef, useState } from "react";
import "./portfolio-assistant.css";

type Message = { role: "visitor" | "guide"; text: string };
const welcome = "Hi! I'm Serazul's portfolio guide. Ask about his studies, interests, writing, or how to contact him. I use prepared website information, not a generative AI model.";
const topics = ["Who is Serazul?", "What is he learning?", "What is his AI idea?", "How can I contact him?"];

function answer(question: string): string {
  const q = question.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  if (/hello|^hi$|^hey$|good morning|good evening/.test(q)) return "Hello! Feel free to ask about Serazul's software engineering journey, his interests, or his writing.";
  if (/rohingya|language|voice|speech|translation/.test(q)) return "Serazul is interested in making technology more accessible. One idea he's exploring is a conversational AI experience that can communicate in Rohingya. This is an idea in development, not a finished product.";
  if (/ai|artificial intelligence|machine learning/.test(q)) return "He's interested in useful AI, especially language-centered experiences and making technology easier for people to use. His Rohingya-language assistant concept is one area of curiosity.";
  if (/skill|programming|code|technology|stack|learn|study|studies|software|education|university|career/.test(q)) return "Serazul is studying software engineering. His current learning interests include C programming, pseudocode, flowcharts, foundational programming logic, and practical AI. His portfolio describes him as a student who is still building his skills.";
  if (/article|publication|writing|blog|read/.test(q)) return "You can browse his published articles in the Publication section on the homepage. Select a title to read it and swipe to move between articles on mobile.";
  if (/project|portfolio|build|work/.test(q)) return "His portfolio focuses on learning software engineering and exploring practical technology. One longer-term project idea is a Rohingya-language conversational AI. For completed work, check the projects and publications shown on this website.";
  if (/contact|email|message|reach|social|facebook|linkedin|instagram|twitter/.test(q)) return "Go to Get in touch on the homepage. There you can use Send an email or Follow me to find Serazul's social profiles.";
  if (/about|who|serazul|background|goal|purpose|yourself/.test(q)) return "Serazul Hoque is a software engineering student interested in useful AI, accessible technology, and helping people be understood. Read the separate About Me page to learn more about his journey.";
  if (/thank/.test(q)) return "You're welcome! You can ask about his interests, studies, writing, or contact options.";
  return "I don't have a verified answer to that yet. Try asking about Serazul's studies, AI idea, writing, or contact details. You can also explore his About Me page.";
}

export default function PortfolioAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "guide", text: welcome }]);
  const lastMessage = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
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
    setMessages(previous => [...previous, { role: "visitor", text: question }, { role: "guide", text: answer(question) }]);
    setInput("");
  }
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
      {messages.length === 1 && <div className="assistant-topics">{topics.map(topic => <button type="button" key={topic} onClick={() => send(topic)}>{topic}</button>)}</div>}
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

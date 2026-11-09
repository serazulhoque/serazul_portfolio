import {useEffect,useState,type FormEvent} from "react";

type VisitorMessage={id:string;display_name:string;message:string;created_at:string};
const API="https://serazul-backend.vercel.app/api/public/visitor-wall";

export default function VisitorWall(){
  const [items,setItems]=useState<VisitorMessage[]>([]);
  const [name,setName]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState("");
  useEffect(()=>{
    const controller=new AbortController();
    fetch(API,{signal:controller.signal,credentials:"omit",cache:"no-store"})
      .then(r=>r.ok?r.json():Promise.reject())
      .then(data=>{if(!controller.signal.aborted&&Array.isArray(data.items))setItems(data.items);})
      .catch(()=>{});
    return ()=>controller.abort();
  },[]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(busy)return;
    setBusy(true);setStatus("");
    try{
      const response=await fetch(API,{
        method:"POST",headers:{"Content-Type":"application/json"},
        credentials:"omit",body:JSON.stringify({display_name:name.trim(),message:message.trim()})
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||"Could not submit your message.");
      setName("");setMessage("");
      setStatus("Thank you! Your note has been sent for review. It will appear here only if approved.");
    }catch(error){
      setStatus(error instanceof Error?error.message:"Could not submit your message. Try again.");
    }finally{setBusy(false);}
  }
  return <section className="visitor-wall wrap section-space" id="visitor-wall" aria-labelledby="visitor-wall-title">
    <div className="section-label"><span>05 / LEAVE YOUR MARK</span><span className="small-line"/></div>
    <div className="visitor-wall-intro">
      <div>
        <p className="visitor-wall-kicker">THE HUMAN SIDE OF THE INTERNET</p>
        <h2 id="visitor-wall-title">A little note.<br/><em>A lasting connection.</em></h2>
      </div>
      <p>What would you build to make the world a little better? Leave a thought, a kind word, or a question.</p>
    </div>
    {items.length>0&&<div className="visitor-wall-cards">
      {items.slice(0,8).map((item,index)=><article className="visitor-wall-card" key={item.id}>
        <span className="visitor-wall-number">{String(index+1).padStart(2,"0")} / A VOICE</span>
        <p className="visitor-wall-quote">“{item.message}”</p>
        <p className="visitor-wall-author">— {item.display_name}</p>
      </article>)}
    </div>}
    <div className="visitor-wall-compose">
      <div><p className="visitor-wall-kicker">YOUR TURN</p>
        <h3>Leave a thought.</h3>
        <p>Every message is reviewed before appearing publicly. Your message will not appear immediately, and not all submissions will be published.</p>
      </div>
      <form onSubmit={submit}>
        <label htmlFor="visitor-name">Your display name</label>
        <input id="visitor-name" value={name} onChange={e=>setName(e.target.value)} placeholder="How should we call you?" required maxLength={60}/>
        <label htmlFor="visitor-note">Your message</label>
        <textarea id="visitor-note" value={message} onChange={e=>setMessage(e.target.value)}
          placeholder="Share a thought, idea, or question…" required minLength={4} maxLength={500} rows={4}/>
        <div className="visitor-wall-submit">
          <button className="button button-dark" type="submit" disabled={busy}>{busy?"Submitting…":"Submit for review ↗"}</button>
          <span>{message.length}/500</span>
        </div>
        <p role="status" aria-live="polite" className="visitor-wall-feedback">{status}</p>
      </form>
    </div>
  </section>;
}

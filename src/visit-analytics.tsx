import {useEffect} from "react";

/* Lightweight visit counter: no cookies, fingerprinting, IP or full referrer URLs. */
export default function VisitAnalytics() {
  useEffect(() => {
    const privacyNavigator=navigator as Navigator & {globalPrivacyControl?:boolean};
    if(navigator.doNotTrack==="1" || privacyNavigator.globalPrivacyControl===true) return;
    const path=window.location.pathname.endsWith("/about.html")?"/about.html":"/";
    let sessionId="";
    try {
      sessionId=sessionStorage.getItem("portfolio-visit-session")||"";
      if(!/^[0-9a-f-]{36}$/i.test(sessionId)) {
        sessionId=crypto.randomUUID();
        sessionStorage.setItem("portfolio-visit-session",sessionId);
      }
    }catch { sessionId=crypto.randomUUID(); }
    const device=window.innerWidth<640?"mobile":window.innerWidth<1024?"tablet":"desktop";
    let referrer="direct";
    try {
      if(document.referrer){
        const host=new URL(document.referrer).hostname.toLowerCase();
        if(host && !host.endsWith("serazulhoque.github.io"))referrer=host.slice(0,100);
      }
    }catch {/* Unknown or private referrer. */}
    fetch("https://serazul-backend.vercel.app/api/public/visit",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({session_id:sessionId,page:path,device,referrer_domain:referrer}),
      credentials:"omit",
      keepalive:true
    }).catch(()=>{/* Tracking never interrupts the site. */});
  },[]);
  return null;
}

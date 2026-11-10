// Original, quiet ambient soundtrack. No audio files, third-party services or UI.
const MUTE_KEY = "serazul:music-muted";
let context: AudioContext | null = null;
let master: GainNode | null = null;
let voices: OscillatorNode[] = [];
let pulse: ReturnType<typeof setInterval> | null = null;
let step = 0;
let muted = false;

function startSound() {
  if (muted) return;
  try {
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0;
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 850;
      master.connect(filter);
      filter.connect(context.destination);
      // Soft consonant chord: an original, unobtrusive ambient texture.
      for (const frequency of [110, 164.81, 220, 329.63]) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.value = 0.12;
        oscillator.connect(gain);
        gain.connect(master);
        oscillator.start();
        voices.push(oscillator);
      }
    }
    void context.resume().then(() => {
      if (!context || !master || muted) return;
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(0.038, context.currentTime, 2);
      if (pulse) return;
      // Slow changing notes keep the ambient texture musical without distraction.
      const notes = [220, 246.94, 261.63, 329.63, 293.66, 261.63, 246.94, 196];
      pulse = setInterval(() => {
        if (!context || !master || muted) return;
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        const now = context.currentTime;
        oscillator.type = "sine";
        oscillator.frequency.value = notes[step++ % notes.length];
        envelope.gain.setValueAtTime(0, now);
        envelope.gain.linearRampToValueAtTime(0.16, now + 0.8);
        envelope.gain.exponentialRampToValueAtTime(0.001, now + 4);
        oscillator.connect(envelope);
        envelope.connect(master);
        oscillator.start(now);
        oscillator.stop(now + 4.1);
        oscillator.onended = () => {oscillator.disconnect();envelope.disconnect();};
      }, 2800);
    }).catch(() => {});
  } catch { /* Audio unavailable: the website remains fully functional. */ }
}
function stopSound() {
  if (pulse) {clearInterval(pulse);pulse = null;}
  if (context && master) {
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(0, context.currentTime, 0.15);
  }
}

/**
 * Music begins after the first real visitor interaction (browser autoplay rule).
 * Three taps within 1.2 seconds in approximately the same non-interactive
 * area of the page toggle it. This adds no visible button and leaves links alone.
 */
export function installAmbientMusic() {
  try{muted=localStorage.getItem(MUTE_KEY)==="true";}catch{}
  const begin = () => {if (!muted) startSound();};
  const key = (event: KeyboardEvent) => {
    if (!event.isTrusted || event.repeat || event.key==="Tab") return;
    begin();
  };
  let tapCount = 0, lastTime = 0, lastX = 0, lastY = 0;
  const tap = (event: PointerEvent) => {
    if (!event.isTrusted || event.button!==0) return;
    // Tapping links, menu, photos and form controls keeps their original behavior.
    const target=event.target;
    if (!(target instanceof Element) || target.closest('a,button,input,textarea,select,summary,[role="button"],[contenteditable="true"]')) return;
    const now=performance.now();
    if (now-lastTime>1200 || Math.hypot(event.clientX-lastX,event.clientY-lastY)>55)tapCount=0;
    tapCount++;
    lastTime=now;lastX=event.clientX;lastY=event.clientY;
    if(tapCount===3){
      tapCount=0;
      muted=!muted;
      try{localStorage.setItem(MUTE_KEY,String(muted));}catch{}
      if(muted)stopSound();else startSound();
    } else if(!muted)begin();
  };
  // Any first touch or click can unlock audio, including the existing menu.
  document.addEventListener("pointerdown",begin,{passive:true});
  document.addEventListener("pointerup",tap,{passive:true});
  document.addEventListener("keydown",key);
  return () => {
    document.removeEventListener("pointerdown",begin);
    document.removeEventListener("pointerup",tap);
    document.removeEventListener("keydown",key);
    stopSound();
    voices.forEach(voice=>{try{voice.stop();}catch{}});
    voices=[];
    void context?.close().catch(()=>{});
    context=null;master=null;
  };
}

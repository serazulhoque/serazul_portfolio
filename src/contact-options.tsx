import { useEffect, useRef, useState, type FormEvent } from "react";

import "./contact-options.css";

const CONTACT_EMAIL = "hello@serazulh.com";
const FORM_ENDPOINT = "https://formsubmit.co/ajax/" + CONTACT_EMAIL;

export default function ContactOptions() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) firstField.current?.focus();
  }, [open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    if (honeypot.trim()) return;
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();
    if (!cleanName || !cleanEmail || !cleanSubject || cleanMessage.length < 4) {
      setFeedback("Please fill in all fields and write a message.");
      return;
    }
    setSending(true);
    setFeedback("");
    try {
      // FormSubmit delivers the email after the address owner activates this
      // endpoint by clicking its one-time confirmation message.
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          subject: cleanSubject,
          message: cleanMessage,
          _subject: "New message from serazulh.com",
          _template: "table",
          _url: "https://serazulh.com/get-in-touch",
          _honey: ""
        }),
        signal: AbortSignal.timeout(20000)
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok || !result || typeof result !== "object" ||
          !("success" in result) ||
          !((result as { success: unknown }).success === true ||
            (result as { success: unknown }).success === "true")) {
        throw new Error("The email service could not confirm your submission.");
      }
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setFeedback("Your message was submitted for email delivery. Thank you!");
    } catch {
      setFeedback("The form could not submit your message. Please try again, or use the email link below.");
    } finally {
      setSending(false);
    }
  }

  return <div className="contact-options">
    <div className="contact-option-row">
      <button type="button" className="button button-dark" aria-expanded={open}
        aria-controls="contact-mail-panel" onClick={() => {setOpen(current => !current);setFeedback("");}}>
        SEND TO ME
      </button>
      <a className="button button-outline" href="/#visitor-compose">Leave a Thought</a>
    </div>
    {open && <div className="contact-mail-panel" id="contact-mail-panel">
      <h3>Send me a message.</h3>
      <p>Write to {CONTACT_EMAIL}. I’d be glad to hear from you.</p>
      <form className="contact-mail-form" method="POST"
        action={"https://formsubmit.co/" + CONTACT_EMAIL} onSubmit={submit}>
        <div className="contact-mail-fields">
          <label htmlFor="contact-sender-name">Your name
            <input ref={firstField} id="contact-sender-name" name="name" value={name}
              onChange={event=>setName(event.target.value)} autoComplete="name" maxLength={80} required />
          </label>
          <label htmlFor="contact-sender-email">Your email
            <input id="contact-sender-email" name="email" type="email" value={email}
              onChange={event=>setEmail(event.target.value)} autoComplete="email" maxLength={254} required />
          </label>
        </div>
        <label htmlFor="contact-sender-subject">Subject
          <input id="contact-sender-subject" name="subject" value={subject}
            onChange={event=>setSubject(event.target.value)} maxLength={140} required />
        </label>
        <label htmlFor="contact-sender-message">Message
          <textarea id="contact-sender-message" name="message" value={message}
            onChange={event=>setMessage(event.target.value)} minLength={4} maxLength={2000} rows={5} required />
        </label>
        <input className="contact-mail-honey" name="_honey" tabIndex={-1}
          aria-hidden="true" autoComplete="off" value={honeypot}
          onChange={event=>setHoneypot(event.target.value)} />
        <button className="button button-dark" disabled={sending} type="submit">
          {sending ? "Sending…" : "Send message"}
        </button>
        <p className="contact-mail-feedback" role="status" aria-live="polite">{feedback}</p>
        <p className="contact-mail-privacy">
          This form uses a third-party service, FormSubmit, to forward your message by email.
          Please don’t send sensitive information. <a href="https://formsubmit.co/privacy.pdf"
          target="_blank" rel="noopener noreferrer">Privacy details</a>.
          Or <a href={"mailto:"+CONTACT_EMAIL}>open your email app</a>.
        </p>
      </form>
    </div>}
  </div>;
}

"use client";

import { useId, useState } from "react";

export function PilotContact({ destination }: { destination: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const id = useId();
  const email = destination.replace(/^mailto:/, "").split("?")[0];

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      setMessage("Email address copied.");
    } catch {
      setMessage("Select and copy the email address above.");
    }
  }

  return (
    <div>
      <button className="primary" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        Discuss a pilot
      </button>
      {open && (
        <section id={id} aria-label="Pilot contact details">
          <p>Email <strong style={{ overflowWrap: "anywhere", userSelect: "text" }}>{email}</strong> to discuss a pilot.</p>
          <button className="secondary" onClick={copyEmail}>Copy email address</button>
          <p className="small">Copy the address into your preferred email service. No message is sent automatically.</p>
          <p role="status" aria-live="polite">{message}</p>
        </section>
      )}
    </div>
  );
}

"use client";
// app/waitlist/page.tsx

import { useState, useEffect } from "react";
import Image from "next/image";
import logo from "@/images/logo.png";


const FEATURES = [
  {
    title: "Event Ticketing & Discovery",
    desc: "Create, sell, and discover events. Tickets delivered instantly to your inbox.",
  },
  {
    title: "Vendor Marketplace",
    desc: "Connect event organizers with venues, caterers, DJs, photographers, and every other service they need - in one place.",
  },
  {
    title: "M-Pesa Native Payments",
    desc: "Buy tickets and pay vendors directly with M-Pesa. No card required. No friction.",
  },
  {
    title: "Smart Ticket Scanning",
    desc: "Multi-station QR scanning, tokenized scanner links, and real-time admission tracking — no app required.",
  },
];

const ROLES = [
  { value: "attendee", label: "Event Attendee" },
  { value: "organizer", label: "Event Organizer" },
  { value: "vendor", label: "Service Provider" },
];

export default function WaitlistPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("attendee");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [position, setPosition] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [count, setCount] = useState<number>(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
    async function fetchCount() {
      try {
        const res = await fetch("/api/waitlist/count");
        const data = await res.json();
        setCount(data.count);
      } catch {
        console.error("Failed to fetch count");
        setCount(0);
      }
    }
    fetchCount();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setPosition(data.position);
      setSubmitted(true);
      setCount(typeof data.count === "number" ? data.count : 0);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        :root{--ink:#0a0a0a;--ink2:#3a3a3a;--ink3:#888;--surface:#fafaf8;--card:#f3f3f0;--border:#e2e2dd;--green:#1a7a4a;--greenl:#e8f5ee;--greenborder:#b8ddc9}
        .r{font-family:'DM Sans',sans-serif;background:var(--surface);color:var(--ink);min-height:100vh;line-height:1.6}
        .nav{display:flex;align-items:center;justify-content:space-between;padding:1.25rem 2rem;border-bottom:1px solid var(--border);position:sticky;top:0;background:rgba(250,250,248,0.92);backdrop-filter:blur(12px);z-index:10}
        .logo{font-family:'DM Serif Display',serif;font-size:1.35rem;color:var(--ink);letter-spacing:-0.02em;text-decoration:none}
        .tag{font-size:0.7rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink);padding:0.35rem 0.75rem;}
        .hero{max-width:680px;margin:0 auto;padding:5rem 2rem 3rem;text-align:center;opacity:0;transform:translateY(20px);transition:opacity .7s ease,transform .7s ease}
        .hero.v{opacity:1;transform:translateY(0)}
        .pill{display:inline-flex;align-items:center;gap:.4rem;font-size:.72rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--green);background:var(--greenl);border:1px solid var(--greenborder);padding:.35rem .9rem;border-radius:100px;margin-bottom:2rem}
        .dot{width:6px;height:6px;background:var(--green);border-radius:50%;animation:pulse 2s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        h1{font-family:'DM Serif Display',serif;font-size:clamp(2.4rem,6vw,3.8rem);line-height:1.1;letter-spacing:-.03em;margin-bottom:1.25rem}
        h1 em{font-style:italic;color:var(--ink2)}
        .sub{font-size:1.05rem;color:var(--ink2);font-weight:300;max-width:480px;margin:0 auto .75rem;line-height:1.7}
        .cnt{font-size:.8rem;color:var(--ink3);margin-bottom:2.5rem}
        .cnt strong{color:var(--ink);font-weight:600}
        .card{background:#fff;border:1px solid var(--border);border-radius:20px;padding:2rem;max-width:480px;margin:0 auto;box-shadow:0 1px 3px rgba(0,0,0,.04),0 8px 32px rgba(0,0,0,.06);opacity:0;transform:translateY(16px);transition:opacity .7s ease .2s,transform .7s ease .2s}
        .card.v{opacity:1;transform:translateY(0)}
        .f{margin-bottom:1rem}
        .lbl{display:block;font-size:.75rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink2);margin-bottom:.4rem}
        input[type=text],input[type=email]{width:100%;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:.75rem 1rem;font-family:'DM Sans',sans-serif;font-size:.95rem;color:var(--ink);outline:none;transition:border-color .2s,box-shadow .2s}
        input:focus{border-color:var(--ink);box-shadow:0 0 0 3px rgba(10,10,10,.07)}
        .rg{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem}
        .rb{padding:.6rem .5rem;border:1px solid var(--border);border-radius:10px;background:var(--card);font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:500;color:var(--ink2);cursor:pointer;transition:all .15s;text-align:center}
        .rb:hover{border-color:var(--ink2);color:var(--ink)}
        .rb.a{background:var(--ink);border-color:var(--ink);color:#fff}
        .sub-btn{width:100%;background:var(--ink);color:#fff;border:none;border-radius:10px;padding:.9rem;font-family:'DM Sans',sans-serif;font-size:.95rem;font-weight:600;cursor:pointer;transition:opacity .2s,transform .1s;margin-top:.5rem}
        .sub-btn:hover:not(:disabled){opacity:.85}
        .sub-btn:active:not(:disabled){transform:scale(.99)}
        .sub-btn:disabled{opacity:.5;cursor:not-allowed}
        .perk{display:flex;align-items:flex-start;gap:.6rem;background:var(--greenl);border:1px solid var(--greenborder);border-radius:10px;padding:.75rem 1rem;margin-top:1rem;font-size:.8rem;color:var(--green);line-height:1.5}
        .err{background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:.6rem .9rem;font-size:.82rem;color:#dc2626;margin-top:.75rem}
        .ok{text-align:center;padding:1rem 0}
        .ok-icon{font-size:2.5rem;margin-bottom:.75rem;display:block}
        .ok h2{font-family:'DM Serif Display',serif;font-size:1.5rem;margin-bottom:.5rem}
        .ok p{font-size:.88rem;color:var(--ink2);line-height:1.6}
        .pos{display:inline-block;background:var(--ink);color:#fff;font-size:.8rem;font-weight:600;padding:.4rem 1.1rem;border-radius:100px;margin:1rem 0;letter-spacing:.04em}
        .feats{max-width:860px;margin:0 auto 0;padding:0 2rem 5rem;opacity:0;transform:translateY(16px);transition:opacity .7s ease .35s,transform .7s ease .35s}
        .feats.v{opacity:1;transform:translateY(0)}
        .feats-lbl{font-size:.72rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3);text-align:center;margin-bottom:2.5rem}
        .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1px;background:var(--border);border:1px solid var(--border);border-radius:16px;overflow:hidden}
        .feat{background:var(--surface);padding:1.75rem;transition:background .2s}
        .feat:hover{background:#fff}
        .feat-icon{font-size:1.4rem;margin-bottom:.75rem;display:block}
        .feat-title{font-family:'DM Serif Display',serif;font-size:1rem;color:var(--ink);margin-bottom:.4rem;letter-spacing:-.01em}
        .feat-desc{font-size:.82rem;color:var(--ink2);line-height:1.65;font-weight:300}
        footer{text-align:center;padding:2rem;border-top:1px solid var(--border);font-size:.78rem;color:var(--ink3)}
        @media(max-width:600px){.hero{padding:3.5rem 1.25rem 2rem}.card{padding:1.5rem 1.25rem}.feats{padding:0 1.25rem 4rem}.nav{padding:1rem 1.25rem}}
      `}</style>

      <div className="r">
        <nav className="nav">
          <Image
            className="logo"
            src={logo}
            alt="Noizy Hub"
            width={94}
            height={24}
          />

          <span className="tag">Coming Soon</span>
        </nav>

        <div className={`hero ${visible ? "v" : ""}`}>
          <div className="pill">
            <span className="dot" /> Now accepting early access signups
          </div>
          <h1>
            Event management platform,
            <br />
            <em>built for everyone.</em>
          </h1>
          <p className="sub">
            Discover events, sell tickets with M-Pesa, connect with vendors, and
            manage admissions — all in one place.
          </p>
          <p className="cnt">
            <strong>{(count ?? 0).toLocaleString()}</strong> people already on the list
          </p>

          <div className={`card ${visible ? "v" : ""}`}>
            {submitted ? (
              <div className="ok">
                <span className="ok-icon">✦</span>
                <h2>You're on the list.</h2>
                {position && <div className="pos">#{position} in line</div>}
                <p>
                  We'll email you the moment early access opens.
                  <br />
                  Your first month of Pro is on us — no card needed.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="f">
                  <label className="lbl">Your name</label>
                  <input
                    type="text"
                    placeholder="James Mwangi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="f">
                  <label className="lbl">Email address *</label>
                  <input
                    type="email"
                    placeholder="james@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="f">
                  <label className="lbl">I am a…</label>
                  <div className="rg">
                    {ROLES.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        className={`rb ${role === r.value ? "a" : ""}`}
                        onClick={() => setRole(r.value)}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  className="sub-btn"
                  type="submit"
                  disabled={loading || !email.trim()}
                >
                  {loading ? "Joining…" : "Join the waitlist →"}
                </button>
                <div className="perk">
                  <span>
                    <strong>Early access perk —</strong> Bet on your first event or vendor profile to be absolutely free, no revenue splits, no platform fees
                  </span>
                </div>
                {error && <div className="err">{error}</div>}
              </form>
            )}
          </div>
        </div>

        <div className={`feats ${visible ? "v" : ""}`}>
          <p className="feats-lbl">What's coming</p>
          <div className="grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="feat">
                <p className="feat-title">{f.title}</p>
                <p className="feat-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <footer>
          © {new Date().getFullYear()} Noizy Hub · Product of Noizy Nightz
        </footer>
      </div>
    </>
  );
}

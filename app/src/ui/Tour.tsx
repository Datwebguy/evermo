// A five-step tour. Each step moves to the page its feature is on, waits for it to appear, and lights it up.
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { agents } from "../service/api";

type Step = { route: (first: string | null) => string; target: string; title: string; text: string };
const STEPS: Step[] = [
  { route: () => "/agents", target: "agents", title: "Find an agent by its record",
    text: "Ranked by real work on X Layer. No wallet needed." },
  { route: () => "/agents", target: "live", title: "Watch it happen live",
    text: "Every job, payment and sale, as it lands on chain." },
  { route: (a) => (a ? `/agent/${a}` : "/agents"), target: "record", title: "Its record is its value",
    text: "Its full record. It goes with the agent when sold." },
  { route: (a) => (a ? `/agent/${a}` : "/activity"), target: "circuit", title: "Rules nobody can change",
    text: "Every payment is checked by this circuit first. It lights up with each real decision." },
  { route: (a) => (a ? `/agent/${a}` : "/agents"), target: "actions", title: "Try it, buy it, resell it",
    text: "Try it free. Buy it, give it a budget, resell it later." },
];
const SEEN = "evermo-toured";
export const tourSeen = () => { try { return localStorage.getItem(SEEN) === "1"; } catch { return true; } };

type Box = { top: number; left: number; width: number; height: number };

export function Tour({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const [first, setFirst] = useState<string | null | undefined>(undefined);
  const [box, setBox] = useState<Box | null>(null);
  const [card, setCard] = useState<{ top: number; left: number } | null>(null);
  const step = STEPS[i];

  useEffect(() => { agents().then((l) => setFirst([...l].sort((a, b) => b.record.work - a.record.work)[0]?.agentId ?? null), () => setFirst(null)); }, []);

  const end = useCallback(() => { try { localStorage.setItem(SEEN, "1"); } catch { /* storage off */ } onClose(); }, [onClose]);

  const measure = useCallback(() => {
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) return false;
    const r = el.getBoundingClientRect(), pad = 8, W = innerWidth, H = innerHeight, narrow = W < 760;
    const b = { top: r.top - pad, left: Math.max(8, r.left - pad), width: Math.min(W - 16, r.width + pad * 2), height: Math.min(r.height + pad * 2, H - 24) };
    setBox(b);
    const cw = Math.min(360, W - 32), ch = 230;
    if (narrow) setCard({ top: H - ch - 16, left: (W - cw) / 2 });
    else {
      const below = b.top + b.height + 12, above = b.top - ch - 12;
      const top = below + ch < H ? below : above > 8 ? above : Math.max(8, H - ch - 16);
      setCard({ top, left: Math.min(Math.max(16, b.left), W - cw - 16) });
    }
    return true;
  }, [step]);

  // Go to the step's page, wait for its feature, bring it into view.
  useEffect(() => {
    if (first === undefined) return;
    setBox(null);
    const want = step.route(first);
    if ((location.hash.slice(1) || "/") !== want) location.hash = want;
    let tries = 0, stop = false;
    const look = () => {
      if (stop) return;
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (el && el.getBoundingClientRect().height > 0) {
        const narrow = innerWidth < 760, r = el.getBoundingClientRect();
        const y = narrow ? scrollY + r.top - 72 : scrollY + r.top - Math.max(80, (innerHeight - Math.min(r.height, innerHeight * 0.55)) / 2 - 80);
        scrollTo({ top: Math.max(0, y), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        setTimeout(() => !stop && measure(), 450);
      } else if (tries++ < 40) setTimeout(look, 150);
      else setI((n) => (n < STEPS.length - 1 ? n + 1 : n)); // feature not on screen: move on
    };
    look();
    return () => { stop = true; };
  }, [i, first, step, measure]);

  useLayoutEffect(() => {
    const f = () => measure();
    addEventListener("resize", f); addEventListener("scroll", f, { passive: true });
    return () => { removeEventListener("resize", f); removeEventListener("scroll", f); };
  }, [measure]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") end(); if (e.key === "ArrowRight") next(); if (e.key === "ArrowLeft" && i > 0) setI(i - 1); };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  });
  const next = () => (i < STEPS.length - 1 ? setI(i + 1) : end());

  return (
    <div role="dialog" aria-modal="true" aria-label={step.title}>
      <div style={{ position: "fixed", inset: 0, zIndex: 59 }} onClick={end} />
      {box && <div className="tour-hole" style={box} />}
      {card && (
        <div className="tour-card" style={card}>
          <div className="between"><div className="tour-dots">{STEPS.map((_, n) => <i key={n} data-on={n === i ? "" : undefined} />)}</div>
            <span className="faint small num">{i + 1} of {STEPS.length}</span></div>
          <div className="h2">{step.title}</div>
          <p className="muted" style={{ margin: 0 }}>{step.text}</p>
          <div className="between" style={{ marginTop: 4 }}>
            <button className="btn quiet small" onClick={end}>Skip</button>
            <div className="row" style={{ gap: 8 }}>
              {i > 0 && <button className="btn small" onClick={() => setI(i - 1)}>Back</button>}
              <button className="btn small primary" onClick={next}>{i < STEPS.length - 1 ? "Next" : "Finish"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// The front page. Short words, real numbers from X Layer, motion with a cause.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ShoppingBag, Lightning, SealCheck, ArrowsLeftRight, ArrowRight, Compass } from "@phosphor-icons/react";
import { agents as loadAgents, activity, live, type AgentCard, type Item } from "../service/api";
import { money } from "../chain/format";
import { Logo } from "../ui/Logo";
import { Feed } from "../ui/Feed";
import { Roll } from "../ui/kit/Roll";
import { useLang } from "../i18n";

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setIn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setIn(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`reveal${inView ? " in" : ""}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

const STEPS = [
  { icon: ShoppingBag, title: "Buy", text: "Own an agent outright." },
  { icon: Lightning, title: "Use", text: "Give it a budget and limits." },
  { icon: SealCheck, title: "Prove", text: "Every job is recorded on chain." },
  { icon: ArrowsLeftRight, title: "Resell", text: "Its record raises its price." },
];
const FAQ: [string, string][] = [
  ["What do I own when I buy an agent?", "The agent's circuit on X Layer and the wallet that comes with it. Whoever holds the circuit owns the agent, its record and its budget. You can resell it at any time."],
  ["Can the agent spend more than I allow?", "No. Every payment from its budget goes through a rule check taped out on X Layer first. It refuses anything above your per-payment or daily limit, and anything after you stop the agent."],
  ["What does it cost?", "Each job costs the agent's fee plus the AI usage shown on its signed receipt, paid from the agent's budget. Evermo takes 5% of every sale; on resales the builder gets 5%."],
  ["What are the risks?", "An agent's answers can be wrong; check what it tells you before acting on it. Prices of agents can go down. Evermo's contracts have not been audited."],
];

export function Landing() {
  const lang = useLang();
  const [list, setList] = useState<AgentCard[] | null>(null);
  const [feed, setFeed] = useState<Item[]>([]);
  useEffect(() => {
    const refresh = () => loadAgents().then(setList, () => setList([]));
    refresh(); activity().then(setFeed).catch(() => {});
    let t: any;
    const stop = live((it) => { setFeed((f) => [it, ...f].slice(0, 30)); clearTimeout(t); t = setTimeout(refresh, 1200); });
    return () => { stop(); clearTimeout(t); };
  }, []);
  const totals = useMemo(() => (list ?? []).reduce((s, a) => ({ agents: s.agents + 1, work: s.work + a.record.work, decided: s.decided + a.record.payments + a.record.blocked }), { agents: 0, work: 0, decided: 0 }), [list]);
  const lastPay = feed.find((x) => x.name === "PaymentDecided");
  const names = useMemo(() => new Map((list ?? []).map((a) => [a.agentId, a.name ?? "An agent"])), [list]);
  const n = (v: number) => (list === null ? "—" : String(v));

  return (
    <div className="land">
      <section className="hero">
        <div className="stack" style={{ gap: 20 }}>
          <span className="pill brand" style={{ justifySelf: "start" }}><span className="dot" />Live on X Layer</span>
          {lang === "zh" ? <h1 data-notr>拥有 AI Agent。<em>验证</em>它的工作。转售它。</h1>
            : <h1 data-notr>Own AI agents. <em>Prove</em> their work. Resell them.</h1>}
          <p>Every agent has a record anyone can check, and rules nobody can change.</p>
          <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
            <a className="btn primary" href="#/agents">Explore agents<ArrowRight size={16} weight="bold" /></a>
            <button className="btn" onClick={() => dispatchEvent(new Event("evermo-tour"))}><Compass size={16} />Take the tour</button>
          </div>
        </div>
        <div className="stage" aria-hidden="true">
          <div className="orb float" style={{ inset: "14%", background: "radial-gradient(circle at 35% 35%, rgba(255,176,74,.55), rgba(232,80,26,.18) 60%, transparent 70%)" }} />
          <svg className="spin" viewBox="0 0 100 100" style={{ position: "absolute", inset: "4%" }}>
            <circle cx="50" cy="50" r="47" fill="none" stroke="var(--line-strong)" strokeWidth=".4" strokeDasharray="1 3" />
            <circle cx="50" cy="3" r="1.6" fill="#FFC56B" /><circle cx="97" cy="50" r="1.2" fill="#B07648" />
          </svg>
          <div className="float d2" style={{ position: "absolute", inset: "28%", display: "grid", placeItems: "center" }}><Logo size={170} /></div>
          <div className="mini l float d3" style={{ left: "-4%", top: "12%" }}>
            <span className="label">Jobs done</span><b className="big num" style={{ fontSize: 26 }}><Roll>{n(totals.work)}</Roll></b>
          </div>
          <div className="mini r float" style={{ right: "-6%", bottom: "14%" }}>
            <span className="label">Last rule check</span>
            {lastPay ? <b className="num" style={{ color: lastPay.data.allowed ? "var(--ok)" : "var(--no)" }}>
              {lastPay.data.allowed ? "Allowed" : "Refused"} {money(lastPay.data.amount, lastPay.data.token)}</b> : <b className="faint">—</b>}
          </div>
        </div>
      </section>

      <Reveal>
        <div className="stats">
          {[["Agents", totals.agents], ["Jobs done", totals.work], ["Payments checked", totals.decided]].map(([k, v]) => (
            <div key={k as string} className="stat"><div className="big num"><Roll>{n(v as number)}</Roll></div><div className="label">{k}</div></div>
          ))}
        </div>
      </Reveal>

      <section className="stack" style={{ gap: 16 }}>
        <Reveal><div className="h2" style={{ fontSize: 24 }}>How it works</div></Reveal>
        <div className="steps4">
          {STEPS.map((s, i) => { const I = s.icon; return (
            <Reveal key={s.title} delay={i * 90}><div className="step4">
              <span className="n">{i + 1}</span><span className="ico brand"><I size={20} weight="bold" /></span>
              <b style={{ fontSize: 17 }}>{s.title}</b><span className="muted small">{s.text}</span>
            </div></Reveal>); })}
        </div>
      </section>

      <Reveal>
        <section className="card pad">
          <div className="between"><div className="h2">Happening now</div><span className="pill ok"><span className="dot" />Live</span></div>
          <Feed items={feed} names={names} limit={4} />
          <a className="link small" href="#/activity">See all activity</a>
        </section>
      </Reveal>

      <Reveal>
        <section className="card pad">
          <div className="h2" style={{ marginBottom: 6 }}>Questions</div>
          {FAQ.map(([q, a]) => <details key={q} className="faq"><summary>{q}</summary><p>{a}</p></details>)}
        </section>
      </Reveal>

      <footer className="foot"><span className="row" style={{ gap: 8 }} data-notr><Logo size={18} />Evermo</span><span>Built on X Layer with TapeOut</span></footer>
    </div>
  );
}

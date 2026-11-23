import { useEffect, useMemo, useState } from "react";
import { MagnifyingGlass, Compass } from "@phosphor-icons/react";
import { agents as loadAgents, activity, live, type AgentCard, type Item } from "../service/api";
import { AgentTile } from "../ui/AgentTile";
import { Feed } from "../ui/Feed";
import { Skel, Notice } from "../ui/parts";
import { useWallet } from "../state";

type Sort = "record" | "recent" | "sale";

export function Home() {
  const { address } = useWallet();
  const [list, setList] = useState<AgentCard[] | null>(null);
  const [feed, setFeed] = useState<Item[]>([]);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("record");

  useEffect(() => {
    const refresh = () => loadAgents().then(setList, (e) => setErr(e.message));
    refresh(); activity().then(setFeed).catch(() => {});
    let t: any;
    const stop = live((it) => { setFeed((f) => [it, ...f].slice(0, 60)); clearTimeout(t); t = setTimeout(refresh, 1200); });
    return () => { stop(); clearTimeout(t); };
  }, []);

  const names = useMemo(() => new Map((list ?? []).map((a) => [a.agentId, a.name ?? "An agent"])), [list]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    let l = (list ?? []).filter((a) => !s || (a.name ?? "").toLowerCase().includes(s) || (a.description ?? "").toLowerCase().includes(s));
    if (sort === "sale") l = l.filter((a) => a.listing);
    return [...l].sort((a, b) => sort === "recent" ? b.lastActivity - a.lastActivity : b.record.work - a.record.work || b.lastActivity - a.lastActivity);
  }, [list, q, sort]);

  return (
    <div className="stack" style={{ gap: 28 }}>
      <section className="stack" style={{ gap: 8, maxWidth: 680 }}>
        <h1 className="title">AI agents you can own, use, prove and resell.</h1>
        <p className="muted" style={{ margin: 0 }}>Every agent here has a record anyone can check. Its budget and its sales are decided by rules taped out on X Layer.</p>
        <div><button className="btn small" onClick={() => dispatchEvent(new Event("evermo-tour"))}><Compass size={16} />Take the tour</button></div>
      </section>

      <div className="split">
        <section className="stack" style={{ gap: 16 }} data-tour="agents">
          <div className="between" style={{ flexWrap: "wrap" }}>
            <label className="field" style={{ flex: "1 1 240px", position: "relative" }}>
              <span className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>Search agents</span>
              <MagnifyingGlass size={18} style={{ position: "absolute", left: 14, top: 14, color: "var(--ink-3)" }} />
              <input placeholder="Search agents" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 40 }} />
            </label>
            <div className="row" role="tablist" style={{ gap: 4 }}>
              {([["record", "Best record"], ["recent", "Most recent"], ["sale", "For sale"]] as const).map(([k, t]) => (
                <button key={k} role="tab" aria-selected={sort === k} className={`btn small ${sort === k ? "" : "quiet"}`} onClick={() => setSort(k)}>{t}</button>
              ))}
            </div>
          </div>
          {err ? <Notice tone="no">{err}</Notice>
            : list === null ? <div className="grid">{[0, 1, 2, 3].map((i) => <div key={i} className="card pad stack"><Skel w="50%" h={18} /><Skel h={12} /><Skel w="30%" h={34} /><Skel w="70%" h={12} /></div>)}</div>
            : shown.length === 0 ? <Notice>{list.length ? "No agents match." : "No agents yet."}</Notice>
            : <div className="grid">{shown.map((a) => <AgentTile key={a.agentId} a={a} me={address} />)}</div>}
        </section>
        <aside className="card pad home-live" style={{ position: "sticky", top: 88 }} data-tour="live">
          <div className="between"><div className="h2">Happening now</div><span className="pill ok"><span className="dot" />Live</span></div>
          <Feed items={feed} names={names} limit={8} />
          <a className="link small" href="#/activity">See all activity</a>
        </aside>
      </div>

      <section className="card pad" style={{ maxWidth: 760 }}>
        <div className="h2" style={{ marginBottom: 6 }}>Questions</div>
        {FAQ.map(([q, a]) => <details key={q} className="faq"><summary>{q}</summary><p>{a}</p></details>)}
      </section>
    </div>
  );
}

const FAQ: [string, string][] = [
  ["What do I own when I buy an agent?", "The agent's circuit on X Layer and the wallet that comes with it. Whoever holds the circuit owns the agent, its record and its budget. You can resell it at any time."],
  ["Can the agent spend more than I allow?", "No. Every payment from its budget goes through a rule check taped out on X Layer first. It refuses anything above your per-payment or daily limit, and anything after you stop the agent."],
  ["What does it cost?", "Each job costs the agent's fee plus the AI usage shown on its signed receipt, paid from the agent's budget. Evermo takes 5% of every sale; on resales the builder gets 5%."],
  ["What are the risks?", "An agent's answers can be wrong; check what it tells you before acting on it. Prices of agents can go down. Evermo's contracts have not been audited."],
];

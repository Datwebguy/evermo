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
    <div className="stack" style={{ gap: 20 }}>
      <div className="between" style={{ flexWrap: "wrap" }}>
        <h1 className="title">Agents</h1>
        <button className="btn small" onClick={() => dispatchEvent(new Event("evermo-tour"))}><Compass size={16} />Take the tour</button>
      </div>

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

    </div>
  );
}


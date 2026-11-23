import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Fingerprint, Warning } from "@phosphor-icons/react";
import { agent as loadAgent, history, live, manifest, toolsCheck, run, type AgentCard, type Item, type Manifest, type Answer } from "../service/api";
import { dep } from "../chain/deployment";
import { short, dateOf, money } from "../chain/format";
import { useWallet } from "../state";
import { Feed } from "../ui/Feed";
import { CircuitView } from "../ui/CircuitView";
import { Result } from "../ui/Result";
import { Roll } from "../ui/kit/Roll";
import { Skel, Notice, AddrLink } from "../ui/parts";
import { circuits } from "../words";
import { Buy } from "../flows/Buy";
import { SwitchOn } from "../flows/SwitchOn";
import { Budget, Sell, Watch, Cancel } from "../flows/Manage";
import { explain } from "../chain/wallet";

const LABEL: Record<string, string> = { account: "Account", token: "Token address", warnBelow: "Warn below" };
const HINT: Record<string, string> = { account: "An address with a lending position on Aave on X Layer", token: "A token on X Layer", warnBelow: "Health level, for example 1.2" };

export function Agent({ id }: { id: string }) {
  const { address, ask } = useWallet();
  const [a, setA] = useState<AgentCard | null>(null);
  const [m, setM] = useState<Manifest | null | undefined>(undefined);
  const [tools, setTools] = useState<{ tools: any[]; matches: boolean } | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [err, setErr] = useState("");
  const [sheet, setSheet] = useState<"" | "buy" | "on" | "budget" | "sell" | "watch" | "cancel">("");
  const [params, setParams] = useState<Record<string, string>>({});
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [running, setRunning] = useState(false);
  const [runErr, setRunErr] = useState("");
  const [bought, setBought] = useState(false);

  const refresh = useCallback(async () => {
    const x = await loadAgent(id); setA(x);
    history(id).then(setItems).catch(() => {});
    const mm = await manifest(x.address); setM(mm);
    if (mm) toolsCheck(mm).then(setTools);
  }, [id]);
  useEffect(() => {
    refresh().catch((e) => setErr(e.message));
    let t: any;
    const stop = live((it) => { if (it.agentId?.toLowerCase() !== id.toLowerCase()) return; setItems((f) => [it, ...f]); clearTimeout(t); t = setTimeout(() => loadAgent(id).then(setA), 1000); });
    return () => { stop(); clearTimeout(t); };
  }, [id, refresh]);

  const lastPay = useMemo(() => items.find((x) => x.name === "PaymentDecided"), [items]);
  const lastSale = useMemo(() => items.find((x) => x.name === "Sold"), [items]);
  const me = address?.toLowerCase();
  const isOwner = !!a && !!me && a.owner.toLowerCase() === me && !a.listing;
  const isSeller = !!a?.listing && !!me && a.listing.seller.toLowerCase() === me;
  const method = m?.methods.find((x) => x.name !== "receipt");
  const blocked = tools && !tools.matches;

  async function go(paid: boolean) {
    if (!m || !method || !a) return;
    setRunning(true); setRunErr(""); setAnswer(null);
    try {
      const p: Record<string, string> = {};
      for (const [k, t] of Object.entries(method.params)) { const v = (params[k] ?? "").trim(); if (v) p[k] = v; else if (!t.endsWith("?")) throw new Error(`Enter the ${(LABEL[k] ?? k).toLowerCase()}.`); }
      let sign: ((d: Uint8Array) => Promise<string>) | undefined;
      if (paid) { const sg = await ask(); if (!sg) return; sign = (d) => sg.signMessage(d); }
      setAnswer(await run(m, a.agentId, method.name, p, sign));
    } catch (e: any) { setRunErr(e?.message?.startsWith("Enter") ? e.message : explain(e)); } finally { setRunning(false); }
  }

  if (err) return <Notice tone="no">{err}</Notice>;
  if (!a) return <div className="stack"><Skel w="40%" h={28} /><Skel w="70%" /><Skel h={200} /></div>;
  const name = a.name ?? `Agent ${short(a.agentId)}`;

  return (
    <div className="stack" style={{ gap: 24 }}>
      <a href="#/" className="link small row" style={{ gap: 6 }}><ArrowLeft size={14} />All agents</a>
      <div className="split">
        <div className="stack" style={{ gap: 24, minWidth: 0 }}>
          <header className="stack" style={{ gap: 8 }}>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <h1 className="title">{name}</h1>
              {a.listing ? <span className="pill brand">For sale</span> : isOwner ? <span className="pill ok">Yours</span> : null}
              {!a.switchedOn && <span className="pill">Not switched on</span>}
            </div>
            <p className="muted" style={{ margin: 0 }}>{a.description ?? method?.description ?? "This agent's description is not available right now."}</p>
          </header>

          <section className="card pad">
            <div className="label" style={{ marginBottom: 12 }}>Track record</div>
            <div className="row" style={{ gap: 28, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div><div className="big num"><Roll>{String(a.record.work)}</Roll></div><div className="label">jobs done</div></div>
              {[["payments made", a.record.payments], ["refused by its rules", a.record.blocked], ["times sold", a.record.sales]].map(([t, n]) =>
                <div key={t as string}><div className="num" style={{ fontSize: 22, fontWeight: 650 }}><Roll>{String(n)}</Roll></div><div className="label">{t}</div></div>)}
            </div>
            <div className="hint" style={{ marginTop: 12 }}>Recorded on X Layer since {dateOf(a.registeredAt)}. It moves with the agent when it is sold.</div>
          </section>

          {method && (
            <section className="card pad stack">
              <div className="between"><div className="h2">{isOwner ? "Use it" : "Try it"}</div>
                {!isOwner && <span className="pill">Free, not recorded</span>}</div>
              {blocked ? <Notice tone="no"><Warning size={16} style={{ verticalAlign: -3 }} /> This agent's tools have changed since its owner approved them. Evermo will not run it until the owner approves them again.</Notice> : <>
                {Object.entries(method.params).map(([k, t]) => (
                  <label key={k} className="field"><span className="label">{LABEL[k] ?? k}{t.endsWith("?") ? " (optional)" : ""}</span>
                    <input value={params[k] ?? ""} placeholder={k === "warnBelow" ? "1.2" : "0x…"} onChange={(e) => setParams({ ...params, [k]: e.target.value })} />
                    {HINT[k] && <span className="hint">{HINT[k]}</span>}</label>))}
                {runErr && <div className="error">{runErr}</div>}
                <div className="row" style={{ flexWrap: "wrap" }}>
                  {isOwner ? <>
                    <button className="btn primary" disabled={running || !a.switchedOn} onClick={() => go(true)}>{running ? "Working…" : "Run, paid from its budget"}</button>
                    <button className="btn quiet" disabled={running} onClick={() => go(false)}>Run free</button>
                  </> : <button className="btn primary" disabled={running || !a.switchedOn} onClick={() => go(false)}>{running ? "Working…" : "Run it"}</button>}
                </div>
                {!a.switchedOn && <div className="hint">This agent can run once its owner switches it on.</div>}
                {running && <div className="card pad stack" style={{ boxShadow: "none" }}><Skel w="40%" /><Skel /><Skel w="80%" /><Skel w="60%" /></div>}
                {answer && <Result a={answer} />}
              </>}
            </section>
          )}

          <section className="card pad stack">
            <div className="between"><div className="h2">How its budget is decided</div>{lastPay && <span className={`pill ${lastPay.data.allowed ? "ok" : "no"}`}>Last: {lastPay.data.allowed ? "allowed" : "refused"}</span>}</div>
            <p className="muted small" style={{ margin: 0 }}>Every payment from this agent's budget goes through this check on X Layer first. {lastPay ? `Shown with the last payment, ${money(lastPay.data.amount, lastPay.data.token)}.` : "No payment yet."}</p>
            <CircuitView id={dep().budgetCircuitId} bits={lastPay ? parseInt(String(lastPay.data.inputs), 16) : null} labels={circuits.budget.inputs} outLabels={circuits.budget.outputs} />
          </section>

          {lastSale && (
            <section className="card pad stack">
              <div className="h2">How its last sale was decided</div>
              <CircuitView id={dep().resaleCircuitId} bits={parseInt(String(lastSale.data.inputs), 16)} labels={circuits.resale.inputs} outLabels={circuits.resale.outputs} />
            </section>
          )}

          <section className="card pad"><div className="h2" style={{ marginBottom: 4 }}>History</div><Feed items={items} /></section>
        </div>

        <aside className="stack" style={{ position: "sticky", top: 88, gap: 16 }}>
          <div className="card pad stack">
            {a.listing ? <>
              <div><div className="label">Price</div><div className="big num">{money(a.listing.price, a.listing.token)}</div></div>
              <div className="hint">Open until {dateOf(a.listing.expiresAt)}</div>
              {isSeller ? <button className="btn wide" onClick={() => setSheet("cancel")}>Take off sale</button>
                : <button className="btn primary wide" onClick={() => setSheet("buy")}>Buy</button>}
            </> : isOwner ? <>
              <div className="h2">Your agent</div>
              <button className="btn primary wide" onClick={() => setSheet("on")}>{a.switchedOn ? "Settings" : "Switch it on"}</button>
              <button className="btn wide" onClick={() => setSheet("budget")}>Budget</button>
              {m?.methods.some((x) => x.name === "health") && <button className="btn wide" disabled={!a.switchedOn} onClick={() => setSheet("watch")}>Watch a position</button>}
              <button className="btn wide" onClick={() => setSheet("sell")}>Sell</button>
            </> : <>
              <div className="h2">Not for sale right now</div>
              <div className="hint">Its owner can list it at any time. Its record stays with it.</div>
            </>}
          </div>
          <div className="card pad stack small" style={{ gap: 10 }}>
            <div className="between"><span className="muted">Owner</span><AddrLink a={a.owner}>{me === a.owner.toLowerCase() ? "You" : short(a.owner)}</AddrLink></div>
            <div className="between"><span className="muted">Builder</span><AddrLink a={a.builder}>{short(a.builder)}</AddrLink></div>
            <div className="between"><span className="muted">Agent number</span><span className="num">#{a.tokenId}</span></div>
            {m?.ai?.models?.[0] && <div className="between"><span className="muted">AI</span><span>{m.ai.models[0].id}</span></div>}
            {m?.ai?.models?.[0]?.prices?.[0] && <div className="between"><span className="muted">AI price per million tokens, in / out</span><span className="num">${m.ai.models[0].prices[0].input} / ${m.ai.models[0].prices[0].output}</span></div>}
            {tools && <div className="row" style={{ gap: 8, color: tools.matches ? "var(--ok)" : "var(--no)" }}><Fingerprint size={16} />
              {tools.matches ? "Tools unchanged since the owner approved them" : "Tools changed since the owner approved them"}</div>}
            {m === null && a.switchedOn === false && <div className="hint">Its owner has not switched it on yet.</div>}
          </div>
        </aside>
      </div>
      {sheet === "buy" && <Buy a={a} onClose={() => { setSheet(bought ? "on" : ""); refresh(); }} onDone={() => { setBought(true); refresh(); }} />}
      {sheet === "on" && isOwner && <SwitchOn a={a} onClose={() => setSheet("")} onChange={refresh} />}
      {sheet === "budget" && <Budget a={a} onClose={() => setSheet("")} onChange={refresh} />}
      {sheet === "sell" && <Sell a={a} onClose={() => setSheet("")} onChange={refresh} />}
      {sheet === "watch" && <Watch a={a} onClose={() => setSheet("")} />}
      {sheet === "cancel" && <Cancel a={a} onClose={() => setSheet("")} onChange={refresh} />}
    </div>
  );
}

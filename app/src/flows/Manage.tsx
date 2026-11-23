import { useEffect, useState } from "react";
import { parseUnits, type Contract } from "ethers";
import { budget, registry, market, nft } from "../chain/read";
import { dep, tokenBy } from "../chain/deployment";
import { money } from "../chain/format";
import { watch, type AgentCard } from "../service/api";
import { useWallet } from "../state";
import { Sheet, Notice, Skel, TxLink } from "../ui/parts";
import { Roll } from "../ui/kit/Roll";
import { useStep, confirm } from "./useStep";

const usdt = () => dep().tokens.find((t) => t.symbol === "USDT0")!;

export function Budget({ a, onClose, onChange }: { a: AgentCard; onClose: () => void; onChange: () => void }) {
  const { ask } = useWallet();
  const s = useStep();
  const [v, setV] = useState<{ bal: bigint; spent: bigint; daily: bigint } | null>(null);
  const [amt, setAmt] = useState("");
  const read = async () => {
    const U = usdt().address, day = BigInt(Math.floor(Date.now() / 86400000));
    const [bal, lim, spent] = await Promise.all([budget().balanceOf(a.agentId, U), registry().limitsOf(a.agentId, U), budget().spent(a.agentId, a.owner, U, day)]);
    setV({ bal, spent, daily: lim.daily });
  };
  useEffect(() => { read().catch(() => s.setError("The budget could not be read right now.")); }, [a.agentId]);
  async function out() {
    const sg = await ask(); if (!sg) return;
    const n = parseUnits(amt || "0", 6);
    if (n <= 0n || (v && n > v.bal)) return s.setError("Enter an amount up to what is in the budget.");
    if (await s.go("out", async () => confirm(await (budget().connect(sg) as Contract).withdraw(a.agentId, usdt().address, n, await sg.getAddress()))) !== null) { setAmt(""); await read(); onChange(); }
  }
  const pct = v && v.daily > 0n ? Number((v.spent * 100n) / v.daily) : 0;
  return (
    <Sheet title="Budget" onClose={onClose}>
      {!v ? <Skel h={120} /> : <>
        <div><div className="label">Left in the budget</div><div className="big num"><Roll>{money(v.bal, usdt().address)}</Roll></div></div>
        <div className="stack" style={{ gap: 6 }}>
          <div className="between small"><span className="muted">Spent today</span><span className="num">{money(v.spent, usdt().address)} of {money(v.daily, usdt().address)}</span></div>
          <div style={{ height: 8, borderRadius: 99, background: "var(--surface-2)", overflow: "hidden" }}><div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: "var(--brand)", transition: "width .5s" }} /></div>
          <div className="hint">The day resets at midnight UTC. The rule check refuses any payment that would pass your daily limit.</div>
        </div>
        <label className="field"><span className="label">Take out (USDT0)</span><input inputMode="decimal" placeholder="0.00" value={amt} onChange={(e) => setAmt(e.target.value)} /></label>
        {s.error && <div className="error">{s.error}</div>}
        <button className="btn wide" disabled={!!s.busy} onClick={out}>{s.busy ? "Waiting…" : "Take out to my wallet"}</button>
      </>}
    </Sheet>
  );
}

export function Sell({ a, onClose, onChange }: { a: AgentCard; onClose: () => void; onChange: () => void }) {
  const { ask } = useWallet();
  const s = useStep();
  const [token, setToken] = useState(dep().tokens[0].address);
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("14");
  const [terms, setTerms] = useState<{ fee: bigint; roy: bigint; before: boolean } | null>(null);
  const [tx, setTx] = useState("");
  useEffect(() => { Promise.all([market().FEE_BPS(), market().ROYALTY_BPS(), market().soldBefore(a.agentId)]).then(([fee, roy, before]) => setTerms({ fee, roy, before })).catch(() => {}); }, [a.agentId]);
  const t = tokenBy(token)!;
  let raw = 0n; try { raw = parseUnits(price || "0", t.decimals); } catch { /* typing */ }
  const fee = terms ? (raw * terms.fee) / 10000n : 0n, roy = terms?.before ? (raw * terms.roy) / 10000n : 0n;

  async function list() {
    const sg = await ask(); if (!sg) return;
    if (raw <= 0n) return s.setError("Enter a price.");
    const me = await sg.getAddress(), n = nft(a.circuits).connect(sg) as Contract;
    const r = await s.go("list", async () => {
      if ((await n.getApproved(a.tokenId)).toLowerCase() !== dep().market.toLowerCase() && !(await n.isApprovedForAll(me, dep().market)))
        await confirm(await n.approve(dep().market, a.tokenId));
      return confirm(await (market().connect(sg) as Contract).list(a.agentId, token, raw, Math.floor(Date.now() / 1000) + Number(days) * 86400));
    });
    if (r) { setTx(r.hash); onChange(); }
  }
  return (
    <Sheet title="Sell this agent" onClose={onClose}>
      {tx ? <><Notice tone="ok">Listed. Evermo holds the agent until it sells or you take it off sale. Its budget stays with the agent.</Notice><TxLink tx={tx} />
        <button className="btn primary wide" onClick={onClose}>Done</button></> : <>
        <div className="row" style={{ gap: 10 }}>
          <label className="field" style={{ flex: 2 }}><span className="label">Price</span><input inputMode="decimal" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
          <label className="field" style={{ flex: 1 }}><span className="label">Paid in</span>
            <select value={token} onChange={(e) => setToken(e.target.value)}>{dep().tokens.map((x) => <option key={x.address} value={x.address}>{x.symbol}</option>)}</select></label>
        </div>
        <label className="field"><span className="label">Open for</span><select value={days} onChange={(e) => setDays(e.target.value)}>
          <option value="3">3 days</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></label>
        <div className="card pad stack" style={{ boxShadow: "none", gap: 8 }}>
          <div className="between"><span className="muted">Evermo fee</span><span className="num">{money(fee, token)}</span></div>
          {terms?.before && <div className="between"><span className="muted">Builder royalty</span><span className="num">{money(roy, token)}</span></div>}
          <div className="between"><b>You receive</b><b className="num"><Roll>{money(raw - fee - roy, token)}</Roll></b></div>
        </div>
        {s.error && <div className="error">{s.error}</div>}
        <button className="btn primary wide" disabled={!!s.busy} onClick={list}>{s.busy ? "Waiting…" : "List for sale"}</button>
        <div className="hint">Listing moves the agent to Evermo's sale contract. You can take it off sale at any time before someone buys it.</div>
      </>}
    </Sheet>
  );
}

export function Watch({ a, onClose }: { a: AgentCard; onClose: () => void }) {
  const { ask } = useWallet();
  const s = useStep();
  const [acct, setAcct] = useState("");
  const [lvl, setLvl] = useState("1.2");
  const [done, setDone] = useState(false);
  async function go() {
    const sg = await ask(); if (!sg) return;
    if (!/^0x[0-9a-fA-F]{40}$/.test(acct)) return s.setError("Enter the account address that has the lending position.");
    if (await s.go("watch", () => watch(a.address, a.agentId, acct, lvl, (d) => sg.signMessage(d))) !== null) setDone(true);
  }
  return (
    <Sheet title="Watch a lending position" onClose={onClose}>
      {done ? <><Notice tone="ok">Watching. When health drops below {lvl}, a signed alert goes to the agent's inbox and is paid from its budget.</Notice>
        <button className="btn primary wide" onClick={onClose}>Done</button></> : <>
        <label className="field"><span className="label">Account</span><input placeholder="0x…" value={acct} onChange={(e) => setAcct(e.target.value.trim())} /></label>
        <label className="field"><span className="label">Warn me below</span><input inputMode="decimal" value={lvl} onChange={(e) => setLvl(e.target.value)} />
          <span className="hint">Below 1.0 the position can be liquidated.</span></label>
        {s.error && <div className="error">{s.error}</div>}
        <button className="btn primary wide" disabled={!!s.busy} onClick={go}>{s.busy ? "Waiting for your signature…" : "Start watching"}</button>
      </>}
    </Sheet>
  );
}

export function Cancel({ a, onClose, onChange }: { a: AgentCard; onClose: () => void; onChange: () => void }) {
  const { ask } = useWallet();
  const s = useStep();
  return (
    <Sheet title="Take off sale" onClose={onClose}>
      <p className="muted" style={{ margin: 0 }}>The agent comes back to your wallet. You can list it again later.</p>
      {s.error && <div className="error">{s.error}</div>}
      <button className="btn primary wide" disabled={!!s.busy} onClick={async () => {
        const sg = await ask(); if (!sg) return;
        if (await s.go("c", async () => confirm(await (market().connect(sg) as Contract).cancel(a.listing!.id))) !== null) { onChange(); onClose(); }
      }}>{s.busy ? "Waiting…" : "Take off sale"}</button>
    </Sheet>
  );
}

/** Ends Evermo's permission at once. The budget circuit then refuses every payment until the owner switches the agent on again. */
export function Stop({ a, onClose, onChange }: { a: AgentCard; onClose: () => void; onChange: () => void }) {
  const { ask } = useWallet();
  const s = useStep();
  const [done, setDone] = useState("");
  return (
    <Sheet title="Stop this agent now?" onClose={onClose}>
      {done ? <><Notice tone="ok">Stopped. No payment can leave the budget until you switch the agent on again.</Notice><TxLink tx={done} />
        <button className="btn primary wide" onClick={onClose}>Done</button></> : <>
        <p className="muted" style={{ margin: 0 }}>Evermo's permission ends at once. The rule check will refuse every payment from the budget until you switch the agent on again. Your budget stays in the agent; you can take it out.</p>
        {s.error && <div className="error">{s.error}</div>}
        <button className="btn primary wide" style={{ background: "var(--no)", borderColor: "var(--no)" }} disabled={!!s.busy} onClick={async () => {
          const sg = await ask(); if (!sg) return;
          const r = await s.go("stop", async () => confirm(await (registry().connect(sg) as Contract).setPermission(a.agentId, "0x0000000000000000000000000000000000000000", 0)));
          if (r) { setDone(r.hash); onChange(); }
        }}>{s.busy ? "Waiting…" : "Stop now"}</button>
      </>}
    </Sheet>
  );
}

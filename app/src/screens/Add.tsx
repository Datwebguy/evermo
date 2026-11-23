// A builder adds an agent: Evermo makes its identity on X Layer (a circuit and its wallet), then checks its service and registers it.
import { useEffect, useState } from "react";
import { formatEther, Interface, type Contract } from "ethers";
import { CheckCircle, XCircle } from "@phosphor-icons/react";
import { cpu, transistors, opener, registry } from "../chain/read";
import { dep } from "../chain/deployment";
import { checkOutside } from "../service/api";
import { useWallet } from "../state";
import { useStep, confirm } from "../flows/useStep";
import { Notice, TxLink } from "../ui/parts";

// The smallest well-formed circuit (TAP-02): one gate. An agent's identity only needs to exist, not to compute.
const IDENTITY = { netlist: "0x00000002000002", nIn: 1, nOut: 1 };

export function Add() {
  const { ask, address } = useWallet();
  const s = useStep();
  const [cost, setCost] = useState<{ mint: bigint; tape: bigint; open: bigint } | null>(null);
  const [made, setMade] = useState<{ tokenId: string; container: string } | null>(null);
  const [num, setNum] = useState("");
  const [url, setUrl] = useState("");
  const [check, setCheck] = useState<Awaited<ReturnType<typeof checkOutside>> | null>(null);
  const [done, setDone] = useState<{ tx: string; agentId: string } | null>(null);

  useEffect(() => { (async () => {
    const c = cpu(), tr = transistors(await c.transistors());
    const [mint, tape, open] = await Promise.all([tr.mintPrice(), c.TAPEOUT_FEE(), opener().FEE()]);
    setCost({ mint, tape, open });
  })().catch(() => {}); }, []);

  async function makeIdentity() {
    const sg = await ask(); if (!sg) return;
    const r = await s.go("make", async () => {
      const c = cpu().connect(sg) as Contract, tr = transistors(await c.transistors()).connect(sg) as Contract;
      let value = cost!.mint;
      for (let i = 0; i < 8; i++) { try { await tr.mint.staticCall(0, 1, { value }); break; } catch { value = (value * 12n) / 10n + 1n; } }
      await confirm(await tr.mint(0, 1, { value }));
      const rc = await confirm(await c.tapeout(IDENTITY.netlist, IDENTITY.nIn, IDENTITY.nOut, { value: cost!.tape }));
      const iface = new Interface(["event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"]);
      const ev = rc.logs.map((l: any) => { try { return l.address.toLowerCase() === dep().processor.toLowerCase() ? iface.parseLog(l) : null; } catch { return null; } }).find((x: any) => x?.name === "Transfer");
      const tokenId: bigint = ev.args.tokenId;
      await confirm(await (opener().connect(sg) as Contract).open(dep().processor, tokenId, { value: cost!.open }));
      return { tokenId: tokenId.toString(), container: await opener().accountOf(dep().processor, tokenId) };
    });
    if (r) { setMade(r); setNum(r.tokenId); }
  }

  async function runCheck() {
    if (!/^https:\/\/\S+$/.test(url.trim())) return s.setError("Enter the agent's address, starting with https://");
    setCheck(null);
    const r = await s.go("check", () => checkOutside(url.trim()));
    if (r) setCheck(r);
  }

  async function register() {
    const sg = await ask(); if (!sg || !check?.ok) return;
    const r = await s.go("reg", async () => confirm(await (registry().connect(sg) as Contract).register(check.circuits, check.tokenId, url.trim().replace(/\/$/, ""))));
    if (r) setDone({ tx: r.hash, agentId: await registry().agentIdOf(check.circuits, check.tokenId) });
  }

  const total = cost ? cost.mint + cost.tape + cost.open : null;
  return (
    <div className="stack" style={{ gap: 24, maxWidth: 720 }}>
      <div className="stack" style={{ gap: 6 }}><h1 className="title">Add an agent</h1>
        <p className="muted" style={{ margin: 0 }}>Bring an agent you run, here or on another platform. It gets its own identity on X Layer, a track record, and can be sold, with a royalty to you on every resale.</p></div>

      <section className="card pad stack">
        <div className="h2">1. Its identity</div>
        <p className="muted small" style={{ margin: 0 }}>Each agent is a small circuit on X Layer with its own wallet. Whoever holds the circuit owns the agent.</p>
        {made ? <Notice tone="ok">Created: agent number #{made.tokenId}. Its wallet is {made.container}. Use these in your agent's description file.</Notice> : <>
          <div className="between small"><span className="muted">Cost, paid to TapeOut</span><span className="num">{total === null ? "…" : `${Number(formatEther(total)).toFixed(4)} OKB`}</span></div>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <button className="btn primary" disabled={!!s.busy || !cost} onClick={makeIdentity}>{s.busy === "make" ? "Creating… (3 confirmations)" : "Create its identity"}</button>
            <span className="faint small">or, if it already has one, skip to step 2.</span>
          </div>
        </>}
      </section>

      <section className="card pad stack">
        <div className="h2">2. Where it runs</div>
        <p className="muted small" style={{ margin: 0 }}>The https address of your agent's service. It must publish its description at <span style={{ fontFamily: "var(--mono)" }}>/.well-known/tapeapi.json</span>, approved by the agent's owner.</p>
        <label className="field"><span className="label">Agent address</span><input placeholder="https://" value={url} onChange={(e) => { setUrl(e.target.value); setCheck(null); }} /></label>
        <div><button className="btn" disabled={!!s.busy} onClick={runCheck}>{s.busy === "check" ? "Checking…" : "Check it"}</button></div>
        {check && (check.ok
          ? <Notice tone="ok"><CheckCircle size={16} weight="fill" style={{ verticalAlign: -3 }} /> {check.name} passed every check{num && check.tokenId !== num ? `, but it describes agent #${check.tokenId}, not #${num}` : ""}.</Notice>
          : <div className="stack" style={{ gap: 6 }}>{check.problems.map((p) => <div key={p} className="row small" style={{ color: "var(--no)", gap: 8 }}><XCircle size={16} weight="fill" />{p}</div>)}</div>)}
      </section>

      <section className="card pad stack">
        <div className="h2">3. Put it on Evermo</div>
        {done ? <><Notice tone="ok">Your agent is on Evermo. Its record starts now.</Notice><div className="row"><a className="btn primary" href={`#/agent/${done.agentId}`}>Open its page</a><TxLink tx={done.tx} /></div></>
          : <>
            <p className="muted small" style={{ margin: 0 }}>You must hold the agent in this wallet{address ? "" : " (connect it first)"}. You are recorded as its builder and earn the royalty on every resale.</p>
            <div><button className="btn primary" disabled={!check?.ok || !!s.busy} onClick={register}>{s.busy === "reg" ? "Waiting…" : "Add to Evermo"}</button></div>
          </>}
      </section>
      {s.error && <div className="error">{s.error}</div>}
    </div>
  );
}

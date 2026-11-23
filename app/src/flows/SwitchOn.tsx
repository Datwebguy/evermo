// One checklist that switches an agent on. Each step is one wallet action and ticks when the chain confirms it.
import { useCallback, useEffect, useState } from "react";
import { parseUnits, type Contract } from "ethers";
import { Check, ShieldCheck, Sliders, Wallet, Signature, EnvelopeSimple, HandCoins } from "@phosphor-icons/react";
import { registry, budget, erc20, opener, hub } from "../chain/read";
import { dep } from "../chain/deployment";
import { money, dateOf } from "../chain/format";
import { switchOn, manifest, type AgentCard } from "../service/api";
import { useWallet } from "../state";
import { Sheet, Skel } from "../ui/parts";
import { useStep, confirm } from "./useStep";

const usdt = () => dep().tokens.find((t) => t.symbol === "USDT0")!;
type State = { perm: { ok: boolean; until: number }; payee: boolean; limits: { per: bigint; daily: bigint }; balance: bigint; signer: boolean; inbox: boolean; container: string };

export function SwitchOn({ a, onClose, onChange }: { a: AgentCard; onClose: () => void; onChange: () => void }) {
  const { ask, address } = useWallet();
  const s = useStep();
  const [st, setSt] = useState<State | null>(null);
  const [days, setDays] = useState("90");
  const [per, setPer] = useState("0.50");
  const [daily, setDaily] = useState("2");
  const [add, setAdd] = useState("5");

  const read = useCallback(async () => {
    const r = registry(), U = usdt().address, now = Math.floor(Date.now() / 1000);
    const [perm, payee, lim, bal, container, key, m] = await Promise.all([
      r.permissionOf(a.agentId), r.payeeAllowed(a.agentId, dep().feeRecipient), r.limitsOf(a.agentId, U), budget().balanceOf(a.agentId, U),
      opener().accountOf(a.circuits, a.tokenId), hub().keyFor(a.circuits, a.tokenId), manifest(a.address)]);
    setSt({
      perm: { ok: perm.grantedBy.toLowerCase() === address?.toLowerCase() && perm.operator.toLowerCase() === dep().operator.toLowerCase() && Number(perm.expiresAt) > now, until: Number(perm.expiresAt) },
      payee, limits: { per: lim.perPayment, daily: lim.daily }, balance: bal, container,
      signer: !!m && m.signer.toLowerCase() === dep().operator.toLowerCase(), inbox: key.usable,
    });
  }, [a, address]);
  useEffect(() => { read().catch(() => s.setError("Your agent's settings could not be read right now.")); }, [read]);

  async function act(name: string, f: (signer: any) => Promise<unknown>) {
    const signer = await ask(); if (!signer) return;
    if (await s.go(name, () => f(signer)) !== null) { await read(); onChange(); }
  }
  const reg = (sg: any) => registry().connect(sg) as Contract;
  const until = () => Math.floor(Date.now() / 1000) + Number(days) * 86400;

  const steps = st && [
    { key: "perm", icon: ShieldCheck, done: st.perm.ok, title: "Let Evermo act for this agent",
      text: st.perm.ok ? `Until ${dateOf(st.perm.until)}. It ends by itself if you sell the agent.` : "Evermo can only spend within the limits you set. It ends by itself if you sell the agent.",
      form: !st.perm.ok && <label className="field"><span className="label">For how long</span>
        <select value={days} onChange={(e) => setDays(e.target.value)}><option value="30">30 days</option><option value="90">90 days</option><option value="180">180 days</option><option value="365">1 year</option></select></label>,
      action: () => act("perm", async (sg) => confirm(await reg(sg).setPermission(a.agentId, dep().operator, until()))), cta: "Allow" },
    { key: "payee", icon: HandCoins, done: st.payee, title: "Allow payments for running costs",
      text: "Each job costs a small fee plus the AI usage on its receipt. They go to Evermo, which pays the AI provider.",
      action: () => act("payee", async (sg) => confirm(await reg(sg).setPayee(a.agentId, dep().feeRecipient, true))), cta: "Allow" },
    { key: "limits", icon: Sliders, done: st.limits.daily > 0n, title: "Set its limits",
      text: st.limits.daily > 0n ? `Up to ${money(st.limits.per, usdt().address)} a payment, ${money(st.limits.daily, usdt().address)} a day.` : "The rule check refuses anything above these, every time.",
      form: <div className="row" style={{ gap: 10 }}>
        <label className="field" style={{ flex: 1 }}><span className="label">Most per payment</span><input inputMode="decimal" value={per} onChange={(e) => setPer(e.target.value)} /></label>
        <label className="field" style={{ flex: 1 }}><span className="label">Most per day</span><input inputMode="decimal" value={daily} onChange={(e) => setDaily(e.target.value)} /></label></div>,
      action: () => act("limits", async (sg) => confirm(await reg(sg).setLimits(a.agentId, usdt().address, parseUnits(per || "0", 6), parseUnits(daily || "0", 6)))),
      cta: st.limits.daily > 0n ? "Update" : "Save", always: true },
    { key: "budget", icon: Wallet, done: st.balance > 0n, title: "Add a budget",
      text: `In its budget now: ${money(st.balance, usdt().address)}. You can take it back at any time.`,
      form: <label className="field"><span className="label">Add (USDT0)</span><input inputMode="decimal" value={add} onChange={(e) => setAdd(e.target.value)} /></label>,
      action: () => act("budget", async (sg) => {
        const amt = parseUnits(add || "0", 6), me = await sg.getAddress(), tok = erc20(usdt().address).connect(sg) as Contract;
        if ((await tok.balanceOf(me)) < amt) throw new Error(`exceeds balance`);
        if ((await tok.allowance(me, dep().budget)) < amt) await confirm(await tok.approve(dep().budget, amt));
        return confirm(await (budget().connect(sg) as Contract).deposit(a.agentId, usdt().address, amt));
      }), cta: "Add", always: true },
    { key: "signer", icon: Signature, done: st.signer, title: "Approve Evermo's signer",
      text: "A signature, no fee. It lets the agent sign its answers in your name until the date above.",
      action: () => act("signer", async (sg) => {
        const expires = st.perm.ok ? Math.min(st.perm.until, Math.floor(Date.now() / 1000) + 366 * 86400 - 60) : until();
        const sig = await sg.signTypedData({ name: "TapeAPI", version: "1", chainId: dep().chainId, verifyingContract: dep().hub },
          { Delegation: [{ name: "container", type: "address" }, { name: "signer", type: "address" }, { name: "expires", type: "uint64" }] },
          { container: st.container, signer: dep().operator, expires });
        return switchOn(a.address, expires, sig);
      }), cta: "Approve" },
    { key: "inbox", icon: EnvelopeSimple, done: st.inbox, title: "Set up the agent's inbox", optional: true,
      text: st.inbox ? "Alerts are sealed so only you can read them." : "Alerts arrive encrypted in the agent's wallet. You create its inbox key in the official TapeSend app.",
      link: dep().tapesendApp, cta: "Open TapeSend" },
  ];

  const next = steps?.find((x) => !x.done && !x.optional)?.key;
  return (
    <Sheet title="Switch it on" onClose={onClose}>
      {!steps ? <div className="stack">{[0, 1, 2, 3].map((i) => <Skel key={i} h={64} />)}</div> : <div className="steps">
        {steps.map((x) => { const I = x.icon; const state = x.done ? "done" : x.key === next ? "active" : "todo";
          return <div key={x.key} className="step" data-state={state} data-step={x.key}>
            <span className={`ico ${x.done ? "ok" : x.key === next ? "brand" : ""}`}>{x.done ? <Check size={18} weight="bold" /> : <I size={18} />}</span>
            <div className="stack" style={{ gap: 4 }}><b>{x.title}{(x as any).optional ? <span className="faint small"> · optional</span> : null}</b><span className="small muted">{x.text}</span>
              {(!x.done || (x as any).always) && x.key === (next ?? x.key) && (x as any).form}</div>
            <span className="step-act">{(x as any).link ? <a className="btn small" href={(x as any).link} target="_blank" rel="noreferrer" onClick={() => setTimeout(read, 4000)}>{x.done ? "Open" : x.cta}</a>
              : (!x.done || (x as any).always) && <button className={`btn small ${x.key === next ? "primary" : ""}`} disabled={!!s.busy} onClick={x.action}>{s.busy === x.key ? "Waiting…" : x.cta}</button>}</span>
          </div>; })}
      </div>}
      {s.error && <div className="error">{s.error}</div>}
      {steps && !next && <button className="btn primary wide" onClick={onClose}>Done</button>}
    </Sheet>
  );
}

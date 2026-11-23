// Shows a signed answer in plain words. The summary leads; facts follow; nested details fold away.
import { SealCheck, Warning } from "@phosphor-icons/react";
import type { Answer } from "../service/api";
import { TxLink } from "./parts";
import { short } from "../chain/format";

const NAMES: Record<string, string> = {
  collateralUsd: "Collateral (USD)", debtUsd: "Debt (USD)", availableToBorrowUsd: "Can still borrow (USD)", healthFactor: "Health",
  warnBelow: "Warning level", atRisk: "Below warning level", account: "Account", block: "Checked at block", token: "Token",
  name: "Name", symbol: "Symbol", decimals: "Decimals", totalSupply: "Total supply", codeBytes: "Contract size (bytes)", upgradeable: "Can be upgraded",
  implementation: "Upgrade target", owner: "Controlled by", ownerRenounced: "Control given up", pausable: "Can be paused", paused: "Paused now",
  pools: "Trading pools", totalLiquidityUsd: "Liquidity (USD)", flaggedHoneypot: "Flagged as a trap", holders: "Holders",
};
const human = (k: string) => NAMES[k] ?? k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
const show = (k: string, v: unknown) => v === null || v === undefined ? "Not known" : v === true ? "Yes" : v === false ? "No"
  : /Usd$|^totalSupply$|^health/.test(k) && /^\d+(\.\d+)?$/.test(String(v)) ? Number(v).toLocaleString("en-US", { maximumFractionDigits: k === "healthFactor" ? 4 : 2 }) : String(v);
const isAddr = (v: unknown) => typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v);
const HIDE = new Set(["summary", "summaryReceipt", "sources", "largestPools"]);

function Facts({ obj }: { obj: Record<string, unknown> }) {
  const flat = Object.entries(obj).filter(([k, v]) => !HIDE.has(k) && (v === null || typeof v !== "object"));
  const nested = Object.entries(obj).filter(([k, v]) => !HIDE.has(k) && v && typeof v === "object" && !Array.isArray(v));
  return <>
    {flat.length > 0 && <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "minmax(130px,1fr) auto", gap: "8px 16px" }}>
      {flat.map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt className="muted small">{human(k)}</dt>
        <dd className="small num" style={{ margin: 0, textAlign: "right", wordBreak: "break-all", fontWeight: 550 }}>{isAddr(v) ? <span title={String(v)}>{short(String(v))}</span> : show(k, v)}</dd></div>)}
    </dl>}
    {nested.map(([k, v]) => <div key={k} className="stack" style={{ gap: 8 }}><div className="label">{human(k)}</div><Facts obj={v as any} /></div>)}
  </>;
}

export function Result({ a }: { a: Answer }) {
  const e = a.env;
  return (
    <div className="card pad stack enter" style={{ boxShadow: "none" }}>
      <div className="between">
        {a.verified ? <span className="pill ok"><SealCheck size={14} weight="fill" />Signed by this agent</span>
          : <span className="pill no"><Warning size={14} weight="fill" />Signature does not match</span>}
        {a.payment && (a.payment.allowed
          ? <span className="pill num">Paid {Number(a.payment.charged).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDT0</span>
          : <span className="pill no">Refused by the budget rules</span>)}
      </div>
      {e.ok ? <>
        {typeof (e.result as any)?.summary === "string" && <p style={{ margin: 0, fontSize: 16, fontWeight: 550 }}>{(e.result as any).summary}</p>}
        <Facts obj={e.result as any} />
        {Array.isArray((e.result as any)?.market?.largestPools) && (e.result as any).market.largestPools.length > 0 && (
          <div className="stack" style={{ gap: 6 }}><div className="label">Largest pools</div>
            {(e.result as any).market.largestPools.map((p: any) => <div key={p.address} className="between small"><span>{p.name}</span><span className="num muted">${Number(p.liquidityUsd).toLocaleString("en-US", { maximumFractionDigits: 0 })}</span></div>)}
          </div>)}
        {(e.result as any)?.sources && <div className="hint">Sources: {Object.values((e.result as any).sources).join(" · ")}</div>}
      </> : <div className="error">{e.error?.message}</div>}
      <div className="row small" style={{ flexWrap: "wrap" }}>
        {a.payment?.tx && <TxLink tx={a.payment.tx}>Payment on the explorer</TxLink>}
        {a.recordTx && <TxLink tx={a.recordTx}>Track record entry</TxLink>}
      </div>
    </div>
  );
}

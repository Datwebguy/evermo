// A signed answer, kept short: the verdict, three or four key facts, and everything else folded under "All details".
import { SealCheck, Warning, CaretDown } from "@phosphor-icons/react";
import type { Answer } from "../service/api";
import { TxLink } from "./parts";
import { short } from "../chain/format";

const NAMES: Record<string, string> = {
  collateralUsd: "Collateral (USD)", debtUsd: "Debt (USD)", availableToBorrowUsd: "Can still borrow (USD)", healthFactor: "Health",
  warnBelow: "Warning level", atRisk: "Below warning level", account: "Account", block: "Checked at block", token: "Token",
  name: "Name", symbol: "Symbol", decimals: "Decimals", totalSupply: "Total supply", codeBytes: "Contract size (bytes)", upgradeable: "Can be upgraded",
  implementation: "Upgrade target", owner: "Controlled by", ownerRenounced: "Control given up", pausable: "Can be paused", paused: "Paused now",
  pools: "Trading pools", totalLiquidityUsd: "Liquidity (USD)", flaggedHoneypot: "Flagged as a trap", holders: "Holders", contract: "Contract", market: "Market",
};
const human = (k: string) => NAMES[k] ?? k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
const isAddr = (v: unknown) => typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v);
const show = (k: string, v: unknown) => v === null || v === undefined ? "Not known" : v === true ? "Yes" : v === false ? "No"
  : /Usd$|^totalSupply$|^health/.test(k) && /^\d+(\.\d+)?$/.test(String(v)) ? Number(v).toLocaleString("en-US", { maximumFractionDigits: k === "healthFactor" ? 2 : 0 }) : String(v);
const HIDE = new Set(["summary", "summaryReceipt", "sources", "largestPools", "lang"]);

/** The few facts that matter most, per kind of answer. */
function keyFacts(r: any): [string, string, "ok" | "no" | ""][] {
  if (r?.healthFactor !== undefined) return [
    ["Health", r.healthFactor === null ? "—" : show("healthFactor", r.healthFactor), r.atRisk ? "no" : r.healthFactor ? "ok" : ""],
    ["Collateral (USD)", show("collateralUsd", r.collateralUsd), ""],
    ["Debt (USD)", show("debtUsd", r.debtUsd), ""],
  ];
  if (r?.contract) return [
    ["Liquidity (USD)", r.market ? show("totalLiquidityUsd", r.market.totalLiquidityUsd) : "—", ""],
    ["Can be upgraded", show("", r.contract.upgradeable), r.contract.upgradeable ? "no" : "ok"],
    ["Control given up", show("", r.contract.ownerRenounced), r.contract.ownerRenounced ? "ok" : "no"],
    ["Trading pools", r.market ? String(r.market.pools) : "—", ""],
  ];
  return [];
}

function Facts({ obj }: { obj: Record<string, unknown> }) {
  const flat = Object.entries(obj).filter(([k, v]) => !HIDE.has(k) && !(k === "market" && v === null) && (v === null || typeof v !== "object"));
  const nested = Object.entries(obj).filter(([k, v]) => !HIDE.has(k) && v && typeof v === "object" && !Array.isArray(v));
  return <>
    {flat.length > 0 && <dl className="facts">
      {flat.map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt className="muted small">{human(k)}</dt>
        <dd className="small num">{isAddr(v) ? <span title={String(v)}>{short(String(v))}</span> : show(k, v)}</dd></div>)}
    </dl>}
    {nested.map(([k, v]) => <div key={k} className="stack" style={{ gap: 8 }}><div className="label">{human(k)}</div><Facts obj={v as any} /></div>)}
  </>;
}

export function Result({ a }: { a: Answer }) {
  const e = a.env, r = e.result as any;
  const facts = e.ok ? keyFacts(r) : [];
  return (
    <div className="answer enter">
      <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
        {a.verified ? <span className="pill ok"><SealCheck size={14} weight="fill" />Signed by this agent</span>
          : <span className="pill no"><Warning size={14} weight="fill" />Signature does not match</span>}
        {a.payment && (a.payment.allowed
          ? <span className="pill num">Paid {Number(a.payment.charged).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDT0</span>
          : <span className="pill no">Refused by the budget rules</span>)}
      </div>
      {e.ok ? <>
        {typeof r?.summary === "string" && <p className="verdict" data-notr>{r.summary}</p>}
        {facts.length > 0 && <div className="chips">{facts.map(([k, v, tone], i) =>
          <div key={k} className={`chip ${tone}`} style={{ animationDelay: `${i * 70}ms` }}><span className="label">{k}</span><b className="num">{v}</b></div>)}</div>}
        {r?.market === null && <div className="hint">Market data is busy right now. Try again in a minute for liquidity and trading.</div>}
        <details className="more">
          <summary><CaretDown size={14} />All details</summary>
          <div className="stack" style={{ marginTop: 12 }}>
            <Facts obj={r} />
            {Array.isArray(r?.market?.largestPools) && r.market.largestPools.length > 0 && (
              <div className="stack" style={{ gap: 6 }}><div className="label">Largest pools</div>
                {r.market.largestPools.map((p: any) => <div key={p.address} className="between small"><span data-notr>{p.name}</span>
                  <span className="num muted">${Number(p.liquidityUsd).toLocaleString("en-US", { maximumFractionDigits: 0 })}</span></div>)}
              </div>)}
            {r?.sources && <div className="hint">Sources: {Object.values(r.sources).join(" · ")}</div>}
          </div>
        </details>
      </> : <div className="error">{e.error?.message}</div>}
      {(a.payment?.tx || a.recordTx) && <div className="row small" style={{ flexWrap: "wrap" }}>
        {a.payment?.tx && <TxLink tx={a.payment.tx}>Payment on the explorer</TxLink>}
        {a.recordTx && <TxLink tx={a.recordTx}>Track record entry</TxLink>}
      </div>}
    </div>
  );
}

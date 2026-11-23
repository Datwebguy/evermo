import { useEffect, useMemo, useState } from "react";
import { activity, agents, live, type Item } from "../service/api";
import { dep } from "../chain/deployment";
import { money } from "../chain/format";
import { CircuitView } from "../ui/CircuitView";
import { Feed } from "../ui/Feed";
import { Skel } from "../ui/parts";
import { circuits } from "../words";

export function Activity() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [names, setNames] = useState(new Map<string, string>());
  useEffect(() => {
    activity().then(setItems).catch(() => setItems([]));
    agents().then((l) => setNames(new Map(l.map((a) => [a.agentId, a.name ?? "An agent"])))).catch(() => {});
    return live((it) => setItems((f) => [it, ...(f ?? [])].slice(0, 100)));
  }, []);
  const pay = useMemo(() => items?.find((x) => x.name === "PaymentDecided"), [items]);
  const sale = useMemo(() => items?.find((x) => x.name === "Sold"), [items]);
  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="stack" style={{ gap: 6 }}><h1 className="title">Activity</h1>
        <p className="muted" style={{ margin: 0 }}>Every payment and sale on Evermo is decided by rules taped out on X Layer. Here they are, as they happen.</p></div>
      <div className="split">
        <div className="stack" style={{ gap: 16, minWidth: 0 }}>
          <section className="card pad stack">
            <div className="between"><div className="h2">Budget check</div>{pay && <span className={`pill ${pay.data.allowed ? "ok" : "no"}`}>{pay.data.allowed ? "Allowed" : "Refused"} {money(pay.data.amount, pay.data.token)}</span>}</div>
            <CircuitView id={dep().budgetCircuitId} bits={pay ? parseInt(String(pay.data.inputs), 16) : null} labels={circuits.budget.inputs} outLabels={circuits.budget.outputs} />
          </section>
          <section className="card pad stack">
            <div className="between"><div className="h2">Sale check</div>{sale && <span className="pill brand">Sold for {money(sale.data.price, sale.data.token)}</span>}</div>
            <CircuitView id={dep().resaleCircuitId} bits={sale ? parseInt(String(sale.data.inputs), 16) : null} labels={circuits.resale.inputs} outLabels={circuits.resale.outputs}
              caption={sale ? undefined : "No sale yet. The check runs on every purchase."} />
          </section>
        </div>
        <section className="card pad"><div className="between"><div className="h2">Latest</div><span className="pill ok"><span className="dot" />Live</span></div>
          {items === null ? <div className="stack" style={{ marginTop: 12 }}>{[0, 1, 2, 3].map((i) => <Skel key={i} h={40} />)}</div> : <Feed items={items} names={names} />}</section>
      </div>
    </div>
  );
}

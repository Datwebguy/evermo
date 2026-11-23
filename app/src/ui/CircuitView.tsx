// The real taped-out circuit, read from the processor, evaluated in the browser with the inputs of a real decision.
// Signals light in order of depth when a new decision arrives: inputs, then gates, then the result.
import { useEffect, useMemo, useState } from "react";
import { processor } from "../chain/read";
import { decode, evaluate, type Netlist } from "../../../circuits/src/netlist";
import { Skel } from "./parts";

const cache = new Map<string, Promise<Netlist>>();
function load(id: string) {
  if (!cache.has(id)) cache.set(id, (async () => {
    const p = processor();
    const [info, hex] = await Promise.all([p.circuitInfo(id), p.netlist(id)]);
    return decode(hex, Number(info.nIn), Number(info.nOut));
  })());
  return cache.get(id)!;
}

export function CircuitView({ id, bits, labels, outLabels, caption }: { id: string; bits: number | null; labels: string[]; outLabels: string[]; caption?: string }) {
  const [net, setNet] = useState<Netlist | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { load(id).then(setNet, () => setFailed(true)); }, [id]);

  const layout = useMemo(() => {
    if (!net) return null;
    const nIn = net.nIn, depth: number[] = [0, 0, ...Array(nIn).fill(0)];
    net.gates.forEach(([a, b]) => depth.push(Math.max(depth[a], depth[b]) + 1));
    const maxD = Math.max(...depth);
    const cols: number[][] = Array.from({ length: maxD + 1 }, () => []);
    depth.forEach((d, s) => { if (s >= 2 && d > 0) cols[d].push(s); });
    return { depth, maxD, cols };
  }, [net]);

  if (failed) return <div className="hint">The circuit could not be read from X Layer right now.</div>;
  if (!net || !layout) return <Skel h={180} />;

  const inputs = Array.from({ length: net.nIn }, (_, i) => (bits === null ? 0 : (bits >> i) & 1));
  const values = bits === null ? null : evaluate(net, inputs);
  // Every signal, for the drawing
  const sig: number[] = [0, 1, ...inputs];
  net.gates.forEach(([a, b]) => sig.push(sig[a] & sig[b] ? 0 : 1));
  const total = sig.length, outStart = total - net.nOut;

  const W = 520, H = 140, padL = 24, padR = 24;
  const colX = (d: number) => padL + ((W - padL - padR) * d) / (layout.maxD || 1);
  const pos = new Map<number, [number, number]>();
  for (let i = 0; i < net.nIn; i++) pos.set(2 + i, [padL - 8, 26 + (i * (H - 52)) / Math.max(1, net.nIn - 1)]);
  layout.cols.forEach((c, d) => c.forEach((s, j) => pos.set(s, [colX(d), 26 + ((j + 0.5) * (H - 52)) / c.length])));
  const lit = (s: number) => values !== null && sig[s] === 1;
  const delay = (s: number) => `${layout.depth[s] * 90}ms`;

  return (
    <figure style={{ margin: 0, display: "grid", gap: 14 }}>
      <div className="circuit-io">
        <div className="stack" style={{ gap: 6 }}>
          {labels.map((l, i) => <div key={i} className="between small"><span className="muted">{l}</span>
            <span className={`pill ${values === null ? "" : inputs[i] ? "brand" : ""}`}>{values === null ? "—" : inputs[i] ? "Yes" : "No"}</span></div>)}
        </div>
        <div className="stack" style={{ gap: 6, alignContent: "start" }}>
          {outLabels.map((l, i) => <div key={i} className="between small" style={{ fontWeight: 600 }}><span>{l}</span>
            <span className={`pill ${values === null ? "" : values[i] ? "ok" : "no"}`}>{values === null ? "—" : values[i] ? "Yes" : "No"}</span></div>)}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={caption ?? "How the rule check decided"} style={{ display: "block", overflow: "visible" }} key={bits ?? -1}>
        {net.gates.map(([a, b], g) => {
          const s = 2 + net.nIn + g, [x, y] = pos.get(s)!;
          return [a, b].filter((q) => q >= 2).map((q, k) => {
            const [qx, qy] = pos.get(q)!;
            return <path key={`${g}-${k}`} d={`M${qx},${qy} C${(qx + x) / 2},${qy} ${(qx + x) / 2},${y} ${x},${y}`} fill="none"
              style={{ stroke: lit(q) ? "var(--brand)" : "var(--line-strong)", strokeWidth: lit(q) ? 2 : 1.25, transition: "stroke .3s", transitionDelay: delay(q) }} />;
          });
        })}
        {Array.from({ length: net.nIn }, (_, i) => {
          const [x, y] = pos.get(2 + i)!;
          return <g key={i}>
            <circle cx={x} cy={y} r="7" style={{ fill: lit(2 + i) ? "var(--brand)" : "var(--surface)", stroke: lit(2 + i) ? "var(--brand)" : "var(--line-strong)", strokeWidth: 1.5, transition: "fill .3s" }} />
          </g>;
        })}
        {net.gates.map((_, g) => {
          const s = 2 + net.nIn + g, [x, y] = pos.get(s)!, out = s >= outStart;
          return <g key={g}>
            <rect x={x - 9} y={y - 9} width="18" height="18" rx="5" style={{ fill: lit(s) ? "var(--brand)" : "var(--surface)", stroke: lit(s) ? "var(--brand)" : "var(--line-strong)", strokeWidth: 1.5, transition: "fill .3s", transitionDelay: delay(s) }} />
          </g>;
        })}
      </svg>
      <figcaption className="hint" style={{ marginTop: 8 }}>{caption ?? `The check is ${net.gates.length} logic gates, taped out on X Layer. Nobody can change them.`}</figcaption>
    </figure>
  );
}

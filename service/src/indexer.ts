// Reads Evermo's contract events from X Layer into SQLite, 100 blocks at a time (the RPC's limit), and serves them.
// The index holds nothing that is not on chain, so it can be deleted and rebuilt at any time.
import { DatabaseSync } from "node:sqlite";
import { EventEmitter } from "node:events";
import { Interface, type JsonRpcProvider, type Log } from "ethers";

export const abis = {
  registry: new Interface([
    "event AgentRegistered(bytes32 indexed agentId, address indexed circuits, uint256 indexed tokenId, address builder, string manifest)",
    "event ManifestUpdated(bytes32 indexed agentId, string manifest)",
    "event Recorded(bytes32 indexed agentId, uint8 indexed kind, bytes32 ref, uint256 amount, address token)",
  ]),
  budget: new Interface([
    "event Deposited(bytes32 indexed agentId, address indexed token, address indexed from, uint256 amount)",
    "event Withdrawn(bytes32 indexed agentId, address indexed token, address indexed to, uint256 amount)",
    "event PaymentDecided(bytes32 indexed agentId, address indexed token, address indexed payee, uint256 amount, bytes1 inputs, bool allowed, bytes32 ref)",
  ]),
  market: new Interface([
    "event Listed(uint256 indexed listingId, bytes32 indexed agentId, address indexed seller, address token, uint256 price, uint64 expiresAt)",
    "event Cancelled(uint256 indexed listingId)",
    "event Sold(uint256 indexed listingId, bytes32 indexed agentId, address indexed buyer, address seller, address token, uint256 price, uint256 toSeller, uint256 royalty, uint256 fee, uint256 burned, bytes1 inputs, bytes1 outputs)",
  ]),
};

export type Item = { block: number; time: number; tx: string; logIndex: number; source: string; name: string; agentId: string | null; data: Record<string, string | boolean> };
const STEP = 100;

export class Indexer extends EventEmitter {
  private db: DatabaseSync;
  private running = false;
  constructor(file: string, private p: JsonRpcProvider, private at: { registry: string; budget: string; market: string }, private fromBlock: number) {
    super();
    this.db = new DatabaseSync(file);
    this.db.exec(`CREATE TABLE IF NOT EXISTS events (block INTEGER, time INTEGER, tx TEXT, log_index INTEGER, source TEXT, name TEXT,
        agent TEXT, data TEXT, PRIMARY KEY (tx, log_index));
      CREATE INDEX IF NOT EXISTS events_agent ON events(agent, block);
      CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
      CREATE TABLE IF NOT EXISTS listing_agent (listing TEXT PRIMARY KEY, agent TEXT);`);
  }
  head(): number { const r = this.db.prepare("SELECT v FROM meta WHERE k='head'").get() as any; return r ? Number(r.v) : this.fromBlock - 1; }

  private decode(l: Log): Omit<Item, "time"> | null {
    const src = l.address.toLowerCase() === this.at.registry.toLowerCase() ? "registry" : l.address.toLowerCase() === this.at.budget.toLowerCase() ? "budget" : "market";
    let ev; try { ev = abis[src].parseLog(l); } catch { return null; }
    if (!ev) return null;
    const data: Record<string, string | boolean> = {};
    ev.fragment.inputs.forEach((inp, i) => { const v = ev!.args[i]; data[inp.name] = typeof v === "boolean" ? v : String(v); });
    let agentId = (data.agentId as string) ?? null;
    if (ev.name === "Listed") this.db.prepare("INSERT OR REPLACE INTO listing_agent VALUES (?, ?)").run(String(data.listingId), agentId);
    if (ev.name === "Cancelled") agentId = ((this.db.prepare("SELECT agent FROM listing_agent WHERE listing=?").get(String(data.listingId)) as any)?.agent) ?? null;
    if (ev.name === "Recorded") data.kind = ["work", "payment", "blocked", "sale"][Number(data.kind)] ?? String(data.kind);
    return { block: l.blockNumber, tx: l.transactionHash, logIndex: l.index, source: src, name: ev.name, agentId, data };
  }

  /** Indexes up to `max` blocks; returns the new head. */
  async step(max = 2000): Promise<number> {
    const tip = await this.p.getBlockNumber();
    let from = this.head() + 1;
    const end = Math.min(tip, from + max - 1);
    const times = new Map<number, number>();
    while (from <= end) {
      const to = Math.min(end, from + STEP - 1);
      const logs = await this.p.getLogs({ address: [this.at.registry, this.at.budget, this.at.market], fromBlock: from, toBlock: to });
      const fresh: Item[] = [];
      for (const l of logs) {
        const d = this.decode(l); if (!d) continue;
        if (!times.has(l.blockNumber)) times.set(l.blockNumber, (await this.p.getBlock(l.blockNumber))!.timestamp);
        const item = { ...d, time: times.get(l.blockNumber)! };
        const r = this.db.prepare("INSERT OR IGNORE INTO events VALUES (?,?,?,?,?,?,?,?)").run(item.block, item.time, item.tx, item.logIndex, item.source, item.name, item.agentId, JSON.stringify(item.data));
        if (r.changes) fresh.push(item);
      }
      this.db.prepare("INSERT OR REPLACE INTO meta VALUES ('head', ?)").run(String(to));
      for (const f of fresh) this.emit("item", f);
      from = to + 1;
    }
    return this.head();
  }

  start(everyMs = 3000) {
    if (this.running) return; this.running = true;
    const loop = async () => {
      while (this.running) {
        try { const h = await this.step(); if (h >= (await this.p.getBlockNumber()) - 1) await new Promise((r) => setTimeout(r, everyMs)); }
        catch (e) { console.error("index", e); await new Promise((r) => setTimeout(r, everyMs * 3)); }
      }
    };
    void loop();
  }
  stop() { this.running = false; }

  private rows(sql: string, ...args: (string | number)[]): Item[] {
    return (this.db.prepare(sql).all(...args) as any[]).map((r) => ({ block: r.block, time: r.time, tx: r.tx, logIndex: r.log_index,
      source: r.source, name: r.name, agentId: r.agent, data: JSON.parse(r.data) }));
  }
  history(agentId: string, limit = 100): Item[] {
    return this.rows("SELECT * FROM events WHERE agent=? ORDER BY block DESC, log_index DESC LIMIT ?", agentId.toLowerCase(), limit);
  }
  recent(limit = 50): Item[] { return this.rows("SELECT * FROM events ORDER BY block DESC, log_index DESC LIMIT ?", limit); }
  agents(): Item[] { return this.rows("SELECT * FROM events WHERE name='AgentRegistered' ORDER BY block ASC, log_index ASC"); }
  /** Last activity per agent, for sorting. */
  lastActivity(): Map<string, number> {
    const m = new Map<string, number>();
    for (const r of this.db.prepare("SELECT agent, MAX(time) t FROM events WHERE agent IS NOT NULL GROUP BY agent").all() as any[]) m.set(r.agent, r.t);
    return m;
  }
}

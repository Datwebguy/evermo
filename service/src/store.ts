// Small file-backed store for delegations, receipts and watches. Survives restarts.
import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";

export class Store<T> {
  private data: Record<string, T>;
  constructor(private file: string) {
    try { this.data = JSON.parse(readFileSync(file, "utf8")); } catch { this.data = {}; }
  }
  get(k: string): T | undefined { return this.data[k]; }
  all(): [string, T][] { return Object.entries(this.data); }
  set(k: string, v: T) { this.data[k] = v; this.flush(); }
  delete(k: string) { delete this.data[k]; this.flush(); }
  private flush() { const t = this.file + ".tmp"; writeFileSync(t, JSON.stringify(this.data)); renameSync(t, this.file); }
}
export function stores(dir: string) {
  mkdirSync(dir, { recursive: true });
  return {
    delegations: new Store<{ holder: string; expires: number; sig: string }>(join(dir, "delegations.json")),
    receipts: new Store<any>(join(dir, "receipts.json")),
    calls: new Store<number>(join(dir, "calls.json")),
    watches: new Store<{ slug: string; account: string; warnBelow: string; atRisk: boolean; holder: string }>(join(dir, "watches.json")),
  };
}

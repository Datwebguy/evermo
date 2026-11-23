import { useState } from "react";
import { explain } from "../chain/wallet";

/** Runs one wallet action and waits for the chain to confirm it. */
export function useStep() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function go<T>(name: string, f: () => Promise<T>): Promise<T | null> {
    setBusy(name); setError("");
    try { return await f(); } catch (e) { setError(explain(e)); return null; } finally { setBusy(null); }
  }
  return { busy, error, go, setError };
}
export const confirm = async (tx: any) => { const r = await tx.wait(); if (r?.status !== 1) throw new Error("reverted"); return r; };

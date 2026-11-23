// TAP-15 tool pinning: toolsSha256 over the normalised tool list.
import { createHash } from "node:crypto";
import { canonicalJSON } from "./canonical.ts";

const COVERED = ["name", "title", "description", "inputSchema", "outputSchema", "annotations"] as const;
export type Tool = { name: string; title?: string; description: string; inputSchema: object; outputSchema?: object; annotations?: object };

export function normalise(tools: Tool[]): object[] {
  const seen = new Set<string>();
  return tools.map((t) => {
    if (seen.has(t.name)) throw new Error("duplicate tool " + t.name);
    seen.add(t.name);
    const o: Record<string, unknown> = {};
    for (const k of COVERED) if ((t as any)[k] !== undefined) o[k] = (t as any)[k];
    return o;
  }).sort((a: any, b: any) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}
export function toolsSha256(tools: Tool[]): string {
  return createHash("sha256").update(canonicalJSON(normalise(tools))).digest("hex");
}

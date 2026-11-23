import { formatUnits } from "ethers";
import { tokenBy } from "./deployment";

export function money(raw: string | bigint, token: string, digits = 2): string {
  const t = tokenBy(token);
  if (!t) return "—";
  const n = Number(formatUnits(raw, t.decimals));
  const max = n !== 0 && Math.abs(n) < 1 ? Math.min(6, t.decimals) : digits;
  return `${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: max })} ${t.symbol}`;
}
export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export function ago(unix: number): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - unix));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
export const dateOf = (unix: number) => new Date(unix * 1000).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

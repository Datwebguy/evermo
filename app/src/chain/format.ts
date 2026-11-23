import { formatUnits } from "ethers";
import { tokenBy } from "./deployment";
import { getLang } from "../i18n";

export function money(raw: string | bigint, token: string, digits = 2): string {
  const t = tokenBy(token);
  if (!t) return "—";
  const n = Number(formatUnits(raw, t.decimals));
  const max = n !== 0 && Math.abs(n) < 1 ? Math.min(6, t.decimals) : digits;
  return `${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: max })} ${t.symbol}`;
}
export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export function ago(unix: number): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - unix)), zh = getLang() === "zh";
  if (s < 60) return zh ? "刚刚" : "just now";
  if (s < 3600) return zh ? `${Math.floor(s / 60)} 分钟前` : `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return zh ? `${Math.floor(s / 3600)} 小时前` : `${Math.floor(s / 3600)} h ago`;
  return zh ? `${Math.floor(s / 86400)} 天前` : `${Math.floor(s / 86400)} d ago`;
}
export const dateOf = (unix: number) => getLang() === "zh"
  ? new Date(unix * 1000).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })
  : new Date(unix * 1000).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

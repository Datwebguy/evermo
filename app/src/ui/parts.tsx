import { useEffect, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { dep } from "../chain/deployment";

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k); document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [onClose]);
  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-head"><div className="h2" style={{ flex: 1 }}>{title}</div>
          <button className="btn quiet small" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export const TxLink = ({ tx, children = "View on the explorer" }: { tx: string; children?: ReactNode }) =>
  <a className="link small" href={`${dep().explorer}/tx/${tx}`} target="_blank" rel="noreferrer">{children}</a>;
export const AddrLink = ({ a, children }: { a: string; children: ReactNode }) =>
  <a className="link" href={`${dep().explorer}/address/${a}`} target="_blank" rel="noreferrer">{children}</a>;

export function Skel({ w = "100%", h = 14 }: { w?: number | string; h?: number }) {
  return <span className="skel" style={{ display: "block", width: w, height: h }} />;
}

export function Notice({ tone = "muted", children }: { tone?: "muted" | "no" | "ok"; children: ReactNode }) {
  return <div className="card pad small" style={{ boxShadow: "none", background: tone === "no" ? "var(--no-soft)" : tone === "ok" ? "var(--ok-soft)" : "var(--surface-2)", borderColor: "transparent", color: tone === "no" ? "var(--no)" : tone === "ok" ? "var(--ok)" : "var(--ink-2)" }}>{children}</div>;
}

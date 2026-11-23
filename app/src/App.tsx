import { useEffect, useState } from "react";
import { House, Pulse, User, PlusCircle, Sun, Moon, Compass } from "@phosphor-icons/react";
import { loadDeployment } from "./chain/deployment";
import { short } from "./chain/format";
import { WalletProvider, useWallet } from "./state";
import { Home } from "./screens/Home";
import { Agent } from "./screens/Agent";
import { Mine } from "./screens/Mine";
import { Activity } from "./screens/Activity";
import { Add } from "./screens/Add";
import { Notice } from "./ui/parts";
import { Logo } from "./ui/Logo";
import { Tour, tourSeen } from "./ui/Tour";
import { getTheme, applyTheme, isDark, type Theme } from "./ui/theme";
import { getLang, setLang, startTranslating } from "./i18n";

function useRoute() {
  const [h, setH] = useState(location.hash.slice(1) || "/");
  useEffect(() => { const f = () => { setH(location.hash.slice(1) || "/"); window.scrollTo(0, 0); }; addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  return h;
}
const PLACES = [["/", "Agents", House], ["/activity", "Activity", Pulse], ["/mine", "My agents", User], ["/add", "Add", PlusCircle]] as const;

function WalletButton() {
  const { address, ask, disconnect } = useWallet();
  return address
    ? <button className="btn small" onClick={disconnect} title="Disconnect"><span className="dot" style={{ color: "var(--ok)" }} />{short(address)}</button>
    : <button className="btn small primary" onClick={() => ask()}>Connect</button>;
}

function Controls({ onTour }: { onTour: () => void }) {
  const [theme, setTheme] = useState<Theme>(getTheme());
  const [, force] = useState(0);
  const dark = isDark(theme);
  return <>
    <button className="ctl hide-sm" onClick={onTour} title="Take the tour" aria-label="Take the tour"><Compass size={18} /></button>
    <button className="ctl" data-notr onClick={() => { setLang(getLang() === "zh" ? "en" : "zh"); force((n) => n + 1); }}
      aria-label={getLang() === "zh" ? "Switch to English" : "切换到中文"}>{getLang() === "zh" ? "EN" : "中文"}</button>
    <button className="ctl" onClick={() => { const t: Theme = dark ? "light" : "dark"; applyTheme(t); setTheme(t); }} aria-label={dark ? "Light" : "Dark"} title={dark ? "Light" : "Dark"}>
      {dark ? <Sun size={18} /> : <Moon size={18} />}</button>
  </>;
}

function Shell() {
  const r = useRoute();
  const [touring, setTouring] = useState(false);
  useEffect(() => { const f = () => setTouring(true); addEventListener("evermo-tour", f); return () => removeEventListener("evermo-tour", f); }, []);
  useEffect(() => { if (!tourSeen()) { const t = setTimeout(() => setTouring(true), 1200); return () => clearTimeout(t); } }, []);
  const at = (p: string) => (p === "/" ? r === "/" || r.startsWith("/agent/") : r.startsWith(p));
  const agentId = r.match(/^\/agent\/(0x[0-9a-fA-F]{64})$/)?.[1];
  return <>
    <header className="top"><div className="top-in">
      <a className="logo" href="#/" data-notr><Logo size={30} />Evermo</a>
      <nav className="nav">{PLACES.map(([p, t]) => <a key={p} href={`#${p}`} aria-current={at(p) ? "page" : undefined}>{t === "Add" ? "Add an agent" : t}</a>)}</nav>
      <span className="spacer" /><Controls onTour={() => setTouring(true)} /><WalletButton />
    </div></header>
    <main>
      {agentId ? <Agent key={agentId} id={agentId} /> : r === "/activity" ? <Activity /> : r === "/mine" ? <Mine /> : r === "/add" ? <Add />
        : r === "/" ? <Home /> : <Notice>This page does not exist. <a className="link" href="#/">Go to all agents</a>.</Notice>}
    </main>
    {touring && <Tour onClose={() => setTouring(false)} />}
    <nav className="tabs">{PLACES.map(([p, t, I]) => <a key={p} href={`#${p}`} aria-current={at(p) ? "page" : undefined}><I size={22} weight={at(p) ? "fill" : "regular"} />{t}</a>)}</nav>
  </>;
}

export function App() {
  const [ready, setReady] = useState<"wait" | "ok" | string>("wait");
  useEffect(() => { applyTheme(getTheme()); startTranslating(); loadDeployment().then(() => setReady("ok"), (e) => setReady(e.message)); }, []);
  if (ready === "wait") return null;
  if (ready !== "ok") return <main><Notice tone="no">{ready}</Notice></main>;
  return <WalletProvider><Shell /></WalletProvider>;
}

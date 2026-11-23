import { useEffect, useState } from "react";
import { House, Pulse, User, PlusCircle } from "@phosphor-icons/react";
import { loadDeployment } from "./chain/deployment";
import { short } from "./chain/format";
import { WalletProvider, useWallet } from "./state";
import { Home } from "./screens/Home";
import { Agent } from "./screens/Agent";
import { Mine } from "./screens/Mine";
import { Activity } from "./screens/Activity";
import { Add } from "./screens/Add";
import { Notice } from "./ui/parts";

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

function Shell() {
  const r = useRoute();
  const at = (p: string) => (p === "/" ? r === "/" || r.startsWith("/agent/") : r.startsWith(p));
  const agentId = r.match(/^\/agent\/(0x[0-9a-fA-F]{64})$/)?.[1];
  return <>
    <header className="top"><div className="top-in">
      <a className="logo" href="#/"><i />Evermo</a>
      <nav className="nav">{PLACES.map(([p, t]) => <a key={p} href={`#${p}`} aria-current={at(p) ? "page" : undefined}>{t === "Add" ? "Add an agent" : t}</a>)}</nav>
      <span className="spacer" /><WalletButton />
    </div></header>
    <main>
      {agentId ? <Agent key={agentId} id={agentId} /> : r === "/activity" ? <Activity /> : r === "/mine" ? <Mine /> : r === "/add" ? <Add />
        : r === "/" ? <Home /> : <Notice>This page does not exist. <a className="link" href="#/">Go to all agents</a>.</Notice>}
    </main>
    <nav className="tabs">{PLACES.map(([p, t, I]) => <a key={p} href={`#${p}`} aria-current={at(p) ? "page" : undefined}><I size={22} weight={at(p) ? "fill" : "regular"} />{t}</a>)}</nav>
  </>;
}

export function App() {
  const [ready, setReady] = useState<"wait" | "ok" | string>("wait");
  useEffect(() => { loadDeployment().then(() => setReady("ok"), (e) => setReady(e.message)); }, []);
  if (ready === "wait") return null;
  if (ready !== "ok") return <main><Notice tone="no">{ready}</Notice></main>;
  return <WalletProvider><Shell /></WalletProvider>;
}

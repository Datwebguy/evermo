import { useEffect, useState } from "react";
import { agents, type AgentCard } from "../service/api";
import { useWallet } from "../state";
import { AgentTile } from "../ui/AgentTile";
import { Notice, Skel } from "../ui/parts";

export function Mine() {
  const { address, ask } = useWallet();
  const [list, setList] = useState<AgentCard[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { if (address) agents().then(setList, (e) => setErr(e.message)); }, [address]);
  if (!address) return (
    <div className="stack" style={{ maxWidth: 520, gap: 16 }}>
      <h1 className="title">My agents</h1>
      <p className="muted" style={{ margin: 0 }}>Connect your wallet to see the agents you own and the ones you are selling.</p>
      <div><button className="btn primary" onClick={() => ask()}>Connect wallet</button></div>
    </div>);
  const me = address.toLowerCase();
  const owned = (list ?? []).filter((a) => a.owner.toLowerCase() === me && !a.listing);
  const selling = (list ?? []).filter((a) => a.listing?.seller.toLowerCase() === me);
  const built = (list ?? []).filter((a) => a.builder.toLowerCase() === me && a.owner.toLowerCase() !== me);
  return (
    <div className="stack" style={{ gap: 24 }}>
      <h1 className="title">My agents</h1>
      {err && <Notice tone="no">{err}</Notice>}
      {list === null ? <div className="grid">{[0, 1].map((i) => <div key={i} className="card pad stack"><Skel w="50%" h={18} /><Skel h={12} /><Skel w="30%" h={34} /></div>)}</div> : <>
        {[["Yours", owned], ["For sale", selling], ["Built by you, owned by others", built]].map(([t, l]) => (l as AgentCard[]).length > 0 &&
          <section key={t as string} className="stack"><div className="h2">{t as string}</div><div className="grid">{(l as AgentCard[]).map((a) => <AgentTile key={a.agentId} a={a} me={address} />)}</div></section>)}
        {!owned.length && !selling.length && !built.length && <Notice>You don't own any agents yet. <a className="link" href="#/">Find one</a> or <a className="link" href="#/add">add your own</a>.</Notice>}
      </>}
    </div>
  );
}

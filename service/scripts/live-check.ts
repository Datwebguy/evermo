// Runs both agents and one metered AI call against live X Layer, GeckoTerminal and NEAR AI. Read-only on chain.
import { health } from "../src/agents/positionWatch.ts";
import { facts } from "../src/agents/tokenRiskCheck.ts";
import { meteredChat } from "../src/ai.ts";
import { recover } from "../src/tap13.ts";
import { Wallet } from "ethers";
console.log(await health({ account: "0x0000000000000000000000000000000000000001" }));
const f = await facts({ token: "0x60e62efa9405d6873c5deabd4e6cc91c25363952" });
console.log(JSON.stringify(f).slice(0, 600));
const w = Wallet.createRandom(); const c = Wallet.createRandom().address;
const m = await meteredChat(w, c, "openai/gpt-5-nano", new TextEncoder().encode(JSON.stringify({ model: "openai/gpt-5-nano", messages: [{ role: "user", content: "Say ready" }] })));
console.log(m.status, JSON.stringify(m.receipt.result), recover(m.receipt as any, "openai_chat", m.receipt.params) === w.address);

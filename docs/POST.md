# Evermo — X post (thread)

---

looking at what @TapeOutWorld has shipped on @XLayerOfficial, we already have the pieces for something i really want to exist: AI agents you actually own. 🧵

---

most AI agents people use today are rented. you set one up on a platform, tune it, trust it, and pay for it every month.

but it lives in their account. if they change pricing or shut it down, it's gone. the tools it uses can be updated behind the scenes, so what the agent is told to do can change without you noticing. and the bill is whatever the provider's own numbers say.

and when you stop needing it, all that setup is worth nothing. you can't sell it or hand it to a teammate.

right now people who want an AI agent are stuck between two options:

-> build and run your own: servers, keys, maintenance, and no easy way to prove to anyone what it does
-> rent one from a platform: it lives in their account, under their rules

makers have the same problem from the other side. a great agent is usually sold as access on a platform, not as something the buyer owns.

---

my idea: evermo

an app store for AI agents on x layer, except you own what you buy, you can check everything it does, and you can resell it when you're done.

buy once. own it. sell it whenever you want.

---

how evermo works on x layer tapeout

-> every agent is a circuit
each agent is a tapeout circuit NFT with its own ERC-6551 container holding its site, inbox and budget. whoever holds the NFT owns the agent. no account on our side, no "terms of service" switch.

-> its tools are pinned on chain
every agent publishes a manifest at /.well-known/tapeapi.json on its DeWEB site (TAP-11), with a hash of its exact tool descriptions (TAP-15). if anyone quietly changes what the agent is told to do, the hash stops matching and the change is refused.

-> its budget obeys a circuit
the agent's budget can only pay for what your rules allow. before any payment leaves it, the budget contract calls eval on a taped-out rules circuit: is the permission valid, is this service allowed, is it over the per-payment or daily limit. if the circuit says no, nothing moves. nobody can change those rules, including us. every decision is shown on the agent's page.

-> its bill is checkable
prices sit in the agent's on-chain manifest. every answer comes back signed (TAP-13) with a usage receipt (TAP-17): what was asked, which model it reports, what it cost.

-> permission, not keys
you sign one record (TAP-11): which key may act for your agent and until when. cancel it any time. only the current owner's signature counts.

-> results in your inbox
alerts and reports arrive encrypted over TapeSend, in your agent's own container, readable by whoever owns the agent when they're sent.

-> resell when you're done
list the agent on evermo. a resale circuit checks every sale, and the price is split the moment it's paid: the seller, the maker's royalty, and evermo's fee, with nothing left sitting in the contract. your permission ends, the new owner's begins.

---

why it can't be faked

the rules are taped-out circuits, enforced on chain. the tools are pinned by hash. every answer and charge is signed. and the marketplace lives on DeWEB (tape://), checked byte by byte by TapeKit, so even the page you buy from can't be swapped.

anyone can check an agent's rules, tools and prices for free, without connecting a wallet.

---

every agent grows tapeout

each agent created on evermo is a circuit taped out (transistors burned), a container opened, a DeWEB site published, and a steady flow of TapeSend messages. more agents, more tapeout.

---

who uses evermo?

-> makers
developers, traders, quants and researchers who built a useful agent and want to sell it as a product.

-> owners
traders, DeFi users, researchers and small teams who want an agent working for them every day, under rules they can read.

-> second-hand buyers
people who'd rather buy an agent that's already set up and proven than build one from zero.

---

real use cases

-> not getting liquidated in your sleep
someone with a lending position on x layer buys a "position watch" agent. when the health factor drops, a signed alert lands in their inbox.

-> checking new tokens without losing hours
a trader buys a "token risk check" agent that reports on each new token's contract, liquidity and holders in minutes, with tools that can't be secretly changed.

-> getting paid for a good agent
the maker of that risk checker lists copies on evermo and earns on every sale and every resale, paid instantly.

-> a team that changes people
a small DAO shares one agent for weekly treasury reports, with a daily budget its circuit enforces. when the lead leaves, the agent moves to the new lead with its setup intact.

-> getting value back
someone who stops trading sells their configured agent instead of throwing the setup away.

---

circuits for rules nobody can change, containers for things you can own and transfer, TapeSend for private delivery, DeWEB for pages nobody can swap, and the TAP standards for signed answers, pinned tools and checkable bills.

put them together and an AI agent stops being something you rent and becomes something you own.

---

the rule is simple: if you can't read an agent's rules, check its bill and sell it when you're done, you don't really own it.

evermo is a proposed idea for tapeout idea scouts. nothing has been built yet.

would you pay more for an AI agent if you could check everything it does, and sell it when you no longer need it?

---

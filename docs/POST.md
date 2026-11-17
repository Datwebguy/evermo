# Evermo — X post (thread)

---

looking at what @TapeOutWorld has shipped on @XLayerOfficial, we already have every piece for something i really want to exist: AI agents you actually own. 🧵

---

imagine you spend weeks setting up an AI agent that watches your DeFi positions. you tune it, you trust it, you pay for it every month.

then the platform changes its pricing. or shuts the agent down. or quietly updates one of its tools, and now the agent is being told to do something you never agreed to.

you can't check what changed or what you were charged for. and when you stop needing it, all that setup is worth nothing. you can't sell it or even hand it to a teammate.

---

right now people who want an AI agent are stuck between two bad options:

-> build your own: servers, keys, maintenance, and no way to prove what it does
-> rent one from a platform: it lives in their account, under their rules, and disappears with them

makers have it just as bad. a great agent can't be sold as a product, only rented out through a platform that takes a cut and owns the customers.

---

my idea: evermo

an app store for AI agents on x layer, except you own what you buy, you can check everything it does, and you can resell it when you're done.

---

how evermo works on x layer tapeout

-> every agent is a circuit
each agent is a tapeout circuit NFT with its own ERC-6551 container holding its site, inbox and budget. whoever holds the NFT owns the agent. no account on our side, no "terms of service" switch.

-> its tools are pinned on chain
every agent publishes a manifest at /.well-known/tapeapi.json on its DeWEB site (TAP-11), with a hash of its exact tool descriptions (TAP-15). if anyone quietly changes what the agent is told to do, the hash stops matching and the change is refused.

-> its rules are a circuit
before an agent acts, evermo calls eval on a rules circuit: is the owner's permission valid, is this protocol allowed, is the amount over the limit. once it's taped out, nobody can change those rules, including us.

-> its bill is checkable
prices sit in the agent's on-chain manifest. every answer comes back signed (TAP-13) with a usage receipt (TAP-17): what was asked, which model it reports, what it cost.

-> permission, not keys
you sign one record (TAP-11): which key may act for your agent and until when. cancel it any time. only the current owner's signature counts.

-> results in your inbox
alerts and reports arrive encrypted over TapeSend, in your agent's own container. only its current owner can read them.

-> resell when you're done
list the agent on evermo. when someone buys it, your permission stops working and theirs begins. the maker earns a royalty on every resale through evermo.

---

why it can't be faked

the rules are a taped-out circuit (and every answer carries the circuit's inputs and result, so anyone can re-run it), the tools are pinned by hash, every answer and charge is signed, and the marketplace lives on DeWEB (tape://), checked byte by byte by TapeKit, so even the page you buy from can't be swapped.

anyone can check an agent's rules, tools and prices for free, without connecting a wallet.

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
someone with a lending position on x layer buys a "position watch" agent. when the health factor drops, a signed alert lands in their inbox. the rules circuit lets it watch, never move funds.

-> checking new tokens without losing hours
a trader buys a "token risk check" agent that reports on each new token's contract, liquidity and holders in minutes, with tools that can't be secretly changed.

-> getting paid for a good agent
the maker of that risk checker lists copies on evermo and earns on every sale and every resale.

-> a team that changes people
a small DAO shares one agent for weekly treasury reports. when the lead leaves, the agent moves to the new lead with its setup intact.

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

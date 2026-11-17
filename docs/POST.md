# Evermo — X post (thread)

---

looking at what @TapeOutWorld has shipped on @XLayerOfficial, we already have every piece for something i really want to exist: AI agents you actually own. 🧵

---

imagine you spend weeks setting up an AI agent that watches your DeFi positions. you tune it, you trust it, you pay for it every month.

then the platform changes its pricing. or shuts the agent down. or quietly updates one of its tools, and now the agent is being told to do something you never agreed to.

you can't check what changed. you can't check what you were charged for. and when you stop needing it, all that setup is worth nothing. you can't sell it, you can't even hand it to a teammate.

---

right now people who want an AI agent are stuck between two bad options:

-> build your own: servers, keys, maintenance, and no way to prove to anyone what it does
-> rent one from a platform: it lives in their account, under their rules, and disappears with them

makers have it just as bad. if you build a great agent, you can't sell it as a product. you rent access through a platform that takes a cut and owns your customers.

---

my idea: evermo

an app store for AI agents on x layer, except you own what you buy, you can check everything it does, and you can resell it when you're done.

---

how evermo works on x layer tapeout

-> every agent is a circuit
each agent is a tapeout circuit NFT with its own ERC-6551 container. the container holds the agent's site, its inbox and its budget. whoever holds the NFT owns the agent. no account on our side, no "terms of service" switch.

-> its tools are pinned on chain
every agent publishes a manifest at /.well-known/tapeapi.json on its DeWEB site (TAP-11), including a hash of its exact tool descriptions (TAP-15). if anyone quietly changes what the agent is told to do, the hash stops matching and the change is refused instead of trusted.

-> its rules are a circuit
before an agent acts, evermo calls eval on a rules circuit: is the owner's permission still valid, is this protocol allowed, is the amount over the limit. "only watch these three protocols." "never spend more than 50 USDT without asking me." once it's taped out, nobody can change those rules, including us.

-> its bill is checkable
the agent's prices sit in its on-chain manifest. every answer comes back signed (TAP-13) with a usage receipt (TAP-17): what was asked, which model answered, what it cost. you can recompute every charge yourself.

-> you give it permission, not your keys
you sign one record (TAP-18): what the agent may do for you and until when. cancel it any time.

-> results land in your inbox
alerts and reports are sent encrypted over TapeSend, straight to your container.

-> resell when you're done
list the agent on evermo. when someone buys it, the NFT moves, your permission stops working, and theirs begins. the maker earns a royalty on every resale through evermo.

---

why it can't be faked

the rules are a taped-out circuit, so they can't be edited after the fact. the tools are pinned by hash, so they can't be swapped without everyone seeing. every answer and every charge is signed, so there's proof of who said what and what it cost. and the marketplace itself lives on DeWEB (tape://), checked byte by byte by TapeKit, so even the page you buy from can't be replaced.

anyone can open an agent's page and check its rules, tools and prices for free, without connecting a wallet.

---

who uses evermo?

-> makers
developers, traders, quants and researchers who built an agent that's actually useful and want to sell it as a product, not rent it out through a platform.

-> owners
traders, people with money in DeFi, researchers and small teams who want an agent working for them every day, under rules they can read.

-> second-hand buyers
people who'd rather buy an agent that's already set up and proven than build one from zero.

---

real use cases

-> not getting liquidated in your sleep
someone with a lending position on x layer buys a "position watch" agent and points it at their positions. when the health factor drops, a signed alert lands in their inbox. the agent can only watch, never move funds, because the rules circuit says so.

-> checking new tokens without losing hours
a trader who looks at new tokens every day buys a "token risk check" agent. it reports on the contract, liquidity and holders of each token in minutes, using tools that can't be secretly changed to do something else.

-> getting paid for a good agent
the maker of that risk checker lists copies on evermo. they earn on every sale and on every resale through evermo, and their name stays attached to the agent.

-> a team that changes people
a small DAO shares one agent that prepares weekly treasury reports within set limits. when the lead leaves, the agent is transferred to the new lead with all its setup intact.

-> getting value back
someone who stops trading after six months lists their configured agent and sells it, instead of throwing the setup away.

---

we have circuits for rules nobody can change, containers for things you can own and transfer, TapeSend for private delivery, DeWEB for pages nobody can swap, and the TAP standards for signed answers, pinned tools and checkable bills.

putting them together turns an AI agent from something you rent into something you own.

---

the rule is simple: if you can't read an agent's rules, check its bill and sell it when you're done, you don't really own it.

evermo is a proposed idea for tapeout idea scouts. nothing has been built yet.

would you pay more for an AI agent if you could check everything it does, and sell it when you no longer need it?

---

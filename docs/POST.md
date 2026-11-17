# Evermo — idea post (thread draft, v3)

---

one of the quiet costs of building on @TapeOutWorld is fees. 🧵

0.01 BEM every mint. 0.1 BEM for a new processor. 0.08 OKB to open a container. OKB again on older processors.

if you build a lot, you keep topping up your wallet. and every top-up means selling something you'd rather hold.

---

meanwhile, a lot of stablecoins sit on @XLayerOfficial doing nothing.

what if your idle stablecoins paid your tapeout fees for you, without you spending the stablecoins themselves?

---

my idea: evermo

tape out for free: your yield pays your tapeout fees.

---

it's three buttons.

-> deposit
put in USDT0. get evUSDT0 back 1:1. the vault lends it on Aave on x layer (about 3% a year today).

-> claim
take your yield as BEM or OKB, ready to pay tapeout fees.

-> withdraw
take your USDT0 back anytime, plus any yield you haven't claimed.

that's it.

---

the rules live in a circuit

before every claim, the vault asks a tapeout circuit two things: can you claim yet, and what fee do you pay.

the longer you stay, the lower your fee.

once it's taped out, nobody can change it. not me, not anyone. anyone can read it, free, no wallet needed.

---

why take BEM instead of cash?

take your yield as USDT0: 10% fee.
take it as BEM or OKB: 8%, dropping to 2% the longer you hold.

the discount comes out of evermo's own fee. no subsidies, no outside money.

---

an example

1,000 USDT0 earns about $33 a year.
as BEM at the lowest fee, that's about 3.5 BEM at today's price.
that's about 350 mint transactions.
your 1,000 USDT0 is still there.

---

one circuit, three jobs

the evermo circuit:
-> holds the fee rules
-> hosts the app on DeWEB, opened through tape://
-> collects evermo's fees in its own container

---

no admin

nobody can block your claim, pause withdrawals, or change fees. there's no admin key at all.

---

who it's for

-> tapeout builders who mint, tape out and deploy often
-> stablecoin holders on x layer who want their yield to do something useful

---

the rule is simple:

your deposit stays yours. your yield pays your tapeout fees. the circuit decides, and nobody can change it.

evermo is a proposed idea for tapeout idea scouts. an early prototype exists; the full version isn't deployed yet.

---

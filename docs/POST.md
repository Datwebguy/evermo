# Evermo — idea post (thread draft)

---

one of the quiet costs of building on @TapeOutWorld is fees. 🧵

every new processor costs 0.1 BEM. every mint transaction costs 0.01 BEM. containers, uploads and older processors still
take OKB.

if you build a lot, you keep topping up your wallet. and every top-up means selling something you'd rather hold.

---

meanwhile, a lot of stablecoins sit on @XLayerOfficial doing nothing.

so what if your idle stablecoins could pay your tapeout fees for you, without you ever spending the stablecoins themselves?

---

my idea: evermo

tape out for free: your yield pays your tapeout fees.

evermo is a vault on x layer. you deposit stablecoins, keep your principal, and the yield turns into credits you can swap
for BEM to pay tapeout fees.

---

how it works

-> deposit
you deposit USDT0 or USDC. you get a receipt token 1:1. it's yours, you can hold it or move it.

-> earn
the vault lends your deposit on Aave on x layer (about 3% a year today). the yield builds up on your receipt.

-> claim
when you claim, the vault asks a tapeout circuit how many credits you get. 1 credit = $1.

-> redeem
you swap credits for BEM and use it to pay tapeout fees.

-> withdraw
you can take your full deposit back anytime, plus any yield you haven't claimed.

---

the rules live in a circuit

this is the important part.

how many credits you get is decided by a circuit taped out on tapeout. the longer you hold and the bigger your position,
the better your rate.

once it's taped out, the circuit can never change. not by me, not by anyone.

anyone can read the netlist and check the rules themselves, for free, without a wallet.

---

why credits instead of just withdrawing the yield?

if you withdraw your yield as cash, evermo keeps a 10% fee.
if you take it as credits, you get part of that fee back as a bonus.

so credits are worth more than cash, but only if you use them on tapeout. no outside money, no subsidies. the bonus comes
from evermo's own fee.

---

an example

you deposit 1,000 USDT0.
at about 3.3% a year, that's about $33 of yield.
as credits, that's about $31-32 of BEM a year, at today's prices about 3 BEM.

that covers a new processor (0.1 BEM) and a few hundred mint transactions (0.01 BEM each).
your 1,000 USDT0 is still there.

---

who is it for

-> tapeout builders who mint, tape out and deploy often and are tired of topping up fees
-> stablecoin holders on x layer who want their yield to go somewhere useful
-> anyone who wants rules they can check, not promises

---

the whole app lives on tapeout too

the deposit, claim, redeem and withdraw screens are hosted on DeWEB in a circuit container, opened through tape://.
you can check the site byte-by-byte against what's on chain.

---

how evermo earns

-> a share of vault yield (10%)
-> a small fee on claims and redemptions
no token sale, no subsidies, nothing that needs outside money to keep running.

---

what we won't do

-> nobody can block your claim. there's no admin switch for that.
-> claimed yield goes to a contract, never a personal wallet.
-> remaining settings sit behind a multisig and a 48-hour timelock.
-> claims and withdrawals can never be paused.

---

the rule is simple:

your deposit stays yours. your yield pays your tapeout fees. the circuit decides, and nobody can change it.

evermo is a proposed idea for tapeout idea scouts. an early prototype exists; the full version isn't deployed yet.

---

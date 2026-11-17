# Ideation run (2026-11-17)

Method borrowed from the open-source `MaxKmet/idea-validation-agents` workflow:
signals → underlying problem (in users' words) → product → proof people pay → score.
Scoring uses its weights (Demand 20, Competition 10, Monetization 20, Distribution 20, Retention 15, Founder fit 15) and
its "killer dimension" rule (any dimension under 25 multiplies the score down). Founder fit is set to a neutral 50 for
all ideas. Scores are judgment calls based on the evidence below, not measurements.

User brief: everyday real-world users; DeFi + AI agents + payments; deep TapeOut integration; follow the hackathon rules
and TapeOut's stated direction (TAPs).

## Signals found

| Signal | Source |
|--------|--------|
| Nigeria leads stablecoin adoption; 59% of crypto-active adults hold USDT | BVNK report via ourcryptotalk / The Block (IMF) |
| Main everyday use: freelancers and remote workers paid by companies abroad; also saving in dollars, paying online subscriptions, daily P2P payments | Technext |
| People want dollars because the local currency loses value and bank access to dollars is limited | allAfrica, BusinessDay |
| Sending $200 to sub-Saharan Africa costs about 9% on average | World Bank figure cited by the IMF |
| Bank accounts blocked for crypto activity; fear and trust are barriers | Wikipedia (Crypto in Nigeria), allAfrica |
| Top DeFi annoyances: gas (27%), security (22%), slow transactions (18%) | 1inch survey of 8,000 users |
| 48% fear their own mistakes as the biggest security risk | Kraken survey |
| OKX Agentic Wallet launched Mar 2026 (auto-payments, delegated tasks); OKX Wallet ~12M monthly users | OKX, OneKey |
| TapeOut TAP-18 defines task offers, deliveries and verdicts but has no escrow ("not deployed") | TapeOutProtocol/TAPs |

## Candidates and scores

| Idea | Demand | Competition | Monetization | Distribution | Retention | Founder | Score | Notes |
|------|--------|-------------|--------------|--------------|-----------|---------|-------|-------|
| **Freelancer escrow invoices + dollar account** | 75 | 55 | 65 | 65 | 75 | 50 | **65** | Top use case in the evidence; every invoice brings in a new client (built-in growth); fits TAP-18 |
| AI money assistant (remittances, bills) | 70 | 45 | 55 | 45 | 70 | 50 | 57 | Recipients still need a local cash-out; strong rivals (LemFi, Chipper) |
| P2P local-currency ↔ stablecoin escrow | 70 | 40 | 60 | 50 | 70 | 50 | 58 | Real daily use, but bank freezes and regulation are serious risks |
| Prediction rounds | 70 | 45 | 70 | 45 | 75 | 50 | 60 | Betting regulation; weaker fit for "everyday real-world users" |
| Dollar savings circle (ajo in USDT0) | 60 | 55 | 40 | 60 | 70 | 50 | 56 | Good group growth loop; weak revenue |
| Wallet safety guardian | 65 | 30 | 25 | 45 | 40 | 50 | 44 | Crowded (ChainGuard, Agent Firewall, Revoke.cash); people rarely pay for security tools |

## Top candidate: Evermo, escrowed invoices and a dollar account for freelancers

**Problem (users' words):** "the client ghosted after I delivered", "Fiverr takes 20%", "Payoneer froze my account", "how do
I get paid in dollars without losing to the exchange rate".

**Product:** a freelancer sends a job link to their own client. The client funds it in USDT0/USDC; the money is held in
escrow on X Layer (earning Aave yield meanwhile). The freelancer delivers; the client approves, or payment releases
automatically after a review window. Paid money lands in the freelancer's Evermo account, where an AI assistant splits it
by the freelancer's rules (save, send to family, keep for spending).

**Why this one:**
- Matches the strongest evidence: getting paid from abroad is the main everyday stablecoin use.
- No cold start: freelancers bring their own clients, and every invoice shows Evermo to a new client.
- Clear revenue: a small fee per paid job, far below marketplace fees.
- Monthly habit: income arrives every month.
- TapeOut: escrow release rules as a circuit; job offers, deliveries and verdicts in the TAP-18 format (filling its
  missing escrow); signed agent actions (TAP-11/13); receipts through TapeSend; job and invoice pages on DeWEB.

**Risks:** dispute handling needs a chosen arbiter; clients must hold stablecoins; local cash-out is outside Evermo.

## Sources

- https://github.com/MaxKmet/idea-validation-agents
- https://technext24.com/fintech/how-nigerians-are-using-stablecoins/
- https://ourcryptotalk.com/news/nigeria-leads-global-stablecoin-adoption-2026
- https://www.theblock.co/post/404862/imf-nigeria-stablecoin-adoption-testing-limits-monetary-regulatory-frameworks
- https://allafrica.com/stories/202601120663.html
- https://businessday.ng/technology/article/stablecoins-gain-ground-in-nigeria-south-africa-as-businesses-seek-fx-hedge/
- https://en.wikipedia.org/wiki/Cryptocurrency_in_Nigeria
- https://blog.1inch.com/1inch-defi-survey
- https://www.theblock.co/news/business/2025-06-16-kraken-survey-finds-48-of-respondents-fear-themselves-as-their-biggest-crypto-security-risk-358337
- https://web3.okx.com/learn/agentic-wallet
- https://github.com/TapeOutProtocol/TAPs

# Verification-Oriented Code Infrastructure for Prediction Markets

**Status:** Non-normative research/scoping note. This is not an adopted Foldlab specification, a formal artifact, a profitability claim, or financial or legal advice.

**Snapshot date:** 2026-08-27.

**Question:** What code infrastructure is most plausibly useful for earning or preserving returns in real-money prediction markets, what data would it require, and which obligations could be discharged by Lean proofs and checked TypeScript boundaries?

## Executive answer

The most promising first return-seeking build is a **depth-aware structural-arbitrage detector and certificate-checked executor**, built on top of a **point-in-time ledger, exact accounting, reconciliation, and bounded-exposure execution core**. The first component searches for payoff combinations whose worst-case proceeds exceed their all-in acquisition cost. The foundation does not create informational alpha, but it prevents false opportunities caused by stale books, omitted fees, invalid event relations, partial fills, and accounting errors.

This ordering is a research judgment, not a return forecast. Published evidence suggests that logical and cross-market mispricing exists, but the executable capacity may be small and the window brief. Rothschild and Pennock found persistent cross-exchange arbitrage and short-lived logical misalignment during high-information periods in 2008 political markets; a recent Polymarket NBA study reports that the single-market opportunities in its sample had a median duration of 3.6 seconds and that 76.9% of its combinatorial opportunities were constrained to an average capacity of 14.8 shares. Those are historical results from particular datasets, not evidence that a new system will make money. ([Rothschild and Pennock 2014](https://journals.sagepub.com/doi/abs/10.3233/AF-140031); [Cheng, Yang, and Zou, arXiv:2605.00864v1](https://arxiv.org/abs/2605.00864))

Formal methods can establish statements such as “for every modeled outcome, this fully filled basket has at least `epsilon` net payoff after the pinned fee function” or “every permitted partial-fill prefix stays within the declared loss budget.” They cannot establish that the market rules mean what the model says, that a venue or oracle will behave as assumed, that a feed is complete, that orders will fill, or that future mispricing will exist. Natural-language settlement equivalence is necessarily an external, human-approved assumption at the model boundary.

## Venue boundary: four distinct access surfaces

Do not treat “Polymarket” as one venue. The international hybrid/on-chain CLOB and the US designated contract market have different legal entities, protocols, settlement mechanisms, and eligibility surfaces.

| Surface | Current official status and interface | Consequence for the design |
|---|---|---|
| **Kalshi** | KalshiEX LLC is a CFTC-designated contract market; the current API documents REST, authenticated WebSockets, fixed-point order fields, client order IDs, fill-or-kill and post-only orders, and sequence-numbered order-book snapshots/deltas. ([CFTC designation](https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/42993); [API welcome](https://docs.kalshi.com/welcome); [create order](https://docs.kalshi.com/api-reference/orders/create-order-v2); [order-book stream](https://docs.kalshi.com/websockets/orderbook-updates)) | Strong candidate for a US-facing connector. The documented `seq` field permits a precise “gap means halt and re-snapshot” invariant. Rules, fees, rate limits, and eligibility remain mutable inputs. |
| **Polymarket US / QCX LLC d/b/a Polymarket US** | QCX LLC was designated as a CFTC contract market on 2025-07-09. Its US documentation exposes retail REST/WebSocket SDKs and a separate direct-trader surface with FIX or REST plus gRPC. Its landing page explicitly links to different international documentation. ([CFTC designation](https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/49571); [US documentation](https://docs.polymarket.us/getting-started/welcome); [direct trader overview](https://docs.polymarket.us/trader-guide/overview); [connection options](https://docs.polymarket.us/trader-guide/connection-options)) | Model and implement it as its own regulated venue. Its documented direct streams are at-least-once, ordered only within a stream, and may include resumable message IDs; consumers must be idempotent and reconcile across streams. ([streaming APIs](https://docs.polymarket.us/trader-guide/streaming-apis)) |
| **ForecastEx through Interactive Brokers** | ForecastEx LLC is a CFTC-designated contract market and derivatives clearing organization. Interactive Brokers documents Web API discovery and trading of ForecastEx event contracts and points clients to each contract's rules and official source. ([CFTC designation](https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/48213); [CFTC announcement](https://www.cftc.gov/PressRoom/PressReleases/8926-24); [IBKR event-contract API](https://www.interactivebrokers.com/campus/ibkr-api-page/event-contracts/)) | A useful additional US venue for resolution-normalized comparisons, but brokerage, clearing, rule, and API semantics must be modeled rather than projected from Kalshi. |
| **Polymarket International** | The international platform documents a hybrid CLOB: users sign orders, an operator matches them off-chain, and settlement occurs through contracts on Polygon. Resolution is documented through UMA's Optimistic Oracle. Its terms distinguish the international platform from Polymarket US, state that it is not CFTC-regulated, and its geographic policy blocks the United States and prohibits circumvention. ([order lifecycle](https://docs.polymarket.com/concepts/order-lifecycle); [resolution](https://docs.polymarket.com/concepts/resolution); [international terms](https://polymarket.com/tos); [geographic restrictions](https://docs.polymarket.com/api-reference/geoblock)) | This is relevant technical and empirical prior art, and potentially a connector only for an independently eligible operator. US-facing infrastructure must not route around the restriction. On-chain fills and oracle events create a second authoritative record that should be reconciled against the CLOB feed. |

Eligibility is a runtime admission condition, not a theorem derived from market data. An operator must obtain jurisdiction-specific legal advice and current venue approval before enabling real-money routing. The CFTC's 2026 advisory also reports enforcement matters involving misuse of nonpublic information and attempts to influence outcomes; a system needs explicit restricted-information and outcome-influence controls even when a trade appears economically valid. ([CFTC Staff Advisory 26-04 and enforcement summary](https://www.cftc.gov/PressRoom/PressReleases/9185-26))

## Ranked build candidates

The ranking weights plausibility of the edge mechanism, availability of auditable data, capital and latency burden, and the proportion of the safety case that can be machine-checked. “Verification fit” means suitability for scoped proofs; it does not mean the strategy's profitability is verifiable.

| Rank | Build | Edge mechanism | Data availability | Capital / latency | Verification fit |
|---:|---|---|---|---|---|
| 0 | Point-in-time ledger, exact accounting, replay, reconciliation, and risk supervisor | No alpha; prevents implementation loss and false backtests | High for live public/API data, uneven for historical depth | Low capital; foundational latency work | Excellent for state, arithmetic, provenance, and exposure invariants |
| 1 | Structural/combinatorial arbitrage certificate executor | Deterministic payoff inequality conditional on valid event relations and fills | Medium-high; books are available, relationship semantics are not machine-given | Low-medium capital; often latency-sensitive and capacity-limited | Excellent for payoff, cost, depth, and prefix-risk claims |
| 2 | Cross-venue resolution-normalized basis/arbitrage | Equivalent payoff claims trade at inconsistent all-in prices | Medium; contract text and books available, atomic cross-venue execution unavailable | Medium-high capital; transfer and fill latency matter | High after a human-approved contract mapping; equivalence itself remains external |
| 3 | Settlement/collateral carry and capital-recycling scanner | Near-certain claims can trade below redemption value because capital remains locked | Medium; settlement timing and dispute histories require collection | High capital; low-medium reaction latency | High for conditional cash-flow arithmetic; low for timing/oracle behavior |
| 4 | Incentive-aware passive market maker | Earn spread and venue incentives while controlling inventory and adverse selection | High live, weaker for public queue and own-order counterfactuals | High capital and demanding latency | High for risk controls; model-conditional only for quote optimality |
| 5 | Official-release reaction engine | Process an authoritative scheduled release before prices fully adjust | High for public sources and schedules; venue timing must be captured locally | Medium capital; extremely latency-sensitive | Medium-high for parsing, clocks, and source pinning; low for durable speed advantage |
| 6 | Calibrated forecasting plus proper-betting allocator | Convert genuine forecast-quality edge into positive expected value after frictions | Broad but point-in-time cleanliness is difficult | Flexible capital; usually lower latency | Medium for scoring/allocation and no-lookahead; forecast accuracy remains empirical |

### 0. Foundation: point-in-time ledger and loss-prevention core

Build this before evaluating an edge. Store raw market/rule/fee documents, market metadata, book snapshots and deltas, trades, private order events, fills, cancels, rejects, balances, settlements, and local receive times in an append-only content-addressed log. Derive canonical views by versioned decoders, and make every backtest state reproducible “as known at decision time.”

This foundation matters empirically. A 2026 study that joined Polymarket's public feed to authoritative on-chain `OrderFilled` events found that feed-inferred trade direction agreed in only about 59% of aggregated buckets, illustrating that a convenient feed can be an insufficient microstructure record. That result is a single preprint study, but it strongly motivates dual-record reconciliation where an authoritative record exists. ([Dubach, arXiv:2604.24366v2](https://arxiv.org/abs/2604.24366))

**Data to gather**

- Exact bytes and retrieval times for market title, resolution criteria, rule revisions, clarifications, settlement authority, source URL, opening/closing/determination times, tick sizes, order types, fee and rebate schedules, rate limits, and eligibility policy.
- Initial book snapshots and every delta, including venue timestamp, sequence/message ID or hash, local wall-clock receive time, monotonic receive time, connector revision, and raw-message digest.
- Public trades plus private order acknowledgements, rejections, partial fills, fills, cancellation requests and confirmations, client order IDs, balances, collateral movements, settlements, redemptions, and rounding adjustments.
- For on-chain systems: transaction hash, block number/hash, log index, chain timestamp, confirmation depth, reorg observations, gas, token transfers, exchange fills, oracle proposal/dispute/resolution events, and redemption.
- Clock-offset and reconnect records, missed-message alarms, periodic independent snapshots, and daily reconciliation against venue statements or chain state.

**Machine-checkable obligations**

- Exact integer/fixed-point representations for price, quantity, fee, and payout; no JavaScript binary floating-point in the accounting boundary.
- A total, pinned implementation of each venue's rounding and fee function, with boundary vectors and differential tests against current venue examples. Kalshi publishes a regulatory fee schedule and documents YES/NO bid representation and settlement netting, while Polymarket International publishes its current fee formula and category schedule; all are mutable inputs. ([Kalshi fee schedule](https://kalshi.com/regulatory/fee-schedule); [Kalshi order book](https://docs.kalshi.com/api-reference/market/get-market-orderbook); [Kalshi settlement](https://docs.kalshi.com/getting_started/market_settlement); [Polymarket International fees](https://docs.polymarket.com/trading/fees))
- An idempotent order-state machine covering acknowledgement, rejection, partial fill, fill, cancel-pending, cancellation, and fill/cancel races. Applying a duplicate event must not duplicate cash or position.
- An accounting conservation theorem relating opening cash, transfers, acquisition cost, fees, realized cash flow, settlement, and closing mark/position under the model.
- Book reconstruction: given a valid snapshot and a contiguous Kalshi `seq` interval, replay yields the modeled current book; any gap forces an execution halt and re-snapshot. Polymarket International's documented market messages expose `timestamp` and `hash`, but no sequence field, so feed completeness cannot be proved from the documented protocol; use hash/staleness checks, periodic REST snapshots, and chain reconciliation instead. ([Kalshi order-book stream](https://docs.kalshi.com/websockets/orderbook-updates); [Polymarket International market channel](https://docs.polymarket.com/api-reference/wss/market); [Polymarket order books](https://docs.polymarket.com/api-reference/market-data/get-order-books-request-body))
- A point-in-time/no-lookahead invariant: every feature value and source revision used at decision time `t` must have `receivedAt <= t`, and the replay must select the version actually available then—not a later revision.

**Residual trust:** venue liveness and honesty, network delivery, clock quality, undocumented feed behavior, chain consensus and finality, rule interpretation, and the correctness of the TypeScript/runtime refinement remain outside a Lean proof unless separately modeled and evidenced.

### 1. Structural and combinatorial arbitrage certificates

Search one venue for complete binary pairs, mutually exclusive outcome families, implication relations, and convertible positions whose depth-weighted acquisition cost is below their minimum modeled payout. An optimizer may be untrusted: it emits a basket plus a machine-checkable certificate. The small checker recomputes all costs and evaluates the payout over every admissible outcome or checks a proved symbolic certificate.

Recent work estimates substantial historical realized structural-arbitrage profit on Polymarket, but those values are author estimates from a v1 preprint. A later executable-arbitrage preprint cautions that payoff-space inequalities are not necessarily protocol-executable and attributes some same-condition anomalies to feed synchronization; it argues for encoding actual conversion, merge, redemption, and collateral-recycling operations. ([Saguillo et al., arXiv:2508.03474v1](https://arxiv.org/abs/2508.03474); [Gebele, Mutzel, and Matthes, arXiv:2608.00666v1](https://arxiv.org/abs/2608.00666))

Polymarket International's official negative-risk adapter is useful executable prior art: it implements conversion among positions in a mutually exclusive outcome family, but its own README highlights invalid all-NO/tie cases. The source must be studied at an exact commit rather than inferred from prose. ([NegRisk adapter at `f78b35b0863b4308a431ca307d06f49b2ea65e78`](https://github.com/Polymarket/neg-risk-ctf-adapter/tree/f78b35b0863b4308a431ca307d06f49b2ea65e78); [operator contract](https://github.com/Polymarket/neg-risk-ctf-adapter/blob/f78b35b0863b4308a431ca307d06f49b2ea65e78/src/NegRiskOperator.sol))

**Additional data**

- A versioned event-relation registry whose entries include the exact contracts, admissible worlds, mutually-exclusive/exhaustive or implication witness, human reviewer, counterexamples considered, and validity interval.
- Depth at every required price level, fee/rebate eligibility, gas and conversion cost, collateral/funding cost, venue position limits, order-size/precision limits, and executable conversion routes.
- Observed end-to-end opportunity duration and capacity, including losing or unfilled attempts—not only successful fills.

**Core proof statements**

Let `World` be the finite set of admissible settlement worlds, `payout basket w` the basket's settlement cash in world `w`, and `allInCost` include acquisition, taker/maker fees under conservative fill classification, gas, funding through a conservative horizon, rounding, and conversion/redemption costs. The certificate checker should establish:

```text
for every w in World,
  payout basket w - allInCost basket fills feeRevision >= epsilon
```

The result is conditional on the modeled worlds, the pinned fee/rule revision, and the stated fill vector. “Buy every outcome for less than one dollar” is not sufficient: exact depth, rounding, fees, and invalid/other outcomes must appear in the judgment.

Execution also needs a stronger prefix property. For every possible acknowledged fill prefix before cancellation or completion:

```text
worstCaseLiquidationLoss(prefix, liveConservativeBook) <= prefixLossBudget
requiredCollateral(prefix) <= availableCollateral
```

This prevents a proof about the final basket from disguising unbounded leg risk. Fill-or-kill is useful where offered, but multi-order and cross-contract atomicity must never be assumed. Kalshi documents FOK and order groups that can cancel orders after a rolling fill limit; Polymarket International documents FOK and fill-and-kill for individual orders. ([Kalshi create order](https://docs.kalshi.com/api-reference/orders/create-order-v2); [Kalshi order groups](https://docs.kalshi.com/getting_started/order_groups); [Polymarket International order lifecycle](https://docs.polymarket.com/concepts/order-lifecycle))

**Residual trust:** the human event relation, venue execution, hidden liquidity, queue state, future fees, and settlement interpretation. A proof over an incorrect “exhaustive outcomes” witness proves the wrong proposition.

### 2. Cross-venue resolution-normalized arbitrage

Construct a registry of candidate equivalent contracts across Kalshi, Polymarket US, ForecastEx, and—only for eligible non-US operators—Polymarket International. Trade a price difference only after comparing payouts, units, time zones, observation windows, data revisions, edge cases, cancellation provisions, settlement sources, dispute processes, and payout timing.

This is the closest modern analogue of the cross-exchange arbitrage reported by Rothschild and Pennock, but same-looking market titles are not evidence of equivalent payoff. ([Rothschild and Pennock 2014](https://journals.sagepub.com/doi/abs/10.3233/AF-140031))

**Additional data**

- Immutable copies of both full contract/rule texts and every clarification, with valid-from times and a structured difference report.
- Settlement source, observation interval, unit and precision, release revision policy, cancellation/void rules, dispute venue, holidays, time zones, payout currency, haircut/rounding, and expected redemption date.
- Both depth curves, fees/rebates, transfer and withdrawal delays, collateral treatment, funding opportunity cost, position limits, tax/account constraints, and venue-specific eligibility.

**Proof boundary**

- Lean can prove payout equality **conditional on** a relation `sameSettlement : ContractA -> ContractB -> Prop` and can prove the all-world net payoff after non-atomic partial-fill prefixes.
- The relationship should be admitted only with a human-signed semantic review of the exact bytes. Natural-language equivalence is not generated or proved by an LLM, embedding similarity, or the theorem prover.
- Execution must reserve full capital on both venues; do not model an unconfirmed transfer as immediately reusable collateral.

**Residual trust:** semantic mapping, eligibility, independent venue solvency/liveness, asynchronous fills, divergent adjudication, capital mobility, and law.

### 3. Settlement carry and capital recycling

Scan claims whose event appears decided but that trade below expected redemption because settlement, dispute, or redemption takes time. Compare the locked claim's conservative net yield to the operator's own funding/opportunity rate, and prefer protocol-supported merge/conversion/redemption paths where available.

A 2026 preprint reports a horizon-dependent discount in Polymarket data and estimates that adjusting for capital lock-up materially reduces its measured gradient. Treat that as an empirical lead to reproduce, not an established pricing law. ([Gebele and Matthes, arXiv:2605.31431v1](https://arxiv.org/abs/2605.31431))

**Additional data:** event-known time, last-trade and executable depth, proposal/dispute/resolution/redemption timestamps, disputed and overturned outcomes, rule revisions, gas and withdrawal costs, the operator's marginal funding curve, and alternative uses of collateral.

**Proof obligations:** exact annualized/simple yield calculations; conservative fee/gas/funding bounds; position and duration limits; and a proof that the optimizer cannot treat “apparently decided” as “settled.” Any terminal payoff or time bound is conditional on a pinned adjudication model. The international platform's documented UMA proposal and challenge process is not instantaneous and must be represented as state, not collapsed into a Boolean result. ([Polymarket International resolution](https://docs.polymarket.com/concepts/resolution))

**Residual trust:** oracle/adjudicator behavior, disputes, legal finality, actual settlement time, counterparty/venue availability, and the funding curve.

### 4. Incentive-aware passive market maker

Quote both sides when expected spread plus a conservative incentive/rebate estimate exceeds adverse-selection, inventory, and settlement risk. This is an operations-heavy system, not “free spread.” Kalshi exposes active and historical incentive-program parameters through its public API; Polymarket International documents maker rebates funded from taker fees; and Polymarket US has filed liquidity-provider and market-incentive programs with the CFTC. All terms can change and must be pinned at order time. ([Kalshi incentives API](https://docs.kalshi.com/api-reference/incentive-programs/get-incentives); [international maker rebates](https://docs.polymarket.com/market-makers/maker-rebates); [Polymarket US liquidity-provider filing, 2026-03](https://www.cftc.gov/sites/default/files/filings/orgrules/26/03/rules03032640254.pdf); [Polymarket US market-incentive filing, 2026-03](https://www.cftc.gov/sites/default/files/filings/orgrules/26/03/rules03052640396.pdf))

**Additional data:** full-depth books, authoritative trade direction where possible, own queue position or an explicitly uncertain queue model, order/fill/cancel latencies, inventory, post-only rejects, fee tier, eligibility and realized rebates, market-to-settlement transitions, and mark-out at multiple horizons.

**Proof obligations:** maximum inventory and cash-at-risk, worst-case terminal loss, post-only enforcement, self-trade prevention, cancel-on-gap, stale-quote deadlines, daily drawdown kill switch, and accounting of rebates only after they become receivable. A stochastic-control model may yield policy optimality under an explicit transition kernel; a 2026 theory preprint derives such quotes under a modeled price process, but the theorem cannot establish that the kernel describes a live venue. ([Feil and Nendel, arXiv:2607.17991v1](https://arxiv.org/abs/2607.17991))

**Residual trust:** fill probabilities, adverse selection, queue priority, other agents, regime change, incentive continuation, and the fitted model.

### 5. Official-release reaction engine

For markets settled by a scheduled public statistic, subscribe directly to the named authority, validate the raw response, and evaluate only contracts whose pinned rules point to that exact release and revision policy. Examples of official data surfaces include BLS schedules and API, BEA's API, SEC EDGAR submissions and XBRL, and NWS/NCEI weather data. ([BLS API](https://www.bls.gov/developers/api_signature_v2.htm); [BLS 2026 schedule](https://www.bls.gov/schedule/2026/); [BEA API guide](https://apps.bea.gov/api/_pdf/bea_web_service_api_user_guide.pdf); [SEC EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces); [NWS API](https://www.weather.gov/documentation/services-web-api); [NCEI CDO](https://www.ncdc.noaa.gov/cdo-web/webservices/v2))

**Additional data:** exact authority bytes, release schedule and embargo metadata, authority timestamp, local receive time, all later revisions/vintages, parser revision, contract rule/source revision, and price/book reaction at high resolution. FRED/ALFRED explicitly supports real-time periods and vintages, making it suitable for revision-aware economic replays; using the latest series value in a historical test would introduce lookahead. ([FRED/ALFRED real-time periods](https://fred.stlouisfed.org/docs/api/fred/realtime_period.html); [FRED API](https://fred.stlouisfed.org/docs/api/fred/fred/))

**Proof obligations:** schema/units/range validation; authority and rule identity; point-in-time selection; monotonic clock checks; duplicate/revision handling; and a fail-closed parser. The executor should require an exact rule-source match and conservative price/depth certificate, not trade on a headline string.

**Residual trust:** public-source availability and authenticity, network distance, embargo compliance, venue latency, parser-to-natural-language correspondence, and competing systems. This edge may disappear once infrastructure is common.

### 6. Calibrated forecasts and a proper-betting allocator

Build probability forecasts from strictly point-in-time data, measure calibration and proper scores out of sample, and trade only when the forecast/market gap clears a conservative no-trade region for spread, fees, estimation error, and fill risk. Proper scoring rules reward honest probabilistic forecasts in expectation under their assumptions; this is a measurement and allocation framework, not evidence that a model has forecast skill. ([Gneiting and Raftery 2007](https://sites.stat.washington.edu/people/raftery/Research/PDF/Gneiting2007jasa.pdf))

A July 2026 preprint provides a formal “proper betting” decomposition and reports a 26-day, $200 live experiment with 236 orders across 129 markets and an 80.33% return. That small, short, unreplicated author-reported result is only a lead for replication and power analysis; it must not be used as an expected-return estimate. ([Gu et al., arXiv:2607.06166v2](https://arxiv.org/abs/2607.06166v2))

Market price is also not unconditionally equal to a probability. Wolfers and Zitzewitz derive conditions under which prediction-market prices approximate average beliefs, while Manski shows that observed prices need not identify beliefs without assumptions about preferences and equilibrium. ([Wolfers and Zitzewitz 2006](https://www.nber.org/papers/w12200.pdf); [Manski 2004](https://www.nber.org/papers/w10359))

**Additional data:** every feature with event time and receive time; historical vintages; exact market/rule version; pre-decision book; decisions including abstentions; orders, rejects and fills; outcomes and disputes; model, code, prompt, training-corpus and source identities; and time-ordered train/validation/test partitions.

**Proof obligations:** probabilities are normalized and bounded; score implementation matches the declared formula; all features were available at decision time; training cannot read test/outcome partitions; sizing respects budget, max loss and concentration; and the no-trade rule includes spread/fees. Empirical gates must then establish calibration, discrimination, uncertainty intervals, sensitivity to fees and latency, and performance on untouched forward periods.

**Residual trust:** data-generating stability, representativeness, model generalization, outcome labels, settlement semantics, and execution. No theorem turns a historically calibrated predictor into future alpha.

## Proposed formal and runtime seam

Use Lean for a compact mathematical kernel and TypeScript for I/O, orchestration, and live supervision. The seam should be explicit enough that an untrusted optimizer or forecast service can only cause an order after a small checker validates a serialized certificate.

### Lean-side model

Suggested carriers, pending a separate domain-contract and grilling pass:

```text
MarketContract := ruleRevision + admissibleWorlds + payout
FeeSchedule    := feeRevision + exact fixed-point fee function
Book           := venueRevision + snapshotIdentity + depth
Fill           := orderIdentity + side + price + quantity + fee + eventIdentity
Portfolio      := cash + collateral + positions
ExecutionPrefix := ordered list of acknowledged order events
```

Candidate theorems:

1. **All-outcome net payoff:** every admitted world yields at least the certified `epsilon` after exact pinned fees, gas, funding, conversion cost, and rounding.
2. **Depth consumption:** consuming a certified quantity from a snapshot yields exactly the modeled volume-weighted cost and never consumes absent liquidity.
3. **Execution-prefix loss:** every admissible partial-fill/fill-cancel prefix respects cash, collateral, position, and worst-case liquidation-loss limits.
4. **Event-family payoff:** complete-set or negative-risk identities hold only from explicit mutually-exclusive/exhaustive witnesses and include invalid/tie worlds.
5. **Order-event idempotence and conservation:** replaying accepted event identities once yields the same portfolio as the accounting equations; duplicates do not change it.
6. **Sequence-gated reconstruction:** a contiguous sequenced delta trace refines the snapshot model; any missing sequence makes the book inadmissible for execution.
7. **Point-in-time admissibility:** every decision dependency's receive time and active revision precede the decision.
8. **Rule/fee invalidation:** a certificate is rejected when its market, rule, fee, tick, settlement, or connector identity differs from the live pinned identity.

The optimizer, relationship classifier, forecast model, LLM, and UI need contribute no proof trust. Their outputs are proposals checked against the frozen kernel.

### TypeScript-side obligations

- Decode raw venue messages into checked schemas; retain undecoded bytes and reject unknown variants.
- Use branded fixed-point integer types, total constructors, and explicit rounding modes.
- Persist before acting, apply message IDs idempotently, and reconcile private order state against the venue after reconnect.
- Halt new orders on sequence gaps, stale data, excessive clock skew, fee/rule revision mismatch, unexplained balance difference, rate-limit uncertainty, or supervisor heartbeat loss.
- Re-snapshot and rebuild rather than patch across an unaccounted gap. For at-least-once Polymarket US streams, deduplicate message IDs and reconcile unordered cross-stream state as the official guidance requires. ([Polymarket US streaming APIs](https://docs.polymarket.us/trader-guide/streaming-apis))
- Make order intent idempotent with venue-supported client IDs, record the returned venue identity, and model timeouts as “unknown” until reconciled—not as rejection.
- Enforce operator-set daily, per-market, per-family, per-venue, and partial-fill-prefix loss limits independently of the strategy process.

### Assurance ladder before any scoped “verified” claim

This note itself satisfies no Foldlab claim gate. A later implementation would need fresh evidence at each layer:

- **Source boundary:** accept exact API schemas, rule/fee documents, contract source, compiler/runtime, and authority inputs into the Source Lock. Mutable pages cited below are currently **Pending Source**.
- **Lean kernel:** compile the frozen declarations and proofs; inspect axioms; identify every external assumption. This can support only theorem-level statements about the model.
- **Contract traceability:** review counterexamples and show that each theorem matches the economic and execution requirement.
- **Codec/refinement:** show that admitted raw messages and fixed-point computations refine the Lean-side carriers. A generated/extracted checker needs its own correspondence evidence.
- **Venue conformance:** run boundary vectors, sandbox/certification tests where offered, captured-message replay, fault injection, and daily live reconciliation.
- **Runtime:** pin the TypeScript compiler/options, emitted JavaScript, Node engine, dependencies, host architecture, deployment digest, configuration, and observed execution. Hosted evidence does not prove future exchange behavior.

Acceptable claims are narrow—for example, “checker revision `H` proves the stated payoff inequality for certificate `C` under fee revision `F` and world model `W`.” The bare phrases “verified strategy,” “verified bot,” and “guaranteed arbitrage” would overstate the evidence.

## Evaluation plan

1. Capture six to twelve months of forward, losslessly versioned books and private execution telemetry before making broad return claims. Public historical trades alone cannot reproduce queue, depth, rejects, or stale-feed failures.
2. Run a shadow executor that produces certificates and hypothetical orders without routing them. Measure opportunity duration, depth, full-basket and partial-prefix economics, feed gaps, rule changes, and signal-to-acknowledgement latency.
3. Replay with point-in-time fees and rules, conservative queue/fill models, funding and withdrawal delays, and alternative settlement/dispute scenarios. Report capacity-weighted dollars, not only percentage return or opportunity count.
4. Use time-ordered, untouched forward evaluation. Publish all attempts, including unfilled and loss-making prefixes, and separate gross pricing edge from fees, slippage, funding, incentives, and operational loss.
5. If the operator is legally eligible and venue-approved, start with a hard-capped amount whose complete loss is acceptable. Compare live receipts to shadow predictions before increasing limits.

Success should be judged along two independent axes:

- **Alpha evidence:** forward, capacity-weighted net return after all costs, uncertainty, and meaningful baselines.
- **Implementation-loss prevention:** zero unexplained accounting differences, bounded prefix exposure, detected feed gaps, no stale-rule/fee executions, and successful recovery/reconciliation drills.

A system may be excellent on the second axis and have no alpha. That is still valuable engineering evidence, but it is not a trading-return claim.

## Provenance and source status

Under Foldlab's provenance rules, a live URL and retrieval date do not establish exact bytes. The following identities are sufficiently specific for research citation but have **not** been accepted into the Foldlab Source Lock by this note.

| Source class | Identity used here | Foldlab status |
|---|---|---|
| Peer-reviewed paper | Rothschild & Pennock, 2014, DOI `10.3233/AF-140031` | Stable bibliographic identity; exact article bytes/digest unresolved |
| Peer-reviewed paper | Gneiting & Raftery, 2007; DOI `10.1198/016214506000001437` | Stable bibliographic identity; exact article bytes/digest unresolved |
| Working papers | NBER `w12200` and `w10359` | Stable report identifiers; exact bytes/digests unresolved |
| Preprints | `arXiv:2508.03474v1`, `2604.24366v2`, `2605.00864v1`, `2605.31431v1`, `2607.06166v2`, `2607.17991v1`, `2608.00666v1` | Version-resolved bibliographic identities; exact bytes/digests unresolved; findings are preprint evidence only |
| Polymarket International adapter | Git commit `f78b35b0863b4308a431ca307d06f49b2ea65e78` | Revision-resolved upstream source; archive/digest not admitted |
| Polymarket International CTF exchange | Git commit `ccc0596074f4dfd62c944fbca4de252893b82b4b` in [`Polymarket/ctf-exchange`](https://github.com/Polymarket/ctf-exchange/tree/ccc0596074f4dfd62c944fbca4de252893b82b4b) | Revision-resolved upstream source; archive/digest not admitted |
| Polymarket US TypeScript SDK | Git commit `d547a93dd3712f2fc63c4e8624534ce47bd1b502` in [`Polymarket/polymarket-us-typescript`](https://github.com/Polymarket/polymarket-us-typescript/tree/d547a93dd3712f2fc63c4e8624534ce47bd1b502) | Revision-resolved upstream source; archive/digest not admitted |
| CFTC designation pages, advisories, and dated filings | Authority and dated document named in the links above | Dated authority; exact bytes/digests unresolved |
| Venue API, help, rule, fee, terms, geographic and incentive pages | Live official pages retrieved 2026-08-27 | **Pending Source**: mutable web documents; exact revision/bytes unresolved |
| Government and official-data API documentation | Live official pages retrieved 2026-08-27 | **Pending Source**: mutable web documents; exact revision/bytes unresolved |

Before any of these inputs supports gated code or a live certificate, capture the exact artifact, compute its canonical digest, record authority and retrieval receipt, and link the strategy configuration to that admitted identity. A newly retrieved page that “looks the same” is not the same pinned source.

## Bottom line

Build the ledger/risk core and the structural-arbitrage certificate executor first. They combine the clearest payoff logic with the largest machine-checkable surface and produce useful evidence even if the market offers no durable edge. Treat cross-venue equivalence, settlement carry, market making, release latency, and predictive modeling as later empirical programs with progressively larger semantic, capital, latency, and generalization boundaries. No proof should be represented as proof of profitability; the right claim is always conditional on exact contracts, exact source revisions, exact costs, exact fills, and an explicit model of admissible settlement worlds.

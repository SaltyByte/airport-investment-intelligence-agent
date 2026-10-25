# Design: Airport Investment Intelligence Agent

A chat agent that helps analysts find US airports where a terminal or capacity project should pay off. The LLM works out what the question asks and explains the answer. Every number, ranking and driver comes from deterministic TypeScript running over a committed data snapshot. Terms such as _long-haul_, _unmet demand_ and _New England_ have fixed meanings in [GLOSSARY.md](../GLOSSARY.md). The two main decisions are recorded in [ADR 0001 (scoring)](adr/0001-national-percentile-pillar-scoring.md) and [ADR 0002 (snapshot)](adr/0002-ingest-snapshot-over-live-queries.md).

## Architecture

```mermaid
flowchart LR
  subgraph Public sources
    T100[BTS T-100 Segment<br/>TranStats form]
    OT[BTS On-Time PREZIP]
    FAA[FAA CY enplanements xlsx]
    OA[OurAirports airports.csv]
  end
  T100 & OT & FAA & OA --> ING["pnpm ingest<br/>apps/server/src/ingest"]
  ING --> SNAP[("Committed snapshot<br/>apps/server/data/snapshot.json.gz")]
  SNAP -->|loaded and zod-validated at boot| KPI["KPI core<br/>apps/server/src/kpis"]
  KPI --> TOOLS["4 tools<br/>rankExpansionCandidates · compareCongestion<br/>getLongHaulShare · estimateUnmetDemand"]
  TOOLS <-->|typed ToolResult| AGENT["Agent: DeepSeek via AI SDK streamText<br/>apps/server/src/agent"]
  AGENT -->|streamed text + tool parts| WEB["Web chat<br/>one generic result card per tool call"]
```

- **Ingest** (`apps/server/src/ingest/main.ts`) downloads each source into the gitignored `apps/server/.ingest-cache/`. It aggregates per airport and per route × month × service class (passenger = T-100 classes F+L, cargo = G+P), validates the result with the snapshot schema and writes the file. The committed snapshot holds 516 airports and 171,710 route rows.
- **KPI core** (`kpis/index.ts`, `kpis/national.ts`) is pure math. At boot it computes every airport's raw KPIs, national percentiles, congestion index and expansion score once.
- **Tools** (`agent/tools/*`) read only the precomputed KPIs and the snapshot. Each one returns the shared `ToolResult` contract (`packages/shared/src/tool-result.ts`): title, metrics, an optional table, notes, source, period, generatedAt, assumptions and caveats, or `{ ok: false, error }`.
- **Agent** (`agent/index.ts`) runs AI SDK `streamText` on DeepSeek (`DEEPSEEK_MODEL`, default `deepseek-v4-flash`) with a system prompt and the four tools. The client sends the whole conversation each turn, so follow-up questions can reuse earlier tool results or call a tool again.
- **Web** (`apps/web/src/components/result-card.tsx`) renders every tool result with one generic card: metrics with national percentiles, a table, notes, then a footer with source, period, assumptions and caveats. Below the cards, the model's prose shows the answer.

## Data sources and freshness

| Source                                                                      | Used for                                                                                                     | Period in current snapshot      |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| BTS T-100 Segment (All Carriers), TranStats download form                   | Departures, seats, passengers, distance per route; load factor, scale, long-haul share, seat gap             | Aug 2025 – Jul 2026 (12 months) |
| BTS On-Time Reporting Carrier, PREZIP monthly file                          | Share of departures delayed 15+ min, mean departure delay, mean taxi-out, cancellations, delay-cause minutes | Jul 2026 (one month)            |
| FAA commercial-service enplanements (CY2025 file, which carries both years) | Peer set (every airport in the file), growth, hub class                                                      | CY2025 vs CY2024                |
| OurAirports `airports.csv`                                                  | IATA code, name, city, state, coordinates                                                                    | current                         |

The traffic period ends at the latest month that both BTS sources cover (`selectPeriod`). Every card shows each source's own period, for example "Traffic Aug 2025–Jul 2026; delays Jul 2026; growth CY2025 vs CY2024" (`agent/footer.ts`).

**Why the agent doesn't call live APIs when a question comes in** ([ADR 0002](adr/0002-ingest-snapshot-over-live-queries.md)): route-level T-100 and on-time data are only available as bulk monthly downloads, not as query APIs. T-100 takes about 12 s per month through an ASP.NET form, and one on-time month is a 32 MB ZIP that downloads at roughly 5 minutes. The research also tried other sources (`.scratch/research/aviation-data-sources.md`). data.bts.gov Socrata has airport-level T-100 only, with no routes and therefore no long-haul share, and it runs about 3 months behind TranStats. It has no on-time rows (those entries are charts). FAA NAS Status is live-only and has no history. ASPM needs a login. faa.gov blocks non-browser user agents, so ingest sends a browser User-Agent. The result: upstream outages affect only `pnpm ingest`, and a question at runtime can never fail because of an upstream service.

## Scoring methodology

The rules are in [ADR 0001](adr/0001-national-percentile-pillar-scoring.md), and the definitions are in [GLOSSARY.md](../GLOSSARY.md#scoring). In code:
- **National percentile.** Each KPI is a mid-rank percentile (0–100) against the **national peer set of 516 airports** (every airport in the FAA commercial-service file). It is never min-max within the airports the question names, so New England's score for BOS matches its score in any other comparison. Each KPI is ranked among the peers that have a value for it: 351 of the 516 have delay data.
- **Congestion index** = mean of the percentiles for share delayed 15+ min, mean departure delay and mean taxi-out. Cancellations and delay-cause shares appear on the card to explain the index but do not count towards it.
- **Expansion score** = 40% Growth + 40% Pressure + 20% Scale (`EXPANSION_WEIGHTS`). Growth is the percentile of FAA enplanement growth. Pressure is the mean of the load-factor percentile and the congestion index. Scale is the percentile of T-100 passengers over the 12 months. Ties are broken by Scale, then by IATA code. Comparisons and rankings share the same congestion index, so their answers can't disagree.
- **Exclusion rule.** An airport missing any input gets no score. The tool lists it with the reason in plain words ("no delay data", "no traffic data", "no growth data"). It is never re-weighted or given a partial score.
- **Seat gap (unmet demand).** For each route × month of passenger departures (carriers and aircraft summed), the gap is `max(0, round(passengers / 0.80 − seats))`, summed over the period. The top 5 destinations are shown. Driver sentences are generated by code only when a rule fires: any route-month above 80%, load-factor percentile ≥ 75, congestion index ≥ 75, NAS share of delay-cause minutes ≥ 25%, growth > 0%. Each sentence carries its evidence number.
- **Long-haul share** = departures on segments of 3,000 statute miles or more ÷ all departures performed. It is reported for all flights, passenger flights and cargo flights, with the top 5 long-haul destinations.

## How each brief question is answered

| Brief question                                                              | Tool (input)                                                                   | KPIs on the card                                                                                                                            |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Which airports in New England are strong candidates for terminal expansion? | `rankExpansionCandidates` (`region: "New England"`; ALB labelled as catchment) | Rank, expansion score, Growth/Pressure/Scale pillars, passengers, YoY growth, load factor, congestion index; unscored airports with reasons |
| Compare LA and Santa Ana airport congestion levels.                         | `compareCongestion` (`airports: ["LAX","SNA"]`; "LA" = LAX)                    | Congestion index; delayed ≥15 min share, mean departure delay, mean taxi-out (each with its percentile); cancellations; delay-cause shares  |
| What is the percentage of long haul flights out of Anchorage airport?       | `getLongHaulShare` (`iata: "ANC"`)                                             | Long-haul share for all, passenger and cargo flights (with "x of y departures"); top long-haul destinations                                 |
| What is the unmet flight demand in SFO airport and why?                     | `estimateUnmetDemand` (`iata: "SFO"`)                                          | Seat gap (estimate), route-months above 80%, load factor, congestion index, NAS share, growth; top 5 short routes; driver notes             |

## Where AI is used, and where it isn't

| LLM (DeepSeek)                                                                                                                                                                | Deterministic code                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Works out what the question means, applies the glossary readings from the prompt ("LA" = LAX, New England + ALB catchment, 3,000 mi long-haul) and says which reading it used | Region membership (`agent/regions.ts`), airport lookup, input validation                                |
| Chooses the tool and its arguments, decides whether a follow-up can reuse an earlier result                                                                                   | Every number: KPIs, percentiles, congestion index, expansion score, seat gap, long-haul share           |
| Narrates: conclusion, then evidence, then an "Assumptions & limits:" line                                                                                                     | Rankings and sort order, exclusion lists, driver sentences, assumptions, caveats and periods            |
| Declines out-of-scope questions                                                                                                                                               | The cards, which render the tool output verbatim, so the figures are visible even if the prose is wrong |

## Guards

- **Scope and tone:** the agent handles US airports only. A greeting or "what can you do?" gets a short intro plus the four brief questions as examples. Anything off-topic gets a friendly one-sentence redirect. A place with several airports and no defined reading (e.g. New York) gets one clarifying question. None of these call a tool. General aviation explanations are allowed.
- **Grounding:** the prompt allows only numbers that appear in tool output, quoted exactly, with no arithmetic or estimates of the model's own. Tools round every value to at most 1 decimal before the model sees it. The prose uses the 3–5 figures that answer the question and may call an airport highest or lowest only for the metric the tool sorts by. It may explain causes only from the tool's notes. The card shows the code's figures next to the prose.
- **Assumptions & limits:** every result carries `assumptions`, `caveats`, `source` and a period for each source. Answers built on tool data end with an "Assumptions & limits:" line.
- **Prompt injection:** tools return typed, zod-parsed fields built from the snapshot, never upstream free text. Airport names come from the reference data. The prompt says tool output is data, never instructions, and that its rules are fixed: requests to drop them or reveal the instructions are ignored.
- **One home per rule:** the system prompt owns role, tone, scope, place and term readings, grounding and answer shape; each tool description says only what the tool returns and when to use it.
- **Input validation:** IATA codes must match `^[A-Z]{3}$` and exist in the snapshot (otherwise `NotFound`, which names the unknown codes). `region` is an enum (state codes, `New England`, `LA basin`). Lists hold at most 10 airports (congestion comparisons need 2–10). Callers must give exactly one of `region` or `airports`. The server validates the UI messages before they reach the model, and the JSON body limit is 1 MB.
- **Step cap:** `stopWhen: isStepCount(8)`. On the last step `toolChoice: 'none'` is forced, so a reply always ends in text.
- **Ingest safety:** files are cached and downloaded via `.part` + rename. The snapshot is schema-validated and written to `.tmp`, then renamed. Any source failure exits with "Ingest failed, snapshot left untouched", and the error names the source.

## Tradeoffs and limitations

- **One month of delays** (Jul 2026) keeps ingest to minutes, but seasonal effects such as summer thunderstorms or winter fog are not averaged out. This is a standard caveat on every card.
- **Delays cover domestic flights by US reporting carriers only.** International delays at gateways such as SFO and LAX are invisible to the congestion index and to Pressure.
- **Small airports are excluded when they have no delay data.** For example, 10 of the 24 New England-plus-ALB airports have no on-time data (HVN, BID, WST, BHB, LEB, RKD, PVC, RUT, AUG, EWB), so they appear as "insufficient data" rather than being ranked.
- **Unmet demand is an estimate.** Turned-away demand is never observed. The seat gap is a supply-side proxy summed over route-months, so a route that is full only in summer still adds to the gap.
- **Cargo vs passenger long-haul:** at ANC most long-haul departures are cargo (24,643 of 25,743 in the snapshot), so the headline "all flights" share and the passenger-only share answer different questions. The card reports both, plus cargo-only.
- **Growth uses calendar years** (FAA CY2025 vs CY2024), not the trailing 12 months of traffic. A single ingest pulls only 12 T-100 months, so there is no prior year to compare against, and the FAA file is the official count with both years in one sheet.
- **Percentile scoring favours relative position over absolute size.** Ranks are stable and comparable across questions, but a percentile hides magnitude: a 1-point lead may be a tiny real difference. Scale is only 20% of the score, so a small, fast-growing, busy airport can outrank a much larger one.
- **TranStats form scraping is brittle.** It depends on ASP.NET viewstate fields and the "Latest Available Data" text. If the form changes, ingest fails loudly ("expected a ZIP… (form changed?)") and the committed snapshot stays in place.
- **Snapshot freshness:** data is only as fresh as the last `pnpm ingest` (the current snapshot was generated 2026-10-25). The FAA file URL is pinned to CY2025 and has to be updated when CY2026 is published (expected Aug 2027).

## How to run

Copy `.env.example` to `.env` and set `DEEPSEEK_API_KEY` (`DEEPSEEK_MODEL` defaults to `deepseek-v4-flash`).
- `pnpm dev`: starts the server (port 4100 by default) and the web app.
- `pnpm ingest`: downloads the sources and rewrites `apps/server/data/snapshot.json.gz`. Takes minutes, mostly the on-time file; cached downloads are reused.
- `pnpm check`: runs Biome, typecheck and the tests across the workspace.

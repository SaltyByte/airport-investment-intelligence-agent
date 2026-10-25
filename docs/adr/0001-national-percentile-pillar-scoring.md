# Score airports by national percentile across three weighted pillars

Terminal-expansion candidates are ranked by a deterministic 0–100 score computed in code, never by the LLM: Growth 40 (FAA enplanement growth, last calendar year vs the one before), Pressure 40 (mean of the load-factor percentile and the congestion index) and Scale 20 (passengers over the latest 12 months). Every KPI is a percentile against the national peer set of all US commercial-service airports, not min-max within the airports a question names, because regional sets are small (New England has about a dozen airports) and min-max would pin the extremes to 0 and 100 and reshuffle scores whenever the set changes. Airports missing any KPI (usually no delay data because no US reporting carrier serves them) are listed as insufficient data rather than scored on partial KPIs, so every score is comparable.

## Considered Options

- Min-max within the asked set: simplest, unstable for small sets.
- Fixed absolute thresholds (e.g. load factor above 85% = full marks): hand-tuned cut points with no defensible source.
- Partial scoring with re-weighting: ranks more airports, but scores stop being comparable.

## Consequences

- The congestion index (mean percentile of the share of departures delayed 15+ minutes, mean departure delay and mean taxi-out) is shared by congestion comparisons and the Pressure pillar, so the two answers cannot disagree.
- Delay data covers domestic flights by US reporting carriers only; international delays at gateways like SFO and LAX are invisible to Pressure and are stated as a caveat.

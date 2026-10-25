# Answer from an ingested snapshot; one live API tool for trends only

The public sources that hold route traffic and delays (BTS T-100 segment data and BTS on-time per-flight files) are bulk monthly downloads, not query APIs: T-100 takes about 12 s per month and on-time about 5 minutes per month, and a data period with year-over-year growth needs 24 and 12 months of them. So a manual ingest command downloads BTS, FAA enplanement and OurAirports data and writes a small aggregated JSON snapshot that is committed to git; the agent's scoring tools read only the snapshot, aligned to the latest 12 months both BTS sources cover. One tool calls a live public API (data.bts.gov monthly airport totals) at question time for month-by-month trends; it is display-only and never feeds scores, because its data lags the snapshot and would break period alignment.

## Considered Options

- Fetch at question time with a disk cache: minutes to an hour per cold question; on-time data is not viable at request time.
- Gitignored SQLite snapshot: every fresh checkout would need the hour-long ingest before the app answers anything.

## Consequences

- Upstream rate limits and outages affect the ingest command and the live trend tool only; the scoring tools cannot fail upstream.
- Data is as fresh as the last ingest run; every card shows the data period and snapshot generation date.

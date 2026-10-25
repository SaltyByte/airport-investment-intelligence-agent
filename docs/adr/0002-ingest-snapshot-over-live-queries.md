# Answer from an ingested snapshot, not live queries

The public sources that hold route traffic and delays (BTS T-100 segment data and BTS on-time per-flight files) are bulk monthly downloads, not query APIs: T-100 takes about 12 s per month and on-time about 5 minutes per month. So a manual ingest command downloads BTS, FAA enplanement and OurAirports data and writes a small aggregated JSON snapshot that is committed to git; the agent's tools read only the snapshot. To keep the ingest to minutes, it takes 12 months of T-100 route data, one month of on-time data (the latest month both BTS sources cover) and passenger growth from the FAA's calendar-year enplanement counts, and every answer states each source's own period.

## Considered Options

- Fetch at question time with a disk cache: minutes to an hour per cold question; on-time data is not viable at request time.
- Twelve months of on-time data: a full-year congestion picture, but about an hour of downloads per ingest.
- A live data.bts.gov trend tool at question time: dropped for build time; its data also lags the snapshot.

## Consequences

- Upstream rate limits and outages affect only the ingest command; the tools cannot fail upstream.
- Congestion reflects one month, so seasonal effects (summer thunderstorms, winter fog) are a stated caveat.
- Data is as fresh as the last ingest run.

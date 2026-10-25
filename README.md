# Airport Investment Intelligence Agent

A chat agent that helps analysts find US airports where terminal or capacity projects should pay off. It answers questions such as:
- Which airports in New England are strong candidates for terminal expansion?
- Compare LA and Santa Ana airport congestion levels.
- What is the percentage of long haul flights out of Anchorage airport?
- What is the unmet flight demand in SFO airport and why?

The LLM (DeepSeek) interprets the question and writes the answer. Every number, score and ranking comes from deterministic TypeScript running over public BTS, FAA and OurAirports data, and is shown on a card next to the answer with its assumptions, caveats and data period.

## Docs

- [Design and architecture](docs/design.md): scoring methodology, key tradeoffs, where AI is used, guards.
- [Glossary](GLOSSARY.md): fixed meanings of terms such as _long-haul_, _unmet demand_ and _New England_.
- ADRs: [0001 national-percentile scoring](docs/adr/0001-national-percentile-pillar-scoring.md), [0002 ingest snapshot over live queries](docs/adr/0002-ingest-snapshot-over-live-queries.md).
- [Assignment brief](docs/assignment.md).

## Run it

Requires Node 24+ and pnpm 11.

```sh
pnpm install
cp .env.example .env   # set DEEPSEEK_API_KEY
pnpm dev               # server on :4100, web app on http://localhost:5173
```

- `pnpm check`: Biome, typecheck and tests across the workspace.
- `pnpm ingest`: re-downloads the public sources and rewrites `apps/server/data/snapshot.json.gz` (takes minutes). Not needed to run the app: the snapshot is committed.

## Layout

| Path              | What                                                                     |
| ----------------- | ------------------------------------------------------------------------ |
| `apps/server`     | Express API, ingest, KPI and scoring core, agent tools and system prompt |
| `apps/web`        | React chat UI (result cards, follow-up chips, voice dictation)           |
| `packages/shared` | zod contracts shared by server and web (tool inputs and results)         |

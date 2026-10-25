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

You need Node 24+, pnpm and a DeepSeek API key ([get one here](https://platform.deepseek.com/api_keys); the account needs a positive balance). There is no database and nothing to download: the airport data is committed as `apps/server/data/snapshot.json.gz` and loaded into memory at startup.

### Local

```sh
npm install -g pnpm    # pnpm 10+ switches itself to the pinned 11.3.0
pnpm install
cp .env.example .env   # paste your key after DEEPSEEK_API_KEY=
pnpm dev
```

Open http://localhost:5173. The API server runs on :4100 and the web app proxies `/api` to it.

### Docker

One container serves the API and the built web app:

```sh
docker build -t airport-agent .
docker run --rm -p 8080:8080 -e DEEPSEEK_API_KEY=<your key> airport-agent
```

Open http://localhost:8080. Pass only `DEEPSEEK_API_KEY` (and optionally `DEEPSEEK_MODEL`): the container listens on 8080, and a copied `SERVER_PORT=4100` would move it off the published port.

### Troubleshooting

| Symptom | Fix |
| --- | --- |
| Server exits with `Invalid environment: DEEPSEEK_API_KEY is required` | `.env` must sit in the repo root (next to `.env.example`) and hold the key. |
| `server failed to start: listen EADDRINUSE` | Port 4100 is taken: set `SERVER_PORT` in `.env` to a free port. The web proxy follows it. |
| Vite reports port 5173 is in use | Free port 5173; the web app does not fall back to another port. |
| The page loads but answers fail | Check the key and the DeepSeek account balance. |

### Other commands

- `pnpm check`: Biome, typecheck and tests across the workspace. Needs no API key.
- `pnpm eval`: sends the four brief questions to the live model and checks tool routing and that every number in the answers is grounded in tool output. Uses the API key.
- `pnpm ingest`: re-downloads the newest published public sources and rewrites `apps/server/data/snapshot.json.gz` (takes minutes). Not needed to run the app: the snapshot is committed. Once its traffic period ends more than 6 months ago, answers and the server log say so.

## Layout

| Path              | What                                                                     |
| ----------------- | ------------------------------------------------------------------------ |
| `apps/server`     | Express API, ingest, KPI and scoring core, agent tools and system prompt |
| `apps/web`        | React chat UI (result cards, follow-up chips, voice dictation)           |
| `packages/shared` | zod contracts shared by server and web (tool inputs and results)         |

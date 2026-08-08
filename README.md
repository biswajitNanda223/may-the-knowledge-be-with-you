# May the Knowledge Be With You

Production-oriented enterprise ontology experience: React + TypeScript, Fastify + TypeScript, Google ADK/Gemini, Neo4j, SSE answer evidence, and cursor-paginated Cytoscape explorer.

## What works

- Page 1: streaming chat with exact Neo4j evidence subgraph.
- Page 2: search, keyset pagination and click-to-expand graph exploration.
- Page 3: production architecture and guardrails.
- Repeatable Excel → normalized Neo4j importer for all six `ontology1.xlsx` sheets.
- Strategy-pattern agent (`adk`/`mock`) and factory-composed Fastify routes.
- Docker images for API/web plus local Neo4j.

## Quick start

Requirements: Node 22+, npm 10+, Docker.

```bash
npm install
npm run env:run -- docker compose up -d neo4j
npm run seed
npm run dev
```

Open `http://localhost:5173`. Local Neo4j Browser: `http://localhost:7474`. Default Docker password is development-only and matches `.env.example` after changing its placeholder.

Full stack in containers:

```bash
npm run docker:up
```

Open `http://localhost:8080`. Compose defaults to mock agent. Set a rotated `GOOGLE_GENAI_API_KEY` and `AGENT_STRATEGY=adk` to use Gemini.

## Source priority

`data/raw/ontology1.xlsx` is authoritative first structured source. `Enterprise_Knowledge_Model.txt` is retained as future upstream knowledge source. Both must normalize into same stable Neo4j model; TXT must never invent a parallel schema.

## Secrets and dotenvx

Repository includes a real dotenvx-encrypted `.env`. Decryption key lives only in
`.env.keys`, which is ignored. Never commit plaintext keys or `.env.keys`. Safe
team rotation flow:

```bash
npx dotenvx set GOOGLE_GENAI_API_KEY "replacement-key"
git add .env
```

Commit only encrypted values; store `DOTENV_PRIVATE_KEY` in CI/cloud secret manager.
Team members need that private key to run encrypted configuration. Key posted in
project request is compromised and must be revoked/rotated before use.

## Neo4j Aura Free

Create AuraDB Free, download credentials once, then set `NEO4J_URI=neo4j+s://...`, username, password and database in local encrypted env. Run `npm run seed`. Free tier is suitable for demo; see [production plan](docs/PRODUCTION.md) before industrial deployment.

## Repository map

```text
apps/api/        Fastify, ADK strategy, Neo4j retrieval/import
apps/web/        React pages and shared Cytoscape renderer
data/raw/        versioned source inputs
docs/HLD.md      boundaries and end-to-end flow
docs/LLD.md      APIs, classes, data model, failure behavior
docs/PRODUCTION.md security, scaling, observability, rollout
```

## Documentation

- [HLD](docs/HLD.md)
- [LLD](docs/LLD.md)
- [Production readiness](docs/PRODUCTION.md)
- [Pagination decision](docs/ADR-001-pagination.md)

# May the Knowledge Be With You

Production-oriented enterprise ontology experience: React + TypeScript, Fastify + TypeScript, Google ADK/Gemini, Neo4j, SSE answer evidence, and cursor-paginated Cytoscape explorer.

## What works

- Page 1: streaming chat with exact Neo4j evidence subgraph.
- Page 2: search, keyset pagination and click-to-expand graph exploration.
- Page 3: production architecture and guardrails.
- Page 4: live OpenTelemetry service dashboard and OTLP export status.
- Repeatable Excel → normalized Neo4j importer for all six `ontology1.xlsx` sheets.
- Strategy-pattern agent (`adk`/`mock`) and factory-composed Fastify routes.
- Docker images for API/web plus local Neo4j.
- ADK-only OpenTelemetry traces plus dedicated frontend trace console.
- Prisma/PostgreSQL durable conversation and evidence audit records, separate from observability.
- Husky pre-commit gate plus security ESLint, secretlint and CI CodeQL.
- OpenTelemetry auto-instrumentation, custom graph/chat metrics and local collector.

## Quick start

Requirements: Node 22+, npm 10+, Docker.

```bash
npm install
npm run env:run -- docker compose up -d neo4j postgres otel-collector
npm run prisma:deploy
npm run seed
npm run dev
```

Open `http://localhost:5173`. Local Neo4j Browser: `http://localhost:7474`.
Runtime configuration comes exclusively from the dotenvx-encrypted `.env`.
Docker Compose receives ports, credentials, memory limits, origins, model settings,
and service URLs from that same decrypted environment; Compose contains no local secrets.

## Docker: portable full-stack setup

Requirements: Docker Desktop/Engine with Compose v2, at least 4 GB free RAM, and
the dotenvx private key for the encrypted `.env`. Images support normal Docker
Desktop platforms (`linux/amd64` and `linux/arm64`) and do not copy host
`node_modules` into containers.

First build and start:

```bash
npm run docker:up
```

`docker:up` builds API first, then web. Sequential builds avoid frontend and
backend competing for RAM on smaller laptops. After both images build, Compose
starts services in background and waits for database/API health checks.

Open `http://localhost:8080`. Set a rotated `GOOGLE_API_KEY` and
`AGENT_STRATEGY=adk` to use Gemini. With `AGENT_STRATEGY=mock`, Gemini credentials
are not needed.

Common commands:

```bash
# Start existing images without rebuilding
npm run docker:start

# Rebuild only changed service
npm run docker:build:api
npm run docker:build:web

# Follow application logs
npm run docker:logs

# Stop containers; named database volumes remain
npm run docker:down
```

Health endpoints:

- Web/Nginx: `http://localhost:8080/healthz`
- API through web proxy: `http://localhost:8080/api/health/live`
- API readiness: `http://localhost:8080/api/health/ready`

Local database and telemetry ports bind to `127.0.0.1`, not the LAN. API and web
containers run as non-root users. PostgreSQL and Neo4j data live in named Docker
volumes, so rebuilding images does not erase data.

Troubleshooting another laptop:

```bash
# Validate fully decrypted Compose configuration
npm run env:run -- docker compose config

# Rebuild one image without stale cache
npm run env:run -- docker compose build --no-cache api

# Show container health and exit state
npm run env:run -- docker compose ps
```

Do not copy `node_modules` between Windows/macOS/Linux machines. Clone repository,
provide dotenvx decryption key, then build on target laptop. Docker selects correct
CPU image automatically.

Fastify API documentation:

- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs/json`
- OpenAPI YAML: `http://localhost:3000/docs/yaml`

## Source priority

`data/raw/ontology1.xlsx` is authoritative first structured source. `Enterprise_Knowledge_Model.txt` is retained as future upstream knowledge source. Both must normalize into same stable Neo4j model; TXT must never invent a parallel schema.

## Secrets and dotenvx

Repository includes a real dotenvx-encrypted `.env`. Decryption key lives only in
`.env.keys`, which is ignored. Never commit plaintext keys or `.env.keys`. Safe
team rotation flow:

```bash
npx dotenvx set GOOGLE_API_KEY "replacement-key"
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
observability/   ADK-only OTLP collector configuration
prisma/          durable PostgreSQL audit schema and migrations
data/raw/        versioned source inputs
docs/HLD.md      boundaries and end-to-end flow
docs/LLD.md      APIs, classes, data model, failure behavior
docs/DIAGRAMS.md sequence, deployment, data, security, telemetry diagrams
docs/PRODUCTION.md security, scaling, observability, rollout
```

## Documentation

- [HLD](docs/HLD.md)
- [LLD](docs/LLD.md)
- [Architecture diagrams](docs/DIAGRAMS.md)
- [Production readiness](docs/PRODUCTION.md)
- [Pagination decision](docs/ADR-001-pagination.md)
- [Original prompt compliance audit](docs/PROMPT-COMPLIANCE.md)

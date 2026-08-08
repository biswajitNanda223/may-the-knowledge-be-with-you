# High-level design

## System purpose

Platform answers enterprise questions from normalized Neo4j ontology, streams grounded responses, displays exact evidence, supports bounded graph exploration, imports governed sources, and exposes Google ADK-only telemetry.

## System context

```mermaid
flowchart LR
  User[Enterprise user]
  IdP[Enterprise IdP]
  Platform[Knowledge platform]
  Aura[(Neo4j Aura)]
  Gemini[Gemini API]
  TraceBackend[Approved trace backend]

  User -->|HTTPS| Platform
  Platform -. future OIDC .-> IdP
  Platform -->|Encrypted Bolt| Aura
  Platform -->|Google ADK| Gemini
  Platform -->|ADK spans only| TraceBackend
```

## Container architecture

```mermaid
flowchart TB
  subgraph Browser[React TypeScript application]
    Chat[Page 1: Chat and evidence]
    Explorer[Page 2: Graph explorer]
    Ops[Page 3: Architecture and ingestion]
    Telemetry[Page 4: ADK telemetry]
    Canvas[Cytoscape graph canvas]
    Chat --> Canvas
    Explorer --> Canvas
  end

  subgraph API[Fastify TypeScript replicas]
    Routes[Route factory]
    Graph[Graph service]
    Agent[Agent strategy factory]
    ADK[Google ADK strategy]
    Importer[Ontology importer]
    Audit[Durable audit service]
    AgentTrace[ADK telemetry service]
    Routes --> Graph
    Routes --> Agent
    Agent --> ADK
    Routes --> Importer
    Routes --> Audit
    Routes --> AgentTrace
  end

  Neo4j[(Neo4j local or Aura)]
  Gemini[Gemini]
  Collector[OTel Collector: traces only]
  PostgreSQL[(PostgreSQL audit store)]
  Backend[Trace backend]

  Browser -->|REST and SSE| Routes
  Graph --> Neo4j
  Importer --> Neo4j
  ADK --> Gemini
  ADK --> AgentTrace
  Audit --> PostgreSQL
  AgentTrace -->|OTLP HTTP| Collector
  Collector --> Backend
```

## Deployment topology

```mermaid
flowchart LR
  Client[Browser] --> Edge[WAF / CDN / ingress]
  Edge --> Web[Static React assets]
  Edge --> LB[API load balancer]
  LB --> API1[Fastify pod 1]
  LB --> API2[Fastify pod 2]
  LB --> APIN[Fastify pod N]
  API1 --> Aura[(Neo4j Aura)]
  API2 --> Aura
  APIN --> Aura
  API1 --> Gemini[Gemini API]
  API2 --> Gemini
  APIN --> Gemini
  API1 --> AuditDB[(PostgreSQL audit)]
  API2 --> AuditDB
  APIN --> AuditDB
  API1 -. ADK spans .-> OTel[OTel Collector]
  API2 -. ADK spans .-> OTel
  APIN -. ADK spans .-> OTel
  OTel --> Trace[Enterprise trace backend]
  LB -. future distributed limits .-> Redis[(Redis)]
```

## Primary answer flow

1. Browser sends question and optional conversation ID.
2. Fastify validates, rate-limits, and assigns correlation/trace IDs.
3. Graph retrieval executes bounded parameterized Cypher.
4. API emits `trace` SSE event containing exact evidence nodes and edges.
5. Same evidence enters Google ADK/Gemini prompt.
6. API emits `token` events, followed by `complete` or `error`.
7. ADK telemetry records only model, counts, duration, status, and errors.
8. Prisma persists conversation, question, query-template ID, evidence IDs, and completion status as durable audit records. These records are not observability data and never feed Page 4.

## Scale boundaries

- Fastify request processing is stateless and horizontally scalable.
- One process-wide Neo4j driver uses bounded connection pooling.
- Explorer uses opaque keyset cursors and hard page limits.
- Expansion is progressive; full-graph download is not supported.
- ADK dashboard read model is process-local and capped at 200 runs. Production trace history belongs in approved OTLP backend.
- PostgreSQL audit data is durable business evidence with separate retention, access, and encryption policy.
- Redis is future production infrastructure for distributed rate limits and idempotency.
- Aura Free suits demos; industrial use requires tier selection based on HA, restore, private networking, capacity, and support.

## Trust boundaries

Frontend never receives Gemini/Neo4j credentials, raw Cypher, prompt telemetry, or graph properties in telemetry. Production must derive tenant and role policy from verified OIDC claims. Read traffic and ingestion must use separate Neo4j identities.

See [diagram catalog](DIAGRAMS.md), [LLD](LLD.md), and [production plan](PRODUCTION.md).

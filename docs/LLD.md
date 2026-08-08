# Low-level design

## Backend modules

```mermaid
classDiagram
  class RouteFactory { +registerRoutes(app) }
  class GraphService { +page(input) GraphSlice +neighbors(id,limit,cursor) GraphSlice +retrieve(question) Evidence }
  class AgentStrategy { <<interface>> +stream(input) AsyncIterable~string~ }
  class AdkAgentStrategy { -agent LlmAgent +stream(input) }
  class MockAgentStrategy { +stream(input) }
  class AgentFactory { +createAgentStrategy() AgentStrategy }
  class OntologyImporter { +importOntology(path) ImportCounts }
  class AdkTelemetryService { +start(input) +evidence(traceId,evidence) +chunk(traceId,value) +complete(traceId) +fail(traceId,error) +snapshot() }
  class AuditService { +start(input) +complete(traceId) +fail(traceId,errorCode) }
  class PrismaClient { +conversation +graphTrace }
  class Neo4jDriver { +read(cypher,params) +write(cypher,params) }

  RouteFactory --> GraphService
  RouteFactory --> AgentFactory
  RouteFactory --> OntologyImporter
  RouteFactory --> AdkTelemetryService
  RouteFactory --> AuditService
  AgentFactory --> AgentStrategy
  AgentStrategy <|.. AdkAgentStrategy
  AgentStrategy <|.. MockAgentStrategy
  GraphService --> Neo4jDriver
  OntologyImporter --> Neo4jDriver
  AdkAgentStrategy --> AdkTelemetryService
  AuditService --> PrismaClient
```

`registerRoutes` composes bounded Fastify plugins. Routes validate transport with Zod and delegate. `GraphService` owns approved Cypher templates and graph mapping. Agent factory selects real ADK or deterministic mock without changing transport.

## API contracts

| Method | Path | Contract |
|---|---|---|
| POST | `/v1/chat` | `{question, conversationId?}`; SSE `trace/token/complete/error` |
| GET | `/v1/graph/nodes` | `cursor,limit,search,label`; returns `GraphSlice` |
| GET | `/v1/graph/nodes/:id/neighbors` | Bounded progressive expansion |
| POST | `/v1/ingestion/files` | Multipart `.xlsx` import or staged `.txt` |
| GET | `/v1/telemetry/agent` | ADK-only summary and last 200 run records |
| GET | `/health/live` | Process liveness |
| GET | `/health/ready` | Neo4j connectivity readiness |

## Core contracts

```mermaid
classDiagram
  class GraphNode { +string id +string label +string name +properties }
  class GraphEdge { +string id +string source +string target +string type +properties }
  class GraphSlice { +GraphNode[] nodes +GraphEdge[] edges +string nextCursor }
  class Evidence { +GraphNode[] nodes +GraphEdge[] edges +string cypherId +number elapsedMs }
  class AgentRun { +string traceId +string conversationId +string model +RunStatus status +number evidenceNodes +number evidenceEdges +number outputChunks +number outputChars +number durationMs }
  GraphSlice o-- GraphNode
  GraphSlice o-- GraphEdge
  Evidence o-- GraphNode
  Evidence o-- GraphEdge
```

## Normalized Neo4j model

```mermaid
erDiagram
  ONTOLOGY_NODE {
    string id PK
    string name
    string source
  }
  ENTITY {
    string category
    string owner
    string criticality
  }
  PROCESS_STEP {
    string process
    int stepNo
  }
  SYSTEM {
    string name
  }
  BUSINESS_RULE {
    string severity
  }
  GLOSSARY_TERM {
    string meaning
  }
  ONTOLOGY_NODE ||--|| ENTITY : specialized_as
  ONTOLOGY_NODE ||--|| PROCESS_STEP : specialized_as
  ONTOLOGY_NODE ||--|| SYSTEM : specialized_as
  ONTOLOGY_NODE ||--|| BUSINESS_RULE : specialized_as
  ONTOLOGY_NODE ||--|| GLOSSARY_TERM : specialized_as
  ENTITY }o--o{ ENTITY : workbook_relationship
  ENTITY }o--o{ SYSTEM : IMPLEMENTED_IN
  BUSINESS_RULE }o--o{ ENTITY : APPLIES_TO
```

Every discoverable node has `:OntologyNode`, immutable `id`, display `name`, and `source`. Additional labels specialize nodes. Workbook relationship names remain semantic relationship types.

## Pagination algorithm

Top-level browse orders by `(coalesce(name,id), id)`. Opaque cursor encodes last pair. Query requests `limit + 1`; extra record determines `nextCursor`. Maximum response is enforced server-side. Neighbor expansion is locally bounded; future high-degree evolution should keyset on `(other.id, relationship.elementId)`.

## SSE state machine

```mermaid
stateDiagram-v2
  [*] --> Validating
  Validating --> Retrieving
  Retrieving --> EvidenceSent: trace
  EvidenceSent --> Streaming: first token
  Streaming --> Streaming: token
  Streaming --> Completed: complete
  Validating --> Failed: validation error
  Retrieving --> Failed: Neo4j error
  EvidenceSent --> Failed: ADK or Gemini error
  Streaming --> Failed: stream error
  Completed --> [*]
  Failed --> [*]
```

## ADK-only telemetry

Telemetry starts only when `AGENT_STRATEGY=adk`. It never runs for mock strategy. OTLP span name is `google.adk.agent.run`. Attributes contain model, session ID, question character count, evidence counts, retrieval duration, output counts, total duration, and error status. Prompt text and graph properties are excluded.

Recent-run dashboard state is capped at 200 entries per API process. It is operational convenience, not durable audit history.

## Durable audit persistence

Prisma/PostgreSQL is separate from observability. `Conversation` owns ordered `GraphTrace` records. Each trace persists question, approved query-template ID, exact evidence node/edge IDs, retrieval duration, status, timestamps, and safe error code. Page 4 never queries these tables. Production access requires restricted audit roles and retention controls.

```mermaid
erDiagram
  CONVERSATION ||--o{ GRAPH_TRACE : contains
  CONVERSATION {
    uuid id PK
    datetime createdAt
    datetime updatedAt
  }
  GRAPH_TRACE {
    uuid id PK
    uuid conversationId FK
    string question
    string queryTemplate
    string_array nodeIds
    string_array edgeIds
    int elapsedMs
    string status
    string errorCode
    datetime completedAt
  }
```

## Frontend modules

```mermaid
flowchart TB
  App[App route shell]
  Chat[ChatPage]
  Explorer[ExplorerPage]
  Ops[OperationsPage]
  Telemetry[TelemetryPage]
  Canvas[GraphCanvas]
  API[API client]
  Merge[mergeGraph]

  App --> Chat
  App --> Explorer
  App --> Ops
  App --> Telemetry
  Chat --> Canvas
  Explorer --> Canvas
  Explorer --> Merge
  Chat --> API
  Explorer --> API
  Ops --> API
  Telemetry --> API
```

- Page 1 incrementally parses SSE and renders evidence.
- Page 2 merges graph pages by immutable IDs and expands clicked nodes.
- Page 3 uploads governed sources and presents architecture guardrails.
- Page 4 polls ADK-only run telemetry every three seconds.

## Failure behavior

- Neo4j unavailable: readiness returns 503; graph/chat request fails safely with request ID.
- Gemini/ADK failure: evidence remains visible; SSE sends `error`; telemetry run becomes `FAILED`.
- OTLP collector unavailable: agent response continues; exporter failure must not break chat.
- Browser disconnect: response closes. Production should propagate abort signals to ADK and Neo4j work.
- Duplicate workbook import: stable IDs and `MERGE` keep ingestion repeatable.
- Invalid or oversized upload: rejected before import; temporary server-generated path is removed.

See [diagram catalog](DIAGRAMS.md) for complete sequences and deployment views.

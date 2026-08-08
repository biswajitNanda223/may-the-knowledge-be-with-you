# Low-level design

## Scope and implementation status

This document describes deployed code, not an aspirational agent workflow. Current graph retrieval happens before Gemini. Current animated answer path is derived in the browser after Gemini emits cited node IDs. It is a shortest-path visualization over retrieved evidence; it is not Gemini chain-of-thought.

## Chat execution sequence

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant UI as ChatPage
  participant Route as POST /v1/chat
  participant Graph as GraphService
  participant Neo4j
  participant Audit as AuditService
  participant ADK as AdkAgentStrategy
  participant Gemini
  participant Canvas as GraphCanvas

  User->>UI: Submit question
  UI->>Route: question, conversationId?
  Route->>Graph: retrieve(question)
  Graph->>Graph: tokenize and bound terms to 12
  Graph->>Neo4j: keyword-neighborhood.v1
  Neo4j-->>Graph: up to 60 node/relationship rows
  Graph-->>Route: Evidence
  Route->>Audit: persist STARTED + evidence IDs
  Route-->>UI: SSE trace(Evidence)
  UI->>Canvas: render retrieved graph
  Route->>ADK: question + serialized Evidence
  ADK->>Gemini: grounded generation request
  loop streamed output
    Gemini-->>ADK: ADK event
    ADK-->>Route: text chunk
    Route-->>UI: SSE token
    UI->>UI: extract citations [node-id]
    UI->>UI: BFS from question matches to cited nodes
    UI->>Canvas: animate evidence paths
  end
  Route-->>UI: SSE complete
  Route->>Audit: mark COMPLETED
```

### Ordering guarantee

`trace` is emitted before first `token`. Frontend can therefore render evidence before model output arrives. Citation-dependent animation begins only after a streamed answer contains IDs that exist in received evidence.

### Current path semantics

```text
candidate starts = top 3 retrieved nodes ranked by question-term matches
targets          = first 4 valid [node-id] citations in streamed answer
path             = shortest undirected BFS route from any start to each target
animation        = node, edge, node order for every discovered route
```

This route explains graph connectivity between question context and cited evidence. It does not expose or approximate hidden model reasoning.

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
  class EvidencePath { +string id +string[] elementIds +string targetNodeId }
  class AgentRun { +string traceId +string conversationId +string model +RunStatus status +number evidenceNodes +number evidenceEdges +number outputChunks +number outputChars +number durationMs }
  GraphSlice o-- GraphNode
  GraphSlice o-- GraphEdge
  Evidence o-- GraphNode
  Evidence o-- GraphEdge
```

### Transport types

```ts
type ChatRequest = {
  question: string;          // trimmed, 2..2000 characters
  conversationId?: string;  // UUID
};

type TraceEvent = Evidence & {
  traceId: string;
  conversationId: string;
};

type TokenEvent = { token: string };
type CompleteEvent = { traceId: string; conversationId: string };
type ErrorEvent = { message: string; traceId: string };
```

SSE frame format:

```text
event: <trace|token|complete|error>
data: <single-line JSON>

```

## Retrieval implementation

`GraphService.retrieve` performs deterministic, bounded retrieval:

1. Lowercase question.
2. Split on non-identifier characters.
3. Keep tokens longer than two characters.
4. Keep maximum 12 terms.
5. Match nodes where `name`, `description`, or `id` contains any term.
6. Limit seed nodes to 12.
7. Expand one undirected hop.
8. Limit result rows to 60.
9. Deduplicate nodes and relationships by stable ID.

Cypher values are parameters. Question text never becomes executable Cypher.

Complexity bounds:

| Operation | Bound |
|---|---:|
| Query terms | 12 |
| Matching seed nodes | 12 |
| Returned rows | 60 |
| Browser path targets | 4 |
| Browser candidate starts | 3 |
| Path search | `O(V + E)` per start/target pair |

## Frontend chat state

| State | Owner | Meaning |
|---|---|---|
| `question` | `ChatPage` | Composer draft; cleared immediately after accepted submit |
| `submittedQuestion` | `ChatPage` | Immutable question for active response |
| `answer` | `ChatPage` | Accumulated streamed output |
| `nodes`, `edges` | `ChatPage` | Exact server `trace` evidence |
| `busy` | `ChatPage` | Prevents concurrent submission |
| `citedNodeIds` | derived | Valid answer citations present in evidence |
| `evidenceRoutes` | derived | BFS paths for visualization |
| `evidenceMode` | `ChatPage` | normal, expanded, or minimized |

Token rendering is coalesced through `requestAnimationFrame` to avoid one React render per network chunk.

## GraphCanvas rules

- Reject edges whose endpoints are absent.
- Reject self-loops in this view.
- Deduplicate parallel edges with identical source, target, and type.
- Hide arrowheads and labels on background relationships.
- Show direction and label only for active answer-path edges.
- Fade unrelated elements during route playback.
- Run each evidence route separately; never flatten multiple paths into one false route.
- Resize canvas without automatically refitting on every observer event.
- Fit after layout completion and when user requests fit/fullscreen.

## Exact server-owned path evolution

For compliance-grade provenance, move path selection into backend retrieval and extend `Evidence`:

```ts
type EvidencePath = {
  id: string;
  elementIds: string[];      // alternating node and relationship IDs
  targetNodeId: string;
  retrievalReason: 'keyword-neighborhood' | 'explicit-traversal';
};

type Evidence = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  paths: EvidencePath[];
  cypherId: string;
  elapsedMs: number;
};
```

Migration rule: backend returns `paths`; Gemini receives same paths; audit persists path IDs; frontend only animates returned `elementIds`. This removes browser heuristic divergence while still avoiding claims about model chain-of-thought.

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

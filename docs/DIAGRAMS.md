# Architecture diagram catalog

All diagrams describe current implementation unless marked `future production`.

## 1. End-to-end chat and evidence sequence

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant UI as React ChatPage
  participant Canvas as GraphCanvas
  participant API as Fastify chat route
  participant Graph as GraphService
  participant Neo4j
  participant Telemetry as ADK telemetry
  participant Audit as Prisma audit service
  participant PostgreSQL
  participant ADK as Google ADK
  participant Gemini
  participant OTel as OTel Collector

  User->>UI: Submit question
  UI->>API: POST /v1/chat
  API->>Graph: retrieve(question)
  Graph->>Neo4j: Bounded parameterized Cypher
  Neo4j-->>Graph: Exact nodes and edges
  Graph-->>API: Evidence envelope
  API->>Audit: Persist STARTED with evidence IDs
  Audit->>PostgreSQL: INSERT conversation and graph trace
  API-->>UI: SSE trace
  UI->>Canvas: Render retrieved evidence
  API->>Telemetry: start + evidence counts
  API->>ADK: stream(question, evidence)
  ADK->>Gemini: Grounded generation
  loop Generated output
    Gemini-->>ADK: Event content
    ADK-->>API: Token chunk
    API->>Telemetry: chunk count
    API-->>UI: SSE token
    UI->>UI: Extract valid [node-id] citations
    UI->>UI: Compute shortest evidence route with BFS
    UI->>Canvas: Animate current route
  end
  API->>Telemetry: complete
  API->>Audit: Mark COMPLETED
  Audit->>PostgreSQL: UPDATE graph trace
  Telemetry-->>OTel: google.adk.agent.run span
  API-->>UI: SSE complete
```

## 2. Explorer pagination and expansion

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant UI as ExplorerPage
  participant API as Graph routes
  participant Service as GraphService
  participant Neo4j

  User->>UI: Search or open explorer
  UI->>API: GET /v1/graph/nodes?limit=50
  API->>Service: page(query)
  Service->>Neo4j: ORDER BY name,id LIMIT 51
  Neo4j-->>Service: Bounded records
  Service-->>API: nodes, internal edges, nextCursor
  API-->>UI: GraphSlice
  UI->>UI: Merge by immutable ID
  User->>UI: Click node
  UI->>API: GET /nodes/:id/neighbors?limit=50
  API->>Neo4j: Bounded neighborhood query
  Neo4j-->>UI: Incremental GraphSlice
```

## 3. Workbook ingestion

```mermaid
sequenceDiagram
  autonumber
  actor Admin
  participant UI as OperationsPage
  participant API as Ingestion route
  participant FS as Temporary upload
  participant Importer as OntologyImporter
  participant Neo4j

  Admin->>UI: Select ontology1.xlsx
  UI->>API: Multipart POST /v1/ingestion/files
  API->>API: Validate extension and size
  API->>FS: Write UUID-named temporary file
  API->>Importer: importOntology(path)
  Importer->>Importer: Parse six worksheets
  Importer->>Neo4j: Constraints and indexes
  Importer->>Neo4j: MERGE nodes and relationships
  Neo4j-->>Importer: Write summaries
  Importer-->>API: Import counts
  API->>FS: Delete temporary file
  API-->>UI: Imported counts
```

## 4. ADK telemetry lifecycle

```mermaid
stateDiagram-v2
  [*] --> Ignored: strategy is mock
  [*] --> Running: strategy is adk
  Running --> EvidenceAttached: retrieval complete
  EvidenceAttached --> Streaming: first output chunk
  Streaming --> Streaming: more chunks
  EvidenceAttached --> Completed: empty valid output
  Streaming --> Completed: agent completes
  Running --> Failed: retrieval or ADK error
  EvidenceAttached --> Failed: Gemini error
  Streaming --> Failed: stream error
  Completed --> SpanExported
  Failed --> SpanExported
  Ignored --> [*]
  SpanExported --> [*]
```

## 5. ADK telemetry data flow

```mermaid
flowchart LR
  Chat[Chat route] -->|start/evidence/chunk/end| Memory[Bounded 200-run read model]
  Chat --> Span[google.adk.agent.run span]
  Memory --> API[GET /v1/telemetry/agent]
  API --> Page[Page 4 ADK trace console]
  Span --> Collector[OTel Collector traces pipeline]
  Collector --> Debug[Local debug exporter]
  Collector -. production .-> Enterprise[Enterprise trace backend]

  Excluded[Prompt text, credentials, graph properties, generic HTTP/process metrics]
  Excluded -. never recorded .-> Memory
  Excluded -. never exported .-> Span
```

## 6. Security and trust zones

```mermaid
flowchart LR
  subgraph Public[Public zone]
    Browser[Browser]
  end
  subgraph Edge[Edge security zone]
    WAF[WAF / ingress]
  end
  subgraph App[Application zone]
    Web[Static web]
    API[Fastify replicas]
    OTel[OTel collector]
  end
  subgraph Data[Data zone]
    Neo4j[(Neo4j Aura)]
  end
  subgraph External[Approved external services]
    Gemini[Gemini API]
    Traces[Trace backend]
  end

  Browser -->|TLS| WAF
  WAF --> Web
  WAF --> API
  API -->|read identity| Neo4j
  API -->|separate import identity| Neo4j
  API -->|API key or workload identity| Gemini
  API -->|ADK spans only| OTel
  OTel -->|TLS and auth| Traces
```

## 7. Failure and degradation paths

```mermaid
flowchart TD
  Request[Chat request] --> NeoCheck{Neo4j retrieval works?}
  NeoCheck -- no --> SafeError[Emit safe SSE error with trace ID]
  NeoCheck -- yes --> Trace[Emit evidence trace]
  Trace --> AdkCheck{ADK and Gemini work?}
  AdkCheck -- no --> FailedRun[Mark ADK run failed]
  FailedRun --> SafeError
  AdkCheck -- yes --> Tokens[Stream tokens]
  Tokens --> OtelCheck{Collector available?}
  OtelCheck -- no --> Continue[Complete answer; exporter failure isolated]
  OtelCheck -- yes --> Export[Export ADK span]
  Continue --> Complete[SSE complete]
  Export --> Complete
```

## 8. Audit versus observability separation

```mermaid
flowchart LR
  Chat[Chat route]
  Audit[Prisma audit service]
  DB[(PostgreSQL)]
  AgentTrace[ADK telemetry service]
  Page4[Page 4 ADK telemetry]
  OTel[OTel collector]
  Backend[Trace backend]

  Chat -->|question, template ID, evidence IDs, status| Audit
  Audit -->|durable business record| DB
  Chat -->|model, counts, duration, error| AgentTrace
  AgentTrace -->|bounded live read model| Page4
  AgentTrace -->|ADK span only| OTel
  OTel --> Backend
  DB -. never queried .-> Page4
```

## 9. Repository ownership map

```mermaid
flowchart TB
  Root[Repository]
  Root --> API[apps/api]
  Root --> Web[apps/web]
  Root --> Data[data/raw]
  Root --> Obs[observability]
  Root --> Prisma[prisma]
  Root --> Docs[docs]
  API --> Agents[agents: strategy and ADK]
  API --> Routes[routes: transport]
  API --> Services[services: graph/import]
  API --> Infra[infra: Neo4j]
  API --> Telemetry[telemetry: ADK spans/read model]
  Web --> Pages[pages: four screens]
  Web --> Components[components: GraphCanvas]
  Obs --> Collector[collector trace pipeline]
  Prisma --> AuditSchema[audit schema and migrations]
  Docs --> HLD[HLD]
  Docs --> LLD[LLD]
  Docs --> Production[Production plan]
```

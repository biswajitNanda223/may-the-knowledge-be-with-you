# Low-level design

## Backend

Factory `registerRoutes` assembles bounded plugins. Route handlers validate transport and delegate. `GraphService` owns Cypher and mapping. `createAgentStrategy` selects `AdkAgentStrategy` or deterministic `MockAgentStrategy`; agent swap does not touch chat transport.

ADK telemetry owns a bounded recent-run read model and emits OTLP spans. It records
model, evidence counts, output counts, duration and status—never prompt text or graph properties.

### APIs

| Method | Path | Contract |
|---|---|---|
| POST | `/v1/chat` | Body `{question, conversationId?}`; SSE `trace/token/complete/error` |
| GET | `/v1/graph/nodes` | `cursor,limit,search,label`; returns nodes/edges/nextCursor |
| GET | `/v1/graph/nodes/:id/neighbors` | Progressive node expansion |
| POST | `/v1/ingestion/files` | Multipart `.xlsx` import; `.txt` staged |
| GET | `/health/live`, `/health/ready` | Process and Neo4j readiness |
| GET | `/v1/telemetry/agent` | Google ADK run summary and bounded trace timeline |

### Normalized model

All discoverable nodes carry `:OntologyNode`, immutable `id`, display `name`, `source`. Specialized labels: `Entity`, `ProcessStep`, `System`, `BusinessRule`, `GlossaryTerm`. Workbook relationships preserve their semantic type. Supplemental relationships: `IMPLEMENTED_IN`, `APPLIES_TO`.

### Pagination

Top-level browse orders by `(coalesce(name,id), id)` and cursor encodes last pair. This avoids deep offset scans. Neighbor pagination currently uses bounded local offset because a single node has a strict cap; production evolution should keyset by `(other.id, relationship.elementId)`.

## Frontend

`GraphCanvas` is shared by Page 1 and Page 2. Chat parser incrementally decodes SSE frames. Explorer merges nodes/edges by immutable ID, preserving current layout during progressive expansion. Page 3 documents operating model.

## Failure model

- Neo4j timeout/unavailable: readiness fails; request emits safe error with trace ID.
- Gemini failure: evidence already visible; SSE emits error, no fabricated answer.
- Browser disconnect: Node response closes. Production adds abort signal propagation to ADK/driver.
- Duplicate imports: `MERGE` on stable source IDs makes workbook import repeatable.

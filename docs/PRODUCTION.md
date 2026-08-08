# Production readiness plan

## Before launch

1. Put WAF/ingress before web/API. Enforce TLS, request limits, bot controls.
2. Add OIDC authorization-code + PKCE. Map groups to RBAC/ABAC and tenant IDs.
3. Use separate Neo4j read/import identities. Allowlist query templates; never accept browser Cypher.
4. Store secrets in cloud secret manager. Use dotenvx only for local/CI bootstrap, with private decryption key outside Git.
5. Add Redis-backed rate limiting, SSE concurrency quotas, circuit breakers, deadlines and budgets.
6. Export traces/metrics/logs through OpenTelemetry. Redact prompts, credentials and sensitive graph properties.
7. Define SLOs: availability, first-token latency, complete latency, graph query p95, error rate. Alert on burn rate.
8. Test backup restore, regional failure, Aura pause/resume, Gemini degradation and schema rollback.
9. Route ADK-only OTLP spans through collector to approved trace backend.
10. Run Prisma migrations once before API rollout; apply audit retention, encryption, backup, and restricted access policies.

## Commit and CI security gates

Husky pre-commit runs TypeScript checks, unit tests, security-focused ESLint and
secretlint. CI repeats dependency audit and GitHub CodeQL. Hooks improve feedback;
protected-branch CI remains enforcement because local hooks can be bypassed.

## Deployment stages

Local Docker → shared integration Aura → performance/security staging → canary production → progressive rollout. Migration jobs run once, before API rollout. Use image digests, SBOM, vulnerability scanning and signed artifacts.

## Capacity

Load-test with realistic subgraph density and long-lived SSE. Track driver pool saturation, heap, event-loop delay, active streams, Aura query latency, result sizes and Gemini token spend. Autoscale on concurrent streams plus CPU, not CPU alone.

## Data governance

Version source files, normalized schema and import run. Attach provenance and effective dates. Audit actor, tenant, conversation, trace, query-template ID and exact returned entity IDs. Set retention/deletion policy by classification.

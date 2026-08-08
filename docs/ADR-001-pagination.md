# ADR-001: Keyset graph pagination

Status: accepted.

Use opaque keyset cursor over stable `(name,id)` ordering. Reject unbounded limits. Page endpoint returns edges only when both endpoints occur in page; node expansion fetches bounded neighborhoods. Full-graph download is not an API feature.

Reason: deep `SKIP/OFFSET` cost grows with position and graph payload grows unpredictably. Keyset reads stay bounded and horizontally cacheable.


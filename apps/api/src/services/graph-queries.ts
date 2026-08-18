export const GRAPH_QUERIES = {
  pageNodes: `
    MATCH (n)
    WHERE n.id IS NOT NULL
      AND ($label = '' OR $label IN labels(n))
      AND ($search = '' OR toLower(coalesce(n.name, n.id)) CONTAINS toLower($search))
      AND (
        $cursorName = ''
        OR coalesce(n.name, n.id) > $cursorName
        OR (coalesce(n.name, n.id) = $cursorName AND n.id > $cursorId)
      )
    RETURN n
    ORDER BY coalesce(n.name, n.id), n.id
    LIMIT $limitPlusOne
  `,
  internalRelationships: `
    MATCH (a)-[r]->(b)
    WHERE a.id IN $ids AND b.id IN $ids
    RETURN r {.*, fromId: a.id, toId: b.id} AS rMap, r
  `,
  neighbors: `
    MATCH (n {id: $id})-[r]-(other)
    WITH n, r, other
    ORDER BY other.id
    SKIP $after
    LIMIT $limitPlusOne
    RETURN n, r, other
  `,
  keywordNeighborhood: `
    MATCH (n)
    WHERE any(
      term IN $terms
      WHERE toLower(
        coalesce(n.name, '') + ' ' +
        coalesce(n.description, '') + ' ' +
        coalesce(n.id, '')
      ) CONTAINS term
    )
    WITH n
    LIMIT 12
    OPTIONAL MATCH (n)-[r]-(m)
    RETURN n, r, m
    LIMIT 60
  `,
} as const;

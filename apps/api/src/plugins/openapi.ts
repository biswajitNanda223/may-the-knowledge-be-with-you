import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";

export async function registerOpenApi(app: FastifyInstance) {
  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "May the Knowledge Be With You API",
        description:
          "Fastify API for ontology ingestion, paginated Neo4j exploration, ADK chat evidence, and ADK-only telemetry.",
        version: "1.0.0",
      },
      tags: [
        { name: "Health", description: "Liveness and dependency readiness" },
        { name: "Chat", description: "SSE answer and evidence stream" },
        { name: "Graph", description: "Cursor-paginated Neo4j exploration" },
        {
          name: "Ingestion",
          description: "Normalized ontology source ingestion",
        },
        { name: "Telemetry", description: "Google ADK agent telemetry only" },
      ],
    },
  });
  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: true },
  });
}

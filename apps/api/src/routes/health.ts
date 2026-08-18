import type { FastifyPluginAsync } from "fastify";
import { driver } from "../infra/neo4j.js";
export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/live",
    {
      schema: {
        tags: ["Health"],
        summary: "Process liveness",
        response: {
          200: { type: "object", properties: { status: { type: "string" } } },
        },
      },
    },
    async () => ({ status: "ok" }),
  );
  app.get(
    "/ready",
    {
      schema: {
        tags: ["Health"],
        summary: "Neo4j dependency readiness",
        response: {
          200: { type: "object", properties: { status: { type: "string" } } },
          503: { type: "object", properties: { status: { type: "string" } } },
        },
      },
    },
    async (_req, reply) => {
      try {
        await driver.verifyConnectivity();
        return { status: "ready" };
      } catch {
        return reply.code(503).send({ status: "not-ready" });
      }
    },
  );
};

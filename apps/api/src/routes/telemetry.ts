import type { FastifyPluginAsync } from "fastify";
import { config } from "../config.js";
import { adkTelemetry } from "../telemetry/telemetry-service.js";
export const telemetryRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/agent",
    {
      schema: {
        tags: ["Telemetry"],
        summary: "Get in-process Google ADK agent run telemetry",
      },
    },
    async (_req, reply) =>
      config.TELEMETRY_PUBLIC_ENABLED
        ? adkTelemetry.snapshot()
        : reply.code(404).send({ message: "ADK telemetry dashboard disabled" }),
  );
};

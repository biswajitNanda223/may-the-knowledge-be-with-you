import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { GraphService } from "../services/graph-service.js";
const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().max(100).optional(),
  label: z.string().max(50).optional(),
});
export const graphRoutes: FastifyPluginAsync = async (app) => {
  const service = new GraphService();
  app.get(
    "/nodes",
    {
      schema: {
        tags: ["Graph"],
        summary: "List graph nodes using keyset pagination",
        querystring: {
          type: "object",
          properties: {
            cursor: { type: "string" },
            limit: { type: "integer", minimum: 1, maximum: 100 },
            search: { type: "string", maxLength: 100 },
            label: { type: "string", maxLength: 50 },
          },
        },
      },
    },
    async (req) => service.page(querySchema.parse(req.query)),
  );
  app.get(
    "/nodes/:id/neighbors",
    {
      schema: {
        tags: ["Graph"],
        summary: "Expand one node using cursor pagination",
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", maxLength: 150 } },
        },
        querystring: {
          type: "object",
          properties: {
            cursor: { type: "string" },
            limit: { type: "integer", minimum: 1, maximum: 100 },
          },
        },
      },
    },
    async (req) => {
      const { id } = z.object({ id: z.string().max(150) }).parse(req.params);
      const q = z
        .object({
          cursor: z.string().optional(),
          limit: z.coerce.number().optional(),
        })
        .parse(req.query);
      return service.neighbors(id, q.limit, q.cursor);
    },
  );
};

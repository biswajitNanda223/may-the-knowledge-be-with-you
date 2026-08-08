import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { GraphService } from '../services/graph-service.js';
const querySchema = z.object({ cursor: z.string().optional(), limit: z.coerce.number().optional(), search: z.string().max(100).optional(), label: z.string().max(50).optional() });
export const graphRoutes: FastifyPluginAsync = async app => {
  const service = new GraphService();
  app.get('/nodes', async req => service.page(querySchema.parse(req.query)));
  app.get('/nodes/:id/neighbors', async req => {
    const { id } = z.object({ id: z.string().max(150) }).parse(req.params);
    const q = z.object({ cursor: z.string().optional(), limit: z.coerce.number().optional() }).parse(req.query);
    return service.neighbors(id, q.limit, q.cursor);
  });
};


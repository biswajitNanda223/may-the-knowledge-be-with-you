import type { FastifyPluginAsync } from 'fastify';
import { driver } from '../infra/neo4j.js';
export const healthRoutes: FastifyPluginAsync = async app => {
  app.get('/live', async () => ({ status: 'ok' }));
  app.get('/ready', async (_req, reply) => { try { await driver.verifyConnectivity(); return { status: 'ready' }; } catch { return reply.code(503).send({ status: 'not-ready' }); } });
};


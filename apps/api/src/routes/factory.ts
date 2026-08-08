import type { FastifyInstance } from 'fastify';
import { chatRoutes } from './chat.js';
import { graphRoutes } from './graph.js';
import { healthRoutes } from './health.js';
import { ingestionRoutes } from './ingestion.js';
import { telemetryRoutes } from './telemetry.js';
export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(chatRoutes, { prefix: '/v1/chat' });
  await app.register(graphRoutes, { prefix: '/v1/graph' });
  await app.register(ingestionRoutes, { prefix: '/v1/ingestion' });
  await app.register(telemetryRoutes, { prefix: '/v1/telemetry' });
}

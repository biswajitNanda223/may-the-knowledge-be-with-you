import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { registerRoutes } from './routes/factory.js';
export async function buildApp() {
  const app = Fastify({ logger: { level: config.NODE_ENV === 'production' ? 'info' : 'debug' }, requestIdHeader: 'x-request-id', trustProxy: true });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: config.WEB_ORIGIN.split(',').map(x => x.trim()), credentials: true });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  app.setErrorHandler((error: Error & { statusCode?: number }, req, reply) => { req.log.error({ err: error }); const status = error.statusCode ?? 500; reply.code(status).send({ error: error.name, message: status < 500 ? error.message : 'Internal server error', requestId: req.id }); });
  await registerRoutes(app); return app;
}

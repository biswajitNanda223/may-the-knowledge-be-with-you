import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAgentStrategy } from '../agents/factory.js';
import { GraphService } from '../services/graph-service.js';
import { AuditService } from '../services/audit-service.js';
import { config } from '../config.js';
const bodySchema = z.object({ question: z.string().trim().min(2).max(2000), conversationId: z.string().uuid().optional() });
export const chatRoutes: FastifyPluginAsync = async app => {
  const graph = new GraphService(); const agent = createAgentStrategy(); const audit = new AuditService();
  app.post('/', async (req, reply) => {
    const input = bodySchema.parse(req.body); const conversationId = input.conversationId ?? randomUUID(); const traceId = randomUUID();
    reply.hijack(); reply.raw.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-trace-id': traceId });
    const send = (event: string, data: unknown) => reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    try {
      const evidence = await graph.retrieve(input.question);
      await audit.start({ traceId, conversationId, question: input.question, evidence }).catch(error => { req.log.error({ err: error, traceId }, 'audit start failed'); if (config.AUDIT_REQUIRED) throw error; });
      send('trace', { traceId, conversationId, ...evidence });
      for await (const token of agent.stream({ question: input.question, evidence, conversationId })) send('token', { token });
      await audit.complete(traceId).catch(error => { req.log.error({ err: error, traceId }, 'audit completion failed'); if (config.AUDIT_REQUIRED) throw error; });
      send('complete', { traceId, conversationId });
    } catch (error) { await audit.fail(traceId, error instanceof Error ? error.name : 'UnknownError').catch(() => undefined); send('error', { message: error instanceof Error ? error.message : 'Unknown error', traceId }); }
    finally { reply.raw.end(); }
  });
};

import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAgentStrategy } from '../agents/factory.js';
import { GraphService } from '../services/graph-service.js';
const bodySchema = z.object({ question: z.string().trim().min(2).max(2000), conversationId: z.string().uuid().optional() });
export const chatRoutes: FastifyPluginAsync = async app => {
  const graph = new GraphService(); const agent = createAgentStrategy();
  app.post('/', async (req, reply) => {
    const input = bodySchema.parse(req.body); const conversationId = input.conversationId ?? randomUUID(); const traceId = randomUUID();
    reply.hijack(); reply.raw.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-trace-id': traceId });
    const send = (event: string, data: unknown) => reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    try {
      const evidence = await graph.retrieve(input.question); send('trace', { traceId, conversationId, ...evidence });
      for await (const token of agent.stream({ question: input.question, evidence, conversationId })) send('token', { token });
      send('complete', { traceId, conversationId });
    } catch (error) { send('error', { message: error instanceof Error ? error.message : 'Unknown error', traceId }); }
    finally { reply.raw.end(); }
  });
};


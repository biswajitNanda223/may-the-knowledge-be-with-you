import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAgentStrategy } from '../agents/factory.js';
import { GraphService } from '../services/graph-service.js';
import { config } from '../config.js';
import { adkTelemetry } from '../telemetry/telemetry-service.js';
import { AuditService } from '../services/audit-service.js';
const bodySchema = z.object({ question: z.string().trim().min(2).max(2000), conversationId: z.string().uuid().optional() });
export const chatRoutes: FastifyPluginAsync = async app => {
  const graph = new GraphService(); const agent = createAgentStrategy(); const audit = new AuditService();
  app.post('/', { schema: { tags: ['Chat'], summary: 'Stream answer tokens and exact Neo4j evidence over SSE', body: { type: 'object', required: ['question'], properties: { question: { type: 'string', minLength: 2, maxLength: 2000 }, conversationId: { type: 'string', format: 'uuid' } } }, response: { 200: { description: 'SSE events: trace, token, complete, or error', type: 'string' } } } }, async (req, reply) => {
    const input = bodySchema.parse(req.body); const conversationId = input.conversationId ?? randomUUID(); const traceId = randomUUID();
    const traceAdk = config.AGENT_STRATEGY === 'adk';
    if(traceAdk) adkTelemetry.start({traceId,conversationId,model:config.GEMINI_MODEL,questionChars:input.question.length});
    reply.hijack(); reply.raw.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-trace-id': traceId });
    const send = (event: string, data: unknown) => reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    try {
      const evidence = await graph.retrieve(input.question);
      if(traceAdk) adkTelemetry.evidence(traceId,evidence);
      await audit.start({traceId,conversationId,question:input.question,evidence}).catch(error=>{req.log.error({err:error,traceId},'durable audit start failed');if(config.AUDIT_REQUIRED)throw error;});
      send('trace', { traceId, conversationId, ...evidence });
      for await (const token of agent.stream({ question: input.question, evidence, conversationId })) { if(traceAdk) adkTelemetry.chunk(traceId,token); send('token', { token }); }
      if(traceAdk) adkTelemetry.complete(traceId);
      await audit.complete(traceId).catch(error=>{req.log.error({err:error,traceId},'durable audit completion failed');if(config.AUDIT_REQUIRED)throw error;});
      send('complete', { traceId, conversationId });
    } catch (error) { if(traceAdk) adkTelemetry.fail(traceId,error instanceof Error?error.name:'UnknownError'); await audit.fail(traceId,error instanceof Error?error.name:'UnknownError').catch(()=>undefined); send('error', { message: error instanceof Error ? error.message : 'Unknown error', traceId }); }
    finally { reply.raw.end(); }
  });
};

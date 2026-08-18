import type { Evidence } from "../domain/graph.js";
import { prisma } from "../infra/prisma.js";

export class AuditService {
  async start(input: {
    traceId: string;
    conversationId: string;
    question: string;
    evidence: Evidence;
  }) {
    await prisma.conversation.upsert({
      where: { id: input.conversationId },
      create: { id: input.conversationId },
      update: {},
    });
    await prisma.graphTrace.create({
      data: {
        id: input.traceId,
        conversationId: input.conversationId,
        question: input.question,
        queryTemplate: input.evidence.cypherId,
        nodeIds: input.evidence.nodes.map((n) => n.id),
        edgeIds: input.evidence.edges.map((e) => e.id),
        elapsedMs: input.evidence.elapsedMs,
      },
    });
  }
  async complete(traceId: string) {
    await prisma.graphTrace.update({
      where: { id: traceId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }
  async fail(traceId: string, errorCode: string) {
    await prisma.graphTrace.update({
      where: { id: traceId },
      data: { status: "FAILED", errorCode, completedAt: new Date() },
    });
  }
}

import { SpanStatusCode, trace, type Span } from '@opentelemetry/api';
import type { Evidence } from '../domain/graph.js';

export type AgentRun = {
  traceId: string; conversationId: string; model: string; status: 'RUNNING'|'COMPLETED'|'FAILED';
  startedAt: string; completedAt?: string; durationMs?: number; questionChars: number;
  evidenceNodes: number; evidenceEdges: number; outputChunks: number; outputChars: number; error?: string;
};

class AdkTelemetryService {
  private runs = new Map<string, AgentRun>(); private spans = new Map<string, Span>();
  start(input: { traceId:string; conversationId:string; model:string; questionChars:number }) {
    const run: AgentRun = { ...input, status:'RUNNING', startedAt:new Date().toISOString(), evidenceNodes:0, evidenceEdges:0, outputChunks:0, outputChars:0 };
    this.runs.set(input.traceId, run); while(this.runs.size>200)this.runs.delete(this.runs.keys().next().value!);
    const span=trace.getTracer('google-adk-agent').startSpan('google.adk.agent.run',{attributes:{'gen_ai.system':'google_adk','gen_ai.request.model':input.model,'session.id':input.conversationId,'question.characters':input.questionChars}}); this.spans.set(input.traceId,span);
  }
  evidence(traceId:string,evidence:Evidence){const run=this.runs.get(traceId);if(!run)return;run.evidenceNodes=evidence.nodes.length;run.evidenceEdges=evidence.edges.length;this.spans.get(traceId)?.setAttributes({'adk.evidence.nodes':run.evidenceNodes,'adk.evidence.edges':run.evidenceEdges,'adk.retrieval.duration_ms':evidence.elapsedMs});}
  chunk(traceId:string,value:string){const run=this.runs.get(traceId);if(!run)return;run.outputChunks++;run.outputChars+=value.length;}
  complete(traceId:string){this.finish(traceId,'COMPLETED');}
  fail(traceId:string,error:string){const span=this.spans.get(traceId);span?.recordException(error);span?.setStatus({code:SpanStatusCode.ERROR,message:error});this.finish(traceId,'FAILED',error);}
  private finish(traceId:string,status:'COMPLETED'|'FAILED',error?:string){const run=this.runs.get(traceId);if(!run)return;run.status=status;run.error=error;run.completedAt=new Date().toISOString();run.durationMs=Date.parse(run.completedAt)-Date.parse(run.startedAt);const span=this.spans.get(traceId);span?.setAttributes({'adk.output.chunks':run.outputChunks,'adk.output.characters':run.outputChars,'adk.run.duration_ms':run.durationMs});span?.end();this.spans.delete(traceId);}
  snapshot(){const runs=[...this.runs.values()].reverse();const completed=runs.filter(r=>r.status==='COMPLETED');const failed=runs.filter(r=>r.status==='FAILED');return{generatedAt:new Date().toISOString(),scope:'google-adk-agent-only',summary:{runs:runs.length,running:runs.filter(r=>r.status==='RUNNING').length,completed:completed.length,failed:failed.length,averageDurationMs:completed.length?Math.round(completed.reduce((sum,r)=>sum+(r.durationMs??0),0)/completed.length):0,totalOutputChars:runs.reduce((sum,r)=>sum+r.outputChars,0)},runs};}
}
export const adkTelemetry = new AdkTelemetryService();

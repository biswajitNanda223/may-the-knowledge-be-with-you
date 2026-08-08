import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  NEO4J_URI: z.string().default('neo4j://localhost:7687'),
  NEO4J_USERNAME: z.string().default('neo4j'),
  NEO4J_PASSWORD: z.string().default('local-development-password'),
  NEO4J_DATABASE: z.string().default('neo4j'),
  TELEMETRY_PUBLIC_ENABLED: z.string().default('true').transform(v => v === 'true'),
  GOOGLE_GENAI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  AGENT_STRATEGY: z.enum(['adk', 'mock']).default('mock'),
  GRAPH_PAGE_SIZE: z.coerce.number().int().min(1).max(100).default(50),
  GRAPH_MAX_PAGE_SIZE: z.coerce.number().int().min(1).max(250).default(100),
  GRAPH_MAX_DEPTH: z.coerce.number().int().min(1).max(3).default(2),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(10_485_760)
});
export type AppConfig = z.infer<typeof schema>;
export const config = schema.parse(process.env);

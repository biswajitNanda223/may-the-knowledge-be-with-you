import { buildApp } from './app.js';
import { config } from './config.js';
import { driver } from './infra/neo4j.js';
const app = await buildApp();
const shutdown = async () => { await app.close(); await driver.close(); process.exit(0); };
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
await app.listen({ host: config.API_HOST, port: config.API_PORT });


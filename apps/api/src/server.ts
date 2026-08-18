import { telemetrySdk } from "./telemetry/bootstrap.js";
import { buildApp } from "./app.js";
import { config } from "./config.js";
import { driver } from "./infra/neo4j.js";
import { prisma } from "./infra/prisma.js";
const app = await buildApp();
const shutdown = async () => {
  await app.close();
  await Promise.all([
    driver.close(),
    prisma.$disconnect(),
    telemetrySdk?.shutdown(),
  ]);
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
await app.listen({ host: config.API_HOST, port: config.API_PORT });

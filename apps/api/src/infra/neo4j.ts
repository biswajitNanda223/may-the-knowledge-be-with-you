import neo4j, {
  type Driver,
  type EagerResult,
  type RecordShape,
} from "neo4j-driver";
import { config } from "../config.js";

export const driver: Driver = neo4j.driver(
  config.NEO4J_URI,
  neo4j.auth.basic(config.NEO4J_USERNAME, config.NEO4J_PASSWORD),
  { maxConnectionPoolSize: 50, connectionAcquisitionTimeout: 5_000 },
);
export async function read<T extends RecordShape>(
  cypher: string,
  params: Record<string, unknown>,
) {
  return driver.executeQuery(cypher, params, {
    database: config.NEO4J_DATABASE,
    routing: "READ",
  }) as Promise<EagerResult<T>>;
}
export async function write<T extends RecordShape>(
  cypher: string,
  params: Record<string, unknown>,
) {
  return driver.executeQuery(cypher, params, {
    database: config.NEO4J_DATABASE,
    routing: "WRITE",
  }) as Promise<EagerResult<T>>;
}

import { resolve } from "node:path";
import { importOntology } from "../services/ontology-importer.js";
import { driver } from "../infra/neo4j.js";
const file = resolve(process.argv[2] ?? "../../data/raw/ontology1.xlsx");
try {
  console.log(await importOntology(file));
} finally {
  await driver.close();
}

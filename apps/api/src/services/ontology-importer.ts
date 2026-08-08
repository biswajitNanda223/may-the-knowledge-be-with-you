import * as XLSX from 'xlsx';
import { write } from '../infra/neo4j.js';

type Row = Record<string, string | number | undefined>;
const text = (v: unknown) => v == null ? '' : String(v).trim();
const rows = (book: XLSX.WorkBook, sheet: string): Row[] => XLSX.utils.sheet_to_json<Row>(book.Sheets[sheet]!, { defval: '' });

export async function importOntology(path: string) {
  const book = XLSX.readFile(path);
  const entities = rows(book, 'Entities').map(r => ({ id: text(r.Entity_ID), name: text(r.Entity_Name), category: text(r.Category), description: text(r.Description), owner: text(r.Owner), criticality: text(r.Criticality) })).filter(x => x.id);
  const relationships = rows(book, 'Relationships').map((r, i) => ({ id: `REL_${i + 1}`, from: text(r.From), to: text(r.To), type: text(r.Relationship).replace(/[^A-Za-z0-9_]/g, '_').toUpperCase(), cardinality: text(r.Cardinality), description: text(r.Description) })).filter(x => x.from && x.to);
  const processes = rows(book, 'Processes').map((r, i) => ({ id: `PROCESS_${i + 1}`, name: `${text(r.Process)} · ${text(r.Step)}`, process: text(r.Process), stepNo: Number(r.Step_No), nextStep: text(r.Next_Step), owner: text(r.Owner), description: text(r.Description) }));
  const systems = rows(book, 'Systems').map((r, i) => ({ id: `SYSTEM_LINK_${i + 1}`, entityId: text(r.Entity), name: text(r.Source_System), table: text(r.Table), primaryKey: text(r.Primary_Key) }));
  const rules = rows(book, 'BusinessRules').map(r => ({ id: text(r.Rule_ID), name: text(r.Rule), appliesTo: text(r.Applies_To), severity: text(r.Severity), description: text(r.Description) }));
  const glossary = rows(book, 'BusinessGlossary').map(r => ({ id: `TERM_${text(r.Acronym)}`, name: text(r.Acronym), meaning: text(r.Meaning) }));

  await write('CREATE CONSTRAINT ontology_id IF NOT EXISTS FOR (n:OntologyNode) REQUIRE n.id IS UNIQUE', {});
  await write('CREATE INDEX ontology_name IF NOT EXISTS FOR (n:OntologyNode) ON (n.name)', {});
  await write(`UNWIND $rows AS row MERGE (n:OntologyNode:Entity {id:row.id}) SET n += row, n.source='ontology1.xlsx'`, { rows: entities });
  for (const rel of relationships) await write(`MATCH (a:OntologyNode {id:$from}),(b:OntologyNode {id:$to}) MERGE (a)-[r:${rel.type} {sourceId:$id}]->(b) SET r.cardinality=$cardinality,r.description=$description,r.fromId=$from,r.toId=$to`, rel);
  await write(`UNWIND $rows AS row MERGE (n:OntologyNode:ProcessStep {id:row.id}) SET n += row, n.source='ontology1.xlsx'`, { rows: processes });
  await write(`UNWIND $rows AS row MERGE (s:OntologyNode:System {id:'SYSTEM_'+replace(toUpper(row.name),' ','_')}) SET s.name=row.name,s.source='ontology1.xlsx' WITH s,row MATCH (e:OntologyNode {id:row.entityId}) MERGE (e)-[r:IMPLEMENTED_IN]->(s) SET r.table=row.table,r.primaryKey=row.primaryKey,r.fromId=e.id,r.toId=s.id`, { rows: systems });
  await write(`UNWIND $rows AS row MERGE (n:OntologyNode:BusinessRule {id:row.id}) SET n += row,n.source='ontology1.xlsx' WITH n,row UNWIND split(row.appliesTo,' / ') AS entityId OPTIONAL MATCH (e:OntologyNode {id:trim(entityId)}) FOREACH (_ IN CASE WHEN e IS NULL THEN [] ELSE [1] END | MERGE (n)-[r:APPLIES_TO]->(e) SET r.fromId=n.id,r.toId=e.id)`, { rows: rules });
  await write(`UNWIND $rows AS row MERGE (n:OntologyNode:GlossaryTerm {id:row.id}) SET n += row,n.source='ontology1.xlsx'`, { rows: glossary });
  return { entities: entities.length, relationships: relationships.length, processes: processes.length, systems: systems.length, rules: rules.length, glossary: glossary.length };
}


import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Dataset } from "./schema.js";

const dataPath = resolve(import.meta.dirname!, "..", "data", "records.json");
const raw = JSON.parse(readFileSync(dataPath, "utf-8"));

const result = Dataset.safeParse(raw);

if (!result.success) {
  console.error("Validation failed:\n");
  for (const issue of result.error.issues) {
    console.error(`  [${issue.path.join(".")}] ${issue.message}`);
  }
  process.exit(1);
}

const ids = new Set<string>();
for (const record of result.data) {
  if (ids.has(record.id)) {
    console.error(`Duplicate id: ${record.id}`);
    process.exit(1);
  }
  ids.add(record.id);
}

console.log(`Valid. ${result.data.length} records, 0 issues.`);

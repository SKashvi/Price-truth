import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Dataset } from "./schema.js";
import { SERVICE_LABELS, MIN_RECORDS_FOR_MEDIAN, type ServiceType } from "./config.js";

const dataPath = resolve(import.meta.dirname!, "..", "data", "records.json");
const raw = JSON.parse(readFileSync(dataPath, "utf-8"));
const records = Dataset.parse(raw);

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

function quartiles(sorted: number[]): { q1: number; median: number; q3: number } {
  const med = median(sorted);
  const lower = sorted.slice(0, Math.floor(sorted.length / 2));
  const upper = sorted.slice(Math.ceil(sorted.length / 2));
  return { q1: median(lower), median: med, q3: median(upper) };
}

export function computeStats(records: { serviceType: string; priceInr: number; cityArea: string }[]) {
  const byService = new Map<string, number[]>();
  const byArea = new Map<string, number[]>();

  for (const r of records) {
    if (!byService.has(r.serviceType)) byService.set(r.serviceType, []);
    byService.get(r.serviceType)!.push(r.priceInr);
    if (!byArea.has(r.cityArea)) byArea.set(r.cityArea, []);
    byArea.get(r.cityArea)!.push(r.priceInr);
  }

  return { byService, byArea };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { byService, byArea } = computeStats(records);

  console.log("=== By Service Type ===\n");
  for (const [type, prices] of byService) {
    const sorted = [...prices].sort((a, b) => a - b);
    const label = SERVICE_LABELS[type as ServiceType] ?? type;
    if (sorted.length < MIN_RECORDS_FOR_MEDIAN) {
      console.log(`${label}: ${sorted.length} records (not enough data for median)`);
      console.log(`  observations: ${sorted.join(", ")}\n`);
    } else {
      const q = quartiles(sorted);
      console.log(`${label}: n=${sorted.length}`);
      console.log(`  median: ₹${q.median}  IQR: ₹${q.q1}–₹${q.q3}\n`);
    }
  }

  console.log("=== By Area ===\n");
  for (const [area, prices] of byArea) {
    const sorted = [...prices].sort((a, b) => a - b);
    if (sorted.length < MIN_RECORDS_FOR_MEDIAN) {
      console.log(`${area}: ${sorted.length} records (not enough data for median)`);
      console.log(`  observations: ${sorted.join(", ")}\n`);
    } else {
      const q = quartiles(sorted);
      console.log(`${area}: n=${sorted.length}`);
      console.log(`  median: ₹${q.median}  IQR: ₹${q.q1}–₹${q.q3}\n`);
    }
  }
}

export { median, quartiles };

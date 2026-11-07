import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Dataset } from "../src/schema.js";

describe("records.json validation", () => {
  const dataPath = resolve(import.meta.dirname!, "..", "data", "records.json");
  const raw = JSON.parse(readFileSync(dataPath, "utf-8"));

  it("parses successfully against the schema", () => {
    const result = Dataset.safeParse(raw);
    if (!result.success) {
      console.error(result.error.issues);
    }
    expect(result.success).toBe(true);
  });

  it("contains no duplicate IDs", () => {
    const ids = raw.map((r: { id: string }) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has at least 20 records", () => {
    expect(raw.length).toBeGreaterThanOrEqual(20);
  });

  it("every record has a sourceType field", () => {
    for (const r of raw) {
      expect(r.sourceType).toBeDefined();
      expect(["self-reported", "operator-collected", "published-rate-card"]).toContain(r.sourceType);
    }
  });
});

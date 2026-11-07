import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Dataset } from "../src/schema.js";

const FIXTURE_PATH = resolve(import.meta.dirname!, "..", "data", "fixtures", "records.sample.json");
const PUBLISHED_PATH = resolve(import.meta.dirname!, "..", "data", "records.json");

function loadFixtureRecords() {
  const raw = JSON.parse(readFileSync(FIXTURE_PATH, "utf-8"));
  return raw.records;
}

describe("fixture records validation", () => {
  const records = loadFixtureRecords();

  it("parses successfully against the schema", () => {
    const result = Dataset.safeParse(records);
    if (!result.success) {
      console.error(result.error.issues);
    }
    expect(result.success).toBe(true);
  });

  it("contains no duplicate IDs", () => {
    const ids = records.map((r: { id: string }) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has at least 20 records", () => {
    expect(records.length).toBeGreaterThanOrEqual(20);
  });

  it("every record has a sourceType field", () => {
    for (const r of records) {
      expect(r.sourceType).toBeDefined();
      expect(["self-reported", "operator-collected", "published-rate-card"]).toContain(r.sourceType);
    }
  });
});

describe("published records.json", () => {
  const raw = JSON.parse(readFileSync(PUBLISHED_PATH, "utf-8"));

  it("is a valid schema-conformant array", () => {
    const result = Dataset.safeParse(raw);
    expect(result.success).toBe(true);
  });

  it("contains no record with the synthetic marker ID prefix", () => {
    for (const r of raw) {
      expect(r.id).not.toMatch(/^sample-/);
    }
  });
});

describe("fixture file is clearly marked synthetic", () => {
  const raw = JSON.parse(readFileSync(FIXTURE_PATH, "utf-8"));

  it("has _synthetic: true at the top level", () => {
    expect(raw._synthetic).toBe(true);
  });

  it("has a _description explaining it is not real data", () => {
    expect(raw._description).toBeDefined();
    expect(raw._description.toLowerCase()).toContain("sample");
  });
});

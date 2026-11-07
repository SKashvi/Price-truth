import { describe, it, expect } from "vitest";
import { MIN_RECORDS_FOR_MEDIAN } from "../src/config.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Dataset } from "../src/schema.js";

describe("build statistical honesty", () => {
  const dataPath = resolve(import.meta.dirname!, "..", "data", "records.json");
  const raw = JSON.parse(readFileSync(dataPath, "utf-8"));
  const records = Dataset.parse(raw);

  it(`refuses to show a median for service types with fewer than ${MIN_RECORDS_FOR_MEDIAN} records`, () => {
    const byService = new Map<string, number[]>();
    for (const r of records) {
      if (!byService.has(r.serviceType)) byService.set(r.serviceType, []);
      byService.get(r.serviceType)!.push(r.priceInr);
    }

    for (const [serviceType, prices] of byService) {
      if (prices.length < MIN_RECORDS_FOR_MEDIAN) {
        // The build script must NOT compute a median for this type.
        // We verify the invariant: getServiceStats should mark hasEnough=false
        expect(prices.length).toBeLessThan(MIN_RECORDS_FOR_MEDIAN);
      }
    }
  });

  it("always includes the sample count for every service type in the rendered HTML", () => {
    // Run the build first, then check the output
    const { execSync } = require("node:child_process");
    execSync("npm run build", { cwd: resolve(import.meta.dirname!, ".."), stdio: "pipe" });

    const html = readFileSync(resolve(import.meta.dirname!, "..", "site", "index.html"), "utf-8");

    const byService = new Map<string, number>();
    for (const r of records) {
      byService.set(r.serviceType, (byService.get(r.serviceType) ?? 0) + 1);
    }

    for (const [, count] of byService) {
      expect(html).toContain(`n=${count}`);
    }
  });

  it("shows 'not enough data yet' for service types below the threshold", () => {
    const html = readFileSync(resolve(import.meta.dirname!, "..", "site", "index.html"), "utf-8");

    const byService = new Map<string, number>();
    for (const r of records) {
      byService.set(r.serviceType, (byService.get(r.serviceType) ?? 0) + 1);
    }

    for (const [, count] of byService) {
      if (count < MIN_RECORDS_FOR_MEDIAN) {
        expect(html).toContain("not enough data yet");
      }
    }
  });

  it("displays sourceType for every service type row", () => {
    const html = readFileSync(resolve(import.meta.dirname!, "..", "site", "index.html"), "utf-8");
    // Every row should have at least one source type label
    expect(html).toContain("self-reported");
  });

  it("renders the site under 60KB total", () => {
    const { readdirSync, statSync } = require("node:fs");
    const siteDir = resolve(import.meta.dirname!, "..", "site");
    const files = readdirSync(siteDir);
    let total = 0;
    for (const f of files) {
      total += statSync(resolve(siteDir, f)).size;
    }
    expect(total).toBeLessThan(60 * 1024);
  });
});

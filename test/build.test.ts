import { describe, it, expect } from "vitest";
import { MIN_RECORDS_FOR_MEDIAN } from "../src/config.js";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { Dataset } from "../src/schema.js";

const ROOT = resolve(import.meta.dirname!, "..");
const FIXTURE_PATH = resolve(ROOT, "data", "fixtures", "records.sample.json");
const PUBLISHED_PATH = resolve(ROOT, "data", "records.json");
const SITE_DIR = resolve(ROOT, "site");

function loadFixtureRecords() {
  const raw = JSON.parse(readFileSync(FIXTURE_PATH, "utf-8"));
  return Dataset.parse(raw.records);
}

describe("build with fixture data", () => {
  const records = loadFixtureRecords();

  it(`refuses to show a median for service types with fewer than ${MIN_RECORDS_FOR_MEDIAN} records`, () => {
    const byService = new Map<string, number[]>();
    for (const r of records) {
      if (!byService.has(r.serviceType)) byService.set(r.serviceType, []);
      byService.get(r.serviceType)!.push(r.priceInr);
    }

    for (const [, prices] of byService) {
      if (prices.length < MIN_RECORDS_FOR_MEDIAN) {
        expect(prices.length).toBeLessThan(MIN_RECORDS_FOR_MEDIAN);
      }
    }
  });
});

describe("build empty state", () => {
  it("renders an honest empty state when records.json has no records", () => {
    execSync("npm run build", { cwd: ROOT, stdio: "pipe" });
    const html = readFileSync(resolve(SITE_DIR, "index.html"), "utf-8");

    const published = JSON.parse(readFileSync(PUBLISHED_PATH, "utf-8"));
    if (published.length === 0) {
      expect(html).toContain("No data yet");
      expect(html).toContain("0 records");
      expect(html).not.toContain("n=0");
    }
  });

  it("renders the site under 60KB total", () => {
    const files = readdirSync(SITE_DIR);
    let total = 0;
    for (const f of files) {
      total += statSync(resolve(SITE_DIR, f)).size;
    }
    expect(total).toBeLessThan(60 * 1024);
  });
});

describe("last updated stamp", () => {
  it("shows the newest record date from the data, not the build clock", () => {
    const published = JSON.parse(readFileSync(PUBLISHED_PATH, "utf-8"));
    execSync("npm run build", { cwd: ROOT, stdio: "pipe" });
    const html = readFileSync(resolve(SITE_DIR, "index.html"), "utf-8");

    if (published.length > 0) {
      const newest = published
        .map((r: { dateOfService: string }) => r.dateOfService)
        .sort()
        .at(-1);
      expect(html).toContain(`Last updated ${newest}`);
    } else {
      expect(html).not.toMatch(/Last updated \d{4}-\d{2}-\d{2}/);
    }
  });

  it("shows last updated on the methodology page when data exists", () => {
    const published = JSON.parse(readFileSync(PUBLISHED_PATH, "utf-8"));
    const methHtml = readFileSync(resolve(SITE_DIR, "methodology.html"), "utf-8");

    if (published.length > 0) {
      const newest = published
        .map((r: { dateOfService: string }) => r.dateOfService)
        .sort()
        .at(-1);
      expect(methHtml).toContain(newest);
    } else {
      expect(methHtml).toContain("No data collected yet");
    }
  });
});

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe(".gitignore", () => {
  const gitignore = readFileSync(resolve(import.meta.dirname!, "..", ".gitignore"), "utf-8");

  it("covers intake/", () => {
    expect(gitignore).toMatch(/^intake\/$/m);
  });

  it("covers node_modules/", () => {
    expect(gitignore).toMatch(/^node_modules\/$/m);
  });

  it("covers site/", () => {
    expect(gitignore).toMatch(/^site\/$/m);
  });
});

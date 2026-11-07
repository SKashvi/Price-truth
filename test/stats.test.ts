import { describe, it, expect } from "vitest";
import { median, quartiles } from "../src/stats.js";

describe("median", () => {
  it("returns the middle value for odd-length arrays", () => {
    expect(median([1, 2, 3])).toBe(2);
    expect(median([10, 20, 30, 40, 50])).toBe(30);
  });

  it("returns the average of two middle values for even-length arrays", () => {
    expect(median([1, 2, 3, 4])).toBe(3); // (2+3)/2 rounded
    expect(median([100, 200, 300, 400])).toBe(250);
  });
});

describe("quartiles", () => {
  it("computes Q1, median, Q3 for a 5-element set", () => {
    const q = quartiles([100, 200, 300, 400, 500]);
    expect(q.median).toBe(300);
    expect(q.q1).toBe(150);
    expect(q.q3).toBe(450);
  });

  it("computes quartiles for a larger set", () => {
    const q = quartiles([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(q.median).toBe(5); // (4+5)/2 rounded
    expect(q.q1).toBe(3); // median of [1,2,3,4] = (2+3)/2
    expect(q.q3).toBe(7); // median of [5,6,7,8] = (6+7)/2
  });
});

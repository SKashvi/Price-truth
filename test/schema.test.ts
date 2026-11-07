import { describe, it, expect } from "vitest";
import { PriceRecord, Dataset, containsPersonalData } from "../src/schema.js";

const validRecord = {
  id: "test-001",
  serviceType: "plumber-visit" as const,
  cityArea: "Koramangala",
  priceInr: 500,
  dateOfService: "2024-12-01",
  sourceType: "self-reported" as const,
  confidence: "high" as const,
};

describe("PriceRecord schema", () => {
  it("accepts a valid record", () => {
    const result = PriceRecord.safeParse(validRecord);
    expect(result.success).toBe(true);
  });

  it("accepts a record with an optional note", () => {
    const result = PriceRecord.safeParse({ ...validRecord, note: "basic repair" });
    expect(result.success).toBe(true);
  });

  it("rejects a record with zero price", () => {
    const result = PriceRecord.safeParse({ ...validRecord, priceInr: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects a negative price", () => {
    const result = PriceRecord.safeParse({ ...validRecord, priceInr: -100 });
    expect(result.success).toBe(false);
  });

  it("rejects a non-integer price", () => {
    const result = PriceRecord.safeParse({ ...validRecord, priceInr: 499.5 });
    expect(result.success).toBe(false);
  });

  it("rejects a price above the service type upper bound", () => {
    const result = PriceRecord.safeParse({ ...validRecord, priceInr: 6000 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("upper bound"))).toBe(true);
    }
  });

  it("rejects an invalid service type", () => {
    const result = PriceRecord.safeParse({ ...validRecord, serviceType: "massage" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid date format", () => {
    const result = PriceRecord.safeParse({ ...validRecord, dateOfService: "12/01/2024" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty id", () => {
    const result = PriceRecord.safeParse({ ...validRecord, id: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty cityArea", () => {
    const result = PriceRecord.safeParse({ ...validRecord, cityArea: "" });
    expect(result.success).toBe(false);
  });
});

describe("personal data rejection", () => {
  it("rejects a note containing a phone number", () => {
    const result = PriceRecord.safeParse({
      ...validRecord,
      note: "Call 9876543210 for follow-up",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("phone number"))).toBe(true);
    }
  });

  it("rejects a note containing a phone number with spaces", () => {
    const result = PriceRecord.safeParse({
      ...validRecord,
      note: "Reach at +91 98765 43210",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a note containing an email address", () => {
    const result = PriceRecord.safeParse({
      ...validRecord,
      note: "contact: plumber@example.com",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("email"))).toBe(true);
    }
  });

  it("rejects a note containing a long digit string", () => {
    const result = PriceRecord.safeParse({
      ...validRecord,
      note: "receipt ref 123456",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("long digit string"))).toBe(true);
    }
  });

  it("rejects personal data in cityArea", () => {
    const result = PriceRecord.safeParse({
      ...validRecord,
      cityArea: "Call 9876543210",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("personal data"))).toBe(true);
    }
  });

  it("accepts a note with short numbers (amounts, flat numbers)", () => {
    const result = PriceRecord.safeParse({
      ...validRecord,
      note: "flat 302, 2BHK",
    });
    expect(result.success).toBe(true);
  });
});

describe("containsPersonalData utility", () => {
  it("detects phone numbers", () => {
    expect(containsPersonalData("call 9876543210")).not.toBeNull();
  });

  it("detects emails", () => {
    expect(containsPersonalData("user@example.com")).not.toBeNull();
  });

  it("detects long digit strings", () => {
    expect(containsPersonalData("ID: 123456789012")).not.toBeNull();
  });

  it("returns null for clean text", () => {
    expect(containsPersonalData("basic plumbing repair")).toBeNull();
  });
});

describe("Dataset", () => {
  it("accepts an array of valid records", () => {
    const result = Dataset.safeParse([validRecord, { ...validRecord, id: "test-002" }]);
    expect(result.success).toBe(true);
  });

  it("rejects if any record is invalid", () => {
    const result = Dataset.safeParse([validRecord, { ...validRecord, id: "", priceInr: -1 }]);
    expect(result.success).toBe(false);
  });
});

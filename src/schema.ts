import { z } from "zod";
import { SERVICE_TYPES, PRICE_UPPER_BOUNDS, type ServiceType } from "./config.js";

const PHONE_PATTERN = /(\+?\d[\d\s\-]{7,}\d)/;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
const LONG_DIGIT_PATTERN = /\d{6,}/;

export const SourceType = z.enum(["self-reported", "operator-collected", "published-rate-card"]);
export type SourceType = z.infer<typeof SourceType>;

export const Confidence = z.enum(["high", "medium", "low"]);
export type Confidence = z.infer<typeof Confidence>;

export const ServiceTypeSchema = z.enum(SERVICE_TYPES);

function containsPersonalData(text: string): string | null {
  if (PHONE_PATTERN.test(text)) return "contains phone number";
  if (EMAIL_PATTERN.test(text)) return "contains email address";
  if (LONG_DIGIT_PATTERN.test(text)) return "contains long digit string (possible personal identifier)";
  return null;
}

export const PriceRecord = z.object({
  id: z.string().min(1),
  serviceType: ServiceTypeSchema,
  cityArea: z.string().min(1),
  priceInr: z.int().min(1),
  dateOfService: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD"),
  sourceType: SourceType,
  confidence: Confidence,
  note: z.string().optional(),
}).check(
  ctx => {
    const upperBound = PRICE_UPPER_BOUNDS[ctx.value.serviceType as ServiceType];
    if (ctx.value.priceInr > upperBound) {
      ctx.issues.push({
        message: `price ${ctx.value.priceInr} exceeds upper bound ${upperBound} for ${ctx.value.serviceType}`,
        path: ["priceInr"],
      });
    }
    if (ctx.value.note) {
      const violation = containsPersonalData(ctx.value.note);
      if (violation) {
        ctx.issues.push({
          message: `note ${violation}`,
          path: ["note"],
        });
      }
    }
    if (containsPersonalData(ctx.value.cityArea)) {
      ctx.issues.push({
        message: "cityArea contains personal data",
        path: ["cityArea"],
      });
    }
  }
);

export type PriceRecord = z.infer<typeof PriceRecord>;

export const Dataset = z.array(PriceRecord);

export { containsPersonalData };

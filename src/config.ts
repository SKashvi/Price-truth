export const CITY = "Lucknow";

export const SERVICE_TYPES = [
  "plumber-visit",
  "electrician-visit",
  "carpenter-visit",
  "house-cleaning",
  "ac-service",
  "pest-control",
  "painting-per-sqft",
  "washing-machine-repair",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

export const PRICE_UPPER_BOUNDS: Record<ServiceType, number> = {
  "plumber-visit": 5000,
  "electrician-visit": 5000,
  "carpenter-visit": 8000,
  "house-cleaning": 6000,
  "ac-service": 4000,
  "pest-control": 5000,
  "painting-per-sqft": 100,
  "washing-machine-repair": 8000,
};

export const SERVICE_LABELS: Record<ServiceType, string> = {
  "plumber-visit": "Plumber Visit",
  "electrician-visit": "Electrician Visit",
  "carpenter-visit": "Carpenter Visit",
  "house-cleaning": "House Cleaning",
  "ac-service": "AC Service",
  "pest-control": "Pest Control",
  "painting-per-sqft": "Painting (per sq ft)",
  "washing-machine-repair": "Washing Machine Repair",
};

export const MIN_RECORDS_FOR_MEDIAN = 5;

export const CONTRIBUTE_FORM_URL =
  "https://forms.gle/PLACEHOLDER_REPLACE_WITH_REAL_FORM";

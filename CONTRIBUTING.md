# Contributing

Price Truth collects reported prices for local home services in Lucknow. If you have paid for a service recently, your data point helps.

## What a usable submission contains

- **Service type** — one of: plumber visit, electrician visit, carpenter visit, house cleaning, AC service, pest control, painting (per sq ft), washing machine repair
- **Area** — the neighbourhood or locality where the service was performed (e.g. Hazratganj, Gomti Nagar, Aliganj)
- **Price paid** — the total amount in INR, as a whole number
- **Date of service** — when the work was done, as YYYY-MM-DD
- **Source type** — whether this is self-reported (you paid it), operator-collected (you gathered it from providers), or from a published rate card
- **Confidence** — high (verified or first-hand), medium (plausible but unverified), or low (approximate)
- **Note** (optional) — brief context about the scope of work (e.g. "2BHK deep clean", "split AC gas top-up")

## What will be stripped

Every submission is processed in a private `intake/` directory before anything is published. During processing, the following are removed:

- **Names** — no person's name is published, whether submitter, provider, or anyone else
- **Phone numbers** — detected automatically by pattern matching and rejected
- **Email addresses** — detected automatically and rejected
- **Business identifiers** — no company name, shop name, brand name, or registration number is published
- **Provider names** — this dataset reports what a service costs, not who charged it. Any mention of a specific provider is removed.
- **Long digit strings** — any sequence of 6 or more digits is rejected, as it may be a personal identifier (Aadhaar, PAN, account number)

These rules are enforced by automated validation. Records that contain personal data cannot be added to the published dataset.

## How to submit

Submit through the contribution form linked on the site. Alternatively, open a GitHub issue with the details listed above.

## Corrections

If you believe a published price is incorrect, open an issue using the "Correction" template. Include the record ID and your reasoning. Corrections are reviewed manually.

## Code contributions

The codebase is TypeScript. To work on it:

```bash
npm install
npm test        # run the test suite
npm run validate  # validate data/records.json
npm run build   # generate the static site
```

All changes must pass the test suite. The schema validation, personal data rules, and statistical honesty checks are enforced by tests and cannot be bypassed.

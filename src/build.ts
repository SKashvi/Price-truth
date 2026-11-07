import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Dataset, type PriceRecord } from "./schema.js";
import {
  SERVICE_LABELS,
  SERVICE_TYPES,
  MIN_RECORDS_FOR_MEDIAN,
  CITY,
  CONTRIBUTE_FORM_URL,
  type ServiceType,
} from "./config.js";
import { median, quartiles } from "./stats.js";

const ROOT = resolve(import.meta.dirname!, "..");
const DATA_PATH = resolve(ROOT, "data", "records.json");
const SITE_DIR = resolve(ROOT, "site");
const FONT_DIR = resolve(ROOT, "src", "fonts");

const raw = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
const records = Dataset.parse(raw);

interface ServiceStats {
  serviceType: ServiceType;
  label: string;
  prices: number[];
  sorted: number[];
  count: number;
  hasEnough: boolean;
  med?: number;
  q1?: number;
  q3?: number;
  min: number;
  max: number;
}

function getLastUpdated(records: PriceRecord[]): string | null {
  if (records.length === 0) return null;
  return records
    .map((r) => r.dateOfService)
    .sort()
    .at(-1)!;
}

function getServiceStats(): ServiceStats[] {
  const byService = new Map<ServiceType, number[]>();
  for (const r of records) {
    const st = r.serviceType as ServiceType;
    if (!byService.has(st)) byService.set(st, []);
    byService.get(st)!.push(r.priceInr);
  }

  const stats: ServiceStats[] = [];
  for (const st of SERVICE_TYPES) {
    const prices = byService.get(st);
    if (!prices || prices.length === 0) continue;
    const sorted = [...prices].sort((a, b) => a - b);
    const hasEnough = sorted.length >= MIN_RECORDS_FOR_MEDIAN;
    const entry: ServiceStats = {
      serviceType: st,
      label: SERVICE_LABELS[st],
      prices,
      sorted,
      count: sorted.length,
      hasEnough,
      min: sorted[0]!,
      max: sorted[sorted.length - 1]!,
    };
    if (hasEnough) {
      const q = quartiles(sorted);
      entry.med = q.median;
      entry.q1 = q.q1;
      entry.q3 = q.q3;
    }
    stats.push(entry);
  }
  return stats;
}

function getSourceBreakdown(records: PriceRecord[]): Map<string, Map<string, number>> {
  const breakdown = new Map<string, Map<string, number>>();
  for (const r of records) {
    if (!breakdown.has(r.serviceType)) breakdown.set(r.serviceType, new Map());
    const m = breakdown.get(r.serviceType)!;
    m.set(r.sourceType, (m.get(r.sourceType) ?? 0) + 1);
  }
  return breakdown;
}

function renderBandSvg(stat: ServiceStats, globalMin: number, globalMax: number): string {
  const W = 320;
  const H = 32;
  const PAD = 8;
  const usable = W - PAD * 2;
  const range = globalMax - globalMin || 1;

  function x(val: number): number {
    return PAD + ((val - globalMin) / range) * usable;
  }

  if (!stat.hasEnough) {
    const dots = stat.sorted
      .map(
        (p) =>
          `<circle cx="${x(p).toFixed(1)}" cy="${H / 2}" r="4" fill="var(--fg)" opacity="0.35"/>`
      )
      .join("\n    ");
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="${stat.label}: individual observations at ${stat.sorted.map((p) => "₹" + p).join(", ")}">
    ${dots}
  </svg>`;
  }

  const x1 = x(stat.q1!);
  const x3 = x(stat.q3!);
  const xm = x(stat.med!);
  const bandH = 12;
  const bandY = (H - bandH) / 2;

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="${stat.label}: median ₹${stat.med}, IQR ₹${stat.q1} to ₹${stat.q3}, ${stat.count} observations">
    <rect x="${x1.toFixed(1)}" y="${bandY}" width="${(x3 - x1).toFixed(1)}" height="${bandH}" rx="2" fill="var(--fg)" opacity="0.12"/>
    <line x1="${xm.toFixed(1)}" y1="${bandY - 2}" x2="${xm.toFixed(1)}" y2="${bandY + bandH + 2}" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`;
}

function sourceLabel(st: string): string {
  switch (st) {
    case "self-reported": return "self-reported";
    case "operator-collected": return "operator-collected";
    case "published-rate-card": return "rate card";
    default: return st;
  }
}

function renderSourceInfo(sources: Map<string, number> | undefined): string {
  if (!sources) return "";
  const parts: string[] = [];
  for (const [type, count] of sources) {
    parts.push(`${count} ${sourceLabel(type)}`);
  }
  return `<span class="sources">${parts.join(", ")}</span>`;
}

function sharedStyles(): string {
  return `@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('inter-400.woff2') format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('inter-600.woff2') format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('inter-700.woff2') format('woff2');
}

:root {
  --bg: #fafafa;
  --fg: #1a1a1a;
  --fg-muted: #666;
  --fg-faint: #999;
  --accent: #e55934;
  --border: #e5e5e5;
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --size-s: 0.75rem;
  --size-m: 0.9375rem;
  --size-l: 1.375rem;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #141414;
    --fg: #e8e8e8;
    --fg-muted: #aaa;
    --fg-faint: #777;
    --accent: #f0764a;
    --border: #333;
  }
}
:root[data-theme="dark"] {
  --bg: #141414;
  --fg: #e8e8e8;
  --fg-muted: #aaa;
  --fg-faint: #777;
  --accent: #f0764a;
  --border: #333;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font);
  font-size: var(--size-m);
  line-height: 1.5;
  color: var(--fg);
  background: var(--bg);
  padding: 0 16px;
  max-width: 640px;
  margin: 0 auto;
  -webkit-font-smoothing: antialiased;
}`;
}

function buildEmptyIndexHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Price Truth — ${CITY}</title>
  <meta name="description" content="What local services actually cost in ${CITY}. An open dataset — collecting data now.">
  <style>
${sharedStyles()}

header {
  padding: 2.5rem 0 1.5rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1.5rem;
}

h1 {
  font-size: var(--size-l);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.subtitle {
  color: var(--fg-muted);
  font-size: var(--size-s);
  margin-top: 0.25rem;
}

.empty-state {
  padding: 2rem 0;
}

.empty-state h2 {
  font-size: var(--size-m);
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.empty-state p {
  color: var(--fg-muted);
  font-size: var(--size-s);
  line-height: 1.6;
  margin-bottom: 0.75rem;
}

.empty-state ul {
  color: var(--fg-muted);
  font-size: var(--size-s);
  line-height: 1.6;
  padding-left: 1.25rem;
  margin-bottom: 0.75rem;
}

.empty-state a {
  color: var(--accent);
  text-decoration: none;
}

.empty-state a:hover {
  text-decoration: underline;
}

section {
  padding: 1.5rem 0;
  border-top: 1px solid var(--border);
}

section h2 {
  font-size: var(--size-m);
  font-weight: 600;
  margin-bottom: 0.5rem;
}

section p {
  color: var(--fg-muted);
  font-size: var(--size-s);
  line-height: 1.6;
  margin-bottom: 0.5rem;
}

section a {
  color: var(--accent);
  text-decoration: none;
}

section a:hover {
  text-decoration: underline;
}

footer {
  padding: 1.5rem 0;
  border-top: 1px solid var(--border);
  font-size: var(--size-s);
  color: var(--fg-faint);
}

footer a {
  color: var(--fg-faint);
  text-decoration: underline;
}
  </style>
</head>
<body>
  <header>
    <h1>Price Truth</h1>
    <p class="subtitle">What local services actually cost in ${CITY}. 0 records — collecting data now.</p>
  </header>

  <main>
    <div class="empty-state">
      <h2>No data yet</h2>
      <p>This index will show what local home services cost in ${CITY}, drawn from real reported prices. When enough records exist, each service type will display:</p>
      <ul>
        <li>The interquartile range — a horizontal band showing the middle 50% of prices</li>
        <li>The median, marked on the band</li>
        <li>The sample count and source breakdown</li>
      </ul>
      <p>No single "fair price" figure will ever be shown. A single number implies a precision this data does not have.</p>
      <p>Statistics are computed only when at least ${MIN_RECORDS_FOR_MEDIAN} records exist for a service type. Below that threshold, individual observations are shown as-is.</p>
    </div>

    <section id="contribute">
      <h2>Contribute</h2>
      <p>Paid for a local service recently? <a href="${CONTRIBUTE_FORM_URL}" target="_blank" rel="noopener">Report what you paid</a> — no names, no business details, just the price.</p>
    </section>

    <section id="methodology">
      <h2>Methodology</h2>
      <p>Each record is one reported price for a service in ${CITY}. Records come from three source types:</p>
      <p><strong>Self-reported</strong> — submitted directly by the person who paid.
      <strong>Operator-collected</strong> — gathered by someone surveying service providers.
      <strong>Published rate card</strong> — taken from a publicly posted price list.</p>
      <p>No personal data is collected or stored. No providers or businesses are named.</p>
      <p><a href="methodology.html">Full methodology</a></p>
    </section>
  </main>

  <footer>
    <p>Data: <a href="https://github.com/skashvi/price-truth">github.com/skashvi/price-truth</a></p>
  </footer>
</body>
</html>`;
}

function buildIndexHtml(stats: ServiceStats[], sourceBreakdown: Map<string, Map<string, number>>, lastUpdated: string): string {
  const allPrices = stats.flatMap((s) => s.sorted);
  const globalMin = Math.min(...allPrices);
  const globalMax = Math.max(...allPrices);

  const rows = stats
    .map((stat) => {
      const band = renderBandSvg(stat, globalMin, globalMax);
      const priceText = stat.hasEnough
        ? `<span class="price-range">₹${stat.q1}–₹${stat.q3}</span><span class="median-label">median <strong>₹${stat.med}</strong></span>`
        : `<span class="price-range">${stat.sorted.map((p) => "₹" + p).join(", ")}</span><span class="not-enough">not enough data yet</span>`;

      return `      <div class="row">
        <div class="row-label">${stat.label}</div>
        <div class="row-band">${band}</div>
        <div class="row-info">
          ${priceText}
          <span class="sample-count">n=${stat.count} · ${renderSourceInfo(sourceBreakdown.get(stat.serviceType))}</span>
        </div>
      </div>`;
    })
    .join("\n");

  const totalRecords = records.length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Price Truth — ${CITY}</title>
  <meta name="description" content="What local services actually cost in ${CITY}. Open data from ${totalRecords} reported prices.">
  <style>
${sharedStyles()}

header {
  padding: 2.5rem 0 1.5rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1.5rem;
}

h1 {
  font-size: var(--size-l);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.subtitle {
  color: var(--fg-muted);
  font-size: var(--size-s);
  margin-top: 0.25rem;
}

.row {
  padding: 1rem 0;
  border-bottom: 1px solid var(--border);
}

.row-label {
  font-size: var(--size-m);
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.row-band {
  margin: 0.375rem 0;
}

.row-info {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
  align-items: baseline;
}

.price-range {
  font-size: var(--size-l);
  font-weight: 700;
  letter-spacing: -0.01em;
}

.median-label {
  font-size: var(--size-s);
  color: var(--fg-muted);
}

.median-label strong {
  color: var(--accent);
  font-weight: 700;
}

.not-enough {
  font-size: var(--size-s);
  color: var(--fg-faint);
  font-style: italic;
}

.sample-count {
  font-size: var(--size-s);
  color: var(--fg-faint);
  width: 100%;
}

section {
  padding: 1.5rem 0;
}

section h2 {
  font-size: var(--size-m);
  font-weight: 600;
  margin-bottom: 0.5rem;
}

section p {
  color: var(--fg-muted);
  font-size: var(--size-s);
  line-height: 1.6;
  margin-bottom: 0.5rem;
}

section a {
  color: var(--accent);
  text-decoration: none;
}

section a:hover {
  text-decoration: underline;
}

footer {
  padding: 1.5rem 0;
  border-top: 1px solid var(--border);
  font-size: var(--size-s);
  color: var(--fg-faint);
}

footer a {
  color: var(--fg-faint);
  text-decoration: underline;
}
  </style>
</head>
<body>
  <header>
    <h1>Price Truth</h1>
    <p class="subtitle">What local services actually cost in ${CITY}. ${totalRecords} reported prices. Last updated ${lastUpdated}.</p>
  </header>

  <main>
${rows}

    <section id="contribute">
      <h2>Contribute</h2>
      <p>Paid for a local service recently? <a href="${CONTRIBUTE_FORM_URL}" target="_blank" rel="noopener">Report what you paid</a> — no names, no business details, just the price.</p>
    </section>

    <section id="methodology">
      <h2>Methodology</h2>
      <p>Each record is one reported price for a service in ${CITY}. Records come from three source types:</p>
      <p><strong>Self-reported</strong> — submitted directly by the person who paid.
      <strong>Operator-collected</strong> — gathered by someone surveying service providers.
      <strong>Published rate card</strong> — taken from a publicly posted price list.</p>
      <p>Confidence levels: <strong>high</strong> means verified or first-hand, <strong>medium</strong> means plausible but unverified, <strong>low</strong> means uncertain or approximate.</p>
      <p>The horizontal band for each service type shows the interquartile range (middle 50% of prices) with the median marked. We never show a single "fair price" figure because a single number implies a precision this data does not have. When fewer than ${MIN_RECORDS_FOR_MEDIAN} records exist, individual observations are shown instead of statistics.</p>
      <p>No personal data is collected or stored. No providers or businesses are named. This data tells you what a service costs, not who charges it.</p>
    </section>
  </main>

  <footer>
    <p>Data: <a href="https://github.com/skashvi/price-truth">github.com/skashvi/price-truth</a> · <a href="methodology.html">Full methodology</a></p>
  </footer>
</body>
</html>`;
}

function buildMethodologyHtml(lastUpdated: string | null): string {
  const lastUpdatedLine = lastUpdated
    ? `<p class="last-updated">Last updated from data collected on ${lastUpdated}.</p>`
    : `<p class="last-updated">No data collected yet.</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Methodology — Price Truth</title>
  <style>
${sharedStyles()}

body { line-height: 1.7; }

header { padding: 2.5rem 0 1rem; }
h1 { font-size: var(--size-l); font-weight: 600; letter-spacing: -0.02em; }
.back { font-size: var(--size-s); color: var(--accent); text-decoration: none; display: inline-block; margin-bottom: 0.5rem; }
.back:hover { text-decoration: underline; }

h2 {
  font-size: var(--size-m);
  font-weight: 600;
  margin: 1.5rem 0 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

p, li {
  color: var(--fg-muted);
  font-size: var(--size-s);
  line-height: 1.7;
  margin-bottom: 0.5rem;
}

.last-updated {
  color: var(--fg-faint);
  font-size: var(--size-s);
  margin-top: 0.25rem;
}

ul { padding-left: 1.25rem; }
strong { color: var(--fg); font-weight: 600; }

footer {
  padding: 1.5rem 0;
  border-top: 1px solid var(--border);
  margin-top: 1.5rem;
  font-size: var(--size-s);
  color: var(--fg-faint);
}
footer a { color: var(--fg-faint); }
  </style>
</head>
<body>
  <header>
    <a class="back" href="index.html">&larr; Back to prices</a>
    <h1>Methodology</h1>
    ${lastUpdatedLine}
  </header>

  <main>
    <h2>What this is</h2>
    <p>Price Truth publishes an open dataset of what local home services cost in ${CITY}. Each record is one reported price — what someone paid, or what was publicly listed, for a specific service type in a specific area.</p>
    <p>The city is ${CITY} because the operator lives there and can personally verify reported prices. Prices in a city the operator cannot visit cannot be checked against reality.</p>

    <h2>How records are collected</h2>
    <p>Records come from three sources, and every record carries its source type:</p>
    <ul>
      <li><strong>Self-reported:</strong> Submitted directly by the person who paid for the service. These are first-hand accounts.</li>
      <li><strong>Operator-collected:</strong> Gathered by someone surveying service providers or aggregating quotes. Not first-hand, but collected with intent.</li>
      <li><strong>Published rate card:</strong> Taken from a publicly posted price list. These reflect listed prices, which may differ from what people actually pay.</li>
    </ul>

    <h2>Confidence levels</h2>
    <ul>
      <li><strong>High:</strong> The price is verified or comes from a first-hand source. We have good reason to trust it.</li>
      <li><strong>Medium:</strong> The price is plausible but not independently verified. Typical of second-hand reports.</li>
      <li><strong>Low:</strong> The price is approximate, remembered roughly, or comes from an unreliable channel.</li>
    </ul>

    <h2>How statistics are computed</h2>
    <p>For service types with ${MIN_RECORDS_FOR_MEDIAN} or more records, we show the <strong>interquartile range</strong> (IQR) — the range between the 25th and 75th percentiles — and mark the <strong>median</strong>. The IQR represents the middle 50% of reported prices.</p>
    <p>We never show a single "fair price" or "average" because a single number implies a precision this data does not have. Prices vary by scope of work, area, timing, and other factors we cannot capture.</p>
    <p>For service types with fewer than ${MIN_RECORDS_FOR_MEDIAN} records, we show individual observations and a "not enough data yet" label. We do not compute or display statistics from small samples.</p>

    <h2>Privacy rules</h2>
    <p>No personal data is collected or stored in the dataset. This is enforced by automated validation:</p>
    <ul>
      <li>No names, phone numbers, email addresses, or long digit strings (such as ID numbers) are allowed in any field.</li>
      <li>No provider or business is ever named. This index reports what a service costs, not who charged it.</li>
      <li>The <code>intake/</code> directory where raw submissions are processed is private and gitignored.</li>
    </ul>

    <h2>What this data cannot tell you</h2>
    <ul>
      <li>It cannot tell you what you <em>should</em> pay. Prices depend on scope, quality, urgency, and negotiation.</li>
      <li>It cannot compare providers. No provider is identified.</li>
      <li>It cannot predict future prices. All observations are historical.</li>
      <li>Small sample sizes limit confidence. Always check the sample count.</li>
    </ul>
  </main>

  <footer>
    <p><a href="index.html">&larr; Back to prices</a></p>
  </footer>
</body>
</html>`;
}

// Build
mkdirSync(SITE_DIR, { recursive: true });

if (existsSync(FONT_DIR)) {
  for (const file of ["inter-400.woff2", "inter-600.woff2", "inter-700.woff2"]) {
    const src = resolve(FONT_DIR, file);
    if (existsSync(src)) {
      cpSync(src, resolve(SITE_DIR, file));
    }
  }
}

const lastUpdated = getLastUpdated(records);

if (records.length === 0) {
  writeFileSync(resolve(SITE_DIR, "index.html"), buildEmptyIndexHtml());
  writeFileSync(resolve(SITE_DIR, "methodology.html"), buildMethodologyHtml(null));
  console.log(`Built site to ${SITE_DIR}/`);
  console.log(`  index.html (empty state) + methodology.html`);
  console.log(`  0 records`);
} else {
  const stats = getServiceStats();
  const sourceBreakdown = getSourceBreakdown(records);

  for (const stat of stats) {
    if (!stat.hasEnough && stat.med !== undefined) {
      console.error(`BUG: median computed for ${stat.serviceType} with only ${stat.count} records`);
      process.exit(1);
    }
  }

  writeFileSync(resolve(SITE_DIR, "index.html"), buildIndexHtml(stats, sourceBreakdown, lastUpdated!));
  writeFileSync(resolve(SITE_DIR, "methodology.html"), buildMethodologyHtml(lastUpdated));
  console.log(`Built site to ${SITE_DIR}/`);
  console.log(`  index.html + methodology.html`);
  console.log(`  ${stats.length} service types, ${records.length} records`);
}

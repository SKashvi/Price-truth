# Data Dictionary

Every record in `data/records.json` represents one reported price for a local home service in Lucknow. This document defines each field, its allowed values, how it is collected, and what it does not mean.

## Fields

### id

- **Type:** string (non-empty)
- **Allowed values:** any unique string, typically `rec-NNN`
- **How collected:** assigned during intake processing
- **What it does not mean:** this is an internal identifier. It carries no information about the order of collection, the source, or the submitter.

### serviceType

- **Type:** string enum
- **Allowed values:** `plumber-visit`, `electrician-visit`, `carpenter-visit`, `house-cleaning`, `ac-service`, `pest-control`, `painting-per-sqft`, `washing-machine-repair`
- **How collected:** the submitter selects from the list above
- **What it does not mean:** the type describes the broad category, not the scope. A "plumber-visit" could be a leaking tap or a full bathroom refit. The price alone does not tell you what work was done.

### cityArea

- **Type:** string (non-empty)
- **Allowed values:** a neighbourhood or locality name within Lucknow (e.g. "Hazratganj", "Gomti Nagar", "Aliganj")
- **How collected:** the submitter names the area where the service was performed
- **What it does not mean:** this is a rough location, not an address. It identifies the general area for price comparison. It must never contain personal data.

### priceInr

- **Type:** positive integer
- **Allowed values:** 1 to an upper bound defined per service type (e.g. 5000 for plumber-visit, 8000 for carpenter-visit)
- **How collected:** the submitter reports the total amount paid in Indian Rupees
- **What it does not mean:** this is the amount paid for one instance of service. It does not include tips, material costs that were billed separately, or recurring charges. It is not normalised for scope of work.

### dateOfService

- **Type:** string, YYYY-MM-DD format
- **Allowed values:** any valid calendar date
- **How collected:** the submitter reports when the service was performed
- **What it does not mean:** this is the date of the service, not the date of submission. Dates are not independently verified.

### sourceType

- **Type:** string enum
- **Allowed values:** `self-reported`, `operator-collected`, `published-rate-card`
- **How collected:** set during intake based on how the price was obtained
- **What it does not mean:** see "Source types explained" below

### confidence

- **Type:** string enum
- **Allowed values:** `high`, `medium`, `low`
- **How collected:** assigned during intake based on the source's reliability
- **What it does not mean:** confidence describes our trust in the accuracy of this specific data point. It does not describe the quality of the service or the fairness of the price.

### note

- **Type:** string (optional)
- **Allowed values:** free text describing the scope or context of the service. Must not contain personal data: no names, phone numbers, email addresses, business identifiers, or long digit strings.
- **How collected:** the submitter may add context about what was done
- **What it does not mean:** notes are unstructured and unverified. They add context but are not systematically comparable across records.

## Source types explained

The three source types are not equally reliable and must always be shown separately.

**Self-reported** prices come directly from the person who paid. These are first-hand accounts and generally the most trustworthy source. However, they are subject to recall error (people may not remember the exact amount) and self-selection (people who feel they were overcharged may be more likely to report).

**Operator-collected** prices are gathered by someone surveying service providers or aggregating quotes from multiple sources. These are not first-hand. The collector may introduce systematic bias by surveying only certain providers, certain areas, or during certain seasons. The advantage is that they can cover providers who would not otherwise appear in self-reported data.

**Published rate card** prices are taken from publicly posted price lists. These reflect what providers advertise, not necessarily what people pay. Actual prices after negotiation, discounts, or add-on charges may differ significantly. Rate card prices tend to be higher than negotiated prices for some services and lower for others (when minimum charges apply).

Because these sources measure different things, they should never be averaged together without disclosure. The site always shows the source breakdown alongside every statistic.

## Known limits of this data

**Small samples.** Most service types will have few records, especially early on. Small samples are unreliable. The site enforces a minimum of 5 records before computing a median, but even 5 records can be misleading. Always check the sample count.

**Self-selection.** People who report prices are not a random sample of all people who pay for services. Those who feel they were overcharged, or those who are unusually price-conscious, may be overrepresented. This biases the data in unknown directions.

**Seasonal and situational variation.** Prices for the same service vary by season (AC repair peaks in summer), by urgency (emergency calls cost more), by the scope of work, and by negotiation. A single price is one data point from one situation.

**Negotiation.** Many service prices in Lucknow are negotiated. The reported price is the outcome of one negotiation, not a fixed market rate. Two people calling the same provider on the same day may pay different amounts.

**No provider identification.** No provider or business is ever named in this dataset. This means the data cannot be used to choose a provider, compare providers, or rate providers. It reports what a category of service costs, not who charges what.

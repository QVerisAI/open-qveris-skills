# Cross-market localization

## Contents

1. Identity
2. Period and accounting basis
3. Currency and units
4. Market-specific evidence
5. Cross-listing rules

## 1. Identity

Resolve an instrument using company name, security name, exchange, ticker, asset type, and stable identifier when available. Never assume that the same numeric ticker refers to the same instrument across exchanges.

Resolve identity through the QVeris reference CAPs and preserve exchange-qualified codes such as `600000.SH`, `000001.SZ`, or `0700.HK`. Distinguish ordinary shares, preferred shares, ETFs, depositary receipts, and indices. An audited Web document may corroborate identity but cannot replace CAP resolution for a security entering comparison or ranking.

## 2. Period and accounting basis

Record fiscal year-end and reporting basis:

- China Accounting Standards (`CAS`);
- International Financial Reporting Standards (`IFRS`);
- US GAAP;
- explicitly documented standardized, adjusted, or consensus definitions.

Do not assume EBITDA or adjusted earnings definitions are identical. For companies with different fiscal year-ends, use clearly labeled calendarized estimates or compare the latest aligned actual periods and disclose the limitation.

## 3. Currency and units

Preserve both raw and normalized values. Record:

- reporting currency;
- trading currency;
- FX rate, date, direction, and source;
- original and normalized units;
- rounding method.

Pay special attention to Chinese `万`, `亿元`, and per-share units. Never convert `亿元` to millions without storing the multiplier. Use a single presentation currency for a peer table only when the conversion is explicit and reversible.

## 4. Market-specific evidence

Preferred primary sources include:

- A-share: exchange announcements, CNINFO, issuer filings, CSRC materials;
- Hong Kong: HKEX filings and issuer reports;
- US: SEC EDGAR and issuer filings;
- cross-market: relevant primary regulator/exchange for each listing.

Use accepted standardized finance CAP rows for consistent peer fields and opened primary filings for document claims. Preserve both when they conflict, mark the claim `conflicted`, and do not silently choose one value.

## 5. Cross-listing rules

- Map A+H, ADR, and dual-class listings to one issuer while preserving separate securities.
- Avoid double-counting issuer revenue or market share.
- Use security-specific price, shares, and market capitalization.
- Reconcile depositary ratios for ADRs.
- State whether enterprise value is issuer-level and which security price/date is used.
- Treat suspended, delisted, recently listed, or materially reorganized securities as special cases.

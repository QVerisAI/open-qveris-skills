#!/usr/bin/env python3
"""Validate generated Markdown reports from the QVeris finance skills."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


REQUIRED_PATTERNS = [
    ("summary", re.compile(r"^#{1,3}\s+(Executive\s+Summary|Summary)\b", re.I | re.M)),
    ("data_quality", re.compile(r"^#{1,3}\s+Data Quality And Missing Fields\b", re.I | re.M)),
    ("trace_appendix", re.compile(r"^#{1,3}\s+Trace Appendix\b", re.I | re.M)),
    ("not_investment_advice", re.compile(r"Not investment advice\.", re.I)),
]

PROVIDER_PATTERNS = [
    "yahoo",
    "finnhub",
    "polygon",
    "alpha vantage",
    "eodhd",
    "fmp",
    "akshare",
    "snowball",
    "sina",
    "alpaca",
    "longbridge",
    "finviz",
    "yfinance",
]

MOJIBAKE_REGEXES = [
    re.compile("\ufffd"),
    re.compile("[\u9300-\u95ff]\\?"),
    re.compile("\u6d93\u5d9d|\u6d93\u6cc9|\u9435\u7522|\u93c8\u20ac|\u934b\u934b|\u95c7\u70fd"),
]

ADVICE_PATTERNS = [
    r"\btarget price\b",
    r"\bprice target\b",
    r"\bupside\b",
    r"\bdownside\b",
    r"\bbuy\b",
    r"\bsell\b",
    r"\brebalance\b",
    r"\boverweight\b",
    r"\bunderweight\b",
]

NEGATING_CONTEXT = re.compile(
    r"\b(no|not|do not|cannot|can't|without|suppress(?:ed)?|prohibit(?:ed)?|"
    r"missing|unavailable|avoid|refuse|insufficient|reject(?:ed)?|deny|denied|exclud(?:e|es|ed))\b|"
    r"not computable|not meaningful|context only|qualitative only|not as",
    re.I,
)

ALLOWED_QVERIS_TERMS = (
    "qveris_finance.",
    "qveris_finance capability",
    "qveris_trace",
    "qveris_internal",
    "qveris evidence",
    "qveris cap",
    "qveris route",
    "qveris payload",
    "qveris fields",
    "qveris validation",
)

REMOVED_CAP_ALIASES = (
    "qveris_finance.news_dedup_cluster",
    "news_dedup_cluster",
    "news.dedup_cluster",
    "qveris_finance.macro_actual_vs_forecast",
    "macro_actual_vs_forecast",
    "macro.actual_vs_forecast",
    "qveris_finance.flow_sector_capital",
    "flow_sector_capital",
    "flow.sector_capital",
)

POSITIVE_EVIDENCE_SECTIONS = {
    "evidence used",
    "factor table",
    "primary evidence",
}

SINGLE_BAR_MARKERS = (
    "one bar",
    "one-row",
    "one row",
    "single bar",
    "single-day",
    "fewer than 2",
    "fewer than two",
    "only 1",
)

MULTI_DAY_METRIC_TERMS = (
    "return",
    "trend",
    "correlation",
    "realized volatility",
    "volatility",
    "drawdown",
    "liquidity",
    "var",
)

WEAK_RELEVANCE_TERMS = (
    "academic",
    "technical article",
    "technical material",
    "weak relevance",
    "weak-relevance",
    "weak text match",
    "broad industry",
)

ENTITY_MIX_TERMS = (
    "gogo ai",
    "wrong entity",
    "different entity",
    "entity mix",
    "entity-mix",
)


def normalize_heading(line: str) -> str | None:
    match = re.match(r"^#{1,6}\s+(.+?)\s*$", line)
    if not match:
        return None
    heading = re.sub(r"\s+", " ", match.group(1).strip().lower())
    return heading


def line_has_allowed_context(line: str) -> bool:
    return bool(NEGATING_CONTEXT.search(line))


def contains_removed_cap(lower_line: str) -> bool:
    return any(alias in lower_line for alias in REMOVED_CAP_ALIASES)


def contains_mojibake(line: str) -> bool:
    return any(pattern.search(line) for pattern in MOJIBAKE_REGEXES)


def should_flag_single_bar_metric(lower_line: str, line: str) -> bool:
    has_bar_marker = any(marker in lower_line for marker in SINGLE_BAR_MARKERS)
    has_metric = any(term in lower_line for term in MULTI_DAY_METRIC_TERMS)
    return has_bar_marker and has_metric and not line_has_allowed_context(line)


def should_flag_entity_mix(lower_line: str, line: str) -> bool:
    if "gogo ai" not in lower_line and "wrong entity" not in lower_line:
        return False
    allowed = ("entity_mix", "entity-mix", "wrong entity", "rejected", "excluded", "different entity")
    return not any(term in lower_line for term in allowed) and not line_has_allowed_context(line)


def should_flag_weak_analyst(lower_line: str, line: str) -> bool:
    mentions_analyst = "analyst" in lower_line or "research_analyst_reports" in lower_line
    mentions_weak_material = any(term in lower_line for term in WEAK_RELEVANCE_TERMS)
    allowed = ("weak_relevance", "weak-relevance", "rejected", "not analyst", "not sell-side", "context only")
    return mentions_analyst and mentions_weak_material and not any(term in lower_line for term in allowed)


def should_flag_period_mismatch_dcf(lower_line: str, line: str) -> bool:
    mentions_dcf = "dcf" in lower_line or "model input" in lower_line
    mentions_cf = "fundamentals_cf" in lower_line or "cash flow" in lower_line or re.search(r"\bcf\b", lower_line)
    mentions_mismatch = (
        "period_mismatch" in lower_line
        or "period-mismatch" in lower_line
        or "period mismatched" in lower_line
        or "wrong period" in lower_line
        or "latest-quarter" in lower_line
    )
    return bool(mentions_dcf and mentions_cf and mentions_mismatch and not line_has_allowed_context(line))


def validate_text(text: str, label: str) -> list[str]:
    errors: list[str] = []

    for name, pattern in REQUIRED_PATTERNS:
        if not pattern.search(text):
            errors.append(f"{label}: missing required report element: {name}")

    if "qveris_finance." not in text:
        errors.append(f"{label}: trace should include at least one qveris_finance.* capability")

    current_section = ""
    for line_no, line in enumerate(text.splitlines(), start=1):
        heading = normalize_heading(line)
        if heading is not None:
            current_section = heading

        lower = line.lower()

        if "qveris_" in lower and not any(term in lower for term in ALLOWED_QVERIS_TERMS):
            errors.append(f"{label}:{line_no}: trace/prose contains non-finance QVeris tool name: {line.strip()}")

        for provider in PROVIDER_PATTERNS:
            if provider in lower:
                errors.append(f"{label}:{line_no}: possible provider leak: {provider}")

        if contains_mojibake(line):
            errors.append(f"{label}:{line_no}: possible mojibake/encoding artifact")

        for pattern in ADVICE_PATTERNS:
            if re.search(pattern, lower) and not line_has_allowed_context(line):
                errors.append(f"{label}:{line_no}: possible prohibited advice/action wording: {line.strip()}")
                break

        if current_section in POSITIVE_EVIDENCE_SECTIONS and contains_removed_cap(lower):
            errors.append(
                f"{label}:{line_no}: removed/unavailable CAP appears in positive evidence section: {line.strip()}"
            )

        if should_flag_single_bar_metric(lower, line):
            errors.append(f"{label}:{line_no}: one-bar payload appears to support multi-day metric: {line.strip()}")

        if should_flag_entity_mix(lower, line):
            errors.append(f"{label}:{line_no}: possible entity-mix evidence without rejection marker: {line.strip()}")

        if should_flag_weak_analyst(lower, line):
            errors.append(f"{label}:{line_no}: weak analyst/research material lacks rejection marker: {line.strip()}")

        if should_flag_period_mismatch_dcf(lower, line):
            errors.append(f"{label}:{line_no}: period-mismatched cash flow appears to feed DCF/model input: {line.strip()}")

    return errors


def validate_report(path: Path) -> list[str]:
    return validate_text(path.read_text(encoding="utf-8"), str(path))


def sample_report(body: str) -> str:
    return f"""# Summary

Evidence status: `partial`.

{body}

## Data Quality And Missing Fields

Rejected evidence is listed here.

## Trace Appendix

| qveris_finance capability | Status |
|---|---|
| `qveris_finance.ref_symbology` | success |

Not investment advice.
"""


def run_self_test() -> list[str]:
    good_report = """# Summary

Evidence status: `partial`.

## Evidence Used

| Evidence | Status | Use |
|---|---|---|
| Entity/profile | `complete` | `qveris_finance.ref_symbology` validated the issuer. |
| News context | `proxy_only` | Tagged news is qualitative only. |

## Data Quality And Missing Fields

- `news_dedup_cluster`: `not_called`, `capability_unavailable`.
- `GoGo AI`: `entity_mix`, rejected from sentiment evidence.
- One bar returned; no trend, return, volatility, or correlation is computed.
- `research_analyst_reports`: `weak_relevance`, rejected as analyst evidence.
- DCF excludes period-mismatched cash flow.

## Trace Appendix

| qveris_finance capability | Status |
|---|---|
| `qveris_finance.ref_symbology` | success |

Not investment advice.
"""

    bad_reports = {
        "mojibake": sample_report("\u6d93\u5d9d\u6cc9\u701b\u9388 / Not investment advice."),
        "removed_cap_evidence": """# Summary

Evidence status: `partial`.

## Evidence Used

| Evidence | Status |
|---|---|
| `qveris_finance.news_dedup_cluster` | complete evidence |

## Data Quality And Missing Fields

None.

## Trace Appendix

| qveris_finance capability | Status |
|---|---|
| `qveris_finance.news_fin_tagged` | success |

Not investment advice.
""",
        "entity_mix": sample_report("GoGo AI drove positive sentiment for GOGO."),
        "single_bar_metric": sample_report("One bar returned and the 30-day trend is positive."),
        "weak_analyst": sample_report("Research analyst reports include academic technical material used as core evidence."),
        "period_mismatch_dcf": sample_report("DCF model input uses period_mismatch cash flow from `fundamentals_cf`."),
    }

    errors: list[str] = []
    if validate_text(good_report, "self-test-good"):
        errors.append("self-test-good: expected pass but failed")

    for name, report in bad_reports.items():
        if not validate_text(report, f"self-test-{name}"):
            errors.append(f"self-test-{name}: expected failure but passed")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("reports", nargs="*", type=Path)
    parser.add_argument("--self-test", action="store_true", help="run built-in positive and negative validator cases")
    args = parser.parse_args()

    all_errors: list[str] = []

    if args.self_test:
        all_errors.extend(run_self_test())

    if not args.reports and not args.self_test:
        parser.error("provide at least one report path or --self-test")

    for report in args.reports:
        if not report.exists():
            all_errors.append(f"{report}: file does not exist")
            continue
        all_errors.extend(validate_report(report))

    if all_errors:
        for error in all_errors:
            print(error, file=sys.stderr)
        return 1

    if args.self_test:
        print("ok: self-test")
    for report in args.reports:
        print(f"ok: {report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

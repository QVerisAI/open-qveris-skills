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

MOJIBAKE_PATTERNS = ["涓", "鎴", "璧", "锛", "鈥", "�"]

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
    r"\b(no|not|do not|cannot|can't|without|suppress(?:ed)?|prohibit(?:ed)?|missing|unavailable|avoid|refuse)\b",
    re.I,
)


def line_has_allowed_advice_context(line: str) -> bool:
    return bool(NEGATING_CONTEXT.search(line))


def validate_report(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    errors: list[str] = []

    for name, pattern in REQUIRED_PATTERNS:
        if not pattern.search(text):
            errors.append(f"{path}: missing required report element: {name}")

    if "qveris_finance." not in text:
        errors.append(f"{path}: trace should include at least one qveris_finance.* capability")

    for line_no, line in enumerate(text.splitlines(), start=1):
        lower = line.lower()

        allowed_qveris_terms = (
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
        if "qveris_" in lower and not any(term in lower for term in allowed_qveris_terms):
            errors.append(f"{path}:{line_no}: trace/prose contains non-finance QVeris tool name: {line.strip()}")

        for provider in PROVIDER_PATTERNS:
            if provider in lower:
                errors.append(f"{path}:{line_no}: possible provider leak: {provider}")

        for marker in MOJIBAKE_PATTERNS:
            if marker in line:
                errors.append(f"{path}:{line_no}: possible mojibake/encoding artifact")
                break

        for pattern in ADVICE_PATTERNS:
            if re.search(pattern, lower) and not line_has_allowed_advice_context(line):
                errors.append(f"{path}:{line_no}: possible prohibited advice/action wording: {line.strip()}")
                break

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("reports", nargs="+", type=Path)
    args = parser.parse_args()

    all_errors: list[str] = []
    for report in args.reports:
        if not report.exists():
            all_errors.append(f"{report}: file does not exist")
            continue
        all_errors.extend(validate_report(report))

    if all_errors:
        for error in all_errors:
            print(error, file=sys.stderr)
        return 1

    for report in args.reports:
        print(f"ok: {report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

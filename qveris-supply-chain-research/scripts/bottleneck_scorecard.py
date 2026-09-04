#!/usr/bin/env python3
"""Local scorecard for QVeris-backed supply-chain bottleneck research.

This script scores a thesis after evidence has already been collected through QVeris.
It does not fetch data and must not be used as a substitute for source verification.
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any

WEIGHTS = {
    "demand_pressure": 15,
    "scarce_layer_control": 18,
    "supplier_concentration": 12,
    "expansion_difficulty": 12,
    "qveris_evidence_quality": 20,
    "valuation_disconnect": 11,
    "timing": 12,
}

PENALTY_WEIGHT = 2.0

TEMPLATE = {
    "ticker": "EXAMPLE",
    "company": "Example Co",
    "market": "US/HK/A-share/Taiwan/Japan/Korea/Europe",
    "layer": "advanced packaging equipment",
    "ratings": {key: 0 for key in WEIGHTS},
    "risk_penalties": {
        "financing_or_dilution": 0,
        "governance": 0,
        "geopolitics": 0,
        "liquidity": 0,
        "hype_risk": 0,
        "substitution_risk": 0,
    },
    "qveris_evidence": [
        {
            "claim": "",
            "capability": "",
            "source_type": "filing/financials/news/social/company_profile",
            "strength": "strong/medium/weak/needs_checking",
        }
    ],
    "what_could_weaken_view": ["", "", ""],
}


def read_json(path: str) -> dict[str, Any]:
    raw = sys.stdin.read() if path == "-" else open(path, "r", encoding="utf-8").read()
    data = json.loads(raw)
    if not isinstance(data, dict):
        raise SystemExit("Input must be a JSON object")
    return data


def rating(value: Any, label: str) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise SystemExit(f"{label} must be a number from 0 to 5") from None
    if number < 0 or number > 5:
        raise SystemExit(f"{label} must be from 0 to 5")
    return number


def score(data: dict[str, Any]) -> dict[str, Any]:
    ratings = data.get("ratings", {})
    penalties = data.get("risk_penalties", {})
    factor_points: dict[str, float] = {}
    raw_score = 0.0

    for key, weight in WEIGHTS.items():
        points = rating(ratings.get(key, 0), f"ratings.{key}") / 5 * weight
        factor_points[key] = round(points, 2)
        raw_score += points

    penalty_points = 0.0
    penalty_details: dict[str, float] = {}
    for key, value in penalties.items():
        points = rating(value, f"risk_penalties.{key}") * PENALTY_WEIGHT
        penalty_details[key] = round(points, 2)
        penalty_points += points

    final_score = max(0.0, min(100.0, raw_score - penalty_points))
    if final_score >= 82:
        verdict = "Top research priority"
    elif final_score >= 68:
        verdict = "High research priority"
    elif final_score >= 52:
        verdict = "Worth tracking"
    else:
        verdict = "Early lead or low priority"

    return {
        "ticker": data.get("ticker", ""),
        "company": data.get("company", ""),
        "market": data.get("market", ""),
        "layer": data.get("layer", ""),
        "final_score": round(final_score, 2),
        "verdict": verdict,
        "raw_factor_points": round(raw_score, 2),
        "penalty_points": round(penalty_points, 2),
        "factor_points": factor_points,
        "penalty_details": penalty_details,
        "qveris_evidence": data.get("qveris_evidence", []),
        "what_could_weaken_view": data.get("what_could_weaken_view", []),
    }


def markdown(result: dict[str, Any]) -> str:
    title = result.get("ticker") or "Unknown"
    company = result.get("company")
    if company:
        title += f" ({company})"

    lines = [
        f"# Bottleneck scorecard: {title}",
        "",
        f"Market: {result.get('market', '')}",
        f"Layer: {result.get('layer', '')}",
        f"Final score: **{result['final_score']} / 100**",
        f"Verdict: **{result['verdict']}**",
        f"Raw factor points: {result['raw_factor_points']}",
        f"Penalty points: {result['penalty_points']}",
        "",
        "## Factors",
        "| Factor | Points |",
        "|---|---:|",
    ]
    for key, value in result["factor_points"].items():
        lines.append(f"| {key} | {value} |")

    evidence = result.get("qveris_evidence") or []
    if evidence:
        lines.extend(["", "## QVeris evidence"])
        for item in evidence:
            if isinstance(item, dict):
                claim = item.get("claim", "")
                capability = item.get("capability", "")
                strength = item.get("strength", "")
                lines.append(f"- [{strength}] {claim} ({capability})")

    weaken = [str(item).strip() for item in result.get("what_could_weaken_view", []) if str(item).strip()]
    if weaken:
        lines.extend(["", "## What could weaken the view"])
        lines.extend(f"- {item}" for item in weaken)

    lines.append("")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Score a QVeris-backed bottleneck thesis")
    parser.add_argument("input", nargs="?")
    parser.add_argument("--template", action="store_true")
    parser.add_argument("--format", choices=["json", "md"], default="json")
    args = parser.parse_args()

    if args.template:
        print(json.dumps(TEMPLATE, ensure_ascii=False, indent=2))
        return
    if not args.input:
        parser.error("input is required unless --template is used")

    result = score(read_json(args.input))
    print(markdown(result) if args.format == "md" else json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

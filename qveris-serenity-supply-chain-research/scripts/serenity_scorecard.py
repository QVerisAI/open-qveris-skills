#!/usr/bin/env python3
"""Evidence-bound scorecard for QVeris Serenity research priorities.

The input contains the original ``validation_input`` consumed by
``serenity_validity.mjs``.  This script reruns that validator and refuses to
score a candidate unless the whole comparison pool is ranking-eligible.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

WEIGHTS = {
    "demand_pressure": 15,
    "system_coupling": 10,
    "scarcity_mechanism": 15,
    "supplier_concentration": 12,
    "expansion_difficulty": 12,
    "evidence_quality": 15,
    "valuation_context": 11,
    "event_visibility": 10,
}

PENALTIES = (
    "dilution_financing",
    "governance",
    "geopolitics",
    "liquidity",
    "hype_risk",
    "accounting_quality",
    "cyclicality",
    "alternative_design_risk",
)
PENALTY_MULTIPLIER = 2.0
VALIDITY_VERSION = "qveris.serenity-research-validity.v1"


def _factor_template() -> dict[str, Any]:
    return {key: {"rating": None, "evidence_ids": []} for key in WEIGHTS}


TEMPLATE = {
    "symbol": "EXAMPLE",
    "validation_input": {
        "as_of": "2026-01-31T16:00:00Z",
        "required_factors": list(WEIGHTS),
        "evidence": [],
        "layers": [],
        "candidates": [
            {
                "symbol": "EXAMPLE",
                "company": "Example Co",
                "market": "US",
                "coverage_tier": "complete_comparable",
                "window_start": "2025-01-01",
                "window_end": "2025-12-31",
                "fiscal_period": "FY2025",
                "measurement_basis": "reported",
                "currency_convention": "USD",
                "identity_evidence_ids": [],
                "factors": _factor_template(),
                "counterevidence_ids": [],
                "denominator_checks": [],
            }
        ],
        "publish_candidate_ranking": True,
    },
    "penalties": {key: {"rating": 0, "evidence_ids": []} for key in PENALTIES},
    "what_could_weaken_view": ["Add evidence-backed falsification condition"],
}


class ScorecardError(ValueError):
    """Raised when a scorecard is incomplete or not validity-approved."""


def _num_0_to_5(value: Any, label: str) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ScorecardError(f"{label} must be a number from 0 to 5") from None
    if number < 0 or number > 5:
        raise ScorecardError(f"{label} must be from 0 to 5; got {number}")
    return number


def _object(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ScorecardError(f"{label} must be an object")
    return value


def _exact_keys(value: dict[str, Any], expected: set[str], label: str) -> None:
    actual = set(value)
    if actual != expected:
        missing = sorted(expected - actual)
        extra = sorted(actual - expected)
        raise ScorecardError(f"{label} keys mismatch; missing={missing}, extra={extra}")


def _evidence_ids(
    record: dict[str, Any],
    accepted: dict[str, dict[str, Any]],
    label: str,
    *,
    required: bool,
    expected_symbol: str,
) -> list[str]:
    values = record.get("evidence_ids")
    if not isinstance(values, list) or any(not isinstance(item, str) or not item.strip() for item in values):
        raise ScorecardError(f"{label}.evidence_ids must be an array of non-empty strings")
    ids = list(dict.fromkeys(item.strip() for item in values))
    if required and not ids:
        raise ScorecardError(f"{label}.evidence_ids must be non-empty")
    unknown = sorted(set(ids) - accepted.keys())
    if unknown:
        raise ScorecardError(f"{label} references rejected or unknown evidence: {unknown}")
    mismatched = sorted(
        evidence_id for evidence_id in ids
        if accepted[evidence_id].get("symbol")
        and str(accepted[evidence_id]["symbol"]).strip().upper() != expected_symbol
    )
    if mismatched:
        raise ScorecardError(f"{label} references evidence for another security: {mismatched}")
    return ids


def load_input(path: str) -> dict[str, Any]:
    raw = sys.stdin.read() if path == "-" else Path(path).read_text(encoding="utf-8")
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON: {exc}") from exc
    if not isinstance(data, dict):
        raise SystemExit("Input JSON must be an object")
    return data


def run_validity(validation_input: dict[str, Any]) -> dict[str, Any]:
    validator = Path(__file__).with_name("serenity_validity.mjs")
    completed = subprocess.run(
        ["node", str(validator), "--input-json", json.dumps(validation_input, separators=(",", ":"))],
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        detail = completed.stderr.strip() or completed.stdout.strip() or "unknown validator failure"
        raise ScorecardError(f"validity validator failed: {detail}")
    try:
        result = json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        raise ScorecardError("validity validator returned invalid JSON") from exc
    if result.get("schema_version") != VALIDITY_VERSION:
        raise ScorecardError("validity validator returned an unsupported schema version")
    return result


def score(data: dict[str, Any]) -> dict[str, Any]:
    symbol = str(data.get("symbol", "")).strip().upper()
    if not symbol:
        raise ScorecardError("symbol is required")
    validation_input = _object(data.get("validation_input"), "validation_input")
    required_factors = validation_input.get("required_factors")
    if not isinstance(required_factors, list) or set(required_factors) != set(WEIGHTS) or len(required_factors) != len(WEIGHTS):
        raise ScorecardError("validation_input.required_factors must contain the exact scorecard factor set")

    validity = run_validity(validation_input)
    if validity.get("status") != "accepted" or validity.get("candidate_ranking_allowed") is not True:
        raise ScorecardError("candidate pool is not accepted for ranking")
    decisions = [
        item for item in validity.get("candidate_decisions", [])
        if isinstance(item, dict) and str(item.get("symbol", "")).upper() == symbol
    ]
    if len(decisions) != 1 or decisions[0].get("score_allowed") is not True:
        raise ScorecardError(f"{symbol} is not accepted for scoring")

    candidates = [
        item for item in validation_input.get("candidates", [])
        if isinstance(item, dict) and str(item.get("symbol", "")).upper() == symbol
    ]
    if len(candidates) != 1:
        raise ScorecardError(f"validation_input must contain exactly one candidate for {symbol}")
    candidate = candidates[0]
    factors = _object(candidate.get("factors"), f"candidate[{symbol}].factors")
    _exact_keys(factors, set(WEIGHTS), f"candidate[{symbol}].factors")

    evidence = validation_input.get("evidence")
    if not isinstance(evidence, list):
        raise ScorecardError("validation_input.evidence must be an array")
    accepted = {
        str(item.get("evidence_id")).strip(): item
        for item in evidence
        if isinstance(item, dict) and item.get("status") == "accepted" and str(item.get("evidence_id", "")).strip()
    }

    factor_details: dict[str, Any] = {}
    raw_points = 0.0
    for key, weight in WEIGHTS.items():
        record = _object(factors[key], f"factors.{key}")
        rating = _num_0_to_5(record.get("rating"), f"factors.{key}.rating")
        refs = _evidence_ids(record, accepted, f"factors.{key}", required=True, expected_symbol=symbol)
        points = rating / 5.0 * weight
        factor_details[key] = {
            "rating": rating,
            "weight": weight,
            "points": round(points, 2),
            "evidence_ids": refs,
        }
        raw_points += points

    penalties = _object(data.get("penalties"), "penalties")
    _exact_keys(penalties, set(PENALTIES), "penalties")
    penalty_details: dict[str, Any] = {}
    penalty_points = 0.0
    for key in PENALTIES:
        record = _object(penalties[key], f"penalties.{key}")
        rating = _num_0_to_5(record.get("rating"), f"penalties.{key}.rating")
        refs = _evidence_ids(record, accepted, f"penalties.{key}", required=rating > 0, expected_symbol=symbol)
        points = rating * PENALTY_MULTIPLIER
        penalty_details[key] = {"rating": rating, "points": round(points, 2), "evidence_ids": refs}
        penalty_points += points

    final_score = max(0.0, min(100.0, raw_points - penalty_points))
    if final_score >= 85:
        verdict = "Top research priority"
    elif final_score >= 70:
        verdict = "High research priority"
    elif final_score >= 55:
        verdict = "Worth tracking"
    else:
        verdict = "Early lead or low priority"

    return {
        "schema_version": "qveris.serenity-scorecard.v1",
        "symbol": symbol,
        "company": str(candidate.get("company", "")),
        "market": str(candidate.get("market", "")),
        "coverage_tier": candidate.get("coverage_tier"),
        "raw_factor_points": round(raw_points, 2),
        "penalty_points": round(penalty_points, 2),
        "final_score": round(final_score, 2),
        "verdict": verdict,
        "factor_details": factor_details,
        "penalty_details": penalty_details,
        "kill_switches": data.get("what_could_weaken_view", []),
        "validity": {
            "schema_version": validity["schema_version"],
            "status": validity["status"],
            "candidate_ranking_allowed": validity["candidate_ranking_allowed"],
            "comparable_candidate_count": validity["comparable_candidate_count"],
        },
        "disclaimer": "Not investment advice.",
    }


def to_markdown(result: dict[str, Any]) -> str:
    title = result["symbol"] + (f" ({result['company']})" if result.get("company") else "")
    lines = [
        f"# Bottleneck research scorecard: {title}", "",
        f"Market: {result.get('market', '')}",
        f"Coverage: {result.get('coverage_tier', '')}",
        f"Research-priority score: **{result['final_score']} / 100**",
        f"Priority band: **{result['verdict']}**", "",
        "## Factors", "", "| Factor | Rating | Weight | Points | Evidence IDs |",
        "|---|---:|---:|---:|---|",
    ]
    for key, detail in result["factor_details"].items():
        lines.append(f"| {key} | {detail['rating']} | {detail['weight']} | {detail['points']} | {', '.join(detail['evidence_ids'])} |")
    lines.extend(["", "## Penalties", "", "| Penalty | Rating | Points | Evidence IDs |", "|---|---:|---:|---|"])
    for key, detail in result["penalty_details"].items():
        lines.append(f"| {key} | {detail['rating']} | {detail['points']} | {', '.join(detail['evidence_ids']) or 'none'} |")
    weakening = [str(item).strip() for item in result.get("kill_switches", []) if str(item).strip()]
    if weakening:
        lines.extend(["", "## What Could Weaken The View", ""])
        lines.extend(f"- {item}" for item in weakening)
    lines.extend(["", "Not investment advice.", ""])
    return "\n".join(lines)


def self_test() -> None:
    try:
        score({"symbol": "EXAMPLE", "validation_input": TEMPLATE["validation_input"], "penalties": TEMPLATE["penalties"]})
    except ScorecardError:
        pass
    else:
        raise AssertionError("incomplete template unexpectedly scored")
    broken = json.loads(json.dumps(TEMPLATE))
    broken["validation_input"]["required_factors"].pop()
    try:
        score(broken)
    except ScorecardError as exc:
        assert "exact scorecard factor set" in str(exc)
    else:
        raise AssertionError("missing factor unexpectedly scored")
    print("self-test passed")


def main() -> None:
    parser = argparse.ArgumentParser(description="Score an evidence-valid Serenity research candidate")
    parser.add_argument("input", nargs="?", help="JSON scorecard file, or '-' for stdin")
    parser.add_argument("--template", action="store_true", help="Print the evidence-bound JSON template")
    parser.add_argument("--self-test", action="store_true", help="Run deterministic negative tests")
    parser.add_argument("--format", choices=("json", "md", "both"), default="json")
    args = parser.parse_args()
    if args.template:
        print(json.dumps(TEMPLATE, ensure_ascii=False, indent=2))
        return
    if args.self_test:
        self_test()
        return
    if not args.input:
        parser.error("input is required unless --template or --self-test is used")
    try:
        result = score(load_input(args.input))
    except ScorecardError as exc:
        raise SystemExit(f"scorecard rejected: {exc}") from exc
    if args.format in {"json", "both"}:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    if args.format == "both":
        print("\n---\n")
    if args.format in {"md", "both"}:
        print(to_markdown(result))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Forward-facing tests for the evidence-bound scorecard."""

from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "scripts" / "serenity_scorecard.py"
SPEC = importlib.util.spec_from_file_location("serenity_scorecard", SCRIPT)
assert SPEC and SPEC.loader
scorecard = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(scorecard)


def valid_input() -> dict:
    factors = list(scorecard.WEIGHTS)
    evidence = []
    candidates = []
    for symbol in ("AAA", "BBB", "CCC"):
        factor_id = f"{symbol}:factor"
        identity_id = f"{symbol}:identity"
        denominator_id = f"{symbol}:denominator"
        counter_id = f"{symbol}:counter"
        evidence.extend([
            {
                "evidence_id": identity_id,
                "status": "accepted",
                "entity_or_topic": symbol,
                "as_of": "2026-07-31T12:00:00Z",
                "source_type": "qveris_finance",
                "evidence_owner": "Exchange security master",
                "tool_name": "qveris_finance.ref_security_master",
                "symbol": symbol,
                "execution_id": f"{symbol}-identity-exec",
            },
            {
                "evidence_id": factor_id,
                "status": "accepted",
                "entity_or_topic": symbol,
                "as_of": "2026-07-31T12:00:00Z",
                "source_type": "qveris_finance",
                "evidence_owner": f"{symbol} original record owner",
                "tool_name": "qveris_finance.fundamentals_segment",
                "symbol": symbol,
                "execution_id": f"{symbol}-factor-exec",
                "window_start": "2026-01-01",
                "window_end": "2026-07-31",
                "fiscal_period": "FY2025",
                "measurement_basis": "reported",
                "currency_convention": "USD",
            },
            {
                "evidence_id": denominator_id,
                "status": "accepted",
                "entity_or_topic": symbol,
                "as_of": "2026-07-31T12:00:00Z",
                "source_type": "qveris_finance",
                "evidence_owner": f"{symbol} original record owner",
                "tool_name": "qveris_finance.fundamentals_is",
                "symbol": symbol,
                "execution_id": f"{symbol}-denominator-exec",
                "window_start": "2026-01-01",
                "window_end": "2026-07-31",
                "fiscal_period": "FY2025",
                "measurement_basis": "reported",
                "currency_convention": "USD",
            },
            {
                "evidence_id": counter_id,
                "status": "accepted",
                "entity_or_topic": symbol,
                "as_of": "2026-07-31T12:00:00Z",
                "source_type": "qveris_finance",
                "evidence_owner": f"{symbol} original record owner",
                "tool_name": "qveris_finance.filings_regulatory_metadata",
                "symbol": symbol,
                "execution_id": f"{symbol}-counter-exec",
            },
        ])
        candidates.append({
            "symbol": symbol,
            "company": f"{symbol} Co",
            "market": "US",
            "coverage_tier": "complete_comparable",
            "window_start": "2026-01-01",
            "window_end": "2026-07-31",
            "fiscal_period": "FY2025",
            "measurement_basis": "reported",
            "currency_convention": "USD",
            "identity_evidence_ids": [identity_id],
            "factors": {key: {"rating": 4, "evidence_ids": [factor_id]} for key in factors},
            "counterevidence_ids": [counter_id],
            "denominator_checks": [{"metric": "positive_operating_base", "value": 1, "evidence_ids": [denominator_id]}],
        })
    return {
        "symbol": "AAA",
        "validation_input": {
            "as_of": "2026-08-01T12:00:00Z",
            "required_factors": factors,
            "evidence": evidence,
            "layers": [],
            "candidates": candidates,
            "publish_candidate_ranking": True,
            "publish_layer_ranking": False,
        },
        "penalties": {
            key: {"rating": 0, "evidence_ids": []}
            for key in scorecard.PENALTIES
        },
        "what_could_weaken_view": ["A validated alternative design qualifies."],
    }


class ScorecardTests(unittest.TestCase):
    def test_public_rubric_matches_implemented_weights(self) -> None:
        rubric = (SCRIPT.parents[1] / "references" / "scorecard-rubric.md").read_text(encoding="utf-8")
        for factor, weight in scorecard.WEIGHTS.items():
            self.assertIn(f"| `{factor}` | {weight} |", rubric)
        self.assertIn("subtracts `rating * 2`", rubric)

    def test_scores_only_after_validity_passes(self) -> None:
        result = scorecard.score(valid_input())
        self.assertEqual(result["validity"]["status"], "accepted")
        self.assertTrue(result["validity"]["candidate_ranking_allowed"])
        self.assertEqual(result["final_score"], 80)
        self.assertEqual(result["disclaimer"], "Not investment advice.")

    def test_missing_factor_is_not_converted_to_zero(self) -> None:
        data = valid_input()
        del data["validation_input"]["candidates"][0]["factors"]["event_visibility"]
        with self.assertRaisesRegex(scorecard.ScorecardError, "not accepted for ranking"):
            scorecard.score(data)

    def test_nonzero_penalty_requires_evidence(self) -> None:
        data = valid_input()
        data["penalties"]["governance"]["rating"] = 2
        with self.assertRaisesRegex(scorecard.ScorecardError, "evidence_ids must be non-empty"):
            scorecard.score(data)

        data = valid_input()
        data["penalties"]["governance"] = {"rating": 2, "evidence_ids": ["BBB:factor"]}
        with self.assertRaisesRegex(scorecard.ScorecardError, "another security"):
            scorecard.score(data)


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""Validate a qveris-market-research packet and its observed-call sidecar."""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

VERSION = "qveris.market-research-packet.v1"
TRACE_FIELDS = {
    "tool_name", "params", "status", "execution_id", "fallback_used", "missing_fields"
}
TRACE_STATUSES = {"success", "failed", "rejected"}
PACKET_STATUSES = {"complete_draft", "partial", "budget_limited", "blocked"}
WORKFLOW_STAGES = {"planned", "awaiting_comps_review", "awaiting_draft_review", "complete"}
GATE_STATUSES = {"pending", "approved", "changes_requested", "waived"}
TERMINAL_GATES = {"approved", "waived"}
COVERAGE_TIERS = {"complete_comparable", "partial_not_ranked", "proxy_only", "insufficient"}
CLAIM_TYPES = {"fact", "calculation", "assumption", "judgment"}
CLAIM_STATUSES = {"supported", "partially_supported", "unsupported", "conflicted"}
EVIDENCE_STATUSES = {"observed", "calculated", "estimated", "not_applicable", "missing"}
SHA256_RE = re.compile(r"^[0-9a-f]{64}$", re.I)
TOOL_RE = re.compile(r"^qveris_finance\.[a-z0-9_]+$")
HTTPS_RE = re.compile(r"^https://", re.I)
SECRET_PATTERNS = [
    re.compile(r"\b(?:sk|sk-cn)-[A-Za-z0-9_-]{16,}\b"),
    re.compile(r"authorization\s*:\s*bearer\s+\S+", re.I),
    re.compile(r'"(?:api[_-]?key|access[_-]?token|cookie|password)"\s*:\s*"[^"\s]{8,}"', re.I),
    re.compile(r"[?&](?:x-amz-signature|signature|access_token|token|api_key)=", re.I),
]
ROUTING_KEY_RE = re.compile(
    r"(^|[-_])(provider|route|routing|candidate|candidates|failover|credential|api[-_]?key|"
    r"source[-_]?tool[-_]?id|tool[-_]?id|cap[-_]?tool[-_]?id)($|[-_])",
    re.I,
)


def iter_strings(value: Any):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for child in value.values():
            yield from iter_strings(child)
    elif isinstance(value, list):
        for child in value:
            yield from iter_strings(child)


def iter_keys(value: Any):
    if isinstance(value, dict):
        for key, child in value.items():
            yield str(key)
            yield from iter_keys(child)
    elif isinstance(value, list):
        for child in value:
            yield from iter_keys(child)


def validate_artifact_safety(value: Any, label: str, errors: list[str]) -> None:
    if value is None:
        return
    if any(pattern.search(text) for text in iter_strings(value) for pattern in SECRET_PATTERNS):
        errors.append(f"{label} contains credential-like material")
    leaked = sorted({key for key in iter_keys(value) if ROUTING_KEY_RE.search(key)})
    if leaked:
        errors.append(f"{label} leaks routing metadata keys: {', '.join(leaked)}")


def parse_time(value: Any, field: str, errors: list[str], *, timezone: bool = False) -> datetime | None:
    text = str(value or "").strip()
    if not text:
        errors.append(f"{field} must be non-empty")
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        errors.append(f"{field} must be ISO-8601")
        return None
    if timezone and parsed.tzinfo is None:
        errors.append(f"{field} must include a timezone")
        return None
    return parsed


def list_field(packet: dict[str, Any], name: str, errors: list[str]) -> list[Any]:
    value = packet.get(name, [])
    if not isinstance(value, list):
        errors.append(f"{name} must be an array")
        return []
    return value


def validate_trace(packet: dict[str, Any], sidecar: Any, errors: list[str]) -> bool:
    starting_error_count = len(errors)
    trace = list_field(packet, "qveris_trace", errors)
    for index, row in enumerate(trace):
        label = f"qveris_trace[{index}]"
        if not isinstance(row, dict):
            errors.append(f"{label} must be an object")
            continue
        if set(row) != TRACE_FIELDS:
            errors.append(f"{label} must contain exactly {sorted(TRACE_FIELDS)}")
        if not TOOL_RE.match(str(row.get("tool_name", ""))):
            errors.append(f"{label}.tool_name must be qveris_finance.*")
        if row.get("status") not in TRACE_STATUSES:
            errors.append(f"{label}.status is invalid")
        if not isinstance(row.get("params"), dict):
            errors.append(f"{label}.params must be an object")
        elif any(ROUTING_KEY_RE.search(str(key)) for key in row["params"]):
            errors.append(f"{label}.params leaks routing metadata")
        if not isinstance(row.get("fallback_used"), bool):
            errors.append(f"{label}.fallback_used must be boolean")
        if not isinstance(row.get("missing_fields"), list):
            errors.append(f"{label}.missing_fields must be an array")

    if packet.get("observed_call_count") != len(trace):
        errors.append("observed_call_count must equal qveris_trace length")
    controls = packet.get("controls", {})
    if isinstance(controls, dict) and isinstance(controls.get("max_calls"), int):
        if len(trace) > controls["max_calls"]:
            errors.append("observed calls exceed controls.max_calls")

    if not trace and sidecar is None:
        return False
    if sidecar is None:
        errors.append("non-empty qveris_trace requires --observed-calls")
        return False
    if not isinstance(sidecar, dict) or sidecar.get("artifact_version") != "observed_calls.v1":
        errors.append("observed-call sidecar must use artifact_version=observed_calls.v1")
        return False
    calls = sidecar.get("observed_calls")
    if not isinstance(calls, list):
        errors.append("observed-call sidecar observed_calls must be an array")
        return False
    projected = []
    for index, call in enumerate(calls):
        if not isinstance(call, dict):
            errors.append(f"observed_calls[{index}] must be an object")
            continue
        if call.get("request_kind") != "capabilities/query":
            errors.append(f"observed_calls[{index}].request_kind must be capabilities/query")
        capability_id = str(call.get("capability_id", ""))
        if not capability_id:
            errors.append(f"observed_calls[{index}].capability_id is required")
        response = call.get("response")
        if isinstance(response, dict) and response.get("capability_id") not in {None, capability_id}:
            errors.append(f"observed_calls[{index}] response capability_id mismatch")
        row = call.get("trace")
        if not isinstance(row, dict):
            row = {key: call.get(key) for key in TRACE_FIELDS}
        projected.append(row)
    if projected != trace:
        errors.append("qveris_trace must match observed_calls sidecar row-for-row")
    return len(errors) == starting_error_count


def validate_web_sidecar(
    web_sources: list[dict[str, Any]], sidecar: Any, errors: list[str], warnings: list[str]
) -> bool:
    starting_error_count = len(errors)
    if not web_sources and sidecar is None:
        return True
    if sidecar is None:
        if web_sources:
            warnings.append("Web sources are present but web_sources.v1 was not supplied")
        return False
    if not isinstance(sidecar, dict) or sidecar.get("artifact_version") != "web_sources.v1":
        errors.append("Web sidecar must use artifact_version=web_sources.v1")
        return False
    rows = sidecar.get("web_sources")
    if not isinstance(rows, list):
        errors.append("Web sidecar web_sources must be an array")
        return False
    required = {
        "source_id", "status", "query", "final_url", "publisher_owner", "title",
        "published_at", "accessed_at", "body_sha256", "issuer_or_topic_match",
        "window_match", "independence_result", "supported_claim_ids",
    }
    accepted_by_id: dict[str, dict[str, Any]] = {}
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            errors.append(f"web_sources[{index}] must be an object")
            continue
        missing = sorted(required - row.keys())
        if missing:
            errors.append(f"web_sources[{index}] missing fields: {', '.join(missing)}")
        source_id = str(row.get("source_id", "")).strip()
        if row.get("status") == "accepted" and source_id:
            if source_id in accepted_by_id:
                errors.append(f"web_sources[{index}] duplicates accepted source_id {source_id}")
            accepted_by_id[source_id] = row
        if row.get("status") == "accepted":
            if not HTTPS_RE.match(str(row.get("final_url", ""))):
                errors.append(f"web_sources[{index}].final_url must be HTTPS")
            if not SHA256_RE.match(str(row.get("body_sha256", ""))):
                errors.append(f"web_sources[{index}].body_sha256 must be SHA-256")
            if row.get("issuer_or_topic_match") is not True or row.get("window_match") is not True:
                errors.append(f"web_sources[{index}] accepted row failed relevance checks")
            if not isinstance(row.get("supported_claim_ids"), list) or not row["supported_claim_ids"]:
                errors.append(f"web_sources[{index}].supported_claim_ids must be non-empty")

    matched_fields = (
        "source_id", "final_url", "publisher_owner", "published_at", "accessed_at",
        "body_sha256", "issuer_or_topic_match", "window_match", "independence_result",
        "supported_claim_ids",
    )
    for source in web_sources:
        source_id = str(source.get("source_id", ""))
        row = accepted_by_id.get(source_id)
        if row is None:
            errors.append(f"accepted packet Web source {source_id} is absent from web_sources.v1")
            continue
        if any(row.get(field) != source.get(field) for field in matched_fields):
            errors.append(f"packet Web source {source_id} does not match web_sources.v1")
    return len(errors) == starting_error_count


def validate(packet: Any, sidecar: Any = None, web_sidecar: Any = None) -> tuple[list[str], list[str], dict[str, int]]:
    errors: list[str] = []
    warnings: list[str] = []
    counts = {"sources": 0, "claims": 0, "calculations": 0, "peers": 0, "candidates": 0}
    if not isinstance(packet, dict):
        return ["packet must be a JSON object"], warnings, counts

    validate_artifact_safety(sidecar, "observed-call sidecar", errors)
    validate_artifact_safety(web_sidecar, "Web sidecar", errors)

    required = {
        "schema_version", "status", "workflow_stage", "distribution_status", "controls", "research_question", "as_of", "cutoff",
        "scope", "planned_universe", "evidence_matrix", "planned_calls", "universe", "sources", "claims", "calculations", "peer_comps",
        "research_candidates", "gaps", "review_gates", "workflow_guard_status",
        "observed_call_count", "qveris_trace", "web_trace", "artifacts", "disclaimer",
    }
    missing = sorted(required - packet.keys())
    if missing:
        errors.append("missing top-level fields: " + ", ".join(missing))
    if packet.get("schema_version") != VERSION:
        errors.append(f"schema_version must be {VERSION}")
    status = packet.get("status")
    if status not in PACKET_STATUSES:
        errors.append("status is invalid")
    if packet.get("distribution_status") != "not_authorized":
        errors.append("distribution_status must be not_authorized")
    workflow_stage = packet.get("workflow_stage")
    if workflow_stage not in WORKFLOW_STAGES:
        errors.append("workflow_stage is invalid")
    if packet.get("disclaimer") != "Not investment advice.":
        errors.append("disclaimer must be exactly 'Not investment advice.'")
    if any(pattern.search(text) for text in iter_strings(packet) for pattern in SECRET_PATTERNS):
        errors.append("packet contains credential-like material")
    as_of = parse_time(packet.get("as_of"), "as_of", errors, timezone=True)

    cutoff = packet.get("cutoff")
    if not isinstance(cutoff, dict):
        errors.append("cutoff must be an object")
    else:
        t0 = parse_time(cutoff.get("T0"), "cutoff.T0", errors, timezone=True)
        requested_cutoff = parse_time(cutoff.get("CUT_OFF"), "cutoff.CUT_OFF", errors, timezone=True)
        effective_cutoff = parse_time(cutoff.get("effective_cutoff"), "cutoff.effective_cutoff", errors, timezone=True)
        if t0 and requested_cutoff and effective_cutoff and effective_cutoff != min(t0, requested_cutoff):
            errors.append("cutoff.effective_cutoff must equal min(T0,CUT_OFF)")
        if as_of and effective_cutoff and as_of != effective_cutoff:
            errors.append("as_of must equal cutoff.effective_cutoff")

    controls = packet.get("controls")
    if not isinstance(controls, dict):
        errors.append("controls must be an object")
    else:
        for field in ("dry_run", "max_calls", "max_web_operations", "max_age", "budget_note", "source_mode"):
            if field not in controls:
                errors.append(f"controls.{field} is required")
        if not isinstance(controls.get("max_calls"), int) or controls.get("max_calls", -1) < 0:
            errors.append("controls.max_calls must be a non-negative integer")
        if not isinstance(controls.get("max_web_operations"), int) or controls.get("max_web_operations", -1) < 0:
            errors.append("controls.max_web_operations must be a non-negative integer")

    planned_universe = list_field(packet, "planned_universe", errors)
    for index, row in enumerate(planned_universe):
        if not isinstance(row, dict) or not str(row.get("lead", "")).strip():
            errors.append(f"planned_universe[{index}].lead is required")
        elif row.get("status") not in {"discovered_lead", "user_supplied_unverified", "planned_identity_check"}:
            errors.append(f"planned_universe[{index}].status is invalid")
    evidence_matrix = list_field(packet, "evidence_matrix", errors)
    required_missing_fields: list[str] = []
    for index, row in enumerate(evidence_matrix):
        if not isinstance(row, dict) or not str(row.get("field", "")).strip() or row.get("required") not in {True, False}:
            errors.append(f"evidence_matrix[{index}] requires field and boolean required")
            continue
        evidence_status = row.get("status")
        if evidence_status is not None and evidence_status not in EVIDENCE_STATUSES:
            errors.append(f"evidence_matrix[{index}].status is invalid")
        if row.get("required") is True and evidence_status == "missing":
            required_missing_fields.append(str(row["field"]).strip())
    planned_calls = list_field(packet, "planned_calls", errors)
    for index, row in enumerate(planned_calls):
        if not isinstance(row, dict):
            errors.append(f"planned_calls[{index}] must be an object")
            continue
        if not TOOL_RE.match(str(row.get("tool_name", ""))):
            errors.append(f"planned_calls[{index}].tool_name must be qveris_finance.*")
        if not isinstance(row.get("required"), bool) or not isinstance(row.get("call_estimate"), int) or row.get("call_estimate", -1) < 0:
            errors.append(f"planned_calls[{index}] requires boolean required and non-negative call_estimate")
        if not str(row.get("purpose", "")).strip() or not str(row.get("batch_assumption", "")).strip():
            errors.append(f"planned_calls[{index}] requires purpose and batch_assumption")
    worst_case_required_attempts = sum(
        row.get("call_estimate", 0) for row in planned_calls
        if isinstance(row, dict) and row.get("required") is True and isinstance(row.get("call_estimate"), int)
    )
    if isinstance(controls, dict) and isinstance(controls.get("max_calls"), int):
        max_calls = controls["max_calls"]
        plan_exceeds_budget = worst_case_required_attempts > max_calls
        observed_call_count = packet.get("observed_call_count")
        observed_budget_exhausted = (
            isinstance(observed_call_count, int)
            and observed_call_count == max_calls
            and bool(required_missing_fields)
        )
        if plan_exceeds_budget and status not in {"budget_limited", "blocked"}:
            errors.append(
                "worst-case required planned attempts exceed controls.max_calls "
                "without budget_limited status"
            )
        if observed_budget_exhausted and status not in {"budget_limited", "blocked"}:
            errors.append(
                "exhausted observed attempts with required missing evidence requires "
                "budget_limited status"
            )
        if status == "budget_limited" and not (plan_exceeds_budget or observed_budget_exhausted):
            errors.append(
                "budget_limited requires either worst-case required planned attempts above "
                "controls.max_calls or exhausted observed attempts with required missing evidence"
            )

    universe = list_field(packet, "universe", errors)
    universe_symbols: set[str] = set()
    for index, row in enumerate(universe):
        if not isinstance(row, dict):
            errors.append(f"universe[{index}] must be an object")
            continue
        symbol = str(row.get("symbol", "")).upper().strip()
        if not symbol or symbol in universe_symbols:
            errors.append(f"universe[{index}] symbol is missing or duplicated")
        else:
            universe_symbols.add(symbol)
        if row.get("identity_status") != "accepted":
            errors.append(f"universe[{index}] identity_status must be accepted")
        for field in ("issuer", "market", "exchange", "asset_type", "currency", "inclusion_reason"):
            if not str(row.get(field, "")).strip():
                errors.append(f"universe[{index}].{field} is required")

    sources = list_field(packet, "sources", errors)
    source_ids: set[str] = set()
    trace_execution_ids = {
        row.get("execution_id") for row in packet.get("qveris_trace", []) if isinstance(row, dict)
    }
    accepted_web_sources: list[dict[str, Any]] = []
    for index, source in enumerate(sources):
        if not isinstance(source, dict):
            errors.append(f"sources[{index}] must be an object")
            continue
        source_id = str(source.get("source_id", "")).strip()
        if not source_id or source_id in source_ids:
            errors.append(f"sources[{index}] source_id is missing or duplicated")
        else:
            source_ids.add(source_id)
        source_type = source.get("source_type")
        if source_type == "qveris_finance":
            if not TOOL_RE.match(str(source.get("tool_name", ""))):
                errors.append(f"sources[{index}].tool_name must be qveris_finance.*")
            if source.get("execution_id") not in trace_execution_ids:
                errors.append(f"sources[{index}] execution_id is not present in qveris_trace")
        elif source_type == "web":
            for field in (
                "final_url", "publisher", "publisher_owner", "published_at", "accessed_at",
                "body_sha256", "independence_result",
            ):
                if not str(source.get(field, "")).strip():
                    errors.append(f"sources[{index}].{field} is required for Web evidence")
            if not HTTPS_RE.match(str(source.get("final_url", ""))):
                errors.append(f"sources[{index}].final_url must be HTTPS")
            if not SHA256_RE.match(str(source.get("body_sha256", ""))):
                errors.append(f"sources[{index}].body_sha256 must be SHA-256")
            if source.get("issuer_or_topic_match") is not True or source.get("window_match") is not True:
                errors.append(f"sources[{index}] Web evidence must pass topic and window match")
            if not isinstance(source.get("supported_claim_ids"), list) or not source["supported_claim_ids"]:
                errors.append(f"sources[{index}].supported_claim_ids must be non-empty")
            accepted_web_sources.append(source)
        else:
            errors.append(f"sources[{index}].source_type must be qveris_finance or web")
        observed = source.get("as_of") or source.get("published_at")
        if observed and as_of:
            parsed = parse_time(observed, f"sources[{index}].as_of/published_at", errors)
            if parsed and parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=as_of.tzinfo)
            if parsed and parsed > as_of:
                errors.append(f"sources[{index}] is after packet as_of")
    counts["sources"] = len(source_ids)

    calculations = list_field(packet, "calculations", errors)
    calculation_ids: set[str] = set()
    for index, calc in enumerate(calculations):
        if not isinstance(calc, dict):
            errors.append(f"calculations[{index}] must be an object")
            continue
        calc_id = str(calc.get("calculation_id", "")).strip()
        if not calc_id or calc_id in calculation_ids:
            errors.append(f"calculations[{index}] calculation_id is missing or duplicated")
        else:
            calculation_ids.add(calc_id)
        for field in ("formula", "currency", "unit", "period_end", "rounding"):
            if not str(calc.get(field, "")).strip():
                errors.append(f"calculations[{index}].{field} is required")
        inputs = calc.get("inputs")
        if not isinstance(inputs, list) or not inputs:
            errors.append(f"calculations[{index}].inputs must be non-empty")
        else:
            for item in inputs:
                if not isinstance(item, dict) or "value" not in item or item.get("source_id") not in source_ids:
                    errors.append(f"calculations[{index}] input must include value and a known source_id")
        if not isinstance(calc.get("result"), dict) or "value" not in calc["result"]:
            errors.append(f"calculations[{index}].result.value is required")
        if calc.get("check_status") not in {"passed", "failed", "pending"}:
            errors.append(f"calculations[{index}].check_status is invalid")
        if status == "complete_draft" and calc.get("check_status") != "passed":
            errors.append(f"complete_draft calculation {calc_id or index} must be passed")
    counts["calculations"] = len(calculation_ids)

    claims = list_field(packet, "claims", errors)
    claim_ids: set[str] = set()
    for index, claim in enumerate(claims):
        if not isinstance(claim, dict):
            errors.append(f"claims[{index}] must be an object")
            continue
        claim_id = str(claim.get("claim_id", "")).strip()
        if not claim_id or claim_id in claim_ids:
            errors.append(f"claims[{index}] claim_id is missing or duplicated")
        else:
            claim_ids.add(claim_id)
        if claim.get("type") not in CLAIM_TYPES or claim.get("status") not in CLAIM_STATUSES:
            errors.append(f"claims[{index}] type or status is invalid")
        refs = claim.get("source_ids", [])
        calc_refs = claim.get("calculation_ids", [])
        if not isinstance(refs, list) or set(refs) - source_ids:
            errors.append(f"claims[{index}] references unknown sources")
        if not isinstance(calc_refs, list) or set(calc_refs) - calculation_ids:
            errors.append(f"claims[{index}] references unknown calculations")
        if claim.get("type") in {"fact", "judgment"} and not refs:
            errors.append(f"claims[{index}] requires source_ids")
        if claim.get("type") == "calculation" and not calc_refs:
            errors.append(f"claims[{index}] requires calculation_ids")
        if claim.get("status") in {"unsupported", "conflicted"}:
            warnings.append(f"claim {claim_id or index} is {claim.get('status')}")
    counts["claims"] = len(claim_ids)
    for source in accepted_web_sources:
        refs = source.get("supported_claim_ids", [])
        if isinstance(refs, list) and set(refs) - claim_ids:
            errors.append(f"Web source {source.get('source_id', '')} references unknown claims")

    peers = list_field(packet, "peer_comps", errors)
    comparable_symbols: set[str] = set()
    for index, peer in enumerate(peers):
        if not isinstance(peer, dict):
            errors.append(f"peer_comps[{index}] must be an object")
            continue
        tier = peer.get("coverage_tier")
        if tier not in COVERAGE_TIERS:
            errors.append(f"peer_comps[{index}].coverage_tier is invalid")
        symbol = str(peer.get("symbol", "")).upper().strip()
        if symbol not in universe_symbols:
            errors.append(f"peer_comps[{index}] symbol is outside the frozen universe")
        if tier == "complete_comparable":
            comparable_symbols.add(symbol)
            for field in ("factor_set", "window_start", "window_end", "fiscal_period", "measurement_basis", "currency_convention"):
                if not peer.get(field):
                    errors.append(f"peer_comps[{index}].{field} is required for complete_comparable")
    counts["peers"] = len({str(row.get("symbol", "")) for row in peers if isinstance(row, dict)})

    candidates = list_field(packet, "research_candidates", errors)
    ranked = []
    gate_one_priority_fields = {"rank", "score", "final_score"}
    for index, candidate in enumerate(candidates):
        if not isinstance(candidate, dict):
            errors.append(f"research_candidates[{index}] must be an object")
            continue
        if workflow_stage == "awaiting_comps_review":
            prohibited = sorted(gate_one_priority_fields.intersection(candidate))
            if prohibited:
                errors.append(
                    "awaiting_comps_review forbids candidate rank/score/final_score; "
                    f"research_candidates[{index}] contains: {', '.join(prohibited)}"
                )
        if candidate.get("coverage_tier") not in COVERAGE_TIERS:
            errors.append(f"research_candidates[{index}].coverage_tier is invalid")
        support = candidate.get("support_claim_ids", [])
        if not isinstance(support, list) or len(support) < 2 or set(support) - claim_ids:
            errors.append(f"research_candidates[{index}] requires at least two known support_claim_ids")
        for field in ("counterevidence", "main_risk", "next_check"):
            if not str(candidate.get(field, "")).strip():
                errors.append(f"research_candidates[{index}].{field} is required")
        if "rank" in candidate:
            ranked.append(candidate)
            if candidate.get("coverage_tier") != "complete_comparable":
                errors.append(f"research_candidates[{index}] ranked candidate must be complete_comparable")
    counts["candidates"] = len(candidates)
    if ranked:
        if packet.get("workflow_guard_status") != "accepted":
            errors.append("ranked candidates require workflow_guard_status=accepted")
        if len(comparable_symbols) < 3:
            errors.append("ranked candidates require at least three complete comparable peers")

    gates = packet.get("review_gates")
    if not isinstance(gates, dict):
        errors.append("review_gates must be an object")
    else:
        for gate_name in ("comps_review", "draft_review"):
            gate = gates.get(gate_name)
            if not isinstance(gate, dict) or gate.get("status") not in GATE_STATUSES:
                errors.append(f"review_gates.{gate_name}.status is invalid")
                continue
            if gate.get("status") in TERMINAL_GATES:
                if not str(gate.get("reviewer", "")).strip() or not str(gate.get("reviewed_at", "")).strip():
                    errors.append(f"review_gates.{gate_name} requires reviewer and reviewed_at")
            if status == "complete_draft" and gate.get("status") not in TERMINAL_GATES:
                errors.append(f"complete_draft requires {gate_name} approved or waived")

    list_field(packet, "gaps", errors)
    web_trace = list_field(packet, "web_trace", errors)
    if isinstance(controls, dict) and isinstance(controls.get("max_web_operations"), int):
        if len(web_trace) > controls["max_web_operations"]:
            errors.append("Web operations exceed controls.max_web_operations")
    artifacts = list_field(packet, "artifacts", errors)
    for index, artifact in enumerate(artifacts):
        if not isinstance(artifact, dict) or not str(artifact.get("path", "")).strip():
            errors.append(f"artifacts[{index}] requires path")
        elif not SHA256_RE.match(str(artifact.get("sha256", ""))):
            errors.append(f"artifacts[{index}].sha256 must be SHA-256")

    trace_verified = validate_trace(packet, sidecar, errors)
    web_verified = validate_web_sidecar(accepted_web_sources, web_sidecar, errors, warnings)
    if isinstance(controls, dict) and controls.get("dry_run") is True:
        if packet.get("observed_call_count") != 0 or packet.get("qveris_trace"):
            errors.append("dry_run=true forbids capabilities/query attempts and Trace rows")
        if sources or packet.get("web_trace"):
            errors.append("dry_run=true forbids accepted CAP/Web evidence and Web operations")
        if isinstance(web_sidecar, dict) and web_sidecar.get("web_sources"):
            errors.append("dry_run=true forbids non-empty web_sources.v1 sidecars")
        if workflow_stage != "planned":
            errors.append("dry_run=true requires workflow_stage=planned")
        if status == "complete_draft":
            errors.append("dry_run=true cannot be complete_draft")
    if workflow_stage == "planned" and status not in {"budget_limited", "blocked"} and not (isinstance(controls, dict) and controls.get("dry_run") is True):
        warnings.append("workflow_stage=planned on a non-dry run")
    if workflow_stage == "awaiting_comps_review" and isinstance(gates, dict):
        if gates.get("comps_review", {}).get("status") != "pending":
            errors.append("awaiting_comps_review requires comps_review=pending")
    if workflow_stage == "awaiting_draft_review" and isinstance(gates, dict):
        if gates.get("comps_review", {}).get("status") not in TERMINAL_GATES:
            errors.append("awaiting_draft_review requires a terminal comps_review")
    if workflow_stage == "complete" and status != "complete_draft":
        errors.append("workflow_stage=complete requires status=complete_draft")
    if status == "complete_draft" and workflow_stage != "complete":
        errors.append("complete_draft requires workflow_stage=complete")
    if status == "complete_draft":
        if not sources or not claims or not calculations:
            errors.append("complete_draft requires non-empty sources, claims, and calculations")
        if not trace_verified:
            errors.append("complete_draft requires a verified observed_calls.v1 sidecar")
        if accepted_web_sources and not web_verified:
            errors.append("complete_draft with Web evidence requires a verified web_sources.v1 sidecar")
    return errors, warnings, counts


def self_test() -> int:
    trace = {
        "tool_name": "qveris_finance.ref_security_master", "params": {"symbol": "AAPL"},
        "status": "success", "execution_id": "exec-1", "fallback_used": False, "missing_fields": [],
    }
    packet = {
        "schema_version": VERSION, "status": "complete_draft", "workflow_stage": "complete", "distribution_status": "not_authorized",
        "controls": {"dry_run": False, "max_calls": 4, "max_web_operations": 0, "max_age": "P1D", "budget_note": "test", "source_mode": "cap_only"},
        "research_question": "Test?", "as_of": "2026-08-03T10:00:00+08:00",
        "cutoff": {"T0": "2026-08-03T10:00:00+08:00", "CUT_OFF": "2026-08-03T10:00:00+08:00", "effective_cutoff": "2026-08-03T10:00:00+08:00"},
        "scope": {"sector_or_theme": "test"}, "planned_universe": [], "evidence_matrix": [], "planned_calls": [],
        "universe": [
            {"symbol": symbol, "issuer": symbol, "market": "US", "exchange": "NASDAQ", "asset_type": "Common Stock", "currency": "USD", "inclusion_reason": "test", "identity_status": "accepted"}
            for symbol in ("AAPL", "MSFT", "NVDA")
        ],
        "sources": [{"source_id": "s1", "source_type": "qveris_finance", "tool_name": trace["tool_name"], "execution_id": "exec-1", "as_of": "2026-08-03T09:00:00+08:00"}],
        "calculations": [{"calculation_id": "c1", "formula": "a*2", "inputs": [{"value": 1, "source_id": "s1"}], "result": {"value": 2}, "currency": "USD", "unit": "x", "period_end": "2025-12-31", "rounding": "none", "check_status": "passed"}],
        "claims": [
            {"claim_id": "cl1", "type": "calculation", "status": "supported", "text": "x", "source_ids": ["s1"], "calculation_ids": ["c1"]},
            {"claim_id": "cl2", "type": "fact", "status": "supported", "text": "y", "source_ids": ["s1"], "calculation_ids": []},
        ],
        "peer_comps": [{"symbol": symbol, "coverage_tier": "complete_comparable", "factor_set": ["quality"], "window_start": "2025-01-01", "window_end": "2025-12-31", "fiscal_period": "FY2025", "measurement_basis": "annual", "currency_convention": "USD"} for symbol in ("AAPL", "MSFT", "NVDA")],
        "research_candidates": [{"symbol": "AAPL", "rank": 1, "coverage_tier": "complete_comparable", "support_claim_ids": ["cl1", "cl2"], "counterevidence": "test", "main_risk": "test", "next_check": "test"}],
        "gaps": [], "review_gates": {"comps_review": {"status": "approved", "reviewer": "r", "reviewed_at": "2026-08-03T09:00:00Z"}, "draft_review": {"status": "waived", "reviewer": "r", "reviewed_at": "2026-08-03T09:30:00Z"}},
        "workflow_guard_status": "accepted", "observed_call_count": 1, "qveris_trace": [trace], "web_trace": [],
        "artifacts": [{"path": "note.md", "sha256": "a" * 64}], "disclaimer": "Not investment advice.",
    }
    sidecar = {"artifact_version": "observed_calls.v1", "observed_calls": [{"request_kind": "capabilities/query", "capability_id": "REF.SECURITY_MASTER", "response": {"capability_id": "REF.SECURITY_MASTER"}, "trace": trace}]}
    errors, _, _ = validate(packet, sidecar)
    if errors:
        print("self-test valid packet failed: " + "; ".join(errors), file=sys.stderr)
        return 1
    invalid = json.loads(json.dumps(packet))
    invalid["peer_comps"][1]["coverage_tier"] = "partial_not_ranked"
    invalid["review_gates"]["draft_review"]["status"] = "pending"
    invalid["qveris_trace"][0]["params"]["provider"] = "leak"
    errors, _, _ = validate(invalid, sidecar)
    if not all(any(fragment in error for error in errors) for fragment in ("three complete", "draft_review", "routing metadata")):
        print("self-test rejection guards failed: " + "; ".join(errors), file=sys.stderr)
        return 1
    print("self-test passed")
    return 0


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("packet", nargs="?", type=Path)
    parser.add_argument("--observed-calls", type=Path)
    parser.add_argument("--web-sources", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if args.packet is None:
        parser.error("packet is required unless --self-test is used")
    try:
        packet = load_json(args.packet)
        sidecar = load_json(args.observed_calls) if args.observed_calls else None
        web_sidecar = load_json(args.web_sources) if args.web_sources else None
    except (OSError, json.JSONDecodeError) as exc:
        print(json.dumps({"valid": False, "errors": [str(exc)]}, ensure_ascii=False))
        return 1
    errors, warnings, counts = validate(packet, sidecar, web_sidecar)
    print(json.dumps({"valid": not errors, "errors": errors, "warnings": warnings, "counts": counts}, ensure_ascii=False, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())

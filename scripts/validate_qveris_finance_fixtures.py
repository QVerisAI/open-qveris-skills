#!/usr/bin/env python3
"""Validate QVeris finance JSON fixtures against bundled schemas."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any


DEFAULT_SKILL_DIRS = (
    "qveris-anthropic-financial-services",
    "qveris-finance-skills",
    "qveris-tradermonty-trading-skills",
    "qveris-a-stock-data-layer",
    "qveris-a-share-factor-screen",
    "qveris-a-share-data",
    "qveris-alphaear-market-intelligence",
    "qveris-daymade-financial-data-suite",
    "qveris-uzi-equity-research",
    "qveris-crypto-market-radar",
    "qveris-supply-chain-catalyst-radar",
)

STRICT_TRACE_SKILLS = {
    "qveris-a-stock-data-layer",
    "qveris-a-share-factor-screen",
    "qveris-a-share-data",
    "qveris-alphaear-market-intelligence",
    "qveris-daymade-financial-data-suite",
    "qveris-uzi-equity-research",
    "qveris-crypto-market-radar",
    "qveris-supply-chain-catalyst-radar",
}

SENSITIVE_PARAM_KEY_RE = re.compile(
    r"(^|_)(provider|route|routing|candidate|candidates|failover|credential|"
    r"api_key|private_key|seed_phrase|mnemonic|signing_key|wallet_credential|"
    r"source_tool_id|tool_id|cap_tool_id)($|_)",
    re.I,
)

CRYPTO_PROHIBITED_OUTPUT_KEY_RE = re.compile(
    r"(^|_)(private_key|seed_phrase|mnemonic|signing_key|wallet_credential|"
    r"wallet_action|swap_execution|order_execution|transaction_instruction|"
    r"price_forecast|target_price|guaranteed_return)($|_)",
    re.I,
)
CRYPTO_MAX_AGE_KEYS = {"spot", "history", "rankings", "market_mood", "whale", "news_social"}


def normalize_param_key(key: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "_", str(key).strip().lower()).strip("_")


def sensitive_param_paths(value: Any, path: str = "params") -> list[str]:
    paths: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}"
            if SENSITIVE_PARAM_KEY_RE.search(normalize_param_key(key)):
                paths.append(child_path)
            paths.extend(sensitive_param_paths(child, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            paths.extend(sensitive_param_paths(child, f"{path}[{index}]"))
    return paths


def crypto_prohibited_output_paths(value: Any, path: str = "fixture") -> list[str]:
    paths: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}"
            if CRYPTO_PROHIBITED_OUTPUT_KEY_RE.search(normalize_param_key(key)):
                paths.append(child_path)
            paths.extend(crypto_prohibited_output_paths(child, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            paths.extend(crypto_prohibited_output_paths(child, f"{path}[{index}]"))
    return paths


def validate_crypto_fixture_contract(fixture: dict[str, Any], label: str) -> list[str]:
    errors: list[str] = []
    if fixture.get("skill") != "qveris-crypto-market-radar":
        errors.append(f"{label}: crypto fixture skill must be qveris-crypto-market-radar")

    controls = fixture.get("controls")
    if not isinstance(controls, dict):
        errors.append(f"{label}: crypto fixture controls must be an object")
    else:
        if controls.get("dry_run") is not True or controls.get("max_calls") != 0:
            errors.append(f"{label}: static crypto fixtures must use dry_run=true and max_calls=0")
        max_age = controls.get("max_age")
        if not isinstance(max_age, dict) or set(max_age) != CRYPTO_MAX_AGE_KEYS:
            errors.append(
                f"{label}: controls.max_age must contain exactly {sorted(CRYPTO_MAX_AGE_KEYS)!r}"
            )

    trace = fixture.get("qveris_trace")
    if trace != [] or fixture.get("observed_call_count") != 0:
        errors.append(
            f"{label}: static crypto fixtures cannot claim observed calls; use a live report plus observed_calls.v1 sidecar"
        )

    for path in crypto_prohibited_output_paths(fixture):
        errors.append(f"{label}:{path}: prohibited crypto output key")
    return errors


def json_type_name(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, int):
        return "integer"
    if isinstance(value, float):
        return "number"
    if isinstance(value, str):
        return "string"
    if isinstance(value, list):
        return "array"
    if isinstance(value, dict):
        return "object"
    return type(value).__name__


def type_matches(value: Any, expected: str) -> bool:
    if expected == "null":
        return value is None
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if expected == "string":
        return isinstance(value, str)
    if expected == "array":
        return isinstance(value, list)
    if expected == "object":
        return isinstance(value, dict)
    return True


def schema_types(schema: dict[str, Any]) -> list[str]:
    raw = schema.get("type")
    if isinstance(raw, list):
        return [str(item) for item in raw]
    if isinstance(raw, str):
        return [raw]
    return []


def validate_node(value: Any, schema: dict[str, Any], path: str) -> list[str]:
    errors: list[str] = []
    expected_types = schema_types(schema)
    if expected_types and not any(type_matches(value, expected) for expected in expected_types):
        errors.append(f"{path}: expected {'/'.join(expected_types)}, got {json_type_name(value)}")
        return errors

    if "const" in schema and value != schema["const"]:
        errors.append(f"{path}: expected const {schema['const']!r}, got {value!r}")

    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"{path}: value {value!r} is not in enum {schema['enum']!r}")

    if isinstance(value, str) and "pattern" in schema:
        if not re.search(str(schema["pattern"]), value):
            errors.append(f"{path}: value {value!r} does not match pattern {schema['pattern']!r}")

    if isinstance(value, int) and not isinstance(value, bool) and "minimum" in schema:
        if value < int(schema["minimum"]):
            errors.append(f"{path}: value {value} is below minimum {schema['minimum']}")

    if isinstance(value, list):
        min_items = schema.get("minItems")
        if isinstance(min_items, int) and len(value) < min_items:
            errors.append(f"{path}: expected at least {min_items} items, got {len(value)}")
        item_schema = schema.get("items")
        if isinstance(item_schema, dict):
            for index, item in enumerate(value):
                errors.extend(validate_node(item, item_schema, f"{path}[{index}]"))

    if isinstance(value, dict):
        required = schema.get("required", [])
        if isinstance(required, list):
            for key in required:
                if key not in value:
                    errors.append(f"{path}: missing required property {key!r}")

        properties = schema.get("properties", {})
        if isinstance(properties, dict):
            for key, child_schema in properties.items():
                if key in value and isinstance(child_schema, dict):
                    errors.extend(validate_node(value[key], child_schema, f"{path}.{key}"))

            if schema.get("additionalProperties") is False:
                allowed = set(properties)
                for key in value:
                    if key not in allowed:
                        errors.append(f"{path}: unexpected property {key!r}")

    return errors


def validate_finance_trace(fixture: dict[str, Any], label: str, *, strict_trace: bool) -> list[str]:
    errors: list[str] = []

    if fixture.get("disclaimer") != "Not investment advice.":
        errors.append(f"{label}: disclaimer must be exactly 'Not investment advice.'")

    trace = fixture.get("qveris_trace")
    if not isinstance(trace, list):
        errors.append(f"{label}: qveris_trace must be a list")
        return errors

    if not strict_trace:
        if not trace:
            errors.append(f"{label}: qveris_trace must be a non-empty list")
            return errors
        for index, item in enumerate(trace):
            item_label = f"{label}:qveris_trace[{index}]"
            if not isinstance(item, dict):
                errors.append(f"{item_label}: trace item must be an object")
                continue
            for key in ("tool_name", "capability_id"):
                value = item.get(key)
                if not isinstance(value, str) or not value.startswith("qveris_finance."):
                    errors.append(f"{item_label}.{key}: must start with qveris_finance., got {value!r}")
            if "source_provider" in item:
                errors.append(f"{item_label}.source_provider: provider fields are not allowed")
        return errors

    observed_call_count = fixture.get("observed_call_count")
    if observed_call_count != len(trace):
        errors.append(
            f"{label}: observed_call_count must equal qveris_trace length "
            f"({observed_call_count!r} != {len(trace)})"
        )

    controls = fixture.get("controls")
    if isinstance(controls, dict) and (controls.get("dry_run") is True or controls.get("max_calls") == 0):
        if trace:
            errors.append(f"{label}: dry-run/max_calls=0 fixture cannot contain observed trace rows")

    required_keys = {
        "tool_name",
        "params",
        "status",
        "execution_id",
        "fallback_used",
        "missing_fields",
    }

    for index, item in enumerate(trace):
        item_label = f"{label}:qveris_trace[{index}]"
        if not isinstance(item, dict):
            errors.append(f"{item_label}: trace item must be an object")
            continue
        actual_keys = set(item)
        if actual_keys != required_keys:
            errors.append(
                f"{item_label}: trace keys must be exactly {sorted(required_keys)!r}, "
                f"got {sorted(actual_keys)!r}"
            )
        value = item.get("tool_name")
        if not isinstance(value, str) or not value.startswith("qveris_finance."):
            errors.append(f"{item_label}.tool_name: must start with qveris_finance., got {value!r}")
        if item.get("status") not in {"success", "failed", "rejected"}:
            errors.append(f"{item_label}.status: invalid observed-call status {item.get('status')!r}")
        for sensitive_path in sensitive_param_paths(item.get("params")):
            errors.append(f"{item_label}.{sensitive_path}: internal metadata key is forbidden")
        execution_id = item.get("execution_id")
        if execution_id is not None and not isinstance(execution_id, str):
            errors.append(f"{item_label}.execution_id: must be a string or null")
        if isinstance(execution_id, str):
            normalized_id = execution_id.strip().lower()
            if not normalized_id or re.match(r"^(fixture|synthetic|planned|mock|example)[-_]", normalized_id):
                errors.append(f"{item_label}.execution_id: synthetic/placeholder IDs are forbidden")

    return errors


def iter_skill_schema_dirs(root: Path, requested_dirs: list[str]) -> list[Path]:
    dirs: list[Path] = []
    if requested_dirs:
        candidates = [root / item for item in requested_dirs]
    else:
        candidates = [root / item for item in DEFAULT_SKILL_DIRS]

    for skill_dir in candidates:
        if (skill_dir / "schemas" / "output.schema.json").is_file() and (skill_dir / "fixtures" / "qveris").is_dir():
            dirs.append(skill_dir)
    if requested_dirs:
        return dirs

    for schema_path in sorted(root.glob("qveris-*/schemas/output.schema.json")):
        skill_dir = schema_path.parents[1]
        if skill_dir.name not in DEFAULT_SKILL_DIRS:
            continue
        if skill_dir not in dirs and (skill_dir / "fixtures" / "qveris").is_dir():
            dirs.append(skill_dir)
    return dirs


def run_self_test() -> list[str]:
    base_trace = {
        "tool_name": "qveris_finance.ref_symbology",
        "params": {"symbol": "600519.SH", "market": "CN"},
        "status": "success",
        "execution_id": None,
        "fallback_used": False,
        "missing_fields": [],
    }
    clean = {
        "disclaimer": "Not investment advice.",
        "controls": {"dry_run": False, "max_calls": 1},
        "observed_call_count": 1,
        "qveris_trace": [base_trace],
    }
    errors: list[str] = []
    if validate_finance_trace(clean, "self-test-clean", strict_trace=True):
        errors.append("self-test-clean: expected pass but failed")

    leaked_trace = dict(base_trace)
    leaked_trace["params"] = {
        "symbol": "600519.SH",
        "nested": {"provider": "hidden", "route": "hidden", "candidate": "hidden"},
    }
    leaked = dict(clean)
    leaked["qveris_trace"] = [leaked_trace]
    leak_errors = validate_finance_trace(leaked, "self-test-leak", strict_trace=True)
    if len([error for error in leak_errors if "internal metadata key" in error]) != 3:
        errors.append("self-test-leak: expected provider/route/candidate rejection")

    clean_crypto = {
        "skill": "qveris-crypto-market-radar",
        "controls": {
            "dry_run": True,
            "max_calls": 0,
            "max_age": {key: "P1D" for key in CRYPTO_MAX_AGE_KEYS},
        },
        "observed_call_count": 0,
        "qveris_trace": [],
    }
    if validate_crypto_fixture_contract(clean_crypto, "self-test-crypto-clean"):
        errors.append("self-test-crypto-clean: expected pass but failed")

    crypto_fake_trace = dict(clean_crypto)
    crypto_fake_trace["controls"] = dict(clean_crypto["controls"], dry_run=False, max_calls=1)
    crypto_fake_trace["observed_call_count"] = 1
    crypto_fake_trace["qveris_trace"] = [base_trace]
    if not validate_crypto_fixture_contract(crypto_fake_trace, "self-test-crypto-fake-trace"):
        errors.append("self-test-crypto-fake-trace: expected provenance failure but passed")

    crypto_secret = dict(clean_crypto)
    crypto_secret["analysis"] = {"private_key": "placeholder", "price_forecast": "guaranteed"}
    secret_errors = validate_crypto_fixture_contract(crypto_secret, "self-test-crypto-secret")
    if len([error for error in secret_errors if "prohibited crypto output key" in error]) != 2:
        errors.append("self-test-crypto-secret: expected private-key and forecast rejection")
    return errors


def main() -> int:
    root = Path.cwd()
    requested_dirs = sys.argv[1:]
    if requested_dirs == ["--self-test"]:
        self_test_errors = run_self_test()
        if self_test_errors:
            print("\n".join(self_test_errors), file=sys.stderr)
            return 1
        print("ok: self-test")
        return 0
    errors: list[str] = []
    checked = 0

    for skill_dir in iter_skill_schema_dirs(root, requested_dirs):
        schema_path = skill_dir / "schemas" / "output.schema.json"
        try:
            schema = json.loads(schema_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            errors.append(f"{schema_path}: invalid JSON schema: {exc}")
            continue

        for fixture_path in sorted((skill_dir / "fixtures" / "qveris").glob("*.json")):
            checked += 1
            try:
                fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError as exc:
                errors.append(f"{fixture_path}: invalid JSON fixture: {exc}")
                continue
            errors.extend(validate_node(fixture, schema, str(fixture_path)))
            if isinstance(fixture, dict):
                errors.extend(
                    validate_finance_trace(
                        fixture,
                        str(fixture_path),
                        strict_trace=skill_dir.name in STRICT_TRACE_SKILLS,
                    )
                )
                if skill_dir.name == "qveris-crypto-market-radar":
                    errors.extend(validate_crypto_fixture_contract(fixture, str(fixture_path)))

    if checked == 0:
        errors.append("no qveris finance fixtures found")

    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1

    print(f"ok: {checked} QVeris finance JSON fixtures validated")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

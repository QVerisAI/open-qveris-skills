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
)


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


def validate_finance_trace(fixture: dict[str, Any], label: str) -> list[str]:
    errors: list[str] = []

    if fixture.get("disclaimer") != "Not investment advice.":
        errors.append(f"{label}: disclaimer must be exactly 'Not investment advice.'")

    trace = fixture.get("qveris_trace")
    if not isinstance(trace, list) or not trace:
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
        source_provider = item.get("source_provider")
        if source_provider not in (None, "qveris_internal", "internal_failover", "unknown"):
            errors.append(f"{item_label}.source_provider: raw provider leak {source_provider!r}")

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


def main() -> int:
    root = Path.cwd()
    requested_dirs = sys.argv[1:]
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
                errors.extend(validate_finance_trace(fixture, str(fixture_path)))

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

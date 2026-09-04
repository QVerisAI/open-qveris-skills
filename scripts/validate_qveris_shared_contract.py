#!/usr/bin/env python3
"""Validate canonical QVeris finance references and per-skill copies."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path


MANIFEST = Path("references/qveris-finance-shared-manifest.json")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sync_contract(root: Path, manifest: dict[str, object], version: str | None) -> None:
    if version:
        manifest["version"] = version
    files = manifest["files"]
    skills = manifest["skill_copies"]
    if not isinstance(files, dict) or not isinstance(skills, list):
        raise ValueError("manifest files and skill_copies have invalid shapes")

    for relative in files:
        canonical = root / relative
        if not canonical.is_file():
            raise FileNotFoundError(f"missing canonical file: {relative}")
        files[relative] = sha256(canonical)
        local_relative = Path("schemas/output.schema.json") if relative.startswith("schemas/") else Path(relative)
        for skill in skills:
            copy = root / str(skill) / local_relative
            copy.parent.mkdir(parents=True, exist_ok=True)
            copy.write_bytes(canonical.read_bytes())

    (root / MANIFEST).write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sync", action="store_true", help="refresh hashes and per-skill copies")
    parser.add_argument("--version", help="set contract version while syncing")
    args = parser.parse_args()
    if args.version and not args.sync:
        parser.error("--version requires --sync")

    root = Path.cwd()
    manifest = json.loads((root / MANIFEST).read_text(encoding="utf-8"))
    if args.sync:
        sync_contract(root, manifest, args.version)
    errors: list[str] = []

    for relative, expected_hash in manifest["files"].items():
        canonical = root / relative
        if not canonical.is_file():
            errors.append(f"missing canonical file: {relative}")
            continue
        actual_hash = sha256(canonical)
        if actual_hash != expected_hash:
            errors.append(
                f"canonical hash mismatch: {relative}: expected {expected_hash}, got {actual_hash}"
            )

        local_relative = Path("schemas/output.schema.json") if relative.startswith("schemas/") else Path(relative)
        canonical_bytes = canonical.read_bytes()
        for skill in manifest["skill_copies"]:
            copy = root / skill / local_relative
            if not copy.is_file():
                errors.append(f"missing shared copy: {copy.relative_to(root)}")
            elif copy.read_bytes() != canonical_bytes:
                errors.append(f"shared copy drift: {copy.relative_to(root)}")

    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1

    print(
        f"ok: shared QVeris finance contract {manifest['version']} "
        f"matches {len(manifest['skill_copies'])} skills"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

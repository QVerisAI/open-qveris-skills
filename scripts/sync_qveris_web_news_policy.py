#!/usr/bin/env python3
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "shared" / "qveris-web-news-sentiment-policy.md"
SKILLS = (
    "qveris-a-share-data",
    "qveris-a-share-factor-screen",
    "qveris-a-stock-data-layer",
    "qveris-alphaear-market-intelligence",
    "qveris-daymade-financial-data-suite",
    "qveris-uzi-equity-research",
)


def main() -> None:
    if not SOURCE.is_file():
        raise SystemExit(f"missing canonical policy: {SOURCE}")
    for skill in SKILLS:
        skill_dir = ROOT / skill
        if not (skill_dir / "SKILL.md").is_file():
            raise SystemExit(f"missing skill: {skill}")
        target = skill_dir / "references" / SOURCE.name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(SOURCE, target)
        print(target.relative_to(ROOT))


if __name__ == "__main__":
    main()

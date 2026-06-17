"""Quality report for Slash Reader v2 curated vocabulary seed data.

The report is intentionally lightweight and dependency-free. It checks the two
seed JSON files, writes a Markdown report, and exits nonzero only for schema
problems that would make the app data unsafe to consume.
"""

from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DATA_FILES = [
    ROOT / "data" / "vocabulary.json",
    ROOT / "data" / "slang_idioms.json",
]
REPORT_PATH = ROOT / "generated" / "reports" / "vocabulary_quality_report.md"

REQUIRED_FIELDS = [
    "term",
    "type",
    "level",
    "chineseMeaning",
    "englishDefinition",
    "usageNote",
    "ieltsUsage",
    "priority",
    "source",
]

VALID_TYPES = {
    "ielts",
    "fiction",
    "slang",
    "idiom",
    "phrasal_verb",
    "fandom",
    "collocation",
    "reference",
}

LONG_FIELD_LIMITS = {
    "term": 48,
    "chineseMeaning": 60,
    "englishDefinition": 120,
    "usageNote": 160,
    "ieltsUsage": 120,
}

PHRASAL_PARTICLES = {
    "about",
    "across",
    "after",
    "around",
    "away",
    "back",
    "by",
    "down",
    "for",
    "in",
    "into",
    "off",
    "on",
    "out",
    "over",
    "through",
    "to",
    "up",
    "with",
}
PHRASAL_VERB_EXCEPTIONS = {
    "let go",
}


@dataclass
class DatasetItem:
    file_name: str
    index: int
    data: dict[str, Any]

    @property
    def label(self) -> str:
        term = self.data.get("term") or f"item {self.index}"
        return f"{self.file_name} #{self.index + 1} ({term})"


def normalize_term(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip().lower()


def load_items() -> tuple[list[DatasetItem], list[str]]:
    items: list[DatasetItem] = []
    errors: list[str] = []

    for path in DATA_FILES:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            errors.append(f"Missing file: {path.relative_to(ROOT)}")
            continue
        except json.JSONDecodeError as error:
            errors.append(f"Invalid JSON in {path.relative_to(ROOT)}: {error}")
            continue

        if not isinstance(data, list):
            errors.append(f"{path.relative_to(ROOT)} must contain a JSON array.")
            continue

        for index, item in enumerate(data):
            if not isinstance(item, dict):
                errors.append(f"{path.name} #{index + 1} must be an object.")
                continue

            items.append(DatasetItem(path.name, index, item))

    return items, errors


def priority_bucket(priority: Any) -> str:
    if not isinstance(priority, (int, float)):
        return "invalid"

    if priority < 0 or priority > 100:
        return "out_of_range"

    lower = int(priority // 10) * 10
    upper = min(lower + 9, 100)
    return f"{lower}-{upper}"


def is_phrase(term: str) -> bool:
    return " " in normalize_term(term)


def looks_like_phrasal_verb(term: str) -> bool:
    if normalize_term(term) in PHRASAL_VERB_EXCEPTIONS:
        return True

    parts = normalize_term(term).split()
    return len(parts) >= 2 and parts[-1] in PHRASAL_PARTICLES


def analyze(items: list[DatasetItem], load_errors: list[str]) -> dict[str, Any]:
    errors = list(load_errors)
    warnings: list[str] = []
    type_counts: Counter[str] = Counter()
    source_counts: Counter[str] = Counter()
    priority_counts: Counter[str] = Counter()
    missing_field_counts: Counter[str] = Counter()
    empty_field_counts: Counter[str] = Counter()
    terms_by_key: dict[str, list[DatasetItem]] = defaultdict(list)
    terms_by_casefold: dict[str, list[DatasetItem]] = defaultdict(list)

    for item in items:
        data = item.data
        term = data.get("term", "")
        normalized = normalize_term(term)

        if normalized:
            terms_by_key[normalized].append(item)
            terms_by_casefold[str(term).casefold()].append(item)

        if isinstance(term, str) and term != term.strip():
            warnings.append(f"{item.label}: term has leading/trailing spaces.")

        for field in REQUIRED_FIELDS:
            if field not in data:
                missing_field_counts[field] += 1
                errors.append(f"{item.label}: missing required field `{field}`.")
            elif isinstance(data[field], str) and not data[field].strip():
                empty_field_counts[field] += 1
                warnings.append(f"{item.label}: field `{field}` is an empty string.")

        item_type = data.get("type")
        if item_type in VALID_TYPES:
            type_counts[str(item_type)] += 1
        else:
            errors.append(f"{item.label}: invalid type `{item_type}`.")

        source = data.get("source") or "(missing)"
        source_counts[str(source)] += 1

        priority = data.get("priority")
        priority_counts[priority_bucket(priority)] += 1
        if not isinstance(priority, (int, float)):
            errors.append(f"{item.label}: priority must be a number.")
        elif priority < 0 or priority > 100:
            errors.append(f"{item.label}: priority {priority} is outside 0-100.")

        for field, limit in LONG_FIELD_LIMITS.items():
            value = data.get(field)
            if isinstance(value, str) and len(value) > limit:
                warnings.append(
                    f"{item.label}: `{field}` is {len(value)} characters; keep it under {limit} for compact UI."
                )

        if data.get("type") in {"slang", "idiom", "phrasal_verb"} and item.file_name == "vocabulary.json":
            warnings.append(f"{item.label}: phrase/slang type is in vocabulary.json; consider slang_idioms.json.")

        if data.get("type") == "phrasal_verb" and not looks_like_phrasal_verb(str(term)):
            warnings.append(f"{item.label}: type is phrasal_verb but term does not look like a phrasal verb.")

        if is_phrase(str(term)) and data.get("type") in {"ielts", "fiction"}:
            warnings.append(f"{item.label}: phrase entry has single-word type `{data.get('type')}`.")

    duplicates = {
        term: entries
        for term, entries in terms_by_key.items()
        if term and len(entries) > 1
    }
    case_duplicates = {
        term: entries
        for term, entries in terms_by_casefold.items()
        if term and len(entries) > 1 and len({str(entry.data.get("term")) for entry in entries}) > 1
    }

    for term, entries in duplicates.items():
        locations = ", ".join(entry.label for entry in entries)
        errors.append(f"Duplicate term `{term}` appears in: {locations}.")

    for term, entries in case_duplicates.items():
        locations = ", ".join(entry.label for entry in entries)
        warnings.append(f"Possible case-duplicate `{term}` appears in: {locations}.")

    return {
        "errors": errors,
        "warnings": warnings,
        "type_counts": type_counts,
        "source_counts": source_counts,
        "priority_counts": priority_counts,
        "missing_field_counts": missing_field_counts,
        "empty_field_counts": empty_field_counts,
        "duplicates": duplicates,
        "case_duplicates": case_duplicates,
        "total": len(items),
        "file_counts": Counter(item.file_name for item in items),
    }


def table_from_counter(counter: Counter[str], columns: tuple[str, str]) -> str:
    lines = [f"| {columns[0]} | {columns[1]} |", "|---|---:|"]

    if not counter:
        lines.append("| None | 0 |")
        return "\n".join(lines)

    for key, count in sorted(counter.items(), key=lambda item: str(item[0])):
        lines.append(f"| `{key}` | {count} |")

    return "\n".join(lines)


def bullet_list(items: list[str], empty_text: str, limit: int | None = None) -> str:
    if not items:
        return f"- {empty_text}"

    selected = items[:limit] if limit else items
    lines = [f"- {item}" for item in selected]

    if limit and len(items) > limit:
        lines.append(f"- ...and {len(items) - limit} more.")

    return "\n".join(lines)


def render_report(analysis: dict[str, Any]) -> str:
    error_count = len(analysis["errors"])
    warning_count = len(analysis["warnings"])
    duplicate_count = len(analysis["duplicates"])
    case_duplicate_count = len(analysis["case_duplicates"])

    return f"""# Vocabulary Quality Report

Generated by `scripts/check_vocabulary_dataset.py`.

## Summary

- Total items: {analysis["total"]}
- Serious errors: {error_count}
- Warnings: {warning_count}
- Duplicate terms: {duplicate_count}
- Possible case duplicates: {case_duplicate_count}

## Counts By File

{table_from_counter(analysis["file_counts"], ("File", "Items"))}

## Counts By Type

{table_from_counter(analysis["type_counts"], ("Type", "Items"))}

## Counts By Source

{table_from_counter(analysis["source_counts"], ("Source", "Items"))}

## Priority Distribution

{table_from_counter(analysis["priority_counts"], ("Priority bucket", "Items"))}

## Missing Required Fields

{table_from_counter(analysis["missing_field_counts"], ("Field", "Missing count"))}

## Empty String Fields

{table_from_counter(analysis["empty_field_counts"], ("Field", "Empty count"))}

## Duplicate Summary

{bullet_list([f"`{term}` appears {len(entries)} times" for term, entries in analysis["duplicates"].items()], "No duplicate normalized terms found.")}

## Warnings

{bullet_list(analysis["warnings"], "No warnings found.", limit=30)}

## Serious Errors

{bullet_list(analysis["errors"], "No serious schema-breaking errors found.", limit=30)}

## Suggested Next Cleanup Actions

- Keep all bubble-visible fields concise, especially `englishDefinition` and `ieltsUsage`.
- Review warnings before expanding beyond the MVP seed.
- Add external enrichment only through a build step that compiles a small app-ready subset.
- Prefer human review for high-priority candidates before adding them to app data.
"""


def main() -> int:
    items, load_errors = load_items()
    analysis = analyze(items, load_errors)
    report = render_report(analysis)
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(report, encoding="utf-8")

    error_count = len(analysis["errors"])
    warning_count = len(analysis["warnings"])
    print(
        f"Vocabulary quality report: {analysis['total']} items, "
        f"{error_count} errors, {warning_count} warnings. "
        f"Wrote {REPORT_PATH.relative_to(ROOT)}."
    )

    return 1 if error_count else 0


if __name__ == "__main__":
    raise SystemExit(main())

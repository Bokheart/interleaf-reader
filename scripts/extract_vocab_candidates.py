"""Small copyright-safe vocabulary candidate extractor for Slash Reader v2.

This prototype samples a limited page range from a structured PDF and emits
candidate terms only. It intentionally does not save raw PDF text, full entries,
definitions, examples, or page content.
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "source_materials"
OUTPUT_PATH = ROOT / "generated" / "vocab_candidates" / "longman_candidates.sample.json"
DEFAULT_SOURCE_KEYWORDS = ("longman", "collocations dictionary")
PARTS_OF_SPEECH = (
    "adjective",
    "adverb",
    "noun",
    "verb",
    "phrasal verb",
)
COPYRIGHT_SAFE_NOTE = "Candidate term only; no full dictionary entry copied."


@dataclass(frozen=True)
class Candidate:
    term: str
    page: int
    confidence: float
    reason: str


def normalize_term(value: str) -> str:
    """Normalize a candidate term without changing meaningful word order."""
    return re.sub(r"\s+", " ", value).strip(" -\t\r\n").lower()


def clean_headword(value: str) -> str:
    """Remove dictionary labels/pronunciation from a headword line."""
    cleaned = re.sub(r"/[^/]+/", " ", value)
    cleaned = re.sub(r"\bAC\b", " ", cleaned)
    cleaned = re.sub(r"\b[a-zA-Z]+[0-9]+\b", lambda match: re.sub(r"\d+", "", match.group(0)), cleaned)
    cleaned = re.sub(r"[$◂]", " ", cleaned)
    return normalize_term(cleaned)


def find_source_pdf(source_dir: Path = SOURCE_DIR) -> Path:
    """Find the preferred Longman/collocations PDF by filename."""
    pdfs = sorted(source_dir.rglob("*.pdf"))

    for keyword in DEFAULT_SOURCE_KEYWORDS:
        matches = [path for path in pdfs if keyword in path.name.lower()]
        if matches:
            return matches[0]

    raise FileNotFoundError(
        "Could not find a PDF under source_materials/ containing "
        "'Longman' or 'Collocations Dictionary'."
    )


def is_likely_candidate_term(term: str) -> bool:
    """Keep only compact English terms that are plausible headwords."""
    if not term or len(term) > 48:
        return False

    if not re.fullmatch(r"[a-z][a-z' -]*", term):
        return False

    words = term.split()
    if len(words) > 4:
        return False

    stop_terms = {
        "a",
        "an",
        "and",
        "be",
        "for",
        "of",
        "or",
        "someone",
        "something",
        "the",
        "to",
    }
    return term not in stop_terms


def candidate_from_line(line: str, page: int) -> Candidate | None:
    """Extract one compact candidate from a single PDF text line."""
    cleaned = re.sub(r"\s+", " ", line).strip()

    if not cleaned or len(cleaned) > 80:
        return None

    lower = cleaned.lower()

    for pos in sorted(PARTS_OF_SPEECH, key=len, reverse=True):
        suffix = f" {pos}"
        if lower.endswith(suffix):
            term = clean_headword(cleaned[: -len(suffix)])
            if is_likely_candidate_term(term):
                return Candidate(
                    term=term,
                    page=page,
                    confidence=0.82,
                    reason="Detected as likely headword plus part-of-speech label from sampled PDF text.",
                )

    return None


def dedupe_candidates(candidates: list[Candidate], limit: int) -> list[Candidate]:
    """Deduplicate by normalized term, keeping highest confidence first."""
    by_term: dict[str, Candidate] = {}

    for candidate in sorted(candidates, key=lambda item: (-item.confidence, item.page, item.term)):
        by_term.setdefault(candidate.term, candidate)

    return list(by_term.values())[:limit]


def extract_candidates(pdf_path: Path, start_page: int, end_page: int, limit: int) -> list[dict]:
    """Extract candidate terms from a small inclusive 1-based page range."""
    try:
        import fitz  # type: ignore
    except ImportError as error:
        raise RuntimeError("PyMuPDF is required for this prototype. Install/use an environment with 'fitz'.") from error

    if start_page < 1 or end_page < start_page:
        raise ValueError("Expected a valid inclusive page range, e.g. --start-page 6 --end-page 10.")

    candidates: list[Candidate] = []
    doc = fitz.open(str(pdf_path))

    try:
        last_page = min(end_page, doc.page_count)

        for page_number in range(start_page, last_page + 1):
            text = doc.load_page(page_number - 1).get_text("text") or ""

            for line in text.splitlines():
                candidate = candidate_from_line(line, page_number)
                if candidate:
                    candidates.append(candidate)
    finally:
        doc.close()

    return [
        {
            "term": candidate.term,
            "type": "collocation_candidate",
            "sourceCategory": "collocation",
            "sourceTag": "longman_sample",
            "confidence": candidate.confidence,
            "reason": candidate.reason,
            "page": candidate.page,
            "copyrightSafeNote": COPYRIGHT_SAFE_NOTE,
        }
        for candidate in dedupe_candidates(candidates, limit)
    ]


def write_candidates(candidates: list[dict], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(candidates, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract a small copyright-safe Longman candidate sample."
    )
    parser.add_argument("--start-page", type=int, default=6, help="1-based first page to sample.")
    parser.add_argument("--end-page", type=int, default=20, help="1-based last page to sample.")
    parser.add_argument("--limit", type=int, default=50, help="Maximum candidates to write.")
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH, help="Candidate JSON output path.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    limit = max(1, min(args.limit, 50))
    pdf_path = find_source_pdf()
    candidates = extract_candidates(pdf_path, args.start_page, args.end_page, limit)
    write_candidates(candidates, args.output)
    print(
        json.dumps(
            {
                "source": pdf_path.name,
                "pageRange": f"{args.start_page}-{args.end_page}",
                "candidateCount": len(candidates),
                "output": str(args.output.relative_to(ROOT) if args.output.is_absolute() else args.output),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

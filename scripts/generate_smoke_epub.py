"""Generate the copyright-safe EPUB fixture used by M1 browser smoke tests.

The fixture text is self-authored for Interleaf Reader testing. It is not
derived from a book, fanfic, dictionary, or external source.
"""

from __future__ import annotations

import argparse
import textwrap
import zipfile
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = PROJECT_ROOT / "tests" / "fixtures" / "interleaf_smoke.epub"
ZIP_TIMESTAMP = (2026, 1, 1, 0, 0, 0)


CHAPTERS = [
    {
        "id": "preface",
        "href": "preface.xhtml",
        "title": "Preface",
        "paragraphs": [
            "This smoke test book is an original fixture for Interleaf Reader. It exists only to test EPUB import, chapter navigation, vocabulary preview, and local restore behavior.",
            "A careful reader may feel anxious before a test run, but the story here is simple by design. The small crew will glance at signs, mutter about tension, and figure out what changed.",
            "Every paragraph is self-authored test text. It avoids copyrighted stories, fanfiction, lyrics, and dictionary entries while still giving the reader enough lines for vertical scrolling.",
            "The fixture repeats a few useful words so the Vocabulary Preview can find matches without depending on a private book file.",
            "If a future smoke test needs more scrolling, add original paragraphs here rather than copying from source material.",
        ],
    },
    {
        "id": "chapter1",
        "href": "chapter1.xhtml",
        "title": "Chapter 1",
        "paragraphs": [
            "Mara stood beside the quiet archive door and felt reluctant to go inside. The hall was narrow, the clock was loud, and the tension made everyone whisper.",
            "Jon tried to bring up the missing map, but Mara lifted a hand and told him to back off for one minute. She needed space to figure out why the lock was warm.",
            "A silver label was tucked under the handle. Mara gave it one quick glance, then began to mutter the code from memory.",
            "The archive opened onto a room full of plain wooden shelves. Nothing magical happened, but the silence felt anxious and deliberate.",
            "Jon wanted to rush ahead. Mara was reluctant again, not because she was afraid, but because every clue seemed arranged for someone else to find.",
            "They walked past three lamps, two blank notebooks, and a basket of paper stars. The ordinary details helped them figure out the pattern.",
            "When the floor creaked, Jon stepped closer. Mara told him to back off with a calm voice, then pointed at the dusty window frame.",
            "A second glance showed a line of fresh fingerprints. The tension eased a little because the mystery had become practical.",
            "Mara began to mutter a list of names from the archive ledger. Jon wrote each name down and tried not to bring up old mistakes.",
            "By the time the bell rang outside, both of them understood the first rule of the room: nothing was hidden unless someone wanted it found.",
        ],
    },
    {
        "id": "chapter2",
        "href": "chapter2.xhtml",
        "title": "Chapter 2",
        "paragraphs": [
            "The next morning, Mara returned with tea, string, and a stubborn plan. She was less anxious now, though still reluctant to trust the neat row of clues.",
            "Jon leaned over the desk to glance at the map. He started to bring up the locked drawer, then stopped when Mara began to mutter another code.",
            "The drawer clicked open. Inside was a card that said, in careful blue ink, back off and listen.",
            "For a long second, the room held its breath. The tension was not dangerous, only strange, like a question waiting for the right answer.",
            "Mara laughed first. She could finally figure out the trick: the archive was not testing courage, it was testing patience.",
            "Jon felt reluctant to admit that patience was useful. He gave the card a final glance and slid it into the notebook.",
            "They spent the afternoon reading labels, checking shelves, and letting the clues stay small. No one had to run. No one had to shout.",
            "When Mara started to mutter again, the words were not a code this time. They were a reminder that slow reading can reveal what fast reading misses.",
            "The archive door closed behind them at sunset. The tension was gone, and the hallway felt like an ordinary hallway again.",
            "This final paragraph gives the smoke test a little more scroll height and confirms that repeated vocabulary remains inside ordinary chapter prose.",
        ],
    },
]


def strip_indent(value: str) -> str:
    return textwrap.dedent(value).strip() + "\n"


def xhtml_page(title: str, paragraphs: list[str]) -> str:
    body = "\n".join(f"    <p>{paragraph}</p>" for paragraph in paragraphs)
    return strip_indent(
        f"""\
        <?xml version="1.0" encoding="UTF-8"?>
        <html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">
          <head>
            <meta charset="UTF-8" />
            <title>{title}</title>
          </head>
          <body>
            <h1>{title}</h1>
        {body}
          </body>
        </html>
        """
    )


def build_files() -> dict[str, str]:
    manifest_items = "\n".join(
        f'    <item id="{chapter["id"]}" href="{chapter["href"]}" media-type="application/xhtml+xml"/>'
        for chapter in CHAPTERS
    )
    spine_items = "\n".join(
        f'    <itemref idref="{chapter["id"]}"/>' for chapter in CHAPTERS
    )
    nav_items = "\n".join(
        f'      <li><a href="{chapter["href"]}">{chapter["title"]}</a></li>'
        for chapter in CHAPTERS
    )

    files = {
        "META-INF/container.xml": strip_indent(
            """\
            <?xml version="1.0" encoding="UTF-8"?>
            <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
              <rootfiles>
                <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
              </rootfiles>
            </container>
            """
        ),
        "OEBPS/content.opf": strip_indent(
            f"""\
            <?xml version="1.0" encoding="UTF-8"?>
            <package version="3.0" unique-identifier="bookid" xmlns="http://www.idpf.org/2007/opf">
              <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/">
                <dc:identifier id="bookid">urn:uuid:interleaf-smoke-test-book</dc:identifier>
                <dc:title>Interleaf Smoke Test Book</dc:title>
                <dc:creator>Interleaf Test Fixture</dc:creator>
                <dc:language>en</dc:language>
                <dcterms:modified>2026-01-01T00:00:00Z</dcterms:modified>
              </metadata>
              <manifest>
                <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
            {manifest_items}
              </manifest>
              <spine>
            {spine_items}
              </spine>
            </package>
            """
        ),
        "OEBPS/nav.xhtml": strip_indent(
            f"""\
            <?xml version="1.0" encoding="UTF-8"?>
            <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en">
              <head>
                <meta charset="UTF-8" />
                <title>Contents</title>
              </head>
              <body>
                <nav epub:type="toc" id="toc">
                  <h1>Contents</h1>
                  <ol>
            {nav_items}
                  </ol>
                </nav>
              </body>
            </html>
            """
        ),
    }

    for chapter in CHAPTERS:
        files[f'OEBPS/{chapter["href"]}'] = xhtml_page(
            chapter["title"],
            chapter["paragraphs"],
        )

    return files


def write_epub(output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    files = build_files()

    with zipfile.ZipFile(output_path, "w") as archive:
        mimetype_info = zipfile.ZipInfo("mimetype", ZIP_TIMESTAMP)
        mimetype_info.compress_type = zipfile.ZIP_STORED
        archive.writestr(mimetype_info, "application/epub+zip")

        for name, content in files.items():
            info = zipfile.ZipInfo(name, ZIP_TIMESTAMP)
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, content.encode("utf-8"))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate tests/fixtures/interleaf_smoke.epub for browser smoke tests."
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"EPUB output path. Defaults to {DEFAULT_OUTPUT}",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_path = args.output.resolve()
    write_epub(output_path)
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()

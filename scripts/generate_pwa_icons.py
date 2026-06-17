from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "pwa-reader" / "assets" / "icons"

BG = (36, 95, 115, 255)
PAGE = (247, 245, 240, 255)
PAGE_SHADOW = (226, 220, 205, 255)
LEAF = (167, 201, 87, 255)
LEAF_DARK = (92, 137, 68, 255)


def lerp(a: int, b: int, t: float) -> int:
    return round(a + (b - a) * t)


def point_in_polygon(x: float, y: float, points: list[tuple[float, float]]) -> bool:
    inside = False
    j = len(points) - 1
    for i, point in enumerate(points):
        xi, yi = point
        xj, yj = points[j]
        crosses = (yi > y) != (yj > y)
        if crosses:
            x_intersect = (xj - xi) * (y - yi) / ((yj - yi) or 1e-9) + xi
            if x < x_intersect:
                inside = not inside
        j = i
    return inside


def draw_polygon(pixels: bytearray, size: int, points: list[tuple[float, float]], color: tuple[int, int, int, int]) -> None:
    xs = [x for x, _ in points]
    ys = [y for _, y in points]
    min_x = max(0, math.floor(min(xs)))
    max_x = min(size - 1, math.ceil(max(xs)))
    min_y = max(0, math.floor(min(ys)))
    max_y = min(size - 1, math.ceil(max(ys)))
    for y in range(min_y, max_y + 1):
        for x in range(min_x, max_x + 1):
            if point_in_polygon(x + 0.5, y + 0.5, points):
                offset = (y * size + x) * 4
                pixels[offset : offset + 4] = bytes(color)


def draw_ellipse(pixels: bytearray, size: int, cx: float, cy: float, rx: float, ry: float, color: tuple[int, int, int, int]) -> None:
    min_x = max(0, math.floor(cx - rx))
    max_x = min(size - 1, math.ceil(cx + rx))
    min_y = max(0, math.floor(cy - ry))
    max_y = min(size - 1, math.ceil(cy + ry))
    for y in range(min_y, max_y + 1):
        for x in range(min_x, max_x + 1):
            dx = (x + 0.5 - cx) / rx
            dy = (y + 0.5 - cy) / ry
            if dx * dx + dy * dy <= 1:
                offset = (y * size + x) * 4
                pixels[offset : offset + 4] = bytes(color)


def draw_line(pixels: bytearray, size: int, start: tuple[float, float], end: tuple[float, float], width: float, color: tuple[int, int, int, int]) -> None:
    x1, y1 = start
    x2, y2 = end
    min_x = max(0, math.floor(min(x1, x2) - width))
    max_x = min(size - 1, math.ceil(max(x1, x2) + width))
    min_y = max(0, math.floor(min(y1, y2) - width))
    max_y = min(size - 1, math.ceil(max(y1, y2) + width))
    dx = x2 - x1
    dy = y2 - y1
    length_sq = dx * dx + dy * dy or 1
    radius = width / 2
    for y in range(min_y, max_y + 1):
        for x in range(min_x, max_x + 1):
            px = x + 0.5
            py = y + 0.5
            t = max(0, min(1, ((px - x1) * dx + (py - y1) * dy) / length_sq))
            nearest_x = x1 + t * dx
            nearest_y = y1 + t * dy
            if (px - nearest_x) ** 2 + (py - nearest_y) ** 2 <= radius * radius:
                offset = (y * size + x) * 4
                pixels[offset : offset + 4] = bytes(color)


def render_icon(size: int, maskable: bool = False) -> bytearray:
    scale = 4
    canvas = size * scale
    pixels = bytearray(BG * (canvas * canvas))

    pad = 0.18 if maskable else 0.12
    left_page = [
        (canvas * (pad + 0.04), canvas * 0.30),
        (canvas * 0.48, canvas * 0.22),
        (canvas * 0.48, canvas * 0.76),
        (canvas * (pad + 0.04), canvas * 0.84),
    ]
    right_page = [
        (canvas * 0.52, canvas * 0.22),
        (canvas * (1 - pad - 0.04), canvas * 0.30),
        (canvas * (1 - pad - 0.04), canvas * 0.84),
        (canvas * 0.52, canvas * 0.76),
    ]

    draw_polygon(pixels, canvas, left_page, PAGE)
    draw_polygon(pixels, canvas, right_page, PAGE)
    draw_line(pixels, canvas, (canvas * 0.50, canvas * 0.24), (canvas * 0.50, canvas * 0.78), canvas * 0.018, PAGE_SHADOW)

    draw_ellipse(pixels, canvas, canvas * 0.50, canvas * 0.43, canvas * 0.17, canvas * 0.22, LEAF)
    draw_polygon(
        pixels,
        canvas,
        [
            (canvas * 0.50, canvas * 0.20),
            (canvas * 0.66, canvas * 0.42),
            (canvas * 0.50, canvas * 0.66),
            (canvas * 0.34, canvas * 0.42),
        ],
        LEAF,
    )
    draw_line(pixels, canvas, (canvas * 0.50, canvas * 0.27), (canvas * 0.50, canvas * 0.64), canvas * 0.018, LEAF_DARK)
    draw_line(pixels, canvas, (canvas * 0.50, canvas * 0.45), (canvas * 0.40, canvas * 0.39), canvas * 0.010, LEAF_DARK)
    draw_line(pixels, canvas, (canvas * 0.50, canvas * 0.49), (canvas * 0.61, canvas * 0.41), canvas * 0.010, LEAF_DARK)

    return downsample(pixels, canvas, size, scale)


def downsample(pixels: bytearray, canvas: int, size: int, scale: int) -> bytearray:
    output = bytearray(size * size * 4)
    for y in range(size):
        for x in range(size):
            sums = [0, 0, 0, 0]
            for sy in range(scale):
                for sx in range(scale):
                    src = (((y * scale + sy) * canvas) + (x * scale + sx)) * 4
                    for channel in range(4):
                        sums[channel] += pixels[src + channel]
            dst = (y * size + x) * 4
            count = scale * scale
            output[dst : dst + 4] = bytes(round(value / count) for value in sums)
    return output


def png_chunk(kind: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)


def write_png(path: Path, size: int, pixels: bytearray) -> None:
    raw = bytearray()
    stride = size * 4
    for y in range(size):
        raw.append(0)
        start = y * stride
        raw.extend(pixels[start : start + stride])
    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    data = b"\x89PNG\r\n\x1a\n"
    data += png_chunk(b"IHDR", header)
    data += png_chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    data += png_chunk(b"IEND", b"")
    path.write_bytes(data)


def write_svg(path: Path) -> None:
    path.write_text(
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-labelledby="title desc">
  <title id="title">Interleaf Reader icon</title>
  <desc id="desc">A simple self-authored book and leaf mark.</desc>
  <rect width="512" height="512" fill="#245f73"/>
  <path d="M86 154 246 112v286L86 432z" fill="#f7f5f0"/>
  <path d="M266 112 426 154v278L266 398z" fill="#f7f5f0"/>
  <path d="M256 122v278" stroke="#e2dccd" stroke-width="10" stroke-linecap="round"/>
  <path d="M256 96c76 68 76 151 0 236-76-85-76-168 0-236z" fill="#a7c957"/>
  <path d="M256 138v190M256 230l-58-37M256 252l62-46" stroke="#5c8944" stroke-width="9" stroke-linecap="round"/>
</svg>
""",
        encoding="utf-8",
    )


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    write_svg(ICON_DIR / "interleaf-icon.svg")
    write_png(ICON_DIR / "icon-192.png", 192, render_icon(192))
    write_png(ICON_DIR / "icon-512.png", 512, render_icon(512))
    write_png(ICON_DIR / "icon-maskable-512.png", 512, render_icon(512, maskable=True))


if __name__ == "__main__":
    main()

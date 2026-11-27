#!/usr/bin/env python3
"""Build the About-section silhouette artwork from the owner's photo.

Treatment (chosen so the black-and-white photo belongs to Porto's
pearl + dark-green theme, with no visible picture edge at all):
- Pure cutout, not a duotone: only the very dark pixels stay, as solid
  --green #0C3B2E. Everything lighter — the wall, the halo glow, the
  dark vignette in the corners — maps to --pearl #FAF7F2, exactly the
  section ground, so the photo's background disappears and only the
  dark-green person remains. Measured on the source: the figure sits
  near luminance 0-5, the wall at 30-140, so the ramp runs 8-40.
- The cutout edge is smoothed, not thresholded hard: the source is
  blurred a touch before the ramp (kills single-pixel speckle) and the
  edge mask is blurred too, so the silhouette reads clean at any size
  instead of rough and jagged.
- Top and left fades to pearl baked in, so the dark band at the top of
  the frame and the vignette strip at the left edge dissolve instead
  of ending in a hard line. The site uses no gradient washes, so the
  blend lives in the image file, not in CSS.
- Exports 1x (600w) and 2x (1080w) in WebP (primary) and JPEG (fallback).

Usage (from the repo root):
    python3 scripts/make-about-silhouette.py <source-photo>
Requires Pillow: pip install pillow
"""
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

GREEN = (12, 59, 46)
PEARL = (250, 247, 242)
RAMP_LO = 8
RAMP_HI = 40
TOP_FADE = 0.22
LEFT_FADE = 0.28
SOURCE_BLUR = 1
MASK_BLUR = 2


def smoothstep(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def cutout(gray):
    """Keep only the dark figure: green below the ramp, pearl above it."""
    lut_r = [
        round(GREEN[0] + (PEARL[0] - GREEN[0]) * smoothstep((i - RAMP_LO) / (RAMP_HI - RAMP_LO)))
        for i in range(256)
    ]
    lut_g = [
        round(GREEN[1] + (PEARL[1] - GREEN[1]) * smoothstep((i - RAMP_LO) / (RAMP_HI - RAMP_LO)))
        for i in range(256)
    ]
    lut_b = [
        round(GREEN[2] + (PEARL[2] - GREEN[2]) * smoothstep((i - RAMP_LO) / (RAMP_HI - RAMP_LO)))
        for i in range(256)
    ]
    return Image.merge(
        "RGB",
        (gray.point(lut_r), gray.point(lut_g), gray.point(lut_b)),
    )


def edge_fade_mask(width, height):
    """White inside, fading to black across the top and left edges.

    The fade curve is the smoothstep squared, so it dissolves fast
    right at the edge (killing the dark vignette in the photo's top
    corners) while leaving the figure's hair all but untouched.
    """
    top_px = max(1, int(height * TOP_FADE))
    col = Image.new("L", (1, height))
    col.putdata([round(255 * smoothstep(y / top_px) ** 2) for y in range(height)])
    left_px = max(1, int(width * LEFT_FADE))
    row = Image.new("L", (width, 1))
    row.putdata([round(255 * smoothstep(x / left_px) ** 2) for x in range(width)])
    return ImageChops.darker(
        col.resize((width, height)), row.resize((width, height))
    )


def radial_window(width, height):
    """Soft elliptical window around the figure, fading to black at the
    edges. The photo's background is a dark vignette: its corners are
    as dark as the figure, so luminance alone cannot tell them apart —
    only position can. The window keeps the central figure and dissolves
    the corner and edge vignette to pearl."""
    cx, cy = width * 0.50, height * 0.48
    rx, ry = width * 0.40, height * 0.48
    sw, sh = width // 4, height // 4
    win = Image.new("L", (sw, sh))
    px = win.load()
    for yy in range(sh):
        for xx in range(sw):
            x, y = xx * 4, yy * 4
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            px[xx, yy] = round(255 * (1 - smoothstep((d - 0.65) / 0.30)))
    return win.resize((width, height), Image.BICUBIC)


def crush_mask(mask):
    """Levels on the cutout mask: anything below LOW is fully pearl,
    anything above HIGH is fully figure, with a smooth ramp between.
    The photo's halo ring shows through at partial mask strength as a
    grey-green wash, so the wash lives in the mask's mid-tones — this
    removes it while the blur below keeps the figure's own edge soft."""
    low, high = 100, 170
    lut = [
        0 if v < low else 255 if v > high else round(255 * (v - low) / (high - low))
        for v in range(256)
    ]
    return mask.point(lut)


def erase_stray_hair(mask):
    """Erase the loose hair strand floating left of the head. It is part
    of the photo, but once the background is gone it reads as a stray
    mark, so the mask is forced to pearl over a soft-edged ellipse
    around it. The ellipse stays clear of the hair's own left edge."""
    patch = Image.new("L", mask.size, 0)
    draw = ImageDraw.Draw(patch)
    draw.ellipse([135, 141, 385, 491], fill=255)
    draw.line([(360, 165), (195, 465)], fill=255, width=100)
    patch = patch.filter(ImageFilter.GaussianBlur(15))
    return ImageChops.darker(mask, ImageChops.invert(patch))


def main(source):
    root = Path(__file__).resolve().parent.parent
    gray = Image.open(source).convert("L")
    gray = gray.filter(ImageFilter.GaussianBlur(SOURCE_BLUR))
    mask = erase_stray_hair(
        crush_mask(
            ImageChops.darker(edge_fade_mask(*gray.size), radial_window(*gray.size))
        )
    ).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(MASK_BLUR))
    art = Image.composite(
        cutout(gray),
        Image.new("RGB", gray.size, PEARL),
        mask,
    )
    width, height = art.size
    for out_width, suffix, quality in ((1080, "-2x", 82), (600, "", 80)):
        sized = art.resize(
            (out_width, round(height * out_width / width)), Image.LANCZOS
        )
        sized.save(
            root / f"public/images/about-silhouette{suffix}.webp",
            "WEBP",
            quality=quality,
        )
        sized.save(
            root / f"public/images/about-silhouette{suffix}.jpg",
            "JPEG",
            quality=quality,
        )
    print("wrote public/images/about-silhouette 1x/2x webp+jpg")


if __name__ == "__main__":
    main(sys.argv[1])

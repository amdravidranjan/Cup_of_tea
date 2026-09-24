"""
Finishes the SIH deck: real screenshots, real links, real QR codes on slide 6,
and the one claim on slide 2 that the walkthrough changed.

The deck is exported from Figma as one full-bleed image per slide, so the last
slide's eight screenshot placeholders and five "<add link>" lines cannot be
filled by editing text — they are pixels. This redraws that one slide's artwork
over the exported image and writes it back into the .pptx, which keeps every
other slide byte-identical and takes seconds to re-run when a link changes.

Re-run it when a link arrives:

    python scripts/finish-deck-slide6.py --video https://youtu.be/<id>
    python scripts/finish-deck-slide6.py --docs "https://drive.google.com/..."

Coordinates are in the exported artwork's own pixels (3840x2160) and were
measured off the export itself, not guessed: the caption bars are the only
unambiguous landmarks, and everything else is positioned from them.
"""

import argparse
import io
import shutil
from pathlib import Path

import segno
from PIL import Image, ImageDraw, ImageFont
from pptx import Presentation

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
DECK = DOCS / "NILAMS-SIH2026-Idea-PPT-CupOfTea.pptx"

# ── What the slide should say ────────────────────────────────────────────
LIVE_URL = "https://nilams.vercel.app"
REPO_URL = "github.com/amdravidranjan/Cup_of_tea"
DOCS_URL = "github.com/amdravidranjan/Cup_of_tea/tree/main/docs"
FEATURES_URL = "github.com/amdravidranjan/Cup_of_tea/blob/main/docs/all-features.md"

# ── Artwork geometry, measured from the export ───────────────────────────
PANEL_X = [(1304, 1886), (1915, 2497), (2526, 3108), (3137, 3719)]
PANEL_ROWS = [(1356, 1552), (1672, 1868)]          # top of panel, top of caption bar
CAPTION_H = 96                                      # dark bar under each panel
PILL_TOPS = [1375, 1479, 1583, 1687, 1791]          # the five link cards, left column
PILL_TEXT_X = 212
QR_BOXES = [(1020, 1362, 1245, 1587), (1020, 1677, 1245, 1902)]

# Slide 2's "Phase 0 done" chips. The voice-bot chip named two languages; the
# assistant now answers in three, and the walkthrough speaks twenty-two.
CHIP_BOX = (3302, 1844, 3678, 1885)
CHIP_TEXT = "✓ Voice bot: EN / HI / TA"
CHIP_INK = (20, 83, 45)

NAVY = (16, 42, 74)
LINK_BLUE = (21, 101, 192)
PANEL_EDGE = (203, 213, 225)
WHITE = (255, 255, 255)

# The eight panels, in reading order, each with the caption that goes under it.
PANELS = [
    ("shot1-public-portal.png", "Public transparency portal · live stats, no login"),
    ("shot2-workflow-risk.png", "11-stage legal workflow + explainable risk score"),
    ("shot3-parcels-map.png", "Geo-tagged parcels: Notified / Acquired / Possessed"),
    ("shot4-3d-terrain.png", "3D terrain view · Bhavani River Bridge, Sirumugai"),
    ("shot5-village-intake.png", "Village-batch intake: one file → every plot"),
    ("shot6-audit-ledger.png", "Tamper-evident audit ledger · “Verify the chain”"),
    ("shot7-mobile-field.png", "Works on a phone · officer console, mobile"),
    ("shot8-guided-walkthrough.png", "Guided walkthrough · 22 languages, voice-led"),
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "arialbd.ttf" if bold else "arial.ttf"
    try:
        return ImageFont.truetype(f"C:/Windows/Fonts/{name}", size)
    except OSError:
        return ImageFont.load_default()


def fit(image: Image.Image, width: int, height: int) -> Image.Image:
    """
    Fits the whole screen inside the panel.

    The panels are three times wider than they are tall, so cropping a band
    out of a screenshot leaves a stripe of whitespace that reads as nothing.
    Showing the entire screen small still reads as a screen, which is what the
    slide is claiming.
    """
    panel = Image.new("RGB", (width, height), (248, 250, 252))
    scale = min(width / image.width, height / image.height)
    thumb = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.LANCZOS)
    panel.paste(thumb, ((width - thumb.width) // 2, (height - thumb.height) // 2))
    return panel


def qr(data: str, size: int) -> Image.Image:
    buffer = io.BytesIO()
    segno.make(data, error="m").save(buffer, kind="png", scale=12, border=1, dark="#102a4a")
    return Image.open(buffer).convert("RGB").resize((size, size), Image.NEAREST)


def compose(artwork: Image.Image, links: dict[str, str | None]) -> Image.Image:
    art = artwork.convert("RGB")
    draw = ImageDraw.Draw(art)

    # 1. The eight screenshots, each with its caption redrawn so the caption
    #    always matches the picture above it.
    for index, (name, caption) in enumerate(PANELS):
        row, col = divmod(index, 4)
        x0, x1 = PANEL_X[col]
        top, cap_top = PANEL_ROWS[row]
        shot = Image.open(DOCS / name)
        art.paste(fit(shot, x1 - x0, cap_top - top), (x0, top))
        draw.rectangle([x0, top, x1 - 1, cap_top - 1], outline=PANEL_EDGE, width=2)

        draw.rectangle([x0, cap_top, x1 - 1, cap_top + CAPTION_H - 1], fill=NAVY)
        wrap, line, lines = x1 - x0 - 40, "", []
        caption_font = font(25, bold=True)
        for word in caption.split():
            trial = f"{line} {word}".strip()
            if draw.textlength(trial, font=caption_font) > wrap and line:
                lines.append(line)
                line = word
            else:
                line = trial
        lines.append(line)
        y = cap_top + (CAPTION_H - len(lines) * 32) // 2
        for text in lines[:2]:
            draw.text((x0 + 20, y), text, font=caption_font, fill=WHITE)
            y += 32

    # 2. The five links. Only the URL line of each card is repainted; the
    #    label above it and the card itself are already right.
    lines = [
        links["live"],
        links["video"] or "Upload pending — ask the team",
        REPO_URL,
        links["docs"],
        links["features"],
    ]
    url_font = font(23)
    for pill_top, url in zip(PILL_TOPS, lines):
        y = pill_top + 44
        draw.rectangle([PILL_TEXT_X - 4, y - 4, 960, y + 30], fill=WHITE)
        draw.text((PILL_TEXT_X, y), url, font=url_font, fill=LINK_BLUE)
        width = draw.textlength(url, font=url_font)
        draw.line([PILL_TEXT_X, y + 27, PILL_TEXT_X + width, y + 27], fill=LINK_BLUE, width=2)

    # 3. The two QR codes: the live site, and the video once it exists.
    for (box, target) in zip(QR_BOXES, [links["live"], links["video"]]):
        x0, y0, x1, y1 = box
        draw.rectangle([x0, y0, x1, y1], fill=WHITE)
        if not target:
            continue
        code = qr(target, x1 - x0 - 16)
        art.paste(code, (x0 + 8, y0 + 8))

    return art


def patch_chip(artwork: Image.Image) -> Image.Image:
    """Repaints the language chip on slide 2, leaving its pill outline alone."""
    art = artwork.convert("RGB")
    draw = ImageDraw.Draw(art)
    x0, y0, x1, y1 = CHIP_BOX
    draw.rectangle([x0 + 10, y0 + 5, x1 - 10, y1 - 5], fill=WHITE)
    chip_font = font(27, bold=True)
    width = draw.textlength(CHIP_TEXT, font=chip_font)
    draw.text(
        (x0 + (x1 - x0 - width) / 2, y0 + (y1 - y0 - 30) / 2),
        CHIP_TEXT,
        font=chip_font,
        fill=CHIP_INK,
    )
    return art


def artwork_of(slide):
    picture = next(shape for shape in slide.shapes if shape.shape_type == 13)
    part = picture.part.related_part(picture._element.blip_rId)
    return part, Image.open(io.BytesIO(part.blob))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", help="Public URL of the demo video, once uploaded")
    parser.add_argument("--docs", default=DOCS_URL, help="Where the written documentation lives")
    parser.add_argument("--features", default=FEATURES_URL, help="Feature list / design docs")
    parser.add_argument("--live", default=LIVE_URL, help="The deployed prototype")
    parser.add_argument("--deck", default=str(DECK))
    args = parser.parse_args()

    deck_path = Path(args.deck)
    backup = deck_path.with_suffix(".pptx.bak")
    if not backup.exists():
        shutil.copy2(deck_path, backup)

    presentation = Presentation(str(deck_path))
    slide = presentation.slides[5]
    picture = next(shape for shape in slide.shapes if shape.shape_type == 13)
    part = picture.part.related_part(picture._element.blip_rId)

    # Always compose from the untouched export in the backup, so re-running
    # with a new link redraws the slide rather than painting over a painting.
    pristine = Presentation(str(backup)).slides[5]
    source = next(shape for shape in pristine.shapes if shape.shape_type == 13)
    artwork = Image.open(io.BytesIO(source.part.related_part(source._element.blip_rId).blob))
    finished = compose(
        artwork,
        {"live": args.live, "video": args.video, "docs": args.docs, "features": args.features},
    )

    buffer = io.BytesIO()
    finished.save(buffer, format="PNG", optimize=True)
    part._blob = buffer.getvalue()
    presentation.save(str(deck_path))

    preview = DOCS / "slide6-preview.png"
    finished.resize((1280, 720), Image.LANCZOS).save(preview)
    print(f"slide 6 rebuilt in {deck_path.name}")
    print(f"  live link : {args.live}")
    print(f"  video link: {args.video or 'pending'}")
    print(f"  preview   : {preview}")


if __name__ == "__main__":
    main()

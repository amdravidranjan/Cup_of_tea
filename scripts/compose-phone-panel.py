"""
Puts the phone screenshot into a slide-shaped panel.

The deck's screenshot slots are 2:1; a phone screenshot is 1:2.2. Dropped in
as-is it becomes a sliver, and cropped it stops looking like a phone. So the
phone is set on a panel of the right shape, at full height, with the room
either side used for the two lines that say what is being looked at.

    python scripts/compose-phone-panel.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
SOURCE = DOCS / "shot7-field-verification.png"
TARGET = DOCS / "panel-shot7-field-verification.png"

WIDTH, HEIGHT = 1168, 584
BACKDROP = (238, 243, 249)
INK = (16, 42, 74)
MUTED = (90, 110, 132)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "arialbd.ttf" if bold else "arial.ttf"
    try:
        return ImageFont.truetype(f"C:/Windows/Fonts/{name}", size)
    except OSError:
        return ImageFont.load_default()


def main() -> None:
    phone = Image.open(SOURCE).convert("RGB")
    panel = Image.new("RGB", (WIDTH, HEIGHT), BACKDROP)
    draw = ImageDraw.Draw(panel)

    margin = 26
    scale = (HEIGHT - margin * 2) / phone.height
    shot = phone.resize((round(phone.width * scale), HEIGHT - margin * 2), Image.LANCZOS)
    x = WIDTH - shot.width - margin * 2
    panel.paste(shot, (x, margin))
    draw.rectangle([x - 1, margin - 1, x + shot.width, margin + shot.height], outline=(203, 213, 225), width=2)

    draw.text((40, 150), "Field verification", font=font(46, bold=True), fill=INK)
    for i, line in enumerate(
        [
            "The officer walks the plot, checks it against",
            "the record, and marks it verified — on a phone,",
            "with no network needed.",
        ]
    ):
        draw.text((40, 220 + i * 40), line, font=font(28), fill=MUTED)

    panel.save(TARGET)
    print(f"wrote {TARGET.name} ({panel.width}x{panel.height})")


if __name__ == "__main__":
    main()

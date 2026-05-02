from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import ParagraphStyle

BLUE       = colors.HexColor("#2563eb")
DARK       = colors.HexColor("#111827")
GRAY       = colors.HexColor("#6b7280")
LIGHT_GRAY = colors.HexColor("#f3f4f6")
RED        = colors.HexColor("#dc2626")
GREEN      = colors.HexColor("#16a34a")
ORANGE     = colors.HexColor("#ea580c")
BORDER     = colors.HexColor("#e5e7eb")
WHITE      = colors.white


def build_styles() -> dict:
    return {
        "title": ParagraphStyle(
            "title",
            fontName="Helvetica-Bold",
            fontSize=24,
            textColor=DARK,
            spaceAfter=4,
        ),
        "section": ParagraphStyle(
            "section",
            fontName="Helvetica-Bold",
            fontSize=11,
            textColor=DARK,
            spaceBefore=14,
            spaceAfter=8,
        ),
        "body": ParagraphStyle(
            "body",
            fontName="Helvetica",
            fontSize=9,
            textColor=DARK,
            spaceAfter=4,
            leading=14,
        ),
        "cell": ParagraphStyle(
            "cell",
            fontName="Helvetica",
            fontSize=9,
            textColor=DARK,
            spaceAfter=0,
            spaceBefore=0,
            leading=12,
        ),
        "small": ParagraphStyle(
            "small",
            fontName="Helvetica",
            fontSize=8,
            textColor=GRAY,
            spaceAfter=3,
            leading=12,
        ),
        "caption": ParagraphStyle(
            "caption",
            fontName="Helvetica-Oblique",
            fontSize=8,
            textColor=GRAY,
            spaceAfter=4,
            alignment=TA_CENTER,
        ),
    }

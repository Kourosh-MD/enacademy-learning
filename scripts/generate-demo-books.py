#!/usr/bin/env python3
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf"
OUTPUT.mkdir(parents=True, exist_ok=True)

REGULAR = "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"
BOLD = "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"
pdfmetrics.registerFont(TTFont("NotoSans", REGULAR))
pdfmetrics.registerFont(TTFont("NotoSansBold", BOLD))

INK = colors.HexColor("#10261f")
MUTED = colors.HexColor("#66756f")
MINT = colors.HexColor("#16a875")
SOFT = colors.HexColor("#edf8f3")
LIME = colors.HexColor("#c9f36a")
LINE = colors.HexColor("#dbe7e0")

styles = getSampleStyleSheet()
TITLE = ParagraphStyle("BookTitle", fontName="NotoSansBold", fontSize=29, leading=34, textColor=INK, alignment=TA_CENTER, spaceAfter=12)
SUBTITLE = ParagraphStyle("Subtitle", fontName="NotoSans", fontSize=12, leading=19, textColor=MUTED, alignment=TA_CENTER)
H1 = ParagraphStyle("Chapter", fontName="NotoSansBold", fontSize=21, leading=26, textColor=INK, spaceAfter=10)
H2 = ParagraphStyle("Section", fontName="NotoSansBold", fontSize=11, leading=15, textColor=MINT, spaceBefore=12, spaceAfter=6)
BODY = ParagraphStyle("Body", fontName="NotoSans", fontSize=9.5, leading=16, textColor=INK, spaceAfter=8)
SMALL = ParagraphStyle("Small", fontName="NotoSans", fontSize=8, leading=13, textColor=MUTED)
QUOTE = ParagraphStyle("Quote", fontName="NotoSans", fontSize=10.5, leading=18, textColor=INK, leftIndent=12, rightIndent=12)
ANSWER = ParagraphStyle("Answer", fontName="NotoSans", fontSize=8.5, leading=14, textColor=MUTED)


def page_decor(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(MINT)
    canvas.rect(0, height - 9 * mm, width, 9 * mm, fill=1, stroke=0)
    canvas.setFillColor(INK)
    canvas.setFont("NotoSansBold", 8)
    canvas.drawString(18 * mm, height - 6 * mm, "ENAcademy")
    canvas.setFillColor(MUTED)
    canvas.setFont("NotoSans", 7)
    canvas.drawRightString(width - 18 * mm, 10 * mm, f"ENAcademy beta library  |  {doc.page}")
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 14 * mm, width - 18 * mm, 14 * mm)
    canvas.restoreState()


def document(path, title, subtitle):
    doc = BaseDocTemplate(
        str(path), pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=20 * mm, bottomMargin=20 * mm, title=title, author="ENAcademy"
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="content")
    doc.addPageTemplates([PageTemplate(id="book", frames=[frame], onPage=page_decor)])
    story = [
        Spacer(1, 27 * mm),
        Paragraph("ENACADEMY BETA LIBRARY", ParagraphStyle(
            "Kicker", parent=H2, alignment=TA_CENTER, fontSize=8, spaceAfter=12
        )),
        Paragraph(title, TITLE),
        Paragraph(subtitle, SUBTITLE),
        Spacer(1, 18 * mm),
        Table(
            [[Paragraph("<b>Designed for</b><br/>Focused A1-A2 self-study", SMALL),
              Paragraph("<b>How to use it</b><br/>Read, say, write, review", SMALL),
              Paragraph("<b>Format</b><br/>Downloadable beta edition", SMALL)]],
            colWidths=[doc.width / 3] * 3,
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), SOFT),
                ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.7, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 14),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
            ])
        ),
        Spacer(1, 20 * mm),
        Paragraph("This beta book is included to demonstrate ENAcademy's complete digital purchase and delivery workflow. It is original learning material and may be expanded in future releases.", SMALL),
        PageBreak(),
    ]
    return doc, story


def callout(title, text):
    return Table(
        [[Paragraph(title, H2), Paragraph(text, BODY)]],
        colWidths=[38 * mm, 112 * mm],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), SOFT),
            ("BOX", (0, 0), (-1, -1), 0.7, LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ])
    )


def add_chapter(story, number, title, outcome, dialogue, language, practice):
    story.extend([
        Paragraph(f"{number:02d}  {title}", H1),
        Paragraph(outcome, BODY),
        callout("REAL-LIFE MOMENT", dialogue),
        Paragraph("Language to keep", H2),
        Paragraph(language, BODY),
        Paragraph("Try it yourself", H2),
        Paragraph(practice, BODY),
        Spacer(1, 6 * mm),
        Paragraph("Say every answer aloud once. Fluency grows when written language becomes spoken language.", SMALL),
        PageBreak(),
    ])


def everyday_book():
    path = OUTPUT / "everyday-english-starter.pdf"
    doc, story = document(path, "Everyday English Starter Guide", "Useful language for the moments that make up a real day")
    chapters = [
        ("First meetings", "Introduce yourself, ask one natural follow-up question, and close warmly.",
         "<b>Maya:</b> Hi, I am Maya. Is this your first class?<br/><b>Leo:</b> Yes, it is. I am Leo. Nice to meet you.",
         "<b>I am...</b> for identity. <b>I am from...</b> for origin. <b>What about you?</b> keeps the conversation moving.",
         "Write a four-line introduction. Include your name, city, one interest, and one question."),
        ("Daily routines", "Describe a normal weekday with clear time phrases.",
         "<b>Noor:</b> What time do you start work?<br/><b>Sam:</b> I usually start at nine, but on Fridays I start later.",
         "Use the present simple for routines. Put <b>usually</b> before the main verb: I usually walk.",
         "Write five routine sentences. Add always, usually, sometimes, rarely, or never."),
        ("At a cafe", "Order politely, change an item, and ask for the bill.",
         "<b>Server:</b> What can I get you?<br/><b>You:</b> Could I have a small coffee and a cheese sandwich, please?",
         "<b>Could I have...?</b> is a calm, useful request. Add <b>please</b> and <b>thank you</b> naturally.",
         "Build an order with one drink, one food item, one change, and a closing thank-you."),
        ("Shopping clearly", "Ask about price, size, and alternatives without translating.",
         "<b>You:</b> Do you have this in a medium?<br/><b>Assistant:</b> Let me check. Would you like another color?",
         "Use <b>Do you have...?</b> for availability and <b>How much is it?</b> for price.",
         "Write three questions you could ask in a clothing shop and answer them."),
        ("Finding the way", "Ask for directions and confirm the next step.",
         "<b>You:</b> Excuse me, how do I get to the station?<br/><b>Local:</b> Go straight, then turn left at the bank.",
         "Direction verbs: go straight, turn left, turn right, cross, continue, and stop at.",
         "Describe the route from your home to a nearby shop in four steps."),
        ("Travel day", "Handle a simple station or airport exchange calmly.",
         "<b>Traveler:</b> Which platform is the train to Oxford?<br/><b>Agent:</b> Platform six. It leaves at ten twenty.",
         "Use <b>Which...?</b> to choose and <b>What time...?</b> to ask about schedules.",
         "Create a mini travel dialogue with a destination, departure time, platform, and thank-you."),
    ]
    for index, chapter in enumerate(chapters, 1):
        add_chapter(story, index, *chapter)
    story.extend([
        Paragraph("Your seven-day speaking plan", H1),
        Paragraph("Repeat one chapter each day. On day seven, combine the moments into one imaginary day and speak for two minutes without reading.", BODY),
        Table([[f"Day {day}", task] for day, task in enumerate([
            "Introduce yourself", "Describe your morning", "Order lunch", "Ask about a product",
            "Explain a route", "Plan a journey", "Tell the whole story"
        ], 1)], colWidths=[28 * mm, 120 * mm], style=TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), LIME), ("GRID", (0, 0), (-1, -1), 0.6, LINE),
            ("FONTNAME", (0, 0), (-1, -1), "NotoSans"), ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ])),
        Spacer(1, 12 * mm),
        Paragraph("Keep going in ENAcademy", H2),
        Paragraph("Open your purchased A1 course and use the interactive listening, vocabulary, grammar, quiz, and speaking steps to turn this guide into durable progress.", BODY),
    ])
    doc.build(story)
    return path


def grammar_book():
    path = OUTPUT / "practical-grammar-workbook.pdf"
    doc, story = document(path, "Practical Grammar Workbook", "Essential A1-A2 patterns turned into language you can use")
    chapters = [
        ("Present simple", "Use routines and facts accurately.",
         "<b>Model:</b> I work from home. She starts at eight. We do not drive on Fridays.",
         "Positive: subject + base verb. Add -s with he, she, or it. Negative: do not / does not + base verb.",
         "Complete: She ___ (study) at night. They ___ not ___ (eat) early. Write two true examples."),
        ("Useful questions", "Build questions without losing word order.",
         "<b>Model:</b> Where do you live? What does he need? Are they ready?",
         "Use do/does with most present simple verbs. Use am/is/are directly with the verb be.",
         "Correct these: Where you work? Does she likes tea? They are ready? Then answer each question."),
        ("Past events", "Tell a short, ordered story.",
         "<b>Model:</b> We arrived late, found our seats, and watched the show.",
         "Regular past verbs often end in -ed. Learn common irregular forms: went, saw, had, made, came.",
         "Write four sentences about yesterday. Use first, then, after that, and finally."),
        ("Plans and intentions", "Talk about future choices and arrangements.",
         "<b>Model:</b> I am going to study tonight. We are meeting Sara at six.",
         "Use be going to for intentions. Use present continuous for a specific arranged time.",
         "Choose: I am going to / am meeting the dentist at ten. Explain why, then add two plans."),
        ("Comparisons", "Compare options politely and clearly.",
         "<b>Model:</b> This route is faster, but the other one is more comfortable.",
         "Short adjective + -er: faster. Longer adjective: more practical. Irregular: better, worse.",
         "Compare two cities, two apps, or two ways to study using three comparative sentences."),
        ("Present perfect", "Connect life experience to the present.",
         "<b>Model:</b> I have visited Turkey. She has never tried sushi.",
         "Use have/has + past participle. Do not add a finished time such as yesterday to this pattern.",
         "Write three Have you ever...? questions. Answer with yes/no and one follow-up detail."),
    ]
    for index, chapter in enumerate(chapters, 1):
        add_chapter(story, index, *chapter)
    story.extend([
        Paragraph("Answer key and reflection", H1),
        Paragraph("<b>Chapter 1:</b> studies; do / eat. <b>Chapter 2:</b> Where do you work? Does she like tea? Are they ready? Other chapters are personal production tasks; compare your sentences with the model and check verb form, word order, and time expression.", ANSWER),
        Spacer(1, 8 * mm),
        callout("SELF-CHECK", "Can another person understand your meaning immediately? Is the verb form consistent with the time? Did you say the sentence aloud? If yes, the grammar is already becoming usable."),
        Spacer(1, 12 * mm),
        Paragraph("Next step", H2),
        Paragraph("Use these patterns inside ENAcademy's purchased A1 and A2 courses. Each lesson moves from context to pattern, then from recognition to your own spoken answer.", BODY),
    ])
    doc.build(story)
    return path


if __name__ == "__main__":
    for generated in (everyday_book(), grammar_book()):
        print(generated)

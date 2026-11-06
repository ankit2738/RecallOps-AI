from __future__ import annotations

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "submission" / "RecallOps_AI_Pitch.pptx"
SHOTS = ROOT / "screenshots"

BG = RGBColor(0x0B, 0x12, 0x20)
PANEL = RGBColor(0x11, 0x1C, 0x2E)
PANEL_2 = RGBColor(0x0D, 0x16, 0x26)
BORDER = RGBColor(0x25, 0x38, 0x4C)
CYAN = RGBColor(0x22, 0xD3, 0xEE)
BLUE = RGBColor(0x3B, 0x82, 0xF6)
WHITE = RGBColor(0xE6, 0xED, 0xF6)
SLATE = RGBColor(0xA7, 0xB6, 0xC8)
MUTED = RGBColor(0x64, 0x74, 0x8B)
GREEN = RGBColor(0x34, 0xD3, 0x99)
AMBER = RGBColor(0xF5, 0x9E, 0x0B)
RED = RGBColor(0xF8, 0x71, 0x71)
VIOLET = RGBColor(0xA7, 0x8B, 0xFA)

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]


def slide():
    s = prs.slides.add_slide(BLANK)
    bg = s.background.fill
    bg.solid()
    bg.fore_color.rgb = BG
    return s


def rect(s, x, y, w, h, fill=PANEL, line=BORDER, radius=True, line_width=1):
    shape = s.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE,
        Inches(x), Inches(y), Inches(w), Inches(h),
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    shape.line.color.rgb = line
    shape.line.width = Pt(line_width)
    shape.shadow.inherit = False
    if radius:
        try:
            shape.adjustments[0] = 0.08
        except Exception:
            pass
    return shape


def text(s, value, x, y, w, h, size=18, color=WHITE, bold=False, font="Arial",
         align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, spacing=1.0):
    box = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    lines = value.split("\n")
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = spacing
        p.space_after = Pt(0)
        run = p.add_run()
        run.text = line
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.name = font
        run.font.color.rgb = color
    return box


def bullets(s, items, x, y, w, h, size=14, color=SLATE, bullet_color=CYAN, gap=6):
    box = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(gap)
        p.line_spacing = 1.08
        r1 = p.add_run()
        r1.text = "• "
        r1.font.size = Pt(size)
        r1.font.bold = True
        r1.font.name = "Arial"
        r1.font.color.rgb = bullet_color
        r2 = p.add_run()
        r2.text = item
        r2.font.size = Pt(size)
        r2.font.name = "Arial"
        r2.font.color.rgb = color
    return box


def pill(s, label, x, y, w, color=CYAN, fill=PANEL_2):
    rect(s, x, y, w, 0.34, fill=fill, line=color, radius=True)
    text(s, label, x + 0.12, y + 0.07, w - 0.24, 0.22, size=9.5, color=color, bold=True)


def header(s, kicker, title, subtitle=None):
    text(s, kicker.upper(), 0.7, 0.42, 11.5, 0.25, size=10, color=CYAN, bold=True)
    text(s, title, 0.7, 0.72, 11.9, 0.55, size=28, color=WHITE, bold=True)
    if subtitle:
        text(s, subtitle, 0.7, 1.28, 11.9, 0.35, size=12, color=MUTED)


def footer(s, n):
    text(s, "RecallOps AI · memory-native incident response", 0.7, 7.12, 6.0, 0.2, size=8.5, color=MUTED)
    text(s, f"{n:02d}", 12.2, 7.1, 0.4, 0.2, size=9, color=MUTED, align=PP_ALIGN.RIGHT)


def picture(s, name, x, y, w, border=BORDER):
    path = SHOTS / name
    if not path.exists():
        return
    pic = s.shapes.add_picture(str(path), Inches(x), Inches(y), width=Inches(w))
    pic.line.color.rgb = border
    pic.line.width = Pt(1)


# ---------------------------------------------------------------- 1. Title
s = slide()
text(s, "RecallOps AI", 0.7, 0.85, 6.2, 0.9, size=46, bold=True)
text(s, "Incident response that remembers.", 0.7, 1.85, 6.4, 0.8, size=24, color=CYAN, bold=True)
text(
    s,
    "A memory-native SRE workspace where resolved incidents become\n"
    "Hindsight memory, Tom investigates, and Jerry challenges the fix.",
    0.7, 2.75, 6.0, 0.9, size=14, color=SLATE, spacing=1.15,
)
pill(s, "REAL HINDSIGHT RETAIN / RECALL", 0.7, 4.05, 2.55)
pill(s, "MEASURED MEMORY ON / OFF", 3.4, 4.05, 2.25, color=GREEN)
pill(s, "AUDITABLE OPERATION LEDGER", 5.8, 4.05, 2.45, color=VIOLET)
text(s, "8 synthetic incidents · 7 services · 1 recurring failure pattern", 0.7, 4.65, 6.4, 0.3, size=11, color=MUTED)
picture(s, "overview-hero.png", 7.0, 0.85, 5.65)
text(s, "Live local build · Hindsight on :8888 · FastAPI on :8000", 0.7, 6.55, 7.0, 0.3, size=10, color=MUTED)
footer(s, 1)

# ---------------------------------------------------------------- 2. Problem
s = slide()
header(s, "The problem", "Incident knowledge evaporates", "Dashboards improve. Operational memory usually does not.")
items = [
    ("Resolved is not remembered", "The fix lives in a ticket, a thread or one engineer's head."),
    ("Search is not recall", "Keyword search finds pages; responders need the proven root cause and runbook."),
    ("No proof of improvement", "Most agent demos claim learning without a before-and-after measurement."),
]
y = 1.75
for i, (title, body) in enumerate(items):
    rect(s, 0.7, y, 7.4, 1.05, fill=PANEL)
    text(s, f"0{i+1}", 0.95, y + 0.25, 0.5, 0.35, size=18, color=CYAN, bold=True)
    text(s, title, 1.55, y + 0.18, 3.2, 0.3, size=14, bold=True)
    text(s, body, 1.55, y + 0.5, 6.2, 0.35, size=11.5, color=SLATE)
    y += 1.22
rect(s, 8.55, 1.75, 4.1, 3.55, fill=PANEL_2, line=CYAN)
text(s, "“", 8.85, 1.95, 0.5, 0.5, size=44, color=CYAN, bold=True)
text(
    s,
    "Every incident team solves the same problem twice.",
    9.15, 2.55, 3.15, 1.0, size=20, bold=True, spacing=1.05,
)
text(
    s,
    "The next on-call starts with better dashboards and worse memory.",
    9.15, 3.75, 3.15, 0.8, size=12.5, color=SLATE, spacing=1.15,
)
rect(s, 0.7, 5.55, 11.95, 0.85, fill=RGBColor(0x0A, 0x2A, 0x33), line=CYAN)
text(s, "RecallOps makes memory the system of record, not a chat sidebar.", 1.0, 5.78, 11.2, 0.35, size=15, color=CYAN, bold=True)
footer(s, 2)

# ---------------------------------------------------------------- 3. Solution
s = slide()
header(s, "The product", "A closed learning loop", "Retain → recall → reason → review → write back.")
cards = [
    ("01", "RETAIN", "Resolved incidents become structured memory with symptoms, root cause and runbook.", CYAN),
    ("02", "RECALL", "A new incident retrieves real prior records with text, metadata and scores.", BLUE),
    ("03", "REASON", "Tom proposes a hypothesis, confidence, evidence and prioritized actions.", VIOLET),
    ("04", "REVIEW", "Jerry challenges the diagnosis and adjusts confidence independently.", GREEN),
]
x = 0.7
for num, label, body, color in cards:
    rect(s, x, 1.75, 2.9, 2.9, fill=PANEL)
    text(s, num, x + 0.25, 1.98, 0.6, 0.35, size=16, color=color, bold=True)
    text(s, label, x + 0.25, 2.38, 2.4, 0.3, size=12, color=color, bold=True)
    text(s, body, x + 0.25, 2.85, 2.4, 1.3, size=12, color=SLATE, spacing=1.12)
    x += 3.05
rect(s, 0.7, 5.05, 11.95, 1.25, fill=PANEL_2, line=BORDER)
steps = ["Resolved incident", "Structured memory", "Hindsight recall", "Tom + Jerry", "Write-back"]
x = 0.95
for i, step in enumerate(steps):
    rect(s, x, 5.38, 1.95, 0.55, fill=PANEL, line=CYAN if i in (1, 2) else BORDER)
    text(s, step, x + 0.1, 5.53, 1.75, 0.25, size=10.5, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    if i < len(steps) - 1:
        text(s, "→", x + 2.02, 5.5, 0.25, 0.3, size=16, color=CYAN, bold=True)
    x += 2.3
text(s, "Every call is recorded with status, latency and error text.", 0.95, 6.15, 10.5, 0.25, size=10, color=MUTED)
footer(s, 3)

# ---------------------------------------------------------------- 4. Architecture
s = slide()
header(s, "Architecture", "Memory is a first-class service", "Local-first, reproducible, and observable.")
boxes = [
    ("React + TypeScript", "Vite · Tailwind · Recharts", 0.7, 1.65, 2.35, 1.0, CYAN),
    ("FastAPI", "incidents · investigations · memory", 3.55, 1.65, 2.5, 1.0, BLUE),
    ("SQLite", "incidents · investigations\nagent runs · ledger", 6.65, 1.35, 2.2, 0.85, GREEN),
    ("Hindsight", "retain · recall · reflect\nbank: recallops-incidents", 6.65, 2.55, 2.2, 0.95, VIOLET),
    ("Named volume", "recallops-hindsight-data", 9.55, 2.55, 2.0, 0.8, AMBER),
    ("Groq (optional)", "openai/gpt-oss-20b\nmemory extraction", 9.55, 1.35, 2.0, 0.85, CYAN),
    ("Tom + Jerry", "investigator + reviewer\nseparate agent_runs", 3.55, 3.85, 2.5, 0.95, VIOLET),
    ("Band (optional)", "verify existing agents\nnever create duplicates", 6.65, 3.85, 2.2, 0.85, AMBER),
]
for title, body, x, y, w, h, color in boxes:
    rect(s, x, y, w, h, fill=PANEL)
    text(s, title, x + 0.15, y + 0.14, w - 0.3, 0.28, size=12.5, bold=True, color=color)
    text(s, body, x + 0.15, y + 0.47, w - 0.3, h - 0.5, size=9.5, color=SLATE, spacing=1.1)
# connectors
for (x1, y1, x2, y2) in [(3.05, 2.15, 3.55, 2.15), (6.05, 2.15, 6.65, 1.77), (6.05, 2.15, 6.65, 3.02),
                          (8.85, 3.02, 9.55, 2.95), (8.85, 1.77, 9.55, 1.77),
                          (4.8, 2.65, 4.8, 3.85), (6.05, 4.32, 6.65, 4.27)]:
    line = s.shapes.add_connector(1, Inches(x1), Inches(y1), Inches(x2), Inches(y2))
    line.line.color.rgb = BORDER
    line.line.width = Pt(1.2)
text(s, "Every memory operation is persisted before the UI sees the result.", 0.7, 5.25, 11.5, 0.3, size=11, color=MUTED)
rect(s, 0.7, 5.65, 11.95, 0.8, fill=PANEL_2, line=BORDER)
text(s, "One bank, one ledger, two agent roles, explicit fallbacks.", 0.95, 5.9, 11.2, 0.3, size=13, color=WHITE, bold=True)
footer(s, 4)

# ---------------------------------------------------------------- 5. Hindsight
s = slide()
header(s, "Hindsight integration", "Real calls, not a prompt trick", "The SDK is wrapped by a service that records every operation.")
code = (
    "# Retain a resolved incident\n"
    "client.retain(\n"
    "  bank_id=\"recallops-incidents\",\n"
    "  content=incident_memory,\n"
    "  metadata={\"incident_code\": code},\n"
    "  tags=[\"incident\", service],\n"
    ")\n\n"
    "# Recall for a new incident\n"
    "response = client.recall(\n"
    "  bank_id=\"recallops-incidents\",\n"
    "  query=incident_query,\n"
    "  max_tokens=2048, budget=\"low\",\n"
    ")"
)
rect(s, 0.7, 1.7, 6.2, 3.45, fill=PANEL_2, line=BORDER)
text(s, code, 0.95, 1.9, 5.7, 3.1, size=10.5, color=RGBColor(0xC9, 0xD6, 0xE3), font="Consolas", spacing=1.15)
picture(s, "memory-intelligence-top.png", 7.2, 1.7, 5.45)
metrics = [("6 / 6", "resolved incidents retained"), ("2", "verified recalls"), ("23", "memories in the best run"), ("0.92", "memory-ON confidence")]
x = 0.7
for value, label in metrics:
    rect(s, x, 5.55, 2.9, 0.95, fill=PANEL, line=CYAN)
    text(s, value, x + 0.18, 5.7, 1.0, 0.35, size=18, color=CYAN, bold=True)
    text(s, label, x + 0.18, 6.1, 2.5, 0.25, size=9.5, color=MUTED)
    x += 3.05
footer(s, 5)

# ---------------------------------------------------------------- 6. Results
s = slide()
header(s, "Measured impact", "The same incident, two ways", "Memory does not just add context. It changes what the system can justify.")
rect(s, 0.7, 1.75, 4.9, 1.75, fill=PANEL, line=BORDER)
text(s, "MEMORY OFF", 0.95, 1.95, 3.0, 0.3, size=11, color=MUTED, bold=True)
text(s, "64%", 0.95, 2.3, 2.0, 0.8, size=42, color=SLATE, bold=True)
text(s, "0 memories used", 2.8, 2.55, 2.4, 0.3, size=11, color=MUTED)
text(s, "“Pool exhaustion is the leading hypothesis.”", 0.95, 3.05, 4.3, 0.3, size=9.5, color=SLATE)
rect(s, 0.7, 3.7, 4.9, 1.75, fill=RGBColor(0x08, 0x2A, 0x33), line=CYAN)
text(s, "MEMORY ON", 0.95, 3.9, 3.0, 0.3, size=11, color=CYAN, bold=True)
text(s, "92%", 0.95, 4.25, 2.0, 0.8, size=42, color=CYAN, bold=True)
text(s, "23 memories used", 2.8, 4.5, 2.4, 0.3, size=11, color=SLATE)
text(s, "“Recurrence of the INC-001 pool exhaustion.”", 0.95, 5.0, 4.3, 0.3, size=9.5, color=SLATE)
text(s, "+28", 0.7, 5.7, 1.2, 0.6, size=30, color=GREEN, bold=True)
text(s, "percentage-point lift from real runs", 1.75, 5.9, 3.6, 0.3, size=11, color=SLATE)
picture(s, "patterns.png", 5.95, 1.75, 6.65)
text(s, "No benchmark claims. The delta comes from stored investigations.", 0.7, 6.55, 11.5, 0.3, size=10.5, color=MUTED)
footer(s, 6)

# ---------------------------------------------------------------- 7. Agents
s = slide()
header(s, "Agent collaboration", "Tom investigates. Jerry challenges.", "Two explicit roles, separate prompts and separate audit records.")
rect(s, 0.7, 1.75, 5.4, 3.05, fill=PANEL, line=CYAN)
text(s, "TOM", 0.95, 1.95, 1.0, 0.3, size=12, color=CYAN, bold=True)
text(s, "Investigator", 0.95, 2.28, 2.0, 0.3, size=18, bold=True)
bullets(s, ["Recalls historical incidents", "Proposes root cause + confidence", "Prioritizes actions and evidence"], 0.95, 2.85, 4.7, 1.6, size=12)
rect(s, 6.55, 1.75, 5.4, 3.05, fill=PANEL, line=VIOLET)
text(s, "JERRY", 6.8, 1.95, 1.0, 0.3, size=12, color=VIOLET, bold=True)
text(s, "Critical reviewer", 6.8, 2.28, 2.6, 0.3, size=18, bold=True)
bullets(s, ["Challenges blast radius", "Adds validation and rollback checks", "Approves or revises independently"], 6.8, 2.85, 4.7, 1.6, size=12, bullet_color=VIOLET)
rect(s, 3.0, 3.0, 0.7, 0.55, fill=BG, line=BG)
text(s, "⇄", 3.1, 3.05, 0.5, 0.35, size=22, color=CYAN, bold=True, align=PP_ALIGN.CENTER)
rect(s, 0.7, 5.15, 11.95, 0.55, fill=PANEL_2, line=AMBER)
text(s, "Band credentials absent → local fallback, clearly labelled. No agents created.", 0.95, 5.3, 11.3, 0.25, size=11, color=AMBER, bold=True)
rect(s, 0.7, 5.85, 11.95, 0.55, fill=PANEL_2, line=BORDER)
text(s, "App LLM absent → deterministic fallback. Memory status stays independent.", 0.95, 6.0, 11.3, 0.25, size=11, color=SLATE)
footer(s, 7)

# ---------------------------------------------------------------- 8. Demo flow
s = slide()
header(s, "60-second demo", "From new incident to compounding memory", "A focused path through the product.")
steps = [
    ("0:00", "Hook", "Overview: 6/6 retained, Hindsight healthy"),
    ("0:08", "New incident", "INC-007 payments-api latency spike"),
    ("0:18", "Memory ON", "23 memories · 92% · proven INC-001 fix"),
    ("0:32", "Memory OFF", "0 memories · 64% · +28 point delta"),
    ("0:42", "Resolve", "Write root cause + runbook back to Hindsight"),
    ("0:52", "Close", "Memory as the system of record"),
]
y = 1.7
for time, title, body in steps:
    rect(s, 0.7, y, 11.95, 0.7, fill=PANEL)
    text(s, time, 0.95, y + 0.2, 0.8, 0.3, size=12, color=CYAN, bold=True)
    text(s, title, 1.85, y + 0.2, 2.1, 0.3, size=12, bold=True)
    text(s, body, 4.0, y + 0.2, 8.3, 0.3, size=11, color=SLATE)
    y += 0.82
text(s, "Reset: POST /api/incidents/7/compare · Backfill: POST /api/memory/sync", 0.7, 6.7, 11.5, 0.3, size=10, color=MUTED)
footer(s, 8)

# ---------------------------------------------------------------- 9. Verification
s = slide()
header(s, "Verification", "What is proven, what is not", "The ledger and the test report are part of the product.")
rows = [
    ("Hindsight retain / recall", "Verified against the live server", GREEN),
    ("Resolved-incident backfill", "6 / 6 retained", GREEN),
    ("Backend tests", "7 passed", GREEN),
    ("Frontend build", "TypeScript + Vite pass", GREEN),
    ("Route render checks", "8 / 8 routes mount with live data", GREEN),
    ("Hindsight reflect", "Free-tier quota failure recorded", AMBER),
    ("Band agents", "Credentials absent; local fallback", AMBER),
]
y = 1.7
for label, value, color in rows:
    rect(s, 0.7, y, 7.4, 0.58, fill=PANEL)
    text(s, label, 0.95, y + 0.16, 3.0, 0.25, size=11, bold=True)
    text(s, value, 4.15, y + 0.16, 3.8, 0.25, size=10.5, color=color)
    y += 0.66
rect(s, 8.5, 1.7, 4.15, 3.95, fill=PANEL_2, line=AMBER)
text(s, "WHAT WE DON'T CLAIM", 8.75, 1.92, 3.5, 0.3, size=11, color=AMBER, bold=True)
bullets(
    s,
    ["Band agents were not live-tested", "Reflect did not succeed", "No production load test", "No fabricated time-savings metric"],
    8.75, 2.35, 3.55, 2.9, size=11, bullet_color=AMBER,
)
text(s, "Honesty is a feature, not a disclaimer.", 0.7, 6.45, 11.5, 0.3, size=12, color=CYAN, bold=True)
footer(s, 9)

# ---------------------------------------------------------------- 10. Impact
s = slide()
text(s, "THE COMPOUNDING IDEA", 0.7, 0.6, 6.0, 0.3, size=11, color=CYAN, bold=True)
text(s, "Every resolved incident should make the next one cheaper.", 0.7, 1.05, 11.6, 1.0, size=30, bold=True, spacing=1.05)
impacts = [
    ("Less diagnosis time", "Start with the proven root cause, not a blank page."),
    ("Knowledge that stays", "Runbooks survive on-call rotation and team changes."),
    ("Fewer repeat failures", "Patterns become preventive fixes, not another ticket."),
]
x = 0.7
for title, body in impacts:
    rect(s, x, 2.55, 3.9, 1.45, fill=PANEL, line=CYAN)
    text(s, title, x + 0.22, 2.75, 3.4, 0.3, size=14, bold=True)
    text(s, body, x + 0.22, 3.15, 3.4, 0.7, size=11, color=SLATE, spacing=1.1)
    x += 4.05
rect(s, 0.7, 4.35, 11.95, 1.55, fill=PANEL_2, line=BORDER)
text(s, "NEXT", 0.95, 4.55, 1.0, 0.3, size=11, color=MUTED, bold=True)
text(s, "Per-team banks · Postgres · auth · retention queue · cost-aware retrieval · memory-quality evals", 0.95, 4.95, 11.2, 0.6, size=14, color=WHITE, bold=True)
text(s, "RecallOps AI", 0.7, 6.35, 4.0, 0.5, size=22, bold=True)
text(s, "Incident response that remembers.", 3.8, 6.42, 6.0, 0.35, size=14, color=CYAN)
footer(s, 10)

# Speaker notes
notes = {
    1: "Open with the memory problem. This is a local build; Hindsight is live on port 8888.",
    2: "Three failures: no durable write-back, search is not recall, no measured improvement.",
    3: "Walk the loop. The key is write-back: resolution becomes the next incident's context.",
    4: "Point out the operation ledger and the named volume. Recreating the container does not erase memory.",
    5: "Retain and recall are verified. Reflect is wired but quota-limited; do not claim success.",
    6: "These are real runs: 23 memories, 92% vs 64%, +28 points. The chart is computed from stored investigations.",
    7: "Tom and Jerry are separate records. Band credentials are absent, so the UI says local fallback.",
    8: "Follow the 60-second script. Use INC-007 because the comparison is already populated.",
    9: "Show the test report and the ledger. State the limitations before judges ask.",
    10: "Close on compounding knowledge, not on model features.",
}
for i, sl in enumerate(prs.slides, start=1):
    if i in notes:
        sl.notes_slide.notes_text_frame.text = notes[i]

OUT.parent.mkdir(parents=True, exist_ok=True)
prs.save(OUT)
print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")

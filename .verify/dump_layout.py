"""Produce a precise, ordered geometry map of the production checklist template."""
import json
import pymupdf

SRC = r"C:\Users\russe\Downloads\productiontemplate.pdf"
OUT_LINES = r"C:\Users\russe\Downloads\hays+sons-restoration-document-suite\.verify\template_lines.txt"
OUT_IMG = r"C:\Users\russe\Downloads\hays+sons-restoration-document-suite\.verify\template_logo.png"

doc = pymupdf.open(SRC)
page = doc[0]

# ---- text spans with full detail ----
rows = []
d = page.get_text("dict")
for block in d["blocks"]:
    if block.get("type") != 0:
        continue
    for line in block["lines"]:
        for sp in line["spans"]:
            if sp["text"].strip():
                x0, y0, x1, y1 = sp["bbox"]
                rows.append((round(y0, 1), round(x0, 1), round(y1, 1), round(x1, 1),
                             round(sp["size"], 2), sp["font"], sp["color"],
                             sp["flags"], sp["text"]))
rows.sort(key=lambda r: (r[0], r[1]))

with open(OUT_LINES, "w", encoding="utf-8") as fh:
    fh.write(f"PAGE {page.rect.width} x {page.rect.height}  (baseline = y1 for single-line spans)\n")
    fh.write(f"{'top':>7} {'left':>7} {'bot':>7} {'right':>7} {'size':>5} {'color':>8} {'flags':>5}  text\n")
    for r in rows:
        fh.write(f"{r[0]:7.1f} {r[1]:7.1f} {r[2]:7.1f} {r[3]:7.1f} {r[4]:5.1f} {r[6]:8d} {r[7]:5d}  {r[8]!r}\n")

    # ---- horizontal rule lines (underline fields) ----
    fh.write("\n=== HORIZONTAL RULES (thin, wide strokes) ===\n")
    rules = []
    for p in page.get_drawings():
        for item in p["items"]:
            if item[0] == "l":
                p1, p2 = item[1], item[2]
                if abs(p1.y - p2.y) < 0.6 and abs(p2.x - p1.x) > 12:
                    rules.append((round(min(p1.x, p2.x), 1), round(p1.y, 1),
                                  round(max(p1.x, p2.x), 1), round(p.get("width") or 0, 2)))
            elif item[0] == "re":
                r = item[1]
                if r.height < 1.2 and r.width > 12:
                    rules.append((round(r.x0, 1), round(r.y0, 1), round(r.x1, 1),
                                  round(p.get("width") or 0, 2)))
    rules.sort(key=lambda t: (t[1], t[0]))
    for x0, y, x1, w in rules:
        fh.write(f"  y={y:7.1f}  x {x0:7.1f} -> {x1:7.1f}  (len {x1-x0:6.1f}, w={w})\n")

    # ---- rectangles: checkbox gutter + highlight bands ----
    fh.write("\n=== RECTANGLES ===\n")
    rects = []
    for p in page.get_drawings():
        r = p["rect"]
        rects.append((round(r.x0, 1), round(r.y0, 1), round(r.x1, 1), round(r.y1, 1),
                      p.get("fill"), p.get("color"), round(p.get("width") or 0, 2)))
    # dedupe identical
    seen = set()
    for r in sorted(rects, key=lambda t: (t[1], t[0])):
        key = r[:4]
        if key in seen:
            continue
        seen.add(key)
        fh.write(f"  x {r[0]:7.1f}->{r[2]:7.1f}  y {r[1]:7.1f}->{r[3]:7.1f}  "
                 f"w={r[2]-r[0]:6.1f} h={r[3]-r[1]:5.1f} fill={r[4]} stroke={r[5]} lw={r[6]}\n")

    fh.write("\n=== IMAGES ===\n")
    for info in page.get_image_info(xrefs=True):
        fh.write(f"  bbox={[round(v,1) for v in info['bbox']]} {info['width']}x{info['height']} xref={info['xref']}\n")

print(f"spans={len(rows)}")
print(open(OUT_LINES, encoding="utf-8").read())

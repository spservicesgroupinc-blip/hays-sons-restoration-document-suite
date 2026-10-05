"""Dump exact layout geometry (spans, drawings, images) of the template PDF."""
import json
import pymupdf

src = r"C:\Users\russe\Downloads\productiontemplate.pdf"
out = r"C:\Users\russe\Downloads\hays+sons-restoration-document-suite\.verify\template_geometry.json"

doc = pymupdf.open(src)
page = doc[0]

spans = []
d = page.get_text("dict")
for block in d["blocks"]:
    if block.get("type") != 0:
        continue
    for line in block["lines"]:
        for sp in line["spans"]:
            if sp["text"].strip():
                spans.append({
                    "text": sp["text"],
                    "bbox": [round(v, 2) for v in sp["bbox"]],
                    "font": sp["font"],
                    "size": round(sp["size"], 2),
                    "flags": sp["flags"],
                    "color": sp["color"],
                })

drawings = []
for p in page.get_drawings():
    r = p["rect"]
    drawings.append({
        "rect": [round(r.x0, 2), round(r.y0, 2), round(r.x1, 2), round(r.y1, 2)],
        "fill": p.get("fill"),
        "stroke": p.get("color"),
        "width": p.get("width"),
        "type": p.get("type"),
    })

images = []
for info in page.get_image_info(xrefs=True):
    images.append({k: (list(v) if isinstance(v, tuple) else v)
                   for k, v in info.items() if k in ("bbox", "width", "height", "xref")})

data = {"page": [page.rect.width, page.rect.height], "spans": spans,
        "drawings": drawings, "images": images}
with open(out, "w", encoding="utf-8") as fh:
    json.dump(data, fh, indent=1)
print("spans:", len(spans), "drawings:", len(drawings), "images:", len(images))
print("wrote", out)

print("\n--- YELLOW BARS (filled wide rects) ---")
for dr in drawings:
    x0, y0, x1, y1 = dr["rect"]
    if dr["fill"] and (x1 - x0) > 300 and (y1 - y0) < 30 and (y1 - y0) > 3:
        print(f"  fill={dr['fill']} rect={dr['rect']}")

print("\n--- SMALL SQUARES (checkbox candidates) ---")
for dr in drawings:
    x0, y0, x1, y1 = dr["rect"]
    w, h = x1 - x0, y1 - y0
    if 8 <= w <= 22 and 8 <= h <= 22:
        print(f"  rect={dr['rect']} fill={dr['fill']} stroke={dr['stroke']}")

print("\n--- IMAGES ---")
for im in images:
    print(" ", im)

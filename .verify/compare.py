"""Compare a generated PDF against the production-checklist reference template.

Usage:
  python .verify/compare.py <generated.pdf> [reference.pdf] [--tag NAME]

Outputs (into .verify/):
  cmp_<tag>_gen.png      render of the generated PDF, page 1
  cmp_<tag>_ref.png      render of the reference PDF, page 1
  cmp_<tag>_diff.png     red = pixels present only in one file (after normalization)
  cmp_<tag>_report.txt   numeric report: pixel similarity + text-span position deltas

Both pages are rendered to the same pixel canvas (2.2x, white background, no alpha)
so the pixel diff is apples-to-apples.
"""
import pathlib
import sys
import re

import numpy as np
import pymupdf
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
REF_DEFAULT = r"C:\Users\russe\Downloads\productiontemplate.pdf"
DPI_SCALE = 2.2
TOL = 1.5          # points of tolerance for a span to count as "matched in place"
MIN_TEXT_MATCH = 0.62   # fuzzy match ratio required to pair spans


def tag_from(path: pathlib.Path) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "_", path.stem)[:40]


def render(doc, canvas=None):
    page = doc[0]
    pix = page.get_pixmap(matrix=pymupdf.Matrix(DPI_SCALE, DPI_SCALE), alpha=False)
    return pix


def is_placeholder(t: str) -> bool:
    """True for the invisible placeholder a PDF producer leaves where a bitmap
    was inlined. The reference carries U+F034 for the checkbox bitmap it prints
    after "signed off on by the GM.", which no font renders."""
    return all(0xE000 <= ord(ch) <= 0xF8FF for ch in t)


def spans_of(doc):
    page = doc[0]
    out = []
    d = page.get_text("dict")
    for block in d["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block["lines"]:
            for sp in line["spans"]:
                t = " ".join(sp["text"].split())
                if not t or is_placeholder(t):
                    continue
                # Position is keyed on the baseline origin, not the glyph bbox:
                # bbox tops follow the embedded font's ascent metrics, so Arial
                # and Helvetica report different tops for text sitting on
                # exactly the same baseline.
                origin = sp.get("origin") or line.get("origin")
                out.append({
                    "text": t,
                    "bbox": [round(v, 2) for v in sp["bbox"]],
                    "size": round(sp["size"], 2),
                    "baseline": round(origin[1], 2) if origin else round(sp["bbox"][3], 2),
                })
    return out


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", s.lower())


def similarity(a: str, b: str) -> float:
    """Cheap character-bigram Dice coefficient; no external deps."""
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    A = {a[i:i + 2] for i in range(len(a) - 1)} or {a}
    B = {b[i:i + 2] for i in range(len(b) - 1)} or {b}
    return 2 * len(A & B) / (len(A) + len(B))


def compare_spans(gen_spans, ref_spans):
    """Pair generated spans to reference spans.

    The generated document deliberately types job data onto lines that are blank
    in the reference, so text equality cannot be the primary key. Passes:

      1. nearest reference span by position, when it sits within TOL points and
         the size matches - this proves the field is printed where the form puts it
      2. any remaining generated span matched by fuzzy text (catches a caption
         that drifted but still reads the same)

    Returns (matched, moved, missing, extra, differing_text) where `missing`
    lists spans the reference prints and the generated file does not, and
    `extra` lists spans the generated file prints and the reference does not.
    """
    used = set()
    pairs = []            # (gen_idx, ref_idx, identical_text)

    # ---- pass 1: nearest position ----
    for gi, g in enumerate(gen_spans):
        best, best_d = None, None
        for i, r in enumerate(ref_spans):
            if i in used:
                continue
            dx = abs(g["bbox"][0] - r["bbox"][0])
            dy = abs(g["baseline"] - r["baseline"])
            if abs(g["size"] - r["size"]) > 0.5:
                continue
            d = dx + dy
            if d <= 2 * TOL and (best_d is None or d < best_d):
                best, best_d = i, d
        if best is not None:
            used.add(best)
            pairs.append((gi, best, norm(gen_spans[gi]["text"]) == norm(ref_spans[best]["text"])))

    # ---- pass 2: fuzzy text for whatever is left ----
    paired_gen = {p[0] for p in pairs}
    for gi, g in enumerate(gen_spans):
        if gi in paired_gen:
            continue
        best, best_score = None, 0.0
        for i, r in enumerate(ref_spans):
            if i in used:
                continue
            score = similarity(norm(g["text"]), norm(r["text"]))
            if score > best_score:
                best, best_score = i, score
        if best is not None and best_score >= MIN_TEXT_MATCH:
            used.add(best)
            pairs.append((gi, best, False))

    matched, moved, missing, differing_text = [], [], [], []
    for gi, ri, same_text in pairs:
        g, r = gen_spans[gi], ref_spans[ri]
        dx = round(g["bbox"][0] - r["bbox"][0], 2)
        dy = round(g["baseline"] - r["baseline"], 2)
        dsz = round(g["size"] - r["size"], 2)
        rec = (g, r, dx, dy, dsz, same_text)
        if abs(dx) <= TOL and abs(dy) <= TOL and abs(dsz) <= 0.5:
            matched.append(rec)
            if not same_text:
                differing_text.append(rec)
        else:
            moved.append(rec)
    # `missing` is what the reference prints and the generated file does not;
    # `extra` is what the generated file prints and the reference does not.
    missing = [r for i, r in enumerate(ref_spans) if i not in used]
    paired_gen = {p[0] for p in pairs}
    extra = [g for i, g in enumerate(gen_spans) if i not in paired_gen]
    return matched, moved, missing, extra, differing_text


def main():
    args = [a for a in sys.argv[1:] if a != "--tag"]
    tag = None
    if "--tag" in sys.argv:
        tag = sys.argv[sys.argv.index("--tag") + 1]
        args = [a for a in args if a != tag]
    gen_path = pathlib.Path(args[0])
    ref_path = pathlib.Path(args[1]) if len(args) > 1 else pathlib.Path(REF_DEFAULT)
    tag = tag or tag_from(gen_path)

    gen_doc = pymupdf.open(gen_path)
    ref_doc = pymupdf.open(ref_path)

    gen_pix = render(gen_doc)
    ref_pix = render(ref_doc)

    out_gen = HERE / f"cmp_{tag}_gen.png"
    out_ref = HERE / f"cmp_{tag}_ref.png"
    gen_pix.save(out_gen)
    ref_pix.save(out_ref)

    lines = []
    lines.append(f"generated : {gen_path}")
    lines.append(f"reference : {ref_path}")
    lines.append(f"gen pages : {gen_doc.page_count}   ref pages : {ref_doc.page_count}")

    # ---------- pixel diff (vectorised with numpy) ----------
    # Yellow highlight bands are large flat areas that dominate a plain "ink"
    # comparison, so dark geometry and yellow coverage are measured separately.
    def to_rgb_array(pix):
        return np.frombuffer(pix.samples, dtype=np.uint8).reshape(
            pix.height, pix.width, pix.n)[:, :, :3].astype(np.int16)

    g_rgb = to_rgb_array(gen_pix)
    r_rgb = to_rgb_array(ref_pix)
    H = min(g_rgb.shape[0], r_rgb.shape[0])
    W = min(g_rgb.shape[1], r_rgb.shape[1])
    g_rgb, r_rgb = g_rgb[:H, :W], r_rgb[:H, :W]
    pixel_note = ""
    if (gen_pix.width, gen_pix.height) != (ref_pix.width, ref_pix.height):
        pixel_note = (f"  [NOTE] canvas differs: gen {gen_pix.width}x{gen_pix.height} vs "
                      f"ref {ref_pix.width}x{ref_pix.height}; comparing overlapping region only")

    def masks(rgb):
        r, gg, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
        yellow = (r > 200) & (gg > 200) & (b < 120)
        dark = (r < 150) & (gg < 150) & (b < 150)
        return dark, yellow

    g_dark, g_yellow = masks(g_rgb)
    r_dark, r_yellow = masks(r_rgb)

    def iou(a, b):
        either = int(np.logical_or(a, b).sum())
        return round(int(np.logical_and(a, b).sum()) / either, 4) if either else 1.0

    dark_gen, dark_ref = int(g_dark.sum()), int(r_dark.sum())
    yellow_gen, yellow_ref = int(g_yellow.sum()), int(r_yellow.sum())
    dark_iou, yellow_iou = iou(g_dark, r_dark), iou(g_yellow, r_yellow)

    diff = np.full((H, W, 3), 255, dtype=np.uint8)
    diff[g_dark & ~r_dark] = (220, 40, 40)     # dark ink only in generated
    diff[r_dark & ~g_dark] = (40, 90, 220)     # dark ink only in reference
    diff[g_yellow & ~r_yellow] = (255, 170, 0)  # highlight only in generated
    diff[r_yellow & ~g_yellow] = (0, 170, 90)   # highlight only in reference
    out_diff = HERE / f"cmp_{tag}_diff.png"
    Image.fromarray(diff).save(out_diff)

    lines.append(pixel_note)
    lines.append(f"pixel canvas compared : {W}x{H}")
    lines.append(f"dark ink px   generated={dark_gen:8d}  reference={dark_ref:8d}  IoU={dark_iou}")
    lines.append(f"highlight px  generated={yellow_gen:8d}  reference={yellow_ref:8d}  IoU={yellow_iou}")
    lines.append(f"diff image  : {out_diff}   red/blue=dark-ink mismatch, orange/green=yellow mismatch")

    # ---- alignment profiles: does either render drift? ----
    for label, a, b in (("dark ink", g_dark, r_dark), ("highlight", g_yellow, r_yellow)):
        if not a.any() or not b.any():
            continue
        gen_rows = a.sum(axis=1).astype(np.int64)
        ref_rows = b.sum(axis=1).astype(np.int64)
        gen_cols = a.sum(axis=0).astype(np.int64)
        ref_cols = b.sum(axis=0).astype(np.int64)

        def best_shift(gen_prof, ref_prof, span):
            best_d, best_score = 0, -1
            for d in range(-span, span + 1):
                if d >= 0:
                    score = int(np.minimum(gen_prof[d:], ref_prof[: len(ref_prof) - d]).sum())
                else:
                    score = int(np.minimum(gen_prof[: len(gen_prof) + d], ref_prof[-d:]).sum())
                if score > best_score:
                    best_score, best_d = score, d
            return best_d

        dx_px = best_shift(gen_cols, ref_cols, 8)
        dy_px = best_shift(gen_rows, ref_rows, 8)
        lines.append(f"best-alignment shift ({label}, 2.2px/pt): "
                     f"dx={dx_px:+d} ({dx_px/2.2:+.2f}pt)  dy={dy_px:+d} ({dy_px/2.2:+.2f}pt)")

    # ---------- span diff ----------
    gen_spans = spans_of(gen_doc)
    ref_spans = spans_of(ref_doc)
    matched, moved, missing, extra, differing_text = compare_spans(gen_spans, ref_spans)
    lines.append("")
    lines.append(f"text spans generated={len(gen_spans)} reference={len(ref_spans)}")
    lines.append(f"  in place (<= {TOL}pt) : {len(matched)}"
                 f"   (of which {len(differing_text)} carry typed-in job data)")
    lines.append(f"  misplaced/missized   : {len(moved)}")
    lines.append(f"  missing from output  : {len(missing)}")
    lines.append(f"  extra vs reference   : {len(extra)}")

    if missing:
        lines.append("\n--- MISSING (in reference, not found in generated) ---")
        for m in missing:
            lines.append(f"  {m['bbox']} sz={m['size']} {m['text']!r}")
    if extra:
        lines.append("\n--- EXTRA (in generated, not in reference) ---")
        for e in extra:
            lines.append(f"  {e['bbox']} sz={e['size']} {e['text']!r}")
    if moved:
        lines.append("\n--- MISPLACED (gen bbox / ref bbox / delta) ---")
        for g, r, dx, dy, dsz, same_text in sorted(moved, key=lambda t: -abs(t[3])):
            flag = "" if same_text else "  [text differs, position checked]"
            lines.append(f"  dx={dx:+7.2f} dy={dy:+7.2f} dsz={dsz:+5.2f} "
                         f"gen={g['bbox']} ref={r['bbox']} {g['text']!r}{flag}")

    report = HERE / f"cmp_{tag}_report.txt"
    report.write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines[:14]))
    if missing or extra or moved:
        print(f"\n...full detail in {report}")


if __name__ == "__main__":
    main()

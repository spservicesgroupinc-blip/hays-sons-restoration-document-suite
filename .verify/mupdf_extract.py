"""Render + extract the uploaded production template with PyMuPDF."""
import sys
import fitz  # PyMuPDF

src = r"C:\Users\russe\Downloads\productiontemplate.pdf"
out_png = r"C:\Users\russe\Downloads\hays+sons-restoration-document-suite\.verify\template_page1.png"

doc = fitz.open(src)
print("pages:", doc.page_count)
print("metadata:", doc.metadata)

page = doc[0]
print("rect:", page.rect)

# high-res render
pix = page.get_pixmap(matrix=fitz.Matrix(2.2, 2.2), alpha=False)
pix.save(out_png)
print("rendered:", out_png, pix.width, "x", pix.height)

print("\n===== TEXT (blocks, sorted top->bottom) =====")
blocks = page.get_text("blocks")
blocks.sort(key=lambda b: (round(b[1]), b[0]))
for b in blocks:
    x0, y0, x1, y1, text, bno, btype = b
    flat = " ".join(text.split())
    if flat:
        print(f"[{y0:7.1f},{x0:6.1f} -> {y1:7.1f},{x1:6.1f}] {flat}")

print("\n===== DRAWINGS / VECTOR MARKS (count) =====")
dr = page.get_drawings()
print("drawings:", len(dr))

print("\n===== IMAGES =====")
for img in page.get_images(full=True):
    print(img)

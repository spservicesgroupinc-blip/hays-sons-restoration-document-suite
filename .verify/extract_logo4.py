"""Extract the brand mark and resolve its SMask alpha onto white, using Pillow.

The template stores the mark as raw RGB plus a separate grayscale SMask, and
PyMuPDF's compositing helpers do not apply the mask, so the alpha is applied
explicitly here before encoding a plain RGB PNG.
"""
import io
import pathlib

import pymupdf
from PIL import Image

SRC = r"C:\Users\russe\Downloads\productiontemplate.pdf"
ROOT = pathlib.Path(r"C:\Users\russe\Downloads\hays+sons-restoration-document-suite")
DESTS = [ROOT / "public" / "hays-sons-logo.png", ROOT / "src" / "assets" / "hays-sons-logo.png"]

doc = pymupdf.open(SRC)
page = doc[0]

info = [i for i in page.get_image_info(xrefs=True) if i["width"] * i["height"] >= 1000][0]
xref, w, h = info["xref"], info["width"], info["height"]
print(f"xref={xref} {w}x{h} bbox={[round(v, 2) for v in info['bbox']]}")

# Base image: PyMuPDF reports 4 channels (RGB + a placeholder alpha). This
# preview alpha is not the document's real transparency, so keep only RGB and
# apply the separate SMask below.
base = pymupdf.Pixmap(doc, xref)
print("base:", base.width, base.height, "n=", base.n, "alpha=", base.alpha, base.colorspace)
samples = base.samples
if base.n == 4:
    rgb_bytes = bytes(
        b for i in range(base.width * base.height) for b in samples[i * 4:i * 4 + 3]
    )
else:
    rgb_bytes = samples
rgb = Image.frombytes("RGB", (base.width, base.height), rgb_bytes)

# Alpha mask (SMask) lives on its own xref
obj = doc.xref_object(xref, compressed=True)
smask_xref = int(obj.split("/SMask")[1].split("R")[0].split()[0])
mask = pymupdf.Pixmap(doc, smask_xref)
print("smask xref:", smask_xref, mask.width, mask.height, "n=", mask.n, mask.colorspace)
alpha = Image.frombytes("L", (mask.width, mask.height), mask.samples[: mask.width * mask.height])

if alpha.size != rgb.size:
    alpha = alpha.resize(rgb.size)

# out = fg * a + white * (1 - a)
white = Image.new("RGB", rgb.size, (255, 255, 255))
composited = Image.composite(rgb, white, alpha)

buf = io.BytesIO()
composited.save(buf, format="PNG", optimize=True)
data = buf.getvalue()

for dest in DESTS:
    dest.write_bytes(data)
    print(f"wrote {dest} ({len(data)} bytes)")

print("corner(2,2) =", composited.getpixel((2, 2)), "(expect white)")
print("wordmark(200,60) =", composited.getpixel((200, 60)), "(expect dark ink)")
print("red bar(20,54) =", composited.getpixel((20, 54)), "(expect ~216,34,50)")
print("centre black(120,40) =", composited.getpixel((120, 40)))

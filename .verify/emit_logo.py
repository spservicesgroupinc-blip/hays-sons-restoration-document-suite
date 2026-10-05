"""Emit src/assets/haysSonsLogo.ts: the brand mark inlined as a base64 PNG.

Inlining keeps the production checklist generator synchronous and free of
fetch/FileReader plumbing, and lets the Node verification harness embed the very
same raster logo the browser build ships.
"""
import base64
import pathlib

ROOT = pathlib.Path(r"C:\Users\russe\Downloads\hays+sons-restoration-document-suite")
PNG = ROOT / "src" / "assets" / "hays-sons-logo.png"
OUT = ROOT / "src" / "assets" / "haysSonsLogo.ts"

raw = PNG.read_bytes()
b64 = base64.b64encode(raw).decode("ascii")

# wrap to keep the source file readable
width = 110
chunks = [b64[i:i + width] for i in range(0, len(b64), width)]
body = "\n".join(f"  '{c}' +" for c in chunks)
body = body.rstrip(" +").rstrip()

OUT.write_text(
    "/**\n"
    " * @license\n"
    " * SPDX-License-Identifier: Apache-2.0\n"
    " */\n"
    "\n"
    "/**\n"
    " * The Hays+Sons brand mark, inlined as a base64 PNG.\n"
    " *\n"
    " * Generated from `src/assets/hays-sons-logo.png`, which was extracted from the\n"
    " * printed reference form so the generated Production Checklist carries exactly\n"
    " * the same mark. Kept inline so PDF generation stays synchronous and needs no\n"
    " * fetch or canvas round-trip.\n"
    " */\n"
    "export const HAYS_SONS_LOGO_PNG_BASE64 =\n"
    f"{body};\n",
    encoding="utf-8",
)
print(f"wrote {OUT} ({OUT.stat().st_size} bytes from {len(raw)} png bytes)")

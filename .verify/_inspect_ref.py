import pymupdf, json
d = pymupdf.open(r"C:\Users\russe\Downloads\productiontemplate.pdf")
print("pages", d.page_count)
p = d[0]
print("rect", p.rect)
print("fonts:")
for f in p.get_fonts(full=True):
    print("   ", f)
print("--- text spans (raw) ---")
dd = p.get_text("dict")
for bi, block in enumerate(dd["blocks"]):
    if block.get("type") != 0: 
        print("block", bi, "type", block.get("type"))
        continue
    for line in block["lines"]:
        for sp in line["spans"]:
            print(f'  b{bi} [{sp["bbox"][0]:8.2f},{sp["bbox"][1]:8.2f},{sp["bbox"][2]:8.2f},{sp["bbox"][3]:8.2f}] sz={sp["size"]:5.2f} font={sp["font"]:28s} flags={sp["flags"]:5d} {sp["text"]!r}')

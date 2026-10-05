import re

d = open(r"C:\Users\russe\Downloads\productiontemplate.pdf", "rb").read()
print("fonts:", sorted(set(re.findall(rb"/BaseFont\s*/([A-Za-z0-9+,\-]+)", d))))
print("subtypes:", sorted(set(re.findall(rb"/Subtype\s*/([A-Za-z0-9]+)", d))))
print("filters:", sorted(set(re.findall(rb"/Filter\s*/([A-Za-z0-9]+)", d))))
print("has ToUnicode:", d.count(b"/ToUnicode"))
print("images:", len(re.findall(rb"/Subtype\s*/Image", d)))
print("producer:", re.findall(rb"/Producer\s*\(([^)]*)\)", d)[:3])
print("creator:", re.findall(rb"/Creator\s*\(([^)]*)\)", d)[:3])
print("objstm:", d.count(b"/ObjStm"))
print("linearized:", b"/Linearized" in d)
print("Page count candidates:", re.findall(rb"/Type\s*/Pages.{0,200}", d, re.S)[:2])

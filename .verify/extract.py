"""Extract the PYTHON_ESX_CONVERTER_SCRIPT template literal from the TS source,
applying JS template-literal escape rules, so we can lint/run the *real* emitted Python."""
import re, pathlib, sys

src = pathlib.Path("src/services/pythonScriptGenerator.ts").read_text(encoding="utf-8")
start = src.index("export const PYTHON_ESX_CONVERTER_SCRIPT = `") + len("export const PYTHON_ESX_CONVERTER_SCRIPT = `")
end = src.rindex("`;")
body = src[start:end]

# JS template literal unescaping (only sequences actually used in this file matter)
out = []
i = 0
while i < len(body):
    ch = body[i]
    if ch == "\\" and i + 1 < len(body):
        nxt = body[i + 1]
        mapping = {"n": "\n", "t": "\t", "r": "\r", "\\": "\\", "`": "`", "$": "$", '"': '"', "'": "'"}
        if nxt in mapping:
            out.append(mapping[nxt])
            i += 2
            continue
        out.append(nxt); i += 2; continue
    out.append(ch); i += 1

text = "".join(out)
pathlib.Path(".verify").mkdir(exist_ok=True)
pathlib.Path(".verify/esx_converter.generated.py").write_text(text, encoding="utf-8")
print("emitted python bytes:", len(text))

# Show the exact characters of the regex lines that are suspect
for n, line in enumerate(text.splitlines(), 1):
    if "item_regex" in line or "re.sub(r'" in line or "re.search(r'" in line:
        print(f"{n:4d}: {line!r}")

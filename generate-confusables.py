"""
Generate Unicode confusables lookup for Unicode Index.
Downloads the Unicode Security confusables data and builds a compact
cp_hex → [confusable_cp_hex, ...] map for single-codepoint entries.

Run: python generate-confusables.py
Output: confusables-data.js
Source: https://www.unicode.org/Public/security/latest/confusables.txt
"""
import urllib.request
import json
from collections import defaultdict

URL = "https://www.unicode.org/Public/security/latest/confusables.txt"

print(f"Fetching {URL}...")
with urllib.request.urlopen(URL) as resp:
    text = resp.read().decode("utf-8")

# Parse source → skeleton map (single-codepoint sources only)
cp_to_skeleton = {}

for line in text.splitlines():
    line = line.strip()
    if not line or line.startswith("#"):
        continue
    # Strip inline comment and split on semicolons
    bare = line.split("#")[0].strip()
    parts = [p.strip() for p in bare.split(";")]
    if len(parts) < 2:
        continue

    src_cps = parts[0].split()
    tgt_cps = parts[1].split()

    # Only handle single-codepoint sources
    if len(src_cps) != 1:
        continue

    try:
        src_cp = int(src_cps[0], 16)
        skeleton = "".join(chr(int(h, 16)) for h in tgt_cps)
        cp_to_skeleton[src_cp] = skeleton
    except ValueError:
        continue

print(f"Parsed {len(cp_to_skeleton)} single-codepoint entries")

# Group by skeleton to find confusable sets
skeleton_to_cps = defaultdict(list)
for cp, skeleton in cp_to_skeleton.items():
    skeleton_to_cps[skeleton].append(cp)

# Build final map: cp_hex → [other_cp_hex, ...]
confusables = {}
for cp, skeleton in cp_to_skeleton.items():
    group = skeleton_to_cps[skeleton]
    others = sorted(other for other in group if other != cp)
    if others:
        confusables[f"{cp:04X}"] = [f"{o:04X}" for o in others]

print(f"Built {len(confusables)} confusable entries")

with open("confusables-data.js", "w", encoding="utf-8") as f:
    f.write("/* Auto-generated Unicode confusables data — do not edit manually */\n")
    f.write("/* Run: python generate-confusables.py to regenerate */\n")
    f.write("/* Source: https://www.unicode.org/Public/security/latest/confusables.txt */\n")
    f.write("const CONFUSABLES = ")
    json.dump(confusables, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\n")

print("Written to confusables-data.js")

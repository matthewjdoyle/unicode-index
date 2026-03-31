"""
Generate Unicode character data for the Unicode Index website.
Covers all blocks listed on https://en.wikipedia.org/wiki/List_of_Unicode_characters
Run: python generate-data.py
Output: unicode-data.js
"""
import unicodedata
import json

BLOCKS = [
    ("C0 Controls",                         0x0000, 0x001F),
    ("Basic Latin",                          0x0020, 0x007E),
    ("Delete",                               0x007F, 0x007F),
    ("C1 Controls",                          0x0080, 0x009F),
    ("Latin-1 Supplement",                   0x00A0, 0x00FF),
    ("Latin Extended-A",                     0x0100, 0x017F),
    ("Latin Extended-B",                     0x0180, 0x024F),
    ("IPA Extensions",                       0x0250, 0x02AF),
    ("Spacing Modifier Letters",             0x02B0, 0x02FF),
    ("Combining Diacritical Marks",          0x0300, 0x036F),
    ("Greek and Coptic",                     0x0370, 0x03FF),
    ("Cyrillic",                             0x0400, 0x04FF),
    ("Cyrillic Supplement",                  0x0500, 0x052F),
    ("Armenian",                             0x0530, 0x058F),
    ("Hebrew",                               0x0590, 0x05FF),
    ("Arabic",                               0x0600, 0x06FF),
    ("Syriac",                               0x0700, 0x074F),
    ("Thaana",                               0x0780, 0x07BF),
    ("Latin Extended Additional",            0x1E00, 0x1EFF),
    ("Greek Extended",                       0x1F00, 0x1FFF),
    ("General Punctuation",                  0x2000, 0x206F),
    ("Superscripts and Subscripts",          0x2070, 0x209F),
    ("Currency Symbols",                     0x20A0, 0x20CF),
    ("Combining Marks for Symbols",          0x20D0, 0x20FF),
    ("Letterlike Symbols",                   0x2100, 0x214F),
    ("Number Forms",                         0x2150, 0x218F),
    ("Arrows",                               0x2190, 0x21FF),
    ("Mathematical Operators",               0x2200, 0x22FF),
    ("Miscellaneous Technical",              0x2300, 0x23FF),
    ("Control Pictures",                     0x2400, 0x243F),
    ("Optical Character Recognition",        0x2440, 0x245F),
    ("Enclosed Alphanumerics",               0x2460, 0x24FF),
    ("Box Drawing",                          0x2500, 0x257F),
    ("Block Elements",                       0x2580, 0x259F),
    ("Geometric Shapes",                     0x25A0, 0x25FF),
    ("Miscellaneous Symbols",                0x2600, 0x26FF),
    ("Dingbats",                             0x2700, 0x27BF),
    ("Miscellaneous Mathematical Symbols-A", 0x27C0, 0x27EF),
    ("Supplemental Arrows-A",               0x27F0, 0x27FF),
    ("Braille Patterns",                     0x2800, 0x28FF),
    ("Supplemental Arrows-B",               0x2900, 0x297F),
    ("Miscellaneous Mathematical Symbols-B", 0x2980, 0x29FF),
    ("Supplemental Mathematical Operators",  0x2A00, 0x2AFF),
    ("Miscellaneous Symbols and Arrows",     0x2B00, 0x2BFF),
]

chars = []
for block_name, start, end in BLOCKS:
    for cp in range(start, end + 1):
        try:
            ch = chr(cp)
            name = unicodedata.name(ch, "")
            cat = unicodedata.category(ch)
            chars.append({
                "cp": cp,
                "hex": f"{cp:04X}",
                "char": ch,
                "name": name if name else f"[{cat}]",
                "cat": cat,
                "block": block_name,
            })
        except Exception:
            pass

print(f"Generated {len(chars)} characters across {len(BLOCKS)} blocks")

with open("unicode-data.js", "w", encoding="utf-8") as f:
    f.write("/* Auto-generated Unicode character data — do not edit manually */\n")
    f.write("/* Run: python generate-data.py to regenerate */\n")
    f.write("const UNICODE_DATA = ")
    json.dump(chars, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\n")

print("Written to unicode-data.js")

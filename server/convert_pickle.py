import pickle
import json
import os

BASE_PATH = "."

with open(os.path.join(BASE_PATH, "HanSansCN_glyfHashedTables.pkl"), "rb") as f:
    glyfHashed_raw = pickle.load(f)[0]

with open(os.path.join(BASE_PATH, "HanSansCN_CmapTables.pkl"), "rb") as f:
    cmap_raw = pickle.load(f)

glyfHashed_json = []
for glyph_name, (sha1_hash, md5_hash) in glyfHashed_raw:
    glyfHashed_json.append([
        glyph_name,
        [sha1_hash.hex(), md5_hash.hex()]
    ])

cmap_json = []
for unicode_int, glyph_name in cmap_raw:
    cmap_json.append([unicode_int, glyph_name])

with open(os.path.join(BASE_PATH, "HanSansCN_glyfHashedTables.json"), "w", encoding="utf-8") as f:
    json.dump(glyfHashed_json, f)

with open(os.path.join(BASE_PATH, "HanSansCN_CmapTables.json"), "w", encoding="utf-8") as f:
    json.dump(cmap_json, f)

print("Pickle files converted to JSON successfully!")
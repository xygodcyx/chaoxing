import pickle
from fontTools.ttLib import TTFont
from hashlib import sha1, md5
import os
from io import BytesIO

# 路径适配：确保指向 server 文件夹
BASE_PATH = "server"

with open(os.path.join(BASE_PATH, "HanSansCN_glyfHashedTables.pkl"), "rb") as f:
    # 结构: [ (glyph_name, (sha1, md5)), ... ]
    glyfHashed_raw = pickle.load(f)[0]

with open(os.path.join(BASE_PATH, "HanSansCN_CmapTables.pkl"), "rb") as f:
    # 结构: [ (unicode_int, glyph_name), ... ]
    cmap_raw = pickle.load(f)

# 转换映射表以供查询
# {(sha1, md5): standard_glyph_name}
glyfHashed = {j: i for i, j in glyfHashed_raw}
# 简体筛选并转换: {standard_glyph_name: unicode_int}
cmap_filtered = {j: i for i, j in cmap_raw if 0x4E00 <= i <= 0x9FA5}


def translate(font: bytes):
    global glyfHashed, cmap_filtered
    # 改为字典存储结果: { '混淆字符': '真实字符' }
    mapping_dict = {}

    aa = TTFont(BytesIO(font))
    aa_glyphs = aa["glyf"].glyphs
    aa_cmap = aa.getBestCmap()  # {unicode_int: current_glyph_name}

    # 翻转当前字体 cmap: {current_glyph_name: unicode_int}
    if aa_cmap == None:
        return mapping_dict

    reverse_aa_cmap = {name: code for code, name in aa_cmap.items()}

    for i, j in aa_glyphs.items():
        try:
            # 计算当前字形的哈希特征
            hashed = (sha1(j.data).digest(), md5(j.data).digest())

            # 1. 寻找标准库中对应的 Glyph Name
            standard_name = glyfHashed[hashed]
            # 2. 找到该 Name 对应的真实 Unicode 码位
            real_unicode = cmap_filtered[standard_name]
            # 3. 找到当前混淆字体中该字形对应的混淆 Unicode 码位
            confused_unicode = reverse_aa_cmap[i]

            # 存入字典
            mapping_dict[chr(confused_unicode)] = chr(real_unicode)

        except KeyError:
            # 跳过 .notdef 或标准库中不存在的字形
            continue

    return mapping_dict

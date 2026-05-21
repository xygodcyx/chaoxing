import { createHash } from 'crypto';
import { LoggerManager } from '../runtime/LoggerManager';
import glyfHashedRaw from '../data/HanSansCN_glyfHashedTables.json';
import cmapRaw from '../data/HanSansCN_CmapTables.json';

const MAC_STANDARD_NAMES = [
  '.notdef', '.null', 'nonmarkingreturn', 'space', 'exclam', 'quotedbl',
  'numbersign', 'dollar', 'percent', 'ampersand', 'quotesingle', 'parenleft',
  'parenright', 'asterisk', 'plus', 'comma', 'hyphen', 'period', 'slash',
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'colon', 'semicolon', 'less', 'equal', 'greater', 'question', 'at',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O',
  'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'bracketleft',
  'backslash', 'bracketright', 'asciicircum', 'underscore', 'grave', 'a', 'b',
  'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q',
  'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'braceleft', 'bar',
  'braceright', 'asciitilde', 'Adieresis', 'Aring', 'Ccedilla', 'Eacute',
  'Ntilde', 'Odieresis', 'Udieresis', 'aacute', 'agrave', 'acircumflex',
  'adieresis', 'atilde', 'aring', 'ccedilla', 'eacute', 'egrave',
  'ecircumflex', 'edieresis', 'iacute', 'igrave', 'icircumflex', 'idieresis',
  'ntilde', 'oacute', 'ograve', 'ocircumflex', 'odieresis', 'otilde',
  'uacute', 'ugrave', 'ucircumflex', 'udieresis', 'dagger', 'degree', 'cent',
  'sterling', 'section', 'bullet', 'paragraph', 'germandbls', 'registered',
  'copyright', 'trademark', 'acute', 'dieresis', 'notequal', 'AE', 'Oslash',
  'infinity', 'plusminus', 'lessequal', 'greaterequal', 'yen', 'mu',
  'partialdiff', 'summation', 'product', 'pi', 'integral', 'ordfeminine',
  'ordmasculine', 'Omega', 'ae', 'oslash', 'questiondown', 'exclamdown',
  'logicalnot', 'radical', 'florin', 'approxequal', 'Delta', 'guillemotleft',
  'guillemotright', 'ellipsis', 'nonbreakingspace', 'Agrave', 'Atilde',
  'Otilde', 'OE', 'oe', 'endash', 'emdash', 'quotedblleft', 'quotedblright',
  'quoteleft', 'quoteright', 'divide', 'lozenge', 'ydieresis', 'Ydieresis',
  'fraction', 'currency', 'guilsinglleft', 'guilsinglright', 'fi', 'fl',
  'daggerdbl', 'periodcentered', 'quotesinglbase', 'quotedblbase',
  'perthousand', 'Acircumflex', 'Ecircumflex', 'Aacute', 'Edieresis',
  'Egrave', 'Iacute', 'Icircumflex', 'Idieresis', 'Igrave', 'Oacute',
  'Ocircumflex', 'apple', 'Ograve', 'Uacute', 'Ucircumflex', 'Ugrave',
  'dotlessi', 'circumflex', 'tilde', 'macron', 'breve', 'dotaccent', 'ring',
  'cedilla', 'hungarumlaut', 'ogonek', 'caron', 'Lslash', 'lslash', 'Scaron',
  'scaron', 'Zcaron', 'zcaron', 'brokenbar', 'Eth', 'eth', 'Yacute', 'yacute',
  'Thorn', 'thorn', 'minus', 'multiply', 'onesuperior', 'twosuperior',
  'threesuperior', 'onehalf', 'onequarter', 'threequarters', 'franc',
  'Gbreve', 'gbreve', 'Idotaccent', 'Scedilla', 'scedilla', 'Cacute',
  'cacute', 'Ccaron', 'ccaron', 'dcroat',
];

interface TtfTableEntry {
  offset: number;
  length: number;
}

let glyfHashed: Record<string, string> = {};
let cmapFiltered: Record<string, number> = {};
let initialized = false;

function initData(): void {
  if (initialized) return;

  glyfHashed = {};
  for (const [glyphName, hashes] of glyfHashedRaw as [string, [string, string]][]) {
    glyfHashed[hashes[0] + ':' + hashes[1]] = glyphName;
  }

  cmapFiltered = {};
  for (const [unicodeInt, glyphName] of cmapRaw as [number, string][]) {
    if (unicodeInt >= 0x4e00 && unicodeInt <= 0x9fa5) {
      cmapFiltered[glyphName] = unicodeInt;
    }
  }

  LoggerManager.Instance.debug(
    `[fontDecoder] Loaded ${Object.keys(glyfHashed).length} glyf hashes, ${Object.keys(cmapFiltered).length} CJK cmap entries`,
  );
  initialized = true;
}

function parseTtfTables(buffer: Buffer): Record<string, TtfTableEntry> {
  const numTables = buffer.readUInt16BE(4);
  const tables: Record<string, TtfTableEntry> = {};
  for (let i = 0; i < numTables; i++) {
    const off = 12 + i * 16;
    const tag = buffer.toString('ascii', off, off + 4);
    tables[tag] = {
      offset: buffer.readUInt32BE(off + 8),
      length: buffer.readUInt32BE(off + 12),
    };
  }
  return tables;
}

function parseCmap(buffer: Buffer, tables: Record<string, TtfTableEntry>): Record<number, number> {
  const cmap = tables['cmap'];
  if (!cmap) throw new Error('No cmap table');

  const base = cmap.offset;
  const numTables = buffer.readUInt16BE(base + 2);

  let bestSubtableOffset = 0;
  let bestFormat = 0;

  for (let i = 0; i < numTables; i++) {
    const recOff = base + 4 + i * 8;
    const platformID = buffer.readUInt16BE(recOff);
    const encodingID = buffer.readUInt16BE(recOff + 2);
    const subOff = buffer.readUInt32BE(recOff + 4);
    const subBase = base + subOff;
    const format = buffer.readUInt16BE(subBase);

    if (bestSubtableOffset === 0) {
      bestSubtableOffset = subOff;
      bestFormat = format;
    }

    if (platformID === 3 && encodingID === 1) {
      bestSubtableOffset = subOff;
      bestFormat = format;
      break;
    }

    if (platformID === 3 && encodingID === 10) {
      if (bestSubtableOffset === 0 || (bestSubtableOffset !== 0 && bestFormat !== 4)) {
        bestSubtableOffset = subOff;
        bestFormat = format;
      }
    }
  }

  const subBase = base + bestSubtableOffset;
  const format = buffer.readUInt16BE(subBase);
  const result: Record<number, number> = {};

  if (format === 4) {
    const segCountX2 = buffer.readUInt16BE(subBase + 6);
    const segCount = segCountX2 / 2;

    const endCodeOff = subBase + 14;
    const startCodeOff = endCodeOff + 2 + segCountX2;
    const idDeltaOff = startCodeOff + segCountX2;
    const idRangeOffOff = idDeltaOff + segCountX2;

    for (let seg = 0; seg < segCount; seg++) {
      const endCode = buffer.readUInt16BE(endCodeOff + seg * 2);
      const startCode = buffer.readUInt16BE(startCodeOff + seg * 2);
      const idDelta = buffer.readInt16BE(idDeltaOff + seg * 2);
      const idRangeOffset = buffer.readUInt16BE(idRangeOffOff + seg * 2);

      if (startCode === 0xffff) continue;

      for (let charCode = startCode; charCode <= endCode; charCode++) {
        let glyphIndex: number;
        if (idRangeOffset === 0) {
          glyphIndex = (charCode + idDelta) & 0xffff;
        } else {
          const rangeBase = idRangeOffOff + seg * 2;
          const rangeOff = rangeBase + idRangeOffset + (charCode - startCode) * 2;
          glyphIndex = buffer.readUInt16BE(rangeOff);
          if (glyphIndex !== 0) {
            glyphIndex = (glyphIndex + idDelta) & 0xffff;
          }
        }
        if (glyphIndex !== 0) {
          result[charCode] = glyphIndex;
        }
      }
    }
  } else if (format === 12) {
    const numGroups = buffer.readUInt32BE(subBase + 12);
    for (let g = 0; g < numGroups; g++) {
      const goff = subBase + 16 + g * 12;
      const startCode = buffer.readUInt32BE(goff);
      const endCode = buffer.readUInt32BE(goff + 4);
      const startGlyphID = buffer.readUInt32BE(goff + 8);
      for (let charCode = startCode; charCode <= endCode; charCode++) {
        result[charCode] = startGlyphID + (charCode - startCode);
      }
    }
  } else if (format === 6) {
    const firstCode = buffer.readUInt16BE(subBase + 6);
    const entryCount = buffer.readUInt16BE(subBase + 8);
    for (let e = 0; e < entryCount; e++) {
      const glyphIndex = buffer.readUInt16BE(subBase + 10 + e * 2);
      if (glyphIndex !== 0) {
        result[firstCode + e] = glyphIndex;
      }
    }
  }

  return result;
}

function parsePost(buffer: Buffer, tables: Record<string, TtfTableEntry>, numGlyphs: number): string[] {
  const post = tables['post'];
  if (!post) throw new Error('No post table');

  const base = post.offset;
  const format = buffer.readUInt32BE(base);
  const version = (format & 0xffff0000) >>> 16;

  if (version === 1) {
    const result: string[] = [];
    for (let i = 0; i < numGlyphs; i++) {
      result.push(i < 258 ? MAC_STANDARD_NAMES[i] : 'glyph' + i);
    }
    return result;
  }

  if (version === 2) {
    const numberOfGlyphs = buffer.readUInt16BE(base + 32);
    const nameIndexArray: number[] = [];
    let maxIndex = 0;
    for (let i = 0; i < numberOfGlyphs; i++) {
      const idx = buffer.readUInt16BE(base + 34 + i * 2);
      nameIndexArray.push(idx);
      if (idx > maxIndex) maxIndex = idx;
    }

    let pascalOffset = base + 34 + numberOfGlyphs * 2;
    const additionalNames: string[] = [];
    const extraCount = maxIndex >= 258 ? maxIndex - 257 : 0;
    for (let i = 0; i < extraCount; i++) {
      if (pascalOffset >= base + post.length) break;
      const nameLen = buffer.readUInt8(pascalOffset);
      if (nameLen === 0 || pascalOffset + 1 + nameLen > base + post.length) {
        additionalNames.push('glyph' + (258 + i));
        pascalOffset++;
        continue;
      }
      const name = buffer.toString('ascii', pascalOffset + 1, pascalOffset + 1 + nameLen);
      additionalNames.push(name);
      pascalOffset += 1 + nameLen;
    }

    const result: string[] = [];
    for (let i = 0; i < numGlyphs; i++) {
      if (i < numberOfGlyphs) {
        const ni = nameIndexArray[i];
        if (ni < 258) {
          result.push(MAC_STANDARD_NAMES[ni] || '.notdef');
        } else {
          const extraIdx = ni - 258;
          result.push(extraIdx < additionalNames.length ? additionalNames[extraIdx] : 'glyph' + i);
        }
      } else {
        result.push('glyph' + i);
      }
    }
    return result;
  }

  const result: string[] = [];
  for (let i = 0; i < numGlyphs; i++) {
    result.push('glyph' + i);
  }
  return result;
}

function extractGlyfRawData(buffer: Buffer, tables: Record<string, TtfTableEntry>): Buffer[] {
  const head = tables['head'];
  const loca = tables['loca'];
  const glyf = tables['glyf'];
  const maxp = tables['maxp'];

  if (!head || !loca || !glyf || !maxp) {
    throw new Error('Missing required TTF tables (head/loca/glyf/maxp)');
  }

  const indexToLocFormat = buffer.readUInt16BE(head.offset + 50);
  const numGlyphs = buffer.readUInt16BE(maxp.offset + 4);

  const glyphDataList: Buffer[] = [];

  for (let i = 0; i < numGlyphs; i++) {
    let glyphOffset: number;
    let nextGlyphOffset: number;
    if (indexToLocFormat === 0) {
      glyphOffset = buffer.readUInt16BE(loca.offset + i * 2) * 2;
      nextGlyphOffset = buffer.readUInt16BE(loca.offset + (i + 1) * 2) * 2;
    } else {
      glyphOffset = buffer.readUInt32BE(loca.offset + i * 4);
      nextGlyphOffset = buffer.readUInt32BE(loca.offset + (i + 1) * 4);
    }

    if (glyphOffset === nextGlyphOffset) {
      glyphDataList.push(Buffer.alloc(0));
    } else {
      glyphDataList.push(buffer.subarray(glyf.offset + glyphOffset, glyf.offset + nextGlyphOffset));
    }
  }

  return glyphDataList;
}

function translate(fontBuffer: Buffer): Record<string, string> {
  initData();

  const mappingDict: Record<string, string> = {};

  let tables: Record<string, TtfTableEntry>;
  try {
    tables = parseTtfTables(fontBuffer);
  } catch {
    return mappingDict;
  }

  const maxp = tables['maxp'];
  if (!maxp) return mappingDict;

  const numGlyphs = fontBuffer.readUInt16BE(maxp.offset + 4);

  let glyphDataList: Buffer[];
  try {
    glyphDataList = extractGlyfRawData(fontBuffer, tables);
  } catch {
    return mappingDict;
  }

  let cmap: Record<number, number>;
  try {
    cmap = parseCmap(fontBuffer, tables);
  } catch {
    return mappingDict;
  }

  let glyphNames: string[];
  try {
    glyphNames = parsePost(fontBuffer, tables, numGlyphs);
  } catch {
    glyphNames = [];
    for (let i = 0; i < numGlyphs; i++) {
      glyphNames.push('glyph' + i);
    }
  }

  const reverseCmap: Record<string, number> = {};
  for (const unicodeStr of Object.keys(cmap)) {
    const unicode = Number(unicodeStr);
    const glyphIndex = cmap[unicode];
    if (glyphIndex < glyphNames.length) {
      reverseCmap[glyphNames[glyphIndex]] = unicode;
    }
  }

  for (let i = 0; i < numGlyphs; i++) {
    const rawData = glyphDataList[i];
    if (!rawData || rawData.length === 0) continue;

    const sha1Hash = createHash('sha1').update(rawData).digest();
    const md5Hash = createHash('md5').update(rawData).digest();
    const hashKey = sha1Hash.toString('hex') + ':' + md5Hash.toString('hex');

    const standardName = glyfHashed[hashKey];
    if (!standardName) continue;

    const realUnicode = cmapFiltered[standardName];
    if (realUnicode === undefined) continue;

    const glyphName = glyphNames[i];
    if (!glyphName) continue;

    const confusedUnicode = reverseCmap[glyphName];
    if (confusedUnicode === undefined) continue;

    mappingDict[String.fromCharCode(confusedUnicode)] = String.fromCharCode(realUnicode);
  }

  LoggerManager.Instance.debug(
    `[fontDecoder] Decoded ${Object.keys(mappingDict).length} character mappings`,
  );

  return mappingDict;
}

export async function decodeFont(
  base64Font: string,
  encryptedText: string,
): Promise<string> {
  try {
    const fontBuffer = Buffer.from(base64Font, 'base64');
    const mapping = translate(fontBuffer);
    return encryptedText
      .split('')
      .map((char) => mapping[char] || char)
      .join('');
  } catch {
    return encryptedText;
  }
}

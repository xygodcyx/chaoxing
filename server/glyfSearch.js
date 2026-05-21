const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const BASE_PATH = __dirname

const MAC_STANDARD_NAMES = [
  '.notdef',
  '.null',
  'nonmarkingreturn',
  'space',
  'exclam',
  'quotedbl',
  'numbersign',
  'dollar',
  'percent',
  'ampersand',
  'quotesingle',
  'parenleft',
  'parenright',
  'asterisk',
  'plus',
  'comma',
  'hyphen',
  'period',
  'slash',
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'colon',
  'semicolon',
  'less',
  'equal',
  'greater',
  'question',
  'at',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  'bracketleft',
  'backslash',
  'bracketright',
  'asciicircum',
  'underscore',
  'grave',
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
  'braceleft',
  'bar',
  'braceright',
  'asciitilde',
  'Adieresis',
  'Aring',
  'Ccedilla',
  'Eacute',
  'Ntilde',
  'Odieresis',
  'Udieresis',
  'aacute',
  'agrave',
  'acircumflex',
  'adieresis',
  'atilde',
  'aring',
  'ccedilla',
  'eacute',
  'egrave',
  'ecircumflex',
  'edieresis',
  'iacute',
  'igrave',
  'icircumflex',
  'idieresis',
  'ntilde',
  'oacute',
  'ograve',
  'ocircumflex',
  'odieresis',
  'otilde',
  'uacute',
  'ugrave',
  'ucircumflex',
  'udieresis',
  'dagger',
  'degree',
  'cent',
  'sterling',
  'section',
  'bullet',
  'paragraph',
  'germandbls',
  'registered',
  'copyright',
  'trademark',
  'acute',
  'dieresis',
  'notequal',
  'AE',
  'Oslash',
  'infinity',
  'plusminus',
  'lessequal',
  'greaterequal',
  'yen',
  'mu',
  'partialdiff',
  'summation',
  'product',
  'pi',
  'integral',
  'ordfeminine',
  'ordmasculine',
  'Omega',
  'ae',
  'oslash',
  'questiondown',
  'exclamdown',
  'logicalnot',
  'radical',
  'florin',
  'approxequal',
  'Delta',
  'guillemotleft',
  'guillemotright',
  'ellipsis',
  'nonbreakingspace',
  'Agrave',
  'Atilde',
  'Otilde',
  'OE',
  'oe',
  'endash',
  'emdash',
  'quotedblleft',
  'quotedblright',
  'quoteleft',
  'quoteright',
  'divide',
  'lozenge',
  'ydieresis',
  'Ydieresis',
  'fraction',
  'currency',
  'guilsinglleft',
  'guilsinglright',
  'fi',
  'fl',
  'daggerdbl',
  'periodcentered',
  'quotesinglbase',
  'quotedblbase',
  'perthousand',
  'Acircumflex',
  'Ecircumflex',
  'Aacute',
  'Edieresis',
  'Egrave',
  'Iacute',
  'Icircumflex',
  'Idieresis',
  'Igrave',
  'Oacute',
  'Ocircumflex',
  'apple',
  'Ograve',
  'Uacute',
  'Ucircumflex',
  'Ugrave',
  'dotlessi',
  'circumflex',
  'tilde',
  'macron',
  'breve',
  'dotaccent',
  'ring',
  'cedilla',
  'hungarumlaut',
  'ogonek',
  'caron',
  'Lslash',
  'lslash',
  'Scaron',
  'scaron',
  'Zcaron',
  'zcaron',
  'brokenbar',
  'Eth',
  'eth',
  'Yacute',
  'yacute',
  'Thorn',
  'thorn',
  'minus',
  'multiply',
  'onesuperior',
  'twosuperior',
  'threesuperior',
  'onehalf',
  'onequarter',
  'threequarters',
  'franc',
  'Gbreve',
  'gbreve',
  'Idotaccent',
  'Scedilla',
  'scedilla',
  'Cacute',
  'cacute',
  'Ccaron',
  'ccaron',
  'dcroat',
]

let glyfHashed = {}
let cmapFiltered = {}

function loadJsonData() {
  console.log('[INIT] Loading JSON data files...')
  const glyfPath = path.join(
    BASE_PATH,
    'HanSansCN_glyfHashedTables.json',
  )
  const cmapPath = path.join(
    BASE_PATH,
    'HanSansCN_CmapTables.json',
  )

  const glyfHashedRaw = JSON.parse(
    fs.readFileSync(glyfPath, 'utf8'),
  )
  console.log(
    '[INIT] glyfHashedRaw entries:',
    glyfHashedRaw.length,
  )
  console.log(
    '[INIT] glyfHashedRaw[0]:',
    JSON.stringify(glyfHashedRaw[0]),
  )

  const cmapRaw = JSON.parse(
    fs.readFileSync(cmapPath, 'utf8'),
  )
  console.log('[INIT] cmapRaw entries:', cmapRaw.length)

  glyfHashed = {}
  glyfHashedRaw.forEach(([glyphName, hashes]) => {
    const key = hashes[0] + ':' + hashes[1]
    glyfHashed[key] = glyphName
  })
  console.log(
    '[INIT] glyfHashed unique keys:',
    Object.keys(glyfHashed).length,
  )

  cmapFiltered = {}
  let cjkCount = 0
  cmapRaw.forEach(([unicodeInt, glyphName]) => {
    if (unicodeInt >= 0x4e00 && unicodeInt <= 0x9fa5) {
      cmapFiltered[glyphName] = unicodeInt
      cjkCount++
    }
  })
  console.log('[INIT] cmapFiltered CJK entries:', cjkCount)
}

function init() {
  console.log('[INIT] ========== Initializing ==========')
  loadJsonData()
  console.log('[INIT] ========== Init complete ==========')
}

function parseTtfTables(buffer) {
  const numTables = buffer.readUInt16BE(4)
  const tables = {}
  for (let i = 0; i < numTables; i++) {
    const off = 12 + i * 16
    const tag = buffer.toString('ascii', off, off + 4)
    tables[tag] = {
      offset: buffer.readUInt32BE(off + 8),
      length: buffer.readUInt32BE(off + 12),
    }
  }
  console.log(
    '[TTF] Tables:',
    Object.keys(tables).join(', '),
  )
  return tables
}

function readUInt24BE(buffer, offset) {
  return (
    (buffer[offset] << 16) |
    (buffer[offset + 1] << 8) |
    buffer[offset + 2]
  )
}

function parseCmap(buffer, tables) {
  console.log('[CMAP] Parsing cmap table...')
  const cmap = tables['cmap']
  if (!cmap) throw new Error('No cmap table')

  const base = cmap.offset
  const version = buffer.readUInt16BE(base)
  const numTables = buffer.readUInt16BE(base + 2)
  console.log(
    '[CMAP] version:',
    version,
    'numSubTables:',
    numTables,
  )

  let bestSubtableOffset = 0
  let bestFormat = 0

  for (let i = 0; i < numTables; i++) {
    const recOff = base + 4 + i * 8
    const platformID = buffer.readUInt16BE(recOff)
    const encodingID = buffer.readUInt16BE(recOff + 2)
    const subOff = buffer.readUInt32BE(recOff + 4)

    const subBase = base + subOff
    const format = buffer.readUInt16BE(subBase)
    console.log(
      '[CMAP] Subtable',
      i,
      ': platform=' + platformID,
      'encoding=' + encodingID,
      'format=' + format,
      'offset=' + subOff,
    )

    if (bestSubtableOffset === 0) {
      bestSubtableOffset = subOff
      bestFormat = format
    }

    if (platformID === 3 && encodingID === 1) {
      bestSubtableOffset = subOff
      bestFormat = format
      console.log(
        '[CMAP] Selected best: platform 3 enc 1 (Windows BMP) format=' +
          format,
      )
      break
    }

    if (platformID === 3 && encodingID === 10) {
      if (
        bestSubtableOffset === 0 ||
        (bestSubtableOffset !== 0 && bestFormat !== 4)
      ) {
        bestSubtableOffset = subOff
        bestFormat = format
      }
    }
  }

  const subBase = base + bestSubtableOffset
  const format = buffer.readUInt16BE(subBase)
  console.log(
    '[CMAP] Parsing selected subtable: format=' + format,
  )

  const result = {}

  if (format === 4) {
    const length = buffer.readUInt16BE(subBase + 2)
    const language = buffer.readUInt16BE(subBase + 4)
    const segCountX2 = buffer.readUInt16BE(subBase + 6)
    const segCount = segCountX2 / 2
    console.log('[CMAP] Format 4: segCount=' + segCount)

    const endCodeOff = subBase + 14
    const startCodeOff = endCodeOff + 2 + segCountX2
    const idDeltaOff = startCodeOff + segCountX2
    const idRangeOffOff = idDeltaOff + segCountX2

    for (let seg = 0; seg < segCount; seg++) {
      const endCode = buffer.readUInt16BE(
        endCodeOff + seg * 2,
      )
      const startCode = buffer.readUInt16BE(
        startCodeOff + seg * 2,
      )
      const idDelta = buffer.readInt16BE(
        idDeltaOff + seg * 2,
      )
      const idRangeOffset = buffer.readUInt16BE(
        idRangeOffOff + seg * 2,
      )

      if (startCode === 0xffff) continue

      for (
        let charCode = startCode;
        charCode <= endCode;
        charCode++
      ) {
        let glyphIndex
        if (idRangeOffset === 0) {
          glyphIndex = (charCode + idDelta) & 0xffff
        } else {
          const rangeBase = idRangeOffOff + seg * 2
          const rangeOff =
            rangeBase +
            idRangeOffset +
            (charCode - startCode) * 2
          glyphIndex = buffer.readUInt16BE(rangeOff)
          if (glyphIndex !== 0) {
            glyphIndex = (glyphIndex + idDelta) & 0xffff
          }
        }
        if (glyphIndex !== 0) {
          result[charCode] = glyphIndex
        }
      }
    }
  } else if (format === 12) {
    const length = buffer.readUInt32BE(subBase + 4)
    const language = buffer.readUInt32BE(subBase + 8)
    const numGroups = buffer.readUInt32BE(subBase + 12)
    console.log('[CMAP] Format 12: numGroups=' + numGroups)

    for (let g = 0; g < numGroups; g++) {
      const goff = subBase + 16 + g * 12
      const startCode = buffer.readUInt32BE(goff)
      const endCode = buffer.readUInt32BE(goff + 4)
      const startGlyphID = buffer.readUInt32BE(goff + 8)

      for (
        let charCode = startCode;
        charCode <= endCode;
        charCode++
      ) {
        result[charCode] =
          startGlyphID + (charCode - startCode)
      }
    }
  } else if (format === 6) {
    const length = buffer.readUInt16BE(subBase + 2)
    const language = buffer.readUInt16BE(subBase + 4)
    const firstCode = buffer.readUInt16BE(subBase + 6)
    const entryCount = buffer.readUInt16BE(subBase + 8)
    console.log(
      '[CMAP] Format 6: firstCode=' +
        firstCode +
        ' entryCount=' +
        entryCount,
    )

    for (let e = 0; e < entryCount; e++) {
      const glyphIndex = buffer.readUInt16BE(
        subBase + 10 + e * 2,
      )
      if (glyphIndex !== 0) {
        result[firstCode + e] = glyphIndex
      }
    }
  }

  console.log(
    '[CMAP] Total unicode→glyphIndex mappings:',
    Object.keys(result).length,
  )

  if (Object.keys(result).length > 0) {
    const sampleKeys = Object.keys(result)
      .slice(0, 5)
      .map(Number)
    console.log(
      '[CMAP] Sample mappings:',
      sampleKeys.map((k) => k + '→' + result[k]).join(', '),
    )
  }

  return result
}

function parsePost(buffer, tables, numGlyphs) {
  console.log('[POST] Parsing post table...')
  const post = tables['post']
  if (!post) throw new Error('No post table')

  const base = post.offset
  const format = buffer.readUInt32BE(base)

  const version = (format & 0xffff0000) >>> 16
  const revision = format & 0xffff
  console.log(
    '[POST] Format version:',
    version,
    'revision:',
    revision,
  )

  if (version === 1) {
    console.log(
      '[POST] Format 1.0 (258 Mac standard names)',
    )
    const result = []
    for (let i = 0; i < numGlyphs; i++) {
      if (i < 258) {
        result.push(MAC_STANDARD_NAMES[i])
      } else {
        result.push('glyph' + i)
      }
    }
    return result
  }

  if (version === 2) {
    const numberOfGlyphs = buffer.readUInt16BE(base + 32)

    const nameIndexArray = []
    let maxIndex = 0
    for (let i = 0; i < numberOfGlyphs; i++) {
      const idx = buffer.readUInt16BE(base + 34 + i * 2)
      nameIndexArray.push(idx)
      if (idx > maxIndex) maxIndex = idx
    }

    console.log(
      '[POST] Format 2.0: numberOfGlyphs=' +
        numberOfGlyphs +
        ' maxNameIndex=' +
        maxIndex,
    )

    let pascalOffset = base + 34 + numberOfGlyphs * 2
    const additionalNames = []

    const extraCount = maxIndex >= 258 ? maxIndex - 257 : 0
    for (let i = 0; i < extraCount; i++) {
      if (pascalOffset >= base + post.length) break
      const nameLen = buffer.readUInt8(pascalOffset)
      if (
        nameLen === 0 ||
        pascalOffset + 1 + nameLen > base + post.length
      ) {
        additionalNames.push('glyph' + (258 + i))
        pascalOffset++
        continue
      }
      const name = buffer.toString(
        'ascii',
        pascalOffset + 1,
        pascalOffset + 1 + nameLen,
      )
      additionalNames.push(name)
      pascalOffset += 1 + nameLen
    }

    const result = []
    for (let i = 0; i < numGlyphs; i++) {
      if (i < numberOfGlyphs) {
        const ni = nameIndexArray[i]
        if (ni < 258) {
          result.push(MAC_STANDARD_NAMES[ni] || '.notdef')
        } else {
          const extraIdx = ni - 258
          result.push(
            extraIdx < additionalNames.length
              ? additionalNames[extraIdx]
              : 'glyph' + i,
          )
        }
      } else {
        result.push('glyph' + i)
      }
    }

    console.log(
      '[POST] Parsed',
      result.length,
      'glyph names',
    )
    console.log(
      '[POST] Sample names:',
      result.slice(0, 5).join(', '),
    )

    return result
  }

  if (version === 2.5) {
    console.log('[POST] Format 2.5 (deprecated)')
    const result = []
    for (let i = 0; i < numGlyphs; i++) {
      result.push('glyph' + i)
    }
    return result
  }

  console.log(
    '[POST] Format 3.0 (no names), generating synthetic names',
  )
  const result = []
  for (let i = 0; i < numGlyphs; i++) {
    result.push('glyph' + i)
  }
  return result
}

function extractGlyfRawData(buffer, tables) {
  const head = tables['head']
  const loca = tables['loca']
  const glyf = tables['glyf']
  const maxp = tables['maxp']

  if (!head || !loca || !glyf || !maxp) {
    throw new Error(
      'Missing required TTF tables (head/loca/glyf/maxp)',
    )
  }

  const indexToLocFormat = buffer.readUInt16BE(
    head.offset + 50,
  )
  const numGlyphs = buffer.readUInt16BE(maxp.offset + 4)

  console.log(
    '[GLYF] numGlyphs:',
    numGlyphs,
    'indexToLocFormat:',
    indexToLocFormat,
  )

  const glyphDataList = []
  let emptyCount = 0

  for (let i = 0; i < numGlyphs; i++) {
    let glyphOffset, nextGlyphOffset
    if (indexToLocFormat === 0) {
      glyphOffset =
        buffer.readUInt16BE(loca.offset + i * 2) * 2
      nextGlyphOffset =
        buffer.readUInt16BE(loca.offset + (i + 1) * 2) * 2
    } else {
      glyphOffset = buffer.readUInt32BE(loca.offset + i * 4)
      nextGlyphOffset = buffer.readUInt32BE(
        loca.offset + (i + 1) * 4,
      )
    }

    if (glyphOffset === nextGlyphOffset) {
      glyphDataList.push(Buffer.alloc(0))
      emptyCount++
    } else {
      glyphDataList.push(
        buffer.slice(
          glyf.offset + glyphOffset,
          glyf.offset + nextGlyphOffset,
        ),
      )
    }
  }

  console.log(
    '[GLYF] Extracted',
    numGlyphs - emptyCount,
    'non-empty,',
    emptyCount,
    'empty glyphs',
  )
  return glyphDataList
}

function translate(fontBuffer) {
  console.log(
    '[TRANS] ========== translate() start ==========',
  )
  console.log('[TRANS] buffer size:', fontBuffer.length)

  const mappingDict = {}

  let tables
  try {
    tables = parseTtfTables(fontBuffer)
  } catch (e) {
    console.error(
      '[TRANS] parseTtfTables failed:',
      e.message,
    )
    return mappingDict
  }

  const maxp = tables['maxp']
  if (!maxp) {
    console.error('[TRANS] No maxp table')
    return mappingDict
  }
  const numGlyphs = fontBuffer.readUInt16BE(maxp.offset + 4)
  console.log('[TRANS] numGlyphs from maxp:', numGlyphs)

  let glyphDataList
  try {
    glyphDataList = extractGlyfRawData(fontBuffer, tables)
  } catch (e) {
    console.error(
      '[TRANS] extractGlyfRawData failed:',
      e.message,
    )
    return mappingDict
  }

  let cmap
  try {
    cmap = parseCmap(fontBuffer, tables)
  } catch (e) {
    console.error('[TRANS] parseCmap failed:', e.message)
    return mappingDict
  }

  let glyphNames
  try {
    glyphNames = parsePost(fontBuffer, tables, numGlyphs)
  } catch (e) {
    console.error('[TRANS] parsePost failed:', e.message)
    glyphNames = []
    for (let i = 0; i < numGlyphs; i++) {
      glyphNames.push('glyph' + i)
    }
  }

  console.log(
    '[TRANS] Building reverseCmap from cmap + post names...',
  )
  const reverseCmap = {}
  const cmapKeys = Object.keys(cmap)
  for (let k = 0; k < cmapKeys.length; k++) {
    const unicode = parseInt(cmapKeys[k])
    const glyphIndex = cmap[unicode]
    if (glyphIndex < glyphNames.length) {
      reverseCmap[glyphNames[glyphIndex]] = unicode
    }
  }
  console.log(
    '[TRANS] reverseCmap entries:',
    Object.keys(reverseCmap).length,
  )

  console.log(
    '[TRANS] Matching glyphs against standard library...',
  )
  let hashed = 0
  let inCmap = 0
  let fullMatch = 0
  const sampleHashes = []

  for (let i = 0; i < numGlyphs; i++) {
    const rawData = glyphDataList[i]
    if (!rawData || rawData.length === 0) continue

    const sha1Hash = crypto
      .createHash('sha1')
      .update(rawData)
      .digest()
    const md5Hash = crypto
      .createHash('md5')
      .update(rawData)
      .digest()
    const hashKey =
      sha1Hash.toString('hex') +
      ':' +
      md5Hash.toString('hex')

    if (sampleHashes.length < 3) {
      sampleHashes.push({
        index: i,
        name: glyphNames[i] || 'idx' + i,
        hash: hashKey.substring(0, 80) + '...',
        dataLen: rawData.length,
      })
    }

    const standardName = glyfHashed[hashKey]
    if (!standardName) continue
    hashed++

    const realUnicode = cmapFiltered[standardName]
    if (realUnicode === undefined) continue
    inCmap++

    const glyphName = glyphNames[i]
    if (!glyphName) continue

    const confusedUnicode = reverseCmap[glyphName]
    if (confusedUnicode === undefined) continue
    fullMatch++

    mappingDict[String.fromCharCode(confusedUnicode)] =
      String.fromCharCode(realUnicode)
  }

  console.log(
    '[TRANS] Sample hashes:',
    JSON.stringify(sampleHashes),
  )
  console.log(
    '[TRANS] Match stats: hashed=' +
      hashed +
      ' inCmap=' +
      inCmap +
      ' fullMatch=' +
      fullMatch,
  )
  console.log('[TRANS] Final mappingDict count:', fullMatch)
  console.log(
    '[TRANS] ========== translate() end ==========',
  )

  return mappingDict
}

function _getStats() {
  return { glyfHashed, cmapFiltered }
}

module.exports = { init, translate, _getStats }

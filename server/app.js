const express = require('express')
const bodyParser = require('body-parser')
const glyfSearch = require('./glyfSearch')

const app = express()
const PORT = 8080

process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err.message)
  console.error('[FATAL] stack:', err.stack)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] unhandledRejection:', reason)
})

app.use(bodyParser.json({ limit: '50mb' }))

glyfSearch.init()

app.post('/get_ttf', (req, res) => {
  console.log('[REQ] ========== New request ==========')
  console.log(
    '[REQ] Content-Type:',
    req.get('Content-Type'),
  )

  const base64Data = req.body.base64

  if (!base64Data) {
    console.log(
      '[REQ] No base64 field in body, keys:',
      Object.keys(req.body),
    )
    return res
      .status(400)
      .json({ error: 'Missing base64 data' })
  }

  console.log('[REQ] base64 length:', base64Data.length)
  console.log(
    '[REQ] base64 prefix (first 60 chars):',
    base64Data.substring(0, 60),
  )

  try {
    console.log('[STEP1] Decoding base64...')
    let fontBuffer
    try {
      fontBuffer = Buffer.from(base64Data, 'base64')
    } catch (e) {
      console.error(
        '[STEP1] base64 decode FAILED:',
        e.message,
      )
      return res
        .status(400)
        .json({
          error: 'Invalid base64',
          detail: e.message,
        })
    }

    console.log(
      '[STEP1] Decoded buffer size:',
      fontBuffer.length,
      'bytes',
    )

    const magic = fontBuffer.toString(
      'ascii',
      0,
      Math.min(4, fontBuffer.length),
    )
    console.log('[STEP1] Buffer magic bytes:', magic)

    if (fontBuffer.length < 4) {
      console.error(
        '[STEP1] Buffer too small:',
        fontBuffer.length,
      )
      return res
        .status(400)
        .json({
          error: 'Buffer too small',
          size: fontBuffer.length,
        })
    }

    console.log('[STEP2] Calling glyfSearch.translate()...')
    let result
    try {
      result = glyfSearch.translate(fontBuffer)
    } catch (e) {
      console.error('[STEP2] translate() threw:', e.message)
      console.error('[STEP2] stack:', e.stack)
      return res.status(500).json({
        error: 'translate() failed',
        detail: e.message,
      })
    }

    console.log(
      '[DONE] Result keys count:',
      Object.keys(result).length,
    )
    console.log(
      '[DONE] Result (first 10):',
      JSON.stringify(result).substring(0, 200),
    )
    res.json(result)
  } catch (error) {
    console.error('[PANIC] Outer catch:', error.message)
    console.error('[PANIC] stack:', error.stack)
    res
      .status(500)
      .json({
        error: 'Internal server error',
        detail: error.message,
      })
  }
})

app.listen(PORT, 'localhost', () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(
    'glyfHashed entries:',
    Object.keys(glyfSearch._getStats().glyfHashed).length,
  )
  console.log(
    'cmapFiltered entries:',
    Object.keys(glyfSearch._getStats().cmapFiltered).length,
  )
})

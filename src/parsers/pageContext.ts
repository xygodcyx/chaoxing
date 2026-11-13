import type { Locator, Page } from 'playwright'

/** 新版/旧版课程页分布在多个域名下, 统一按 mooc2-ans 还原相对路径 */
export const CHAOXING_FALLBACK_ORIGIN = 'https://mooc2-ans.chaoxing.com'

/**
 * 把相对路径 / 协议相对路径还原成可访问的绝对地址, 认不出来时返回空串
 */
export function toAbsoluteUrl(
  url: string,
  origin = CHAOXING_FALLBACK_ORIGIN,
) {
  if (!url) return ''
  if (url.startsWith('//')) return `https:${url}`
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/')) return `${origin}${url}`
  return ''
}

/** 从地址栏里拿参数, 作为隐藏域的兜底 */
export function readUrlParams(url: string) {
  const result: Record<string, string> = {}
  try {
    new URL(url).searchParams.forEach((value, key) => {
      result[key] = value
    })
  }
  catch {}
  return result
}

/**
 * 读取页面里的隐藏域
 * 新版本课程页里 #courseid / #v 这类隐藏域会同时存在两份,
 * 所以不能直接用 locator.inputValue() (strict mode 会直接抛错), 这里取第一个非空值
 */
export async function readHiddenValues(
  page: Page,
  keys: Array<string>,
) {
  return await page.evaluate((names: Array<string>) => {
    const result: Record<string, string> = {}
    const inputs = Array.from(document.querySelectorAll('input'))
    for (const name of names) {
      for (const input of inputs) {
        if (input.id !== name && input.name !== name) continue
        const value = String((input as HTMLInputElement).value || '')
        if (!value) continue
        result[name] = value
        break
      }
    }
    return result
  }, keys)
}

/**
 * 只等 DOM 就绪 + 固定缓冲
 * 超星页面普遍挂了长轮询, networkidle 基本等不到, 等它只会白等超时
 */
export async function settlePage(page: Page, wait = 1200) {
  try {
    await page.waitForLoadState('domcontentloaded')
  }
  catch {}
  await page.waitForTimeout(wait)
}

/** 轮询等待多个候选选择器中的任意一个出现, 返回命中的选择器 */
export async function waitForAnySelector(
  page: Page,
  selectors: Array<string>,
  timeout = 15000,
) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    for (const selector of selectors) {
      try {
        if ((await page.locator(selector).count()) > 0) {
          return selector
        }
      }
      catch {}
    }
    await page.waitForTimeout(300)
  }
  return ''
}

/** 在不超过 ms 毫秒内统计元素数量, 超时或 frame 尚未就绪都按 0 处理 */
export async function countWithin(loc: Locator, ms = 1500) {
  return Promise.race([
    loc.count().catch(() => 0),
    new Promise<number>((resolve) => {
      setTimeout(() => resolve(0), ms)
    }),
  ])
}

/**
 * 取"任务内容"所在的 iframe
 *
 * 超星页面版本很多, 同一层里挂多个 iframe 的情况并不少见(统计、广告、埋点……),
 * 旧代码直接 `page.frameLocator('iframe')` 会命中多个元素, 把 playwright 的
 * strict mode 撞崩。这里按 DOM 顺序逐个探测, 返回第一个"里面真有目标元素"的
 * iframe; 全都不命中时退回第一个, 与旧行为一致。
 *
 * @param probe 用来判断"这个 frame 才是对的"的选择器, 比如 '#reader' / '.tkTopic'
 */
export async function resolveContentFrameLocator(
  page: Page,
  probe?: string,
) {
  const total = await countWithin(page.locator('iframe'), 5000)
  if (total === 0) return page.frameLocator('iframe')

  const frames = page.frameLocator('iframe')
  if (!probe) return frames.first()

  for (let index = 0; index < total; index++) {
    const candidate = frames.nth(index)
    if ((await countWithin(candidate.locator(probe))) > 0) {
      return candidate
    }
  }
  return frames.first()
}


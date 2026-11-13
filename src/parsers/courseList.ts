import type { Frame, Page } from 'playwright'
import type { CourseItem } from '../types/index'
import { LoggerManager } from '../runtime/LoggerManager'
import {
  readUrlParams,
  toAbsoluteUrl,
} from './pageContext'

interface RawCourseLink {
  href: string
  onclick: string
  title: string
  courseid: string
  clazzid: string
}

const COURSE_ID_RE = /courseid=["']?(\d+)/i
const CLAZZ_ID_RE = /clazzid=["']?(\d+)/i
const CPI_RE = /cpi=["']?(\d+)/i
const URL_IN_TEXT_RE = /https?:\/\/[^'"\s]+/i

/** 只认真正指向课程的地址, 避免把统计 / 作业 / 考试入口当成课程 */
const COURSE_HREF_RE
  = /(?:courseid=\d+)|(?:visit\/cours)|(?:mycourse\/(?:stu|studentcourse))|(?:mycourse\/studentcourse)/i
const IGNORE_HREF_RE
  = /(?:passport|login|visit\/interaction\/|exam-ans|work\/list|knowledge\/cards)/i

/** 课程列表页可能出现的选择器, 只用来判断"列表是否渲染完" */
const COURSE_LIST_SELECTORS = [
  '.course',
  '.course-list',
  '[class*="course-card"]',
  '[class*="courseList"]',
  'li[id^="course"]',
  '[data-courseid]',
  'a[href*="courseid="]',
]

const IFRAME_SELECTORS = [
  'iframe#frame_content[src]',
  'iframe[name="frame_content"][src]',
  'iframe[src*="visit/interaction"]',
  'iframe[src*="visit/courses"]',
  'iframe[src]:not([src=""])',
]

/** 真正是"课程列表"的地址长这样; 个人空间里别的 iframe 未必是课程页 */
const COURSE_PAGE_RE = /visit\/(?:interaction|courses)/i

const MENU_SELECTORS = [
  'div.label-item[name="课程"][dataurl]',
  'div.label-item[name="课程"]',
  'div.label-item[cur="1"]',
  'a[title="课程"][data-url]',
]

/**
 * 从个人空间页里问出"课程列表页"的地址
 *
 * 历届版本的差异:
 * 1. spaceVersion 0/1: 课程列表挂在 #frame_content 这个 iframe 里, 取 iframe 的 src
 * 2. 有些版本 iframe 由 JS 后写入, src 一开始是空的, 所以要轮询
 * 3. 还有版本把地址塞在左侧「课程」菜单的 dataurl / onclick 里
 */
export async function resolveCourseListUrl(page: Page) {
  const deadline = Date.now() + 15000
  // 兜底候选: 命中了 iframe 但地址不太像课程页(比如消息、待办),
  // 先记下来, 等更靠谱的地址出现, 一直不出现再用它
  let fallbackUrl = ''

  while (Date.now() < deadline) {
    for (const selector of IFRAME_SELECTORS) {
      try {
        const iframe = page.locator(selector).first()
        if ((await iframe.count()) === 0) continue
        const url = toAbsoluteUrl(
          (await iframe.getAttribute('src')) || '',
          'https://i.mooc.chaoxing.com',
        )
        if (!url) continue
        if (COURSE_PAGE_RE.test(url)) return url
        if (!fallbackUrl) fallbackUrl = url
      }
      catch {}
    }

    const menuUrl = await readMenuUrl(page)
    if (menuUrl) return menuUrl

    await page.waitForTimeout(300)
  }
  return fallbackUrl
}

async function readMenuUrl(page: Page) {
  for (const selector of MENU_SELECTORS) {
    try {
      const menu = page.locator(selector).first()
      if ((await menu.count()) === 0) continue
      const raw = (await menu.getAttribute('dataurl'))
        || (await menu.getAttribute('data-url'))
        || (await menu.getAttribute('onclick'))
        || ''
      const url = raw.match(URL_IN_TEXT_RE)?.[0] || ''
      if (url.includes('visit/interaction') || url.includes('visit/courses')) {
        return url
      }
    }
    catch {}
  }
  return ''
}

/**
 * 采集课程列表
 *
 * 不依赖某一种版式的类名: 先等一个"像是课程列表"的信号出现,
 * 然后扫描页面上所有指向课程的链接(以及卡片上的 data-courseid),
 * 从地址里还原 courseid / clazzid, 再按这两个字段去重
 */
export async function collectCourses(page: Page) {
  const matched = await waitForCourses(page, 15000)
  LoggerManager.Instance.debug(
    matched
      ? `课程列表版式命中: ${matched}`
      : '课程列表未命中已知选择器, 使用通用扫描',
  )

  // 课程卡片可能在主文档, 也可能挂在外壳的 iframe 里; 全部扫一遍再合并,
  // 只取"第一个有结果的 frame"会漏掉分栏渲染的版本
  const raw: Array<RawCourseLink> = []
  const frames = page.frames()
  for (let i = 0; i < frames.length; i++) {
    const items = await extractCoursesFromFrame(frames[i])
    if (items.length === 0) continue
    raw.push(...items)
    LoggerManager.Instance.debug(
      `在第 ${i + 1}/${frames.length} 个 frame 中扫描到 ${items.length} 个课程链接`,
    )
  }

  const courses = normalizeCourses(raw)
  LoggerManager.Instance.debug(
    `课程列表解析结果: ${courses.map((c) => c.title).join(' | ') || '空'}`,
  )
  return courses
}

async function waitForCourses(page: Page, timeout: number) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    for (const selector of COURSE_LIST_SELECTORS) {
      try {
        if ((await page.locator(selector).count()) > 0) return selector
      }
      catch {}
    }
    await page.waitForTimeout(300)
  }
  return ''
}

async function extractCoursesFromFrame(frame: Frame) {
  try {
    return await frame.evaluate<Array<RawCourseLink>>(() => {
      const result: Array<RawCourseLink> = []
      const nodes = Array.from(
        document.querySelectorAll(
          'a[href], [data-courseid], [data-course-id], [onclick]',
        ),
      )
      for (const node of nodes) {
        const el = node as HTMLElement
        const anchor = (el.tagName === 'A'
          ? el
          : el.querySelector('a[href]')) as HTMLAnchorElement | null
        const href = anchor
          ? anchor.getAttribute('href') || ''
          : el.getAttribute('href') || ''
        const onclick = el.getAttribute('onclick')
          || (anchor ? anchor.getAttribute('onclick') || '' : '')
        const courseid = el.getAttribute('data-courseid')
          || el.getAttribute('data-course-id')
          || ''
        const clazzid = el.getAttribute('data-clazzid')
          || el.getAttribute('data-clazz-id')
          || ''
        if (!href && !onclick && !courseid) continue

        let title = el.getAttribute('data-title') || ''
        if (!title && anchor) title = anchor.getAttribute('title') || ''
        if (!title && anchor) title = anchor.textContent || ''
        if (!title) {
          const titleNode = el.querySelector(
            '.course-name, .courseName, [class*="course-name"], h3, h4',
          )
          if (titleNode) title = titleNode.textContent || ''
        }
        if (!title) title = el.textContent || ''

        result.push({
          href,
          onclick,
          title: title.replace(/\s+/g, ' ').trim().slice(0, 120),
          courseid,
          clazzid,
        })
      }
      return result
    })
  }
  catch {
    return []
  }
}

function normalizeCourses(raw: Array<RawCourseLink>) {
  const seen = new Set<string>()
  const courses: Array<CourseItem> = []

  for (const item of raw) {
    if (item.href && IGNORE_HREF_RE.test(item.href)) continue
    if (item.href && !COURSE_HREF_RE.test(item.href) && !item.courseid) {
      continue
    }
    if (item.onclick && IGNORE_HREF_RE.test(item.onclick)) continue

    const text = `${item.href} ${item.onclick}`
    const courseid = item.courseid || text.match(COURSE_ID_RE)?.[1] || ''
    const clazzid = item.clazzid || text.match(CLAZZ_ID_RE)?.[1] || ''
    const cpi = text.match(CPI_RE)?.[1] || ''

    // 课程入口一定同时带 courseid 和 clazzid, 少一个就说明不是课程链接
    if (!courseid || !clazzid) continue

    const key = `${courseid}-${clazzid}`
    if (seen.has(key)) continue

    const title = item.title.replace(/\s+/g, ' ').trim()
    if (!title) continue

    seen.add(key)
    courses.push({
      title,
      link: resolveCourseLink(item, courseid, clazzid, cpi),
      isFinish: false,
      index: courses.length,
    })
  }

  return courses
}

function resolveCourseLink(
  item: RawCourseLink,
  courseid: string,
  clazzid: string,
  cpi: string,
) {
  const href = item.href.startsWith('http') || item.href.startsWith('//')
    ? toAbsoluteUrl(item.href)
    : item.href.startsWith('/')
      ? toAbsoluteUrl(item.href)
      : ''

  if (href) return href

  const urlInText = `${item.href} ${item.onclick}`.match(URL_IN_TEXT_RE)?.[0]
  if (urlInText && COURSE_HREF_RE.test(urlInText)) return urlInText

  // 只知道课程 id 时的兜底: 新版课程外壳页, 进去之后还能从隐藏域里补 enc
  const search = new URLSearchParams({
    courseid,
    clazzid,
  })
  if (cpi) search.set('cpi', cpi)
  return `https://mooc2-ans.chaoxing.com/mooc2-ans/mycourse/stu?${search.toString()}`
}

/** 部分旧版本把这个地址放在课程列表页自身的链接里, 供外部复用 */
export function parseCourseLinkParams(link: string) {
  return readUrlParams(link)
}

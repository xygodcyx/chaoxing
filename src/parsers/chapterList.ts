import type { Frame, Page } from 'playwright'
import type { TaskItem } from '../types/index'
import { BASE_TASK_URL } from '../consts/index'
import { LoggerManager } from '../runtime/LoggerManager'
import {
  readHiddenValues,
  readUrlParams,
  toAbsoluteUrl,
} from './pageContext'

/** 课程外壳页里能拿到的上下文, 用来拼任务页地址 */
const CONTEXT_KEYS = [
  'courseid',
  'clazzid',
  'cpi',
  'enc',
  'oldenc',
  'v',
  't',
  'ut',
  'stuenc',
]

/** 章节列表可能出现在这些 iframe 里, 按可信度排序 */
const CHAPTER_IFRAME_SELECTORS = [
  'iframe#frame_content-zj[src]',
  'iframe[id^="frame_content"][src]',
  'iframe[name^="frame_content"][src]',
  'iframe[src*="studentcourse"]',
  'iframe[src*="mycourse"]',
  'iframe[src*="knowledge"]',
]

/** 顶部导航里「章节」这一项, 新版本外壳页靠它决定 iframe 的去向 */
const CHAPTER_NAV_SELECTORS = [
  'li[dataname="zj"] a[data-url]',
  'a[title="章节"][data-url]',
  'li[pageheader="1"] a[data-url]',
  'li.curNav a[data-url]',
  'a[data-url*="studentcourse"]',
]

interface RawChapterNode {
  id: string
  cls: string
  href: string
  onclick: string
  knowledgeid: string
  title: string
  text: string
  points: string
}

/**
 * 读取课程上下文
 * 隐藏域优先(能拿到 enc 等地址栏里没有的参数), 地址栏兜底
 */
export async function readCourseContext(page: Page, url: string) {
  const fromUrl = readUrlParams(url)
  const fromDom = await readHiddenValues(page, CONTEXT_KEYS)
  const context: Record<string, string> = {}
  for (const key of CONTEXT_KEYS) {
    context[key] = fromDom[key] || fromUrl[key] || ''
  }
  return context
}

/**
 * 找到「章节列表」所在的页面地址
 *
 * 三套版式的落点:
 * 1. iframe: 新版外壳页把章节树放在 #frame_content-zj 里, 老版本是 #frame_content
 * 2. 导航: 有些版本 iframe 还没写 src, 但「章节」菜单项上挂了 data-url
 * 3. 硬拼: 只剩已知参数时, 自己拼 studentcourse 地址
 */
export async function resolveChapterPageUrl(
  page: Page,
  context: Record<string, string>,
) {
  for (const selector of CHAPTER_IFRAME_SELECTORS) {
    try {
      const iframe = page.locator(selector).first()
      if ((await iframe.count()) === 0) continue
      const url = toAbsoluteUrl((await iframe.getAttribute('src')) || '')
      if (url) {
        LoggerManager.Instance.debug(`章节页面(iframe): ${url}`)
        return url
      }
    }
    catch {}
  }

  for (const selector of CHAPTER_NAV_SELECTORS) {
    try {
      const nav = page.locator(selector).first()
      if ((await nav.count()) === 0) continue
      const base = toAbsoluteUrl(
        (await nav.getAttribute('data-url')) || '',
      )
      if (!base) continue
      const url = withCourseQuery(base, context)
      LoggerManager.Instance.debug(`章节页面(导航): ${url}`)
      return url
    }
    catch {}
  }

  if (!context.courseid || !context.clazzid) return ''
  const url = withCourseQuery(
    'https://mooc2-ans.chaoxing.com/mooc2-ans/mycourse/studentcourse',
    context,
  )
  LoggerManager.Instance.debug(`章节页面(拼接): ${url}`)
  return url
}

/**
 * 在页面(含子 frame)里解析章节任务
 * 新版把章节树塞进 iframe, 所以不能只看主文档
 */
export async function collectChapterTasks(
  page: Page,
  context: Record<string, string>,
) {
  let tasks = await parseChaptersInFrame(page.mainFrame(), context)
  if (tasks.length) return tasks

  const frames = page.frames()
  for (const frame of frames) {
    if (frame === page.mainFrame()) continue
    tasks = await parseChaptersInFrame(frame, context)
    if (tasks.length) {
      LoggerManager.Instance.debug(
        `章节列表来自 iframe: ${frame.url()}`,
      )
      return tasks
    }
  }
  return []
}

function parseChaptersInFrame(
  frame: Frame,
  context: Record<string, string>,
) {
  return extractChapterNodes(frame).then((nodes) => {
    return nodes
      .map((node) => toTask(node, context))
      .filter((task): task is TaskItem => !!task)
      .map((task, index) => ({ ...task, index }))
  })
}

async function extractChapterNodes(frame: Frame) {
  try {
    return await frame.evaluate<Array<RawChapterNode>>(() => {
      const result: Array<RawChapterNode> = []
      const nodes = Array.from(
        document.querySelectorAll(
          [
            '[id^="cur"]',
            '[data-knowledgeid]',
            '[data-knowledge-id]',
            'a[href*="knowledgeid="]',
            '[onclick*="knowledgeid"]',
          ].join(', '),
        ),
      )
      for (const node of nodes) {
        const el = node as HTMLElement
        const titleNode = el.querySelector(
          '.chapter_title, .posCatalog_name, .chapter-name, .catalog_name, .catalogTitle, h3, h4',
        )
        const pointsNode = el.querySelector(
          '.catalog_points_yi, [class*="points"], [class*="jindu"], [class*="progress"]',
        )
        result.push({
          id: el.id || '',
          cls: typeof el.className === 'string' ? el.className : '',
          href: el.getAttribute('href') || '',
          onclick: el.getAttribute('onclick') || '',
          knowledgeid: el.getAttribute('data-knowledgeid')
            || el.getAttribute('data-knowledge-id')
            || '',
          title: el.getAttribute('title')
            || (titleNode ? titleNode.textContent || '' : ''),
          points: pointsNode ? pointsNode.textContent || '' : '',
          text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200),
        })
      }
      return result
    })
  }
  catch {
    return []
  }
}

function toTask(node: RawChapterNode, context: Record<string, string>) {
  const knowledgeid = resolveKnowledgeId(node)
  if (!knowledgeid) return null

  const title = cleanTitle(node.title || node.text)
  if (!title) return null

  const isFinish = resolveIsFinish(node)
  const lessCount = isFinish ? 0 : resolveLessCount(node)

  const searchObj = new URLSearchParams()
  searchObj.append('courseid', context.courseid || '')
  searchObj.append('clazzid', context.clazzid || '')
  searchObj.append('cpi', context.cpi || '')
  searchObj.append('num', '0')
  searchObj.append('v', '2025-0424-1038-4')
  searchObj.append('mooc2', '1')
  searchObj.append('isMicroCourse', 'false')
  searchObj.append('editorPreview', '0')
  searchObj.append('crossId', '')
  // 任务点(cards)要的是外壳页的 oldenc, 也就是章节 iframe 里的 stuenc;
  // 新版外壳把两者分成了 #enc / #oldenc, 旧版只有一个, 所以按老优先回退
  searchObj.append('enc', context.oldenc || context.enc || '')
  searchObj.append('knowledgeid', knowledgeid)

  const task: TaskItem = {
    title,
    link: `${BASE_TASK_URL}?${searchObj.toString()}`,
    searchParams: searchObj.toString(),
    isFinish,
    lessCount: +lessCount,
    knowledgeid,
    index: 0,
  }

  LoggerManager.Instance.debug(`获取 ${task.title} 任务数据成功`)
  return task
}

function resolveKnowledgeId(node: RawChapterNode) {
  const candidates = [
    node.knowledgeid,
    node.id.match(/^cur(\d+)$/i)?.[1] || '',
    node.href.match(/knowledgeid=(\d+)/i)?.[1] || '',
    node.onclick.match(/knowledgeid[='"\s:]+(\d+)/i)?.[1] || '',
    node.text.match(/knowledgeid=(\d+)/i)?.[1] || '',
  ]
  for (const candidate of candidates) {
    // 超星的 knowledgeid 都是长数字, 短数字基本是别的 id
    if (/^\d{5,}$/.test(candidate)) return candidate
  }
  return ''
}

function resolveIsFinish(node: RawChapterNode) {
  const text = `${node.text} ${node.cls}`
  if (/未完成|未学完/.test(text)) return false
  if (/finish|complete|done/i.test(node.cls)) return true
  return /已完成|已学完/.test(node.text)
}

function resolveLessCount(node: RawChapterNode) {
  const points = node.points.replace(/[^\d]/g, '')
  if (points) return +points
  const matched = node.text.match(
    /(\d+)\s*(?:个)?\s*(?:任务点|待学|待完成|未完成)/,
  )
  return matched ? +matched[1] : 0
}

function cleanTitle(raw: string) {
  return raw
    .replace(/\s+/g, ' ')
    .replace(
      /(?:未完成|已完成|已学完|待完成|任务点|学习进度|查看详情|展开|收起)/g,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

function withCourseQuery(
  base: string,
  context: Record<string, string>,
) {
  let url: URL
  try {
    url = new URL(base)
  }
  catch {
    return ''
  }

  const params = url.searchParams
  const values: Record<string, string> = {
    courseid: context.courseid || params.get('courseid') || '',
    clazzid: context.clazzid || params.get('clazzid') || '',
    cpi: context.cpi || params.get('cpi') || '',
    ut: params.get('ut') || context.ut || 's',
    t: params.get('t') || context.t || '',
    stuenc: params.get('stuenc') || context.enc || '',
  }

  for (const key in values) {
    if (values[key]) params.set(key, values[key])
  }

  return url.toString()
}

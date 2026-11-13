import type { Page } from 'playwright'
import { DataManager } from '../runtime/DataManager'
import { LoggerManager } from '../runtime/LoggerManager'
import type { CourseItem, TaskItem } from '../types/index'
import { settlePage } from '../parsers/pageContext'
import {
  collectChapterTasks,
  readCourseContext,
  resolveChapterPageUrl,
} from '../parsers/chapterList'

export async function enterCoursePage(
  page: Page,
  course: CourseItem,
) {
  LoggerManager.Instance.start(
    `进入${course.title} 章节页面, 开始获取任务信息...`,
  )

  const entryUrl = withCourseIndex(course.link)
  LoggerManager.Instance.info(`正在进入网页: ${entryUrl}`)

  await page.goto(entryUrl)
  await settlePage(page, 1200)

  // 课程外壳页里既有 courseid/clazzid/cpi, 也有新旧版才有的 enc
  let context = await readCourseContext(page, entryUrl)

  // 新版外壳页有时把章节树直接渲染在当前文档, 有时在 iframe 里
  let tasks = await collectChapterTasks(page, context)

  if (tasks.length === 0) {
    const chapterUrl = await resolveChapterPageUrl(page, context)
    if (chapterUrl) {
      LoggerManager.Instance.info(`正在进入网页: ${chapterUrl}`)
      await page.goto(chapterUrl)
      await settlePage(page, 1500)

      // 章节页可能带来更完整的上下文(比如 enc 在外壳页里是空值)
      context = {
        ...context,
        ...(await readCourseContext(page, chapterUrl)),
      }
      tasks = await collectChapterTasks(page, context)
    }
  }

  if (tasks.length === 0) {
    LoggerManager.Instance.warn(
      `没有解析到 ${course.title} 的章节任务, 当前页面: ${page.url()}`,
    )
    return []
  }

  LoggerManager.Instance.success(
    `获取${course.title} 章节任务信息成功!`,
  )

  return tasks
}

/**
 * 旧版课程入口是 /visit/cours/xxx?pageHeader=n 这种分页形式,
 * 一个课程外壳页里可能挂着多门课, 需要把 pageHeader 改到当前课程
 * 新版的 mycourse 外壳不带这个分页, 改了反而会 404
 */
function withCourseIndex(link: string) {
  if (!/visit\/cours/i.test(link)) return link
  try {
    const url = new URL(link)
    url.searchParams.set(
      'pageHeader',
      (DataManager.Instance.courseIndex - 1).toString(),
    )
    return url.toString()
  }
  catch {
    return link
  }
}

import type { Page } from 'playwright'
import { DataManager } from '../runtime/DataManager'
import type { TaskItem } from '../types/index'
import { BASE_TASK_URL } from '../consts/index'
import EventManager from '../runtime/EventManager'
import { EVENTS_ENUM } from '../enum/index'
import { LoggerManager } from '../runtime/LoggerManager'
import { execVideoTask } from './tasks/videoTask'
import { execReadTask } from './tasks/readTask'
import { execChapterTestTask } from './tasks/chapterTestTask'
import { safeCallFunc } from '../utils'

export async function enterTaskPage(
  page: Page,
  task: TaskItem,
) {
  DataManager.Instance.globalTaskLink = task.link

  if (true && task.isFinish) {
    LoggerManager.Instance.info(
      `${task.title} 已完成, 跳过`,
    )
    EventManager.Instance.emit(EVENTS_ENUM.TASK_DONE, task)
    return
  }

  LoggerManager.Instance.start(
    `进入特定章节: ${task.title} 开始刷课...`,
  )

  await page.goto(task.link)

  await page.waitForLoadState('domcontentloaded')

  const searchObj = new URLSearchParams(task.searchParams)
  let pageTitle = await page.title()

  /**
   * 首次进入第一个页面的几种情况
   * 1.学习目标, 直接跳过（一般是混在很多任务点中的第一个任务点, 所以要num + 1进到下一个任务点）
   * 2.阅读页面, 点击后等待几秒直接跳过（一般是独立的一个任务点）
   * 3.问卷调查, 直接跳过（一般是独立的一个任务点）
   */
  if (pageTitle === '学习目标') {
    LoggerManager.Instance.info(
      '当前页面为学习目标页, 直接跳过',
    )
    searchObj.set('num', '1')
    await page.goto(
      `${BASE_TASK_URL}?${searchObj.toString()}`,
    )
    await page.waitForLoadState('domcontentloaded')
  } else if (
    pageTitle === '问卷调查' ||
    task.title === '问卷调查'
  ) {
    LoggerManager.Instance.info(
      '当前页面为问卷调查, 似乎已经到了最后一个任务点, 任务结束',
    )
    EventManager.Instance.emit(EVENTS_ENUM.TASK_DONE, task)
    return
  } else if (
    task.title === '阅读' ||
    task.title === '文档' ||
    pageTitle === '文档'
  ) {
    await safeCallFunc(
      async () => await execReadTask(page, task),
      {
        message: '执行 阅读任务 时失败',
      },
    )
    return
  }

  pageTitle = await page.title()

  const runVideoTask = async () => {
    await safeCallFunc(
      async () =>
        await execVideoTask(page, task, searchObj),
      {
        message: `执行 ${task.title} 时失败, 页面地址: ${page.url()}`,
        isTask: true,
        silent: true,
      },
    )
  }

  const runQuizTask = async () => {
    await safeCallFunc(
      async () => await execChapterTestTask(page, task),
      {
        message: `执行 ${task.title} 时失败, 页面地址: ${page.url()}`,
      },
    )
  }

  const runReadTask = async () => {
    await safeCallFunc(
      async () => await execReadTask(page, task),
      {
        message: '执行 阅读任务 时失败',
      },
    )
  }

  // 如果第一个任务是学习目标页, 那么就会自动跳过从而进入到这里; 如果第一个就是视频页, 那也会进入到这里
  const isQuizTitle = /测验|作业|考试/.test(pageTitle)
    || /测验|作业|考试/.test(task.title)

  if (
    pageTitle === '视频'
    || pageTitle === '课程'
    || pageTitle === ''
  ) {
    await runVideoTask()
    return
  }

  if (isQuizTitle) {
    await runQuizTask()
    return
  }

  // 标题对不上时(新版页面标题五花八门), 用页面结构兜底判断任务类型
  const kind = await detectTaskKindByDom(page)
  if (kind === 'test') {
    await runQuizTask()
    return
  }
  if (kind === 'video') {
    await runVideoTask()
    return
  }
  if (kind === 'read') {
    await runReadTask()
    return
  }

  LoggerManager.Instance.warn(
    `未知页面: ${pageTitle} , 跳过该任务请手动前往页面进行debug: ${page.url()}`,
  )
  EventManager.Instance.emit(EVENTS_ENUM.TASK_DONE, task)
}

/** 在任意一层 frame 里找元素, 任务内容基本都在 iframe 里 */
async function anyFrameHas(page: Page, selector: string) {
  for (const frame of page.frames()) {
    try {
      if ((await frame.locator(selector).count()) > 0) return true
    }
    catch {
      // frame 正在导航 / 已销毁, 当作没有
    }
  }
  return false
}

/** 页面标题不可靠时, 靠 DOM 结构猜这个任务点是什么类型 */
async function detectTaskKindByDom(page: Page) {
  // 播放器: 老皮肤 #reader, 新皮肤原生 video / videojs
  if (
    await anyFrameHas(
      page,
      '#reader, video, .vjs-tech, .ans-videoquiz-opt',
    )
  ) {
    return 'video'
  }
  // 测验 / 作业: 题目节点
  if (
    await anyFrameHas(
      page,
      '.singleQuesId, .questionLi, #ZyBottom, .newTestType',
    )
  ) {
    return 'test'
  }
  if (
    await anyFrameHas(
      page,
      '.docReader, #docReader, iframe[src*="document"]',
    )
  ) {
    return 'read'
  }
  return ''
}

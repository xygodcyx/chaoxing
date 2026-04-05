import type { Page } from 'playwright'
import { DataManager } from '../runtime/DataManager'
import type { TaskItem } from '../types/index'
import { BASE_TASK_URL } from '../consts/index'
import EventManager from '../runtime/EventManager'
import { EVENTS_ENUM } from '../enum/index'
import { LoggerManager } from '../runtime/LoggerManager'
import { execVideoTask } from './tasks/videoTask'
import { execReadTask } from './tasks/readTask'
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

  // 如果第一个任务点是学习目标页, 那么就会自动跳过从而进入到这里, 如果第一个就是视频页, 那也会进入到这里
  if (
    pageTitle === '视频' ||
    pageTitle === '课程' ||
    pageTitle === ''
  ) {
    await safeCallFunc(
      async () =>
        await execVideoTask(page, task, searchObj),
      {
        message: `执行 ${task.title} 时失败, 页面地址: ${page.url()}`,
        isTask: true,
        silent: true,
      },
    )
  } else {
    const pageTitle = await page.title()
    const pageUrl = page.url()
    LoggerManager.Instance.warn(
      `未知页面: ${pageTitle} , 跳过该任务请手动前往页面进行debug: ${pageUrl}`,
    )
    EventManager.Instance.emit(EVENTS_ENUM.TASK_DONE, task)
    return
  }
}

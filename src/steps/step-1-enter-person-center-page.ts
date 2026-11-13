import {
  intro,
  outro,
  isCancel,
  cancel,
  multiselect,
} from '@clack/prompts'

import type { Page } from 'playwright'
import type { CourseItem } from '../types/index'
import { LoggerManager } from '../runtime/LoggerManager'
import { DataManager } from '../runtime/DataManager'
import {
  collectCourses,
  resolveCourseListUrl,
} from '../parsers/courseList'
import { settlePage } from '../parsers/pageContext'

export async function enterPersonCenter(page: Page) {
  LoggerManager.Instance.start(
    `进入个人中心页面, 开始获取课程信息...`,
  )

  await page.goto('https://i.mooc.chaoxing.com/space/index')
  await page.waitForLoadState('domcontentloaded')

  // 课程列表的入口地址在不同 spaceVersion 下位置不同,
  // 统一交给 resolveCourseListUrl 去找
  const courseListUrl = await resolveCourseListUrl(page)

  if (!courseListUrl) {
    LoggerManager.Instance.error(
      `没有找到课程列表入口, 获取课程失败...`,
    )
    return []
  }

  LoggerManager.Instance.debug(`课程列表页面: ${courseListUrl}`)

  await page.goto(courseListUrl)
  await settlePage(page, 1500)

  const isOldVersion = page
    .url()
    .includes('mooc1-2.chaoxing.com/visit/courses/study')
  if (isOldVersion) {
    LoggerManager.Instance.warn(
      '当前页面为旧版本, 进入新版本页面执行任务',
    )
    const newVersionUrl = page
      .url()
      .replace(
        'mooc1-2.chaoxing.com/visit/courses/study',
        'mooc2-ans.chaoxing.com/mooc2-ans/visit/interaction',
      )
    await page.goto(newVersionUrl)
    await settlePage(page, 1500)
  }

  const courses = await collectCourses(page)

  if (courses.length === 0) {
    LoggerManager.Instance.error(
      `课程列表解析失败, 当前页面: ${page.url()}`,
    )
    return []
  }

  const options = courses.map((c) => {
    return {
      value: c,
      label: c.title,
    }
  })

  const initialCourse = courses.find(
    (item) =>
      item.title ===
      DataManager.Instance.userStatus.curCourseName,
  )
  intro(`选课`)
  // Do stuff
  const additionalCourses = await multiselect<CourseItem>({
    message: '选择要刷的课程',
    initialValues: initialCourse ? [initialCourse] : [],
    options,
    required: true,
  })

  if (isCancel(additionalCourses)) {
    cancel('取消选课')
    process.exit(0)
  }

  outro(
    `选好啦 : ${additionalCourses.map((ac) => ac?.title)}`,
  )
  LoggerManager.Instance.success(`获取课程成功!`)
  return additionalCourses
}

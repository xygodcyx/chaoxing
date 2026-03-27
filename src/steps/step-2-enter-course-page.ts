import type { Locator, Page } from 'playwright';
import { DataManager } from '../runtime/DataManager';
import { getHiddenInputValue } from '../utils/index';
import { BASE_URL, BASE_TASK_URL } from '../consts/index';
import type { CourseItem, TaskItem } from '../types/index';
import { LoggerManager } from '../runtime/LoggerManager';

export async function enterCoursePage(
  page: Page,
  course: CourseItem,
) {
  LoggerManager.Instance.start(
    `进入${course.title} 章节页面, 开始获取任务信息...`,
  );

  await page.goto(course.link);

  await page.waitForLoadState('domcontentloaded');

  // clazzid=138708887&courseid=260244521&knowledgeid=705052636&num=0&ut=s&cpi=514792978&v=2025-0424-1038-4&mooc2=1&isMicroCourse=false&editorPreview=0&crossId"
  const curCourseContext: Record<string, string> = {};
  curCourseContext.courseid = await getHiddenInputValue(
    page,
    'courseid',
    'courseid',
  );
  curCourseContext.clazzid = await getHiddenInputValue(
    page,
    'clazzid',
    'clazzid',
  );
  curCourseContext.cpi = await getHiddenInputValue(
    page,
    'cpi',
    'cpi',
  );

  curCourseContext.num = '0'; // 任务点索引
  curCourseContext.v = '2025-0424-1038-4';
  curCourseContext.mooc2 = '1';
  curCourseContext.isMicroCourse = 'false';
  curCourseContext.editorPreview = '0';
  curCourseContext.crossId = '';

  const targetCourseUrl =
    (await page.locator('iframe').getAttribute('src')) ||
    '';

  await page.goto(BASE_URL + targetCourseUrl);

  await page.waitForLoadState('domcontentloaded');

  curCourseContext.enc = await getHiddenInputValue(
    page,
    'enc',
  );

  const allChapterItems = await page
    .locator('.chapter_item')
    .all();

  const tasks: Array<TaskItem> = [];

  for (const chapterItem of allChapterItems) {
    const title = await chapterItem.getAttribute('title');
    if (!title) {
      continue;
    }

    // 二级按钮
    curCourseContext.title = title;

    const id = (await chapterItem.getAttribute('id')) || '';
    const knowledgeid = id.slice(3);

    curCourseContext.knowledgeid = knowledgeid;

    const searchObj = new URLSearchParams();

    for (const key in curCourseContext) {
      if (key === 'title') continue;
      searchObj.append(key, curCourseContext[key]);
    }

    const finishedCount = await chapterItem
      .getByText('已完成')
      .count();

    const isFinish = finishedCount !== 0;

    const hasLessCount = await chapterItem
      .locator('.catalog_points_yi')
      .count();

    let lessCount = 0;

    if (hasLessCount > 0) {
      const temp = await chapterItem
        .locator('.catalog_points_yi')
        .innerText();
      lessCount = +temp;
    }

    const task: TaskItem = {
      title,
      link: `${BASE_TASK_URL}?${searchObj.toString()}`,
      searchParams: searchObj.toString(),
      isFinish,
      lessCount: isFinish ? 0 : +lessCount,
      knowledgeid,
      index: -1,
    };

    tasks.push(task);
  }

  for (let i = 0; i < tasks.length; i++) {
    tasks[i].index = i;
  }

  LoggerManager.Instance.success(
    `获取${course.title} 章节任务信息成功!`,
  );

  return tasks;
}

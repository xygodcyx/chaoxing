import type { Locator, Page } from 'playwright';
import { DataManager } from '../runtime/DataManager.ts';
import { getHiddenInputValue } from '../../utils/index.ts';
import {
  BASE_URL,
  BASE_TASK_URL,
} from '../consts/index.ts';
export interface TaskItem {
  title: string;
  link: string;
  isFinish: boolean;
  lessCount: number;
  knowledgeid: string;
  searchParams: string;
  index: number;
}
export async function enterCoursePage(
  page: Page,
  course: Locator,
  options: {
    timeout?: number;
    waitForIframe?: boolean;
    waitForNetwork?: boolean;
  } = {
    timeout: 30000,
    waitForIframe: true,
    waitForNetwork: false,
  },
) {
  console.log('正在进入国学智慧课程页面...');

  const coursePageUrl = await course.getAttribute('href');

  await page.goto(coursePageUrl!);
  await page.waitForLoadState('domcontentloaded');

  DataManager.Instance.curTaskCourseName =
    await page.title();

  const curChapterContext: Record<string, string> = {};
  // clazzid=138708887&courseid=260244521&knowledgeid=705052636&num=0&ut=s&cpi=514792978&v=2025-0424-1038-4&mooc2=1&isMicroCourse=false&editorPreview=0&crossId"
  curChapterContext.courseid = await getHiddenInputValue(
    page,
    'courseid',
    'courseid',
  );
  curChapterContext.clazzid = await getHiddenInputValue(
    page,
    'clazzid',
    'clazzid',
  );
  curChapterContext.cpi = await getHiddenInputValue(
    page,
    'cpi',
    'cpi',
  );

  curChapterContext.num = '0'; // 任务点索引

  curChapterContext.v = '2025-0424-1038-4';
  curChapterContext.mooc2 = '1';
  curChapterContext.isMicroCourse = 'false';
  curChapterContext.editorPreview = '0';
  curChapterContext.crossId = '';

  const targetCourseUrl =
    (await page.locator('iframe').getAttribute('src')) ||
    '';

  await page.goto(BASE_URL + targetCourseUrl);

  await page.waitForLoadState('domcontentloaded');

  console.info('✅已进入国学智慧页面');

  curChapterContext.enc = await getHiddenInputValue(
    page,
    'enc',
  );

  const allChapterItems = await page
    .locator('.chapter_item')
    .all();

  const tasks: Array<TaskItem> = [];

  for (const chapterItem of allChapterItems) {
    const title = await chapterItem.getAttribute('title');
    if (title) {
      // 二级按钮
      curChapterContext.title = title;

      const id =
        (await chapterItem.getAttribute('id')) || '';
      const knowledgeid = id.slice(3);

      curChapterContext.knowledgeid = knowledgeid;

      const searchObj = new URLSearchParams();

      for (const key in curChapterContext) {
        if (key === 'title') continue;
        searchObj.append(key, curChapterContext[key]);
      }

      const count = await chapterItem
        .getByText('已完成')
        .count();

      const task: TaskItem = {
        title,
        link: `${BASE_TASK_URL}?${searchObj.toString()}`,
        searchParams: searchObj.toString(),
        isFinish: count !== 0,
        lessCount: 2,
        knowledgeid,
        index: -1,
      };

      tasks.push(task);
    }
  }

  for (let i = 0; i < tasks.length; i++) {
    tasks[i].index = i;
  }
  return tasks;
}

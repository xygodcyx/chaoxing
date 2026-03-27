import {
  intro,
  outro,
  isCancel,
  cancel,
  multiselect,
} from '@clack/prompts';

import type { Page } from 'playwright';
import type { CourseItem } from '../types/index';
import { LoggerManager } from '../runtime/LoggerManager';
import { DataManager } from '../runtime/DataManager';

export async function enterPersonCenter(page: Page) {
  LoggerManager.Instance.start(
    `进入个人中心页面，开始获取课程信息...`,
  );

  await page.goto(
    'https://i.mooc.chaoxing.com/space/index',
  );

  await page.waitForLoadState('domcontentloaded');

  const iframe = await page.waitForSelector('iframe');
  if (!iframe) {
    LoggerManager.Instance.error(`获取课程失败...`);
    return [];
  }
  const frame = await iframe.contentFrame();
  if (!frame) {
    LoggerManager.Instance.error(`获取课程失败...`);
    return [];
  }

  await frame.waitForLoadState('domcontentloaded');

  const newUrl = (await iframe?.getAttribute('src')) || '';

  await page.goto(newUrl);

  await page.waitForLoadState('domcontentloaded');

  const isOldVersion = page
    .url()
    .includes('mooc1-2.chaoxing.com/visit/courses/study');
  if (isOldVersion) {
    LoggerManager.Instance.warn(
      '当前页面为旧版本，进入新版本页面执行任务',
    );
    const newVersionUrl = page
      .url()
      .replace(
        'mooc1-2.chaoxing.com/visit/courses/study',
        'mooc2-ans.chaoxing.com/mooc2-ans/visit/interaction',
      );
    await page.goto(newVersionUrl);
    await page.waitForLoadState('domcontentloaded');
  }

  await page.waitForSelector('#courseList');

  const coursesLoc = await page.locator('.course').all();

  const courses: Array<CourseItem> = [];
  let index = 0;
  for (const courseLoc of coursesLoc) {
    const title =
      (await courseLoc
        .locator('.course-name')
        .textContent()) || '';

    const link =
      (await courseLoc
        .locator('.color1')
        .getAttribute('href')) || '';

    const barCount = await courseLoc
      .locator('.bar-tip')
      .count();

    let bar = '0%';

    if (barCount > 0) {
      bar =
        (
          await courseLoc.locator('.bar-tip').textContent()
        )?.trim() || '0%';
      LoggerManager.Instance.info(
        ` ${title} 课程完成进度: ${bar} `,
      );
    }

    const course: CourseItem = {
      title,
      link,
      isFinish: +bar.slice(0, -1) === 100,
      index,
    };

    courses.push(course);

    index++;
  }

  const options = courses.map(c => {
    return {
      value: c,
      label: c.title,
    };
  });

  const initialCourse = courses.find(
    item =>
      item.title ===
      DataManager.Instance.userStatus.curCourseName,
  );
  intro(`选课`);
  // Do stuff
  const additionalCourses = await multiselect({
    message: '选择要刷的课程',
    initialValues: [initialCourse],
    options,
    required: true,
  });

  if (isCancel(additionalCourses)) {
    cancel('取消选课');
    process.exit(0);
  }

  outro(
    `选好啦 : ${additionalCourses.map(ac => ac?.title)}`,
  );
  LoggerManager.Instance.success(`获取课程成功!`);
  return additionalCourses;
}

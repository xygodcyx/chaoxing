import type { Page } from 'playwright';
import type { CourseItem } from '../types/index.ts';
import { LoggerManager } from '../logs/LoggerManager.ts';

export async function enterPersonCenter(
  page: Page,
  options: {
    timeout?: number;
  } = {
    timeout: 30000,
  },
) {
  const { timeout } = options;

  LoggerManager.Instance.start(
    `进入个人中心页面，开始获取课程信息...`,
  );

  await page.goto(
    'https://i.mooc.chaoxing.com/space/index',
  );

  await page.waitForLoadState('domcontentloaded', {
    timeout,
  });

  const iframe = await page.waitForSelector('iframe', {
    timeout,
  });
  if (!iframe) {
    LoggerManager.Instance.error(`获取课程失败...`);
    return [];
  }
  const frame = await iframe.contentFrame();
  if (!frame) {
    LoggerManager.Instance.error(`获取课程失败...`);
    return [];
  }
  await frame.waitForLoadState('domcontentloaded', {
    timeout,
  });
  const newUrl = (await iframe?.getAttribute('src')) || '';

  await page.goto(newUrl);

  await page.waitForLoadState('domcontentloaded');

  await page.waitForSelector('#courseList');

  const coursesLoc = await page.locator('.course').all();

  const courses: Array<CourseItem> = [];
  let index = 0;
  for (const courseLoc of coursesLoc.slice(0, 2)) {
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
  LoggerManager.Instance.success(`获取课程成功!`);
  return courses;
}

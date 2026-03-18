import fs from 'fs';
import { chromium } from 'playwright';

import { enterPersonCenter } from './tasks/step-1-enter-person-center.ts';
import { enterCoursePage } from './tasks/step-2-enter-course-page.ts';
import type { TaskItem } from './tasks/step-2-enter-course-page.ts';

import { saveAuthState } from './tasks/step-0-login.ts';
import { AUTH_FILE_BASE_PATH } from './consts/index.ts';
import { enterTaskPage } from './tasks/step-3-enter-task-page.ts';

import config from './config/index.ts';
import EventManager from './runtime/EventManager.ts';

import { EVENTS } from './enum/index.ts';
import { DataManager } from './runtime/DataManager.ts';

async function runWithPersistentSession(phone: string) {
  // 所操作的页面都不是iframe，都是直连的page

  const browser = await chromium.launch(config);

  const authPath = `${AUTH_FILE_BASE_PATH}/user-${phone}.json`;

  if (!fs.existsSync(authPath)) {
    await saveAuthState(phone);
  }

  const context = await browser.newContext({
    storageState: authPath,
  });

  DataManager.Instance.page = await context.newPage();

  // 进入个人中心
  const courses = await enterPersonCenter(
    DataManager.Instance.page,
  );
  // 进入特定的课程页面

  EventManager.Instance.on(EVENTS.TASK_DONE, onTaskDone);

  DataManager.Instance.taskItems = await enterCoursePage(
    DataManager.Instance.page,
    courses[0],
  );

  const { taskItems } = DataManager.Instance;

  if (taskItems.length === 0) {
    console.log('没有任务要被执行');
    return;
  }

  enterTaskPage(
    DataManager.Instance.page,
    DataManager.Instance.taskItems[0],
  );

  // browser.close();
}

function onTaskDone(task: TaskItem) {
  const { page, taskItems } = DataManager.Instance;
  console.log('已经完成的任务信息：', task);
  if (task.index === taskItems.length - 1) {
    console.info(
      '当前课程的任务全部刷完啦，开始刷下一个课程咯',
    );
    return;
  }
  if (!page) {
    return;
  }
  enterTaskPage(page, taskItems[task.index + 1]);
}

runWithPersistentSession('13145495910');

import fs from 'fs';
import { chromium } from 'playwright';

import { enterPersonCenter } from './tasks/step-1-enter-person-center-page.ts';
import { enterCoursePage } from './tasks/step-2-enter-course-page.ts';
import type {
  CourseItem,
  TaskItem,
} from './types/index.ts';

import { enterLoginPage } from './tasks/step-0-enter-login-page.ts';
import { AUTH_FILE_BASE_PATH } from './consts/index.ts';
import { enterTaskPage } from './tasks/step-3-enter-task-page.ts';

import config from './config/index.ts';
import EventManager from './runtime/EventManager.ts';

import { EVENTS_ENUM } from './enum/index.ts';
import { DataManager } from './runtime/DataManager.ts';
import { LoggerManager } from './logs/LoggerManager.ts';

async function runWithPersistentSession(phone: string) {
  // 所操作的页面都不是iframe，都是直连的page

  EventManager.Instance.on(
    EVENTS_ENUM.TASK_DONE,
    onTaskDone,
  );

  EventManager.Instance.on(
    EVENTS_ENUM.COURSE_DOWN,
    onCourseDone,
  );

  const browser = await chromium.launch(config);

  const authPath = `${AUTH_FILE_BASE_PATH}/user-${phone}.json`;

  if (!fs.existsSync(authPath)) {
    await enterLoginPage(phone);
  }

  const context = await browser.newContext({
    storageState: authPath,
  });

  DataManager.Instance.page = await context.newPage();

  // 进入个人中心
  DataManager.Instance.courses = await enterPersonCenter(
    DataManager.Instance.page,
  );

  if (DataManager.Instance.courses.length === 0) {
    LoggerManager.Instance.warn('没有课程要刷');
    return;
  }

  // 进入特定的课程页面

  DataManager.Instance.curCourse =
    DataManager.Instance.courses[0];

  DataManager.Instance.tasks = await enterCoursePage(
    DataManager.Instance.page,
    DataManager.Instance.curCourse,
  );

  if (DataManager.Instance.tasks.length === 0) {
    LoggerManager.Instance.warn('没有任务要被执行');
    return;
  }
  DataManager.Instance.curTask =
    DataManager.Instance.tasks[0];

  enterTaskPage(
    DataManager.Instance.page,
    DataManager.Instance.curTask,
  );

  // browser.close();
}

function onTaskDone(task: TaskItem) {
  const { page, tasks, curCourse } = DataManager.Instance;
  LoggerManager.Instance.success(
    `已经完成的任务： ${curCourse?.title}(${task.index}) - ${task.title}(${task.index})`,
  );
  if (task.index === tasks.length - 1) {
    LoggerManager.Instance.success(
      '当前课程的任务全部刷完啦，开始刷下一个课程咯',
    );
    EventManager.Instance.emit(EVENTS_ENUM.COURSE_DOWN);
    return;
  }
  if (!page) {
    LoggerManager.Instance.error(
      '浏览器网页实例丢失，请检查错误...',
    );
    return;
  }
  enterTaskPage(page, tasks[task.index + 1]);
}

function onCourseDone(course: CourseItem) {
  const { page, courses, curCourse } = DataManager.Instance;
  LoggerManager.Instance.success(
    `已经完成的课程： ${curCourse?.title}(${course.index}) - ${course.title}(${course.index})`,
  );
  if (course.index === courses.length - 1) {
    LoggerManager.Instance.success(
      '所有课程全部刷完啦！！！',
    );
    EventManager.Instance.emit(EVENTS_ENUM.COURSE_DOWN);
    return;
  }
  if (!page) {
    LoggerManager.Instance.error(
      '浏览器网页实例丢失，请检查错误...',
    );
    return;
  }
  enterCoursePage(page, courses[course.index + 1]);
}

runWithPersistentSession('13145495910');

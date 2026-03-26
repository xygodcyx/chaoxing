import fs from 'fs';
import path from 'path';
import type { Browser, Page } from 'playwright';

import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';

import { enterPersonCenter } from '../steps/step-1-enter-person-center-page';
import { enterCoursePage } from '../steps/step-2-enter-course-page';
import type {
  CourseItem,
  TaskItem,
  UserStatus,
} from '../types/index';

import {
  BASE_TASK_URL,
  CHAOXING_DIR_URL,
} from '../consts/index';
import { enterTaskPage } from '../steps/step-3-enter-task-page';

import EventManager from '../runtime/EventManager';

import { CACHE_KEY_ENUM, EVENTS_ENUM } from '../enum/index';
import { DataManager } from '../runtime/DataManager';
import { LoggerManager } from '../runtime/LoggerManager';
import { CacheManager } from '../runtime/CacheManager';
import { ConfigManager } from '../runtime/ConfigManager';
import { execChapterTestTask } from '../steps/tasks/chapterTestTask';

export default class Action {
  public user: UserStatus;

  public browser!: Browser;
  public page!: Page;

  public courses: Array<CourseItem> = [];
  public curCourse!: CourseItem;

  public tasks: Array<TaskItem> = [];
  public curTask!: TaskItem;

  constructor(user: UserStatus) {
    this.user = user;
  }

  async init() {
    EventManager.Instance.on(
      EVENTS_ENUM.VIDEO_DONE,
      this.onVideoTaskDone,
    );

    EventManager.Instance.on(
      EVENTS_ENUM.TASK_DONE,
      this.onTaskDone,
      this,
    );

    EventManager.Instance.on(
      EVENTS_ENUM.COURSE_DOWN,
      this.onCourseDone,
      this,
    );
    const {
      info: { phone },
    } = this.user;

    const authPath = path.resolve(
      `${CHAOXING_DIR_URL}`,
      phone,
      'auth',
      'user.json',
    );

    if (!fs.existsSync(authPath)) {
      LoggerManager.Instance.error(
        '请先运行 "chaoxing login" 进行登录',
      );
      return;
    }

    chromium.use(stealth());

    this.browser = await chromium.launch(
      ConfigManager.Instance.launchOption,
    );

    const context = await this.browser.newContext({
      storageState: authPath,
    });

    this.page = await context.newPage();

    // 进入个人中心
    this.courses = CacheManager.Instance.load<
      Array<CourseItem>
    >(`${CACHE_KEY_ENUM.COURSES}`, []);
    if (this.courses.length === 0) {
      this.courses = await enterPersonCenter(this.page);
      CacheManager.Instance.save(
        `${CACHE_KEY_ENUM.COURSES}`,
        this.courses,
      );
    }

    if (this.courses.length === 0) {
      LoggerManager.Instance.warn('没有课程要刷');
      return;
    }

    // 进入特定的课程页面

    this.curCourse =
      this.courses.find(
        c => c.title === this.user.curCourseName,
      ) || this.courses[0];

    this.updateCurCourseState();

    this.tasks = CacheManager.Instance.load<
      Array<TaskItem>
    >(
      `${CACHE_KEY_ENUM.TASKS}-${this.user.curCourseName}`,
      [],
    );

    if (this.tasks.length === 0) {
      this.tasks = await enterCoursePage(
        this.page,
        this.curCourse,
      );
      CacheManager.Instance.save(
        `${CACHE_KEY_ENUM.TASKS}-${this.user.curCourseName}`,
        this.tasks,
      );
    }

    if (this.tasks.length === 0) {
      LoggerManager.Instance.warn('没有任务要被执行');
      return;
    }

    this.curTask =
      this.tasks.find(
        c => c.title === this.user.curTaskName,
      ) || this.tasks[0];

    await this.updateCurTaskState();

    enterTaskPage(this.page, this.curTask);
  }

  async startCourseTask(
    page: Page,
    course: CourseItem,
    task?: TaskItem,
  ) {
    this.tasks = await enterCoursePage(page, course);
    CacheManager.Instance.save(
      `${CACHE_KEY_ENUM.TASKS}-${this.user.curCourseName}`,
      this.tasks,
    );
    if (this.tasks.length === 0) {
      LoggerManager.Instance.warn('没有任务要被执行');
      return;
    }
    this.curTask = task || this.tasks[0];
    enterTaskPage(page, this.curTask);
  }

  async onVideoTaskDone(
    page: Page,
    task: TaskItem,
    searchObj: URLSearchParams,
  ) {
    const curNum: number = +searchObj.get('num')!;
    searchObj.set('num', String(curNum + 1));
    await page.goto(
      `${BASE_TASK_URL}?${searchObj.toString()}`,
    );
    await page.waitForLoadState('domcontentloaded');
    const pageTitle = await page.title();
    if (pageTitle === '章节测验') {
      await execChapterTestTask(page, task);
    }
  }

  onTaskDone(task: TaskItem) {
    const { page, tasks, curCourse } = this;
    LoggerManager.Instance.success(
      `已经完成的任务： ${curCourse.title}(${curCourse.index + 1}) - ${task.title}(${task.index + 1})`,
    );
    if (task.index === tasks.length - 1) {
      LoggerManager.Instance.box(
        ` ${this.curCourse?.title} 的任务全部刷完啦`,
      );
      EventManager.Instance.emit(
        EVENTS_ENUM.COURSE_DOWN,
        this.curCourse,
      );
      return;
    }
    if (!page) {
      LoggerManager.Instance.error(
        '浏览器页面实例丢失，请检查错误...',
      );
      return;
    }
    this.curTask = tasks[task.index + 1];

    this.updateCurTaskState();

    enterTaskPage(page, this.curTask);
  }

  onCourseDone(course: CourseItem) {
    const { browser, page, courses } = this;

    LoggerManager.Instance.success(
      `已经完成的课程： ${course.title}(${course.index + 1})`,
    );
    if (course.index === courses.length - 1) {
      LoggerManager.Instance.success(
        '所有课程全部刷完啦！！！关闭浏览器',
      );
      browser?.close();
      return;
    }
    if (!page) {
      LoggerManager.Instance.error(
        '浏览器页面实例丢失，请检查错误...',
      );
      return;
    }
    this.curCourse = courses[course.index + 1];

    this.updateCurCourseState();

    this.startCourseTask(page, this.curCourse);
  }

  async updateCurCourseState() {
    this.user.curCourseName = this.curCourse?.title;

    DataManager.Instance.userStatus.curCourseName =
      this.curCourse?.title;

    await CacheManager.Instance.save(
      `${CACHE_KEY_ENUM.USER_STATUS}`,
      DataManager.Instance.userStatus,
    );
  }

  async updateCurTaskState() {
    this.user.curTaskName = this.curTask?.title;

    DataManager.Instance.userStatus.curTaskName =
      this.curTask?.title;

    await CacheManager.Instance.save(
      `${CACHE_KEY_ENUM.USER_STATUS}`,
      DataManager.Instance.userStatus,
    );
  }
}

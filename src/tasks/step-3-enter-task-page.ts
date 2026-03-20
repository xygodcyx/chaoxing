import cliProgress from 'cli-progress';
import colors from 'ansi-colors';

import type { Page } from 'playwright';
import { DataManager } from '../runtime/DataManager.ts';
import {
  waitForRandomTime,
  waitForTime,
} from '../utils/index.ts';
import type { TaskItem } from '../types/index.ts';
import {
  BASE_READ_URL,
  BASE_TASK_URL,
} from '../consts/index.ts';
import EventManager from '../runtime/EventManager.ts';
import { EVENTS_ENUM } from '../enum/index.ts';
import { LoggerManager } from '../logs/LoggerManager.ts';

/**
 * 章节任务的几种情况：
 * 目标 视频 题目 2 1
 * 视频 题目 2 1
 * 阅读 1
 * 问卷 1
 */
export async function enterTaskPage(
  page: Page,
  task: TaskItem,
) {
  if (true && (task.isFinish || task.lessCount === 0)) {
    LoggerManager.Instance.info(
      `${task.title} 已完成，跳过`,
    );
    EventManager.Instance.emit(EVENTS_ENUM.TASK_DONE, task);
    return;
  }

  LoggerManager.Instance.start(
    `进入特定章节: ${task.title} 开始观看...`,
  );

  const searchObj = new URLSearchParams(task.searchParams);
  await page.goto(task.link);
  await page.waitForLoadState('domcontentloaded');

  let pageTitle = await page.title();

  if (pageTitle === '学习目标') {
    LoggerManager.Instance.warn(
      '当前页面为学习目标页, 等待大约1-2秒后跳过学习目标页',
    );
    await waitForRandomTime(2000);
    searchObj.set('num', '1');
    await page.goto(
      `${BASE_TASK_URL}?${searchObj.toString()}`,
    );
    await page.waitForLoadState('domcontentloaded');
  } else if (
    pageTitle === '问卷调查' ||
    task.title === '问卷调查'
  ) {
    LoggerManager.Instance.info(
      '当前页面为问卷调查，似乎已经到了最后一个任务点，任务结束',
    );
    EventManager.Instance.emit(EVENTS_ENUM.TASK_DONE, task);
    return;
  } else if (task.title === '阅读') {
    const frameData = await page
      .frameLocator('iframe')
      .owner()
      .getAttribute('data');
    if (!frameData) {
      LoggerManager.Instance.error(
        '获取阅读章节链接出错，跳过该任务',
      );
      EventManager.Instance.emit(
        EVENTS_ENUM.TASK_DONE,
        task,
      );
      return;
    }
    try {
      const frameJsonData = JSON.parse(frameData);
      await page.goto(
        `${BASE_READ_URL}/${frameJsonData['id']}.html`,
      );
      await page.waitForLoadState('domcontentloaded');
      LoggerManager.Instance.info(
        '当前页面为阅读页面，正在等待完成阅读（大约2-4秒）',
      );
      await waitForRandomTime(3000);
      LoggerManager.Instance.success('完成阅读章节');
      EventManager.Instance.emit(
        EVENTS_ENUM.TASK_DONE,
        task,
      );
      return;
    } catch (error) {
      LoggerManager.Instance.error(
        `可能是解析json出错了 ${error}`,
      );
      EventManager.Instance.emit(
        EVENTS_ENUM.TASK_DONE,
        task,
      );
      return;
    }
  } else if (pageTitle === '章节测验') {
    // TODO 完成章节测验的自动答题功能
    LoggerManager.Instance.warn(
      '当前页面为章节测验，但还没开发，直接跳过',
    );
    EventManager.Instance.emit(EVENTS_ENUM.TASK_DONE, task);
  }

  if (task.lessCount === 1) {
    LoggerManager.Instance.warn(
      '当前章节的视频任务刷完啦，因为还没开发自动答题功能，所以先跳过答题直接进入下一个任务',
    );
    EventManager.Instance.emit(EVENTS_ENUM.TASK_DONE, task);
    return;
  }

  const frameLoc = page.frameLocator('iframe');
  const videoLoc = frameLoc.locator('video');

  pageTitle = await page.title();

  if (pageTitle === '视频') {
    LoggerManager.Instance.info(
      '当前页面为视频页面，开始执行任务',
    );
  } else {
    const pageTitle = await page.title();
    const pageUrl = page.url();
    LoggerManager.Instance.warn(
      `未知页面: ${pageTitle} ，跳过该任务请手动前往页面进行debug: ${pageUrl}`,
    );
    EventManager.Instance.emit(EVENTS_ENUM.TASK_DONE, task);
    return;
  }

  const getIsPaused = async () =>
    await frameLoc
      .locator('video')
      .evaluate(async (video: HTMLVideoElement) => {
        return video.paused;
      });

  // 视频还未加载时，只有一个蒙层按钮被展示出来
  const playButton = frameLoc.locator(
    '.vjs-big-play-button',
  );
  const isInitPaused = await getIsPaused();

  if (isInitPaused) {
    // 初始化判断视频是否已经播放，一般是未播放
    await playButton.click();
  }

  // 视频播放加载出来的时候左下角的播放/暂停按钮
  const videoControlButton = frameLoc.locator(
    '.vjs-play-control',
  );

  // 等待视频加载完毕
  const isAgainPause = await getIsPaused();

  if (isAgainPause) {
    await videoControlButton.click();
  }

  const duration = await videoLoc.evaluate(
    async (video: HTMLVideoElement) => {
      if (video.readyState < 1) {
        // HAVE_METADATA = 1
        await new Promise(
          resolve => (video.onloadedmetadata = resolve),
        );
      }
      video.playbackRate = 2;
      return video.duration;
    },
  );

  const getCurTime = async () =>
    await videoLoc.evaluate(
      async (video: HTMLVideoElement) => {
        if (video.readyState < 1) {
          // HAVE_METADATA = 1
          await new Promise(
            resolve => (video.onloadedmetadata = resolve),
          );
        }
        return video.currentTime;
      },
    );

  await videoLoc.evaluate(
    async (video: HTMLVideoElement) => {
      video.onpause = async () => {
        for (let index = 0; index < 10; index++) {
          const paused = await getIsPaused();
          if (!paused) {
            LoggerManager.Instance.success(`重试成功`);
            break;
          }
          LoggerManager.Instance.warn(
            `尝试重新播放视频:${task.title}, 重试次数: ${index + 1}...`,
          );
          await waitForTime(2000);
          await videoControlButton.click();
        }
      };
    },
  );

  // debug 测试，尝试直接快进到末尾
  if (true) {
    await frameLoc
      .locator('video')
      .evaluate(async (video: HTMLVideoElement) => {
        video.currentTime = duration - 1;
      });
  }

  for (let index = 0; index < 10; index++) {
    const paused = await getIsPaused();
    if (!paused) {
      LoggerManager.Instance.success(`重试成功`);
      break;
    }
    LoggerManager.Instance.info(
      `尝试重新播放视频:${task.title}, 重试次数: ${index + 1}...`,
    );
    await waitForRandomTime(2000);
    await videoControlButton.click();
  }

  const bar = new cliProgress.SingleBar({
    format:
      `刷课进度: ${task.title} || ` +
      colors.cyan('{bar}') +
      `| {percentage}% || {value}s / {total}s`,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
    formatValue: v =>
      typeof v === 'number' ? v?.toFixed(2) : v,
  });

  const initTime = await getCurTime();
  bar.start(duration, initTime);

  const timerId = setInterval(async () => {
    const time = await getCurTime();
    bar.update(time);
    if (Math.abs(duration - time) < 0.01) {
      bar.stop();
      LoggerManager.Instance.success(
        `${task.title} 刷完啦，开始刷下一个`,
      );
      clearInterval(timerId);
      EventManager.Instance.emit(
        EVENTS_ENUM.TASK_DONE,
        task,
      );
    }
  }, 1000);
}

import cliProgress from 'cli-progress';
import colors from 'ansi-colors';

import type { Page } from 'playwright';
import { DataManager } from '../runtime/DataManager.ts';
import {
  getHiddenInputValue,
  waitForRandomTime,
  waitForTime,
} from '../../utils/index.ts';
import type { TaskItem } from './step-2-enter-course-page.ts';
import { BASE_TASK_URL } from '../consts/index.ts';
import EventManager from '../runtime/EventManager.ts';
import { EVENTS as ENUM_EVENT } from '../enum/index.ts';

export async function enterTaskPage(
  page: Page,
  task: TaskItem,
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
  if (task.isFinish) {
    console.info(
      `${DataManager.Instance.curTaskCourseName} - ${task.title} 已完成，跳过`,
    );
    return;
  }

  const searchObj = new URLSearchParams(task.searchParams);

  console.info(
    `进入特定章节: ${DataManager.Instance.curTaskCourseName} - ${task.title} 开始观看`,
  );

  await page.goto(task.link);
  await page.waitForLoadState('domcontentloaded');
  console.info(`已进入 ${task.title}`);

  const hasReadButton = page.getByLabel('去阅读');
  const hasReadButtonCount = await hasReadButton
    .getByLabel('去阅读')
    .count();

  if (!!hasReadButtonCount) {
    await hasReadButton.click();
    await page.waitForLoadState('domcontentloaded');
  }

  const isAimPage = await page
    .getByText('通过本章学习，你需要掌握和了解以下问题')
    .count();

  if (isAimPage) {
    console.info(
      '当前页面为学习目标页, 等待大约1-2秒后跳过学习目标页',
    );
    await waitForRandomTime(2000);
    searchObj.set('num', '1');
    await page.goto(
      `${BASE_TASK_URL}?${searchObj.toString()}`,
    );
    await page.waitForLoadState('domcontentloaded');
    console.info('跳转到下一个任务点啦，大概率是视频页面');
  } else if (task.title === '问卷调查') {
    console.info(
      '当前页面为问卷调查，似乎已经到了最后一个任务点，任务结束',
    );
    return;
  }

  console.info('当前页面为视频页面，开始刷视频啦');

  const videoFrameLoc = page.frameLocator('iframe');

  const getIsPaused = async () =>
    await videoFrameLoc
      .locator('video')
      .evaluate(async (video: HTMLVideoElement) => {
        return video.paused;
      });

  // 视频还未加载时，只有一个蒙层按钮被展示出来
  const playButton = videoFrameLoc.locator(
    '.vjs-big-play-button',
  );
  const isInitPaused = await getIsPaused();

  console.info(`视频的初始播放状态: ${!isInitPaused}`);
  if (isInitPaused) {
    // 初始化判断视频是否已经播放，一般是未播放
    await playButton.click();
  }

  // 视频播放加载出来的时候左下角的播放/暂停按钮
  const videoControlButton = videoFrameLoc.locator(
    '.vjs-play-control',
  );
  // 等待视频加载完毕
  const videoLoc = videoFrameLoc.locator('video');

  const isAgainPause = await getIsPaused();

  console.info(
    `经过处理后的播放状态, 期望为 true 实际为: ${!isAgainPause}`,
  );

  if (isAgainPause) {
    console.log(
      '因为视频的初次播放处理没有成功，再次手动尝试点击一次',
    );
    await videoControlButton.click();
  }

  await waitForTime(1000);
  const finalState = await getIsPaused();
  console.log(`视频最终播放状态：${!finalState}`);

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
        for (let index = 0; index < 3; index++) {
          const paused = await getIsPaused();
          if (!paused) {
            console.info(`重试成功`);
            break;
          }
          console.info(
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
    await videoFrameLoc
      .locator('video')
      .evaluate(async (video: HTMLVideoElement) => {
        video.currentTime = duration - 5;
      });
  }

  for (let index = 0; index < 3; index++) {
    const paused = await getIsPaused();
    if (!paused) {
      console.info(`重试成功`);
      break;
    }
    console.info(
      `尝试重新播放视频:${task.title}, 重试次数: ${index + 1}...`,
    );
    await waitForTime(2000);
    await videoControlButton.click();
  }

  const bar = new cliProgress.SingleBar({
    format:
      `刷课进度: ${task.title} |` +
      colors.cyan('{bar}') +
      `| {percentage}% || {value}s/{total}s`,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
    formatValue: v =>
      typeof v === 'number' ? v?.toFixed(2) : v,
  });

  // initialize the bar - defining payload token "speed" with the default value "N/A"
  const initTime = await getCurTime();

  bar.start(duration, initTime);

  // stop the bar
  const timerId = setInterval(async () => {
    const time = await getCurTime();
    bar.update(time);
    if (
      bar.getProgress() > 90 ||
      Math.abs(duration - time) < 0.1
    ) {
      bar.stop();
      console.info(`${task.title} 刷完啦，开始刷下一个`);
      clearInterval(timerId);
      EventManager.Instance.emit(
        ENUM_EVENT.TASK_DONE,
        task,
      );
    }
  }, 1000);
}

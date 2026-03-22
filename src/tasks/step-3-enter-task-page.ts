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
  MULTIPLE_CHOICE as MULTIPLE_CHOICES,
} from '../consts/index.ts';
import EventManager from '../runtime/EventManager.ts';
import { EVENTS_ENUM } from '../enum/index.ts';
import { LoggerManager } from '../runtime/LoggerManager.ts';
import consola from 'consola';

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
  const id = Date.now();
  DataManager.Instance.globalId = id;

  if (true && task.isFinish) {
    LoggerManager.Instance.info(
      `${task.title} 已完成, 跳过`,
    );
    EventManager.Instance.emit(EVENTS_ENUM.TASK_DONE, task);
    return;
  }

  LoggerManager.Instance.start(
    `进入特定章节: ${task.title} 开始刷课...`,
  );

  const searchObj = new URLSearchParams(task.searchParams);
  await page.goto(task.link);
  await page.waitForLoadState('domcontentloaded');

  let pageTitle = await page.title();

  /**
   * 首次进入第一个页面的几种情况
   * 1.学习目标，直接跳过（一般是混在很多任务点中的第一个任务点，所以要num + 1进到下一个任务点）
   * 2.阅读页面，点击后等待几秒直接跳过（一般是独立的一个任务点）
   * 3.问卷调查，直接跳过（一般是独立的一个任务点）
   */
  if (pageTitle === '学习目标') {
    LoggerManager.Instance.info(
      '当前页面为学习目标页, 直接跳过',
    );
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
      '当前页面为问卷调查, 似乎已经到了最后一个任务点, 任务结束',
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
        '获取阅读章节链接出错, 跳过该任务',
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
        '当前页面为阅读页面, 正在等待完成阅读（大约2-4秒）',
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
  }

  const frameLoc = page.frameLocator('iframe');
  const videoLoc = frameLoc.locator('video');

  pageTitle = await page.title();

  // 如果第一个任务点是学习目标页，那么就会自动跳过从而进入到这里，如果第一个就是视频页，那也会进入到这里
  if (pageTitle === '视频' || pageTitle === '课程') {
    LoggerManager.Instance.success(
      '当前页面为视频页面, 开始执行任务',
    );
  } else {
    const pageTitle = await page.title();
    const pageUrl = page.url();
    LoggerManager.Instance.warn(
      `未知页面: ${pageTitle} , 跳过该任务请手动前往页面进行debug: ${pageUrl}`,
    );
    EventManager.Instance.emit(EVENTS_ENUM.TASK_DONE, task);
    return;
  }

  const getIsPaused = async () =>
    await videoLoc.evaluate(
      async (video: HTMLVideoElement) => {
        return video.paused;
      },
    );

  // 视频还未加载时, 只有一个蒙层按钮被展示出来
  const playButton = frameLoc.locator(
    '.vjs-big-play-button',
  );
  const isInitPaused = await getIsPaused();

  if (isInitPaused) {
    // 初始化判断视频是否已经播放, 一般是未播放
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

  // debug 测试, 尝试直接快进到末尾
  if (true) {
    await frameLoc
      .locator('video')
      .evaluate(async (video: HTMLVideoElement) => {
        video.currentTime = duration - 1;
      });
  }

  let isInTopicPanel = false;

  async function retryPlayVideo(retryCount: number = 30) {
    if (
      isInTopicPanel ||
      DataManager.Instance.globalId !== id
    ) {
      return;
    }
    for (let index = 0; index < retryCount; index++) {
      const paused = await getIsPaused();
      if (DataManager.Instance.globalId !== id) {
        return;
      }
      if (!paused) {
        LoggerManager.Instance.success(`播放成功`);
        break;
      }
      LoggerManager.Instance.warn(
        `尝试播放视频:${task.title}, 尝试次数: ${index + 1} / ${retryCount}...`,
      );
      await videoControlButton.click();
    }
  }

  await retryPlayVideo(3);

  page.on('console', async msg => {
    if (DataManager.Instance.globalId !== id) {
      return;
    }
    if (msg.text() === 'VIDEO_PAUSED') {
      await retryPlayVideo();
    } else if (msg.text() === 'VIDEO_PLAYED') {
    }
  });

  await videoLoc.evaluate((video: HTMLVideoElement) => {
    video.addEventListener('pause', () => {
      console.log('VIDEO_PAUSED');
    });
  });
  await videoLoc.evaluate((video: HTMLVideoElement) => {
    video.addEventListener('play', () => {
      console.log('VIDEO_PLAYED');
    });
  });

  function pauseBar() {
    bar.stop(); // 停止并释放命令行行首
  }

  function resumeBar(total: number, current: number) {
    // 重新启动，它会从上一行继续开始绘制
    bar.start(total, current);
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

  const timeUpdateId = setInterval(async () => {
    const time = await getCurTime();
    if (DataManager.Instance.globalId !== id) {
      clearInterval(timeUpdateId);
      bar.stop();
      return;
    }
    bar.update(time);
    if (Math.abs(duration - time) < 0.01) {
      bar.stop();
      clearInterval(findTopicId);
      clearInterval(timeUpdateId);
      LoggerManager.Instance.success(
        '当前章节的视频任务刷完啦, 进入答题页面开始答题',
      );
      const curNum: number = +searchObj.get('num')!;
      searchObj.set('num', String(curNum + 1));
      await page.goto(
        `${BASE_TASK_URL}?${searchObj.toString()}`,
      );
      await page.waitForLoadState('domcontentloaded');

      pageTitle = await page.title();
      if (pageTitle === '章节测验') {
        // TODO 完成章节测验的自动答题功能
        LoggerManager.Instance.warn(
          '当前页面为章节测验, 但还没开发, 直接跳过',
        );
        await waitForRandomTime(2000);
        LoggerManager.Instance.success(
          `${task.title} 刷完啦, 开始刷下一个`,
        );
        EventManager.Instance.emit(
          EVENTS_ENUM.TASK_DONE,
          task,
        );
        return;
      }
    }
  }, 1000);

  let findTopicId = setInterval(answerQuestion, 1000);
  async function answerQuestion() {
    if (DataManager.Instance.globalId !== id) {
      clearInterval(findTopicId);
      clearInterval(timeUpdateId);
      return;
    }
    const tkTopicLoc = frameLoc.locator('.tkTopic');
    const tkTopicCount = await tkTopicLoc.count();
    if (!tkTopicCount) {
      return;
    }
    const tkTitle = await tkTopicLoc
      .locator('.tkTopic_title')
      .textContent();
    const whiteList = ['判断题', '多选题'];

    if (!tkTitle) {
      return;
    }
    if (!whiteList.includes(tkTitle.trim())) {
      return;
    }
    pauseBar();
    LoggerManager.Instance.info('出现答题框了, 开始答题');
    isInTopicPanel = true;
    clearInterval(findTopicId);
    const submitButtonLoc = tkTopicLoc.locator(
      '#videoquiz-submit',
    );
    const spanNotLoc = tkTopicLoc.locator('#spanNot');
    if (tkTitle.trim() === '判断题') {
      const optionLiLocs = await tkTopicLoc
        .locator('.ans-videoquiz-opt')
        .all();
      for (const optionLiLoc of optionLiLocs) {
        const option = optionLiLoc.locator(
          `input[name="ans-videoquiz-opt"]`,
        );
        await option.click();
        await submitButtonLoc.click();
        const spanNotCount = await spanNotLoc.count();
        if (!spanNotCount) {
          findTopicId = setInterval(answerQuestion, 1000);
          isInTopicPanel = false;
          LoggerManager.Instance.info('回答正确, 继续任务');
          const currentTime = await getCurTime();
          resumeBar(duration, currentTime);
          break;
        }
        LoggerManager.Instance.info(
          '回答错误, 继续答题...',
        );
      }
    } else if (tkTitle.trim() === '多选题') {
      const optionLiLocs = await tkTopicLoc
        .locator('.ans-videoquiz-opt')
        .all();

      for (const choices of MULTIPLE_CHOICES) {
        for (const choice of choices) {
          const box = optionLiLocs[choice].locator(
            `input[type="checkbox"][name="ans-videoquiz-opt"]`,
          );
          await box.check();
        }
        await submitButtonLoc.click();
        const spanNotCount = await spanNotLoc.count();
        if (!spanNotCount) {
          LoggerManager.Instance.success(
            '回答正确, 继续任务',
          );
          const currentTime = await getCurTime();
          resumeBar(duration, currentTime);
          findTopicId = setInterval(answerQuestion, 1000);
          isInTopicPanel = false;
          break;
        }
        LoggerManager.Instance.start(
          `回答错误, 重新尝试...`,
        );
        for (const optionLiLoc of optionLiLocs) {
          const box = optionLiLoc.locator(
            `input[type="checkbox"][name="ans-videoquiz-opt"]`,
          );
          if (await box.isChecked())
            await box.uncheck({ force: true });
        }
      }
    }
  }
}

import cliProgress from 'cli-progress';
import colors from 'ansi-colors';
import { Page, ConsoleMessage } from 'playwright';
import { EVENTS_ENUM } from '../../enum';
import { DataManager } from '../../runtime/DataManager';
import EventManager from '../../runtime/EventManager';
import { LoggerManager } from '../../runtime/LoggerManager';
import { TaskItem } from '../../types';
import {
  pauseBar,
  resumeBar,
  waitAlways,
} from '../../utils';
import { execAnswerQuestionTask } from './videoQuestionTask';
import { ConfigManager } from '../../runtime/ConfigManager';

export async function execVideoTask(
  page: Page,
  task: TaskItem,
  searchObj: URLSearchParams,
) {
  LoggerManager.Instance.success(
    `当前为 ${task.title} 的视频页面, 开始执行任务`,
  );
  const frameLoc = page.frameLocator('iframe');
  const videoLoc = frameLoc.locator('video');

  const locator = page.locator('.ans-job-icon'); // 或者类名定位
  const label = await locator.getAttribute('aria-label');

  if (label === '任务点已完成') {
    page.off('console', onConsoleText);
    EventManager.Instance.emit(
      EVENTS_ENUM.VIDEO_DONE,
      page,
      task,
      searchObj,
    );
    return;
  }

  const getIsPaused = async () => {
    const isPaused = await videoLoc.evaluate(
      async (video: HTMLVideoElement) => {
        return video.paused;
      },
    );
    return isPaused;
  };

  // 视频还未加载时, 只有一个蒙层按钮被展示出来
  const playButton = frameLoc.locator(
    '.vjs-big-play-button',
  );

  // 视频播放加载出来的时候左下角的播放/暂停按钮
  const videoControlButton = frameLoc.locator(
    '.vjs-play-control',
  );

  const isInitPaused = await getIsPaused();

  if (isInitPaused) {
    // 初始化判断视频是否已经播放, 一般是未播放
    await playButton.click();
  }

  // 等待视频加载完毕
  const isAgainPause = await getIsPaused();

  if (isAgainPause) {
    await videoControlButton.click();
  }

  const DURATION = await videoLoc.evaluate(
    async (video: HTMLVideoElement) => {
      if (video.readyState < 1) {
        // HAVE_METADATA = 1
        await new Promise(
          resolve => (video.onloadedmetadata = resolve),
        );
      }
      video.playbackRate = 1;
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

  const cutDuration =
    ConfigManager.Instance.launchOption.forceStart ?
      DURATION
    : 0.1;
  await frameLoc.locator('video').evaluate(
    async (video: HTMLVideoElement, params) => {
      video.currentTime =
        params.duration - params.cutDuration;
    },
    { duration: DURATION, cutDuration },
  );

  let isInTopicPanel = false;

  async function retryPlayVideo(retryCount: number = 30) {
    for (let index = 0; index < retryCount; index++) {
      if (
        isInTopicPanel ||
        DataManager.Instance.globalTaskLink !== task.link
      ) {
        return;
      }
      const paused = await getIsPaused();
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

  await retryPlayVideo();

  let timeId: NodeJS.Timeout | null = null;
  function onConsoleText(msg: ConsoleMessage) {
    if (DataManager.Instance.globalTaskLink !== task.link) {
      timeId ? clearTimeout(timeId) : '';
      return;
    }
    if (msg.text() === 'VIDEO_PAUSED') {
      if (timeId) clearInterval(timeId);
      timeId = setTimeout(async () => {
        await retryPlayVideo();
      }, 2000);
    }
  }

  page.on('console', onConsoleText);

  await videoLoc.evaluate((video: HTMLVideoElement) => {
    video.addEventListener('pause', () => {
      console.log('VIDEO_PAUSED');
    });
  });

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

  bar.start(DURATION, initTime);

  const timeUpdateId = setInterval(async () => {
    const time = await getCurTime();
    if (DataManager.Instance.globalTaskLink !== task.link) {
      clearInterval(timeUpdateId);
      bar.stop();
      return;
    }
    bar.update(time);
    if (Math.abs(DURATION - time) < 1) {
      bar.stop();
      clearInterval(findTopicId);
      clearInterval(timeUpdateId);
      timeId ? clearTimeout(timeId) : '';
      page.off('console', onConsoleText);
      EventManager.Instance.emit(
        EVENTS_ENUM.VIDEO_DONE,
        page,
        task,
        searchObj,
      );
    }
  }, 300);

  let findTopicId = setInterval(checkHasQuestion, 1000);
  async function checkHasQuestion() {
    if (DataManager.Instance.globalTaskLink !== task.link) {
      clearInterval(findTopicId);
      return;
    }

    const tkTopicLoc = frameLoc.locator('.tkTopic');
    const tkTopicCount = await tkTopicLoc.count();
    const whiteList = ['判断题', '多选题', '单选题'];

    if (!tkTopicCount) {
      return;
    }

    const tkTitle = await tkTopicLoc
      .locator('.tkTopic_title')
      .textContent();

    const tkTitleStr = tkTitle?.trim() || '';

    if (!tkTitleStr) {
      return;
    }

    if (!whiteList.includes(tkTitleStr)) {
      return;
    }

    pauseBar(bar);

    LoggerManager.Instance.info('出现答题框了, 开始答题');

    isInTopicPanel = true;

    clearInterval(findTopicId);

    const answerResult = await execAnswerQuestionTask(
      page,
      tkTitleStr,
    );

    if (!answerResult) {
      LoggerManager.Instance.error(
        `不知道什么原因, 答题没有答对, 请前往页面手动检查: ${page.url()} `,
      );
    }

    const currentTime = await getCurTime();

    resumeBar(bar, DURATION, currentTime);

    findTopicId = setInterval(checkHasQuestion, 1000);
    isInTopicPanel = false;
  }
}

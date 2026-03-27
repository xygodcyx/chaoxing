import { Page } from 'playwright';
import { EVENTS_ENUM } from '../../enum';
import EventManager from '../../runtime/EventManager';
import { LoggerManager } from '../../runtime/LoggerManager';
import {
  ChoiceItem,
  SubjectItem,
  SubjectType,
  TaskItem,
} from '../../types';
import {
  cleanString,
  saveArrayIndex,
  waitAlways,
  waitForRandomTime,
} from '../../utils';
import { decodeFont } from '../../utils/fontDecoder';
import { fetchAnswersFromAI } from '../../utils/ai';

export async function execChapterTestTask(
  page: Page,
  task: TaskItem,
) {
  // TODO 完成章节测验的自动答题功能
  LoggerManager.Instance.start(
    `当前为 ${task.title} 的章节测验页面, 开始执行任务`,
  );
  if (!process.env.DEEPSEEK_API_KEY) {
    LoggerManager.Instance.warn(
      `没有 DEEPSEEK_API_KEY ，无法执行自动答任务，请前往deepseek官网生成DEEPSEEK_API_KEY: https://platform.deepseek.com/DEEPSEEK_API_KEYs`,
    );
    LoggerManager.Instance.warn(
      '请运行 "chaoxing where" 命令前往配置目录编辑.env文件并添加DEEPSEEK_API_KEY字段, eg: DEEPSEEK_API_KEY=sk-xxxxxxxxxxxx',
    );
    EventManager.Instance.emit(EVENTS_ENUM.TASK_DONE, task);
    return;
  }

  const taskFrame = page.frameLocator(
    'iframe[src*="work/index.html"]',
  );

  const finalQuizFrame = taskFrame.frameLocator(
    'iframe#frame_content',
  );

  const wrapLoc = finalQuizFrame.locator('#ZyBottom');

  const status = await finalQuizFrame
    .locator('.testTit_status')
    .textContent();
  if (status === '已完成') {
    LoggerManager.Instance.success(
      `${task.title} 刷完啦, 开始刷下一个`,
    );
    EventManager.Instance.emit(EVENTS_ENUM.TASK_DONE, task);
    return;
  }

  const btnSubmit = finalQuizFrame.locator('.btnSubmit');

  const subjectTypeLocs = await wrapLoc
    .locator('.newTestType')
    .all();

  const subjectLocs = await wrapLoc
    .locator('.singleQuesId')
    .all();

  const allChoiceLocs = await wrapLoc
    .locator('[class*="before-after"]')
    .all();

  const subjectList: Array<SubjectItem> = [];

  const subjectLengthRegex = /\s*(\d+)\s*/;
  const subjectTypeRegex =
    /(单选题|多选题|填空题|判断题|简答题)/;

  let subjectLocIndexOffset = 0;

  const temp = (
    await finalQuizFrame
      .locator('#cxSecretStyle')
      .innerHTML()
  ).split('font-ttf;charset=utf-8;base64,');

  let fontBase64 = '';

  if (temp.length > 1) {
    fontBase64 = temp[1].split("')")[0];
  }

  let choiceIndex = 0;
  for (const subjectTypeLoc of subjectTypeLocs) {
    const typeContent = await subjectTypeLoc.textContent();
    const subjectLength = +(
      typeContent?.match(subjectLengthRegex)?.[1] || '1'
    );
    const subjectType = (typeContent?.match(
      subjectTypeRegex,
    )?.[1] || '') as SubjectType;
    for (let index = 0; index < subjectLength; index++) {
      const subjectLoc = subjectLocs[subjectLocIndexOffset];
      subjectLocIndexOffset++;
      const subjectTitle =
        (
          await subjectLoc
            .locator('.Zy_TItle')
            .textContent()
        )?.trim() || '';
      const cleanedTitle = cleanString(subjectTitle);

      const decodeTitle = await decodeFont(
        fontBase64,
        cleanedTitle,
      );

      const choiceLocs = await subjectLoc
        .locator(
          subjectType === '多选题' ?
            '.before-after-checkbox'
          : '.before-after',
        )
        .all();
      const choices: Array<ChoiceItem> = [];
      for (const choiceLoc of choiceLocs) {
        const choiceContent = await choiceLoc
          .locator('.after')
          .textContent();
        const cleanChoiceContent = cleanString(
          choiceContent || '',
        );
        const decodeChoiceContent = await decodeFont(
          fontBase64,
          cleanChoiceContent,
        );
        const choiceItem = {
          index: choiceIndex,
          content: decodeChoiceContent,
        };
        choices.push(choiceItem);
        choiceIndex++;
      }

      subjectList.push({
        title: decodeTitle,
        type: subjectType,
        choices,
      });
    }
  }

  LoggerManager.Instance.debug(
    `${task.title} 的题目列表:\r\n ${JSON.stringify(subjectList)}`,
  );

  LoggerManager.Instance.debug(
    `${task.title} 的题目数量：${subjectList.length}`,
  );
  
  LoggerManager.Instance.debug(
    `${task.title} 题目的所有选项数量：${allChoiceLocs.length}`,
  );

  const aiAnswers = await fetchAnswersFromAI(subjectList);

  LoggerManager.Instance.info(
    `AI 返回了答案: ${JSON.stringify(aiAnswers)} , 题目网页:${page.url()}`,
  );

  for (const answerIndex of aiAnswers.flat()) {
    const choiceLoc =
      allChoiceLocs[
        saveArrayIndex(answerIndex, allChoiceLocs.length)
      ];
    await choiceLoc.click();
  }
  const popok = finalQuizFrame.locator('#popok');
  await btnSubmit.click();
  await waitForRandomTime(2000);
  await popok.click();
  const achievement = await finalQuizFrame
    .locator('.achievement i')
    .textContent();
  LoggerManager.Instance.success(
    `答题完成，本次成绩：${achievement} 分`,
  );
  // await waitAlways();
  await waitForRandomTime(2000);
  LoggerManager.Instance.success(
    `${task.title} 刷完啦, 开始刷下一个`,
  );
  EventManager.Instance.emit(EVENTS_ENUM.TASK_DONE, task);
  return;
}

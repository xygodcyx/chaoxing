import type { Locator, Page } from 'playwright';
import {
  JUDGMENT_CHOICES,
  MULTIPLE_CHOICES,
  SINGLE_CHOICES,
} from '../../consts';
import { LoggerManager } from '../../runtime/LoggerManager';

export async function execAnswerQuestionTask(
  page: Page,
  tkTitle: string,
) {
  const frameLoc = page.frameLocator('iframe');
  const tkTopicLoc = frameLoc.locator('.tkTopic');

  const submitButtonLoc = tkTopicLoc.locator(
    '#videoquiz-submit',
  );

  const spanNotLoc = tkTopicLoc.locator('#spanNot');
  const optionLiLocs = await tkTopicLoc
    .locator('.ans-videoquiz-opt')
    .all();

  if (tkTitle === '判断题') {
    for (const choice of JUDGMENT_CHOICES) {
      const option = optionLiLocs[choice].locator(
        `input[name="ans-videoquiz-opt"]`,
      );
      await option.click();
      await submitButtonLoc.click();
      const spanNotCount = await spanNotLoc.count();
      if (spanNotCount) {
        LoggerManager.Instance.info(
          '回答错误, 继续答题...',
        );
        continue;
      }
      LoggerManager.Instance.info('回答正确, 继续任务');
      return true;
    }
    return false;
  } else if (tkTitle === '多选题') {
    for (const choices of MULTIPLE_CHOICES) {
      for (const optionLiLoc of optionLiLocs) {
        const box = optionLiLoc.locator(
          `input[type="checkbox"][name="ans-videoquiz-opt"]`,
        );
        if (await box.isChecked())
          await box.uncheck({ force: true });
      }

      for (const choice of choices) {
        const box = optionLiLocs[choice].locator(
          `input[type="checkbox"][name="ans-videoquiz-opt"]`,
        );
        await box.check();
      }

      await submitButtonLoc.click();

      const spanNotCount = await spanNotLoc.count();

      if (spanNotCount) {
        LoggerManager.Instance.start(
          `回答错误, 重新尝试...`,
        );
        continue;
      }

      LoggerManager.Instance.success('回答正确, 继续任务');
      return true;
    }
    return false;
  } else if (tkTitle === '单选题') {
    for (const choice of SINGLE_CHOICES) {
      const option = optionLiLocs[choice].locator(
        `input[name="ans-videoquiz-opt"]`,
      );

      await option.click();

      await submitButtonLoc.click();

      const spanNotCount = await spanNotLoc.count();

      if (spanNotCount) {
        LoggerManager.Instance.start(
          `回答错误, 重新尝试...`,
        );
        continue;
      }

      LoggerManager.Instance.success('回答正确, 继续任务');

      return true;
    }
    return false;
  }
  return false;
}

import { Page } from 'playwright';
import { BASE_READ_URL } from '../../consts';
import { EVENTS_ENUM } from '../../enum';
import { DataManager } from '../../runtime/DataManager';
import EventManager from '../../runtime/EventManager';
import { LoggerManager } from '../../runtime/LoggerManager';
import { TaskItem } from '../../types';
import { waitForRandomTime } from '../../utils';

export async function execReadTask(
  page: Page,
  task: TaskItem,
  taskId: number,
) {
  if (DataManager.Instance.globalTaskId !== taskId) {
    return;
  }
  const frameData = await page
    .frameLocator('iframe')
    .owner()
    .getAttribute('data');
  if (!frameData) {
    LoggerManager.Instance.error(
      '获取阅读章节链接出错, 跳过该任务',
    );
    EventManager.Instance.emit(EVENTS_ENUM.TASK_DONE, task);
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
    EventManager.Instance.emit(EVENTS_ENUM.TASK_DONE, task);
    return;
  } catch (error) {
    LoggerManager.Instance.error(
      `可能是解析json出错了 ${error}`,
    );
    EventManager.Instance.emit(EVENTS_ENUM.TASK_DONE, task);
    return;
  }
}

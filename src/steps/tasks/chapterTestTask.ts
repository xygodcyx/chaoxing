import { Page } from 'playwright';
import { EVENTS_ENUM } from '../../enum';
import EventManager from '../../runtime/EventManager';
import { LoggerManager } from '../../runtime/LoggerManager';
import { TaskItem } from '../../types';
import { waitAlways } from '../../utils';

export async function execChapterTestTask(
  page: Page,
  task: TaskItem,
) {
  // TODO 完成章节测验的自动答题功能
  LoggerManager.Instance.warn(
    `当前为 ${task.title} 的章节测验页面, 开始执行任务`,
  );
  const ZyBottomLoc = page.locator('#ZyBottom');
  await waitAlways();
  LoggerManager.Instance.success(
    `${task.title} 刷完啦, 开始刷下一个`,
  );
  EventManager.Instance.emit(EVENTS_ENUM.TASK_DONE, task);
  return;
}

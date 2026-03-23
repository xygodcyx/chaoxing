import Action from '../action/Action';
import { CACHE_KEY_ENUM } from '../enum/index';
import { CacheManager } from '../runtime/CacheManager';
import { ConfigManager } from '../runtime/ConfigManager';
import { DataManager } from '../runtime/DataManager';
import { LoggerManager } from '../runtime/LoggerManager';
import type {
  CommandRun,
  CommandUserInfo,
  UserStatus,
} from '../types/index';

import { registerCommand } from './index';

export function initUserStatus(
  commandUser: CommandUserInfo = {
    phone: '',
  },
) {
  const cacheUser = CacheManager.Instance.load<UserStatus>(
    `${CACHE_KEY_ENUM.USER_STATUS}`,
    {
      info: {
        phone: '',
      },
    },
  );

  if (!commandUser.phone && !cacheUser.info.phone) {
    LoggerManager.Instance.error(`手机号缺失`);
    throw new Error('手机号缺失');
  }

  DataManager.Instance.userStatus = {
    info: {
      phone: commandUser.phone,
    },
    curCourseName:
      commandUser.course ||
      cacheUser.curCourseName ||
      process.env.COURSE ||
      '',
    curTaskName:
      commandUser.task ||
      cacheUser.curTaskName ||
      process.env.TASK ||
      '',
  };
}

export function registerRunCommand() {
  registerCommand<CommandRun>(
    'run',
    '按提供的用户参数执行刷课任务（单用户）',
    [
      {
        short: 'p',
        long: 'phone',
        type: 'string',
        description: '手机号',
      },
      {
        short: 'c',
        long: 'course',
        type: 'string',
        description: '要刷的课程, 留空从第一个开始刷',
      },
      {
        short: 't',
        long: 'task',
        type: 'string',
        description: '要刷的章节, 留空从第一个开始刷',
      },
      {
        short: 's',
        long: 'show',
        type: '',
        description:
          '启动图形化浏览器，查看实时运行状态（需要图形化操作系统）',
      },
    ],
    async str => {
      const phone = str.phone;
      const course = str.course;
      const task = str.task;
      const show = str.show;

      ConfigManager.Instance.launchOption.headless = !show;

      initUserStatus({
        phone,
        course,
        task,
      });

      const action = new Action(
        DataManager.Instance.userStatus,
      );
      await action.init();
    },
  );
}

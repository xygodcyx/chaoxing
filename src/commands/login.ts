import { registerCommand } from './index';
import type { CommandLogin } from '../types/index';
import { enterLoginPage } from '../steps/step-0-enter-login-page';
import { DataManager } from '../runtime/DataManager';
import { CacheManager } from '../runtime/CacheManager';
import { CACHE_KEY_ENUM } from '../enum';
import { LoggerManager } from '../runtime/LoggerManager';
import { ConfigManager } from '../runtime/ConfigManager';

export function registerLoginCommand() {
  registerCommand<CommandLogin>(
    'login',
    '登录',
    [
      {
        short: 'p',
        long: 'phone',
        type: 'string',
        description: '手机号',
      },
      {
        short: 'w',
        long: 'password',
        type: 'string',
        description: '密码',
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
      const phone = str.phone ?? process.env.PHONE;
      const password = str.password ?? process.env.PASSWORD;
      const show = str.show;

      ConfigManager.Instance.launchOption.headless = !show;

      if (!phone) {
        LoggerManager.Instance.error('请提供手机号');
        return;
      }

      if (!password) {
        LoggerManager.Instance.error('请提供密码');
        return;
      }

      DataManager.Instance.userStatus.info.phone = phone;
      await CacheManager.Instance.reLinkCacheDirPath(phone);
      await CacheManager.Instance.save(
        `${CACHE_KEY_ENUM.USER_STATUS}`,
        DataManager.Instance.userStatus,
      );
      await enterLoginPage(phone, password);
    },
  );
}

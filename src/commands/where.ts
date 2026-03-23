import { registerCommand } from './index';
import { CHAOXING_DIR_URL } from '../consts/index';
import { LoggerManager } from '../runtime/LoggerManager';

export function registerWhereCommand() {
  registerCommand(
    'where',
    '查看chaoxing的运行时目录',
    [],
    async str => {
      LoggerManager.Instance.success(`${CHAOXING_DIR_URL}`);
    },
  );
}

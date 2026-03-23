import Singleton from '../base/Singleton';
import {
  CHAOXING_DIR_URL,
} from '../consts/index';
import {
  LOG_LEVEL_ENUM,
  type LOG_LEVEL,
} from '../enum/index';

import { consola } from 'consola';
import { appendStringToFile } from '../utils/index';
import path from 'node:path';
import { DataManager } from './DataManager';

export class LoggerManager extends Singleton {
  static get Instance(): LoggerManager {
    return super.GetInstance<LoggerManager>();
  }

  private async record(
    msg: string,
    level: LOG_LEVEL,
    ...params: unknown[]
  ) {
    const date = new Date();
    const { phone } = DataManager.Instance.userStatus.info;
    const logStr = `${date.toLocaleDateString()} - ${date.toLocaleTimeString()} [${level}] ${msg}\r\n`;
    consola[level](`${msg}`, ...params);
    await appendStringToFile(
      path.join(
        CHAOXING_DIR_URL,
        phone,
        'logs',
        'index.log',
      ),
      logStr,
    );
  }
  public async start(msg: string, ...params: unknown[]) {
    await this.record(msg, LOG_LEVEL_ENUM.START, ...params);
  }
  public async box(msg: string, ...params: unknown[]) {
    await this.record(msg, LOG_LEVEL_ENUM.BOX, ...params);
  }
  public async info(msg: string, ...params: unknown[]) {
    await this.record(msg, LOG_LEVEL_ENUM.INFO, ...params);
  }
  public async warn(msg: string, ...params: unknown[]) {
    await this.record(msg, LOG_LEVEL_ENUM.WARN, ...params);
  }
  public async error(msg: string, ...params: unknown[]) {
    await this.record(msg, LOG_LEVEL_ENUM.ERROR, ...params);
  }
  public async success(msg: string, ...params: unknown[]) {
    await this.record(
      msg,
      LOG_LEVEL_ENUM.SUCCESS,
      ...params,
    );
  }
}

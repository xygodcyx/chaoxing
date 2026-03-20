import fs from 'fs/promises';
import path from 'path';
import Singleton from '../base/Singleton.ts';
import { LOGGER_FILE_PATH } from '../consts/index.ts';
import {
  LOG_LEVEL_ENUM,
  type LOG_LEVEL,
} from '../enum/index.ts';

import { consola } from 'consola';

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
    const logStr = `${date.toLocaleDateString()} - ${date.toLocaleTimeString()} [${level}] ${msg}\r\n`;
    consola[level](msg, ...params);
    await fs.appendFile(
      path.join(LOGGER_FILE_PATH),
      logStr,
    );
  }
  public async start(msg: string, ...params: unknown[]) {
    await this.record(msg, LOG_LEVEL_ENUM.START);
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

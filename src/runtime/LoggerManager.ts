import Singleton from '../base/Singleton';
import { CHAOXING_DIR_URL } from '../consts/index';
import {
  LOG_LEVEL_ENUM,
  type LOG_LEVEL,
} from '../enum/index';

import { appendStringToFile } from '../utils/index';
import path from 'node:path';
import { DataManager } from './DataManager';
import { ConsolaInstance, createConsola } from 'consola';

export class LoggerManager extends Singleton {
  static get Instance(): LoggerManager {
    return super.GetInstance<LoggerManager>();
  }
  // 0	consola.silent() 静默 (Fatal)	几乎不输出，仅输出导致程序崩溃的致命错误。
  // 1	consola.error()	 错误 (Error)	运行时的严重问题，必须修复。
  // 2	consola.warn()	 警告 (Warn)	潜在的问题，不影响运行但需要注意。
  // 3	consola.log()    信息 (Log/Info)	默认级别。程序运行的关键进度说明。
  // 4	consola.debug()	 调试 (Debug)	开发时的详细数据信息。
  // 5	consola.trace()	 追踪 (Trace)	最详细的日志，包括堆栈、详细步骤等。
  constructor() {
    super();
    this.consola = createConsola({
      level: process.env.NODE_ENV === 'production' ? 3 : 4,
    });
  }

  private consola: ConsolaInstance;

  private async record(
    msg: string,
    level: LOG_LEVEL,
    ...params: unknown[]
  ) {
    const date = new Date();
    const { phone } = DataManager.Instance.userStatus.info;
    const logStr = `${date.toLocaleDateString()} - ${date.toLocaleTimeString()} [${level}] ${msg}\r\n`;
    this.consola[level](`${msg}`, ...params);
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

  public async debug(msg: string, ...params: unknown[]) {
    await this.record(msg, LOG_LEVEL_ENUM.DEBUG, ...params);
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

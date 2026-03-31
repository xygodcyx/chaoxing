import { chromium } from 'playwright-extra';
import type { Page } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import { LoggerManager } from '../runtime/LoggerManager';
import { SingleBar } from 'cli-progress';
import { CHAOXING_DIR_URL } from '../consts';
import { ConfigManager } from '../runtime/ConfigManager';
import type { SafeCallConfig } from '../types';

/**
 * 自动处理错误、自动重试、确保程序不崩溃的执行容器
 * @param fn 要执行的异步函数
 * @param config 配置项
 * @returns 返回函数结果，若最终失败则返回 null
 */
export async function safeCallFunc<T>(
  fn: () => Promise<T>,
  config: SafeCallConfig = {},
): Promise<T | null> {
  const {
    message = '',
    retries = 10,
    delay = 2000,
    silent = false,
    exponential = true,
  } = config;

  let lastError: any;
  const errors = [];

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const res = await fn();
      attempt !== 1 &&
        LoggerManager.Instance.success(
          `经过${attempt - 1}次尝试后，任务重新执行成功`,
        );
      return res;
    } catch (error: any) {
      lastError = error;
      errors.push(error);

      // 如果还没达到最大重试次数，则进行等待
      if (attempt <= retries) {
        const waitTime =
          exponential ?
            delay * Math.pow(2, attempt - 1)
          : delay;

        LoggerManager.Instance.warn(
          `${message ? `${message}` : '操作失败'} (尝试次数: ${attempt}/${retries}), 错误原因: ${error.message}。 将在 ${waitTime}ms 后重试...`,
        );

        await waitForRandomTime(waitTime);
      }
    }
  }

  // 最终失败处理
  if (!silent) {
    LoggerManager.Instance.error(
      `程序执行异常，重试 ${retries} 次后仍未成功: ${lastError?.message || '未知错误'}，历史错误:${errors
        .slice(0, -1)
        .map(error => error.message)
        .join('\r\n')}
      `,
      lastError,
    );
  }

  return null;
}

/**
 * 将手机号转为唯一的哈希字符串, 用于目录名
 */
export function getStorageDirName(phone: string): string {
  return createHash('md5')
    .update(phone)
    .digest('hex')
    .slice(0, 16);
  // 取前16位足够区分, 且路径不会太长
}

export function maskPhone(phone: string) {
  const str = String(phone);
  return str.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

export function getElementIndexInArray(
  element: any,
  arr: Array<any>,
  flag?: string,
) {
  const index = arr.findIndex(item =>
    flag ? item[flag] === element[flag] : item === element,
  );
  return index;
}

export function saveArrayIndex(
  index: number,
  length: number,
) {
  return Math.max(0, Math.min(index, length - 1));
}

export function randomInt(start: number, end: number) {
  return Math.floor(Math.random() * (end - start)) + start;
}

export async function waitAlways() {
  return new Promise(() => {});
}

export async function waitForTime(time: number) {
  return new Promise(resolve => {
    setTimeout(resolve, time);
  });
}

export async function waitForRandomTime(
  base: number = 1000,
  offset: number = 200,
  minStart: number = 20,
  minEnd: number = 50,
) {
  const start = Math.max(minStart, base - offset);
  const end = Math.min(minEnd, base + offset);
  const randomTime = randomInt(start, end);
  return await waitForTime(randomTime);
}

export async function getHiddenInputValue(
  page: Page,
  id: string,
  name?: string,
) {
  const value = await page
    .locator(
      name ? `input#${id}[name="${name}"]` : `input#${id}`,
    )
    .inputValue();
  return value;
}

export async function isFileExist(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function appendStringToFile(
  filePath: string,
  data: string,
) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.appendFile(path.join(filePath), data);
}

export async function replaceStringToFile(
  filePath: string,
  data: string,
) {
  await fs.writeFile(path.join(filePath), data);
}

export async function loadStringForFile(
  filePath: string,
  defaultValue: string,
) {
  const isExist = await isFileExist(filePath);
  if (!isExist) {
    await LoggerManager.Instance.warn(
      `目录或文件不存在: ${filePath}, 无法读取, 返回默认值: ${defaultValue}`,
    );
    return defaultValue;
  }
  return await fs.readFile(path.join(filePath), 'utf-8');
}

export async function saveJsonDataToFile(
  filePath: string,
  data: unknown,
) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const jsonStr = JSON.stringify(data);
  await replaceStringToFile(filePath, jsonStr);
}

export async function loadJsonDataForFile<T>(
  filePath: string,
  defaultValue: T,
) {
  const isExist = await isFileExist(filePath);
  if (!isExist) {
    await LoggerManager.Instance.warn(
      `目录或文件不存在: ${filePath}, 无法读取, 返回默认值: ${defaultValue}`,
    );
    return defaultValue;
  }
  const jsonStr = await loadStringForFile(
    filePath,
    JSON.stringify(defaultValue),
  );
  try {
    return JSON.parse(jsonStr) as T;
  } catch (error) {
    LoggerManager.Instance.error(
      `JSON解析错误: ${jsonStr} `,
    );
    return;
  }
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  // 计算它是 1024 的几次幂
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return (
    parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) +
    ' ' +
    sizes[i]
  );
}

export function pauseBar(bar: SingleBar) {
  bar.stop(); // 停止并释放命令行行首
}

export function resumeBar(
  bar: SingleBar,
  total: number,
  current: number,
) {
  // 重新启动, 它会从上一行继续开始绘制
  bar.start(total, current);
}

/**
 * 清洗超星题目文本
 * @param rawTitle 原始脏数据
 * @returns 干净的题目字符串
 */
export function cleanString(rawTitle: string): string {
  return (
    rawTitle
      // 1. 替换所有的换行、制表符、多余空格为单个空格
      .replace(/[\n\t\r]/g, '')
      // 2. 去掉开头的题号（如 "3 " 或 "3."）
      .replace(/^\d+[\s\.]*/, '')
      // 3. 去掉题型标注（如 "【判断题】"）
      .replace(/【.*?】/, '')
      // 4. 去掉结尾的空括号
      .replace(/[（\(]\s*[）\)]\s*$/, '') || rawTitle.trim()
  );
}

export async function getLoggedChromePage(phone: string) {
  const browser = await chromium.launch(
    ConfigManager.Instance.launchOption,
  );

  const authPath = path.resolve(
    `${CHAOXING_DIR_URL}`,
    getStorageDirName(phone),
    'auth',
    'user.json',
  );

  const context = await browser.newContext({
    storageState: authPath,
  });

  const page = await context.newPage();

  return { browser, page };
}

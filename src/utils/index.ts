import type { Page } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { LoggerManager } from '../runtime/LoggerManager';
import { SingleBar } from 'cli-progress';

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
      `目录或文件不存在: ${filePath}，无法读取，返回默认值: ${defaultValue}`,
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
      `目录或文件不存在: ${filePath}，无法读取，返回默认值: ${defaultValue}`,
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
  // 重新启动，它会从上一行继续开始绘制
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

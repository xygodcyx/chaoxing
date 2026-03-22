import type { Page } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { LoggerManager } from '../runtime/LoggerManager.ts';

export function randomInt(start: number, end: number) {
  return Math.floor(Math.random() * (end - start)) + start;
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

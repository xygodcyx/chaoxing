import type { Page } from 'playwright';

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

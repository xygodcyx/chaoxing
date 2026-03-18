import type { Page } from 'playwright';

export async function waitForTime(time: number) {
  return new Promise(resolve => {
    setTimeout(resolve, time);
  });
}

export async function waitForRandomTime(
  base: number = 1000,
  offset: number = 200,
) {
  const start = Math.max(20, base - offset);
  const end = Math.min(50, base + offset);
  const randomTime = randomInt(start, end);
  return await waitForTime(randomTime);
}

export function randomInt(start: number, end: number) {
  return Math.floor(Math.random() * (end - start)) + start;
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

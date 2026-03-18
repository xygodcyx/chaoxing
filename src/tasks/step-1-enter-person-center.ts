import type { Page } from 'playwright';

export async function enterPersonCenter(
  page: Page,
  options: {
    timeout?: number;
    waitForIframe?: boolean;
    waitForNetwork?: boolean;
  } = {
    timeout: 30000,
    waitForIframe: true,
    waitForNetwork: false,
  },
) {
  const { timeout } = options;

  await page.goto(
    'https://i.mooc.chaoxing.com/space/index',
  );

  // 1. 首先等待基础页面加载
  await page.waitForLoadState('domcontentloaded', {
    timeout,
  });

  // 2. 可选：等待网络空闲（但不要完全依赖它）
  if (options.waitForNetwork) {
    await page
      .waitForLoadState('networkidle', { timeout })
      .catch(() => {
        console.warn('网络未完全空闲，继续执行...');
      });
  }

  // 点击课程
  console.info('进入个人中心页面');

  if (options.waitForIframe) {
    const iframe = await page.waitForSelector('iframe', {
      timeout: 10000,
    });
    if (iframe) {
      const frame = await iframe.contentFrame();
      if (frame) {
        await frame.waitForLoadState('domcontentloaded', {
          timeout,
        });
        console.log('✅ iframe 已加载');
        const newUrl =
          (await iframe?.getAttribute('src')) || '';

        await page.goto(newUrl);

        await page.waitForSelector('#courseList');

        console.log('✅ 已进入个人中心iframe子页面');

        const all = await page.locator('.color1').all();
        return all;
      }
    }
  }
  return [];
}

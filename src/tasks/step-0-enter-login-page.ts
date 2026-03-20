// save-auth.ts
import { chromium } from 'playwright';
import path from 'path';
import { AUTH_FILE_BASE_PATH } from '../consts/index.ts';
import { LoggerManager } from '../logs/LoggerManager.ts';

export async function enterLoginPage(phone: string) {
  const authFile = path.join(
    `${AUTH_FILE_BASE_PATH}/user-${phone}.json`,
  );
  const browser = await chromium.launch({
    headless: true,
    slowMo: 100, // 放慢操作，看得清楚
  });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  try {
    LoggerManager.Instance.start('开始登录..');
    await page.goto('https://passport2.chaoxing.com/login');

    await page
      .getByPlaceholder('手机号/超星号')
      .fill('13145495910');
    await page
      .getByPlaceholder('学习通密码')
      .fill('xxyxxxyx666');
    await page
      .getByRole('button', {
        name: '登录',
      })
      .click();

    await page.waitForURL(
      /^https:\/\/i\.mooc\.chaoxing\.com\/space\/index\?.*$/,
    );

    // End of authentication steps.
    LoggerManager.Instance.info(
      '登录成功，正在保存会话状态...',
    );

    await page.context().storageState({ path: authFile });

    LoggerManager.Instance.info(`状态已保存到 ${authFile}`);
  } catch (error) {
    console.error('登录失败:', error);
  } finally {
    await browser.close();
  }
}

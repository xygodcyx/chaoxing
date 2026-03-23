// save-auth
import { chromium } from 'playwright';
import path from 'path';
import { CHAOXING_DIR_URL } from '../consts/index';
import { LoggerManager } from '../runtime/LoggerManager';
import { ConfigManager } from '../runtime/ConfigManager';

export async function enterLoginPage(
  phone: string,
  password: string,
) {
  const authPath = path.resolve(
    `${CHAOXING_DIR_URL}`,
    phone,
    'auth',
    'user.json',
  );
  const browser = await chromium.launch(ConfigManager.Instance.launchOption);
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
      .fill(phone);
    await page
      .getByPlaceholder('学习通密码')
      .fill(password);
    await page
      .getByRole('button', {
        name: '登录',
      })
      .click();

    await page.waitForURL(
      /^https:\/\/i\.mooc\.chaoxing\.com\/space\/index\?.*$/,
    );

    // End of authentication steps.
    LoggerManager.Instance.start(
      '登录成功，正在保存会话状态...',
    );

    await page.context().storageState({ path: authPath });

    LoggerManager.Instance.success(
      `状态已保存到 ${authPath}`,
    );
  } catch (error: any) {
    LoggerManager.Instance.error(
      `登录失败: ${error.message}`,
      error,
    );
  } finally {
    await browser.close();
  }
}

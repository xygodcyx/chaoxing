// save-auth
import * as p from '@clack/prompts'
import fs from 'fs/promises'

import path from 'path'
import { chromium, Page } from 'playwright'
import { CHAOXING_DIR_URL } from '../consts/index'
import { LoggerManager } from '../runtime/LoggerManager'
import { ConfigManager } from '../runtime/ConfigManager'
import {
  getStorageDirName,
  isFileExist,
  waitForRandomTime,
} from '../utils'
import { DataManager } from '../runtime/DataManager'

async function usePasswordLogin(page: Page, phone: string) {
  if (!DataManager.Instance.password) {
    LoggerManager.Instance.error('请提供密码')
    return
  }

  await page.goto('https://passport2.chaoxing.com/login')

  await page.waitForLoadState('domcontentloaded')

  await page.getByPlaceholder('手机号/超星号').fill(phone)

  await page
    .getByPlaceholder('学习通密码')
    .fill(DataManager.Instance.password)

  await page
    .getByRole('button', {
      name: '登录',
    })
    .click()
  try {
    // 2. 使用 Promise.race 监听两种可能的结果
    await Promise.race([
      // 情况 A：发现错误提示元素（设置一个较短的超时, 比如 3 秒）
      page
        .waitForSelector('.err-tip', {
          state: 'visible',
          timeout: 10000,
        })
        .then(() => 'error')
        .catch(() => null),

      // 情况 B：监听到跳转成功
      page
        .waitForURL(
          /^https:\/\/i\.mooc\.chaoxing\.com\/space\/index\?.*$/,
          { timeout: 60000 },
        )
        .then(() => 'success'),
    ]).then(async (result) => {
      if (result === 'error') {
        const errTip = await page
          .locator('.err-tip')
          .textContent()
        LoggerManager.Instance.error(
          `登录失败, 请检查原因: ${errTip?.trim()}`,
        )
        throw new Error(
          `登录失败, 请检查原因: ${errTip?.trim()}`,
        )
      }

      if (result === 'success') {
        // End of authentication steps.
        LoggerManager.Instance.start(
          '登录成功, 正在保存会话状态...',
        )
        return // 正常结束
      }

      await page.waitForURL(
        (url) => url.href.includes('i.mooc.chaoxing.com'),
        { timeout: 60000 },
      )
      LoggerManager.Instance.start('登录成功...')
    })
  } catch (e: any) {
    // 处理超时或其他意外情况
    LoggerManager.Instance.error(
      `登录响应超时, 请检查网络或验证码状态 ${e.message}`,
    )
    throw new Error(e)
  }
}

async function useVerificationLogin(
  page: Page,
  phone: string,
) {
  await page.goto(
    'https://passport2.chaoxing.com/login?loginType=2',
  )
  await page.waitForLoadState('domcontentloaded')
  await page.getByPlaceholder('手机号码').fill(phone)
  await page
    .getByRole('link', { name: '获取验证码' })
    .click()
  const code = (await p.password({
    message: '验证码',
  })) as string
  await page.getByPlaceholder('验证码').fill(code)

  await page
    .getByRole('button', {
      name: '登录',
    })
    .click()
  try {
    // 2. 使用 Promise.race 监听两种可能的结果
    await Promise.race([
      // 情况 A：发现错误提示元素（设置一个较短的超时, 比如 3 秒）
      page
        .waitForSelector('.err-tip', {
          state: 'visible',
          timeout: 3000,
        })
        .then(() => 'error'),

      // 情况 B：监听到跳转成功
      page
        .waitForURL(
          /^https:\/\/i\.mooc\.chaoxing\.com\/space\/index\?.*$/,
          { timeout: 15000 },
        )
        .then(() => 'success'),
    ]).then(async (result) => {
      if (result === 'error') {
        const errTip = await page
          .locator('.err-tip')
          .textContent()
        LoggerManager.Instance.error(
          `登录失败, 请检查原因: ${errTip?.trim()}`,
        )
        process.exit(0)
      }

      // End of authentication steps.
      LoggerManager.Instance.start(
        '登录成功, 正在保存会话状态...',
      )
    })
  } catch (e) {
    // 处理超时或其他意外情况
    LoggerManager.Instance.error(
      '登录响应超时, 请检查网络或验证码状态',
    )
    process.exit(1)
  }
}

async function useQrCodeLogin(page: Page, phone: string) {
  const savePath = path.resolve(
    CHAOXING_DIR_URL,
    getStorageDirName(phone),
    `${Date.now().toString()}.png`,
  )

  if (
    await isFileExist(
      DataManager.Instance.lastQrCodeImagePath,
    )
  ) {
    fs.unlink(
      path.join(DataManager.Instance.lastQrCodeImagePath),
    )
  }

  await page.goto('https://passport2.chaoxing.com/login')
  await page.waitForLoadState('domcontentloaded')
  await page.getByRole('img').screenshot({
    path: savePath,
  })

  await LoggerManager.Instance.success(
    `二维码已保存到 ${savePath} , 请在三分钟内扫描二维码`,
  )

  await page.waitForSelector('.g_code_over', {
    timeout: 180 * 1000,
  })

  await LoggerManager.Instance.success(
    '扫描成功, 请确认登录',
  )

  try {
    await Promise.race([
      page
        .waitForURL(
          /^https:\/\/i\.mooc\.chaoxing\.com\/space\/index\?.*$/,
          { timeout: 180 * 1000 },
        )
        .then(() => 'success'),
    ]).then(async (result) => {
      DataManager.Instance.lastQrCodeImagePath = savePath

      if (result === 'error') {
        const errTip = await page
          .locator('.err-tip')
          .textContent()
        LoggerManager.Instance.error(
          `登录失败, 请检查原因: ${errTip?.trim()}`,
        )
        process.exit(0)
      }

      // End of authentication steps.
      LoggerManager.Instance.start(
        '登录成功, 正在保存会话状态...',
      )
    })
  } catch (e) {
    // 处理超时或其他意外情况
    LoggerManager.Instance.error(
      '登录响应超时, 请检查网络或验证码状态',
    )
    process.exit(1)
  }
}

export async function enterLoginPage(phone: string) {
  const authPath = path.resolve(
    `${CHAOXING_DIR_URL}`,
    getStorageDirName(phone),
    'auth',
    'user.json',
  )
  const browser = await chromium.launch(
    ConfigManager.Instance.launchOption,
  )
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()
  try {
    LoggerManager.Instance.start('开始登录..')
    if (
      ConfigManager.Instance.launchOption.isLoginWithQrCode
    ) {
      await useQrCodeLogin(page, phone)
    } else if (
      ConfigManager.Instance.launchOption
        .isLoginWithVerification
    ) {
      await useVerificationLogin(page, phone)
    } else {
      await usePasswordLogin(page, phone)
    }

    await fs.mkdir(path.dirname(authPath), {
      recursive: true,
    })
    // 保存状态前最好等待一下网络静默，确保所有 Cookie 都已经 set 完毕
    await page.waitForLoadState('networkidle')
    await page.context().storageState({ path: authPath })

    LoggerManager.Instance.success(
      `状态已保存到 ${authPath}`,
    )
  } catch (error: any) {
    LoggerManager.Instance.error(
      `登录失败: ${error.message}`,
      error,
    )
  } finally {
    await browser.close()
  }
}

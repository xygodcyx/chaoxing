import * as p from '@clack/prompts'

import dotenv from 'dotenv'
import os from 'os'
import path from 'path'

import Action from '../action/Action'
import { CACHE_KEY_ENUM } from '../enum/index'
import { CacheManager } from '../runtime/CacheManager'
import { ConfigManager } from '../runtime/ConfigManager'
import { DataManager } from '../runtime/DataManager'
import { LoggerManager } from '../runtime/LoggerManager'
import type {
  CommandRun,
  CommandUserInfo,
  UserStatus,
} from '../types/index'

import { registerCommand } from './index'
import { getStorageDirName, maskPhone } from '../utils'

export async function initUserStatus(
  commandUser: CommandUserInfo = {
    phone: '',
  },
) {
  if (!commandUser.phone) {
    LoggerManager.Instance.error(`手机号缺失`)
    throw new Error('手机号缺失')
  }

  await CacheManager.Instance.init(commandUser.phone)

  const cacheUser = CacheManager.Instance.load<UserStatus>(
    `${CACHE_KEY_ENUM.USER_STATUS}`,
    {
      info: {
        phone: '',
      },
    },
  )

  if (!commandUser.phone && !cacheUser.info.phone) {
    LoggerManager.Instance.error(`手机号缺失`)
    throw new Error('手机号缺失')
  }

  DataManager.Instance.userStatus = {
    info: {
      phone: commandUser.phone,
    },
    curCourseName:
      commandUser.course ||
      cacheUser.curCourseName ||
      process.env.COURSE ||
      '',
    curTaskName:
      commandUser.task ||
      cacheUser.curTaskName ||
      process.env.TASK ||
      '',
  }

  await CacheManager.Instance.save(
    `${CACHE_KEY_ENUM.USER_STATUS}`,
    DataManager.Instance.userStatus,
  )
}

export function registerRunCommand() {
  registerCommand<CommandRun>(
    'run',
    '按提供的用户参数执行刷课任务（单用户）',
    [
      {
        short: 'p',
        long: 'phone',
        type: 'string',
        description: '手机号',
      },
      {
        short: 'c',
        long: 'course',
        type: 'string',
        description: '要刷的课程, 留空从第一个开始刷',
      },
      {
        short: 't',
        long: 'task',
        type: 'string',
        description: '要刷的章节, 留空从第一个开始刷',
      },
      {
        short: 's',
        long: 'show',
        description:
          '启动图形化浏览器, 查看实时运行状态（需要图形化操作系统）',
      },
      {
        short: 'o',
        long: 'onlyVideo',
        description: '只刷视频不答题',
      },
      {
        short: 'f',
        long: 'force',
        description: '强制从视频开头开始重新刷',
      },
    ],
    async (str) => {
      let phone = str.phone
      DataManager.Instance.onlyVideoMode = str.onlyVideo
      if (!phone) {
        phone = (await p.password({
          message: '请输入手机号',
          // 如果想完全隐藏输入内容（像密码一样）：
          // type: 'password'
          validate(value) {
            if (!value || value.length !== 11)
              return '手机号格式不正确'
          },
        })) as string

        if (!phone) {
          LoggerManager.Instance.error('请提供手机号')
          return
        }
      }

      try {
        const envPath = path.resolve(
          process.env.NODE_ENV === 'production'
            ? os.homedir()
            : '',
          '.chaoxing',
          getStorageDirName(phone),
          '.env',
        )

        dotenv.config({
          path: envPath,
          override: true,
          quiet: true,
        })

        const course = str.course
        const task = str.task
        const show = str.show

        ConfigManager.Instance.launchOption.headless = !show

        ConfigManager.Instance.launchOption.forceStart =
          str.force

        await initUserStatus({
          phone: getStorageDirName(phone),
          course,
          task,
        })

        LoggerManager.Instance.success(
          `${maskPhone(phone)} 用户初始化成功, 开始执行相应的任务`,
        )

        const action = new Action(
          DataManager.Instance.userStatus,
        )

        await action.init()
      } catch (error: any) {
        LoggerManager.Instance.error(
          `任务初始化出错：${error.message}`,
          error,
        )
      }
    },
  )
}

import type { Option } from 'commander'
import os from 'node:os'

import path from 'node:path'
import { program } from 'commander'
import dotenv from 'dotenv'
import { getStorageDirName } from '../utils'
import { registerClearCommand } from './clear'
import { registerLoginCommand } from './login'
import { registerReselectCommand } from './reselect'

import { registerRunCommand } from './run'
import { registerWhereCommand } from './where'

function initCommandInfo() {
  program
    .name('chaoxing')
    .description('自动刷超星网课')
    .version('1.1.5')
}

interface CommandItem {
  short: string
  long: string
  type?: string
  description?: string
}

export function registerCommand<T>(
  name: string,
  description: string,
  commandList: Array<CommandItem>,
  action: (str: T, options: Option) => void,
) {
  dotenv.config({
    path: path.resolve('.env'),
    override: true,
    quiet: true,
  })

  const envPath = path.resolve(
    process.env.NODE_ENV === 'production'
      ? os.homedir()
      : '',
    '.chaoxing',
    getStorageDirName(process.env.PHONE || ''),
    '.env',
  )

  dotenv.config({
    path: envPath,
    override: true,
    quiet: true,
  })
  const command = program.command(name)
  command.description(description)
  commandList.forEach((item) => {
    command.option(
      `-${item.short} --${item.long} ${item.type
        ? `<${item.type}>`
        : ''} `,
      item.description,
    )
  })
  command.action(action)
}

export function registerAllCommand() {
  initCommandInfo()

  registerLoginCommand()
  registerRunCommand()
  registerClearCommand()
  registerWhereCommand()
  registerReselectCommand()

  program.parse()
}

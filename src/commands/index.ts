import { program } from 'commander';
import type { Option } from 'commander';

import { registerRunCommand } from './run';
import { registerClearCommand } from './clear';
import { registerLoginCommand } from './login';
import { registerWhereCommand } from './where';

function initCommandInfo() {
  program
    .name('chaoxing')
    .description('自动刷超星网课')
    .version('0.1.0');
}

interface CommandItem {
  short: string;
  long: string;
  type: string;
  description?: string;
}

export function registerCommand<T>(
  name: string,
  description: string,
  commandList: Array<CommandItem>,
  action: (str: T, options: Option) => void,
) {
  const command = program.command(name);
  command.description(description);
  commandList.forEach(item => {
    command.option(
      `-${item.short} --${item.long} ${item.type ? `<${item.type}>` : ''} `,
      item.description,
    );
  });
  command.action(action);
}

export function registerAllCommand() {
  initCommandInfo();

  registerLoginCommand();
  registerRunCommand();
  registerClearCommand();
  registerWhereCommand();

  program.parse();
}

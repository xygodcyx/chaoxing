import 'dotenv/config';

import { registerAllCommand } from './commands';
import { CacheManager } from './runtime/CacheManager';

async function main() {
  await CacheManager.Instance.init();
  registerAllCommand();
}

main();

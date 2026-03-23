import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import os from 'os';

import { registerAllCommand } from './commands';
import { ENV_FILE_PATH } from './consts';

const localEnv = path.join(process.cwd(), '.env');
const globalEnv = path.join(
  os.homedir(),
  '.chaoxing',
  '.env',
);

[globalEnv, localEnv].forEach(envPath => {
  if (fs.existsSync(envPath)) {
    dotenv.config({
      path: envPath,
      override: true,
      quiet: true,
    });
  }
});

async function main() {
  registerAllCommand();
}

main();

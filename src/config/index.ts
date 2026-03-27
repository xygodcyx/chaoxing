import type { LaunchOptions } from 'playwright';

export default {
  headless: true,
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  timeout: 1000 * 180,
  args: [
    '--disable-blink-features=AutomationControlled', // 移除自动化标记
    '--no-sandbox',
    '--disable-setuid-sandbox',
  ],
} as LaunchOptions;

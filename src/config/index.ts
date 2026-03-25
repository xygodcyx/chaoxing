import type { LaunchOptions } from 'playwright';

export default {
  headless: true,
  slowMo: 100,
  timeout: 1000 * 180,
} as LaunchOptions;

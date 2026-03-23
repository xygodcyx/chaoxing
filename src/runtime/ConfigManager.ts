import type { LaunchOptions } from 'playwright';
import config from '../config';
import Singleton from '../base/Singleton';

export class ConfigManager extends Singleton {
  static get Instance(): ConfigManager {
    return super.GetInstance<ConfigManager>();
  }

  public launchOption: LaunchOptions = config;
}

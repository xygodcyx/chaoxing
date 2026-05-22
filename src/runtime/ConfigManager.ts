import type { LaunchOptions } from 'playwright';
import config from '../config';
import Singleton from '../base/Singleton';

interface Options extends LaunchOptions {
  isLoginWithQrCode?: boolean;
  isLoginWithVerification?: boolean;
  forceStart?: boolean;
}

export class ConfigManager extends Singleton {
  static get Instance(): ConfigManager {
    return super.GetInstance<ConfigManager>();
  }

  public launchOption: Options = {
    ...config, args: [
      '--mute-audio',  // Chrome 启动参数，静音整个浏览器
      '--autoplay-policy=no-user-gesture-required'
    ]
  };
}

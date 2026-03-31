# Chaoxing

Chaoxing (超星静默自动刷课答题) - 隐私与效率并重的自动化工具。

本项目专为超星（学习通）平台设计，通过 Playwright 自动化技术实现静默刷课与智能答题。采用高度脱敏的存储机制，确保账号隐私安全。

## 核心特性

- 隐私保护：用户数据 MD5 哈希存储，手机号与日志全掩码处理。
- 字体解密：集成字体混淆解决引擎。
- AI 智能：原生集成 DeepSeek-V3 模型支持逻辑推理答题。
- 沙盒架构：支持多账号并发，配置与 Cookie 物理隔离。

## 安装指南

### 环境要求

- Node.js: v18.0.0 或更高版本。
- 操作系统: Windows, macOS, Linux (需安装 Playwright 依赖库)。

### 安装命令

```bash
# 全局安装
npm install -g chaoxing

# 安装浏览器驱动
npx playwright install chromium
```

## 配置系统

程序采用五级优先级加载策略：

1. CLI 命令行参数
2. Local Cache (上次刷课进度)
3. 项目局部 .env
4. Private .env (推荐：位于 ~/.chaoxing/[hash]/.env)
5. Global .env (全局通用配置)

### .env 模板

```env
PHONE=13800000000
PASSWORD=your_password
DEEPSEEK_API_KEY=sk-xxxxxx
COURSE=国学智慧
```

## 命令行手册

### run 执行任务

```bash
# 基本启动
chaoxing run
# 指定课程并开启可视化
chaoxing run -c "电影艺术" -s
# 只刷视频
chaoxing run -o
```

| 参数 | 缩写 | 类型 | 描述 |
| --- | --- | --- | --- |
| --phone | -p | string | 指定手机号 |
| --course | -c | string | 课程名 |
| --task | -t | string | 指定章节开始位置 |
| --show | -s | boolean | 显示浏览器界面 |
| --onlyVideo | -o | boolean | 只刷视频不答题 |

### 管理命令

- login: 触发登录流程（支持 -q 二维码, -v 验证码）。
- clear: 清除特定账号 (-p) 或所有账号 (-a) 缓存。
- where: 输出用户路径 (-p) 或全局路径 (-g)。
- reselect: 重新爬取课程列表。

## 避坑指南

- 滑块验证码：若程序卡住，请带上 -s 参数手动验证。
- AI Key 缺失：未配置 Key 将自动跳过章节测验。
- Linux 运行：无头模式运行请确保安装相关依赖。

## 许可协议

本项目采用 CC BY-NC-SA 4.0 协议发布。

Copyright (c) 2026 xygodcyx. All rights reserved.

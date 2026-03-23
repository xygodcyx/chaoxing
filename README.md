# 🚀 Chaoxing

[![Author](https://img.shields.io/badge/author-xygodcyx-orange)](https://github.com/xygodcyx)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![NPM Version](https://img.shields.io/npm/v/chaoxing)](https://www.npmjs.com/package/chaoxing)

> **⚠️ 严正声明**：本项目由 **xygodcyx** 原创开发，仅供技术学习。**严禁商业用途**。使用者需自行承担账号风险及法律责任。

---

## ✨ 功能特性

* **全自动化执行**：支持登录状态持久化，避免频繁验证。
* **可视化进度**：清晰的任务进度条，实时掌握刷课动态。
* **图形化调试**：支持通过 `-s` 参数唤起浏览器界面，直观观察运行过程。
* **智能配置系统**：基于**就近原则**加载 `.env`，并支持命令行参数实时覆盖。

---

## 🔐 配置优先级与 `.env`

工具通过 `ConfigManager` 和环境变量共同管理配置。你可以通过创建 `.env` 文件简化操作：

### 1. 优先级规则

当参数冲突时，程序按以下顺序采纳（由高到低）：

1. **Command Line** (终端输入的 `-p`, `-w`, `-s` 等)
2. **Local Cache** (仅 `run` 命令会回退到上一次的进度记录)
3. **Local `.env`** (执行目录下的 `.env`)
4. **Global `.env`** (`~/.chaoxing/.env`)

### 2. `.env` 配置示例

```env
PHONE=138xxxxxxxx
PASSWORD=your_password
COURSE=高等数学
TASK=第一章
```

---

## 🛠 命令行交互 (CLI)

### 1. 登录初始化 `login`

首次使用或状态失效时执行。

| 参数 | 缩写 | 类型 | 描述 |
| :--- | :--- | :--- | :--- |
| `--phone` | `-p` | string | 手机号 |
| `--password` | **`-w`** | string | 登录密码 |
| `--show` | `-s` | boolean | **显示浏览器界面**（调试验证码必用） |

### 2. 开始任务 `run`

执行核心刷课逻辑。

| 参数 | 缩写 | 类型 | 描述 |
| :--- | :--- | :--- | :--- |
| `--phone` | `-p` | string | 指定手机号 |
| `--course` | `-c` | string | 课程名（留空则读取进度或首门） |
| `--task` | `-t` | string | 章节名（留空则从断点或首节开始） |
| `--show` | `-s` | boolean | **可视化运行** |

### 3. 辅助指令

* **`chaoxing where`**: 快速查看工具的运行根目录。
* **`chaoxing clear`**: 清理缓存。使用 `-a` 清空全部，使用 `-p <phone>` 清除指定账号。

---

## ⚠️ 避坑指南

1. **验证码处理**：超星触发滑块验证时，请务必带上 `-s` 参数运行，在弹出的浏览器窗口中手动完成验证。
2. **多账号管理**：程序会根据手机号在 `~/.chaoxing/` 下生成独立的子目录，互不干扰。
3. **环境要求**：使用 `-s` 模式需要具有图形界面的操作系统（Windows/macOS 或已配置 X11 的 Linux）。在纯 CLI 服务器上建议保持默认 Headless 模式。

---

## 📄 许可协议

本项目采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 协议发布。

**Copyright (c) 2026 xygodcyx.**

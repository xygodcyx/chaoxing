
# 🚀 Chaoxing (超星静默自动刷课答题)

[![Author](https://img.shields.io/badge/author-xygodcyx-orange)](https://github.com/xygodcyx)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![NPM Version](https://img.shields.io/npm/v/chaoxing)](https://www.npmjs.com/package/chaoxing)
[![Build Tool: tsup](https://img.shields.io/badge/build-tsup-yellow)](https://tsup.egoist.dev/)

> **⚠️ 严正声明**：本项目由 **xygodcyx** 原创开发，仅供技术学习与交流。**严禁用于任何商业用途**。本项目已实现高度的隐私脱敏，保护用户信息安全。

---

## ✨ 功能特性

* **🔐 极致隐私保护**：
  * **目录脱敏**：用户存储目录采用 `MD5` 哈希加固，防止通过文件夹名泄露手机号。
  * **隐身输入**：终端所有手机号、密码输入均采用 `Hidden` 模式，即使身后有人也无法窥屏。
  * **日志脱敏**：运行时日志自动对敏感信息进行遮罩处理。
* **字体解密**：通过字形 Hash 指纹识别，完美还原网页乱码。
* **🤖 AI 智能答题**：深度集成 **DeepSeek-V3** 模型，支持单选、多选、判断题高准度自动填充。
* **多用户沙盒**：基于哈希隔离的独立存储机制，支持多账号无缝切换。

---

## 📅 项目路线图 (TODO List)

### ✅ 已完成功能 (Completed)

* [x] **自动刷课模块**：全自动静默刷课，无需人工干预
* [x] **自动答题模块**：集成 DeepSeek API，实现章节测验自动检索与填写。
* [x] **隐私存储系统**：实现基于手机号哈希的目录名加密及配置隔离。
* [x] **字体解密引擎**：攻克 `font-cxsecret` 乱码难题。
* [x] **多级配置系统**：支持 Private Env，允许为不同账号配置独立的 API Key。

### 🚧 开发中 (In Progress)

* [ ] **验证码自动化**：探索接入轻量级本地 CNN 识别滑块验证码。

---

## 🔐 配置优先级与隐私

程序采用**就近原则**加载配置。为了保护主账号隐私，建议将敏感 Key 放在 `Private Env` 中。

**加载优先级（由高到低）：**

1. **CLI Arguments**：终端输入的 `-p --phone`, `-w --password` 等。
2. **Local Cache**：`~/.chaoxing/[hash]/cache/` 下的执行进度。
3. **Local `.env`**：当前执行目录（运行命令时的目录）下的配置文件。
4. **Private `.env`**：**[推荐]** 位于 `~/.chaoxing/[hash]/.env`，仅对该账号生效。
5. **Global `.env`**：位于 `~/.chaoxing/.env`，全局兜底配置。

---

## 🛠 命令行交互 (CLI)

### 1. 启动任务 `run`

当不带参数启动时，程序会通过加密提示符请求手机号。

```bash
# 自动读取缓存或提示输入 (密码模式输入)
chaoxing run

# 指定课程并开启可视化
chaoxing run -c "电影艺术" -s
```

### 2. 管理命令

| 命令 | 描述 |
| :--- | :--- |
| `login` | 登录并持久化 Cookie 到哈希目录 |
| `clear` | 清除缓存（支持 `-p` 指定用户或 `-a` 全部清除） |
| `where` | 查看当前用户的运行时目录（自动计算哈希路径） |
| `reselect` | 强制重新爬取课程列表 |

---

## ⚠️ 避坑指南

1. **关于加密目录**：若需手动编辑某个账号的 `Private .env`，请先运行 `chaoxing where -p [手机号]` 获取对应的哈希路径。
2. **headless 模式**：若在 Headless 模式下元素定位失败，请尝试带上 `-s` 参数观察是否触发了滑块验证码。
3. **环境要求**：Node.js v18+，生产环境建议使用编译后的 `dist` 代码以获得最佳性能。

---

## 📄 许可协议

本项目采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 协议发布。

**Copyright (c) 2026 xygodcyx.**

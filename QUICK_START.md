# 快速开始指南

## 5 分钟快速上手

### 步骤 1: 安装扩展

1. 访问 [GitHub Releases](https://github.com/CHOSENX-GPU/ai-roundtable/releases)
2. 下载 `ai-roundtable-vX.X.X.zip`
3. 解压到文件夹
4. 打开 Chrome，进入 `chrome://extensions/`
5. 开启右上角的「开发者模式」
6. 点击「加载已解压的扩展程序」
7. 选择解压后的文件夹

### 步骤 2: 打开 Web App

本地运行：

```bash
cd web
npm install
npm run dev
```

在 Chrome 中打开提示的本地地址。

### 步骤 3: 完成配对

1. 在 `chrome://extensions/` 复制 Extension ID
2. 打开扩展侧边栏，获取 6 位配对码
3. 在 Web App 的配对弹窗中输入 Extension ID 与配对码

### 步骤 4: 登录 AI 平台

在新标签页中打开并登录以下 AI 平台（至少 2 个）：

| AI | 网址 |
|---|------|
| Claude | https://claude.ai |
| ChatGPT | https://chatgpt.com |
| Gemini | https://gemini.google.com |
| DeepSeek | https://chat.deepseek.com |
| Kimi | https://kimi.com |
| 豆包 | https://www.doubao.com/chat/ |
| ChatGLM | https://chatglm.cn |

### 步骤 5: 开始使用

1. 在 Web App 中选择目标 AI
2. 输入消息并发送
3. 查看各 AI 的回复与日志

## 基础用法

### 多目标发送

```
1. 勾选 2-3 个 AI
2. 输入问题
3. 点击发送
```

### 互评 (/mutual)

```
1. 先让多个 AI 回复
2. 点击 /mutual 或输入 /mutual
3. AI 互相评价
```

### 交叉引用 (/cross)

```
/cross @Claude <- @ChatGPT 请总结上面的要点
```

### 讨论模式

1. 切换到「讨论」模式
2. 选择 2 个 AI
3. 输入主题并开始讨论

## 常见问题

### Q: Web App 显示未连接？
**A:** 确认 Extension ID 正确、配对码有效，并刷新 AI 页面。

### Q: AI 状态没有更新？
**A:** 刷新已打开的 AI 页面或重新打开 Web App。

## 需要帮助？

- [完整文档](README.md)
- [报告问题](https://github.com/CHOSENX-GPU/ai-roundtable/issues)

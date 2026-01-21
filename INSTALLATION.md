# 安装说明

AI 圆桌由两个部分组成：Chrome 扩展（负责操控 AI 网页）+ Web App（操作界面）。

## 1. 安装 Chrome 扩展

### 方式一：Release 包安装（推荐）

1. 前往 [Releases 页面](https://github.com/CHOSENX-GPU/ai-roundtable/releases)
2. 下载最新版本的 `ai-roundtable-vX.X.X.zip`
3. 解压到任意文件夹
4. 打开 Chrome，进入 `chrome://extensions/`
5. 开启右上角「开发者模式」
6. 点击「加载已解压的扩展程序」
7. 选择解压后的文件夹

### 方式二：开发者模式安装

1. 下载或克隆本仓库
2. 打开 Chrome，进入 `chrome://extensions/`
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择扩展文件夹

## 2. 运行 Web App

### 本地运行（开发/自托管）

```bash
cd web
npm install
npm run dev
```

启动后打开控制台提示的地址（通常是 `http://localhost:5173`）。

### 生产部署（可选）

```bash
cd web
npm install
npm run build
```

构建产物在 `web/dist/`，可部署到静态站点。若更换域名，请确保扩展允许该域名与其建立连接。

## 3. 配对扩展与 Web App

1. 打开 Chrome 扩展侧边栏，获取 6 位配对码
2. 在 `chrome://extensions/` 中复制 Extension ID
3. 在 Web App 的配对弹窗中输入 Extension ID 与配对码完成连接

## 4. 安装后检查

- 打开并登录要使用的 AI 平台
- 刷新已打开的 AI 页面
- Web App 中 AI 状态显示为已连接

## 支持的 AI 平台

- [Claude](https://claude.ai)
- [ChatGPT](https://chatgpt.com)
- [Gemini](https://gemini.google.com)
- [DeepSeek](https://chat.deepseek.com)
- [Kimi](https://kimi.com)
- [豆包](https://www.doubao.com/chat/)
- [智谱清言](https://chatglm.cn)

## 更新扩展

1. 下载新版本的 ZIP 文件并解压
2. 在 `chrome://extensions/` 中移除旧版本
3. 加载新解压的扩展文件夹
4. 刷新所有 AI 页面

## 常见问题

### Q: 为什么安装后无法连接 AI 页面？
**A:** 安装或更新扩展后，需要刷新所有已打开的 AI 页面。

### Q: 如何确认扩展已正确安装？
**A:** 
1. Chrome 工具栏能看到扩展图标
2. Web App 中的 AI 状态显示为已连接

## 隐私说明

- 扩展与 Web App 在本地运行，不向任何服务器发送数据
- 不收集使用数据，不依赖第三方服务
- 卸载扩展即可清除本地存储

## 需要帮助？

- [GitHub Issues](https://github.com/CHOSENX-GPU/ai-roundtable/issues)
- [完整文档](README.md)

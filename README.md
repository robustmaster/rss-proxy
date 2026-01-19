# 🍎 RSS Proxy & Detector

**基于 Cloudflare Workers 的极简 RSS 嗅探与代理工具。**

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/robustmaster/rss-proxy)

> [!CAUTION]
> ** 部署时请务必修改 TOKEN，或部署后前往 Cloudflare 控制台修改环境变量 `TOKEN`。 **

---

## 🎯 使用场景 (Use Cases)

该工具主要解决以下三类核心需求：

1. **RSS 源嗅探 (RSS Detection)**
   - **痛点**：很多网站（如个人博客、新闻站）其实支持 RSS，但页面上没有明显的图标。
   - **方案**：直接输入网站域名，该工具会自动扫描 HTML 代码中的 `link` 标签及常见路径（`/feed`, `/rss`），帮你找回隐藏的订阅链接。

2. **跨越网络限制 (Access Proxy)**
   - **痛点**：某些 RSS 源所在的服务器访问不稳定或被屏蔽，导致阅读器无法更新。
   - **方案**：利用 Cloudflare 全球分布的边缘节点作为跳板，通过 Worker 代理请求，实现订阅源的稳定抓取。

3. **统一鉴权管理 (Private Gateway)**
   - **痛点**：不希望自己发现的优质源或代理资源被他人公开滥用。
   - **方案**：所有生成的代理链接都强制绑定你的私密 `TOKEN`。只有通过验证的请求才会被转发，确保你的资源安全。

---

## ✨ 项目特性 (Features)

* 🚀 **极简部署**：单文件架构，无需服务器，一键部署在 Cloudflare Workers。
* 🔍 **智能嗅探**：输入网站域名，自动探测页面内隐藏的 RSS/Atom 订阅源。
* 🛡️ **私密安全**：内置 Token 鉴权机制，防止你的代理流量被盗用。
* 🌙 **优雅 UI**：遵循 Apple 设计规范，完美适配系统深色模式（Dark Mode）。
* 📱 **极致交互**：醒目的顶部通知提醒，支持历史记录，一键点击复制代理链接。
* ⚡ **轻量高效**：代码精简，响应迅速，基于浏览器原生的 Fetch 和 LocalStorage。

---

## 🛠️ 部署步骤 (Installation)

### 1. 创建 Worker
登录 [Cloudflare 控制台](https://dash.cloudflare.com/)，创建一个新的 **Worker**。

### 2. 粘贴代码
将项目中的 `index.js` 代码全部复制并粘贴到 Cloudflare 的编辑器中，覆盖原有的代码。

### 3. 设置变量 (关键)
为了确保安全，你必须设置一个访问令牌：
1. 进入 Worker 的设置界面：**Settings** -> **Variables**。
2. 在 **Environment Variables** 处点击 **Add variable**。
3. 变量名填写为 `TOKEN`。
4. 变量值填写为你自定义的私密字符串（如 `my_private_key_123`）。
5. 点击 **Save and deploy**。

### 4. 绑定域名 (可选)
为了更好的体验，你可以在 **Settings** -> **Triggers** 中绑定你自己的自定义域名。

---

## 📖 使用指南 (Usage)

1. **访问首页**：在浏览器打开你的域名。
2. **解锁工具**：输入你刚才设置的 `TOKEN`。
3. **嗅探源**：输入想要抓取的网站域名，点击“查找订阅源”。
4. **获取链接**：在结果列表中点击你想要的源，系统会自动生成带 Token 的代理链接并复制。
5. **添加到阅读器**：将复制好的链接直接粘贴到阅读器工具中即可。

---

## ⚙️ 代理链接格式 (Proxy URL Format)

生成后的链接通常如下所示：
`https://your-worker-domain.com/https://target-site.com/feed.xml?token=你的TOKEN`

---

## 📜 开源协议 (License)

本项目基于 **MIT License** 开源。

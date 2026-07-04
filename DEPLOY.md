# 部署说明 · 提问火花 PromptSpark

本项目结构非常简单，部署也简单：

```
aiprompt/
├── index.html        # 前端（打开即用，零构建）
├── api/generate.js   # Vercel 无服务函数：Grok(xAI) 代理，持有 API Key
├── vercel.json       # Vercel 配置（函数超时 30 秒）
└── README.md / DEPLOY.md
```

推荐 **Vercel** 一站式部署（静态页 + AI 后端一起搞定）。以下是完整流程。

---

## 一、首次部署到 Vercel（从零开始，约 5 分钟）

### 1. 登录 Vercel

打开 <https://vercel.com>，用 **GitHub 账号**登录（这样它能直接读到你的仓库）。

### 2. 导入仓库

1. 点右上角 **Add New… → Project**
2. 在仓库列表里找到 `aiprompt`，点 **Import**
   - 如果列表里没有，点 **Adjust GitHub App Permissions**，授权 Vercel 访问该仓库
3. 配置页什么都不用改（本项目无需构建命令、无需输出目录），直接看下一步的环境变量

### 3. 配置环境变量（AI 生成模式的关键）

展开 **Environment Variables**，添加：

| Key（变量名，上面的框） | Value（变量值，下面的框） | 必填 |
|---|---|---|
| `XAI_API_KEY` | 你的 xAI 密钥（`xai-` 开头那一长串） | ✅ 必填 |
| `XAI_MODEL` | `grok-4`（不填默认就是它，可换 `grok-3` 等） | 可选 |

> ⚠️ 常见错误：**Key 填的是变量名，不是你的密钥**。
> 上面的框只能填 `XAI_API_KEY` 这 11 个字符；`xai-...` 那串填在下面的 Value 框里。
> 变量名只允许字母/数字/下划线，填错会报 "invalid characters"。

### 4. 部署

点 **Deploy**，等约 1 分钟出现烟花动画即成功。
点 **Continue to Dashboard** 进入项目主页，顶部就是你的网址：

```
https://<你的项目名>.vercel.app
```

**电脑和手机用任意浏览器打开这个网址即可使用**，也可以直接发给别人。

### 5. 设置生产分支（如有需要）

仓库有两个分支：`main`（主分支）和 `claude/dev-per-specification-7bxd3r`（开发分支），内容保持同步。

- Vercel 导入时会默认跟踪一个分支（通常是 `main`，若当时只有 dev 则是 dev）
- 查看/修改：项目 **Settings → Git → Production Branch**
- 建议设为 `main`，改完后需手动 Redeploy 一次（见下）

---

## 二、日常更新：代码改了之后怎么重新部署？

**不需要任何手动操作。** Vercel 与 GitHub 是联动的：

1. 只要有新代码 push 到生产分支，Vercel **自动**开始构建部署
2. 到项目的 **Deployments** 页可以看到进度（Building → Ready）
3. 变成 Ready 后，刷新你的网址就是新版
   - 建议强制刷新：电脑 `Ctrl+Shift+R`（Mac `Cmd+Shift+R`），手机用无痕窗口或清缓存

### 手动触发重新部署（两种情况需要）

- **改了环境变量之后**（环境变量只在构建时注入，改完必须重部署才生效）
- 想强制刷新一次线上版本

操作：**Deployments → 最新一条右侧 ⋯ → Redeploy → 确认**。

---

## 三、验证部署是否成功

1. **基础功能**：打开网址 → 点分类标签切换 → 点「🔄 换一批」→ 点「📋 复制」，全部应正常（这些不依赖 API Key）
2. **AI 生成模式**：打开「✨ AI 生成模式」开关 → 点「🔄 换一批」：
   - 底部弹出 **「✨ Grok 实时生成了一批新题」**，卡片带「✨ AI 生成」角标 → ✅ 成功
   - 弹出 **「AI 不可用，已切换本地题库」** → ❌ 后端没通，看下面排查

### AI 模式排查

| 现象/日志 | 原因 | 解决 |
|---|---|---|
| 提示"AI 不可用" | 环境变量没配或没生效 | 确认 Key 名是 `XAI_API_KEY`，改后 **Redeploy** |
| 函数日志报 `服务端未配置 XAI_API_KEY` | 同上 | 同上 |
| 函数日志报 `xAI 返回 401` | 密钥无效/已删除 | 去 xAI 控制台重新生成，更新 Value 后 Redeploy |
| 函数日志报 `xAI 返回 404` | 模型名不对 | `XAI_MODEL` 改成你账号可用的模型名 |
| 函数日志报 `xAI 返回 429` | 限流/额度用完 | 查 xAI 账户额度 |

函数日志位置：Vercel 项目 → **Logs**（或 Deployments → 点开某次部署 → Functions），筛选 `/api/generate`。

---

## 四、可选项

### 绑定自己的域名

项目 **Settings → Domains → Add**，输入你的域名，按提示到域名服务商处加一条 CNAME 记录指向 `cname.vercel-dns.com` 即可。

### 前端单独放 GitHub Pages（不推荐，除非有特殊需要）

GitHub Pages 只能托管静态文件，跑不了 `api/generate.js`。做法：

1. 仓库 **Settings → Pages**，Source 选 `main` 分支根目录，得到 `https://<用户名>.github.io/aiprompt/`
2. AI 模式要想能用，把 `index.html` 里的 `AI_ENDPOINT` 从 `"/api/generate"` 改成你 Vercel 站点的完整地址：
   ```js
   const AI_ENDPOINT = "https://<你的项目名>.vercel.app/api/generate";
   ```
3. 不改的话，AI 模式会自动降级回本地题库（不报错，但不是真 AI 生成）

### 本地打开（不部署）

直接双击 `index.html` 就能用本地题库全部功能；AI 模式在本地会自动降级（没有后端）。

---

## 五、安全注意事项

- **API Key 只放 Vercel 环境变量**，永远不要写进 `index.html` 或任何提交到仓库的文件
- Key 若曾在截图/聊天中暴露过，请到 xAI 控制台 **删除重建**，再更新 Vercel 的 Value 并 Redeploy
- `api/generate.js` 已做输入长度限制与错误兜底，正常无需改动

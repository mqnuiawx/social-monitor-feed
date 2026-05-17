# 云端自动抓取设计文档

**日期**: 2026-05-17  
**项目**: social-monitor  
**目标**: 将现有依赖本机 Chrome CDP Proxy 的抓取方案，迁移到云服务器 Docker 容器自动定时运行

---

## 背景

现有 `monitor.mjs` 通过本机 `localhost:3456` CDP Proxy 驱动 Chrome 抓取小红书、微博内容。该方案需要本机常驻 Chrome，无法实现全自动无人值守运行。目标是将抓取端迁移到云服务器，每天定时自动抓取并推送数据到 GitHub。

---

## 整体架构

```
云服务器 (Ubuntu + Docker)
│
├── docker-compose.yml
│
└── [容器: social-monitor]
    ├── Node.js 20 + Playwright (Chromium)
    ├── scripts/monitor.mjs     ← 改造：CDP → Playwright API
    ├── scripts/publish.mjs     ← 不变：git push 到 GitHub
    ├── login.mjs               ← 新增：首次登录工具
    ├── cron.sh                 ← 新增：定时触发入口
    │
    └── Volume 挂载
        ├── /app/cookies/       ← 持久化登录 Cookie
        └── /app/data/          ← 抓取结果临时存储

GitHub (social-monitor-feed)
    └── data/                   ← 每次抓完自动 push
```

**抓取平台**：小红书、微博（移除知乎）

**定时计划**：每天 08:45 触发，串行抓取两个平台后合并推送

---

## 代码改造范围

### monitor.mjs 改动

**删除**：
- `checkDependencies()` 整个函数
- `cdpGet()` / `cdpPost()` 两个工具函数
- `WEB_ACCESS_DIR` 相关引用

**替换**：
- `fetchWithCDP()` → `fetchWithPlaywright()`，实现逻辑不变：
  - 启动 Chromium 无头模式
  - 从 `cookies/<platform>.json` 加载 Cookie
  - 打开页面、等待加载、执行 DOM 提取脚本（`page.evaluate()`）
  - 滚动加载更多（`page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))`）
  - `enrichWithSummary()` 内的详情页抓取同样改用 Playwright page
  - 抓取完成后将最新 Cookie 回写文件，维持登录态

**完全不动**：
- `getExtractScript()` — DOM 提取脚本，Playwright `page.evaluate()` 直接兼容
- `filterByTimeRange()` / `parseTimeText()` — 时间过滤逻辑
- `generateInsight()` / `generateReport()` / `saveResults()` — 数据处理
- `publish.mjs` — 发布逻辑全部保留

### 新增文件

| 文件 | 说明 |
|------|------|
| `Dockerfile` | Node.js 20 + Playwright + Chromium，基于 `mcr.microsoft.com/playwright:v1.x-noble` |
| `docker-compose.yml` | 容器定义，挂载 cookies/ 和 data/ 两个 Volume，注入 GITHUB_TOKEN 环境变量 |
| `cron.sh` | 容器启动时在后台运行，08:45 触发抓取 + 发布 |
| `login.mjs` | 首次登录工具，启动有头 Chromium，每步截图到 `/tmp`，支持 `docker cp` 查看进度 |

---

## 文件结构

```
social-monitor/
├── Dockerfile
├── docker-compose.yml
├── cron.sh
├── login.mjs
├── scripts/
│   ├── monitor.mjs         ← 改造
│   ├── publish.mjs         ← 不动
│   ├── monitor-all.mjs     ← 不动
│   └── ...
├── cookies/                ← Volume 挂载（不提交 git，加入 .gitignore）
│   ├── xiaohongshu.json
│   └── weibo.json
├── data/                   ← Volume 挂载（临时存储）
└── config.json
```

---

## 部署流程

```bash
# 1. 服务器上拉取代码
git clone git@github.com:<user>/social-monitor-feed.git
cd social-monitor-feed/social-monitor

# 2. 配置 GitHub Token
echo "GITHUB_TOKEN=ghp_xxx" > .env

# 3. 构建并启动容器
docker compose up -d

# 4. 首次登录小红书
docker exec -it social-monitor node login.mjs xiaohongshu
# 根据截图提示完成登录，Cookie 自动保存到 cookies/xiaohongshu.json

# 5. 首次登录微博
docker exec -it social-monitor node login.mjs weibo

# 6. 验证抓取是否正常
docker exec -it social-monitor node scripts/monitor.mjs 爱奇艺 xiaohongshu 1h
```

---

## 登录维护

- Cookie 存储在 Docker Volume，容器重建不丢失
- Cookie 过期时（通常数周到数月），重新执行 `docker exec -it social-monitor node login.mjs <platform>` 即可
- `login.mjs` 每步操作后截图保存到 `/tmp/login-step-N.png`，通过 `docker cp social-monitor:/tmp/login-step-1.png .` 拉到本地查看

---

## 错误处理

- 抓取失败（Cookie 过期、网络超时）：写入错误日志，不中断另一个平台的抓取
- 推送失败（GitHub Token 过期、网络问题）：保留本地 data/ 文件，下次运行时重试
- 容器异常重启：cron.sh 随容器启动自动恢复，不影响下次定时任务

---

## 不在本次范围内

- 微信/抖音等其他平台
- 抓取失败告警通知（钉钉/微信）
- 多关键词并发抓取
- Web 管理界面

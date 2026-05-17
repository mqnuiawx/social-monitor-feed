# Cloud Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 social-monitor 的抓取端从本机 Chrome CDP Proxy 迁移到云服务器 Docker 容器，每天 08:45 自动抓取小红书和微博并推送到 GitHub。

**Architecture:** 单容器方案：Node.js 20 + Playwright Chromium 无头浏览器跑在 Docker 内，Cookie 用 Volume 持久化，cron.sh 随容器启动并在 08:45 触发 monitor-all.mjs，抓完后 publish.mjs 自动 git push 到 social-monitor-feed 仓库。

**Tech Stack:** Node.js 20, Playwright (chromium), Docker, docker-compose, bash cron loop

---

## 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 修改 | `scripts/monitor.mjs` | 删除 CDP 依赖，新增 `fetchWithPlaywright()` |
| 修改 | `config.json` | 禁用知乎平台，tasks 列表移除知乎 |
| 新增 | `Dockerfile` | Node.js 20 + Playwright + Chromium |
| 新增 | `docker-compose.yml` | 容器定义 + Volume + 环境变量 |
| 新增 | `cron.sh` | 容器启动脚本，08:45 定时触发 |
| 新增 | `login.mjs` | 首次登录工具，截图辅助 |
| 修改 | `.gitignore` | 忽略 cookies/ 和 .env |

---

## Task 1: 修改 config.json，禁用知乎

**Files:**
- Modify: `config.json`

- [ ] **Step 1: 禁用知乎平台**

将 `config.json` 中 `platforms.zhihu.enabled` 改为 `false`，同时把 tasks 里的 `platforms` 数组中的 `"zhihu"` 移除：

```json
{
  "version": "1.0.0",
  "defaultKeyword": "爱奇艺",
  "tasks": [
    {
      "id": "task_1776739782234",
      "name": "每日爱奇艺监控",
      "keywords": ["爱奇艺"],
      "platforms": ["xiaohongshu", "weibo"],
      "schedule": "45 8 * * *",
      "timeRange": "24h",
      "cronId": "f72aabdf",
      "enabled": true,
      "createdAt": "2026-04-21T02:49:42.234Z",
      "lastRun": null,
      "updatedAt": "2026-05-17T00:00:00.000Z"
    }
  ],
  "platforms": {
    "xiaohongshu": {
      "name": "小红书",
      "searchUrl": "https://www.xiaohongshu.com/search_result?keyword={keyword}&source=web_search_result_notes&sortType=time",
      "enabled": true,
      "requiresLogin": true,
      "useCDP": false
    },
    "weibo": {
      "name": "微博",
      "searchUrl": "https://s.weibo.com/weibo?q={keyword}",
      "enabled": true,
      "requiresLogin": true,
      "useCDP": false
    },
    "zhihu": {
      "name": "知乎",
      "searchUrl": "https://www.zhihu.com/search?type=content&q={keyword}",
      "enabled": false,
      "requiresLogin": false,
      "useCDP": false
    }
  },
  "settings": {
    "defaultKeyword": "爱奇艺",
    "defaultPlatform": "xiaohongshu",
    "defaultTimeRange": "24h",
    "maxResultsPerPlatform": 50,
    "scrollDelay": 800,
    "retryAttempts": 3,
    "maxSummaryFetch": 5,
    "summaryFetchDelay": 1200,
    "enableDeduplication": true,
    "saveHistory": true,
    "historyPath": "./data/"
  }
}
```

- [ ] **Step 2: 提交**

```bash
cd ~/social-monitor-feed
git add social-monitor/config.json
git commit -m "config: disable zhihu, update schedule to 08:45"
```

---

## Task 2: 改造 monitor.mjs，替换 CDP 为 Playwright

**Files:**
- Modify: `scripts/monitor.mjs`

- [ ] **Step 1: 在文件顶部替换 import 和常量**

将文件开头的 CDP 相关 import 和常量全部替换：

```js
#!/usr/bin/env node

/**
 * Social Monitor - 核心监控脚本
 * 通过 Playwright 无头 Chromium 抓取社交媒体内容
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SKILL_DIR = join(__dirname, '..');

// Cookie 存储目录（Volume 挂载点）
const COOKIES_DIR = join(SKILL_DIR, 'cookies');

// 加载配置
const configPath = join(SKILL_DIR, 'config.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));
```

- [ ] **Step 2: 修改 monitor() 函数，移除 checkDependencies 调用**

找到 `monitor()` 函数中的 `await checkDependencies();` 这一行，删除它。同时将 `fetchWithCDP` 调用改为 `fetchWithPlaywright`：

```js
async function monitor(keyword, platform, timeRange) {
  console.log(`🚀 开始监控任务...`);
  console.log(`📌 关键词: ${keyword}`);
  console.log(`📱 平台: ${platform}`);
  console.log(`⏰ 时间范围: ${timeRange}`);

  // 获取平台配置
  const platformConfig = config.platforms[platform];
  if (!platformConfig || !platformConfig.enabled) {
    throw new Error(`平台 ${platform} 未配置或已禁用`);
  }

  // 构建搜索 URL
  const searchUrl = platformConfig.searchUrl.replace('{keyword}', encodeURIComponent(keyword));
  console.log(`🔗 搜索 URL: ${searchUrl}`);

  // 执行抓取
  const results = await fetchWithPlaywright(searchUrl, platform, timeRange);

  // 保存结果
  const outputFile = await saveResults(keyword, platform, timeRange, results);

  // 生成报告
  const report = generateReport(keyword, platform, timeRange, results);

  console.log(`\n✅ 监控完成！`);
  console.log(`📊 找到 ${results.length} 条内容`);
  console.log(`💾 数据已保存: ${outputFile}`);

  return { report, results, outputFile };
}
```

- [ ] **Step 3: 删除旧函数，新增 Playwright 工具函数**

删除以下函数（整体删除）：
- `checkDependencies()`
- `cdpGet()`
- `cdpPost()`
- `fetchWithCDP()`

在它们原来的位置，新增以下函数：

```js
/**
 * 加载平台 Cookie
 */
function loadCookies(platform) {
  const cookiePath = join(COOKIES_DIR, `${platform}.json`);
  if (!existsSync(cookiePath)) {
    console.warn(`⚠️  Cookie 文件不存在: ${cookiePath}，将以未登录状态抓取`);
    return [];
  }
  const cookies = JSON.parse(readFileSync(cookiePath, 'utf-8'));
  console.log(`✅ 已加载 ${cookies.length} 个 Cookie (${platform})`);
  return cookies;
}

/**
 * 保存最新 Cookie（维持登录态）
 */
async function saveCookies(context, platform) {
  if (!existsSync(COOKIES_DIR)) mkdirSync(COOKIES_DIR, { recursive: true });
  const cookies = await context.cookies();
  const cookiePath = join(COOKIES_DIR, `${platform}.json`);
  writeFileSync(cookiePath, JSON.stringify(cookies, null, 2), 'utf-8');
  console.log(`💾 Cookie 已更新: ${cookiePath}`);
}

/**
 * 使用 Playwright 无头 Chromium 抓取页面内容
 */
async function fetchWithPlaywright(url, platform, timeRange) {
  console.log(`🌐 使用 Playwright 模式抓取...`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  // 加载 Cookie
  const cookies = loadCookies(platform);
  if (cookies.length > 0) {
    await context.addCookies(cookies);
  }

  const page = await context.newPage();
  const results = [];

  try {
    // 1. 打开搜索页
    console.log(`📖 打开页面...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`✅ 页面已加载`);

    // 2. 等待内容渲染
    await sleep(3000);

    // 3. 提取内容（第一次）
    console.log(`📊 提取内容...`);
    const extractScript = getExtractScript(platform);
    const firstBatch = await page.evaluate(extractScript);
    if (Array.isArray(firstBatch)) {
      results.push(...firstBatch);
      console.log(`✅ 第一批提取 ${firstBatch.length} 条`);
    }

    // 4. 滚动加载更多
    const maxScrolls = 3;
    for (let i = 0; i < maxScrolls && results.length < config.settings.maxResultsPerPlatform; i++) {
      console.log(`📜 滚动加载更多 (${i + 1}/${maxScrolls})...`);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(config.settings.scrollDelay || 1500);

      const newBatch = await page.evaluate(extractScript);
      if (Array.isArray(newBatch)) {
        const newItems = newBatch.filter(
          item => !results.some(existing => existing.link === item.link)
        );
        if (newItems.length === 0) {
          console.log(`⚠️  没有新内容了，停止滚动`);
          break;
        }
        results.push(...newItems);
        console.log(`✅ 新增 ${newItems.length} 条（总计 ${results.length} 条）`);
      }
    }

    // 5. 时间过滤
    const filtered = filterByTimeRange(results, timeRange);
    console.log(`📅 时间过滤后剩余 ${filtered.length} 条（共抓取 ${results.length} 条）`);

    if (results.length > 0 && filtered.length === 0) {
      console.log(`⚠️  调试信息 - 前3条内容的时间:`);
      results.slice(0, 3).forEach((item, i) => {
        console.log(`  ${i + 1}. "${item.title.substring(0, 30)}" - 时间: ${item.time}`);
      });
    }

    // 6. 补充摘要
    await enrichWithSummary(filtered, platform, context);

    // 7. 保存最新 Cookie
    await saveCookies(context, platform);

    return filtered;

  } catch (error) {
    console.error(`❌ Playwright 抓取失败:`, error.message);
    throw error;
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}
```

- [ ] **Step 4: 修改 enrichWithSummary()，接收 context 参数**

将原来的 `enrichWithSummary(items, platform)` 函数签名改为接收 `context`，并用 Playwright page 替换 CDP 调用：

```js
async function enrichWithSummary(items, platform, context) {
  const selector = SUMMARY_SELECTORS[platform];
  const maxSummary = config.settings.maxSummaryFetch ?? 5;
  const delay = config.settings.summaryFetchDelay ?? 1200;

  // 微博列表页已含正文，直接跳过
  if (platform === 'weibo') {
    items.forEach(item => {
      if (item.content && !item.summary) {
        item.summary = item.content.substring(0, 150);
      }
    });
    return;
  }

  const targets = items.filter(item => item.link && !item.summary).slice(0, maxSummary);
  if (targets.length === 0) return;

  console.log(`📖 补充摘要：共 ${targets.length} 篇（最多 ${maxSummary} 篇）...`);

  for (const item of targets) {
    const detailPage = await context.newPage();
    try {
      await detailPage.goto(item.navLink || item.link, { waitUntil: 'networkidle', timeout: 20000 });
      await sleep(2500);

      const summary = await detailPage.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const text = el.innerText.trim();
        const lines = text.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
        return lines.join(' ').substring(0, 200);
      }, selector);

      if (summary && typeof summary === 'string' && summary.length > 5) {
        item.summary = summary;
        console.log(`  ✅ [${item.title.substring(0, 15)}...] 摘要获取成功`);
      } else {
        console.log(`  ⚠️  [${item.title.substring(0, 15)}...] 摘要为空，跳过`);
      }

      await sleep(delay);
    } catch (err) {
      console.warn(`  ❌ 摘要抓取失败 [${item.title.substring(0, 15)}]: ${err.message}`);
    } finally {
      await detailPage.close();
    }
  }
}
```

- [ ] **Step 5: 修改 getExtractScript()，使其返回函数而不是字符串**

原来 `getExtractScript()` 返回的是字符串（供 CDP eval 执行）。Playwright 的 `page.evaluate()` 接受函数，需要把每个脚本字符串里的 `(() => { ... })()` 改写为直接返回函数：

```js
function getExtractScript(platform) {
  const scripts = {
    xiaohongshu: () => {
      const items = [];
      const cards = document.querySelectorAll('section.note-item');
      cards.forEach(card => {
        try {
          const titleEl = card.querySelector('.footer a.title span, .footer .title span');
          const title = titleEl ? titleEl.textContent.trim() : '(无标题)';
          const authorEl = card.querySelector('.name-time-wrapper .name, .author .name');
          const author = authorEl ? authorEl.textContent.trim() : '';
          const timeEl = card.querySelector('.name-time-wrapper .time, .author .time');
          const time = timeEl ? timeEl.textContent.trim() : '';
          const likeEl = card.querySelector('[class*="like-wrapper"] span:last-child');
          const likes = likeEl ? likeEl.textContent.trim() : '';
          const exploreEl = card.querySelector('a[href*="/explore/"]');
          const navEl = card.querySelector('a.cover[href], a.title[href]');
          const toAbs = href => href
            ? (href.startsWith('http') ? href : 'https://www.xiaohongshu.com' + href)
            : '';
          const exploreLink = toAbs(exploreEl?.getAttribute('href') || '');
          const navLink = toAbs(navEl?.getAttribute('href') || '');
          const link = exploreLink || navLink;
          if (link || title !== '(无标题)') {
            items.push({ title, author, time, likes, link, navLink: navLink || link, platform: 'xiaohongshu' });
          }
        } catch (e) {}
      });
      return items;
    },

    weibo: () => {
      const items = [];
      const cards = document.querySelectorAll('.card-wrap[action-type="feed_list_item"]');
      cards.forEach(card => {
        try {
          const contentEl = card.querySelector('.txt');
          const content = contentEl ? contentEl.innerText.trim() : '';
          const authorEl = card.querySelector('.name');
          const author = authorEl ? authorEl.textContent.trim() : '';
          const timeEl = card.querySelector('.from a:first-child');
          const time = timeEl ? timeEl.textContent.trim() : '';
          const linkEl = card.querySelector('.from a:first-child');
          const link = linkEl ? linkEl.href : '';
          const acts = card.querySelectorAll('.card-act ul li');
          const likes = acts[2] ? acts[2].textContent.trim() : '';
          if (content) {
            items.push({
              title: content.substring(0, 60) + (content.length > 60 ? '...' : ''),
              content, author, time, likes, link, platform: 'weibo'
            });
          }
        } catch (e) {}
      });
      return items;
    }
  };

  return scripts[platform] || scripts.xiaohongshu;
}
```

- [ ] **Step 6: 提交**

```bash
cd ~/social-monitor-feed
git add social-monitor/scripts/monitor.mjs
git commit -m "feat: replace CDP with Playwright in monitor.mjs"
```

---

## Task 3: 新增 login.mjs

**Files:**
- Create: `social-monitor/login.mjs`

- [ ] **Step 1: 创建登录脚本**

```js
#!/usr/bin/env node
/**
 * login.mjs - 首次登录工具
 * 用法: node login.mjs <platform>
 * 例如: docker exec -it social-monitor node login.mjs xiaohongshu
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const COOKIES_DIR = join(__dirname, 'cookies');

const PLATFORM_URLS = {
  xiaohongshu: 'https://www.xiaohongshu.com',
  weibo: 'https://weibo.com'
};

async function login(platform) {
  const url = PLATFORM_URLS[platform];
  if (!url) {
    console.error(`❌ 不支持的平台: ${platform}`);
    console.log(`支持的平台: ${Object.keys(PLATFORM_URLS).join(', ')}`);
    process.exit(1);
  }

  console.log(`🔐 开始登录 ${platform}...`);
  console.log(`📸 每30秒截图一次，保存到 /tmp/login-step-N.png`);
  console.log(`   查看截图: docker cp social-monitor:/tmp/login-step-1.png .`);
  console.log(`   确认登录完成后按 Enter 保存 Cookie\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  // 定时截图
  let stepCount = 0;
  const screenshotInterval = setInterval(async () => {
    stepCount++;
    const path = `/tmp/login-step-${stepCount}.png`;
    await page.screenshot({ path, fullPage: false });
    console.log(`📸 截图已保存: ${path}  (docker cp social-monitor:${path} .)`);
  }, 30000);

  // 立即截一张初始状态
  stepCount++;
  const initPath = `/tmp/login-step-${stepCount}.png`;
  await page.screenshot({ path: initPath, fullPage: false });
  console.log(`📸 初始截图: ${initPath}  (docker cp social-monitor:${initPath} .)`);

  // 等待用户确认登录完成
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await new Promise(resolve => {
    rl.question('\n✅ 登录完成后按 Enter 保存 Cookie... ', () => {
      rl.close();
      resolve();
    });
  });

  clearInterval(screenshotInterval);

  // 最终截图
  const finalPath = `/tmp/login-final.png`;
  await page.screenshot({ path: finalPath });
  console.log(`📸 最终截图: ${finalPath}`);

  // 保存 Cookie
  if (!existsSync(COOKIES_DIR)) mkdirSync(COOKIES_DIR, { recursive: true });
  const cookies = await context.cookies();
  const cookiePath = join(COOKIES_DIR, `${platform}.json`);
  writeFileSync(cookiePath, JSON.stringify(cookies, null, 2), 'utf-8');

  console.log(`\n✅ Cookie 已保存: ${cookiePath}`);
  console.log(`   共 ${cookies.length} 个 Cookie`);

  await browser.close();
}

const platform = process.argv[2];
if (!platform) {
  console.error('用法: node login.mjs <platform>');
  console.log('例如: node login.mjs xiaohongshu');
  process.exit(1);
}

login(platform).catch(err => {
  console.error('❌ 登录失败:', err.message);
  process.exit(1);
});
```

- [ ] **Step 2: 提交**

```bash
cd ~/social-monitor-feed
git add social-monitor/login.mjs
git commit -m "feat: add login.mjs for first-time cookie setup"
```

---

## Task 4: 新增 cron.sh

**Files:**
- Create: `social-monitor/cron.sh`

- [ ] **Step 1: 创建定时脚本**

```bash
#!/bin/bash
# cron.sh - 容器内定时任务，每天 08:45 触发抓取
# 不依赖系统 cron，用纯 bash sleep 循环实现，适合 Docker 容器

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/social-monitor.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

run_monitor() {
  log "🚀 开始定时抓取任务..."
  cd "$SCRIPT_DIR"

  # 串行抓取小红书和微博
  node scripts/monitor-and-publish.mjs 爱奇艺 24h \
    >> "$LOG_FILE" 2>&1 \
    && log "✅ 抓取完成" \
    || log "❌ 抓取失败，查看日志: $LOG_FILE"
}

log "⏰ 定时任务已启动，每天 08:45 执行"

while true; do
  # 计算距离今天 08:45 的秒数
  TARGET_TIME=$(date -d "today 08:45" +%s 2>/dev/null || date -j -f "%Y-%m-%d %H:%M" "$(date +%Y-%m-%d) 08:45" +%s)
  NOW=$(date +%s)

  if [ "$NOW" -ge "$TARGET_TIME" ]; then
    # 今天的 08:45 已过，等到明天
    TARGET_TIME=$((TARGET_TIME + 86400))
  fi

  WAIT=$((TARGET_TIME - NOW))
  log "⏳ 距离下次执行还有 ${WAIT} 秒 ($(date -d @$TARGET_TIME '+%Y-%m-%d %H:%M' 2>/dev/null || date -r $TARGET_TIME '+%Y-%m-%d %H:%M'))"

  sleep "$WAIT"
  run_monitor
done
```

- [ ] **Step 2: 提交**

```bash
cd ~/social-monitor-feed
git add social-monitor/cron.sh
git commit -m "feat: add cron.sh for daily 08:45 scheduled crawl"
```

---

## Task 5: 新增 monitor-and-publish.mjs

**Files:**
- Create: `social-monitor/scripts/monitor-and-publish.mjs`

这个脚本串行抓取两个平台（小红书、微博），然后统一推送一次 GitHub，替代原来 cron 调两次 monitor.mjs 的做法。

- [ ] **Step 1: 创建脚本**

```js
#!/usr/bin/env node
/**
 * monitor-and-publish.mjs
 * 串行抓取小红书 + 微博，完成后统一推送到 GitHub
 * 用法: node scripts/monitor-and-publish.mjs <keyword> <timeRange>
 * 例如: node scripts/monitor-and-publish.mjs 爱奇艺 24h
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync, readdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SKILL_DIR = join(__dirname, '..');

// 动态 import，确保使用改造后的 Playwright 版本
const { monitor } = await import('./monitor.mjs');
const { publish } = await import('./publish.mjs');

const configPath = join(SKILL_DIR, 'config.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

async function main() {
  const keyword   = process.argv[2] || config.settings.defaultKeyword;
  const timeRange = process.argv[3] || '24h';
  const platforms = ['xiaohongshu', 'weibo'];

  console.log(`\n🚀 多平台监控开始`);
  console.log(`📌 关键词: ${keyword}`);
  console.log(`⏰ 时间范围: ${timeRange}`);
  console.log(`📱 平台: ${platforms.join(', ')}\n`);

  const outputFiles = [];
  const errors = [];

  for (const platform of platforms) {
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`📱 开始抓取: ${platform}`);
    try {
      const { outputFile } = await monitor(keyword, platform, timeRange);
      outputFiles.push(outputFile);
      console.log(`✅ ${platform} 抓取完成: ${outputFile}`);
    } catch (err) {
      errors.push({ platform, error: err.message });
      console.error(`❌ ${platform} 抓取失败: ${err.message}`);
    }
  }

  // 有成功结果才推送
  if (outputFiles.length > 0) {
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`📤 推送到 GitHub...`);
    for (const file of outputFiles) {
      try {
        await publish(file);
        console.log(`✅ 推送成功: ${file}`);
      } catch (err) {
        errors.push({ file, error: err.message });
        console.error(`❌ 推送失败: ${err.message}`);
      }
    }
  } else {
    console.error(`\n❌ 所有平台均抓取失败，跳过推送`);
  }

  if (errors.length > 0) {
    console.log(`\n⚠️  错误汇总:`);
    errors.forEach(e => console.log(`  - ${e.platform || e.file}: ${e.error}`));
    process.exit(1);
  }

  console.log(`\n✅ 全部完成！`);
}

main().catch(err => {
  console.error('❌ 任务失败:', err.message);
  process.exit(1);
});
```

- [ ] **Step 2: 提交**

```bash
cd ~/social-monitor-feed
git add social-monitor/scripts/monitor-and-publish.mjs
git commit -m "feat: add monitor-and-publish.mjs for unified crawl+push"
```

---

## Task 6: 新增 Dockerfile

**Files:**
- Create: `social-monitor/Dockerfile`

- [ ] **Step 1: 创建 Dockerfile**

```dockerfile
# 使用 Playwright 官方镜像，已内置 Chromium 及所有依赖
FROM mcr.microsoft.com/playwright:v1.44.0-noble

WORKDIR /app

# 安装 git（用于 publish.mjs 的 git push）
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# 配置 git
RUN git config --global user.email "monitor@social-monitor" && \
    git config --global user.name "Social Monitor Bot"

# 复制 package.json（如有），安装依赖
COPY package*.json ./
RUN npm install 2>/dev/null || true

# 复制项目文件
COPY . .

# 安装 Playwright Chromium
RUN npx playwright install chromium

# 创建 Cookie 和数据目录
RUN mkdir -p /app/cookies /app/data

# 给脚本加执行权限
RUN chmod +x cron.sh

# 启动定时任务
CMD ["/bin/bash", "cron.sh"]
```

- [ ] **Step 2: 新增 package.json（如果不存在）**

检查 `~/social-monitor-feed/social-monitor/package.json` 是否存在：

```bash
ls ~/social-monitor-feed/social-monitor/package.json 2>/dev/null || echo "不存在"
```

如果不存在，创建：

```json
{
  "name": "social-monitor",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "playwright": "^1.44.0"
  }
}
```

- [ ] **Step 3: 提交**

```bash
cd ~/social-monitor-feed
git add social-monitor/Dockerfile social-monitor/package.json
git commit -m "feat: add Dockerfile with Playwright + Node.js 20"
```

---

## Task 7: 新增 docker-compose.yml 和 .gitignore

**Files:**
- Create: `social-monitor/docker-compose.yml`
- Modify: `social-monitor/.gitignore`（或创建）

- [ ] **Step 1: 创建 docker-compose.yml**

```yaml
version: '3.8'

services:
  social-monitor:
    build: .
    container_name: social-monitor
    restart: unless-stopped

    # 注入 GitHub Token（用于 git push）
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - GIT_AUTHOR_NAME=Social Monitor Bot
      - GIT_AUTHOR_EMAIL=monitor@social-monitor
      - GIT_COMMITTER_NAME=Social Monitor Bot
      - GIT_COMMITTER_EMAIL=monitor@social-monitor

    volumes:
      # 持久化 Cookie（容器重建不丢失）
      - ./cookies:/app/cookies
      # 持久化抓取数据
      - ./data:/app/data
      # 持久化日志
      - ./logs:/var/log

    # 共享宿主机内存，避免 Chromium OOM
    shm_size: '2gb'
```

- [ ] **Step 2: 更新 .gitignore**

```
# Cookie 文件（含登录凭证，不提交）
cookies/
cookies/*.json

# 环境变量
.env

# 临时数据
data/
logs/

# Node modules
node_modules/
```

- [ ] **Step 3: 提交**

```bash
cd ~/social-monitor-feed
git add social-monitor/docker-compose.yml social-monitor/.gitignore
git commit -m "feat: add docker-compose.yml and update .gitignore"
```

---

## Task 8: 修改 publish.mjs 支持 GITHUB_TOKEN

**Files:**
- Modify: `scripts/publish.mjs`

`publish.mjs` 里直接 `git push origin main`，在容器内没有 SSH Key 时会失败。需要用 `GITHUB_TOKEN` 构造带认证的 remote URL。

- [ ] **Step 1: 在 publish() 函数中，找到 git push 部分，替换为带 Token 的推送**

找到 `execSync('git push origin main', ...)` 这一行，替换为：

```js
// 用 GITHUB_TOKEN 构造认证 URL
const token = process.env.GITHUB_TOKEN;
if (token) {
  const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf-8' }).trim();
  // 将 https://github.com/user/repo.git 改为 https://<token>@github.com/user/repo.git
  const authedUrl = remoteUrl.replace('https://github.com/', `https://${token}@github.com/`);
  execSync(`git push "${authedUrl}" main`, { stdio: 'inherit' });
} else {
  // 没有 Token 时走 SSH（本地开发）
  execSync('git push origin main', { stdio: 'inherit' });
}
```

- [ ] **Step 2: 提交**

```bash
cd ~/social-monitor-feed
git add social-monitor/scripts/publish.mjs
git commit -m "feat: support GITHUB_TOKEN for git push in container"
```

---

## Task 9: 推送到 GitHub 并验证构建

- [ ] **Step 1: 推送所有提交到 GitHub**

```bash
cd ~/social-monitor-feed
git push origin main
```

- [ ] **Step 2: 在服务器上拉取并构建**

SSH 登录到云服务器，执行：

```bash
# 拉取最新代码
git clone git@github.com:<你的用户名>/social-monitor-feed.git
cd social-monitor-feed/social-monitor

# 配置 GitHub Token
echo "GITHUB_TOKEN=ghp_你的token" > .env

# 构建镜像（首次需要几分钟下载 Playwright 镜像）
docker compose build

# 预期输出末尾类似：
# Successfully built xxxxxxxx
# Successfully tagged social-monitor:latest
```

- [ ] **Step 3: 启动容器**

```bash
docker compose up -d

# 确认容器运行中
docker ps | grep social-monitor
# 预期输出: social-monitor   Up X seconds
```

- [ ] **Step 4: 首次登录小红书**

```bash
docker exec -it social-monitor node login.mjs xiaohongshu
# 脚本启动后，用另一个终端拉取截图查看页面状态：
# docker cp social-monitor:/tmp/login-step-1.png .
# 在截图中确认看到登录页面后，完成扫码/密码登录
# 看到已登录状态后，在 login.mjs 提示处按 Enter
```

- [ ] **Step 5: 首次登录微博**

```bash
docker exec -it social-monitor node login.mjs weibo
```

- [ ] **Step 6: 手动触发一次抓取验证**

```bash
docker exec -it social-monitor node scripts/monitor-and-publish.mjs 爱奇艺 1h

# 预期输出末尾：
# ✅ 全部完成！

# 检查 GitHub 仓库 data/ 目录是否有新文件
```

- [ ] **Step 7: 查看定时任务日志**

```bash
docker exec social-monitor tail -f /var/log/social-monitor.log
# 预期：能看到"距离下次执行还有 XXXX 秒"的日志
```

---
name: social-monitor
license: MIT
description: |
  社交媒体内容监控工具 - 定期抓取小红书、微博、知乎等平台的特定关键词内容。
  使用场景：品牌监控、竞品分析、热点追踪、舆情监测。

  触发方式：
  - 手动调用：/social-monitor [关键词] [平台]
  - 定时任务：配置后自动执行并推送结果
metadata:
  author: Claude + User
  version: "1.0.0"
  requires:
    - web-access
---

# Social Monitor Skill - Claude 使用指南

## 🎯 Claude 工作流程（重要！）

当用户调用此 skill 时，你（Claude）需要按以下步骤执行：

### Step 1: 解析用户命令

用户命令格式：`/social-monitor [关键词] [平台] [时间范围]`

- **关键词** - 可选，默认 "爱奇艺"
- **平台** - 可选，xiaohongshu/weibo/zhihu/all，**不指定平台时默认抓取所有启用平台**
- **时间范围** - 可选，如 "1天"、"12小时"，默认 "24h"

### Step 2: 执行监控脚本

使用 Bash 工具调用：

**不指定平台（默认抓所有启用平台）**：
```bash
cd ~/.claude/skills/social-monitor
node scripts/monitor-all.mjs [关键词] [时间范围]
```

**指定单个平台**：
```bash
cd ~/.claude/skills/social-monitor
node scripts/monitor.mjs [关键词] [平台] [时间范围]
```

### Step 3: 展示报告

将脚本输出的报告展示给用户，并告知数据保存位置。

### Step 4: 可选 - 发布数据

如果用户需要分享数据，执行：

```bash
node scripts/publish.mjs [数据文件路径]
```

---

## 📋 命令处理逻辑

### `/social-monitor` (无参数)
执行多平台监控：`node scripts/monitor-all.mjs 爱奇艺 24h`

### `/social-monitor [关键词]` (仅关键词)
执行多平台监控：`node scripts/monitor-all.mjs [关键词] 24h`

### `/social-monitor [关键词] [平台]` (指定平台)
执行单平台监控：`node scripts/monitor.mjs [关键词] [平台] 24h`

### `/social-monitor setup`
1. 使用 AskUserQuestion 收集配置（关键词、平台、频率、时间范围）
2. 调用 `scripts/task-manager.mjs add` 创建任务
3. 使用 CronCreate 工具创建定时任务
4. 更新任务的 cronId

### `/social-monitor list`
执行：`node scripts/task-manager.mjs list` 并格式化显示

### `/social-monitor stop [任务ID]`
1. 获取任务：`node scripts/task-manager.mjs get [ID]`
2. 删除 Cron：CronDelete
3. 删除任务：`node scripts/task-manager.mjs delete [ID]`

---

## 功能简介

自动监控社交媒体平台上的关键词、话题或账号，定期抓取最新内容并生成摘要报告。

### 支持的平台

- **小红书** - 笔记搜索、用户主页
- **微博** - 话题搜索、用户微博
- **知乎** - 问题、话题、用户动态
- **其他** - 可扩展任何 web-access 支持的网站

---

## 使用方法

### 快速使用（默认监控爱奇艺）

```
/social-monitor
```
不带任何参数时，默认监控**爱奇艺**在**小红书**上**最近1天**的内容。

### 手动调用（自定义参数）

```
/social-monitor [关键词] [平台] [时间范围]
```

**示例**：
- `/social-monitor` - 默认：抓取小红书上1天内关于爱奇艺的内容
- `/social-monitor 爱奇艺 微博 1天` - 抓取微博上关于爱奇艺的内容
- `/social-monitor #人工智能 微博 12小时` - 抓取微博上12小时内的 #人工智能 话题
- `/social-monitor Claude 知乎 3天` - 抓取知乎上3天内关于 Claude 的讨论

### 定时监控

**配置监控任务**：
```
/social-monitor setup
```

系统会引导你配置：
1. 监控关键词列表
2. 监控平台
3. 执行频率（每天/每12小时/每周）
4. 时间范围（最近几小时/天的内容）
5. 推送方式（对话通知）

**查看配置**：
```
/social-monitor list
```

**停止监控**：
```
/social-monitor stop [任务ID]
```

---

## 前置要求

### 必需依赖

1. **web-access skill** - 必须已安装并配置
2. **Chrome 远程调试** - 必须已启用

### 检查环境

在执行任务前，会自动检查：
```bash
node "${CLAUDE_SKILL_DIR}/../web-access/scripts/check-deps.mjs"
```

---

## 工作流程

### 1. 任务接收

用户通过命令或定时任务触发监控请求。

### 2. 平台路由

根据目标平台，选择合适的抓取策略：

| 平台 | 策略 | 原因 |
|------|------|------|
| 小红书 | CDP 浏览器 | 强反爬，需真实浏览器环境 |
| 微博 | CDP 浏览器 | 部分内容需登录态 |
| 知乎 | WebFetch → CDP | 尝试静态抓取，失败则用 CDP |

### 3. 内容抓取

**小红书示例流程**：
```javascript
1. 打开搜索页: /new?url=https://xiaohongshu.com/search_result?keyword={关键词}
2. 等待加载完成
3. 提取笔记列表: /eval (获取标题、作者、时间、链接)
4. 滚动加载更多: /scroll
5. 时间过滤: 筛选出指定时间范围内的内容
6. 关闭标签页: /close
```

### 4. 数据处理

提取的原始数据包含：
- 标题/内容
- 作者信息
- 发布时间
- 互动数据（点赞、评论）
- 原文链接

### 5. 结果呈现

生成结构化报告：
```markdown
## 📊 [平台名] "[关键词]" 监控报告

**监控时间**: YYYY-MM-DD HH:mm
**时间范围**: 最近 X 小时/天
**找到内容**: N 条

### 📝 内容列表

#### 1️⃣ [标题]
- 作者: xxx
- 时间: X小时前
- 互动: X赞 X评论
- 链接: [原文]
- 摘要: ...

[重复列出所有内容]

### 📈 数据洞察
- 热门话题
- 情感倾向
- 关键发现
```

---

## 平台适配指南

### 小红书 (xiaohongshu.com)

**搜索 URL 模板**：
```
https://www.xiaohongshu.com/search_result?keyword={关键词}&source=web_search_result_notes
```

**DOM 选择器**：
```javascript
// 笔记卡片
cards = document.querySelectorAll('section.note-item, a.cover')

// 标题
title = card.querySelector('.title, [class*="title"]')

// 作者和时间（通常在一起）
author = card.querySelector('.author, [class*="author"]')
// 时间格式: "作者名X天前" 或 "作者名X小时前"

// 链接
link = card.href || card.querySelector('a')?.href

// 点赞数
likes = card.querySelector('[class*="like"]')
```

**时间解析**：
```javascript
function parseXHSTime(text) {
  if (text.includes('天前')) {
    const days = parseInt(text);
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }
  if (text.includes('小时前')) {
    const hours = parseInt(text);
    return new Date(Date.now() - hours * 60 * 60 * 1000);
  }
  if (text.includes('分钟前')) {
    const mins = parseInt(text);
    return new Date(Date.now() - mins * 60 * 1000);
  }
  return null;
}
```

**注意事项**：
- 小红书强反爬，必须使用 CDP 模式
- 滚动加载时需要等待（800ms）
- 时间信息通常与作者名在一起，需正则提取
- 部分笔记可能无标题（图片笔记）

### 微博 (weibo.com)

**搜索 URL 模板**：
```
https://s.weibo.com/weibo?q={关键词}
```

**DOM 选择器**：
```javascript
// 微博卡片
cards = document.querySelectorAll('.card-wrap')

// 内容
content = card.querySelector('.txt')

// 作者
author = card.querySelector('.name')

// 时间
time = card.querySelector('.from a')

// 转评赞
interactions = card.querySelectorAll('.card-act li')
```

**登录判断**：
```javascript
// 检查是否需要登录
if (document.querySelector('.gn_login')) {
  // 提示用户登录
}
```

### 知乎 (zhihu.com)

**搜索 URL 模板**：
```
https://www.zhihu.com/search?type=content&q={关键词}
```

**DOM 选择器**：
```javascript
// 内容卡片
cards = document.querySelectorAll('.List-item')

// 问题/文章标题
title = card.querySelector('h2.ContentItem-title')

// 作者
author = card.querySelector('.AuthorInfo-name')

// 摘要
summary = card.querySelector('.RichContent-inner')

// 链接
link = card.querySelector('h2 a')?.href
```

---

## 定时任务实现

### 使用 CronCreate 工具

```javascript
// 创建定时任务
CronCreate({
  cron: "0 9 * * *",  // 每天早上9点
  prompt: `请执行社交媒体监控任务：
    关键词: {配置的关键词}
    平台: {配置的平台}
    时间范围: 最近24小时

    必须加载 social-monitor skill 并遵循其工作流程。`,
  recurring: true
})
```

### 配置存储

监控配置存储在：
```
~/.claude/skills/social-monitor/config.json
```

格式：
```json
{
  "tasks": [
    {
      "id": "task_001",
      "name": "爱奇艺品牌监控",
      "keywords": ["爱奇艺", "iQIYI"],
      "platforms": ["xiaohongshu", "weibo"],
      "schedule": "0 9 * * *",
      "timeRange": "24h",
      "cronId": "cron_abc123",
      "enabled": true
    }
  ]
}
```

---

## 错误处理

### 常见问题

**1. CDP Proxy 未连接**
```
错误: {"error": "WebSocket 未连接"}
解决: 运行 node check-deps.mjs 重启 Proxy
```

**2. 页面加载失败**
```
错误: 页面返回空白或错误页
解决:
- 检查网络连接
- 检查 URL 是否正确
- 可能需要登录（在用户 Chrome 中登录后重试）
```

**3. 选择器失效**
```
错误: 提取的内容为空
原因: 网站更新了 DOM 结构
解决: 更新 DOM 选择器（查看当前页面结构）
```

**4. 账号被封禁**
```
错误: 网站提示账号异常
原因: 操作频率过高触发风控
解决:
- 降低监控频率
- 使用测试账号
- 添加随机延迟
```

### 重试机制

```javascript
async function retryFetch(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(2000 * (i + 1)); // 递增延迟
    }
  }
}
```

---

## 最佳实践

### 1. 控制频率

- ✅ 每天 1-2 次定时任务
- ✅ 单次抓取不超过 50 条内容
- ✅ 操作间添加随机延迟
- ❌ 避免每小时或更频繁的抓取

### 2. 使用独立账号

如果监控敏感关键词或高频使用：
- 使用测试账号登录
- 或在独立 Chrome Profile 中运行

### 3. 数据存储

建议保存历史数据用于对比分析：
```bash
~/.claude/skills/social-monitor/data/
  ├── 2026-04-15_爱奇艺_小红书.json
  ├── 2026-04-14_爱奇艺_小红书.json
  └── ...
```

### 4. 结果去重

基于链接去重，避免重复推送：
```javascript
const seenUrls = new Set(
  previousData.map(item => item.link)
);
const newContent = currentData.filter(
  item => !seenUrls.has(item.link)
);
```

---

## 扩展性

### 添加新平台

1. 在 `SKILL.md` 中添加平台适配指南
2. 编写对应的 URL 模板和选择器
3. 测试抓取流程
4. 更新平台列表

### 自定义数据处理

可以添加：
- 情感分析（基于内容判断正面/负面）
- 关键词云图
- 趋势对比图表
- 导出为 Excel/PDF 报告

---

## 安全提示

⚠️ **使用本 skill 需要注意**：

1. **账号风险**：频繁自动化操作可能导致账号封禁
2. **遵守 ToS**：不要违反平台服务条款
3. **数据隐私**：抓取的内容可能包含个人信息，注意保护
4. **合法使用**：仅用于个人研究、品牌监控等合法用途

---

## 示例场景

### 场景 1: 品牌舆情监控

```
配置监控: 公司品牌名
平台: 小红书 + 微博
频率: 每天早上 9 点
用途: 及时发现用户反馈和舆论动向
```

### 场景 2: 竞品分析

```
配置监控: 竞品名称
平台: 小红书 + 知乎
频率: 每周一早上
用途: 了解竞品的用户评价和市场反应
```

### 场景 3: 行业热点追踪

```
配置监控: 行业关键词（如 "AI"、"大模型"）
平台: 知乎 + 微博
频率: 每 12 小时
用途: 追踪行业最新动态和讨论
```

---

## 命令参考

| 命令 | 说明 | 示例 |
|------|------|------|
| `/social-monitor [关键词] [平台] [时间]` | 立即执行监控 | `/social-monitor 爱奇艺 小红书 1天` |
| `/social-monitor setup` | 配置定时任务 | - |
| `/social-monitor list` | 查看所有监控任务 | - |
| `/social-monitor stop [ID]` | 停止指定任务 | `/social-monitor stop task_001` |
| `/social-monitor test [平台]` | 测试平台连通性 | `/social-monitor test 小红书` |

---

## 版本历史

- **v1.1.0** (2026-04-16)
  - 新增数据发布功能：抓取后自动推送到 GitHub 仓库
  - 新增订阅端 skill（social-monitor-reader）
- **v1.0.0** (2026-04-15)
  - 初始版本
  - 支持小红书、微博、知乎
  - 支持手动和定时执行
  - 基础数据提取和报告生成

---

## 数据发布（Feed 模式）

抓取完成后，可以将结果推送到 GitHub 仓库，供其他人通过 `social-monitor-reader` skill 订阅查看。

### 发布流程

抓取完成后，Claude 应自动执行以下步骤：

**Step 1**: 将抓取结果写入 JSON 文件

```bash
# 写入本地数据目录
~/.claude/skills/social-monitor/data/{date}_{keyword}_{platform}.json
```

**Step 2**: 同步到 feed 仓库

```bash
# 数据文件格式
{
  "keyword": "爱奇艺",
  "platform": "xiaohongshu",
  "crawl_time": "2026-04-15T09:00:00+08:00",
  "time_range": "1d",
  "count": 3,
  "items": [
    {
      "title": "笔记标题",
      "author": "作者名",
      "time": "1天前",
      "likes": "6",
      "link": "https://...",
      "summary": "内容摘要"
    }
  ]
}
```

```bash
# 复制到 feed 仓库并推送
FEED_REPO="$HOME/social-monitor-feed"
DATE=$(date +%Y-%m-%d)
cp data_file "$FEED_REPO/data/latest.json"
cp data_file "$FEED_REPO/data/${DATE}.json"
cd "$FEED_REPO" && git add data/ && git commit -m "update: ${DATE}" && git push
```

### 首次配置

运行 `bash ~/.claude/skills/social-monitor/setup-feed-repo.sh [你的GitHub用户名]` 初始化 feed 仓库。

### 订阅端分发

将 `~/social-monitor-feed/social-monitor-reader/` 文件夹发给订阅者，对方复制到 `~/.claude/skills/social-monitor-reader/` 并修改 `config.json` 中的 `feedUrl` 为你的 GitHub raw URL 即可。

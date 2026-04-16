---
name: social-monitor-reader
license: MIT
description: |
  订阅社交媒体监控数据 - 从 GitHub feed 仓库读取他人分享的监控报告。

  适用场景：
  - 订阅品牌/竞品监控数据
  - 查看行业热点追踪
  - 无需自己抓取，直接查看结果
metadata:
  author: mqnuiawx
  version: "1.1.0"
  requires: []
---

# Social Monitor Reader

无需 web-access，无需 Chrome，只要一个 GitHub Feed URL，每天自动收到监控报告。

---

## 📋 Claude 工作流程

### `/social-monitor-reader`（无参数，查看最新）

执行并展示报告：

```bash
node ~/.claude/skills/social-monitor-reader/scripts/reader.mjs latest
```

若 `config.json` 中 `feedUrl` 为空，跳转到 `setup` 流程。

---

### `/social-monitor-reader setup`（首次配置 / 重建定时任务）

**Step 1：检查 feedUrl 是否已配置**

```bash
node ~/.claude/skills/social-monitor-reader/scripts/reader.mjs config
```

若 `feedUrl` 为空，向用户询问：

> 请提供 Feed URL（由数据提供者给你的 GitHub raw URL），格式为：
> `https://raw.githubusercontent.com/[用户名]/social-monitor-feed/main/data/index.json`

获取到 URL 后，用 Edit 工具写入 `config.json` 的 `feedUrl` 字段。

**Step 2：测试连接**

```bash
node ~/.claude/skills/social-monitor-reader/scripts/reader.mjs latest
```

确认能正常拉取数据后继续。

**Step 3：创建每日 8:40 定时推送**

使用 CronCreate 工具：

```
CronCreate({
  cron: "40 8 * * *",
  recurring: true,
  prompt: "请加载 social-monitor-reader skill，运行命令 `node ~/.claude/skills/social-monitor-reader/scripts/reader.mjs latest`，将输出的完整监控报告展示给用户，末尾加一行：📬 每日 8:40 自动推送 · /social-monitor-reader history 查看历史"
})
```

将返回的 cronId 写入 `config.json` 的 `schedule.cronId`，并将 `schedule.enabled` 设为 `true`。

**Step 4：告知用户**

```
✅ 配置完成！
📡 Feed：[feedUrl]
⏰ 定时推送：每天 8:40（会话内有效，重启后执行 /social-monitor-reader setup 恢复）
```

---

### `/social-monitor-reader history [N]`

```bash
node ~/.claude/skills/social-monitor-reader/scripts/reader.mjs history 10
```

展示最近 N 条更新的列表（日期、关键词、平台、数量）。

---

### `/social-monitor-reader date <YYYY-MM-DD>`

```bash
node ~/.claude/skills/social-monitor-reader/scripts/reader.mjs date 2026-04-16
```

展示指定日期的完整报告。

---

### `/social-monitor-reader stop`（取消定时推送）

1. 读取 `config.json` 中的 `schedule.cronId`
2. 调用 `CronDelete({ id: cronId })`
3. 将 `config.json` 中 `schedule.enabled` 改为 `false`，`cronId` 清空
4. 告知用户：`✅ 定时推送已取消`

---

## 🔧 config.json 说明

```json
{
  "version": "1.1.0",
  "feedUrl": "",          // ← 订阅方填写数据提供者的 GitHub raw URL
  "schedule": {
    "enabled": false,     // 定时任务是否已启用
    "cron": "40 8 * * *", // 触发时间
    "cronId": ""          // CronCreate 返回的 ID（用于 stop）
  },
  "settings": {
    "maxHistoryItems": 10
  }
}
```

---

## 📊 Feed 数据格式

### index.json（索引）

```json
{
  "updates": [
    {
      "date": "2026-04-16",
      "keyword": "爱奇艺",
      "platform": "xiaohongshu",
      "count": 7,
      "file": "2026-04-16_爱奇艺_xiaohongshu.json",
      "timestamp": "2026-04-16T10:42:09.000Z"
    }
  ]
}
```

### 数据文件（*.json）

```json
{
  "keyword": "爱奇艺",
  "platform": "xiaohongshu",
  "time_range": "24h",
  "crawl_time": "2026-04-16T10:42:09.000Z",
  "count": 7,
  "items": [
    {
      "title": "笔记标题",
      "author": "作者名",
      "time": "昨天 20:46",
      "likes": "4",
      "link": "https://www.xiaohongshu.com/explore/...",
      "summary": "正文摘要...",
      "platform": "xiaohongshu"
    }
  ]
}
```

---

## 📦 分发给订阅者

数据提供者将此 skill 打包发给订阅者（已内置在 feed 仓库中）：

```bash
# 订阅者执行：克隆后直接链接
git clone https://github.com/mqnuiawx/social-monitor-feed.git ~/social-monitor-feed
ln -s ~/social-monitor-feed/social-monitor-reader ~/.claude/skills/

# 然后运行配置向导
/social-monitor-reader setup
```

或直接解压安装：

```bash
cd ~/.claude/skills
tar -xzf social-monitor-reader.tar.gz
/social-monitor-reader setup
```

---

## ⚠️ 错误处理

| 错误 | 原因 | 解决 |
|------|------|------|
| `Feed URL 未配置` | feedUrl 为空 | 执行 `/social-monitor-reader setup` |
| `404 Not Found` | URL 错误或仓库私有 | 确认 URL 和仓库是 Public |
| 网络超时 | 网络问题 | 自动回退缓存，稍后重试 |

网络不可用时自动使用缓存：`~/.claude/skills/social-monitor-reader/.cache/latest.json`

---

## 📝 命令速查

| 命令 | 说明 |
|------|------|
| `/social-monitor-reader` | 查看最新数据 |
| `/social-monitor-reader setup` | 首次配置 / 重建定时任务 |
| `/social-monitor-reader history [N]` | 查看历史列表 |
| `/social-monitor-reader date YYYY-MM-DD` | 查看指定日期 |
| `/social-monitor-reader stop` | 取消定时推送 |

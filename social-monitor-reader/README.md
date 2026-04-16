# Social Monitor Reader

> 📡 订阅社交媒体监控数据 - 无需自己抓取，直接查看结果

## 这是什么？

**social-monitor-reader** 是 **social-monitor** 的订阅端（消费者端）。

如果有人使用 `social-monitor` 抓取社交媒体数据并分享到 GitHub，你可以使用这个 skill 订阅他们的数据。

## 为什么需要它？

### ✅ 优点

- **无需 web-access** - 不需要安装复杂的依赖
- **无需浏览器** - 不需要 Chrome 远程调试
- **即时查看** - 直接从 GitHub 读取最新数据
- **轻量级** - 只需要网络请求

### 🆚 与 social-monitor 的区别

| 特性 | social-monitor | social-monitor-reader |
|------|----------------|----------------------|
| 角色 | 数据生产者 | 数据消费者 |
| 依赖 | web-access + Chrome | 无 |
| 功能 | 抓取数据 | 读取数据 |
| 资源 | 高 | 低 |

## 快速开始

### 1. 安装

```bash
# 如果你已经有这个文件夹，说明已经安装了
cd ~/.claude/skills/social-monitor-reader
```

### 2. 配置 Feed URL

编辑 `config.json`：

```json
{
  "feedUrl": "https://raw.githubusercontent.com/USER/social-monitor-feed/main/data/index.json"
}
```

将 `USER` 替换为数据提供者的 GitHub 用户名。

### 3. 查看数据

在 Claude Code 中：

```
/social-monitor-reader
```

或者直接运行：

```bash
node scripts/reader.mjs
```

## 使用方法

### 查看最新监控数据

```bash
node scripts/reader.mjs latest
```

或在 Claude 中：

```
/social-monitor-reader
```

### 查看历史记录

```bash
node scripts/reader.mjs history 10
```

### 查看特定日期数据

```bash
node scripts/reader.mjs date 2026-04-15
```

### 查看当前配置

```bash
node scripts/reader.mjs config
```

## 配置说明

### config.json

```json
{
  "version": "1.0.0",
  "feedUrl": "你的订阅源 URL",
  "settings": {
    "autoUpdate": true,          // 自动更新
    "updateInterval": "1h",      // 更新间隔
    "cacheExpiry": "30m",        // 缓存过期
    "showLatestOnly": false,     // 只显示最新
    "maxHistoryItems": 10        // 历史数量
  },
  "notifications": {
    "enabled": true,             // 通知开关
    "onNewContent": true         // 新内容通知
  }
}
```

## 获取 Feed URL

### 方式 1: 向数据提供者索取

如果有人告诉你他们在用 `social-monitor` 监控某些数据，可以向他们索取 Feed URL。

### 方式 2: 公开的 Feed 源

一些组织或个人可能会公开他们的监控数据，查找格式：

```
https://raw.githubusercontent.com/[用户名]/social-monitor-feed/main/data/index.json
```

## 数据格式

### Feed 索引 (index.json)

```json
{
  "updates": [
    {
      "date": "2026-04-16",
      "keyword": "爱奇艺",
      "platform": "xiaohongshu",
      "count": 5,
      "file": "2026-04-16_爱奇艺_xiaohongshu.json",
      "timestamp": "2026-04-16T09:00:00+08:00"
    }
  ]
}
```

### 监控数据 (具体的 .json 文件)

```json
{
  "keyword": "爱奇艺",
  "platform": "xiaohongshu",
  "crawl_time": "2026-04-16T09:00:00+08:00",
  "time_range": "24h",
  "count": 5,
  "items": [
    {
      "title": "笔记标题",
      "author": "作者",
      "time": "1天前",
      "likes": "56",
      "link": "https://...",
      "content": "内容摘要"
    }
  ]
}
```

## 离线模式

如果网络不可用，reader 会自动使用缓存数据：

```
⚠️  **离线模式**: 使用缓存数据
```

缓存位置：`.cache/latest.json`

## 常见问题

### Q: Feed URL 在哪里找？

A: 向数据提供者（使用 social-monitor 的人）索取。

### Q: 数据多久更新一次？

A: 取决于数据提供者的设置，通常是每天或每12小时。

### Q: 可以订阅多个 Feed 吗？

A: 当前版本只支持一个 Feed，如需订阅多个，可以安装多个副本：

```bash
cp -r social-monitor-reader social-monitor-reader-2
# 修改 social-monitor-reader-2/config.json 的 feedUrl
```

### Q: 如何知道有新数据？

A: 定期运行 `/social-monitor-reader`，或配置定时任务。

### Q: 我想自己抓取数据怎么办？

A: 安装 `social-monitor` 而不是 `social-monitor-reader`。

## 目录结构

```
social-monitor-reader/
├── .claude-plugin/
│   └── plugin.json
├── scripts/
│   └── reader.mjs          # 核心脚本
├── .cache/                 # 缓存目录（自动创建）
│   └── latest.json
├── config.json             # 配置文件
├── SKILL.md                # Claude 指南
└── README.md               # 本文件
```

## 命令参考

| 命令 | 说明 |
|------|------|
| `node scripts/reader.mjs` | 查看最新数据 |
| `node scripts/reader.mjs latest` | 同上（显式） |
| `node scripts/reader.mjs history [N]` | 查看历史记录 |
| `node scripts/reader.mjs date <YYYY-MM-DD>` | 查看特定日期 |
| `node scripts/reader.mjs config` | 查看配置 |

## 进阶用法

### 定时检查新数据

使用 Claude 的 CronCreate 功能：

```
/loop 1h /social-monitor-reader
```

### 对比两个日期的数据

```
Claude，对比 4月15日 和 4月16日 关于"爱奇艺"的监控数据
```

### 导出数据

```bash
node scripts/reader.mjs latest > report.md
```

## 成为数据生产者

如果你想自己抓取数据并分享给他人，请安装 `social-monitor`：

```bash
cd ~/.claude/skills
git clone <social-monitor-repo> social-monitor
```

详见：[social-monitor 文档](../social-monitor/README.md)

## 许可

MIT License

## 致谢

- `social-monitor` - 数据生产端
- `follow-builders` - Feed 订阅机制参考

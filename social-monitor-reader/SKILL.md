Base directory for this skill: ~/.claude/skills/social-monitor-reader

# Social Monitor Reader Skill

## 功能

从中央 GitHub 数据源读取最新的社交媒体监控报告并展示。不需要任何爬虫环境。

---

## 使用方法

```
/social-monitor-reader
```

---

## 工作流程

### 1. 读取配置

读取 `~/.claude/skills/social-monitor-reader/config.json` 获取数据源 URL：

```json
{
  "feedUrl": "https://raw.githubusercontent.com/USERNAME/social-monitor-feed/main/data/latest.json"
}
```

### 2. 获取数据

使用 WebFetch 工具访问 `feedUrl`，获取 JSON 数据。

**请求示例**：
```
WebFetch({
  url: config.feedUrl,
  prompt: "返回完整的 JSON 内容，不要省略任何字段"
})
```

### 3. 解析 JSON

数据格式：
```json
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
      "summary": "内容摘要..."
    }
  ]
}
```

### 4. 格式化展示

按以下格式输出报告，只展示原文内容，不做分析洞察：

```markdown
## 小红书 "关键词" 监控报告

**抓取时间**: YYYY-MM-DD HH:mm | **范围**: 最近 X 天 | **笔记数**: N 条

---

### 1. [标题]
- **作者**: xxx | **时间**: X天前 | **赞**: N
- **链接**: [原文链接]
- **内容**: 摘要内容...

### 2. [标题]
...
```

---

## 错误处理

### feedUrl 未配置
提示用户编辑 `config.json`，填入管理员提供的 GitHub raw URL。

### 网络访问失败
提示用户检查网络连接，或确认 GitHub 仓库是否为 public。

### 数据为空
提示暂无监控数据，管理员可能还未推送。

---

## 注意事项

- 本 skill 是纯读取工具，不会执行任何爬虫操作
- 数据由管理员通过 `social-monitor` skill 抓取并推送
- 如需修改监控关键词或平台，请联系管理员

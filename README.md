# Social Monitor Feed

社交媒体监控数据源。由 `social-monitor` skill 自动抓取并推送到此仓库。

## 数据结构

```
data/
  latest.json          # 最新一次抓取结果（订阅端读取此文件）
  2026-04-15.json      # 按日期归档的历史数据
  2026-04-14.json
  ...
```

## 数据格式

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
      "link": "https://www.xiaohongshu.com/explore/...",
      "summary": "内容摘要"
    }
  ]
}
```

## 订阅方式

安装 `social-monitor-reader` skill 即可自动读取本仓库数据：

```bash
# 将 reader skill 复制到 Claude Code skills 目录
cp -r social-monitor-reader ~/.claude/skills/
```

然后在 Claude Code 中使用 `/social-monitor-reader` 即可查看最新报告。

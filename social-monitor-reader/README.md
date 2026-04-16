# Social Monitor Reader

社交媒体监控报告阅读器 - 零依赖，开箱即用。

## 功能

从中央数据源获取最新的社交媒体监控报告，无需自己抓取。

数据由管理员通过 `social-monitor` skill 定期抓取并推送到 GitHub 仓库，本 skill 只负责读取和展示。

## 安装

```bash
cp -r social-monitor-reader ~/.claude/skills/
```

## 安装后配置

编辑 `~/.claude/skills/social-monitor-reader/config.json`，将 `feedUrl` 改为管理员提供的 GitHub 仓库 raw URL：

```json
{
  "feedUrl": "https://raw.githubusercontent.com/你的管理员用户名/social-monitor-feed/main/data/latest.json"
}
```

## 使用

```
/social-monitor-reader
```

直接运行即可查看最新监控报告。

## 无需依赖

- 不需要 Chrome
- 不需要 web-access skill
- 不需要任何爬虫环境
- 只需要网络能访问 GitHub

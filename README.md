# Social Monitor Feed

社交媒体监控数据订阅源，由 social-monitor skill 自动抓取并推送。

## 📡 订阅数据

**Feed URL（给 AI 读取用）：**

```
https://raw.githubusercontent.com/mqnuiawx/social-monitor-feed/main/data/index.json
```

## 🚀 安装订阅端 skill（3 步完成）

**方式一：tar 包安装（推荐）**

```bash
cd ~/.claude/skills
curl -L https://github.com/mqnuiawx/social-monitor-feed/raw/main/social-monitor-reader.tar.gz | tar -xz
```

**方式二：克隆仓库后链接**

```bash
git clone https://github.com/mqnuiawx/social-monitor-feed.git ~/social-monitor-feed
ln -s ~/social-monitor-feed/social-monitor-reader ~/.claude/skills/
```

安装完成后，在 Claude Code 中运行：

```
/social-monitor-reader setup
```

按提示填入 Feed URL，即可完成配置并开启每日 8:40 自动推送。

## 📊 最新监控分析

## 2026-04-20

🟢 正常监控 - 小红书8条，微博0条

**热点内容**：
- 📱 今日物料MVP (69赞)
- 📱 今日预告｜下午悦享会和好朋友们一起唠嗑！ (64赞)

[查看详细数据](./data/2026-04-20_爱奇艺_xiaohongshu.json) · [微博](./data/2026-04-20_爱奇艺_weibo.json)

---



## 2026-04-20

暂无新内容

[查看详细数据](./data/2026-04-20_爱奇艺_xiaohongshu.json) · [微博](./data/2026-04-20_爱奇艺_weibo.json)

## 📂 数据目录

| 文件 | 说明 |
|------|------|
| [data/latest.json](data/latest.json) | 最新一次监控数据 |
| [data/index.json](data/index.json) | 更新历史索引 |

## 📊 监控内容

- **关键词**：爱奇艺
- **平台**：小红书
- **更新频率**：每日
- **数据内容**：标题、作者、时间、点赞数、原文链接、正文摘要

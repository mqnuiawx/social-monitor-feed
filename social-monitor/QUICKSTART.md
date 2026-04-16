# 🚀 Social Monitor 快速开始

> 专为监控"爱奇艺"优化的社交媒体监控工具

---

## ⚡ 最快使用方式

```bash
/social-monitor
```

就这么简单！无需任何参数。

**默认行为**：
- 🎯 关键词：**爱奇艺**
- 📱 平台：**小红书**
- ⏰ 时间范围：**最近 1 天**

---

## 📊 预期输出

执行 `/social-monitor` 后，你会得到：

```markdown
## 📊 小红书 "爱奇艺" 监控报告

**监控时间**: 2026-04-15 20:30
**时间范围**: 最近1天
**找到内容**: X 条

### 📝 内容列表

#### 1️⃣ [笔记标题]
- 作者: xxx
- 时间: X小时前
- 互动: X赞 X评论
- 链接: [原文链接]
- 摘要: 简短内容总结

[更多内容...]

### 📈 数据洞察
- 主要话题: ...
- 情感倾向: 正面/中性/负面
- 关键发现: ...
```

---

## 🎨 自定义选项

### 监控其他平台

```bash
# 监控微博
/social-monitor 爱奇艺 微博 1天

# 监控知乎
/social-monitor 爱奇艺 知乎 1天
```

### 调整时间范围

```bash
# 最近 6 小时
/social-monitor 爱奇艺 小红书 6小时

# 最近 3 天
/social-monitor 爱奇艺 小红书 3天
```

### 监控其他关键词

```bash
# 监控竞品
/social-monitor 腾讯视频 小红书 1天
/social-monitor 优酷 微博 1天

# 监控话题
/social-monitor "爱奇艺 会员" 小红书 1天
/social-monitor "爱奇艺 新剧" 微博 1天
```

---

## ⏰ 设置定时监控

### 每天自动监控

```bash
/social-monitor setup
```

按向导配置：

```
> 关键词: 爱奇艺（默认）
> 平台: ☑ 小红书 ☑ 微博 ☐ 知乎
> 执行时间: 每天 09:00
> 时间范围: 24 小时
> 确认？(y/n): y
```

### 查看定时任务

```bash
/social-monitor list
```

### 停止定时任务

```bash
/social-monitor stop [任务ID]
```

---

## 🔧 配置文件

如果你想永久修改默认值，编辑配置文件：

```bash
~/.claude/skills/social-monitor/config.json
```

**当前配置**：
```json
{
  "defaultKeyword": "爱奇艺",
  "settings": {
    "defaultKeyword": "爱奇艺",
    "defaultPlatform": "xiaohongshu",
    "defaultTimeRange": "24h"
  }
}
```

---

## 💡 使用建议

### 推荐频率

| 场景 | 频率 | 命令 |
|------|------|------|
| 日常监控 | 每天 1 次 | `/social-monitor setup` 设置为每天 09:00 |
| 重要事件期间 | 每 6 小时 | `/social-monitor setup` 设置为每 6 小时 |
| 临时查看 | 随时手动 | `/social-monitor` |

### 最佳实践

✅ **DO**:
- 每天查看一次最新动态
- 发现负面内容及时响应
- 保存历史数据用于趋势分析

❌ **DON'T**:
- 不要每小时都监控（容易触发风控）
- 不要用主账号高频抓取
- 不要忽视用户反馈

---

## 🎯 常见场景

### 场景 1: 品牌日常监控

```bash
# 早上上班第一件事
/social-monitor

# 看看有没有新的用户反馈
```

### 场景 2: 新产品发布

```bash
# 发布后 2 小时
/social-monitor 爱奇艺 小红书 2小时

# 发布后 1 天
/social-monitor 爱奇艺 小红书 1天
/social-monitor 爱奇艺 微博 1天

# 查看全网反馈
```

### 场�� 3: 危机预警

```bash
# 发现负面舆情，快速确认范围
/social-monitor "爱奇艺 问题" 微博 6小时
/social-monitor "爱奇艺 投诉" 小红书 6小时
```

### 场景 4: 竞品对比

```bash
# 同时监控自己和竞品
/social-monitor 爱奇艺 小红书 1天
/social-monitor 腾讯视频 小红书 1天
/social-monitor 优酷 小红书 1天

# 对比分析
```

---

## ⚠️ 注意事项

### 账号安全

- ⚠️ 频繁操作可能触发平台风控
- ✅ 推荐频率：每天 1-2 次
- ✅ 或使用测试账号

### 数据准确性

- ℹ️ 部分内容可能需要登录才能查看
- ℹ️ DOM 结构变化可能导致抓取失败
- ℹ️ 遇到问题请及时反馈

---

## 🆘 遇到问题？

### 问题 1: 返回空结果

```bash
# 检查环境
node ~/.claude/skills/web-access/scripts/check-deps.mjs

# 测试连通性
/social-monitor test 小红书
```

### 问题 2: 需要登录

```
提示: 在 Chrome 中登录对应平台后重试
```

### 问题 3: 抓取失败

```
可能原因:
- CDP Proxy 未启动
- 网络连接问题
- 网站 DOM 结构变化

解决: 查看详细文档
~/.claude/skills/social-monitor/README.md
```

---

## 📚 更多资源

- **完整文档**: [README.md](./README.md)
- **使用示例**: [EXAMPLES.md](./EXAMPLES.md)
- **Skill 定义**: [SKILL.md](./SKILL.md)
- **配置文件**: [config.json](./config.json)

---

## 🎉 开始使用

现在就试试：

```bash
/social-monitor
```

享受自动化监控的便利！🚀

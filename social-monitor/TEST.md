# Social Monitor - 测试指南

## 前置条件

1. ✅ 已安装 web-access skill
2. ✅ Chrome 远程调试已启用（端口 9222）
3. ✅ CDP Proxy 已启动

检查方法：
```bash
node ~/.claude/skills/web-access/scripts/check-deps.mjs
```

---

## 测试 1: 基础监控功能

### 1.1 默认监控（爱奇艺 + 小红书）

```bash
cd ~/.claude/skills/social-monitor
node scripts/monitor.mjs
```

**预期输出**：
- ✅ 检查依赖通过
- 🌐 打开小红书搜索页
- 📊 提取内容列表
- 💾 保存到 data/ 目录
- 📝 生成报告

**预期文件**：
```
~/.claude/skills/social-monitor/data/
└── 2026-04-16T17-30-00_爱奇艺_xiaohongshu.json
```

### 1.2 自定义监控（微博 + 人工智能）

```bash
node scripts/monitor.mjs "人工智能" weibo 12小时
```

---

## 测试 2: 任务管理

### 2.1 创建任务

```bash
node scripts/task-manager.mjs add \
  "AI热点监控" \
  "人工智能,ChatGPT,Claude" \
  "weibo,zhihu" \
  "0 9 * * *" \
  "24h"
```

**预期输出**：
```json
{
  "success": true,
  "task": {
    "id": "task_xxxxx",
    "name": "AI热点监控",
    ...
  },
  "cronPrompt": "请执行社交媒体监控任务..."
}
```

### 2.2 列出任务

```bash
node scripts/task-manager.mjs list
```

### 2.3 删除任务

```bash
node scripts/task-manager.mjs delete task_xxxxx
```

---

## 测试 3: 数据发布

### 3.1 初始化 Feed 仓库

```bash
node scripts/publish.mjs init [你的GitHub用户名]
```

**预期结果**：
- 创建 `~/social-monitor-feed/` 目录
- 初始化 Git 仓库
- 如果有 gh CLI，自动创建 GitHub 仓库

### 3.2 发布数据

```bash
# 先执行一次监控
node scripts/monitor.mjs

# 找到生成的数据文件
ls -lt data/ | head -1

# 发布
node scripts/publish.mjs data/[最新的文件].json
```

**预期结果**：
- 数据复制到 feed 仓库
- Git 提交并推送
- 返�� feedUrl

---

## 测试 4: 完整的 Claude 调用流程

在 Claude Code 中测试：

```
/social-monitor
```

**预期 Claude 行为**：
1. 调用 `Bash` 工具执行 `node scripts/monitor.mjs`
2. 等待执行完成
3. 解析输出的报告
4. 展示给用户

---

## 常见问题排查

### 问题 1: CDP 连接失败

**错误信息**：
```
错误: WebSocket 未连接
```

**解决方法**：
```bash
# 重启 CDP Proxy
cd ~/.claude/skills/web-access
node scripts/cdp-proxy.mjs &

# 检查状态
curl http://localhost:9333/health
```

### 问题 2: 无法提取内容

**错误信息**：
```
提取到 0 条内容
```

**可能原因**：
1. 页面加载太慢（增加等待时间）
2. DOM 选择器失效（网站更新了结构）
3. 需要登录（在 Chrome 中登录后重试）

**调试方法**：
```bash
# 手动打开 CDP 客户端
cd ~/.claude/skills/web-access
node scripts/cdp-client.mjs /new?url=https://www.xiaohongshu.com/search_result?keyword=爱奇艺

# 记录返回的 tabId，然后：
node scripts/cdp-client.mjs /screenshot --tab=[tabId]
# 查看截图确认页面加载情况
```

### 问题 3: 时间过滤不准确

**症状**：应该过滤掉的旧内容仍然出现

**排查**：
检查网站上的时间格式是否匹配 `parseTimeText()` 函数的解析逻辑。

---

## 性能基准

### 小红书
- **页面加载**: 3-5 秒
- **内容提取**: 1-2 秒
- **滚动加载**: 800ms × 次数
- **总耗时**: 约 5-10 秒（取决于内容数量）

### 微博
- **页面加载**: 2-4 秒
- **总耗时**: 约 3-6 秒

### 知乎
- **WebFetch 模式**: 2-3 秒
- **CDP 模式**: 4-6 秒

---

## 压力测试

### 测试场景 1: 连续执行

```bash
for i in {1..5}; do
  echo "=== 第 $i 次执行 ==="
  node scripts/monitor.mjs
  sleep 5
done
```

**观察指标**：
- 是否所有执行都成功
- 内存占用是否增长
- CDP Proxy 是否稳定

### 测试场景 2: 多平台并发

```bash
# 在不同终端并行执行
node scripts/monitor.mjs "测试" xiaohongshu 1小时 &
node scripts/monitor.mjs "测试" weibo 1小时 &
node scripts/monitor.mjs "测试" zhihu 1小时 &
wait
```

---

## 回归测试清单

在发布新版本前，确保以下场景都能正常工作：

- [ ] 默认参数监控（无参数）
- [ ] 自定义关键词
- [ ] 三个平台都能正常抓取（xiaohongshu, weibo, zhihu）
- [ ] 时间范围过滤正确
- [ ] 数据文件正确生成
- [ ] 报告格式正确
- [ ] 任务管理（add/list/delete）
- [ ] 数据发布到 GitHub
- [ ] Claude 调用流程完整
- [ ] 错误提示清晰

---

## 日志分析

数据文件位置：
```
~/.claude/skills/social-monitor/data/
```

每个文件包含：
```json
{
  "keyword": "关键词",
  "platform": "平台",
  "crawl_time": "抓取时间",
  "count": 数量,
  "items": [...]
}
```

分析脚本（可选）：
```bash
# 统计每天的抓取次数
ls -1 data/*.json | cut -d'_' -f1 | cut -d'/' -f2 | sort | uniq -c

# 统计各平台抓取数量
jq -r '.platform' data/*.json | sort | uniq -c

# 统计平均内容数
jq '.count' data/*.json | awk '{sum+=$1} END {print sum/NR}'
```

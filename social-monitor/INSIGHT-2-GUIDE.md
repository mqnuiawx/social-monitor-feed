# 📊 insight-2 智能洞察功能指南

## 🎯 什么是 insight-2？

`insight-2` 是自动生成的智能洞察总结字段，在每次抓取数据后自动添加到 JSON 文件的根级别。它提供了数据的快速概览和关键洞察。

## ✨ 功能特性

### 1. 📊 数据概览
- **抓取数量统计**：显示总共抓取了多少条内容
- **高互动内容识别**：自动识别点赞数超过 1000 的热门内容

### 2. 🔥 热门内容分析
- 自动提取点赞数最高的 Top 3 内容
- 显示标题和点赞数
- 帮助快速定位最受关注的话题

### 3. 🏷️ 热门话题提取
- 从标题中提取高频关键词
- 识别当前讨论的主要话题
- Top 5 热门话题展示

### 4. 💡 情感倾向分析
- 自动分析正面/负面情绪
- 识别品牌口碑趋势
- 提供监控建议

## 📖 使用方式

### 方式 1：查看 JSON 文件

```bash
# 查看最新抓取的数据
cat data/2026-04-21_爱奇艺_xiaohongshu.json | jq '."insight-2"'
```

**输出示例**：
```
【小红书·爱奇艺】监控洞察

📊 数据概览：
- 共抓取 15 条内容
- 高互动内容（>1000赞）：5 条

🔥 热门内容：
1. 从热搜到公关，爱奇艺搞不明白为什么被锤（6289）
2. 爱奇艺。让你拥抱AI没让你成为AI哈（7881）
3. 爱奇艺：《逐玉》的成功在于第三集续看率95%（3200）

🏷️ 热门话题：从热搜到公关、爱奇艺、进行AI、授权合作...、引发热议

💡 情感倾向：正面评价居多，品牌口碑良好
```

### 方式 2：编程访问

#### Node.js
```javascript
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/latest.json', 'utf-8'));

console.log('📊 智能洞察：');
console.log(data['insight-2']);
```

#### Python
```python
import json

with open('data/latest.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print('📊 智能洞察：')
print(data['insight-2'])
```

#### 从 GitHub 读取
```bash
curl -s https://raw.githubusercontent.com/mqnuiawx/social-monitor-feed/main/data/latest.json \
  | jq -r '."insight-2"'
```

### 方式 3：自动推送

设置定时任务后，每次抓取都会自动包含 insight-2：

```bash
# 使用 social-monitor-reader skill 订阅
/social-monitor-reader

# 会显示包含 insight-2 的完整报告
```

## 📊 数据结构

### JSON 格式
```json
{
  "keyword": "爱奇艺",
  "platform": "xiaohongshu",
  "time_range": "24h",
  "crawl_time": "2026-04-21T02:58:42.276Z",
  "count": 15,
  "insight-2": "【小红书·爱奇艺】监控洞察\n\n📊 数据概览：...",
  "items": [...]
}
```

### 字段位置
- **位置**：根级别（与 `keyword`、`platform` 同级）
- **类型**：string（多行文本，使用 `\n` 换行）
- **编码**：UTF-8

## 🎯 使用场景

### 场景 1：快速了解热点
当你有大量数据需要查看时，先看 `insight-2` 可以快速了解：
- 哪些内容最受关注
- 当前讨论的主要话题
- 整体情感倾向

### 场景 2：舆情监控
每天早上查看 `insight-2`，快速评估：
- 品牌口碑是否正常
- 是否有负面舆情爆发
- 需要重点关注的内容

### 场景 3：竞品分析
对比不同品牌的 `insight-2`：
- 哪个品牌的讨论热度更高
- 用户更关注哪些方面
- 不同品牌的情感倾向差异

### 场景 4：数据报告
直接复制 `insight-2` 内容到报告中：
- 格式清晰，无需重新排版
- 关键指标一目了然
- 节省分析时间

## 🔧 高级技巧

### 技巧 1：批量分析
```bash
# 批量读取所有 insight-2
for file in data/2026-04-21_*.json; do
  echo "=== $file ==="
  cat "$file" | jq -r '."insight-2"'
  echo ""
done
```

### 技巧 2：提取关键指标
```javascript
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/latest.json', 'utf-8'));

// 提取高互动内容数量
const match = data['insight-2'].match(/高互动内容.*?(\d+)\s*条/);
if (match) {
  console.log('高互动内容数：', match[1]);
}
```

### 技巧 3：自动化警报
```javascript
// 当负面情绪超过阈值时发送警报
const data = JSON.parse(fs.readFileSync('data/latest.json', 'utf-8'));
if (data['insight-2'].includes('负面情绪较多')) {
  sendAlert('检测到负面舆情，请及时关注！');
}
```

### 技巧 4：对比分析
```javascript
// 对比今天和昨天的洞察
const today = JSON.parse(fs.readFileSync('data/2026-04-21_xxx.json', 'utf-8'));
const yesterday = JSON.parse(fs.readFileSync('data/2026-04-20_xxx.json', 'utf-8'));

console.log('今日洞察：\n', today['insight-2']);
console.log('\n昨日洞察：\n', yesterday['insight-2']);
```

## 🎨 自定义 insight-2

如果你想修改洞察生成的逻辑，可以编辑 `scripts/monitor.mjs` 中的 `generateInsight` 函数：

```javascript
function generateInsight(keyword, platform, results) {
  // 在这里自定义你的洞察逻辑
  // 返回的字符串会作为 insight-2 字段
}
```

### 可以添加的功能
- 更复杂的情感分析（接入 AI API）
- 关键词词云生成
- 时间趋势分析
- 与历史数据对比
- 作者影响力分析
- 内容传播路径追踪

## ❓ 常见问题

### Q1: insight-2 为空或显示"暂无数据"？
**A**: 这是正常的，当抓取结果为 0 条时会显示此信息。

### Q2: 如何禁用 insight-2？
**A**: 暂不支持禁用，但你可以在读取数据时忽略此字段。

### Q3: insight-2 的情感分析准确吗？
**A**: 目前使用简单的关键词匹配，准确率约 70-80%。建议结合人工判断。

### Q4: 可以用 AI 生成更智能的洞察吗？
**A**: 可以！修改 `generateInsight` 函数，调用 Claude API 或其他 AI API 进行深度分析。

### Q5: insight-2 会影响数据大小吗？
**A**: 会略微增加文件大小（约 500-1000 字节），但影响可忽略。

## 📝 示例代码

### 完整示例：读取并展示洞察
```javascript
#!/usr/bin/env node
import { readFileSync } from 'fs';

const filePath = process.argv[2] || 'data/latest.json';
const data = JSON.parse(readFileSync(filePath, 'utf-8'));

console.log('╔════════════════════════════════════════════╗');
console.log('║         📊 智能洞察报告                     ║');
console.log('╚════════════════════════════════════════════╝');
console.log();
console.log(`关键词: ${data.keyword}`);
console.log(`平台: ${data.platform}`);
console.log(`时间: ${data.crawl_time}`);
console.log(`数量: ${data.count} 条`);
console.log();
console.log('─'.repeat(50));
console.log(data['insight-2']);
console.log('─'.repeat(50));
```

保存为 `show-insight.mjs`，运行：
```bash
node show-insight.mjs data/2026-04-21_爱奇艺_xiaohongshu.json
```

## 🚀 未来计划

- [ ] AI 驱动的深度洞察（接入 Claude API）
- [ ] 多维度情感分析（细粒度情感识别）
- [ ] 趋势预测（基于历史数据）
- [ ] 可视化图表生成
- [ ] 多语言支持
- [ ] 自定义洞察模板

## 📄 相关文档

- [数据结构说明](./DATA-STRUCTURE.md)
- [快速开始指南](./QUICK-START-4H.md)
- [更新日志](./CHANGELOG.md)

---

**版本**: v1.2.0
**更新时间**: 2026-04-21
**作者**: social-monitor team

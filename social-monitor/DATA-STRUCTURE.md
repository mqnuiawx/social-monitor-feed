# 📊 数据结构说明

## 📦 发布到 GitHub 的数据

每次发布时，会生成以下文件：

### 1. 原始数据 (JSON)

**文件名**: `YYYY-MM-DD_关键词_平台.json`

**示例**: `2026-04-20_爱奇艺_xiaohongshu.json`

**结构**:
```json
{
  "keyword": "爱奇艺",
  "platform": "xiaohongshu",
  "time_range": "4h",
  "crawl_time": "2026-04-20T07:57:57.592Z",
  "count": 10,
  "insight-2": "【小红书·爱奇艺】监控洞察\n\n📊 数据概览：\n- 共抓取 15 条内容\n- 高互动内容（>1000赞）：5 条\n\n🔥 热门内容：\n1. 标题（点赞数）\n...",
  "items": [
    {
      "title": "标题",
      "author": "作者",
      "time": "1小时前",
      "likes": "2437",
      "link": "原文链接",
      "navLink": "导航链接",
      "platform": "xiaohongshu",
      "summary": "内容摘要（前200字）"
    }
  ]
}
```

---

### 2. 热点分析报告 (Markdown) ✨ 新增

**文件名**: `YYYY-MM-DD_关键词_平台_analysis.md`

**示例**: `2026-04-20_爱奇艺_xiaohongshu_analysis.md`

**内容包含**:
- 🏆 热门内容 Top 3（按点赞数排序）
- 🏷️ 关键词热度（出现频率统计）
- 📊 互动数据（总点赞、平均点赞、最高点赞）
- ⏰ 时间分布（内容发布时间分布）
- 💡 热点洞察（自动分析的洞察点）
- 🎭 情感倾向（正面/中性/负面比例）
- 🎯 监控建议（后续行动建议）

**示例**:
```markdown
# 🔥 热点分析报告

**抓取时间**: 2026/4/20 15:57
**关键词**: 爱奇艺
**平台**: xiaohongshu
**时间范围**: 4h
**内容总数**: 10 条

## 🏆 热门内容 Top 3

### 1. 爱奇艺：《逐玉》的成功在于第三集续看率95%
- **作者**: 姜屁桃看内娱
- **点赞**: 2437 👍
- **时间**: 1小时前
...
```

**在线查看**: https://github.com/mqnuiawx/social-monitor-feed/blob/main/data/2026-04-20_爱奇艺_xiaohongshu_analysis.md

---

### 3. 洞察数据 (JSON) ✨ 新增

**文件名**: `YYYY-MM-DD_关键词_平台_insights.json`

**示例**: `2026-04-20_爱奇艺_xiaohongshu_insights.json`

**用途**: 供程序读取的结构化洞察数据

**结构**:
```json
{
  "topKeywords": [
    ["爱奇艺世", 3],
    ["逐玉", 2]
  ],
  "topItems": [
    {
      "title": "...",
      "author": "...",
      "likes": "2437",
      "likeCount": 2437
    }
  ],
  "totalLikes": 2698,
  "avgLikes": 300,
  "sentiment": {
    "positive": 1,
    "negative": 2,
    "neutral": 7,
    "positivePercent": 10,
    "negativePercent": 20,
    "neutralPercent": 70
  }
}
```

---

### 4. 索引文件 (index.json)

**文件名**: `index.json`

**用途**: 记录所有更新历史，供订阅端读取

**结构**:
```json
{
  "updates": [
    {
      "date": "2026-04-20",
      "keyword": "爱奇艺",
      "platform": "xiaohongshu",
      "count": 10,
      "file": "2026-04-20_爱奇艺_xiaohongshu.json",
      "analysisFile": "2026-04-20_爱奇艺_xiaohongshu_analysis.md",  // ✨ 新增
      "insightsFile": "2026-04-20_爱奇艺_xiaohongshu_insights.json", // ✨ 新增
      "timestamp": "2026-04-20T07:57:57.592Z",
      "insights": {  // ✨ 新增：直接包含洞察摘要
        "topKeywords": [...],
        "topItems": [...],
        "totalLikes": 2698,
        "avgLikes": 300,
        "sentiment": {...}
      }
    }
  ]
}
```

**在线查看**: https://raw.githubusercontent.com/mqnuiawx/social-monitor-feed/main/data/index.json

---

### 5. latest.json

**文件名**: `latest.json`

**用途**: 始终指向最新的数据（会被覆盖）

**内容**: 与原始数据 JSON 结构相同

---

## 📂 完整文件列表

发布后的 GitHub 仓库结构：

```
social-monitor-feed/
├── data/
│   ├── index.json                                    # 索引（包含洞察摘要）
│   ├── latest.json                                   # 最新数据
│   │
│   ├── 2026-04-20_爱奇艺_xiaohongshu.json            # 原始数据
│   ├── 2026-04-20_爱奇艺_xiaohongshu_analysis.md     # ✨ 热点分析
│   ├── 2026-04-20_爱奇艺_xiaohongshu_insights.json   # ✨ 洞察数据
│   │
│   ├── 2026-04-20_爱奇艺_weibo.json
│   └── ...
└── README.md
```

---

## 🔗 访问方式

### 方式 1: GitHub 网页

- **原始数据**: https://github.com/mqnuiawx/social-monitor-feed/blob/main/data/2026-04-20_爱奇艺_xiaohongshu.json
- **热点分析** ✨: https://github.com/mqnuiawx/social-monitor-feed/blob/main/data/2026-04-20_爱奇艺_xiaohongshu_analysis.md
- **洞察数据** ✨: https://github.com/mqnuiawx/social-monitor-feed/blob/main/data/2026-04-20_爱奇艺_xiaohongshu_insights.json

### 方式 2: Raw URL（API访问）

```bash
# 索引（包含洞察摘要）
curl https://raw.githubusercontent.com/mqnuiawx/social-monitor-feed/main/data/index.json

# 原始数据
curl https://raw.githubusercontent.com/mqnuiawx/social-monitor-feed/main/data/2026-04-20_爱奇艺_xiaohongshu.json

# 洞察数据 ✨
curl https://raw.githubusercontent.com/mqnuiawx/social-monitor-feed/main/data/2026-04-20_爱奇艺_xiaohongshu_insights.json
```

### 方式 3: social-monitor-reader skill

```
/social-monitor-reader           # 会显示原始数据 + 洞察摘要
/social-monitor-reader analysis  # 查看完整分析报告 ✨ 新功能
```

---

## 📊 数据字段说明

### items 字段

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| title | string | 标题 | "爱奇艺：《逐玉》的成功..." |
| author | string | 作者 | "姜屁桃看内娱" |
| time | string | 发布时间 | "1小时前" |
| likes | string | 点赞数 | "2437" |
| link | string | 原文链接 | "https://..." |
| navLink | string | 导航链接（带token） | "https://..." |
| platform | string | 平台标识 | "xiaohongshu" |
| summary | string | 内容摘要（可选） | "在2026年..." |
| content | string | 完整内容（可选） | "..." |

### 根级字段 ✨

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| keyword | string | 监控关键词 | "爱奇艺" |
| platform | string | 平台标识 | "xiaohongshu" |
| time_range | string | 时间范围 | "24h" |
| crawl_time | string | 抓取时间(ISO) | "2026-04-21T02:58:42.276Z" |
| count | number | 内容数量 | 15 |
| **insight-2** | **string** | **🆕 智能洞察总结** | "【小红书·爱奇艺】监控洞察..." |
| items | array | 内容列表 | [...] |

### insights 字段 ✨

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| topKeywords | array | 热门关键词 | [["爱奇艺世", 3]] |
| topItems | array | 热门内容Top 3 | [{title, author, ...}] |
| totalLikes | number | 总点赞数 | 2698 |
| avgLikes | number | 平均点赞 | 300 |
| sentiment | object | 情感分析 | {positive, negative, neutral} |

---

## 🎯 使用场景

### 1. 查看原始数据

适合：需要完整数据的场景

```bash
curl https://raw.githubusercontent.com/mqnuiawx/social-monitor-feed/main/data/latest.json | jq
```

### 2. 查看热点分析 ✨

适合：快速了解热点

**浏览器打开**:
```
https://github.com/mqnuiawx/social-monitor-feed/blob/main/data/2026-04-20_爱奇艺_xiaohongshu_analysis.md
```

### 3. 读取洞察数据 ✨

适合：程序化处理、数据分析

```javascript
const insights = await fetch(
  'https://raw.githubusercontent.com/mqnuiawx/social-monitor-feed/main/data/2026-04-20_爱奇艺_xiaohongshu_insights.json'
).then(r => r.json());

console.log('热门关键词:', insights.topKeywords);
console.log('总点赞数:', insights.totalLikes);
console.log('情感倾向:', insights.sentiment);
```

### 4. 订阅自动推送

适合：日常监控

```
/social-monitor-reader setup
# 每天 8:40 自动推送最新分析
```

---

## 🆕 更新记录

### v1.1.0 (2026-04-20) ✨

新增：
- ✅ 热点分析报告 (Markdown)
- ✅ 洞察数据 (JSON)
- ✅ index.json 包含洞察摘要
- ✅ 自动生成分析脚本

### v1.0.0 (2026-04-16)

初始版本：
- ✅ 原始数据 (JSON)
- ✅ 索引文件 (index.json)
- ✅ latest.json

---

## 📝 总结

**现在每次发布会生成 3 个文件**:

1. **原始数据** `.json` - 完整的抓取结果
2. **热点分析** `_analysis.md` - 人类可读的分析报告 ✨
3. **洞察数据** `_insights.json` - 程序可读的洞察数据 ✨

**索引文件** `index.json` 也包含了洞察摘要，方便快速预览 ✨

---

**仓库地址**: https://github.com/mqnuiawx/social-monitor-feed
**Feed URL**: https://raw.githubusercontent.com/mqnuiawx/social-monitor-feed/main/data/index.json

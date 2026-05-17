#!/usr/bin/env node

/**
 * 生成热点分析报告
 * 基于抓取数据自动生成 Markdown 格式的热点分析
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 生成热点分析报告
 */
function generateHotspotReport(data) {
  const items = data.items || [];
  const date = new Date(data.crawl_time).toLocaleDateString('zh-CN');
  const time = new Date(data.crawl_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  let report = `# 🔥 热点分析报告\n\n`;
  report += `**抓取时间**: ${date} ${time}\n`;
  report += `**关键词**: ${data.keyword}\n`;
  report += `**平台**: ${data.platform}\n`;
  report += `**时间范围**: ${data.time_range}\n`;
  report += `**内容总数**: ${items.length} 条\n\n`;

  if (items.length === 0) {
    report += `暂无内容可分析。\n`;
    return { report, insights: null };
  }

  // 1. 热门内容 Top 3
  report += `## 🏆 热门内容 Top 3\n\n`;
  const topItems = items
    .filter(item => item.likes && item.likes !== '赞')
    .map(item => ({
      ...item,
      likeCount: parseInt(item.likes.replace(/[^\d]/g, '')) || 0
    }))
    .sort((a, b) => b.likeCount - a.likeCount)
    .slice(0, 3);

  topItems.forEach((item, index) => {
    report += `### ${index + 1}. ${item.title}\n\n`;
    report += `- **作者**: ${item.author}\n`;
    report += `- **点赞**: ${item.likes} 👍\n`;
    report += `- **时间**: ${item.time}\n`;
    report += `- **链接**: [查看原文](${item.link})\n\n`;

    if (item.summary) {
      const preview = item.summary.substring(0, 200).replace(/\n/g, ' ');
      report += `> ${preview}${item.summary.length > 200 ? '...' : ''}\n\n`;
    }
  });

  // 2. 关键词分析
  report += `## 🏷️ 关键词热度\n\n`;
  const keywords = extractKeywords(items);
  const topKeywords = keywords.slice(0, 10);

  topKeywords.forEach(([word, count]) => {
    const bar = '█'.repeat(Math.min(count * 3, 20));
    report += `- **${word}**: ${count} 次 ${bar}\n`;
  });
  report += `\n`;

  // 3. 互动数据分析
  report += `## 📊 互动数据\n\n`;
  const likesData = items
    .filter(item => item.likes && item.likes !== '赞')
    .map(item => parseInt(item.likes.replace(/[^\d]/g, '')) || 0)
    .filter(n => n > 0);

  if (likesData.length > 0) {
    const totalLikes = likesData.reduce((a, b) => a + b, 0);
    const avgLikes = Math.round(totalLikes / likesData.length);
    const maxLikes = Math.max(...likesData);

    report += `- **总点赞数**: ${totalLikes.toLocaleString()}\n`;
    report += `- **平均点赞**: ${avgLikes.toLocaleString()}\n`;
    report += `- **最高点赞**: ${maxLikes.toLocaleString()}\n\n`;
  }

  // 4. 时间分布
  report += `## ⏰ 时间分布\n\n`;
  const timeGroups = analyzeTimeDistribution(items);
  Object.entries(timeGroups).forEach(([range, count]) => {
    if (count > 0) {
      const bar = '█'.repeat(Math.ceil(count * 20 / items.length));
      report += `- **${range}**: ${count} 条 ${bar}\n`;
    }
  });
  report += `\n`;

  // 5. 热点洞察
  report += `## 💡 热点洞察\n\n`;
  const insights = generateInsights(data, items, topKeywords, topItems);
  insights.forEach((insight, index) => {
    report += `### ${index + 1}. ${insight.title}\n\n`;
    report += `${insight.content}\n\n`;
  });

  // 6. 情感倾向
  report += `## 🎭 情感倾向\n\n`;
  const sentiment = analyzeSentiment(items);
  report += `- **正面**: ${sentiment.positive} 条 (${sentiment.positivePercent}%)\n`;
  report += `- **中性**: ${sentiment.neutral} 条 (${sentiment.neutralPercent}%)\n`;
  report += `- **负面**: ${sentiment.negative} 条 (${sentiment.negativePercent}%)\n\n`;

  // 7. 建议
  report += `## 🎯 监控建议\n\n`;
  const recommendations = generateRecommendations(data, insights);
  recommendations.forEach((rec, index) => {
    report += `${index + 1}. ${rec}\n`;
  });
  report += `\n`;

  // 8. 数据来源
  report += `---\n\n`;
  report += `**数据来源**: [GitHub](https://github.com/mqnuiawx/social-monitor-feed)\n`;
  report += `**原始数据**: [${data.keyword}_${data.platform}.json](../${date.replace(/\//g, '-')}_${data.keyword}_${data.platform}.json)\n`;

  return {
    report,
    insights: {
      topKeywords: topKeywords.slice(0, 5),
      topItems: topItems.slice(0, 3),
      totalLikes: likesData.reduce((a, b) => a + b, 0),
      avgLikes: likesData.length > 0 ? Math.round(likesData.reduce((a, b) => a + b, 0) / likesData.length) : 0,
      sentiment
    }
  };
}

/**
 * 提取关键词
 */
function extractKeywords(items) {
  const stopWords = new Set([
    '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一',
    '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有',
    '看', '好', '自己', '这', '中', '么', '出', '为', '来', '个', '多'
  ]);

  const wordCount = {};

  items.forEach(item => {
    const text = [item.title, item.summary, item.content].filter(Boolean).join(' ');
    const words = text.match(/[\u4e00-\u9fa5]{2,4}/g) || [];

    words.forEach(word => {
      if (!stopWords.has(word) && word.length >= 2) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });
  });

  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1]);
}

/**
 * 时间分布分析
 */
function analyzeTimeDistribution(items) {
  const groups = {
    '1小时内': 0,
    '1-2小时': 0,
    '2-4小时': 0,
    '4小时以上': 0
  };

  items.forEach(item => {
    if (!item.time) return;

    if (item.time.includes('分钟前')) {
      groups['1小时内']++;
    } else if (item.time.includes('小时前')) {
      const hours = parseInt(item.time);
      if (hours <= 1) groups['1小时内']++;
      else if (hours <= 2) groups['1-2小时']++;
      else if (hours <= 4) groups['2-4小时']++;
      else groups['4小时以上']++;
    } else {
      groups['4小时以上']++;
    }
  });

  return groups;
}

/**
 * 生成热点洞察
 */
function generateInsights(data, items, topKeywords, topItems) {
  const insights = [];

  // 洞察 1: 最热话题
  if (topKeywords.length > 0) {
    const hotTopic = topKeywords[0][0];
    const count = topKeywords[0][1];
    insights.push({
      title: `"${hotTopic}" 成为核心话题`,
      content: `在 ${items.length} 条内容中，"${hotTopic}" 出现了 ${count} 次，是讨论最多的关键词。相关内容占比 ${Math.round(count / items.length * 100)}%。`
    });
  }

  // 洞察 2: 爆款内容
  if (topItems.length > 0 && topItems[0].likeCount > 100) {
    const topItem = topItems[0];
    insights.push({
      title: `爆款内容: "${topItem.title}"`,
      content: `该内容获得 ${topItem.likes} 点赞，远超平均水平，作者 @${topItem.author} 的观点引发广泛共鸣。`
    });
  }

  // 洞察 3: 时效性分析
  const recentCount = items.filter(item =>
    item.time && (item.time.includes('分钟前') || item.time.includes('1小时前'))
  ).length;

  if (recentCount / items.length > 0.5) {
    insights.push({
      title: `高时效性话题`,
      content: `${recentCount} 条内容 (${Math.round(recentCount / items.length * 100)}%) 在1小时内发布，说明这是一个正在发生的热点事件，建议持续监控。`
    });
  }

  // 洞察 4: 多角度讨论
  const authors = new Set(items.map(item => item.author).filter(Boolean));
  if (authors.size >= items.length * 0.8) {
    insights.push({
      title: `多元化讨论`,
      content: `${authors.size} 位不同作者参与讨论，说明话题引发了广泛关注，不是单一账号的刷屏。`
    });
  }

  return insights;
}

/**
 * 情感分析（简单版本）
 */
function analyzeSentiment(items) {
  const positiveWords = ['成功', '火爆', '好评', '精彩', '优秀', '赞', '棒', '喜欢', '期待', '支持'];
  const negativeWords = ['失败', '差评', '糟糕', '失望', '批评', '争议', '质疑', '辟谣', '吐槽', '抵制'];

  let positive = 0;
  let negative = 0;
  let neutral = 0;

  items.forEach(item => {
    const text = [item.title, item.summary, item.content].filter(Boolean).join(' ');

    const hasPositive = positiveWords.some(word => text.includes(word));
    const hasNegative = negativeWords.some(word => text.includes(word));

    if (hasPositive && !hasNegative) positive++;
    else if (hasNegative && !hasPositive) negative++;
    else neutral++;
  });

  const total = items.length;
  return {
    positive,
    negative,
    neutral,
    positivePercent: Math.round(positive / total * 100),
    negativePercent: Math.round(negative / total * 100),
    neutralPercent: Math.round(neutral / total * 100)
  };
}

/**
 * 生成监控建议
 */
function generateRecommendations(data, insights) {
  const recommendations = [];

  // 基于时效性
  const hasRecentContent = insights.some(i => i.title.includes('时效性'));
  if (hasRecentContent) {
    recommendations.push('⏰ 建议在 **2-4小时后** 再次抓取，追踪话题发展');
  }

  // 基于热度
  recommendations.push(`📊 关注 **"${data.keyword}"** 在其他平台（微博、知乎）的讨论情况`);

  // 基于争议
  const hasControversy = insights.some(i => i.content.includes('争议') || i.content.includes('质疑'));
  if (hasControversy) {
    recommendations.push('⚠️ 话题存在争议，建议监控品牌方的官方回应');
  }

  // 通用建议
  recommendations.push('🔍 使用 `/social-monitor-reader` 订阅每日更新');

  return recommendations;
}

// CLI 模式
if (process.argv[1] === __filename) {
  const dataFile = process.argv[2];

  if (!dataFile) {
    console.error('请提供数据文件路径');
    console.log('用法: node generate-hotspot-report.mjs <data-file-path>');
    process.exit(1);
  }

  try {
    const data = JSON.parse(readFileSync(dataFile, 'utf-8'));
    const { report, insights } = generateHotspotReport(data);

    console.log(report);

    // 输出 JSON 格式的洞察数据（供其他程序使用）
    if (process.argv.includes('--json')) {
      console.log('\n--- JSON Output ---\n');
      console.log(JSON.stringify(insights, null, 2));
    }

  } catch (error) {
    console.error('❌ 生成报告失败:', error.message);
    process.exit(1);
  }
}

export { generateHotspotReport };

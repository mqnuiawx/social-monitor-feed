#!/usr/bin/env node

/**
 * 数据分析脚本：分析最近抓取的爱奇艺内容
 * 提供热点话题提取、互动分析等功能
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SKILL_DIR = join(__dirname, '..');
const DATA_DIR = join(SKILL_DIR, 'data');

/**
 * 获取最新的数据文件
 */
function getLatestDataFile() {
  const files = readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    throw new Error('没有找到数据文件');
  }

  return join(DATA_DIR, files[0]);
}

/**
 * 分析内容数据
 */
function analyzeData(data) {
  const items = data.items || [];

  console.log(`\n📊 数据分析报告`);
  console.log(`\n关键词: ${data.keyword}`);
  console.log(`平台: ${data.platform}`);
  console.log(`抓取时间: ${new Date(data.crawl_time).toLocaleString('zh-CN')}`);
  console.log(`时间范围: ${data.time_range}`);
  console.log(`内容总数: ${items.length} 条\n`);

  if (items.length === 0) {
    console.log('⚠️  没有数据可分析');
    return;
  }

  // 1. 时间分布
  console.log('⏰ 时间分布:');
  const timeGroups = {
    '1小时内': 0,
    '1-2小时': 0,
    '2-4小时': 0,
    '4小时以上': 0
  };

  items.forEach(item => {
    if (item.time) {
      if (item.time.includes('分钟前')) {
        timeGroups['1小时内']++;
      } else if (item.time.includes('小时前')) {
        const hours = parseInt(item.time);
        if (hours <= 1) timeGroups['1小时内']++;
        else if (hours <= 2) timeGroups['1-2小时']++;
        else if (hours <= 4) timeGroups['2-4小时']++;
        else timeGroups['4小时以上']++;
      } else {
        timeGroups['4小时以上']++;
      }
    }
  });

  Object.entries(timeGroups).forEach(([range, count]) => {
    if (count > 0) {
      const bar = '█'.repeat(Math.ceil(count * 20 / items.length));
      console.log(`  ${range}: ${count} 条 ${bar}`);
    }
  });

  // 2. 互动数据分析
  console.log('\n👍 互动数据:');
  const likesData = items
    .filter(item => item.likes && item.likes !== '赞')
    .map(item => parseInt(item.likes.replace(/[^\d]/g, '')) || 0)
    .filter(n => n > 0);

  if (likesData.length > 0) {
    const totalLikes = likesData.reduce((a, b) => a + b, 0);
    const avgLikes = Math.round(totalLikes / likesData.length);
    const maxLikes = Math.max(...likesData);

    console.log(`  总点赞数: ${totalLikes}`);
    console.log(`  平均点赞: ${avgLikes}`);
    console.log(`  最高点赞: ${maxLikes}`);
  }

  // 3. 热门内容（点赞最多的前3条）
  console.log('\n🔥 热门内容 (Top 3):');
  const topItems = items
    .filter(item => item.likes && item.likes !== '赞')
    .map(item => ({
      ...item,
      likeCount: parseInt(item.likes.replace(/[^\d]/g, '')) || 0
    }))
    .sort((a, b) => b.likeCount - a.likeCount)
    .slice(0, 3);

  topItems.forEach((item, index) => {
    console.log(`\n  ${index + 1}. ${item.title}`);
    console.log(`     作者: ${item.author} | 点赞: ${item.likes} | 时间: ${item.time}`);
    if (item.summary) {
      const preview = item.summary.substring(0, 80).replace(/\n/g, ' ');
      console.log(`     ${preview}...`);
    }
  });

  // 4. 关键词提取
  console.log('\n🏷️  热门关键词:');
  const keywords = extractKeywords(items);
  keywords.slice(0, 10).forEach(([word, count]) => {
    console.log(`  ${word}: ${count} 次`);
  });

  // 5. 作者活跃度
  console.log('\n👤 活跃作者:');
  const authorCount = {};
  items.forEach(item => {
    if (item.author) {
      authorCount[item.author] = (authorCount[item.author] || 0) + 1;
    }
  });

  Object.entries(authorCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([author, count]) => {
      console.log(`  ${author}: ${count} 条内容`);
    });

  console.log('\n✅ 分析完成！\n');
}

/**
 * 提取关键词（简单版本）
 */
function extractKeywords(items) {
  // 停用词
  const stopWords = new Set([
    '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一',
    '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有',
    '看', '好', '自己', '这', '中', '么', '出', '为', '来', '个', '多', '和',
    '爱奇艺', '小红书' // 排除搜索关键词本身
  ]);

  const wordCount = {};

  items.forEach(item => {
    const text = [item.title, item.summary].filter(Boolean).join(' ');

    // 简单的中文分词（基于常见2-4字词）
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

// CLI 入口
if (process.argv[1] === __filename) {
  try {
    const dataFile = process.argv[2] || getLatestDataFile();
    console.log(`📂 读取数据文件: ${dataFile}`);

    const data = JSON.parse(readFileSync(dataFile, 'utf-8'));
    analyzeData(data);
  } catch (error) {
    console.error('❌ 分析失败:', error.message);
    process.exit(1);
  }
}

export { analyzeData };

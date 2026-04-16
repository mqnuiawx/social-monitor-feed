#!/usr/bin/env node

/**
 * Social Monitor Reader - 订阅端脚本
 * 从 GitHub feed 仓库读取监控数据
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SKILL_DIR = join(__dirname, '..');

// 加载配置
const configPath = join(SKILL_DIR, 'config.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

/**
 * 获取最新的监控数据（同一天所有平台）
 */
async function fetchLatest() {
  console.log(`📡 连接到 feed...`);
  console.log(`🔗 Feed URL: ${config.feedUrl}`);

  if (!config.feedUrl || config.feedUrl.includes('YOUR_GITHUB_USERNAME')) {
    throw new Error(`
❌ Feed URL 未配置！

请编辑配置文件：
  ~/.claude/skills/social-monitor-reader/config.json

将 feedUrl 改为数据提供者的 GitHub raw URL，例如：
  "feedUrl": "https://cdn.jsdelivr.net/gh/username/social-monitor-feed@main/data/index.json"
    `);
  }

  try {
    const indexData = execSync(`curl -s "${config.feedUrl}"`, { encoding: 'utf-8' });
    const index = JSON.parse(indexData);

    if (!index.updates || index.updates.length === 0) {
      console.log(`ℹ️  暂无更新`);
      return null;
    }

    // 取最新日期
    const latestDate = index.updates[0].date;
    // 找出当天所有平台的数据
    const todayUpdates = index.updates.filter(u => u.date === latestDate);
    console.log(`✅ 找到 ${index.updates.length} 条记录，最新日期 ${latestDate} 共 ${todayUpdates.length} 个平台`);

    const results = [];
    for (const update of todayUpdates) {
      const baseUrl = config.feedUrl.replace('index.json', '');
      const dataUrl = baseUrl + encodeURIComponent(update.file);
      console.log(`📥 下载: ${update.file}`);
      const dataContent = execSync(`curl -s "${dataUrl}"`, { encoding: 'utf-8' });
      const data = JSON.parse(dataContent);
      results.push({ update, data });
    }

    // 缓存
    const cacheDir = join(SKILL_DIR, '.cache');
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
    writeFileSync(join(cacheDir, 'latest.json'), JSON.stringify({
      fetchTime: new Date().toISOString(),
      results
    }, null, 2), 'utf-8');

    return { results, date: latestDate };

  } catch (error) {
    console.error(`❌ 获取数据失败:`, error.message);

    // 尝试读取缓存
    const cacheFile = join(SKILL_DIR, '.cache/latest.json');
    if (existsSync(cacheFile)) {
      console.log(`📦 使用缓存数据`);
      const cached = JSON.parse(readFileSync(cacheFile, 'utf-8'));
      return { results: cached.results, date: cached.results[0]?.update.date, fromCache: true };
    }

    throw error;
  }
}

/**
 * 获取历史数据列表
 */
async function fetchHistory(limit = 10) {
  console.log(`📚 获取历史记录...`);

  try {
    const indexData = execSync(`curl -s "${config.feedUrl}"`, { encoding: 'utf-8' });
    const index = JSON.parse(indexData);

    if (!index.updates || index.updates.length === 0) {
      return [];
    }

    return index.updates.slice(0, limit);

  } catch (error) {
    console.error(`❌ 获取历史失败:`, error.message);
    return [];
  }
}

/**
 * 获取特定日期的数据
 */
async function fetchByDate(date) {
  console.log(`📅 获取 ${date} 的数据...`);

  try {
    const indexData = execSync(`curl -s "${config.feedUrl}"`, { encoding: 'utf-8' });
    const index = JSON.parse(indexData);

    const update = index.updates.find(u => u.date === date);
    if (!update) {
      throw new Error(`未找到 ${date} 的数据`);
    }

    const dataUrl = config.feedUrl.replace('index.json', '') + encodeURIComponent(update.file);
    const dataContent = execSync(`curl -s "${dataUrl}"`, { encoding: 'utf-8' });
    const data = JSON.parse(dataContent);

    return { update, data };

  } catch (error) {
    console.error(`❌ 获取数据失败:`, error.message);
    throw error;
  }
}

/**
 * 生成报告
 */
function generateReport(update, data, options = {}) {
  const platformNames = {
    xiaohongshu: '小红书',
    weibo: '微博',
    zhihu: '知乎'
  };

  const platformName = platformNames[data.platform] || data.platform;

  let report = `## 📊 ${platformName} "${data.keyword}" 监控报告\n\n`;

  if (options.fromCache) {
    report += `⚠️  **离线模式**: 使用缓存数据\n\n`;
  }

  report += `**抓取时间**: ${new Date(data.crawl_time).toLocaleString('zh-CN')}\n`;
  report += `**时间范围**: ${data.time_range}\n`;
  report += `**找到内容**: ${data.count} 条\n\n`;

  if (data.count === 0) {
    report += `暂无符合条件的内容。\n`;
    return report;
  }

  report += `### 📝 内容列表\n\n`;

  const items = options.limit ? data.items.slice(0, options.limit) : data.items;

  items.forEach((item, index) => {
    report += `#### ${index + 1}️⃣ ${item.title}\n\n`;

    if (item.author) {
      report += `- **作者**: ${item.author}\n`;
    }

    if (item.time) {
      report += `- **时间**: ${item.time}\n`;
    }

    if (item.likes) {
      report += `- **点赞**: ${item.likes}\n`;
    }

    if (item.link) {
      report += `- **链接**: [查看原文](${item.link})\n`;
    }

    if (item.content) {
      report += `- **内容**: ${item.content.substring(0, 150)}${item.content.length > 150 ? '...' : ''}\n`;
    } else if (item.summary) {
      report += `- **摘要**: ${item.summary}\n`;
    }

    report += `\n`;
  });

  if (data.items.length > items.length) {
    report += `\n_（仅显示前 ${items.length} 条，共 ${data.items.length} 条）_\n`;
  }

  report += `\n---\n\n`;
  report += `📡 **数据来源**: ${config.feedUrl}\n`;
  report += `🔄 **更新时间**: ${update.date} ${update.timestamp ? new Date(update.timestamp).toLocaleTimeString('zh-CN') : ''}\n`;

  return report;
}

/**
 * CLI 模式
 */
if (process.argv[1] === __filename) {
  const command = process.argv[2];

  (async () => {
    try {
      switch (command) {
        case 'latest':
        case undefined: {
          const result = await fetchLatest();
          if (!result) {
            console.log('暂无数据');
            process.exit(0);
          }

          console.log(`\n📅 ${result.date} 监控日报（共 ${result.results.length} 个平台）\n`);
          for (const { update, data } of result.results) {
            const report = generateReport(update, data, {
              fromCache: result.fromCache,
              limit: 20
            });
            console.log(report);
          }
          break;
        }

        case 'history': {
          const limit = parseInt(process.argv[3]) || 10;
          const history = await fetchHistory(limit);

          console.log(`\n## 📚 历史记录（最近 ${history.length} 条）\n`);
          history.forEach((update, index) => {
            console.log(`${index + 1}. [${update.date}] ${update.keyword} @ ${update.platform} - ${update.count}条`);
          });
          break;
        }

        case 'date': {
          const date = process.argv[3];
          if (!date) {
            console.error('请提供日期，格式: YYYY-MM-DD');
            process.exit(1);
          }

          const result = await fetchByDate(date);
          const report = generateReport(result.update, result.data, { limit: 20 });
          console.log('\n' + report);
          break;
        }

        case 'config': {
          console.log('\n当前配置:\n');
          console.log(JSON.stringify(config, null, 2));
          break;
        }

        default:
          console.error(`未知命令: ${command}`);
          console.log(`
可用命令:
  latest          获取最新监控数据（默认）
  history [N]     查看历史记录（默认 10 条）
  date <YYYY-MM-DD>  查看特定日期的数据
  config          查看当前配置
          `);
          process.exit(1);
      }

    } catch (error) {
      console.error('\n❌ 错误:', error.message);
      process.exit(1);
    }
  })();
}

export { fetchLatest, fetchHistory, fetchByDate, generateReport };

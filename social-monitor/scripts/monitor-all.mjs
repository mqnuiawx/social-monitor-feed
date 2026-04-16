#!/usr/bin/env node

/**
 * monitor-all.mjs - 多平台批量监控脚本
 * 循环抓取所有启用平台，各自生成独立数据文件，最后统一推送到 GitHub
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync, writeFileSync, copyFileSync, mkdirSync, readdirSync } from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SKILL_DIR = join(__dirname, '..');

const configPath = join(SKILL_DIR, 'config.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

/**
 * 主函数：依次抓取所有启用平台，最后统一推送
 */
async function monitorAll(keyword, timeRange) {
  keyword   = keyword   || config.settings.defaultKeyword;
  timeRange = timeRange || config.settings.defaultTimeRange;

  const platforms = Object.entries(config.platforms)
    .filter(([, cfg]) => cfg.enabled)
    .map(([id]) => id);

  console.log(`\n🚀 多平台监控开始`);
  console.log(`📌 关键词: ${keyword}`);
  console.log(`⏰ 时间范围: ${timeRange}`);
  console.log(`📱 平台列表: ${platforms.join(', ')}\n`);

  const results = [];

  for (const platform of platforms) {
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`📱 开始抓取: ${config.platforms[platform].name}`);
    console.log(`${'─'.repeat(40)}`);

    // 记录抓取前数据目录的文件列表，用于找到新生成的文件
    const dataDir = join(SKILL_DIR, 'data');
    const beforeFiles = existsSync(dataDir)
      ? new Set(readdirSync(dataDir))
      : new Set();

    try {
      const output = execSync(
        `node "${join(__dirname, 'monitor.mjs')}" "${keyword}" "${platform}" "${timeRange}"`,
        { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );
      console.log(output);

      // 找到本次新生成的文件
      const dataFile = findNewFile(dataDir, beforeFiles);

      if (dataFile) {
        results.push({ platform, dataFile, success: true });
        console.log(`✅ ${config.platforms[platform].name} 完成: ${dataFile}`);
      } else {
        console.warn(`⚠️  ${config.platforms[platform].name} 未找到输出文件`);
        results.push({ platform, success: false, error: '未找到输出文件' });
      }

    } catch (error) {
      console.error(`❌ ${config.platforms[platform].name} 抓取失败: ${error.message}`);
      results.push({ platform, success: false, error: error.message });
    }

    // 平台间间隔，避免连续请求触发风控
    if (platforms.indexOf(platform) < platforms.length - 1) {
      console.log(`\n⏳ 等待 3 秒后继续下一平台...`);
      await sleep(3000);
    }
  }

  // 汇总
  const succeeded = results.filter(r => r.success);
  const failed    = results.filter(r => !r.success);

  console.log(`\n${'═'.repeat(40)}`);
  console.log(`📊 抓取汇总: ${succeeded.length} 成功 / ${failed.length} 失败`);
  if (failed.length > 0) {
    failed.forEach(r => console.log(`  ❌ ${r.platform}: ${r.error}`));
  }

  if (succeeded.length === 0) {
    console.log(`\n⚠️  所有平台均失败，跳过发布`);
    return results;
  }

  // 统一发布（一次 git push）
  console.log(`\n📤 发布到 GitHub...`);
  await publishAll(succeeded.map(r => r.dataFile), keyword);

  return results;
}

/**
 * 找到抓取后新增的数据文件
 */
function findNewFile(dataDir, beforeFiles) {
  if (!existsSync(dataDir)) return null;
  const afterFiles = readdirSync(dataDir);
  const newFiles = afterFiles.filter(f => !beforeFiles.has(f) && f.endsWith('.json'));
  return newFiles.length > 0 ? join(dataDir, newFiles[newFiles.length - 1]) : null;
}

/**
 * 批量发布到 feed 仓库，统一 git push
 */
async function publishAll(dataFiles, keyword) {
  const feedRepo = join(process.env.HOME, 'social-monitor-feed');
  if (!existsSync(feedRepo)) {
    throw new Error(`Feed 仓库不存在: ${feedRepo}`);
  }

  const feedDataDir = join(feedRepo, 'data');
  if (!existsSync(feedDataDir)) mkdirSync(feedDataDir, { recursive: true });

  const date = new Date().toISOString().split('T')[0];
  const indexFile = join(feedDataDir, 'index.json');

  let index = { updates: [] };
  if (existsSync(indexFile)) {
    index = JSON.parse(readFileSync(indexFile, 'utf-8'));
  }

  const publishedPlatforms = [];

  for (const dataFile of dataFiles) {
    const data = JSON.parse(readFileSync(dataFile, 'utf-8'));
    const filename = `${date}_${data.keyword}_${data.platform}.json`;
    const destFile = join(feedDataDir, filename);

    console.log(`  📋 ${config.platforms[data.platform]?.name || data.platform}: ${filename} (${data.count} 条)`);
    copyFileSync(dataFile, destFile);

    // 同一天同平台去重，只保留最新
    index.updates = index.updates.filter(
      u => !(u.date === date && u.platform === data.platform && u.keyword === data.keyword)
    );
    index.updates.unshift({
      date,
      keyword: data.keyword,
      platform: data.platform,
      count: data.count,
      file: filename,
      timestamp: data.crawl_time
    });

    publishedPlatforms.push(`${config.platforms[data.platform]?.name || data.platform}(${data.count}条)`);
  }

  // 保留最近 60 条记录
  index.updates = index.updates.slice(0, 60);
  writeFileSync(indexFile, JSON.stringify(index, null, 2), 'utf-8');

  // 统一 git push
  process.chdir(feedRepo);
  const status = execSync('git status --porcelain', { encoding: 'utf-8' });
  if (!status.trim()) {
    console.log(`ℹ️  没有新变更，跳过推送`);
    return;
  }

  execSync('git add data/', { stdio: 'inherit' });
  execSync(`git commit -m "update: ${date} - ${keyword} [${publishedPlatforms.join(', ')}]"`, { stdio: 'inherit' });
  execSync('git push origin main', { stdio: 'inherit' });

  console.log(`\n✅ 发布成功！`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// CLI 入口
if (process.argv[1] === __filename) {
  const keyword   = process.argv[2];
  const timeRange = process.argv[3];

  monitorAll(keyword, timeRange)
    .then(results => {
      const ok = results.filter(r => r.success).length;
      console.log(`\n🎉 全部完成：${ok}/${results.length} 个平台成功`);
    })
    .catch(error => {
      console.error('❌ 运行失败:', error.message);
      process.exit(1);
    });
}

export { monitorAll };

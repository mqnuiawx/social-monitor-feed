#!/usr/bin/env node
/**
 * monitor-and-publish.mjs
 * 串行抓取小红书 + 微博，完成后统一推送到 GitHub
 * 用法: node scripts/monitor-and-publish.mjs <keyword> <timeRange>
 * 例如: node scripts/monitor-and-publish.mjs 爱奇艺 24h
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SKILL_DIR = join(__dirname, '..');

const { monitor } = await import('./monitor.mjs');
const { publish } = await import('./publish.mjs');

const configPath = join(SKILL_DIR, 'config.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

async function main() {
  const keyword   = process.argv[2] || config.settings.defaultKeyword;
  const timeRange = process.argv[3] || '24h';
  const platforms = ['xiaohongshu', 'weibo'];

  console.log(`\n🚀 多平台监控开始`);
  console.log(`📌 关键词: ${keyword}`);
  console.log(`⏰ 时间范围: ${timeRange}`);
  console.log(`📱 平台: ${platforms.join(', ')}\n`);

  const outputFiles = [];
  const errors = [];

  for (const platform of platforms) {
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`📱 开始抓取: ${platform}`);
    try {
      const { outputFile } = await monitor(keyword, platform, timeRange);
      outputFiles.push(outputFile);
      console.log(`✅ ${platform} 抓取完成: ${outputFile}`);
    } catch (err) {
      errors.push({ platform, error: err.message });
      console.error(`❌ ${platform} 抓取失败: ${err.message}`);
    }
  }

  // 有成功结果才推送
  if (outputFiles.length > 0) {
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`📤 推送到 GitHub...`);
    for (const file of outputFiles) {
      try {
        await publish(file);
        console.log(`✅ 推送成功: ${file}`);
      } catch (err) {
        errors.push({ file, error: err.message });
        console.error(`❌ 推送失败: ${err.message}`);
      }
    }
  } else {
    console.error(`\n❌ 所有平台均抓取失败，跳过推送`);
  }

  if (errors.length > 0) {
    console.log(`\n⚠️  错误汇总:`);
    errors.forEach(e => console.log(`  - ${e.platform || e.file}: ${e.error}`));
    process.exit(1);
  }

  console.log(`\n✅ 全部完成！`);
}

main().catch(err => {
  console.error('❌ 任务失败:', err.message);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * Publish - 将抓取结果发布到 GitHub feed 仓库
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SKILL_DIR = join(__dirname, '..');

/**
 * 发布数据到 feed 仓库
 */
async function publish(dataFile) {
  console.log(`📤 开始发布数据...`);

  // 1. 检查数据文件
  if (!existsSync(dataFile)) {
    throw new Error(`数据文件不存在: ${dataFile}`);
  }

  const data = JSON.parse(readFileSync(dataFile, 'utf-8'));
  console.log(`✅ 数据文件: ${dataFile}`);
  console.log(`   关键词: ${data.keyword}`);
  console.log(`   平台: ${data.platform}`);
  console.log(`   内容数: ${data.count}`);

  // 2. 检查 feed 仓库
  const feedRepo = join(process.env.HOME, 'social-monitor-feed');
  if (!existsSync(feedRepo)) {
    console.log(`⚠️  Feed 仓库不存在: ${feedRepo}`);
    console.log(`   请先运行: bash setup-feed-repo.sh [你的GitHub用户名]`);
    throw new Error('Feed 仓库未初始化');
  }

  console.log(`✅ Feed 仓库: ${feedRepo}`);

  // 3. 准备数据目录
  const feedDataDir = join(feedRepo, 'data');
  if (!existsSync(feedDataDir)) {
    mkdirSync(feedDataDir, { recursive: true });
  }

  // 4. 复制数据文件
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const latestFile = join(feedDataDir, 'latest.json');
  const historyFile = join(feedDataDir, `${date}_${data.keyword}_${data.platform}.json`);

  console.log(`📋 复制到 latest.json...`);
  copyFileSync(dataFile, latestFile);

  console.log(`📋 保存历史: ${date}_${data.keyword}_${data.platform}.json`);
  copyFileSync(dataFile, historyFile);

  // 5. 更新索引文件
  console.log(`📝 更新索引...`);
  const indexFile = join(feedDataDir, 'index.json');
  let index = { updates: [] };

  if (existsSync(indexFile)) {
    index = JSON.parse(readFileSync(indexFile, 'utf-8'));
  }

  index.updates.unshift({
    date,
    keyword: data.keyword,
    platform: data.platform,
    count: data.count,
    file: `${date}_${data.keyword}_${data.platform}.json`,
    timestamp: data.crawl_time
  });

  // 只保留最近 30 条更新记录
  index.updates = index.updates.slice(0, 30);

  writeFileSync(indexFile, JSON.stringify(index, null, 2), 'utf-8');

  // 6. Git 提交并推送
  console.log(`🚀 推送到 GitHub...`);

  try {
    process.chdir(feedRepo);

    // 检查是否有变更
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    if (!status.trim()) {
      console.log(`ℹ️  没有新变更，跳过推送`);
      return { success: true, skipped: true };
    }

    // 提交
    execSync('git add data/', { stdio: 'inherit' });

    const commitMsg = `update: ${date} - ${data.keyword} (${data.platform}) - ${data.count}条`;
    execSync(`git commit -m "${commitMsg}"`, { stdio: 'inherit' });

    // 推送
    execSync('git push origin main', { stdio: 'inherit' });

    console.log(`✅ 发布成功！`);

    // 7. 生成订阅链接
    const repoUrl = getRepoUrl(feedRepo);
    const feedUrl = repoUrl
      ? `${repoUrl.replace('github.com', 'raw.githubusercontent.com')}/main/data/index.json`
      : null;

    return {
      success: true,
      feedUrl,
      latestFile: 'data/latest.json',
      historyFile: `data/${date}_${data.keyword}_${data.platform}.json`
    };

  } catch (error) {
    console.error(`❌ 发布失败:`, error.message);
    throw error;
  }
}

/**
 * 获取仓库 URL
 */
function getRepoUrl(repoPath) {
  try {
    process.chdir(repoPath);
    const remote = execSync('git config --get remote.origin.url', { encoding: 'utf-8' }).trim();

    // 转换 SSH 地址为 HTTPS
    if (remote.startsWith('git@github.com:')) {
      return 'https://github.com/' + remote.replace('git@github.com:', '').replace('.git', '');
    }

    return remote.replace('.git', '');
  } catch (error) {
    return null;
  }
}

/**
 * 初始化 Feed 仓库
 */
async function initFeedRepo(githubUsername) {
  const feedRepo = join(process.env.HOME, 'social-monitor-feed');

  console.log(`🎯 初始化 Feed 仓库...`);
  console.log(`📂 目标路径: ${feedRepo}`);

  if (existsSync(feedRepo)) {
    console.log(`⚠️  目录已存在，将跳过初始化`);
    return { success: false, message: '目录已存在' };
  }

  // 创建目录结构
  mkdirSync(feedRepo, { recursive: true });
  mkdirSync(join(feedRepo, 'data'), { recursive: true });

  // 创建 README
  const readme = `# Social Monitor Feed

这是一个社交媒体监控数据订阅源。

## 订阅方式

将 \`social-monitor-reader\` skill 复制到你的 Claude Code 中：

\`\`\`bash
cp -r social-monitor-reader ~/.claude/skills/
\`\`\`

然后编辑 \`~/.claude/skills/social-monitor-reader/config.json\`：

\`\`\`json
{
  "feedUrl": "https://raw.githubusercontent.com/${githubUsername}/social-monitor-feed/main/data/index.json"
}
\`\`\`

## 最新数据

查看 [data/latest.json](data/latest.json)

## 历史记录

查看 [data/index.json](data/index.json)
`;

  writeFileSync(join(feedRepo, 'README.md'), readme, 'utf-8');

  // 初始化 Git
  process.chdir(feedRepo);
  execSync('git init', { stdio: 'inherit' });
  execSync('git add .', { stdio: 'inherit' });
  execSync('git commit -m "Initial commit"', { stdio: 'inherit' });

  // 创建 GitHub 仓库（需要 gh CLI）
  try {
    execSync('gh --version', { stdio: 'pipe' });
    console.log(`✅ 检测到 gh CLI，创建 GitHub 仓库...`);

    execSync('gh repo create social-monitor-feed --public --source=. --remote=origin --push', {
      stdio: 'inherit'
    });

    console.log(`✅ Feed 仓库已创建并推送到 GitHub`);

    return {
      success: true,
      repoUrl: `https://github.com/${githubUsername}/social-monitor-feed`,
      feedUrl: `https://raw.githubusercontent.com/${githubUsername}/social-monitor-feed/main/data/index.json`
    };

  } catch (error) {
    console.log(`ℹ️  未检测到 gh CLI，请手动创建 GitHub 仓库：`);
    console.log(`   1. 访问: https://github.com/new`);
    console.log(`   2. 仓库名: social-monitor-feed`);
    console.log(`   3. 设置为 Public`);
    console.log(`   4. 不要初始化 README`);
    console.log(`   5. 创建后运行：`);
    console.log(`      cd ${feedRepo}`);
    console.log(`      git remote add origin git@github.com:${githubUsername}/social-monitor-feed.git`);
    console.log(`      git push -u origin main`);

    return {
      success: true,
      manual: true,
      feedRepo
    };
  }
}

// CLI 模式
if (process.argv[1] === __filename) {
  const command = process.argv[2];

  if (command === 'init') {
    const githubUsername = process.argv[3];
    if (!githubUsername) {
      console.error('请提供 GitHub 用户名');
      console.log('用法: node publish.mjs init <github-username>');
      process.exit(1);
    }

    initFeedRepo(githubUsername)
      .then(result => {
        console.log(JSON.stringify(result, null, 2));
      })
      .catch(error => {
        console.error(JSON.stringify({ success: false, error: error.message }, null, 2));
        process.exit(1);
      });

  } else {
    const dataFile = process.argv[2];
    if (!dataFile) {
      console.error('请提供数据文件路径');
      console.log('用法: node publish.mjs <data-file-path>');
      process.exit(1);
    }

    publish(dataFile)
      .then(result => {
        console.log(JSON.stringify(result, null, 2));
      })
      .catch(error => {
        console.error(JSON.stringify({ success: false, error: error.message }, null, 2));
        process.exit(1);
      });
  }
}

export { publish, initFeedRepo };

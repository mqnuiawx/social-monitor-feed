#!/usr/bin/env node

/**
 * Social Monitor - 核心监控脚本
 * 通过 web-access CDP Proxy (localhost:3456) 抓取社交媒体内容
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SKILL_DIR = join(__dirname, '..');
// 优先使用 ~/.claude/skills/web-access，如果不存在则尝试相对路径
const HOME_WEB_ACCESS = join(process.env.HOME, '.claude/skills/web-access');
const WEB_ACCESS_DIR = existsSync(HOME_WEB_ACCESS) ? HOME_WEB_ACCESS : join(SKILL_DIR, '../web-access');

// CDP Proxy 地址
const CDP_BASE = 'http://localhost:3456';

// 加载配置
const configPath = join(SKILL_DIR, 'config.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

/**
 * 主函数：执行监控任务
 */
async function monitor(keyword, platform, timeRange) {
  console.log(`🚀 开始监控任务...`);
  console.log(`📌 关键词: ${keyword}`);
  console.log(`📱 平台: ${platform}`);
  console.log(`⏰ 时间范围: ${timeRange}`);

  // 检查依赖
  await checkDependencies();

  // 获取平台配置
  const platformConfig = config.platforms[platform];
  if (!platformConfig || !platformConfig.enabled) {
    throw new Error(`平台 ${platform} 未配置或已禁用`);
  }

  // 构建搜索 URL
  const searchUrl = platformConfig.searchUrl.replace('{keyword}', encodeURIComponent(keyword));
  console.log(`🔗 搜索 URL: ${searchUrl}`);

  // 执行抓取
  let results;
  if (platformConfig.useCDP) {
    results = await fetchWithCDP(searchUrl, platform, timeRange);
  } else {
    results = await fetchWithCDP(searchUrl, platform, timeRange); // 所有平台统一走 CDP
  }

  // 保存结果
  const outputFile = await saveResults(keyword, platform, timeRange, results);

  // 生成报告
  const report = generateReport(keyword, platform, timeRange, results);

  console.log(`\n✅ 监控完成！`);
  console.log(`📊 找到 ${results.length} 条内容`);
  console.log(`💾 数据已保存: ${outputFile}`);

  return { report, results, outputFile };
}

/**
 * 检查依赖：确认 CDP Proxy 可用
 */
async function checkDependencies() {
  console.log(`🔍 检查依赖...`);

  if (!existsSync(WEB_ACCESS_DIR)) {
    throw new Error(`web-access skill 未安装！请先安装 web-access`);
  }

  try {
    const checkScript = join(WEB_ACCESS_DIR, 'scripts/check-deps.mjs');
    if (existsSync(checkScript)) {
      execSync(`node "${checkScript}"`, { stdio: 'pipe' });
      console.log(`✅ CDP Proxy 已就绪`);
    }
  } catch (error) {
    throw new Error(`CDP Proxy 未就绪，请先启动 Chrome 并开启远程调试。\n${error.message}`);
  }
}

/**
 * 通过 CDP Proxy HTTP API 执行单条 curl 命令
 */
function cdpGet(path) {
  const result = execSync(`curl -s "${CDP_BASE}${path}"`, { encoding: 'utf-8' });
  return JSON.parse(result);
}

function cdpPost(path, body) {
  // body 作为字符串通过 --data-binary 传递，避免 shell 转义问题
  const tmpFile = `/tmp/cdp_eval_${Date.now()}.js`;
  writeFileSync(tmpFile, body, 'utf-8');
  try {
    const result = execSync(
      `curl -s -X POST "${CDP_BASE}${path}" --data-binary @"${tmpFile}"`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    return JSON.parse(result);
  } finally {
    try { execSync(`rm -f "${tmpFile}"`); } catch (_) {}
  }
}

/**
 * 使用 CDP Proxy HTTP API 抓取页面内容
 */
async function fetchWithCDP(url, platform, timeRange) {
  console.log(`🌐 使用 CDP 模式抓取...`);

  let tabId = null;

  try {
    // 1. 打开新标签页
    console.log(`📖 打开页面...`);
    const tabData = cdpGet(`/new?url=${encodeURIComponent(url)}`);
    tabId = tabData.targetId;

    if (!tabId) throw new Error('无法创建标签页，CDP Proxy 返回空 targetId');
    console.log(`✅ 标签页已打开: ${tabId}`);

    // 2. 等待页面加载
    await sleep(3000);

    // 3. 提取内容（第一次）
    console.log(`📊 提取内容...`);
    const extractScript = getExtractScript(platform);
    const evalData = cdpPost(`/eval?target=${tabId}`, extractScript);
    const results = [];

    const firstBatch = evalData?.value ?? evalData?.result ?? [];
    if (Array.isArray(firstBatch)) {
      results.push(...firstBatch);
      console.log(`✅ 第一批提取 ${firstBatch.length} 条`);
    }

    // 4. 滚动加载更多（多次滚动以获取更多内容）
    const maxScrolls = 3; // 最多滚动3次
    for (let i = 0; i < maxScrolls && results.length < config.settings.maxResultsPerPlatform; i++) {
      console.log(`📜 滚动加载更多 (${i + 1}/${maxScrolls})...`);
      cdpGet(`/scroll?target=${tabId}&direction=bottom`);
      await sleep(config.settings.scrollDelay || 1500);

      const evalData2 = cdpPost(`/eval?target=${tabId}`, extractScript);
      const newBatch = evalData2?.value ?? evalData2?.result ?? [];
      if (Array.isArray(newBatch)) {
        const newItems = newBatch.filter(
          item => !results.some(existing => existing.link === item.link)
        );
        if (newItems.length === 0) {
          console.log(`⚠️  没有新内容了，停止滚动`);
          break;
        }
        results.push(...newItems);
        console.log(`✅ 新增 ${newItems.length} 条（总计 ${results.length} 条）`);
      }
    }

    // 5. 关闭搜索页标签
    console.log(`🗑️  关闭标签页...`);
    cdpGet(`/close?target=${tabId}`);
    tabId = null;

    // 6. 时间过滤
    const filtered = filterByTimeRange(results, timeRange);
    console.log(`📅 时间过滤后剩余 ${filtered.length} 条（共抓取 ${results.length} 条）`);

    // 调试：显示前3条的时间信息
    if (results.length > 0 && filtered.length === 0) {
      console.log(`⚠️  调试信息 - 前3条内容的时间:`);
      results.slice(0, 3).forEach((item, i) => {
        console.log(`  ${i + 1}. "${item.title.substring(0, 30)}" - 时间: ${item.time}`);
      });
    }

    // 7. 补充摘要（进入详情页抓正文）
    await enrichWithSummary(filtered, platform);

    return filtered;

  } catch (error) {
    // 确保异常时也关闭标签页
    if (tabId) {
      try { cdpGet(`/close?target=${tabId}`); } catch (_) {}
    }
    console.error(`❌ CDP 抓取失败:`, error.message);
    throw error;
  }
}

/**
 * 各平台详情页的正文选择器
 */
const SUMMARY_SELECTORS = {
  xiaohongshu: '#detail-desc',           // 笔记正文（实测有效）
  weibo:       '.detail_wbtext_4CRf9',   // 微博正文展开页（降级到列表摘要）
  zhihu:       '.RichContent-inner',      // 知乎回答/文章正文
};

/**
 * 补充摘要：串行进入详情页抓取正文，最多抓 maxSummary 篇
 * 串行而非并发，避免短时间大量打开标签页触发风控
 */
async function enrichWithSummary(items, platform) {
  const selector = SUMMARY_SELECTORS[platform];
  const maxSummary = config.settings.maxSummaryFetch ?? 5;
  const delay = config.settings.summaryFetchDelay ?? 1200;

  // 微博列表页已含正文，直接跳过
  if (platform === 'weibo') {
    items.forEach(item => {
      if (item.content && !item.summary) {
        item.summary = item.content.substring(0, 150);
      }
    });
    return;
  }

  // 只补充有链接且还没摘要的条目
  const targets = items.filter(item => item.link && !item.summary).slice(0, maxSummary);
  if (targets.length === 0) return;

  console.log(`📖 补充摘要：共 ${targets.length} 篇（最多 ${maxSummary} 篇）...`);

  for (const item of targets) {
    let detailTabId = null;
    try {
      const tabData = cdpGet(`/new?url=${encodeURIComponent(item.navLink || item.link)}`); // navLink 带 token，导航更稳定
      detailTabId = tabData.targetId;
      if (!detailTabId) continue;

      await sleep(2500); // 等待详情页渲染

      const script = `
        (() => {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (!el) return null;
          // 去掉话题标签行（小红书末尾的 #xxx），保留正文
          const text = el.innerText.trim();
          const lines = text.split('\\n').filter(l => l.trim() && !l.trim().startsWith('#'));
          return lines.join(' ').substring(0, 200);
        })()
      `;
      const evalData = cdpPost(`/eval?target=${detailTabId}`, script);
      const summary = evalData?.value ?? evalData?.result ?? null;

      if (summary && typeof summary === 'string' && summary.length > 5) {
        item.summary = summary;
        console.log(`  ✅ [${item.title.substring(0, 15)}...] 摘要获取成功`);
      } else {
        console.log(`  ⚠️  [${item.title.substring(0, 15)}...] 摘要为空，跳过`);
      }

      cdpGet(`/close?target=${detailTabId}`);
      detailTabId = null;

      await sleep(delay); // 请求间隔，降低风控风险

    } catch (err) {
      console.warn(`  ❌ 摘要抓取失败 [${item.title.substring(0, 15)}]: ${err.message}`);
      if (detailTabId) {
        try { cdpGet(`/close?target=${detailTabId}`); } catch (_) {}
      }
    }
  }
}

/**
 * 获取各平台的 DOM 提取脚本（在浏览器中执行）
 */
function getExtractScript(platform) {
  const scripts = {
    xiaohongshu: `
      (() => {
        const items = [];
        const cards = document.querySelectorAll('section.note-item');

        cards.forEach(card => {
          try {
            // 标题
            const titleEl = card.querySelector('.footer a.title span, .footer .title span');
            const title = titleEl ? titleEl.textContent.trim() : '(无标题)';

            // 作者（.name-time-wrapper > .name）
            const authorEl = card.querySelector('.name-time-wrapper .name, .author .name');
            const author = authorEl ? authorEl.textContent.trim() : '';

            // 时间（.name-time-wrapper > .time）
            const timeEl = card.querySelector('.name-time-wrapper .time, .author .time');
            const time = timeEl ? timeEl.textContent.trim() : '';

            // 点赞（.like-wrapper 内的 span）
            const likeEl = card.querySelector('[class*="like-wrapper"] span:last-child');
            const likes = likeEl ? likeEl.textContent.trim() : '';

            // 原文链接：优先取隐藏的 /explore/ 永久链接（不带 token，不会过期）
            // 备用取带 xsec_token 的 /search_result/ 链接（用于详情页导航）
            const exploreEl = card.querySelector('a[href*="/explore/"]');
            const navEl = card.querySelector('a.cover[href], a.title[href]');
            const toAbs = href => href
              ? (href.startsWith('http') ? href : 'https://www.xiaohongshu.com' + href)
              : '';
            const exploreLink = toAbs(exploreEl?.getAttribute('href') || '');
            const navLink    = toAbs(navEl?.getAttribute('href') || '');
            // link 用于展示，navLink 用于进入详情页抓摘要
            const link = exploreLink || navLink;

            if (link || title !== '(无标题)') {
              items.push({ title, author, time, likes, link, navLink: navLink || link, platform: 'xiaohongshu' });
            }
          } catch (e) {}
        });

        return items;
      })()
    `,

    weibo: `
      (() => {
        const items = [];
        const cards = document.querySelectorAll('.card-wrap[action-type="feed_list_item"]');

        cards.forEach(card => {
          try {
            const contentEl = card.querySelector('.txt');
            const content = contentEl ? contentEl.innerText.trim() : '';

            const authorEl = card.querySelector('.name');
            const author = authorEl ? authorEl.textContent.trim() : '';

            const timeEl = card.querySelector('.from a:first-child');
            const time = timeEl ? timeEl.textContent.trim() : '';

            const linkEl = card.querySelector('.from a:first-child');
            const link = linkEl ? linkEl.href : '';

            const acts = card.querySelectorAll('.card-act ul li');
            const likes = acts[2] ? acts[2].textContent.trim() : '';

            if (content) {
              items.push({
                title: content.substring(0, 60) + (content.length > 60 ? '...' : ''),
                content,
                author,
                time,
                likes,
                link,
                platform: 'weibo'
              });
            }
          } catch (e) {}
        });

        return items;
      })()
    `,

    zhihu: `
      (() => {
        const items = [];
        const cards = document.querySelectorAll('.List-item');

        cards.forEach(card => {
          try {
            const titleEl = card.querySelector('h2.ContentItem-title a, .QuestionItem-title a');
            const title = titleEl ? titleEl.textContent.trim() : '';

            const authorEl = card.querySelector('.AuthorInfo-name');
            const author = authorEl ? authorEl.textContent.trim() : '';

            const summaryEl = card.querySelector('.RichContent-inner, .QuestionItem-detail');
            const summary = summaryEl ? summaryEl.textContent.trim().substring(0, 120) : '';

            const link = titleEl ? titleEl.href : '';

            const timeEl = card.querySelector('.ContentItem-time');
            const time = timeEl ? timeEl.textContent.trim() : '';

            if (title) {
              items.push({ title, author, summary, time, link, platform: 'zhihu' });
            }
          } catch (e) {}
        });

        return items;
      })()
    `
  };

  return scripts[platform] || scripts.xiaohongshu;
}

/**
 * 过滤时间范围
 * 支持: "1天前" "3小时前" "昨天 22:16" "04-15" "03-02" 等小红书时间格式
 */
function filterByTimeRange(items, timeRange) {
  const match = timeRange.match(/^(\d+)(天|小时|h|d)$/i);
  if (!match) {
    console.warn(`⚠️  无法解析时间范围: ${timeRange}，返回全部结果`);
    return items;
  }

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const hours = (unit === '天' || unit === 'd') ? value * 24 : value;
  const cutoff = Date.now() - hours * 3600 * 1000;

  return items.filter(item => {
    if (!item.time) return true; // 无时间信息保留
    const t = parseTimeText(item.time);
    if (t === null) return true; // 解析失败保留（保守策略）
    return t > cutoff;
  });
}

/**
 * 解析平台时间文本为时间戳
 * 支持格式：
 *   "10分钟前"  "2小时前"  "1天前"  "3天前"
 *   "昨天 22:16"  "今天 09:00"
 *   "04-15"  "03-02"（当年的月-日，超过24h阈值）
 */
function parseTimeText(text) {
  if (!text) return null;
  const now = Date.now();

  if (text.includes('分钟前')) return now - parseInt(text) * 60 * 1000;
  if (text.includes('小时前')) return now - parseInt(text) * 3600 * 1000;
  if (text.includes('天前'))   return now - parseInt(text) * 86400 * 1000;

  if (text.startsWith('昨天')) {
    const timePart = text.replace('昨天', '').trim(); // "22:16"
    const [h, m] = timePart.split(':').map(Number);
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(isNaN(h) ? 0 : h, isNaN(m) ? 0 : m, 0, 0);
    return d.getTime();
  }

  if (text.startsWith('今天')) {
    const timePart = text.replace('今天', '').trim();
    const [h, m] = timePart.split(':').map(Number);
    const d = new Date();
    d.setHours(isNaN(h) ? 0 : h, isNaN(m) ? 0 : m, 0, 0);
    return d.getTime();
  }

  // "MM-DD" 格式（当年）
  const mdMatch = text.match(/^(\d{2})-(\d{2})$/);
  if (mdMatch) {
    const d = new Date();
    d.setMonth(parseInt(mdMatch[1]) - 1, parseInt(mdMatch[2]));
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  // "YYYY-MM-DD" 格式
  const fullMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (fullMatch) {
    return new Date(text).getTime();
  }

  return null;
}

/**
 * 生成智能洞察总结
 */
function generateInsight(keyword, platform, results) {
  if (results.length === 0) {
    return "暂无数据，无法生成洞察。";
  }

  const platformName = config.platforms[platform]?.name || platform;

  // 统计高互动内容（点赞数 > 1000）
  const highEngagement = results.filter(item => {
    const likes = item.likes?.toString().replace(/[^\d]/g, '') || '0';
    return parseInt(likes) > 1000;
  });

  // 提取关键话题（从标题中）
  const topicKeywords = {};
  results.forEach(item => {
    const title = item.title || '';
    // 简单的关键词提取（可以优化）
    const words = title.split(/[，。！？、\s]+/).filter(w => w.length > 2 && w.length < 10);
    words.forEach(word => {
      topicKeywords[word] = (topicKeywords[word] || 0) + 1;
    });
  });

  const sortedTopics = Object.entries(topicKeywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

  // 生成洞察
  let insight = `【${platformName}·${keyword}】监控洞察\n\n`;
  insight += `📊 数据概览：\n`;
  insight += `- 共抓取 ${results.length} 条内容\n`;
  insight += `- 高互动内容（>1000赞）：${highEngagement.length} 条\n\n`;

  if (highEngagement.length > 0) {
    insight += `🔥 热门内容：\n`;
    highEngagement.slice(0, 3).forEach((item, i) => {
      insight += `${i + 1}. ${item.title}（${item.likes}）\n`;
    });
    insight += `\n`;
  }

  if (sortedTopics.length > 0) {
    insight += `🏷️ 热门话题：${sortedTopics.join('、')}\n\n`;
  }

  // 情感倾向分析（简单版）
  const negativeWords = ['失望', '糟糕', '差', '烂', '坑', '骗', '垃圾', '疯了'];
  const positiveWords = ['好', '赞', '棒', '优秀', '精彩', '成功', '喜欢'];

  let negativeCount = 0;
  let positiveCount = 0;

  results.forEach(item => {
    const text = (item.title + ' ' + (item.summary || item.content || '')).toLowerCase();
    negativeWords.forEach(word => {
      if (text.includes(word)) negativeCount++;
    });
    positiveWords.forEach(word => {
      if (text.includes(word)) positiveCount++;
    });
  });

  if (negativeCount > positiveCount * 1.5) {
    insight += `💡 情感倾向：负面情绪较多，建议关注用户反馈\n`;
  } else if (positiveCount > negativeCount * 1.5) {
    insight += `💡 情感倾向：正面评价居多，品牌口碑良好\n`;
  } else {
    insight += `💡 情感倾向：正负面评价相当，保持中性\n`;
  }

  return insight;
}

/**
 * 保存结果到 JSON 文件
 */
async function saveResults(keyword, platform, timeRange, results) {
  const dataDir = join(SKILL_DIR, 'data');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = `${timestamp}_${keyword}_${platform}.json`;
  const filepath = join(dataDir, filename);

  // 生成智能洞察
  const insight2 = generateInsight(keyword, platform, results);

  writeFileSync(filepath, JSON.stringify({
    keyword,
    platform,
    time_range: timeRange,
    crawl_time: new Date().toISOString(),
    count: results.length,
    'insight-2': insight2,
    items: results
  }, null, 2), 'utf-8');

  return filepath;
}

/**
 * 生成 Markdown 报告
 */
function generateReport(keyword, platform, timeRange, results) {
  const platformName = config.platforms[platform]?.name || platform;

  let report = `## 📊 ${platformName} "${keyword}" 监控报告\n\n`;
  report += `**监控时间**: ${new Date().toLocaleString('zh-CN')}\n`;
  report += `**时间范围**: 最近 ${timeRange}\n`;
  report += `**找到内容**: ${results.length} 条\n\n`;

  if (results.length === 0) {
    report += `暂无符合条件的内容。\n`;
    return report;
  }

  report += `### 📝 内容列表\n\n`;

  results.slice(0, 20).forEach((item, index) => {
    report += `#### ${index + 1}. ${item.title}\n\n`;
    if (item.author) report += `- **作者**: ${item.author}\n`;
    if (item.time)   report += `- **时间**: ${item.time}\n`;
    if (item.likes)  report += `- **点赞**: ${item.likes}\n`;
    if (item.link)   report += `- **链接**: [查看原文](${item.link})\n`;

    // 摘要：优先显示从详情页抓取的 summary，其次显示列表页 content（微博）
    const summaryText = item.summary || item.content;
    if (summaryText) {
      const truncated = summaryText.length > 150
        ? summaryText.substring(0, 150) + '...'
        : summaryText;
      report += `\n  > ${truncated.replace(/\n/g, ' ')}\n`;
    }

    report += `\n`;
  });

  if (results.length > 20) {
    report += `\n_（仅显示前 20 条，共 ${results.length} 条）_\n`;
  }

  report += `\n---\n\n`;
  report += `💡 **提示**: 数据已保存到本地，可通过 \`/social-monitor list\` 查看历史记录。\n`;

  return report;
}

/**
 * 工具函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// CLI 入口
if (process.argv[1] === __filename) {
  const keyword   = process.argv[2] || config.settings.defaultKeyword;
  const platform  = process.argv[3] || config.settings.defaultPlatform;
  const timeRange = process.argv[4] || config.settings.defaultTimeRange;

  monitor(keyword, platform, timeRange)
    .then(({ report }) => { console.log('\n' + report); })
    .catch(error => {
      console.error('❌ 监控失败:', error.message);
      process.exit(1);
    });
}

export { monitor, checkDependencies };

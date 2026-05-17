#!/usr/bin/env node
/**
 * login.mjs - 首次登录工具
 * 用法: node login.mjs <platform>
 * 例如: docker exec -it social-monitor node login.mjs xiaohongshu
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const COOKIES_DIR = join(__dirname, 'cookies');

const PLATFORM_URLS = {
  xiaohongshu: 'https://www.xiaohongshu.com',
  weibo: 'https://weibo.com'
};

async function login(platform) {
  const url = PLATFORM_URLS[platform];
  if (!url) {
    console.error(`❌ 不支持的平台: ${platform}`);
    console.log(`支持的平台: ${Object.keys(PLATFORM_URLS).join(', ')}`);
    process.exit(1);
  }

  console.log(`🔐 开始登录 ${platform}...`);
  console.log(`📸 每30秒截图一次，保存到 /tmp/login-step-N.png`);
  console.log(`   查看截图: docker cp social-monitor:/tmp/login-step-1.png .`);
  console.log(`   确认登录完成后按 Enter 保存 Cookie\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  // 立即截一张初始状态
  let stepCount = 1;
  const initPath = `/tmp/login-step-${stepCount}.png`;
  await page.screenshot({ path: initPath, fullPage: false });
  console.log(`📸 初始截图: ${initPath}  (docker cp social-monitor:${initPath} .)`);

  // 定时截图（每30秒）
  const screenshotInterval = setInterval(async () => {
    stepCount++;
    const path = `/tmp/login-step-${stepCount}.png`;
    await page.screenshot({ path, fullPage: false });
    console.log(`📸 截图已保存: ${path}  (docker cp social-monitor:${path} .)`);
  }, 30000);

  // 等待用户确认登录完成
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await new Promise(resolve => {
    rl.question('\n✅ 登录完成后按 Enter 保存 Cookie... ', () => {
      rl.close();
      resolve();
    });
  });

  clearInterval(screenshotInterval);

  // 最终截图
  const finalPath = `/tmp/login-final.png`;
  await page.screenshot({ path: finalPath });
  console.log(`📸 最终截图: ${finalPath}  (docker cp social-monitor:${finalPath} .)`);

  // 保存 Cookie
  if (!existsSync(COOKIES_DIR)) mkdirSync(COOKIES_DIR, { recursive: true });
  const cookies = await context.cookies();
  const cookiePath = join(COOKIES_DIR, `${platform}.json`);
  writeFileSync(cookiePath, JSON.stringify(cookies, null, 2), 'utf-8');

  console.log(`\n✅ Cookie 已保存: ${cookiePath}`);
  console.log(`   共 ${cookies.length} 个 Cookie`);

  await browser.close();
}

const platform = process.argv[2];
if (!platform) {
  console.error('用法: node login.mjs <platform>');
  console.log('例如: node login.mjs xiaohongshu');
  process.exit(1);
}

login(platform).catch(err => {
  console.error('❌ 登录失败:', err.message);
  process.exit(1);
});

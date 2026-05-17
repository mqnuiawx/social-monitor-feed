#!/bin/bash
# cron.sh - 容器内定时任务，每天 08:45 触发抓取
# 不依赖系统 cron，用纯 bash sleep 循环实现，适合 Docker 容器

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/social-monitor.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

run_monitor() {
  log "🚀 开始定时抓取任务..."
  cd "$SCRIPT_DIR"

  # 串行抓取小红书和微博
  node scripts/monitor-and-publish.mjs 爱奇艺 24h \
    >> "$LOG_FILE" 2>&1 \
    && log "✅ 抓取完成" \
    || log "❌ 抓取失败，查看日志: $LOG_FILE"
}

# 初始化 Feed 仓库（容器首次启动时 clone）
FEED_REPO="/root/social-monitor-feed"
if [ ! -d "$FEED_REPO/.git" ]; then
  log "📦 初始化 Feed 仓库..."
  if [ -n "$GITHUB_TOKEN" ]; then
    REPO_URL="https://${GITHUB_TOKEN}@github.com/mqnuiawx/social-monitor-feed.git"
  else
    REPO_URL="git@github.com:mqnuiawx/social-monitor-feed.git"
  fi
  git clone "$REPO_URL" "$FEED_REPO" && log "✅ Feed 仓库 clone 完成" || { log "❌ Feed 仓库 clone 失败"; exit 1; }
else
  log "✅ Feed 仓库已存在，跳过 clone"
fi

log "⏰ 定时任务已启动，每天 08:45 执行"

while true; do
  # 计算距离今天 08:45 的秒数（Linux date -d 语法）
  TARGET_TIME=$(date -d "today 08:45" +%s)
  NOW=$(date +%s)

  if [ "$NOW" -ge "$TARGET_TIME" ]; then
    # 今天的 08:45 已过，等到明天
    TARGET_TIME=$((TARGET_TIME + 86400))
  fi

  WAIT=$((TARGET_TIME - NOW))
  NEXT_RUN=$(date -d "@$TARGET_TIME" '+%Y-%m-%d %H:%M')
  log "⏳ 距离下次执行还有 ${WAIT} 秒 (${NEXT_RUN})"

  sleep "$WAIT"
  run_monitor
done

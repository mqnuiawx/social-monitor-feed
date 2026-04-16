#!/bin/bash
# publish.sh - 将最新抓取结果推送到 GitHub 仓库
# 用法: bash publish.sh [feed仓库路径]

FEED_REPO="${1:-$HOME/social-monitor-feed}"
DATA_DIR="$HOME/.claude/skills/social-monitor/data"
DATE=$(date +%Y-%m-%d)

if [ ! -d "$FEED_REPO/.git" ]; then
  echo "错误: $FEED_REPO 不是 git 仓库，请先运行 setup-feed-repo.sh"
  exit 1
fi

# 找到最新的数据文件
LATEST=$(ls -t "$DATA_DIR"/*.json 2>/dev/null | head -1)
if [ -z "$LATEST" ]; then
  echo "错误: 没有找到抓取数据，请先运行 /social-monitor"
  exit 1
fi

# 复制到 feed 仓库
cp "$LATEST" "$FEED_REPO/data/latest.json"
cp "$LATEST" "$FEED_REPO/data/${DATE}.json"

# 推送到 GitHub
cd "$FEED_REPO"
git add data/
git commit -m "update: ${DATE} 监控数据"
git push origin main

echo "✅ 已推送到 GitHub"

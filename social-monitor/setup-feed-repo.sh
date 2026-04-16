#!/bin/bash
# setup-feed-repo.sh - 初始化 GitHub feed 仓库
# 用法: bash setup-feed-repo.sh [GitHub用户名]

USERNAME="${1:-YOUR_GITHUB_USERNAME}"
REPO_NAME="social-monitor-feed"
FEED_DIR="$HOME/$REPO_NAME"

if [ -d "$FEED_DIR/.git" ]; then
  echo "仓库已存在: $FEED_DIR"
  exit 0
fi

echo "=== 初始化 social-monitor-feed 仓库 ==="

cd "$FEED_DIR"
git init
git add .
git commit -m "init: social-monitor-feed"

echo ""
echo "接下来请在 GitHub 上创建仓库 $REPO_NAME，然后执行："
echo ""
echo "  cd $FEED_DIR"
echo "  git remote add origin git@github.com:${USERNAME}/${REPO_NAME}.git"
echo "  git push -u origin main"
echo ""
echo "完成后，告诉你的订阅者仓库地址："
echo "  https://github.com/${USERNAME}/${REPO_NAME}"

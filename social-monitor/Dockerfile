# 使用 Playwright 官方镜像，已内置 Chromium 及所有依赖
FROM mcr.microsoft.com/playwright:v1.44.0-noble

WORKDIR /app

# 安装 git（用于 publish.mjs 的 git push）
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# 配置 git
RUN git config --global user.email "monitor@social-monitor" && \
    git config --global user.name "Social Monitor Bot"

# 复制 package.json，安装依赖
COPY package*.json ./
RUN npm install

# 安装 Playwright Chromium
RUN npx playwright install chromium

# 复制项目文件
COPY . .

# 创建 Cookie 和数据目录
RUN mkdir -p /app/cookies /app/data /var/log

# 给脚本加执行权限
RUN chmod +x cron.sh

# 启动定时任务
CMD ["/bin/bash", "cron.sh"]

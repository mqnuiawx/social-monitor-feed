#!/usr/bin/env node

/**
 * Task Manager - 管理定时监控任务
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SKILL_DIR = join(__dirname, '..');
const configPath = join(SKILL_DIR, 'config.json');

/**
 * 加载配置
 */
function loadConfig() {
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}

/**
 * 保存配置
 */
function saveConfig(config) {
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * 添加任务
 */
function addTask(taskConfig) {
  const config = loadConfig();

  const task = {
    id: `task_${Date.now()}`,
    name: taskConfig.name,
    keywords: Array.isArray(taskConfig.keywords) ? taskConfig.keywords : [taskConfig.keywords],
    platforms: Array.isArray(taskConfig.platforms) ? taskConfig.platforms : [taskConfig.platforms],
    schedule: taskConfig.schedule || '0 9 * * *', // 默认每天早上9点
    timeRange: taskConfig.timeRange || '24h',
    cronId: null, // 需要 Claude 创建 cron 后填入
    enabled: true,
    createdAt: new Date().toISOString(),
    lastRun: null
  };

  config.tasks.push(task);
  saveConfig(config);

  return task;
}

/**
 * 列出所有任务
 */
function listTasks() {
  const config = loadConfig();
  return config.tasks;
}

/**
 * 获取单个任务
 */
function getTask(taskId) {
  const config = loadConfig();
  return config.tasks.find(t => t.id === taskId);
}

/**
 * 更新任务
 */
function updateTask(taskId, updates) {
  const config = loadConfig();
  const taskIndex = config.tasks.findIndex(t => t.id === taskId);

  if (taskIndex === -1) {
    throw new Error(`任务不存在: ${taskId}`);
  }

  config.tasks[taskIndex] = {
    ...config.tasks[taskIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  saveConfig(config);
  return config.tasks[taskIndex];
}

/**
 * 删除任务
 */
function deleteTask(taskId) {
  const config = loadConfig();
  const taskIndex = config.tasks.findIndex(t => t.id === taskId);

  if (taskIndex === -1) {
    throw new Error(`任务不存在: ${taskId}`);
  }

  const task = config.tasks[taskIndex];
  config.tasks.splice(taskIndex, 1);
  saveConfig(config);

  return task;
}

/**
 * 记录任务执行
 */
function recordTaskRun(taskId, success = true, error = null) {
  const config = loadConfig();
  const taskIndex = config.tasks.findIndex(t => t.id === taskId);

  if (taskIndex === -1) {
    throw new Error(`任务不存在: ${taskId}`);
  }

  config.tasks[taskIndex].lastRun = {
    time: new Date().toISOString(),
    success,
    error
  };

  saveConfig(config);
}

/**
 * 生成 cron 提示语（供 Claude 使用）
 */
function generateCronPrompt(task) {
  const keywordsStr = task.keywords.join('、');
  const platformsStr = task.platforms.map(p => {
    return loadConfig().platforms[p]?.name || p;
  }).join('、');

  return `请执行社交媒体监控任务：
- 任务ID: ${task.id}
- 任务名称: ${task.name}
- 关键词: ${keywordsStr}
- 平台: ${platformsStr}
- 时间范围: ${task.timeRange}

必须使用 social-monitor skill 执行此任务。`;
}

/**
 * CLI 模式
 */
if (process.argv[1] === __filename) {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'add': {
        const name = process.argv[3];
        const keywords = process.argv[4];
        const platforms = process.argv[5];
        const schedule = process.argv[6];
        const timeRange = process.argv[7];

        const task = addTask({
          name,
          keywords: keywords.split(','),
          platforms: platforms.split(','),
          schedule,
          timeRange
        });

        console.log(JSON.stringify({
          success: true,
          task,
          cronPrompt: generateCronPrompt(task)
        }, null, 2));
        break;
      }

      case 'list': {
        const tasks = listTasks();
        console.log(JSON.stringify({ success: true, tasks }, null, 2));
        break;
      }

      case 'get': {
        const taskId = process.argv[3];
        const task = getTask(taskId);
        console.log(JSON.stringify({ success: true, task }, null, 2));
        break;
      }

      case 'update': {
        const taskId = process.argv[3];
        const field = process.argv[4];
        const value = process.argv[5];
        const updates = { [field]: value };
        const task = updateTask(taskId, updates);
        console.log(JSON.stringify({ success: true, task }, null, 2));
        break;
      }

      case 'delete': {
        const taskId = process.argv[3];
        const task = deleteTask(taskId);
        console.log(JSON.stringify({
          success: true,
          deleted: task,
          message: `已删除任务: ${task.name}。如果已创建 cron（ID: ${task.cronId}），请手动删除。`
        }, null, 2));
        break;
      }

      case 'record': {
        const taskId = process.argv[3];
        const success = process.argv[4] === 'true';
        const error = process.argv[5];
        recordTaskRun(taskId, success, error);
        console.log(JSON.stringify({ success: true, message: '已记录执行结果' }, null, 2));
        break;
      }

      default:
        console.error(`未知命令: ${command}`);
        console.log(`
可用命令:
  add <name> <keywords> <platforms> <schedule> <timeRange>
  list
  get <taskId>
  update <taskId> <field> <value>
  delete <taskId>
  record <taskId> <success> [error]
        `);
        process.exit(1);
    }
  } catch (error) {
    console.error(JSON.stringify({ success: false, error: error.message }, null, 2));
    process.exit(1);
  }
}

export {
  loadConfig,
  saveConfig,
  addTask,
  listTasks,
  getTask,
  updateTask,
  deleteTask,
  recordTaskRun,
  generateCronPrompt
};

#!/usr/bin/env node

/**
 * CLI Test Script for GPT-Image-2.5 Image Generation
 *
 * Usage:
 *   node scripts/test-image-gen.mjs "你的提示词" [可选参考图URL]
 *
 * Example:
 *   node scripts/test-image-gen.mjs "儿童绘本风格, 一只可爱的小猫坐在窗台看雨"
 *   node scripts/test-image-gen.mjs "保留原图人物，将背景替换为充满阳光的海滩" "https://example.com/photo.jpg"
 */

import fs from 'fs';
import path from 'path';

// 1. Load .env.local if present
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const apiKey = process.env.TOAPIS_API_KEY || process.env.GPT_IMAGE_API_KEY;
const baseUrl = (process.env.TOAPIS_BASE_URL || 'https://api.toapis.com').replace(/\/$/, '');
const model = process.env.TOAPIS_IMAGE_MODEL || 'gpt-image-2.5-flare';

if (!apiKey) {
  console.error('\x1b[31m%s\x1b[0m', '❌ 错误: 未在 .env.local 中检测到 TOAPIS_API_KEY');
  console.log('请在 .env.local 中配置:');
  console.log('  TOAPIS_API_KEY="你的中转站API_KEY"');
  process.exit(1);
}

let prompt = process.argv[2];
let refImage = process.argv[3];

// Support reading prompt from file: node scripts/test-image-gen.mjs --file prompt.txt [refImage]
if (prompt === '--file' || prompt === '-f') {
  const filePath = process.argv[3];
  refImage = process.argv[4];
  if (!filePath || !fs.existsSync(filePath)) {
    console.error('\x1b[31m%s\x1b[0m', `❌ 错误: 指定的提示词文件不存在: ${filePath}`);
    process.exit(1);
  }
  prompt = fs.readFileSync(filePath, 'utf8').trim();
}

if (!prompt) {
  console.log('\x1b[33m%s\x1b[0m', '用法:');
  console.log('  1. 直接传提示词: node scripts/test-image-gen.mjs \'<提示词>\' [可选参考图URL]');
  console.log('  2. 从文件读取:   node scripts/test-image-gen.mjs --file prompt.txt [可选参考图URL]');
  console.log('示例:');
  console.log('  node scripts/test-image-gen.mjs \'A stylish woman with "cat-eye" sunglasses\'');
  process.exit(0);
}

console.log('--------------------------------------------------');
console.log('🎨 GPT-Image-2.5 测试任务启动');
console.log(`- Base URL: ${baseUrl}`);
console.log(`- Model:    ${model}`);
console.log(`- Prompt:   "${prompt}"`);
if (refImage) {
  console.log(`- Ref Image: ${refImage}`);
}
console.log('--------------------------------------------------');

async function run() {
  const isVip = model.toLowerCase().includes('vip');

  // Aspect ratio to pixel mapping for VIP
  const ratioToPixel = {
    '1:1': '1024x1024',
    '2:3': '1024x1536',
    '3:2': '1536x1024',
    '3:4': '1024x1360',
    '4:3': '1360x1024',
    '9:16': '864x1536',
    '16:9': '1536x864',
  };

  let chosenSize = '1:1';
  // If user prompt mentions vertical 2:3, auto adjust
  if (prompt.includes('2:3')) {
    chosenSize = '2:3';
  }

  let createRes;

  if (isVip && refImage) {
    console.log('⏳ [VIP 图生图模式] 正在通过 POST /v1/images/edits 提交任务...');
    const formData = new FormData();
    formData.append('model', model);
    formData.append('prompt', prompt);
    formData.append('image', refImage);
    formData.append('quality', 'high');
    formData.append('size', ratioToPixel[chosenSize] || chosenSize);
    formData.append('n', '1');

    createRes = await fetch(`${baseUrl}/v1/images/edits`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });
  } else {
    console.log(`⏳ [${isVip ? 'VIP 文生图' : '普通版'}] 正在通过 POST /v1/images/generations 提交任务...`);
    const payload = {
      model,
      prompt,
      quality: 'high',
      n: 1,
    };

    if (isVip) {
      payload.size = ratioToPixel[chosenSize] || (chosenSize.includes('x') ? chosenSize : '1024x1024');
    } else {
      payload.size = chosenSize;
      payload.resolution = '1K';
    }

    if (refImage) {
      payload.reference_images = [refImage];
    }

    createRes = await fetch(`${baseUrl}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  }

  if (!createRes.ok) {
    const errText = await createRes.text();
    console.error('\x1b[31m%s\x1b[0m', `❌ 任务创建失败 (${createRes.status}): ${errText}`);
    process.exit(1);
  }

  const createData = await createRes.json();
  const taskId = createData.id;
  console.log(`✅ 任务已创建, ID: ${taskId}, 初始状态: ${createData.status}`);

  console.log('⏳ 开始轮询任务状态 (每 2.5 秒)...');
  const startTime = Date.now();

  while (true) {
    await new Promise((r) => setTimeout(r, 2500));

    const pollRes = await fetch(`${baseUrl}/v1/images/generations/${taskId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!pollRes.ok) {
      console.warn(`⚠️ 查询警告: 状态码 ${pollRes.status}`);
      continue;
    }

    const task = await pollRes.json();
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[+${elapsed}s] 任务状态: ${task.status} (进度: ${task.progress ?? 0}%)`);

    if (task.status === 'completed') {
      const url = task.result?.data?.[0]?.url;
      console.log('--------------------------------------------------');
      console.log('\x1b[32m%s\x1b[0m', '🎉 生成成功!');
      console.log(`🖼️ 图片地址: ${url}`);
      console.log('--------------------------------------------------');
      break;
    }

    if (task.status === 'failed') {
      console.error('\x1b[31m%s\x1b[0m', `❌ 任务生成失败: ${JSON.stringify(task.error)}`);
      break;
    }
  }
}

run().catch((err) => {
  console.error('运行异常:', err);
});

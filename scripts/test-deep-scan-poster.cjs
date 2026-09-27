// Offline integration checks. No API credentials, network or wallet writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) {
  return resolve.call(this, name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : name, ...args);
};
require.extensions['.ts'] = (module, file) => {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  module._compile(code, file);
};
process.env.TOAPIS_API_KEY = 'offline-test';
process.env.TOAPIS_BASE_URL = 'https://example.invalid';
const { generateDeepScanPoster } = require('../src/lib/ai/deep-scan-poster.ts');
const { buildDeepScanPosterPrompt } = require('../src/lib/ai/deep-scan-poster-prompt.ts');
const { DEEP_SCAN_FIXTURES } = require('../src/lib/types/deep-scan.ts');
const portrait = { buffer: Buffer.from('mock-photo'), mimeType: 'image/jpeg' };
const calls = [];
function mock(responses) {
  calls.length = 0;
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    assert.ok(responses.length, 'Unexpected request');
    const item = responses.shift();
    return new Response(JSON.stringify(item.body), { status: item.status || 200 });
  };
}
(async () => {
  const report = DEEP_SCAN_FIXTURES.normal;
  mock([
    { body: { success: true, data: { url: 'https://images.example/portrait.jpg' } } },
    { body: { id: 'task-1', status: 'pending' } },
    { body: { status: 'completed', result: { data: [{ url: 'https://images.example/report.png' }] } } },
  ]);
  const result = await generateDeepScanPoster(report, portrait);
  assert.equal(calls[0].url, 'https://example.invalid/v1/uploads/images');
  assert.equal(calls[0].init.body.get('purpose'), 'generation');
  assert.equal(calls[0].init.body.get('file').size, portrait.buffer.length);
  const body = JSON.parse(calls[1].init.body);
  assert.equal(body.model, 'gpt-image-2.5-sunburst-official');
  assert.equal(body.size, '1024x1536');
  assert.equal(body.quality, 'high');
  assert.deepEqual(body.image_urls, ['https://images.example/portrait.jpg']);
  assert.equal(body.resolution, undefined);
  assert.equal(body.reference_images, undefined);
  assert.equal(result.generatedPoster.taskId, 'task-1');
  assert.equal(result.originalImageUrl, undefined);
  assert.ok(body.prompt.includes('REPORT_DATA'));
  assert.ok(!body.prompt.includes('base64'));
  console.log('PASS upload -> Official payload -> polling -> image report');

  mock([]);
  await generateDeepScanPoster({ ...report, isAnalyzable: false }, portrait);
  assert.equal(calls.length, 0);
  console.log('PASS unanalyzable input skips upload and generation');

  mock([{ body: { success: false } }]);
  await assert.rejects(generateDeepScanPoster(report, portrait), /upload failed/);
  assert.equal(calls.length, 1);
  mock([
    { body: { success: true, data: { url: 'https://images.example/portrait.jpg' } } },
    { body: { task_id: 'task-2' } },
    { body: { status: 'failed', error: 'sensitive provider text' } },
  ]);
  await assert.rejects(generateDeepScanPoster(report, portrait), /generation failed/);
  assert.equal(calls.length, 3);
  console.log('PASS upload/generation failure propagates without resubmission');

  const zero = { ...report, overallScore: 0, metrics: report.metrics.map(m => ({ ...m, score: 0 })) };
  const data = JSON.parse(buildDeepScanPosterPrompt(zero).split('\n\nREPORT_DATA\n')[1]);
  assert.equal(data.overallScore, '0.00');
  assert.equal(data.averagePercentage, '0%');
  assert.ok(data.metrics.every(m => m.percentage === '0%'));
  console.log('PASS prompt preserves zero scores and computes consistent average');
})().catch(error => { console.error(error); process.exitCode = 1; });

// Offline integration checks for Face Compare poster. No API credentials, network or wallet writes.
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

const { generateComparePoster } = require('../src/lib/ai/compare-poster.ts');
const { buildComparePosterPrompt } = require('../src/lib/ai/compare-poster-prompt.ts');

const photoA = { buffer: Buffer.from('mock-photo-a'), mimeType: 'image/jpeg' };
const photoB = { buffer: Buffer.from('mock-photo-b'), mimeType: 'image/png' };

const sampleComparison = {
  winner: 'Photo A',
  overallAssessment: 'Photo A exhibits superior lighting balance and natural symmetry.',
  photoA: {
    score: '9.12 / 10',
    numericScore: 9.12,
    strengths: ['Harmonious eye contact', 'Balanced jawline definition'],
    weaknesses: [],
  },
  photoB: {
    score: '8.80 / 10',
    numericScore: 8.80,
    strengths: ['Warm ambient tone'],
    weaknesses: ['Slightly uneven shadow on right cheek'],
  },
  metrics: [
    { name: 'FACIAL SYMMETRY', sublabel: 'Balance & Proportion', scoreA: 91, scoreB: 88 },
    { name: 'FACIAL HARMONY', sublabel: 'Overall Proportional Balance', scoreA: 89, scoreB: 86 },
    { name: 'EYES', sublabel: 'Shape, Symmetry & Spacing', scoreA: 90, scoreB: 89 },
    { name: 'JAWLINE', sublabel: 'Definition & Facial Contour', scoreA: 87, scoreB: 84 },
    { name: 'PHOTOGENIC APPEAL', sublabel: 'Natural Attractiveness', scoreA: 90, scoreB: 87 },
  ],
  advantage: '+0.32 ADVANTAGE',
  verdictRecommendation: 'Photo A is recommended for professional headshots and social dating profiles.',
};

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
  // Test 1: Dual upload -> submission with image_urls: [A, B] -> polling -> completed poster
  mock([
    { body: { success: true, data: { url: 'https://images.example/photo-a.jpg' } } },
    { body: { success: true, data: { url: 'https://images.example/photo-b.png' } } },
    { body: { id: 'task-compare-1', status: 'pending' } },
    { body: { status: 'completed', result: { data: [{ url: 'https://images.example/compare-poster.png' }] } } },
  ]);

  const result = await generateComparePoster(sampleComparison, photoA, photoB);

  // Verify Photo A upload
  assert.equal(calls[0].url, 'https://example.invalid/v1/uploads/images');
  assert.equal(calls[0].init.body.get('purpose'), 'generation');
  assert.equal(calls[0].init.body.get('file').size, photoA.buffer.length);

  // Verify Photo B upload
  assert.equal(calls[1].url, 'https://example.invalid/v1/uploads/images');
  assert.equal(calls[1].init.body.get('purpose'), 'generation');
  assert.equal(calls[1].init.body.get('file').size, photoB.buffer.length);

  // Verify generation submission payload
  const body = JSON.parse(calls[2].init.body);
  assert.equal(body.model, 'gpt-image-2.5-sunburst-official');
  assert.equal(body.size, '1024x1536');
  assert.equal(body.quality, 'high');
  assert.deepEqual(body.image_urls, [
    'https://images.example/photo-a.jpg',
    'https://images.example/photo-b.png',
  ]);

  // Verify result
  assert.equal(result.generatedPoster.taskId, 'task-compare-1');
  assert.equal(result.generatedPoster.imageUrl, 'https://images.example/compare-poster.png');
  console.log('PASS dual upload -> 2 image_urls payload -> polling -> comparison poster result');

  // Test 2: Upload failure handling for Photo A
  mock([{ body: { success: false } }]);
  await assert.rejects(generateComparePoster(sampleComparison, photoA, photoB), /Photo A upload failed/);
  assert.equal(calls.length, 1);
  console.log('PASS Photo A upload failure aborts without submitting generation');

  // Test 3: Upload failure handling for Photo B
  mock([
    { body: { success: true, data: { url: 'https://images.example/photo-a.jpg' } } },
    { body: { success: false } },
  ]);
  await assert.rejects(generateComparePoster(sampleComparison, photoA, photoB), /Photo B upload failed/);
  assert.equal(calls.length, 2);
  console.log('PASS Photo B upload failure aborts without submitting generation');

  // Test 4: Generation task failed handling
  mock([
    { body: { success: true, data: { url: 'https://images.example/photo-a.jpg' } } },
    { body: { success: true, data: { url: 'https://images.example/photo-b.png' } } },
    { body: { id: 'task-compare-2', status: 'pending' } },
    { body: { status: 'failed', error: 'Internal generation failure' } },
  ]);
  await assert.rejects(generateComparePoster(sampleComparison, photoA, photoB), /poster image generation failed/);
  assert.equal(calls.length, 4);
  console.log('PASS task failure terminates polling and surfaces clean error');

  // Test 5: Verify buildComparePosterPrompt structure and JSON output
  const prompt = buildComparePosterPrompt(sampleComparison);
  assert.ok(prompt.includes('REPORT_DATA'));
  assert.ok(prompt.includes('PERSON A'));
  assert.ok(prompt.includes('PERSON B'));

  const jsonPart = prompt.split('\n\nREPORT_DATA\n')[1];
  const parsedData = JSON.parse(jsonPart);
  assert.equal(parsedData.winner, 'PERSON A');
  assert.equal(parsedData.advantage, '+0.32 ADVANTAGE');
  assert.equal(parsedData.personA.score, '9.12');
  assert.equal(parsedData.personB.score, '8.80');
  assert.equal(parsedData.personA.isWinner, true);
  assert.equal(parsedData.personB.isWinner, false);
  assert.equal(parsedData.metrics.length, 5);
  assert.equal(parsedData.metrics[0].name, 'FACIAL SYMMETRY');
  assert.equal(parsedData.metrics[0].personAPercentage, '91%');
  assert.equal(parsedData.metrics[0].personBPercentage, '88%');
  console.log('PASS prompt builder parses report into strictly valid REPORT_DATA JSON');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

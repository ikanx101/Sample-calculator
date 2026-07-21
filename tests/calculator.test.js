const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateSampleSize } = require('../public/js/calculator.js');

test('populasi tidak diketahui, e=5%, CI=95%, p=50% -> n=385 (kasus buku teks)', () => {
  const result = calculateSampleSize({
    populationMode: 'unknown',
    marginOfError: 0.05,
    confidenceLevel: 95,
    responseDistribution: 0.5
  });
  assert.equal(result.n, 385);
});

test('populasi tidak diketahui, e=5%, CI=90%, p=50% -> n=271 (default aplikasi)', () => {
  const result = calculateSampleSize({
    populationMode: 'unknown',
    marginOfError: 0.05,
    confidenceLevel: 90,
    responseDistribution: 0.5
  });
  assert.equal(result.n, 271);
});

test('koreksi populasi terhingga menurunkan n dibanding populasi tak terhingga', () => {
  const unknown = calculateSampleSize({
    populationMode: 'unknown', marginOfError: 0.05, confidenceLevel: 95, responseDistribution: 0.5
  });
  const known = calculateSampleSize({
    populationMode: 'known', populationSize: 1000,
    marginOfError: 0.05, confidenceLevel: 95, responseDistribution: 0.5
  });
  assert.ok(known.n < unknown.n);
  assert.equal(known.n, 278);
});

test('menolak margin of error yang tidak valid', () => {
  const result = calculateSampleSize({
    populationMode: 'unknown', marginOfError: 0, confidenceLevel: 95, responseDistribution: 0.5
  });
  assert.ok(result.errors.length > 0);
});

test('menolak populasi diketahui tanpa nilai N', () => {
  const result = calculateSampleSize({
    populationMode: 'known', marginOfError: 0.05, confidenceLevel: 95, responseDistribution: 0.5
  });
  assert.ok(result.errors.length > 0);
});

test('menolak tingkat kepercayaan yang tidak didukung', () => {
  const result = calculateSampleSize({
    populationMode: 'unknown', marginOfError: 0.05, confidenceLevel: 80, responseDistribution: 0.5
  });
  assert.ok(result.errors.length > 0);
});

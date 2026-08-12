import test from 'node:test';
import assert from 'node:assert/strict';
import { syncPortalCompletion } from '../src/index.js';

test('completion sync sends the exact protected portal request', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response('{}', { status: 200 });
  };
  try {
    const result = await syncPortalCompletion({
      TRAINING_API_SECRET: 'server-only-test-secret',
      INSPECTOR_STATUS_URL: 'https://portal.example/api/profiles/inspector-status'
    }, 'valid-user-token');
    assert.deepEqual(result, { success: true, target: 'https://portal.example', status: 200 });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://portal.example/api/profiles/inspector-status');
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(calls[0].options.redirect, 'manual');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer valid-user-token');
    assert.equal(calls[0].options.headers['X-Training-Api-Secret'], 'server-only-test-secret');
    assert.equal(calls[0].options.headers['x-vercel-protection-bypass'], undefined);
    assert.deepEqual(JSON.parse(calls[0].options.body), { inspector_training_complete: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('completion sync fails closed when the server secret is absent', async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; return new Response('{}'); };
  try {
    assert.deepEqual(await syncPortalCompletion({}, 'token'), { success: false });
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('completion sync retries transient portal failures', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response('{}', { status: calls === 3 ? 200 : 503 });
  };
  try {
    assert.deepEqual(await syncPortalCompletion({ TRAINING_API_SECRET: 'secret' }, 'token'), {
      success: true,
      target: 'https://portal.guestguard.com',
      status: 200
    });
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

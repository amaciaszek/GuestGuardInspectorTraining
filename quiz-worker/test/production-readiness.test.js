import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { selectQuestions } from '../src/index.js';
import { CURRICULUM_CATEGORIES, REAL_QUESTION_BANK } from '../src/question-bank.js';

function bankShape() {
  return {
    questions: REAL_QUESTION_BANK,
    key: Object.fromEntries(REAL_QUESTION_BANK.map((question) => [question.id, question.correct])),
    byId: Object.fromEntries(REAL_QUESTION_BANK.map((question) => [question.id, question]))
  };
}

test('production question bank is complete, unique, and gradeable', () => {
  assert.equal(REAL_QUESTION_BANK.length, 101);
  assert.equal(new Set(REAL_QUESTION_BANK.map((question) => question.id)).size, 101);
  for (const question of REAL_QUESTION_BANK) {
    assert.equal(question.options.length, 4, `${question.id} must have four answers`);
    assert.ok(question.options.some((option) => option.id === question.correct), `${question.id} has an invalid answer key`);
    assert.ok(CURRICULUM_CATEGORIES.some((category) => category.id === question.category), `${question.id} has an invalid category`);
  }
});

test('initial exam contains five questions from every curriculum category', () => {
  const bank = bankShape();
  const selected = selectQuestions(bank, [], 1, () => 0.5);
  assert.equal(selected.length, 50);
  assert.equal(new Set(selected).size, 50);
  for (const category of CURRICULUM_CATEGORIES) {
    assert.equal(selected.filter((id) => bank.byId[id].category === category.id).length, 5, category.id);
  }
});

test('production Worker exposes no tester reset route', async () => {
  const response = await worker.fetch(new Request('https://quiz.example/tester/reset-exam', {
    method: 'POST',
    headers: { Origin: 'https://inspector-training.guestguard.workers.dev' }
  }), { ALLOWED_ORIGINS: 'https://inspector-training.guestguard.workers.dev' });
  assert.equal(response.status, 404);
});

test('review-requested curriculum edits remain in the canonical bank', () => {
  const byId = bankShape().byId;
  assert.equal(byId.q018.options[2].text, 'Accept one slot so the job becomes active and the report can be filled out');
  assert.match(byId.q020.text, /deficiency/);
  assert.match(byId.q023.options[1].text, /twenty-four inches/i);
  assert.equal(byId.q032.correct, 'o4');
  assert.match(byId.q048.text, /mold or moisture-related growth/i);
  assert.doesNotMatch(byId.q091.text, /GuestGuard/i);
  assert.equal(byId.q092.text, 'Which procedures should be covered by the host handbook?');
  assert.equal(byId.q101.correct, 'o4');
});

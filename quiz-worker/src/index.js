import { CURRICULUM_CATEGORIES, REAL_QUESTION_BANK } from './question-bank.js';

const MAX_ATTEMPTS = 4;
const INITIAL_QUESTION_COUNT = 50;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origin, env.ALLOWED_ORIGINS);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/attempts/start') {
      const payload = await readJson(request);
      if (!payload) return json({ error: 'Invalid JSON body' }, 400, cors);
      return startAttempt(env, payload, cors);
    }
    if (request.method === 'POST' && url.pathname === '/attempts/submit') {
      const payload = await readJson(request);
      if (!payload) return json({ error: 'Invalid JSON body' }, 400, cors);
      return submitAttempt(env, payload, cors);
    }
    if (request.method === 'POST' && url.pathname === '/test/reset') {
      if (String(env.ALLOW_TEST_CONTROLS) !== 'true') return json({ error: 'Test controls are disabled' }, 403, cors);
      const payload = await readJson(request);
      if (!payload || !payload.learnerId || !payload.quizSeed) return json({ error: 'learnerId and quizSeed are required' }, 400, cors);
      await env.DB.batch([
        env.DB.prepare('DELETE FROM quiz_attempts WHERE learner_id = ? AND quiz_seed = ?').bind(String(payload.learnerId), String(payload.quizSeed)),
        env.DB.prepare('DELETE FROM results WHERE user_id = ? AND seed = ?').bind(String(payload.learnerId), String(payload.quizSeed))
      ]);
      return json({ reset: true }, 200, cors);
    }
    return json({ error: 'Not found' }, 404, cors);
  }
};

async function startAttempt(env, payload, cors) {
  const quizSeed = String(payload.quizSeed || '');
  const learnerId = String(payload.learnerId || '');
  if (!quizSeed || !learnerId) return json({ error: 'quizSeed and learnerId are required' }, 400, cors);

  const quiz = await env.DB.prepare('SELECT seed, title, questions, answer_key, pass_mark FROM quizzes WHERE seed = ?').bind(quizSeed).first();
  if (!quiz) return json({ error: 'Unknown quiz seed' }, 404, cors);
  const bank = quizBank(quiz);

  const active = await env.DB.prepare("SELECT * FROM quiz_attempts WHERE learner_id = ? AND quiz_seed = ? AND status = 'active' ORDER BY attempt_number DESC LIMIT 1").bind(learnerId, quizSeed).first();
  if (active) return json(attemptResponse(active, quiz, MAX_ATTEMPTS), 200, cors);

  const historyResult = await env.DB.prepare("SELECT * FROM quiz_attempts WHERE learner_id = ? AND quiz_seed = ? AND status = 'submitted' ORDER BY attempt_number ASC").bind(learnerId, quizSeed).all();
  const history = historyResult.results || [];
  if (history.some((attempt) => attempt.passed === 1)) {
    const passed = history.find((attempt) => attempt.passed === 1);
    return json({ complete: true, passed: true, score: passed.score, total: passed.total, attemptsUsed: history.length, retakesRemaining: Math.max(0, MAX_ATTEMPTS - history.length) }, 200, cors);
  }
  if (history.length >= MAX_ATTEMPTS) return json({ complete: true, passed: false, exhausted: true, attemptsUsed: history.length, retakesRemaining: 0 }, 200, cors);

  const attemptNumber = history.length + 1;
  const variantSeed = crypto.randomUUID();
  const selectedIds = selectQuestions(bank, history, attemptNumber, seededRandom(variantSeed));
  const plan = buildPlan(selectedIds, bank, seededRandom(variantSeed + ':options'));
  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO quiz_attempts
    (id, quiz_seed, learner_id, attempt_number, variant_seed, question_plan, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`)
    .bind(id, quizSeed, learnerId, attemptNumber, variantSeed, JSON.stringify(plan), now, now).run();

  return json({
    attemptId: id,
    title: quiz.title,
    attemptNumber,
    questionCount: plan.length,
    passMark: quiz.pass_mark,
    retakesRemaining: MAX_ATTEMPTS - attemptNumber,
    questions: publicQuestions(plan, bank),
    selectionMode: attemptNumber === 1 ? 'balanced-initial' : 'targeted-retake',
    categoryCoverage: categoryCoverage(plan, bank)
  }, 201, cors);
}

async function submitAttempt(env, payload, cors) {
  if (!payload.attemptId || !payload.answers || typeof payload.answers !== 'object' || Array.isArray(payload.answers)) {
    return json({ error: 'attemptId and answers are required' }, 400, cors);
  }
  const attempt = await env.DB.prepare('SELECT * FROM quiz_attempts WHERE id = ?').bind(String(payload.attemptId)).first();
  if (!attempt) return json({ error: 'Unknown attempt' }, 404, cors);
  if (attempt.status !== 'active') return json({ error: 'This attempt was already submitted' }, 409, cors);
  const quiz = await env.DB.prepare('SELECT seed, title, questions, answer_key, pass_mark FROM quizzes WHERE seed = ?').bind(attempt.quiz_seed).first();
  const bank = quizBank(quiz);
  const plan = JSON.parse(attempt.question_plan);
  const answers = payload.answers;
  const expectedQuestionIds = new Set(plan.map((item) => item.displayId));
  if (Object.keys(answers).some((id) => !expectedQuestionIds.has(id))) {
    return json({ error: 'Answers include a question that is not part of this attempt' }, 400, cors);
  }

  let score = 0;
  const missed = [];
  for (let i = 0; i < plan.length; i += 1) {
    const item = plan[i];
    const selected = item.options.find((option) => option.displayId === String(answers[item.displayId] || ''));
    const correct = selected && selected.canonicalId === bank.key[item.canonicalId];
    if (correct) score += 1;
    else missed.push({ id: item.displayId, number: i + 1, text: bank.byId[item.canonicalId].text, canonicalId: item.canonicalId });
  }
  const percent = Math.round((score / plan.length) * 100);
  const passed = percent >= Number(quiz.pass_mark);
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(`UPDATE quiz_attempts SET status = 'submitted', score = ?, total = ?, passed = ?, incorrect_ids = ?, answers = ?, submitted_at = ?, updated_at = ? WHERE id = ?`)
      .bind(score, plan.length, passed ? 1 : 0, JSON.stringify(missed.map((m) => m.canonicalId)), JSON.stringify(answers), now, now, attempt.id),
    env.DB.prepare('INSERT INTO results (seed, user_id, score, total, passed, answers, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(quiz.seed, attempt.learner_id, score, plan.length, passed ? 1 : 0, JSON.stringify(answers), now)
  ]);

  return json({
    attemptId: attempt.id,
    attemptNumber: attempt.attempt_number,
    score,
    total: plan.length,
    percent,
    passed,
    passMark: quiz.pass_mark,
    missed: missed.map(({ id, number, text }) => ({ id, number, text })),
    retakesRemaining: passed ? Math.max(0, MAX_ATTEMPTS - attempt.attempt_number) : Math.max(0, MAX_ATTEMPTS - attempt.attempt_number),
    canRetake: !passed && attempt.attempt_number < MAX_ATTEMPTS
  }, 200, cors);
}

export function selectQuestions(bank, history, attemptNumber, rng) {
  const allIds = bank.questions.map((q) => q.id);
  if (attemptNumber === 1) {
    const selected = [];
    for (const category of CURRICULUM_CATEGORIES) {
      const categoryIds = bank.questions.filter((q) => q.category === category.id).map((q) => q.id);
      if (categoryIds.length < category.testCount) throw new Error(`Question category ${category.id} does not have enough questions`);
      selected.push(...shuffle(categoryIds, rng).slice(0, category.testCount));
    }
    if (selected.length !== INITIAL_QUESTION_COUNT) throw new Error('Initial quiz category quotas do not total 50 questions');
    return shuffle(selected, rng);
  }
  const last = history[history.length - 1];
  const lastMissed = last && last.incorrect_ids
    ? JSON.parse(last.incorrect_ids).filter((id) => allIds.includes(id))
    : [];
  const retakeQuestionCount = Math.min(allIds.length, lastMissed.length * 2);
  if (!retakeQuestionCount) throw new Error('Cannot build a retake without missed questions');

  const seen = new Set();
  history.forEach((attempt) => JSON.parse(attempt.question_plan || '[]').forEach((item) => seen.add(item.canonicalId)));

  // One targeted slot for every missed question. Each slot is filled from the
  // same curriculum category, but may use either the same question or another
  // question from that category.
  const categoryTargets = {};
  lastMissed.forEach((id) => {
    const category = bank.byId[id].category;
    categoryTargets[category] = (categoryTargets[category] || 0) + 1;
  });
  const chosen = [];
  Object.entries(categoryTargets).forEach(([category, count]) => {
    const candidates = shuffle(
      bank.questions.filter((question) => question.category === category).map((question) => question.id),
      rng
    );
    if (candidates.length < count) throw new Error(`Not enough ${category} questions to build targeted retake`);
    chosen.push(...candidates.slice(0, count));
  });

  // The other half is broad curriculum practice. Prefer questions the learner
  // has not seen, then fill from previously seen questions without duplicates.
  const chosenSet = new Set(chosen);
  const unseen = shuffle(allIds.filter((id) => !seen.has(id) && !chosenSet.has(id)), rng);
  const other = shuffle(allIds.filter((id) => seen.has(id) && !chosenSet.has(id)), rng);
  while (chosen.length < retakeQuestionCount && unseen.length) {
    const id = unseen.shift();
    chosen.push(id);
    chosenSet.add(id);
  }
  while (chosen.length < retakeQuestionCount && other.length) {
    const id = other.shift();
    chosen.push(id);
    chosenSet.add(id);
  }
  return shuffle(chosen, rng);
}

function buildPlan(ids, bank, rng) {
  return ids.map((canonicalId, index) => ({
    displayId: `q${index + 1}`,
    canonicalId,
    options: shuffle(bank.byId[canonicalId].options.map((option) => ({ canonicalId: option.id })), rng)
      .map((option, optionIndex) => ({ ...option, displayId: `q${index + 1}o${optionIndex + 1}` }))
  }));
}

function publicQuestions(plan, bank) {
  return plan.map((item) => ({
    id: item.displayId,
    text: bank.byId[item.canonicalId].text,
    options: item.options.map((option) => ({ id: option.displayId, text: bank.byId[item.canonicalId].options.find((o) => o.id === option.canonicalId).text }))
  }));
}

function attemptResponse(attempt, quiz) {
  const bank = quizBank(quiz);
  const plan = JSON.parse(attempt.question_plan);
  return {
    attemptId: attempt.id,
    title: quiz.title,
    attemptNumber: attempt.attempt_number,
    questionCount: plan.length,
    passMark: quiz.pass_mark,
    retakesRemaining: MAX_ATTEMPTS - attempt.attempt_number,
    questions: publicQuestions(plan, bank),
    selectionMode: attempt.attempt_number === 1 ? 'balanced-initial' : 'targeted-retake',
    categoryCoverage: categoryCoverage(plan, bank),
    resumed: true
  };
}

function categoryCoverage(plan, bank) {
  const counts = Object.fromEntries(CURRICULUM_CATEGORIES.map((category) => [category.id, 0]));
  plan.forEach((item) => {
    const question = bank.byId[item.canonicalId];
    if (question && Object.prototype.hasOwnProperty.call(counts, question.category)) counts[question.category] += 1;
  });
  return CURRICULUM_CATEGORIES.map((category) => ({
    category: category.label,
    categoryId: category.id,
    selected: counts[category.id],
    initialQuota: category.testCount
  }));
}

function quizBank(quiz) {
  if (quiz.seed === 'inspector-certification-v1') {
    const questions = REAL_QUESTION_BANK;
    return { questions, key: Object.fromEntries(questions.map((q) => [q.id, q.correct])), byId: Object.fromEntries(questions.map((q) => [q.id, q])) };
  }
  if (quiz.seed === 'demo-even-001') return buildDemoBank();
  const questions = JSON.parse(quiz.questions);
  return { questions, key: JSON.parse(quiz.answer_key), byId: Object.fromEntries(questions.map((q) => [q.id, q])) };
}

function buildDemoBank() {
  const questions = [];
  const key = {};
  for (let i = 1; i <= 50; i += 1) {
    const even = i * 12 + 2;
    const values = [even - 7, even, even + 5, even + 11];
    const options = values.map((value, index) => ({ id: `o${index + 1}`, text: String(value) }));
    const id = `bank${i}`;
    questions.push({ id, text: 'Which of these numbers is even?', options });
    key[id] = 'o2';
  }
  return { questions, key, byId: Object.fromEntries(questions.map((q) => [q.id, q])) };
}

function seededRandom(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return function () { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function shuffle(values, rng) {
  for (let i = values.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [values[i], values[j]] = [values[j], values[i]]; }
  return values;
}

async function readJson(request) { try { return await request.json(); } catch (_) { return null; } }

function corsHeaders(origin, configured) {
  const allowed = String(configured || '').split(',').map((value) => value.trim()).filter(Boolean);
  const headers = { 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Vary': 'Origin' };
  if (origin && allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(body, status, extraHeaders) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders } });
}

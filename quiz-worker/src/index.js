export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origin, env.ALLOWED_ORIGINS);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    const quizMatch = url.pathname.match(/^\/quiz\/([^/]+)$/);
    if (request.method === 'GET' && quizMatch) {
      const seed = decodeURIComponent(quizMatch[1]);
      const quiz = await env.DB.prepare('SELECT seed, title, questions, pass_mark FROM quizzes WHERE seed = ?').bind(seed).first();
      if (!quiz) return json({ error: 'Unknown quiz seed' }, 404, cors);
      return json({ seed: quiz.seed, title: quiz.title, questions: JSON.parse(quiz.questions), passMark: quiz.pass_mark }, 200, cors);
    }

    if (request.method === 'POST' && url.pathname === '/submit') {
      let payload;
      try { payload = await request.json(); } catch (_) { return json({ error: 'Invalid JSON body' }, 400, cors); }
      if (!payload || !payload.seed || !payload.answers || typeof payload.answers !== 'object' || Array.isArray(payload.answers)) {
        return json({ error: 'A quiz seed and answers object are required' }, 400, cors);
      }
      const quiz = await env.DB.prepare('SELECT seed, title, answer_key, pass_mark FROM quizzes WHERE seed = ?').bind(String(payload.seed)).first();
      if (!quiz) return json({ error: 'Unknown quiz seed' }, 404, cors);

      const key = JSON.parse(quiz.answer_key);
      const ids = Object.keys(key);
      if (Object.keys(payload.answers).some((id) => !Object.prototype.hasOwnProperty.call(key, id))) {
        return json({ error: 'Submission contains an unknown question' }, 400, cors);
      }
      let score = 0;
      ids.forEach((id) => { if (String(payload.answers[id] || '') === String(key[id])) score += 1; });
      const passed = score >= quiz.pass_mark;
      const userId = request.headers.get('X-GuestGuard-User') || null;
      await env.DB.prepare('INSERT INTO results (seed, user_id, score, total, passed, answers, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(quiz.seed, userId, score, ids.length, passed ? 1 : 0, JSON.stringify(payload.answers), Date.now()).run();

      // Deliberately omit the answer key and per-question correctness.
      return json({ seed: quiz.seed, title: quiz.title, score, total: ids.length, passed, passMark: quiz.pass_mark }, 200, cors);
    }
    return json({ error: 'Not found' }, 404, cors);
  }
};

function corsHeaders(origin, configured) {
  const allowed = String(configured || '').split(',').map((value) => value.trim()).filter(Boolean);
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Vary': 'Origin'
  };
  if (origin && allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(body, status, extraHeaders) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders } });
}

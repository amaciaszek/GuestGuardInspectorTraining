(function () {
  'use strict';

  var cfg = window.GG_STANDALONE_QUIZ || {};
  var local = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:';
  var api = String(local ? cfg.localApiUrl : cfg.apiUrl || '').replace(/\/$/, '');
  var LOG = '[GG Quiz]';
  var DRAFT_PREFIX = 'gg-quiz-draft:';

  var form = document.getElementById('quizForm');
  var list = document.getElementById('questionList');
  var status = document.getElementById('quizStatus');
  var submit = document.getElementById('quizSubmit');
  var note = document.getElementById('answerNote');
  var progress = document.getElementById('quizProgress');
  var count = document.getElementById('quizCount');
  var result = document.getElementById('quizResult');
  var attemptMeta = document.getElementById('quizAttemptMeta');
  var questions = [];
  var attempt = null;
  var attemptFinalized = false;

  function debug(message, detail) {
    if (detail === undefined) console.info(LOG, message);
    else console.info(LOG, message, detail);
  }

  function escapeHtml(value) {
    var div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  function token() {
    return localStorage.getItem('gg_access_token');
  }

  function headers() {
    var value = { 'Content-Type': 'application/json' };
    if (token()) value.Authorization = 'Bearer ' + token();
    return value;
  }

  function currentAnswers() {
    var answers = {};
    form.querySelectorAll('input[type=radio]:checked').forEach(function (input) {
      answers[input.name] = input.value;
    });
    return answers;
  }

  function selectedCount() {
    return Object.keys(currentAnswers()).length;
  }

  function apiPost(path, body, options) {
    debug('API request', { path: path });
    return fetch(api + path, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
      keepalive: !!(options && options.keepalive)
    }).then(function (response) {
      debug('API response', { path: path, status: response.status, ok: response.ok });
      if (response.status === 401 || response.status === 403) {
        if (window.GGTraining && window.GGTraining.clearAuth) window.GGTraining.clearAuth();
        else {
          localStorage.removeItem('gg_access_token');
          localStorage.removeItem('gg_refresh_token');
          localStorage.removeItem('gg_expires_at');
        }
        document.dispatchEvent(new CustomEvent('gg:authrequired', { detail: { reason: 'expired' } }));
      }
      return response.json().then(function (data) {
        if (!response.ok) throw new Error(data.error || 'Request failed');
        return data;
      });
    });
  }

  function draftKey() {
    return attempt && attempt.attemptId ? DRAFT_PREFIX + attempt.attemptId : null;
  }

  function saveDraft() {
    var key = draftKey();
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(currentAnswers()));
    document.dispatchEvent(new CustomEvent('gg:localsaved'));
  }

  function restoreDraft() {
    var key = draftKey();
    if (!key) return;
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(key)) || {}; } catch (_) {}
    Object.keys(saved).forEach(function (questionId) {
      var selector = 'input[type="radio"][name="' + CSS.escape(questionId) + '"][value="' + CSS.escape(String(saved[questionId])) + '"]';
      var input = form.querySelector(selector);
      if (input) input.checked = true;
    });
  }

  function clearDraft() {
    var key = draftKey();
    if (key) localStorage.removeItem(key);
  }

  function updateProgress() {
    var answered = selectedCount();
    progress.style.width = (questions.length ? answered / questions.length * 100 : 0) + '%';
    count.textContent = answered + ' of ' + questions.length + ' answered';
    note.textContent = answered === questions.length
      ? 'Ready to submit'
      : (questions.length - answered) + ' unanswered — submit to review them';
    submit.disabled = !questions.length;
  }

  function renderAttempt(data) {
    attempt = data;
    questions = data.questions || [];
    attemptFinalized = false;
    result.className = 'result';
    result.innerHTML = '';
    var examTitle = data.title || 'Inspector Certification';
    if (!/\bexam\b/i.test(examTitle)) examTitle += ' Exam';
    document.getElementById('quizTitle').textContent = examTitle;
    attemptMeta.textContent = 'Attempt ' + data.attemptNumber + ' of 4 · ' + data.questionCount + ' questions · ' + data.retakesRemaining + ' retakes remaining';
    list.innerHTML = questions.map(function (question, index) {
      var headingId = 'quizQuestion' + (index + 1);
      return '<section class="question" role="group" aria-labelledby="' + headingId + '">' +
        '<h2 class="question-title" id="' + headingId + '"><span class="q-number">QUESTION ' + (index + 1) + '</span>' + escapeHtml(question.text) + '</h2>' +
        '<div class="options">' + question.options.map(function (option, optionIndex) {
          return '<label class="option"><span class="option-letter">' + String.fromCharCode(65 + optionIndex) + '</span>' +
            '<input type="radio" name="' + escapeHtml(question.id) + '" value="' + escapeHtml(option.id) + '">' +
            '<span>' + escapeHtml(option.text) + '</span></label>';
        }).join('') + '</div></section>';
    }).join('');
    status.hidden = true;
    list.hidden = false;
    document.getElementById('quizActions').hidden = false;
    restoreDraft();
    updateProgress();
    debug(data.resumed ? 'Resumed active attempt' : 'Started seeded attempt', {
      attemptId: data.attemptId,
      attemptNumber: data.attemptNumber,
      questionCount: questions.length,
      selectionMode: data.selectionMode
    });
    console.groupCollapsed(LOG + ' Category selection diagnostics');
    console.table(data.categoryCoverage || []);
    console.info('Expected initial exam: 5 questions from each of 10 categories. Retakes vary based on missed-question categories.');
    console.groupEnd();
  }

  function showTerminal(data) {
    if (data.passed) {
      showCompletion(data);
      return;
    }
    attemptFinalized = true;
    status.hidden = true;
    list.hidden = true;
    document.getElementById('quizActions').hidden = true;
    count.textContent = 'Attempt history complete';
    result.className = 'result show' + (data.passed ? '' : ' fail');
    result.innerHTML = '<h2>No retakes remaining</h2><p>This exam session has used the initial attempt and all three retakes.</p>';
  }

  function showCompletion(data) {
    attemptFinalized = true;
    status.hidden = true;
    list.hidden = true;
    document.getElementById('quizActions').hidden = true;
    form.hidden = true;
    document.querySelector('.quiz-intro').hidden = true;
    document.querySelector('.quiz-main > .progress').hidden = true;
    count.textContent = 'Exam complete';
    result.className = 'result show completion-screen' + (data.completionSynced === false ? ' sync-pending' : '');
    var portalBase = window.GG_PORTAL_BASE || 'https://portal.guestguard.com';
    var devReceipt = data.completionSynced && data.completionTarget
      ? '<div class="completion-proof" role="status">' +
        '<div class="completion-proof-icon" aria-hidden="true">✓</div>' +
        '<div><div class="completion-proof-title">DEV SECRET HANDSHAKE ACCEPTED</div>' +
        '<div><strong>Server route:</strong> Cloudflare training Worker → ' + escapeHtml(data.completionTarget) + '</div>' +
        '<div><strong>Protected header:</strong> X-Training-Api-Secret (server-only; value hidden)</div>' +
        '<div><strong>Dev API response:</strong> HTTP ' + escapeHtml(String(data.completionStatus || 'success')) + '</div>' +
        '<div class="completion-proof-note">Brian’s dev API accepted the authenticated completion update. Verify inspector_training_complete = true in the dev database.</div></div></div>'
      : '';
    var devFailure = data.completionSynced === false && data.completionTarget
      ? '<div class="completion-proof completion-proof-failed" role="alert">' +
        '<div class="completion-proof-icon" aria-hidden="true">!</div>' +
        '<div><div class="completion-proof-title">DEV SECRET HANDSHAKE NOT ACCEPTED</div>' +
        '<div><strong>Target:</strong> ' + escapeHtml(data.completionTarget) + '</div>' +
        '<div><strong>Dev API result:</strong> ' + (data.completionStatus ? 'HTTP ' + escapeHtml(String(data.completionStatus)) : 'No HTTP response') + '</div>' +
        '<div class="completion-proof-note">The exam passed, but Brian’s dev API did not accept the protected completion request. Check the dev secret configuration and whether the dev route accepts this authenticated portal user.</div></div></div>'
      : '';
    result.innerHTML = '<div class="completion-mark" aria-hidden="true">✓</div>' +
      '<div class="eyebrow">CERTIFICATION EXAM COMPLETE</div>' +
      '<h1>' + (data.completionSynced === false ? 'Exam passed - portal update pending' : 'You passed the certification exam') + '</h1>' +
      (data.score != null && data.total != null ? '<p class="completion-score">' + data.score + ' / ' + data.total + ' correct</p>' : '') +
      '<p>' + (data.completionSynced === false
        ? 'Your passing exam result is safely recorded. We could not confirm the final portal update yet; use the button below to retry before returning.'
        : 'Your result is recorded and your inspector training status has been sent to GuestGuard. Return to the Inspector Portal for your next steps.') + '</p>' +
      devReceipt + devFailure +
      '<div class="completion-actions">' +
        (data.completionSynced === false ? '<button type="button" class="secondary" id="completionRetry">Retry portal update</button>' : '') +
        '<a class="portal-return" href="' + portalBase + '/inspector-portal">Open Dev Inspector Portal and verify status</a>' +
      '</div>';
    var retry = document.getElementById('completionRetry');
    if (retry) retry.onclick = startAttempt;
  }

  function showError(message, error) {
    console.error(LOG, message, error || '');
    status.hidden = false;
    status.className = 'status error';
    status.textContent = message;
  }

  function startAttempt() {
    if (!api) return showError('Exam API is not configured.');
    status.hidden = false;
    status.className = 'status';
    status.textContent = 'Preparing your seeded question set…';
    list.hidden = true;
    document.getElementById('quizActions').hidden = true;
    apiPost('/attempts/start', { quizSeed: cfg.seed }).then(function (data) {
      if (data.complete) showTerminal(data);
      else renderAttempt(data);
    }).catch(function (error) {
      showError(error.message, error);
    });
  }

  function missedMarkup(missed) {
    if (!missed || !missed.length) return '';
    return '<div class="missed"><div class="missed-title">Questions answered incorrectly</div><ol>' +
      missed.map(function (item) {
        return '<li><span>Question ' + item.number + '</span>' + escapeHtml(item.text) + '</li>';
      }).join('') +
      '</ol><p>The correct answers are intentionally not shown.</p></div>';
  }

  form.addEventListener('change', function (event) {
    var question = event.target.closest('.question');
    if (question) question.classList.remove('unanswered');
    saveDraft();
    updateProgress();
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var unanswered = Array.from(list.querySelectorAll('.question')).filter(function (question) {
      return !question.querySelector('input[type=radio]:checked');
    });
    list.querySelectorAll('.question.unanswered').forEach(function (question) {
      question.classList.remove('unanswered');
    });
    if (unanswered.length) {
      unanswered.forEach(function (question) { question.classList.add('unanswered'); });
      note.textContent = unanswered.length + ' unanswered question' + (unanswered.length === 1 ? '' : 's') + ' highlighted below';
      debug('Submit paused: unanswered questions highlighted', {
        unansweredCount: unanswered.length,
        questionNumbers: unanswered.map(function (question) {
          return Array.prototype.indexOf.call(list.children, question) + 1;
        })
      });
      unanswered[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Grading…';
    var answers = currentAnswers();
    debug('Submitting seeded attempt', { attemptId: attempt.attemptId, answerCount: Object.keys(answers).length });
    apiPost('/attempts/submit', { attemptId: attempt.attemptId, answers: answers }).then(function (data) {
      attemptFinalized = true;
      clearDraft();
      debug('Attempt graded', {
        score: data.score,
        total: data.total,
        percent: data.percent,
        passed: data.passed,
        retakesRemaining: data.retakesRemaining
      });
      result.className = 'result show' + (data.passed ? '' : ' fail');
      result.innerHTML = '<p class="result-score">' + data.score + ' / ' + data.total + '</p><h2>' +
        (data.passed ? 'Exam passed' : 'Attempt not passed') + '</h2><p>' + data.percent + '% · ' +
        data.passMark + '% required · ' + data.retakesRemaining + ' retakes remaining</p>' +
        missedMarkup(data.missed) +
        (data.canRetake ? '<button type="button" class="secondary" id="quizRetake">Start retake</button>' : '');
      result.scrollIntoView({ behavior: 'smooth', block: 'center' });
      list.hidden = true;
      document.getElementById('quizActions').hidden = true;
      if (data.passed) {
        setTrainingState().finally(function () { showCompletion(data); });
      }
      var retake = document.getElementById('quizRetake');
      if (retake) retake.onclick = startAttempt;
    }).catch(function (error) {
      showError(error.message, error);
    }).finally(function () {
      submit.textContent = 'Submit answers';
      updateProgress();
    });
  });

  function setTrainingState() {
    if (!window.GGTraining || !window.GGTraining.markPartComplete) return Promise.resolve(false);
    return window.GGTraining.markPartComplete('5-1').then(function (saved) {
      if (saved) document.dispatchEvent(new CustomEvent('gg:quizcomplete', { detail: { itemId: '5-1' } }));
      return saved;
    });
  }

  debug('Initializing seeded quiz', {
    apiUrl: api,
    quizSeed: cfg.seed,
    authenticated: !!token()
  });
  startAttempt();
}());

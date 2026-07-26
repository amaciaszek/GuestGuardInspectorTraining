(function () {
  'use strict';

  var cfg = window.GG_STANDALONE_QUIZ || {};
  var local = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:';
  var api = String(local ? cfg.localApiUrl : cfg.apiUrl || '').replace(/\/$/, '');
  var LOG = '[GG Quiz]';
  var learnerId = localStorage.getItem('gg_quiz_learner_id') || (crypto.randomUUID ? crypto.randomUUID() : 'learner-' + Date.now());
  localStorage.setItem('gg_quiz_learner_id', learnerId);

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
  var leaveSubmissionSent = false;
  var historyGuardArmed = false;
  var historyExitInProgress = false;

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
    debug('API request', { path: path, learnerId: learnerId.slice(0, 8) + '…' });
    return fetch(api + path, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
      keepalive: !!(options && options.keepalive)
    }).then(function (response) {
      debug('API response', { path: path, status: response.status, ok: response.ok });
      return response.json().then(function (data) {
        if (!response.ok) throw new Error(data.error || 'Request failed');
        return data;
      });
    });
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
    leaveSubmissionSent = false;
    result.className = 'result';
    result.innerHTML = '';
    document.getElementById('quizTitle').textContent = data.title || 'Knowledge Check';
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
    armHistoryGuard();
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
    attemptFinalized = true;
    status.hidden = true;
    list.hidden = true;
    document.getElementById('quizActions').hidden = true;
    count.textContent = 'Attempt history complete';
    result.className = 'result show' + (data.passed ? '' : ' fail');
    result.innerHTML = '<h2>' + (data.passed ? 'Quiz already completed' : 'No retakes remaining') + '</h2><p>' +
      (data.passed ? 'Your passing result is recorded.' : 'This test session has used the initial attempt and all three retakes.') + '</p>';
  }

  function showError(message, error) {
    console.error(LOG, message, error || '');
    status.hidden = false;
    status.className = 'status error';
    status.textContent = message;
  }

  function startAttempt() {
    if (!api) return showError('Quiz API is not configured.');
    status.hidden = false;
    status.className = 'status';
    status.textContent = 'Preparing your seeded question set…';
    list.hidden = true;
    document.getElementById('quizActions').hidden = true;
    apiPost('/attempts/start', { quizSeed: cfg.seed, learnerId: learnerId }).then(function (data) {
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

  function activeAttempt() {
    return !!(attempt && attempt.attemptId && !attemptFinalized);
  }

  function armHistoryGuard() {
    if (historyGuardArmed) return;
    history.replaceState({ ggQuizBase: true }, '', location.href);
    history.pushState({ ggQuizGuard: true }, '', location.href);
    historyGuardArmed = true;
    debug('Browser back-button guard armed');
  }

  function gradeForDeparture() {
    if (!activeAttempt() || leaveSubmissionSent) return Promise.resolve();
    leaveSubmissionSent = true;
    var answers = currentAnswers();
    debug('Leaving quiz: grading current answers and counting unanswered questions as incorrect', {
      attemptId: attempt.attemptId,
      answered: Object.keys(answers).length,
      unanswered: Math.max(0, questions.length - Object.keys(answers).length)
    });
    return apiPost('/attempts/submit', { attemptId: attempt.attemptId, answers: answers }).then(function () {
      attemptFinalized = true;
    }).catch(function (error) {
      leaveSubmissionSent = false;
      throw error;
    });
  }

  form.addEventListener('change', function (event) {
    var question = event.target.closest('.question');
    if (question) question.classList.remove('unanswered');
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
      debug('Attempt graded', {
        score: data.score,
        total: data.total,
        percent: data.percent,
        passed: data.passed,
        retakesRemaining: data.retakesRemaining
      });
      result.className = 'result show' + (data.passed ? '' : ' fail');
      result.innerHTML = '<p class="result-score">' + data.score + ' / ' + data.total + '</p><h2>' +
        (data.passed ? 'Quiz passed' : 'Attempt not passed') + '</h2><p>' + data.percent + '% · ' +
        data.passMark + '% required · ' + data.retakesRemaining + ' retakes remaining</p>' +
        missedMarkup(data.missed) +
        (data.canRetake ? '<button type="button" class="secondary" id="quizRetake">Start retake</button>' : '');
      result.scrollIntoView({ behavior: 'smooth', block: 'center' });
      list.hidden = true;
      document.getElementById('quizActions').hidden = true;
      if (data.passed) setTrainingState(true);
      var retake = document.getElementById('quizRetake');
      if (retake) retake.onclick = startAttempt;
    }).catch(function (error) {
      showError(error.message, error);
    }).finally(function () {
      submit.textContent = 'Submit answers';
      updateProgress();
    });
  });

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href]');
    if (!link || !activeAttempt() || link.target === '_blank' || link.hasAttribute('download')) return;
    event.preventDefault();
    var destination = link.href;
    if (!confirm('Leaving this quiz will submit and grade it now. Any unanswered questions will be marked incorrect. Do you want to leave?')) return;
    gradeForDeparture().then(function () {
      location.href = destination;
    }).catch(function (error) {
      showError('The quiz could not be graded, so you have not been taken away from this page. Please try again.', error);
    });
  });

  window.addEventListener('popstate', function () {
    if (!historyGuardArmed || historyExitInProgress) return;

    // Once an attempt has already been graded, transparently skip the extra
    // same-page history entry created by the guard.
    if (!activeAttempt()) {
      historyExitInProgress = true;
      history.back();
      return;
    }

    // Restore the guard entry before asking. This keeps the learner on the quiz
    // when they cancel the warning and works for Chrome's Back button as well
    // as mouse back buttons.
    history.pushState({ ggQuizGuard: true }, '', location.href);
    if (!confirm('Leaving this quiz will submit and grade it now. Any unanswered questions will be marked incorrect. Do you want to leave?')) {
      debug('Browser back navigation cancelled; quiz remains active');
      return;
    }

    gradeForDeparture().then(function () {
      debug('Browser back navigation confirmed; attempt graded');
      historyExitInProgress = true;
      history.go(-2);
    }).catch(function (error) {
      showError('The quiz could not be graded, so you have not been taken away from this page. Please try again.', error);
    });
  });

  window.addEventListener('beforeunload', function (event) {
    if (!activeAttempt()) return;
    event.preventDefault();
    event.returnValue = '';
  });

  window.addEventListener('pagehide', function () {
    if (!activeAttempt() || leaveSubmissionSent) return;
    leaveSubmissionSent = true;
    var answers = currentAnswers();
    debug('Page closing: sending keep-alive grade request', {
      answered: Object.keys(answers).length,
      unanswered: Math.max(0, questions.length - Object.keys(answers).length)
    });
    fetch(api + '/attempts/submit', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ attemptId: attempt.attemptId, answers: answers }),
      keepalive: true
    }).catch(function () {});
  });

  function setTrainingState(completed) {
    document.dispatchEvent(new CustomEvent('gg:quizteststate', { detail: { itemId: '5-1', completed: completed } }));
    if (window.GGTraining && window.GGTraining.setTestProgress) return window.GGTraining.setTestProgress('5-1', completed);
    if (completed && window.GGTraining && window.GGTraining.markPartComplete) return window.GGTraining.markPartComplete('5-1');
    return Promise.resolve(false);
  }

  document.getElementById('testMarkComplete').onclick = function () {
    setTrainingState(true).then(function () { debug('Testing control: marked complete'); });
  };
  document.getElementById('testMarkIncomplete').onclick = function () {
    setTrainingState(false).then(function () { debug('Testing control: marked incomplete'); });
  };
  document.getElementById('testReset').onclick = function () {
    if (!confirm('Reset all quiz attempts and mark Step 4 incomplete for this test learner?')) return;
    apiPost('/test/reset', { quizSeed: cfg.seed, learnerId: learnerId }).then(function () {
      attemptFinalized = true;
      return setTrainingState(false);
    }).then(function () {
      form.reset();
      result.className = 'result';
      startAttempt();
      debug('Testing control: quiz and progress reset');
    }).catch(function (error) {
      showError(error.message, error);
    });
  };

  debug('Initializing seeded quiz', {
    apiUrl: api,
    quizSeed: cfg.seed,
    authenticated: !!token(),
    learnerId: learnerId.slice(0, 8) + '…'
  });
  startAttempt();
}());

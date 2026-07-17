(function () {
  'use strict';
  var cfg = window.GG_STANDALONE_QUIZ || {};
  var local = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:';
  var api = String(local ? cfg.localApiUrl : cfg.apiUrl || '').replace(/\/$/, '');
  var form = document.getElementById('quizForm');
  var list = document.getElementById('questionList');
  var status = document.getElementById('quizStatus');
  var submit = document.getElementById('quizSubmit');
  var note = document.getElementById('answerNote');
  var progress = document.getElementById('quizProgress');
  var count = document.getElementById('quizCount');
  var result = document.getElementById('quizResult');
  var questions = [];

  function escapeHtml(value) { var d = document.createElement('div'); d.textContent = value; return d.innerHTML; }
  function token() { return localStorage.getItem('gg_access_token'); }
  function headers() { var h = {'Content-Type':'application/json'}; if (token()) h.Authorization = 'Bearer ' + token(); return h; }
  function selectedCount() { return form.querySelectorAll('input[type=radio]:checked').length; }
  function updateProgress() {
    var n = selectedCount();
    progress.style.width = (questions.length ? n / questions.length * 100 : 0) + '%';
    count.textContent = n + ' of ' + questions.length + ' answered';
    note.textContent = n === questions.length ? 'Ready to submit' : 'Answer every question before submitting';
    submit.disabled = !questions.length || n !== questions.length;
  }
  function render(data) {
    questions = data.questions || [];
    document.getElementById('quizTitle').textContent = data.title || 'Practice Knowledge Check';
    list.innerHTML = questions.map(function (q, i) {
      return '<fieldset class="question"><legend><span class="q-number">QUESTION ' + (i + 1) + '</span>' + escapeHtml(q.text) + '</legend><div class="options">' +
        q.options.map(function (option, oi) { return '<label class="option"><input type="radio" name="' + escapeHtml(q.id) + '" value="' + escapeHtml(option.id) + '"><span>' + escapeHtml(option.text) + '</span></label>'; }).join('') +
        '</div></fieldset>';
    }).join('');
    status.hidden = true;
    list.hidden = false;
    document.getElementById('quizActions').hidden = false;
    updateProgress();
  }
  function showError(message) { status.hidden = false; status.className = 'status error'; status.textContent = message; }
  function load() {
    if (!api || api.indexOf('YOUR-SUBDOMAIN') >= 0) { showError('The quiz API has not been connected yet. Add the deployed Worker URL in quiz-config.js.'); return; }
    fetch(api + '/quiz/' + encodeURIComponent(cfg.seed), {headers: headers()})
      .then(function (r) { return r.json().then(function (body) { if (!r.ok) throw new Error(body.error || 'Quiz could not be loaded'); return body; }); })
      .then(render).catch(function (e) { showError(e.message + '. Make sure the quiz Worker is running.'); });
  }
  form.addEventListener('change', updateProgress);
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    submit.disabled = true; submit.textContent = 'Grading…';
    var answers = {};
    form.querySelectorAll('input[type=radio]:checked').forEach(function (el) { answers[el.name] = el.value; });
    fetch(api + '/submit', {method:'POST', headers:headers(), body:JSON.stringify({seed:cfg.seed, answers:answers})})
      .then(function (r) { return r.json().then(function (body) { if (!r.ok) throw new Error(body.error || 'Submission failed'); return body; }); })
      .then(function (r) {
        var passed = r.passed === true;
        result.className = 'result show' + (passed ? '' : ' fail');
        result.innerHTML = '<p class="result-score">' + r.score + ' / ' + r.total + '</p><h2>' + (passed ? 'Quiz passed' : 'Keep practicing') + '</h2><p>' + (passed ? 'You reached the passing score. This module is complete.' : 'You need ' + r.passMark + ' correct answers to pass. Review your choices and try again.') + '</p><button type="button" class="secondary" id="quizRetake">Retake quiz</button>';
        result.scrollIntoView({behavior:'smooth',block:'center'});
        if (passed) {
          document.dispatchEvent(new CustomEvent('gg:quizcomplete', {detail:{itemId:'5-1',score:r.score,total:r.total}}));
          if (window.GGTraining && window.GGTraining.markPartComplete) window.GGTraining.markPartComplete('5-1');
        }
        document.getElementById('quizRetake').onclick = function () { form.reset(); result.className='result'; updateProgress(); window.scrollTo({top:0,behavior:'smooth'}); };
      }).catch(function (e) { showError(e.message); })
      .finally(function () { submit.textContent='Submit answers'; updateProgress(); });
  });
  load();
}());

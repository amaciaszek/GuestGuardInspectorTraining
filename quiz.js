/* =============================================================================
   GuestGuard Inspector Training — QUIZ COMPONENT
   =============================================================================
   A small, reusable knowledge-check component. It holds NO content of its own —
   questions live in quiz-data.js. Styling lives in quiz.css.

   Public API (window.GGQuiz):

     GGQuiz.gate(quiz, options)
       Shows the full-screen knowledge check as a GATE in front of navigation.
       - quiz: one quiz object → { passingScore, questions:[...] }  (from GG_QUIZZES)
       - options:
           chapter        {string}  Banner title (e.g. "Welcome & Company")
           context        {string}  Small line under the title (e.g. "Module 1 · Part 1")
           requireToPass  {bool}    true = must reach passingScore before continuing
           onPass         {fn(pct)} Called once when the learner passes
           onContinue     {fn()}    Called when the learner clicks "Continue"
           onExit         {fn()}    Called when the learner clicks "Back to video"

   The component is intentionally framework-free so it can be dropped into any
   page that already includes quiz.css.
============================================================================= */
(function () {
  'use strict';

  var LETTERS = 'ABCD';

  // Build (once) and return the overlay shell. Re-used across opens.
  function ensureOverlay() {
    var ov = document.getElementById('ggqOverlay');
    if (ov) return ov;
    ov = document.createElement('div');
    ov.className = 'ggq-overlay';
    ov.id = 'ggqOverlay';
    ov.innerHTML =
      '<div class="ggq">' +
        '<div class="ggq-banner">' +
          '<div class="ggq-badge">KNOWLEDGE CHECK</div>' +
          '<div style="flex:1">' +
            '<div class="ggq-banner-title" id="ggqTitle"></div>' +
            '<div class="ggq-banner-sub" id="ggqSub"></div>' +
          '</div>' +
          '<button class="ggq-retake" id="ggqExit" type="button" style="align-self:flex-start">\u2190 Back to video</button>' +
        '</div>' +
        '<div id="ggqContainer"></div>' +
        '<div class="ggq-sub-row">' +
          '<button class="ggq-btn" id="ggqSubmit" type="button" disabled>Submit Answers</button>' +
          '<span class="ggq-sub-note" id="ggqSubNote">Answer all questions to continue</span>' +
        '</div>' +
        '<div class="ggq-res" id="ggqRes">' +
          '<div class="ggq-res-top" id="ggqResTop">' +
            '<div class="ggq-res-pct" id="ggqResPct">\u2014</div>' +
            '<div class="ggq-res-info">' +
              '<div class="ggq-res-verdict" id="ggqResV"></div>' +
              '<div class="ggq-res-msg" id="ggqResMsg"></div>' +
              '<div class="ggq-res-bar-wrap">' +
                '<div class="ggq-res-track"><div class="ggq-res-fill" id="ggqResFill"></div></div>' +
                '<div class="ggq-res-thr" id="ggqResThr"></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="ggq-res-stats" id="ggqResStats"></div>' +
          '<div class="ggq-res-foot">' +
            '<button class="ggq-retake" id="ggqRetake" type="button">\u21ba Retake</button>' +
            '<button class="ggq-continue" id="ggqContinue" type="button" style="display:none">Continue \u2192</button>' +
            '<span class="ggq-res-fnote" id="ggqResFnote"></span>' +
          '</div>' +
        '</div>' +
        '<div class="ggq-missed" id="ggqMissed">' +
          '<div class="ggq-missed-hdr">MISSED QUESTIONS</div>' +
          '<div id="ggqMissedList"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);
    return ov;
  }

  // Render a quiz into the overlay and wire up all interaction.
  function gate(quiz, opts) {
    opts = opts || {};
    var requireToPass = opts.requireToPass !== false; // default: gated
    var passingScore  = (typeof quiz.passingScore === 'number') ? quiz.passingScore : 75;
    var questions     = quiz.questions || [];
    var requiredCorrect = Math.ceil(questions.length * passingScore / 100);
    var requiredLabel = requiredCorrect + ' of ' + questions.length;
    var hasPassed     = false;

    var ov = ensureOverlay();
    var $ = function (id) { return document.getElementById(id); };

    $('ggqTitle').textContent = opts.chapter || 'Knowledge Check';
    $('ggqSub').innerHTML = (opts.context ? opts.context + ' \u00b7 ' : '') +
      '<strong>' + questions.length + ' questions</strong> \u00b7 Passing score: <strong>' + requiredLabel + '</strong>';

    // Exit hatch — return to the video without navigating onward.
    $('ggqExit').onclick = function () {
      ov.classList.remove('show');
      document.documentElement.style.overflow = '';
      if (typeof opts.onExit === 'function') opts.onExit();
    };

    // Build the question cards fresh each time (also used by Retake).
    function build() {
      var ans = new Array(questions.length).fill(null);
      var submitted = false;

      // Randomize the display order of each question's options on every build,
      // so a Retake re-shuffles (the correct answer moves between A/B/C/D).
      // Button IDs stay keyed to the ORIGINAL option index, so grading is
      // unaffected; only the on-screen position and letter change.
      var order = questions.map(function (q) {
        var idx = q.options.map(function (_, i) { return i; });
        for (var i = idx.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var t = idx[i]; idx[i] = idx[j]; idx[j] = t;
        }
        return idx;
      });

      // Reset panels
      $('ggqRes').classList.remove('show');
      $('ggqResTop').classList.remove('pass', 'fail');
      $('ggqMissed').classList.remove('show');
      $('ggqMissedList').innerHTML = '';
      $('ggqContinue').style.display = 'none';
      var submitBtn = $('ggqSubmit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submit Answers';
      $('ggqSubNote').textContent = 'Answer all questions to continue';

      var qc = $('ggqContainer');
      qc.innerHTML = '';
      questions.forEach(function (q, qi) {
        var card = document.createElement('div');
        card.className = 'ggq-card';
        card.id = 'ggq-c-' + qi;
        card.innerHTML =
          '<div class="ggq-card-top">' +
            '<span class="ggq-card-num">Q' + (qi + 1) + '</span>' +
            '<span class="ggq-card-q">' + escapeHtml(q.text) + '</span>' +
          '</div>' +
          '<div class="ggq-opts">' +
            order[qi].map(function (oi, d) {
              return '<button type="button" class="ggq-opt" id="ggq-o-' + qi + '-' + oi + '" data-q="' + qi + '" data-o="' + oi + '">' +
                       '<span class="ggq-opt-l">' + LETTERS[d] + '</span>' +
                       '<span class="ggq-opt-t">' + escapeHtml(q.options[oi]) + '</span>' +
                     '</button>';
            }).join('') +
          '</div>' +
          '<div class="ggq-exp" id="ggq-exp-' + qi + '"></div>';
        qc.appendChild(card);
      });

      // Pick handler (delegated)
      qc.querySelectorAll('.ggq-opt').forEach(function (b) {
        b.addEventListener('click', function () {
          if (submitted) return;
          var qi = +b.getAttribute('data-q');
          var oi = +b.getAttribute('data-o');
          ans[qi] = oi;
          var n = questions[qi].options.length;
          for (var i = 0; i < n; i++) {
            var btn = $('ggq-o-' + qi + '-' + i);
            btn.classList.toggle('sel', i === oi);
          }
          var done = ans.filter(function (a) { return a !== null; }).length;
          if (done === questions.length) {
            submitBtn.disabled = false;
            $('ggqSubNote').textContent = 'All answered — ready to submit';
          }
        });
      });

      // Submit / grade
      submitBtn.onclick = function () {
        if (submitted) return;
        submitted = true;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitted';

        var correct = 0;
        var missed = [];
        questions.forEach(function (q, qi) {
          var ok = ans[qi] === q.correct;
          if (ok) correct++; else missed.push({ q: q, qi: qi, chosen: ans[qi] });
          $('ggq-o-' + qi + '-' + q.correct).classList.add('correct');
          if (!ok && ans[qi] !== null) $('ggq-o-' + qi + '-' + ans[qi]).classList.add('wrong');
          var ex = $('ggq-exp-' + qi);
          ex.className = 'ggq-exp ' + (ok ? 'ok' : 'bad');
          ex.innerHTML = '<em>' + (ok ? 'Correct.' : 'Incorrect.') + '</em> ' + escapeHtml(q.explanation || '');
          $('ggq-c-' + qi).classList.add(ok ? 'ok' : 'bad');
        });

        var pct  = Math.round(correct / questions.length * 100);
        var pass = pct >= passingScore;
        if (pass) hasPassed = true;

        var res = $('ggqRes'), top = $('ggqResTop');
        res.classList.add('show');
        top.classList.add(pass ? 'pass' : 'fail');
        $('ggqResPct').textContent = pct + '%';
        $('ggqResV').textContent = pass ? 'Passed' : 'Not Passed';
        $('ggqResMsg').innerHTML = pass
          ? 'Answered <strong>' + correct + ' of ' + questions.length + '</strong> correctly. Threshold met.'
          : 'Answered <strong>' + correct + ' of ' + questions.length + '</strong> correctly. <strong>' + requiredLabel + '</strong> required to continue.';
        setTimeout(function () { $('ggqResFill').style.width = pct + '%'; }, 60);
        $('ggqResThr').textContent = 'threshold ' + requiredCorrect + '/' + questions.length;
        $('ggqResStats').innerHTML =
          stat(correct, 'CORRECT', 'pass') +
          stat(questions.length - correct, 'WRONG', 'fail') +
          stat(questions.length, 'TOTAL', 'neu') +
          stat(requiredCorrect + '/' + questions.length, 'REQUIRED', 'neu');

        // Continue is offered when the learner may proceed.
        var mayContinue = pass || !requireToPass;
        if (mayContinue && typeof opts.onPass === 'function') opts.onPass(pct);
        if (mayContinue) {
          $('ggqContinue').style.display = '';
          $('ggqResFnote').textContent = pass ? 'Result recorded.' : 'Review below, then continue.';
        } else {
          $('ggqContinue').style.display = 'none';
          $('ggqResFnote').textContent = 'Review the missed questions and retake to continue.';
        }

        // Missed-questions review
        if (missed.length) {
          $('ggqMissed').classList.add('show');
          var ml = $('ggqMissedList');
          missed.forEach(function (m) {
            var d = document.createElement('div');
            d.className = 'ggq-miss-card';
            d.innerHTML =
              '<div class="ggq-miss-q">Q' + (m.qi + 1) + ': ' + escapeHtml(m.q.text) + '</div>' +
              '<div class="ggq-miss-row"><span class="lbl">YOUR ANSWER&nbsp;&nbsp;</span>' +
                '<span class="v-bad">' + (m.chosen !== null ? escapeHtml(m.q.options[m.chosen]) : '\u2014') + '</span></div>' +
              '<div class="ggq-miss-row"><span class="lbl">CORRECT&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>' +
                '<span class="v-ok">' + escapeHtml(m.q.options[m.q.correct]) + '</span></div>';
            ml.appendChild(d);
          });
        }

        var resEl = $('ggqRes');
        if (resEl.scrollIntoView) resEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
    }

    $('ggqRetake').onclick = build;
    $('ggqContinue').onclick = function () {
      if (typeof opts.onContinue === 'function') opts.onContinue();
    };

    build();
    ov.classList.add('show');
    ov.scrollTop = 0;
    document.documentElement.style.overflow = 'hidden'; // lock page scroll behind overlay
    return { hasPassed: function () { return hasPassed; } };
  }

  function stat(value, label, cls) {
    return '<div class="ggq-res-stat"><div class="ggq-stat-v ' + cls + '">' + value + '</div>' +
           '<div class="ggq-stat-l">' + label + '</div></div>';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  window.GGQuiz = { gate: gate };
})();

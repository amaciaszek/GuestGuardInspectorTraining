(function () {
  'use strict';

  const KEYS = {
    eligible: 'gg-tester-eligible-v1',
    enabled: 'gg-tester-enabled-v1',
    skip: 'gg-tester-skip-v1',
    unlock: 'gg-tester-unlock-v1'
  };
  const localProgressKey = 'gg-inspector-training-progress-v1';
  const params = new URLSearchParams(location.search);
  const localHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  const temporaryVisibleTesterControls = true;
  if (temporaryVisibleTesterControls || params.get('tester') === '1' || localHost) {
    sessionStorage.setItem(KEYS.eligible, '1');
    sessionStorage.setItem(KEYS.enabled, '1');
  }

  function flag(key) { return sessionStorage.getItem(key) === '1'; }
  function setFlag(key, value) {
    if (value) sessionStorage.setItem(key, '1');
    else sessionStorage.removeItem(key);
  }
  function eligible() { return flag(KEYS.eligible); }
  function enabled() { return eligible() && flag(KEYS.enabled); }
  function canSkipVideos() { return enabled() && flag(KEYS.skip); }
  function canUnlockNavigation() { return enabled() && flag(KEYS.unlock); }

  function addStyles() {
    if (document.getElementById('gg-tester-styles')) return;
    const style = document.createElement('style');
    style.id = 'gg-tester-styles';
    style.textContent = [
      '.gg-tester-badge{position:fixed;z-index:10020;right:12px;bottom:12px;padding:8px 11px;border:1px solid #56d6ca;border-radius:5px;background:#102c2b;color:#c9fffa;box-shadow:0 8px 24px rgba(0,0,0,.32);font:700 11px/1.25 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase}',
      '.gg-tester-toast{position:fixed;z-index:10030;left:50%;bottom:58px;transform:translateX(-50%);max-width:calc(100vw - 24px);padding:10px 14px;border:1px solid #56d6ca;border-radius:5px;background:#102c2b;color:#eafffd;box-shadow:0 10px 28px rgba(0,0,0,.35);font:600 13px/1.35 ui-monospace,SFMono-Regular,Consolas,monospace}',
      '.gg-tester-help{position:fixed;z-index:10040;inset:0;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.72)}',
      '.gg-tester-help[hidden]{display:none}.gg-tester-help-card{width:min(620px,100%);max-height:85vh;overflow:auto;padding:22px;border:1px solid #56d6ca;border-radius:7px;background:#10201f;color:#eff;font:14px/1.5 system-ui,sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.55)}',
      '.gg-tester-help h2{margin:0 0 8px;font-size:20px}.gg-tester-help p{margin:7px 0 14px;color:#bcd5d2}.gg-tester-help dl{display:grid;grid-template-columns:max-content 1fr;gap:8px 14px;margin:0}.gg-tester-help dt{font:700 12px ui-monospace,SFMono-Regular,Consolas,monospace;color:#75e6dc}.gg-tester-help dd{margin:0}.gg-tester-help button{margin-top:18px;padding:8px 12px;border:1px solid #56d6ca;background:#173b38;color:#fff;cursor:pointer}',
      '.gg-tester-controls{position:fixed;z-index:10025;left:14px;bottom:14px;display:flex;flex-wrap:wrap;gap:12px;padding:14px;border:2px solid #56d6ca;border-radius:10px;background:#10201f;box-shadow:0 14px 36px rgba(0,0,0,.45)}.gg-tester-controls button{min-height:54px;padding:12px 20px;border:2px solid #75e6dc;border-radius:8px;background:#173b38;color:#fff;font:800 14px/1.2 system-ui,sans-serif;cursor:pointer}.gg-tester-controls button:nth-child(2){border-color:#f59e0b;background:#451a03}.gg-tester-controls button:nth-child(3){border-color:#22c55e;background:#052e16}.gg-tester-controls button:disabled{opacity:.55;cursor:wait}',
      '@media(max-width:560px){.gg-tester-help dl{grid-template-columns:1fr}.gg-tester-help dd{margin:0 0 8px}.gg-tester-badge{right:8px;bottom:8px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function stateLabel() {
    const modes = [];
    if (canSkipVideos()) modes.push('SKIP');
    if (canUnlockNavigation()) modes.push('UNLOCK');
    return modes.length ? 'Tester: ' + modes.join(' + ') : 'Tester mode';
  }
  function renderBadge() {
    const old = document.getElementById('gg-tester-badge');
    if (!enabled()) { if (old) old.remove(); return; }
    addStyles();
    const badge = old || document.createElement('div');
    badge.id = 'gg-tester-badge';
    badge.className = 'gg-tester-badge';
    badge.setAttribute('role', 'status');
    badge.textContent = stateLabel();
    if (!old) document.body.appendChild(badge);
  }
  function toast(message) {
    addStyles();
    const old = document.getElementById('gg-tester-toast');
    if (old) old.remove();
    const node = document.createElement('div');
    node.id = 'gg-tester-toast';
    node.className = 'gg-tester-toast';
    node.setAttribute('role', 'status');
    node.textContent = message;
    document.body.appendChild(node);
    setTimeout(function () { node.remove(); }, 3200);
  }
  function showHelp() {
    if (!enabled()) return;
    addStyles();
    let panel = document.getElementById('gg-tester-help');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'gg-tester-help';
      panel.className = 'gg-tester-help';
      panel.innerHTML = '<section class="gg-tester-help-card" role="dialog" aria-modal="true" aria-labelledby="gg-tester-help-title">' +
        '<h2 id="gg-tester-help-title">Training tester shortcuts</h2>' +
        '<p>These flags last for this browser session only. Use a test account. Local reset does not erase portal or D1 records.</p>' +
        '<dl>' +
        '<dt>Ctrl+Alt+Shift+D</dt><dd>Turn tester mode on or off</dd>' +
        '<dt>Ctrl+Alt+Shift+S</dt><dd>Toggle unrestricted video seeking</dd>' +
        '<dt>Ctrl+Alt+Shift+U</dt><dd>Toggle chapter and exam navigation locks</dd>' +
        '<dt>Ctrl+Alt+Shift+R</dt><dd>Reset saved portal training progress after confirmation</dd>' +
        '<dt>Ctrl+Alt+Shift+H</dt><dd>Show or hide this shortcut card</dd>' +
        '</dl><button type="button" id="gg-tester-help-close">Close</button></section>';
      document.body.appendChild(panel);
      panel.querySelector('#gg-tester-help-close').addEventListener('click', function () { panel.hidden = true; });
      return;
    }
    panel.hidden = !panel.hidden;
  }
  async function resetTrainingProgress() {
    if (!enabled()) return;
    if (!window.GGTraining || !window.GGTraining.isAuthenticated || !window.GGTraining.isAuthenticated()) {
      toast('Cannot reset portal progress: re-enter training from the Inspector Portal first.');
      return;
    }
    if (!window.confirm('Reset this test user\u2019s saved inspector training progress in the portal? D1 exam attempts are reset separately.')) return;

    const controls = document.getElementById('gg-tester-controls');
    const buttons = controls ? controls.querySelectorAll('button') : [];
    buttons.forEach(function (button) { button.disabled = true; });

    const result = await window.GGTraining.resetTrainingProgress();
    if (!result.success) {
      const authMessage = result.status === 401
        ? 'Portal session rejected. Re-enter training from the Inspector Portal, then try again.'
        : 'Training reset failed: ' + result.error;
      toast(authMessage);
      buttons.forEach(function (button) { button.disabled = false; });
      return;
    }

    localStorage.removeItem(localProgressKey);
    document.dispatchEvent(new CustomEvent('gg:progressreset', { detail: { tester: true, portalConfirmed: true } }));
    toast('Portal and browser training progress reset. D1 exam records were not changed.');
    setTimeout(function () { location.reload(); }, 900);
  }
  async function resetExamProgress() {
    if (!enabled()) return;
    if (!window.confirm('Reset this test user’s D1 exam attempts and results? This cannot be undone.')) return;
    if (!window.GGTraining || !window.GGTraining.accessToken) {
      toast('Cannot reset exam: this browser is not authenticated. Re-enter from the portal.');
      return;
    }
    const controls = document.getElementById('gg-tester-controls');
    const buttons = controls ? controls.querySelectorAll('button') : [];
    buttons.forEach(function (button) { button.disabled = true; });
    try {
      const response = await fetch('https://guestguard-inspector-quiz-api.guestguard.workers.dev/tester/reset-exam', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + window.GGTraining.accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quizSeed: 'inspector-certification-v1' })
      });
      const data = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(data.error || ('HTTP ' + response.status));
      toast('Exam reset: ' + data.deletedAttempts + ' attempt(s) and ' + data.deletedResults + ' result(s) removed.');
      setTimeout(function () { location.href = 'module5'; }, 900);
    } catch (error) {
      toast('Exam reset failed: ' + error.message);
      buttons.forEach(function (button) { button.disabled = false; });
    }
  }
  async function completeAllButLastVideo() {
    if (!enabled()) return;
    if (!window.GGTraining || !window.GGTraining.isAuthenticated || !window.GGTraining.isAuthenticated()) {
      toast('Cannot save progress: re-enter training from the portal first.');
      return;
    }
    if (!window.confirm('Mark every required training video complete except the final Module 4 video?')) return;
    const controls = document.getElementById('gg-tester-controls');
    const buttons = controls ? controls.querySelectorAll('button') : [];
    buttons.forEach(function (button) { button.disabled = true; });
    const parts = ['1-1','1-2','1-3','2-1','2-2','2-3','2-4','2-5','4-1','4-2','4-3','4-4','4-5'];
    try {
      for (const partKey of parts) {
        const saved = await window.GGTraining.markPartComplete(partKey);
        if (!saved) throw new Error('progress save failed at ' + partKey);
      }
      toast('Progress saved. Only the final Module 4 video remains.');
      setTimeout(function () { location.href = 'module4?ch=6'; }, 900);
    } catch (error) {
      toast('Could not complete setup: ' + error.message);
      buttons.forEach(function (button) { button.disabled = false; });
    }
  }
  function renderControls() {
    const old = document.getElementById('gg-tester-controls');
    if (!enabled()) { if (old) old.remove(); return; }
    addStyles();
    if (old) return;
    const controls = document.createElement('section');
    controls.id = 'gg-tester-controls';
    controls.className = 'gg-tester-controls';
    controls.setAttribute('aria-label', 'Tester reset controls');
    controls.innerHTML = '<button type="button" id="gg-reset-training">RESET TRAINING PROGRESS</button>' +
      '<button type="button" id="gg-reset-exam">RESET EXAM ATTEMPTS (D1)</button>' +
      '<button type="button" id="gg-complete-videos">COMPLETE ALL EXCEPT LAST VIDEO</button>';
    document.body.appendChild(controls);
    controls.querySelector('#gg-reset-training').addEventListener('click', resetTrainingProgress);
    controls.querySelector('#gg-reset-exam').addEventListener('click', resetExamProgress);
    controls.querySelector('#gg-complete-videos').addEventListener('click', completeAllButLastVideo);
  }
  function toggleMaster() {
    if (!eligible()) return;
    const next = !enabled();
    setFlag(KEYS.enabled, next);
    if (!next) { setFlag(KEYS.skip, false); setFlag(KEYS.unlock, false); }
    renderBadge();
    renderControls();
    toast(next ? 'Tester mode enabled. Press Ctrl+Alt+Shift+H for shortcuts.' : 'Tester mode disabled.');
    document.dispatchEvent(new CustomEvent('gg:testermodechange', { detail: { enabled: next } }));
  }

  document.addEventListener('keydown', function (event) {
    if (!(event.ctrlKey && event.altKey && event.shiftKey) || event.repeat) return;
    const key = String(event.key || '').toLowerCase();
    if (key === 'd') { event.preventDefault(); toggleMaster(); return; }
    if (!enabled()) return;
    if (key === 's') {
      event.preventDefault(); setFlag(KEYS.skip, !canSkipVideos()); renderBadge();
      toast(canSkipVideos() ? 'Video seeking unlocked.' : 'Video seeking locked.');
    } else if (key === 'u') {
      event.preventDefault(); setFlag(KEYS.unlock, !canUnlockNavigation()); renderBadge();
      toast(canUnlockNavigation() ? 'Navigation locks bypassed for this session.' : 'Navigation locks restored.');
      document.dispatchEvent(new CustomEvent('gg:testermodechange', { detail: { enabled: true } }));
    } else if (key === 'r') {
      event.preventDefault(); resetTrainingProgress();
    } else if (key === 'h') {
      event.preventDefault(); showHelp();
    }
  });

  window.GGTester = { eligible, enabled, canSkipVideos, canUnlockNavigation, showHelp, resetTrainingProgress, resetExamProgress, completeAllButLastVideo };
  function renderTesterUi() { renderBadge(); renderControls(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderTesterUi);
  else renderTesterUi();
}());

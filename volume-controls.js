(function () {
  'use strict';

  var VOLUME_KEY = 'gg-training-volume';
  var MUTED_KEY = 'gg-training-muted';
  var lastAudibleVolume = 0.8;

  var iconOn = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6.5 9H3v6h3.5L11 19z"></path><path d="M15 9.5a4 4 0 0 1 0 5"></path><path d="M18 7a7 7 0 0 1 0 10"></path></svg>';
  var iconMuted = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6.5 9H3v6h3.5L11 19z"></path><path d="m16 10 5 5"></path><path d="m21 10-5 5"></path></svg>';

  function numberOr(value, fallback) {
    var parsed = Number(value);
    return isFinite(parsed) ? parsed : fallback;
  }

  function updateCaptionState(textElement) {
    var strip = textElement && textElement.closest('.vid-subs');
    if (!strip) return;
    var value = (textElement.textContent || '').trim();
    strip.classList.toggle('has-caption', !!value && value !== '—' && value !== '-');
  }

  document.querySelectorAll('.vid-subs-text').forEach(function (textElement) {
    updateCaptionState(textElement);
    new MutationObserver(function () { updateCaptionState(textElement); })
      .observe(textElement, { childList: true, characterData: true, subtree: true });
  });

  document.querySelectorAll('.vid-controls').forEach(function (controls) {
    if (controls.querySelector('.gg-volume-control')) return;

    var scope = controls.closest('.player-shell') || document;
    var audioVideo = scope.querySelector('#bodycamVideo') ||
                     scope.querySelector('#trainingVideo') ||
                     scope.querySelector('video:not([muted])');
    if (!audioVideo) return;

    var savedVolume = Math.max(0, Math.min(1, numberOr(localStorage.getItem(VOLUME_KEY), 0.8)));
    // Every video page starts audible. A mute choice applies only to the
    // current page and is not carried into the next training video.
    var savedMuted = false;
    localStorage.removeItem(MUTED_KEY);
    if (savedVolume > 0) lastAudibleVolume = savedVolume;
    audioVideo.volume = savedVolume;
    audioVideo.muted = savedMuted;

    var wrapper = document.createElement('div');
    wrapper.className = 'gg-volume-control';
    wrapper.setAttribute('role', 'group');
    wrapper.setAttribute('aria-label', 'Volume controls');

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'gg-volume-toggle';

    var slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'gg-volume-slider';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.01';
    slider.value = String(savedVolume);
    slider.setAttribute('aria-label', 'Video volume');

    wrapper.appendChild(toggle);
    wrapper.appendChild(slider);

    var synced = controls.querySelector('.vid-synced');
    if (synced) controls.insertBefore(wrapper, synced);
    else controls.appendChild(wrapper);

    function render() {
      var muted = audioVideo.muted || audioVideo.volume === 0;
      toggle.innerHTML = muted ? iconMuted : iconOn;
      toggle.setAttribute('aria-label', muted ? 'Unmute video' : 'Mute video');
      toggle.title = muted ? 'Unmute' : 'Mute';
      slider.value = String(audioVideo.volume);
      slider.setAttribute('aria-valuetext', Math.round(audioVideo.volume * 100) + ' percent');
    }

    toggle.addEventListener('click', function () {
      if (audioVideo.muted || audioVideo.volume === 0) {
        audioVideo.muted = false;
        if (audioVideo.volume === 0) audioVideo.volume = lastAudibleVolume || 0.8;
      } else {
        lastAudibleVolume = audioVideo.volume;
        audioVideo.muted = true;
      }
      localStorage.setItem(VOLUME_KEY, String(audioVideo.volume));
      render();
    });

    slider.addEventListener('input', function () {
      var value = Math.max(0, Math.min(1, Number(slider.value)));
      audioVideo.volume = value;
      audioVideo.muted = value === 0;
      if (value > 0) lastAudibleVolume = value;
      localStorage.setItem(VOLUME_KEY, String(value));
      render();
    });

    audioVideo.addEventListener('volumechange', render);
    render();
  });
}());

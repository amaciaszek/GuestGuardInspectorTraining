// GuestGuard Inspector Training — shared player engine (Modules 1 & 2)
// Per-module values come from window.GG_PLAYER, defined inline in each module before this file loads:
//   { vtt, subtitleDelay, calloutDelay, persistOffsets, callouts }

// Main Training App
(function(){
const VB=JSON.parse(document.getElementById('vbData').textContent);
let fakeT=0, maxWatched=0;
let dur=VB.videoDuration;
let currentGroupIdx = -1;
let isPlaying = false;
let isDragging = false;
let subsUnlocked = false;
const SUBTITLE_HOLD_SECONDS = 4;
let subtitleResetBoundary = 0;

const video = document.getElementById('trainingVideo');
const playBtn = document.getElementById('playBtn');
const vidBox = document.getElementById('vidBox');
const vidPlaceholder = document.getElementById('vidPlaceholder');
const scrubBar = document.getElementById('scrubBar');
const hoverOverlay = document.getElementById('hoverOverlay');
const hoverIcon = document.getElementById('hoverIcon');
const sectionTransition = document.getElementById('sectionTransition');
const transitionLabel = document.getElementById('transitionLabel');
const transitionTitle = document.getElementById('transitionTitle');
const videoCallout = document.getElementById('videoCallout');
const videoCalloutTitle = document.getElementById('videoCalloutTitle');
const videoCalloutList = document.getElementById('videoCalloutList');

// Added enhancement elements (present in the module HTML)
const bulSide = document.querySelector('.bul-side');
const vidLoading = document.getElementById('vidLoading');
const vidFadeBlack = document.getElementById('vidFadeBlack');
const vidEndcard = document.getElementById('vidEndcard');
const vidEndcardTitle = document.getElementById('vidEndcardTitle');
const vidEndcardNext = document.getElementById('vidEndcardNext');
const vidEndcardReplay = document.getElementById('vidEndcardReplay');
// Where the "next" button should send the viewer (set per-module before player.js loads).
const NEXT_TARGET = (typeof window !== 'undefined' && window.GG_NEXT) ? window.GG_NEXT : null;

// --- Loading spinner ------------------------------------------------------
// Reassures viewers on slow connections that real content is on the way,
// and shows how much has buffered so far.
function showSpinner() { if (vidLoading) vidLoading.classList.add('show'); }
function hideSpinner() { if (vidLoading) vidLoading.classList.remove('show'); }

// Best available duration: real metadata if present, else the known value from vbData.
function effectiveDuration() {
  if (Number.isFinite(video.duration) && video.duration > 0) return video.duration;
  return (Number.isFinite(dur) && dur > 0) ? dur : 0;
}
function bufferedEndSec() {
  try {
    if (!video.buffered || video.buffered.length === 0) return 0;
    let end = 0;
    for (let i = 0; i < video.buffered.length; i++) end = Math.max(end, video.buffered.end(i));
    return end;
  } catch (e) { return 0; }
}
function bufferedPercent() {
  const d = effectiveDuration();
  if (d <= 0) return null;
  const end = bufferedEndSec();
  if (end <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((end / d) * 100)));
}
function updateLoadingPercent() {
  if (!vidLoading) return;
  const textEl = vidLoading.querySelector('.vid-loading-text');
  if (!textEl) return;
  const p = bufferedPercent();
  textEl.textContent = (p == null) ? 'Loading video…' : ('Loading video… ' + p + '%');
}

// --- Load diagnostics (console) ------------------------------------------
// Set to false to silence. Logs why a clip is slow: file size, range support,
// when duration/metadata become known, and how fast the buffer fills.
const GG_LOAD_DEBUG = false;
const ggT0 = performance.now();
let ggHeadBytes = 0;
function ggElapsed() { return ((performance.now() - ggT0) / 1000).toFixed(2) + 's'; }
const NET = ['EMPTY', 'IDLE', 'LOADING', 'NO_SOURCE'];
const RDY = ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT', 'HAVE_FUTURE', 'HAVE_ENOUGH'];
function ggLog(tag) {
  if (!GG_LOAD_DEBUG) return;
  const end = bufferedEndSec();
  const pct = bufferedPercent();
  let extra = '';
  if (ggHeadBytes && effectiveDuration() > 0) {
    const totalMb = (ggHeadBytes / 1048576).toFixed(1);
    const dlMb = (ggHeadBytes * (end / effectiveDuration()) / 1048576).toFixed(1);
    extra = ` | ~${dlMb}/${totalMb}MB`;
  }
  console.log('[GG load ' + ggElapsed() + '] ' + tag +
    ' | net=' + NET[video.networkState] + ' ready=' + RDY[video.readyState] +
    ' realDur=' + (Number.isFinite(video.duration) ? video.duration.toFixed(1) : 'NaN') +
    ' vbDur=' + dur + ' buffered=' + end.toFixed(1) + 's' + (pct == null ? '' : ' (' + pct + '%)') +
    extra + ' | ' + (video.currentSrc || '').split('/').pop());
}
function ggDiagnose() {
  const url = video.currentSrc || (video.querySelector('source') && video.querySelector('source').src);
  if (!url) return;
  const mediaUrl = new URL(url, location.href);
  if (mediaUrl.origin !== location.origin) {
    console.log('[GG load] Cross-origin media is playing normally; skipping the optional HEAD size diagnostic.');
    return;
  }
  fetch(url, { method: 'HEAD' }).then(function (r) {
    const len = r.headers.get('content-length');
    if (len) ggHeadBytes = parseInt(len, 10);
    console.log('[GG load] HEAD ' + r.status +
      ' | size=' + (len ? (parseInt(len, 10) / 1048576).toFixed(1) + 'MB' : '?') +
      ' | accept-ranges=' + (r.headers.get('accept-ranges') || 'none') +
      ' | type=' + (r.headers.get('content-type') || '?') +
      ' | cache=' + (r.headers.get('cf-cache-status') || r.headers.get('age') || '?'));
    if (r.headers.get('accept-ranges') !== 'bytes') {
      console.warn('[GG load] Server is NOT advertising byte-range support — the browser may download the whole file before it can start. Re-encoding with "-movflags +faststart" and serving with Accept-Ranges is the fix.');
    }
  }).catch(function (e) {
    console.warn('[GG load] HEAD request failed (likely missing CORS headers on R2). The <video> still loads, but JS cannot read the byte size. Adding Access-Control-Allow-Origin to the bucket would enable byte-accurate progress.', e && e.message);
  });
}
['loadstart', 'durationchange', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'waiting', 'stalled', 'suspend', 'playing', 'error'].forEach(function (ev) {
  video.addEventListener(ev, function () { ggLog(ev); });
});
let ggProgN = 0;
video.addEventListener('progress', function () { if ((ggProgN++ % 3) === 0) ggLog('progress'); });
// Wait until the dynamically selected chapter source becomes current. Running
// this immediately can HEAD the static fallback source instead of ?ch=N.
if (GG_LOAD_DEBUG) video.addEventListener('loadedmetadata', ggDiagnose, { once: true });

// --- Prefetch the remaining clips, in order, once the current one is ready -
// window.GG_PREFETCH is set per-module (the remaining parts' video URLs).
let ggPrefetchStarted = false;
function ggPrefetchNext() {
  if (ggPrefetchStarted) return;
  ggPrefetchStarted = true;
  const list = (typeof window !== 'undefined' && Array.isArray(window.GG_PREFETCH)) ? window.GG_PREFETCH : [];
  if (!list.length) { if (GG_LOAD_DEBUG) console.log('[GG prefetch] nothing queued'); return; }
  let i = 0;
  function step() {
    if (i >= list.length) { if (GG_LOAD_DEBUG) console.log('[GG prefetch ' + ggElapsed() + '] all queued clips cached'); return; }
    const url = list[i]; const idx = i; i++;
    if (GG_LOAD_DEBUG) console.log('[GG prefetch ' + ggElapsed() + '] start (' + (idx + 1) + '/' + list.length + ') ' + url.split('/').pop());
    const link = document.createElement('link');
    link.rel = 'prefetch'; link.as = 'video'; link.href = url;
    let advanced = false;
    const go = function () { if (advanced) return; advanced = true; step(); };
    link.addEventListener('load', function () { if (GG_LOAD_DEBUG) console.log('[GG prefetch ' + ggElapsed() + '] cached (' + (idx + 1) + '/' + list.length + ')'); go(); });
    link.addEventListener('error', function () { if (GG_LOAD_DEBUG) console.warn('[GG prefetch] error (' + (idx + 1) + '/' + list.length + ') ' + url); go(); });
    document.head.appendChild(link);
    setTimeout(go, 45000); // failsafe so a silent prefetch never stalls the chain
  }
  step();
}

// Resolve once the clip has buffered enough to play through without stalling.
// Falls back after a timeout so a flaky connection never hangs the player.
function whenReadyToPlay(cb) {
  if (video.readyState >= 4) { updateLoadingPercent(); cb(); return; }
  let done = false;
  function finish() {
    if (done) return;
    done = true;
    video.removeEventListener('canplaythrough', finish);
    video.removeEventListener('progress', onProg);
    clearTimeout(failsafe);
    cb();
  }
  function onProg() { updateLoadingPercent(); }
  video.addEventListener('canplaythrough', finish);
  video.addEventListener('progress', onProg);
  const failsafe = setTimeout(finish, 15000);
}

// Fade only after the final spoken caption has finished. The old fixed
// two-second fade could begin while the presenter was still talking.
const END_FADE_MAX_SECONDS = 0.75;
const END_FADE_AFTER_CAPTION_SECONDS = 0.12;

function getEndFadeOpacity(t, d) {
  if (!Number.isFinite(t) || !Number.isFinite(d) || d <= 0 || t < 0 || t > d) {
    return 0;
  }

  const fallbackStart = Math.max(0, d - END_FADE_MAX_SECONDS);
  const lastCue = subtitles.length > 0 ? subtitles[subtitles.length - 1] : null;
  const captionSafeStart = lastCue && Number.isFinite(lastCue.end)
    ? lastCue.end + SUBTITLE_SYNC_DELAY + MASTER_TIMING_OFFSET + END_FADE_AFTER_CAPTION_SECONDS
    : fallbackStart;
  const fadeStart = Math.min(d, Math.max(fallbackStart, captionSafeStart));
  const fadeDuration = d - fadeStart;

  if (t < fadeStart) return 0;
  if (fadeDuration <= 0) return 1;
  return Math.min(1, Math.max(0, (t - fadeStart) / fadeDuration));
}

// Smooth the fade per frame so it does not depend on timeupdate frequency.
let fadeRAF = null;
function fadeFrame() {
  if (vidFadeBlack && video.style.display !== 'none') {
    const d = (Number.isFinite(video.duration) && video.duration > 0) ? video.duration : dur;
    if (Number.isFinite(d) && d > 0) {
      vidFadeBlack.style.opacity = String(getEndFadeOpacity(video.currentTime, d));
    }
    checkUpcomingTitleCardBoundary(video.currentTime);
  }
  fadeRAF = requestAnimationFrame(fadeFrame);
}
function startFadeLoop() { if (fadeRAF == null) fadeRAF = requestAnimationFrame(fadeFrame); }
function stopFadeLoop() { if (fadeRAF != null) { cancelAnimationFrame(fadeRAF); fadeRAF = null; } }

// First-play readiness gate: buffer (with spinner + %) before the intro card.
let prepared = false;
let preparing = false;
function beginPlayback() {
  if (prepared) { if (video.paused) video.play(); return; }
  if (preparing) return;
  preparing = true;
  vidPlaceholder.style.display = 'none';
  video.style.display = 'block';
  playBtn.textContent = '❚❚';
  showSpinner();
  updateLoadingPercent();
  whenReadyToPlay(() => {
    preparing = false;
    prepared = true;
    hideSpinner();
    const p = video.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => { playBtn.textContent = '▶'; isPlaying = false; updateHoverIcon(); });
    }
  });
}

// Block Picture-in-Picture, casting, and the right-click "save/PiP" menu.
function lockDownMedia() {
  try { video.disablePictureInPicture = true; } catch (e) {}
  video.addEventListener('enterpictureinpicture', () => {
    try { if (document.pictureInPictureElement) document.exitPictureInPicture(); } catch (e) {}
  });
  video.addEventListener('contextmenu', (e) => e.preventDefault());
}
lockDownMedia();

// --- Attention glow on the takeaways sidebar ------------------------------
let attentionTimer = null;
function flashHighlights(persist) {
  if (!bulSide) return;
  if (attentionTimer) { clearTimeout(attentionTimer); attentionTimer = null; }
  bulSide.classList.add('attention');
  if (!persist) {
    attentionTimer = setTimeout(() => { bulSide.classList.remove('attention'); attentionTimer = null; }, 5200);
  }
}
function clearHighlights() {
  if (attentionTimer) { clearTimeout(attentionTimer); attentionTimer = null; }
  if (bulSide) bulSide.classList.remove('attention');
}

// --- Fade-to-black at clip end --------------------------------------------
// Ramps a black overlay over the final 2 seconds so the frozen last frame
// (a held shot of the presenter) is never shown — just black.
function applyEndFade(t) {
  if (!vidFadeBlack) return;
  if (video.style.display === 'none') { vidFadeBlack.style.opacity = '0'; return; }
  const d = (Number.isFinite(video.duration) && video.duration > 0) ? video.duration : dur;
  if (!Number.isFinite(d) || d <= 0) return;
  vidFadeBlack.style.opacity = String(getEndFadeOpacity(t, d));
}

// --- End-of-clip "Up Next" card -------------------------------------------
function showEndcard() {
  if (!vidEndcard) return;
  const label = document.getElementById('vidEndcardLabel');
  if (NEXT_TARGET && NEXT_TARGET.title) {
    if (label) label.textContent = NEXT_TARGET.kind === 'module' ? 'Up Next — New Module' : 'Up Next';
    if (vidEndcardTitle) vidEndcardTitle.textContent = NEXT_TARGET.title;
    if (vidEndcardNext) vidEndcardNext.textContent = 'Continue →';
  } else {
    if (label) label.textContent = 'Module Complete';
    if (vidEndcardTitle) vidEndcardTitle.textContent = "You've finished this module.";
    if (vidEndcardNext) vidEndcardNext.textContent = 'Back to Modules';
  }
  vidEndcard.classList.add('show');
}
function hideEndcard() {
  if (vidEndcard) vidEndcard.classList.remove('show');
}
function navigateNext() {
  // Knowledge-check gate: if the page defines window.GG_QUIZ_GATE and it returns
  // false, a between-chapter quiz still needs to be passed. The quiz layer shows
  // itself and, once the learner passes, calls window.GG_navigateNext() again —
  // at which point the gate returns true and we fall through to the navigation
  // below. If no gate is defined, this is a no-op and behaviour is unchanged.
  if (typeof window.GG_QUIZ_GATE === 'function' && !window.GG_QUIZ_GATE()) return;

  if (NEXT_TARGET && NEXT_TARGET.hash) {
    location.hash = NEXT_TARGET.hash;
    location.reload();
  } else if (NEXT_TARGET && NEXT_TARGET.href) {
    location.href = NEXT_TARGET.href;
  } else {
    location.href = 'index.html';
  }
}
// Exposed so the quiz layer can resume navigation after a passing score.
window.GG_navigateNext = navigateNext;
function replayClip() {
  hideEndcard();
  clearHighlights();
  if (vidFadeBlack) vidFadeBlack.style.opacity = '0';
  lastShownSectionIdx = -1;
  currentGroupIdx = -1;
  currentCalloutIdx = -1;
  subtitleResetBoundary = 0;
  isSeeking = true;
  video.currentTime = 0;
  maxWatched = 0;
  onT(0);
  const p = video.play();
  if (p && typeof p.catch === 'function') p.catch(() => {});
  setTimeout(() => { isSeeking = false; }, 400);
}

// --- Shared play/pause toggle (used by button, video click, and spacebar) ---
function togglePlay() {
  // Before first play, title-card-active only hides lists that would otherwise
  // flash behind the armed opening card. It is not an active/self-advancing card
  // yet, so the first click must still be allowed to start the video.
  if (document.body.classList.contains('title-card-active') && !introCardArmed) return;
  if (video.ended) { replayClip(); return; }
  if (!prepared) { beginPlayback(); return; }
  if (video.paused) { video.play(); playBtn.textContent = '❚❚'; }
  else { video.pause(); playBtn.textContent = '▶'; }
  updateHoverIcon();
}

// Timed overlays for narration moments where the script lists numbered items.
// These are intentionally short and left-weighted so they support the narration without covering the room view.
const TITLE_CARD_CALLOUT_PREROLL = 3;
function normalizeCalloutsForTitleCards(callouts) {
  return callouts.map(callout => {
    const adjusted = {
      ...callout,
      itemStarts: Array.isArray(callout.itemStarts) ? [...callout.itemStarts] : callout.itemStarts,
      items: Array.isArray(callout.items) ? [...callout.items] : callout.items
    };

    for (let groupIndex = 1; groupIndex < VB.groups.length; groupIndex++) {
      const cardTime = VB.groups[groupIndex].triggerTime;
      if (adjusted.start >= cardTime || adjusted.end < cardTime) continue;

      const startsRightBeforeCard = (cardTime - adjusted.start) <= TITLE_CARD_CALLOUT_PREROLL;
      if (startsRightBeforeCard && adjusted.end > cardTime) {
        // This belongs to the new section: defer the heading and list together.
        adjusted.start = cardTime;
      } else {
        // This belongs to the prior section: never let it reappear after the card.
        adjusted.end = Math.max(adjusted.start, cardTime - 0.01);
      }
    }
    return adjusted;
  });
}
let CALLOUTS = normalizeCalloutsForTitleCards(GG_PLAYER.callouts);
let currentCalloutIdx = -1;
// Descript's external VTT timestamps match the subtitle track embedded in the MP4
// exactly, so captions start from a neutral baseline. The Timing Lab remains
// available for deliberate per-browser experiments.
// Set either flag to true to bring its testing controls back.
const SHOW_SYNC_TOOLS = false;
const SHOW_TIMING_LAB = false;
const SUBTITLE_DEFAULT = 0;
const CALLOUT_DEFAULT = (GG_PLAYER.calloutDelay ?? 0);
// The old independent offsets are intentionally fixed at their chapter defaults.
// The Timing Lab below supplies the single reload-persistent experiment offset.
let SUBTITLE_SYNC_DELAY = SUBTITLE_DEFAULT;
let CALLOUT_SYNC_DELAY = CALLOUT_DEFAULT;
const MASTER_TIMING_STORAGE_KEY = 'gg-training-master-timing-offset-v2';
const MASTER_TIMING_MIN = -10;
const MASTER_TIMING_MAX = 10;

function clampMasterTimingOffset(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(MASTER_TIMING_MIN, Math.min(MASTER_TIMING_MAX, numeric));
}

function readMasterTimingOffset() {
  try {
    return clampMasterTimingOffset(localStorage.getItem(MASTER_TIMING_STORAGE_KEY) ?? 0);
  } catch (error) {
    return 0;
  }
}

function saveMasterTimingOffset(value) {
  const offset = clampMasterTimingOffset(value);
  try {
    localStorage.setItem(MASTER_TIMING_STORAGE_KEY, String(offset));
  } catch (error) {}
  return offset;
}

// A hidden Timing Lab must not leave an old experimental browser offset active.
let MASTER_TIMING_OFFSET = SHOW_TIMING_LAB ? readMasterTimingOffset() : 0;

function formatMasterTimingOffset(value) {
  const normalized = Math.abs(value) < 0.0001 ? 0 : value;
  return `${normalized >= 0 ? '+' : ''}${normalized.toFixed(2)}s`;
}

function initTimingLab() {
  const lab = document.createElement('aside');
  lab.className = 'timing-lab';
  lab.setAttribute('aria-label', 'Training timing controls');
  lab.innerHTML = `
    <button class="timing-lab-toggle" type="button" aria-expanded="false">
      <span class="timing-lab-toggle-label">Timing</span>
      <strong class="timing-lab-current">${formatMasterTimingOffset(MASTER_TIMING_OFFSET)}</strong>
    </button>
    <div class="timing-lab-panel" hidden>
      <div class="timing-lab-heading">
        <span>Timing Lab</span>
        <button class="timing-lab-close" type="button" aria-label="Minimize timing controls">×</button>
      </div>
      <p>Moves subtitles, title cards, callouts, and takeaway bullets together.</p>
      <label for="timingLabOffset">Master offset in seconds</label>
      <div class="timing-lab-input-row">
        <button type="button" data-timing-delta="-0.25">−.25</button>
        <button type="button" data-timing-delta="-0.05">−.05</button>
        <input id="timingLabOffset" type="number" min="-10" max="10" step="0.05"
               value="${MASTER_TIMING_OFFSET.toFixed(2)}" inputmode="decimal">
        <button type="button" data-timing-delta="0.05">+.05</button>
        <button type="button" data-timing-delta="0.25">+.25</button>
      </div>
      <div class="timing-lab-hint">
        <span><b>+</b> UI appears later</span>
        <span><b>−</b> UI appears earlier</span>
      </div>
      <div class="timing-lab-actions">
        <button class="timing-lab-reset" type="button">Reset</button>
        <button class="timing-lab-apply" type="button">Apply & Reload</button>
      </div>
    </div>
  `;
  document.body.appendChild(lab);

  const toggle = lab.querySelector('.timing-lab-toggle');
  const panel = lab.querySelector('.timing-lab-panel');
  const close = lab.querySelector('.timing-lab-close');
  const input = lab.querySelector('#timingLabOffset');

  function setOpen(open) {
    lab.classList.toggle('open', open);
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) input.focus();
  }

  function updateDraft(value) {
    input.value = clampMasterTimingOffset(value).toFixed(2);
  }

  toggle.addEventListener('click', () => setOpen(!lab.classList.contains('open')));
  close.addEventListener('click', () => setOpen(false));
  lab.querySelectorAll('[data-timing-delta]').forEach(button => {
    button.addEventListener('click', () => {
      updateDraft((Number(input.value) || 0) + Number(button.dataset.timingDelta));
    });
  });
  lab.querySelector('.timing-lab-apply').addEventListener('click', () => {
    MASTER_TIMING_OFFSET = saveMasterTimingOffset(input.value);
    window.location.reload();
  });
  lab.querySelector('.timing-lab-reset').addEventListener('click', () => {
    MASTER_TIMING_OFFSET = saveMasterTimingOffset(0);
    window.location.reload();
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      MASTER_TIMING_OFFSET = saveMasterTimingOffset(input.value);
      window.location.reload();
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  });
}

function initSyncTestingControls() {
  const panel = document.querySelector('.sync-tools');
  if (!SHOW_SYNC_TOOLS && panel) {
    panel.style.display = 'none';
  }
  const subInput = document.getElementById('subtitleOffsetInput');
  const callInput = document.getElementById('calloutOffsetInput');
  const applyBtn = document.getElementById('applySyncBtn');
  if (!SHOW_SYNC_TOOLS || !subInput || !callInput || !applyBtn) return;

  subInput.value = SUBTITLE_SYNC_DELAY.toFixed(2);
  callInput.value = CALLOUT_SYNC_DELAY.toFixed(2);

  applyBtn.addEventListener('click', () => {
    SUBTITLE_SYNC_DELAY = Number(subInput.value) || 0;
    CALLOUT_SYNC_DELAY = Number(callInput.value) || 0;
    localStorage.setItem('gg-subtitle-offset', String(SUBTITLE_SYNC_DELAY));
    localStorage.setItem('gg-callout-offset', String(CALLOUT_SYNC_DELAY));

    // Restart cleanly so the timing change is easy to judge from the beginning.
    currentCalloutIdx = -1;
    currentGroupIdx = -1;
    lastShownSectionIdx = -1;
    cancelSectionTransition();
    videoCallout.classList.remove('show');
    video.currentTime = 0;
    maxWatched = 0;
    onT(0);
    video.play();
  });
}

initSyncTestingControls();
if (SHOW_TIMING_LAB) initTimingLab();


let lastShownSectionIdx = -1;
let transitionTimeout = null;
let transitionRevealTimeout = null;
let transitionCycle = 0;
let isSeeking = false;

// Disable right-click on video
video.addEventListener('contextmenu', e => e.preventDefault());

// Disable Picture-in-Picture across browsers.
// The attribute covers Chrome/Edge; these handle Safari/iOS and any stray PiP requests.
video.disablePictureInPicture = true;
video.setAttribute('disablePictureInPicture', '');
video.addEventListener('enterpictureinpicture', () => {
  if (document.pictureInPictureElement && document.exitPictureInPicture) {
    document.exitPictureInPicture().catch(() => {});
  }
});
if ('webkitSetPresentationMode' in video) {
  // Safari: block the inline -> picture-in-picture transition.
  video.addEventListener('webkitpresentationmodechanged', () => {
    if (video.webkitPresentationMode === 'picture-in-picture') {
      try { video.webkitSetPresentationMode('inline'); } catch (e) {}
    }
  });
}

// NEW: Pause when tab is hidden (Page Visibility API)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && !video.paused) {
    video.pause();
  }
});

// NEW: Update hover icon based on play state
function updateHoverIcon() {
  if (video.paused) {
    hoverIcon.textContent = '▶';
  } else {
    hoverIcon.textContent = '❚❚';
  }
}

// Brief playback feedback. The icon fades even if the pointer remains over
// the video, so it confirms the action without covering the lesson.
let hoverCueTimer = null;
function showHoverCue() {
  if (!hoverOverlay || video.style.display === 'none') return;
  updateHoverIcon();
  hoverOverlay.classList.add('show');
  clearTimeout(hoverCueTimer);
  hoverCueTimer = setTimeout(() => hoverOverlay.classList.remove('show'), 700);
}
vidBox.addEventListener('mouseenter', showHoverCue);

// NEW: Show section transition overlay

function clearBulletsAndListsForTitleCard() {
  // Clear/disable all list-style overlays before the title card appears.
  // The new section's key takeaways are rendered behind the title card and revealed after it fades.
  document.body.classList.add('title-card-active');
  // A title card is a hard caption boundary. Text spoken before this point may
  // never be restored after the card, even though short gaps normally retain
  // the preceding subtitle.
  subtitleResetBoundary = Math.max(0, video.currentTime - MASTER_TIMING_OFFSET);
  const subsEl = document.getElementById('subsText');
  if (subsEl) subsEl.textContent = '—';
  currentCalloutIdx = -1;
  videoCallout.classList.remove('show');
  videoCallout.setAttribute('aria-hidden', 'true');
  videoCalloutTitle.textContent = '';
  videoCalloutList.innerHTML = '';
}

function restoreBulletsAndListsAfterTitleCard() {
  document.body.classList.remove('title-card-active');
}

function titleCardFadeDurationMs() {
  const styles = getComputedStyle(sectionTransition);
  const durations = styles.transitionDuration.split(',').map(value => {
    const trimmed = value.trim();
    return trimmed.endsWith('ms') ? parseFloat(trimmed) : parseFloat(trimmed) * 1000;
  });
  const delays = styles.transitionDelay.split(',').map(value => {
    const trimmed = value.trim();
    return trimmed.endsWith('ms') ? parseFloat(trimmed) : parseFloat(trimmed) * 1000;
  });
  return durations.reduce((max, duration, index) => {
    const delay = delays[index] ?? delays[delays.length - 1] ?? 0;
    return Math.max(max, duration + delay);
  }, 0);
}

function revealListsOnlyAfterTitleCard(cycle, onRevealed) {
  if (transitionRevealTimeout) clearTimeout(transitionRevealTimeout);
  // Hard rule: keep every list, list title, and callout hidden until the
  // transition overlay reaches zero opacity, not merely when fade-out starts.
  transitionRevealTimeout = setTimeout(() => {
    if (cycle !== transitionCycle) return;
    transitionRevealTimeout = null;
    restoreBulletsAndListsAfterTitleCard();
    if (video.currentTime > 0.4) subsUnlocked = true;
    onT(video.currentTime);
    if (typeof onRevealed === 'function') onRevealed();
  }, Math.ceil(titleCardFadeDurationMs()) + 50);
}

function cancelSectionTransition() {
  if (transitionTimeout) {
    clearTimeout(transitionTimeout);
    transitionTimeout = null;
  }
  if (transitionRevealTimeout) {
    clearTimeout(transitionRevealTimeout);
    transitionRevealTimeout = null;
  }
  const cycle = ++transitionCycle;
  sectionTransition.classList.remove('show');
  if (document.body.classList.contains('title-card-active')) {
    revealListsOnlyAfterTitleCard(cycle);
  }
}

function showSectionTransition(sectionName, sectionLabel) {
  // Clear every phase of a previous card before starting a new card cycle.
  if (transitionTimeout) {
    clearTimeout(transitionTimeout);
  }
  if (transitionRevealTimeout) {
    clearTimeout(transitionRevealTimeout);
  }
  const cycle = ++transitionCycle;
  
  // Mark the title-card state BEFORE pausing so the pause handler knows this is
  // an automatic, self-resuming pause and keeps the "playing" (❚❚) icon.
  clearBulletsAndListsForTitleCard();

  // Pause the video
  const wasPlaying = !video.paused;
  if (wasPlaying) {
    video.pause();
  }

  // Update text
  transitionLabel.textContent = sectionLabel;
  transitionTitle.textContent = sectionName;
  
  // Show overlay
  sectionTransition.classList.add('show');
  
  // Begin fading after 4.5 seconds. Lists remain locked for the entire fade.
  transitionTimeout = setTimeout(() => {
    if (cycle !== transitionCycle) return;
    transitionTimeout = null;
    sectionTransition.classList.remove('show');
    revealListsOnlyAfterTitleCard(cycle, () => {
      // Draw the eye only after the title card is completely gone.
      flashHighlights(false);
    
    // Resume playback if it was playing before (but not while the tab is hidden)
    if (wasPlaying) {
      setTimeout(() => {
        if (document.hidden) { playBtn.textContent = '▶'; updateHoverIcon(); return; }
        const p = video.play();
        if (p && typeof p.catch === 'function') {
          // If the resume is interrupted, retry once the browser can play again.
          p.catch(() => {
            const retry = () => { video.play().catch(() => {}); };
            video.addEventListener('canplay', retry, { once: true });
          });
        }
      }, 300); // Small delay after overlay fades out
    }
    });
  }, 4500);
}

// NEW: Render timeline markers for section changes
function renderTimelineMarkers() {
  // Remove any existing markers
  const existingMarkers = scrubBar.querySelectorAll('.scrub-marker');
  existingMarkers.forEach(m => m.remove());
  
  // Add marker for each section
  VB.groups.forEach((group, idx) => {
    if (idx === 0) return; // Skip first section (no marker at start)
    
    const marker = document.createElement('div');
    marker.className = 'scrub-marker';
    const markerTime = Math.max(0, Math.min(dur,
      (group.actualStartTime ?? group.triggerTime) + MASTER_TIMING_OFFSET
    ));
    const pct = (markerTime / dur) * 100;
    marker.style.left = `${pct}%`;
    
    // Insert before scrub-fill so it's behind the progress
    scrubBar.insertBefore(marker, scrubBar.firstChild);
  });
}

// Subtitles are loaded from the current VTT file at runtime.
// Load subtitles from the hosted VTT file. Using HTTPS avoids browser file:// CORS restrictions.
const VTT_SRC = GG_PLAYER.vtt;
let subtitles = [];

async function loadSubtitlesFromVTT() {
  const subsEl = document.getElementById('subsText');
  try {
    const response = await fetch(VTT_SRC, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const vttText = await response.text();
    subtitles = parseVTT(vttText);
    if (subtitles.length === 0) throw new Error('No cues parsed from VTT');
    alignTitleCardTriggersToCaptionPauses();
    updateSubtitles(video.currentTime || 0);
  } catch (err) {
    console.warn(`Could not load ${VTT_SRC}:`, err);
    // Fallback for browsers that expose the <track> cues even when fetch is blocked,
    // such as some local file:// previews.
    const trackEl = document.getElementById('captionTrack');
    const textTrack = trackEl && trackEl.track;
    if (textTrack) {
      textTrack.mode = 'hidden';
      setTimeout(() => {
        const cues = Array.from(textTrack.cues || []);
        subtitles = cues.map(cue => ({
          start: cue.startTime,
          end: cue.endTime,
          text: cue.text.replace(/\n/g, ' ')
        }));
        if (subtitles.length > 0) {
          alignTitleCardTriggersToCaptionPauses();
          updateSubtitles(video.currentTime || 0);
        }
        else subsEl.textContent = 'Could not load subtitles from hosted VTT';
      }, 300);
    } else {
      subsEl.textContent = 'Could not load subtitles from hosted VTT';
    }
  }
}

loadSubtitlesFromVTT();

// Parse the active VTT file, preserving two-line cards for the custom subtitle display.
function parseVTT(vttText) {
  const lines = vttText.split('\n');
  const blocks = [];
  let currentBlock = [];
  
  for(let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip WEBVTT header and empty lines at start
    if(line === 'WEBVTT' || (line === '' && currentBlock.length === 0)) {
      continue;
    }
    
    // Empty line means end of block
    if(line === '') {
      if(currentBlock.length > 0) {
        blocks.push(currentBlock.join('\n'));
        currentBlock = [];
      }
      continue;
    }
    
    currentBlock.push(line);
  }
  
  // Don't forget the last block
  if(currentBlock.length > 0) {
    blocks.push(currentBlock.join('\n'));
  }
  
  return blocks.map(block => {
    const lines = block.split('\n');
    
    // Find the timestamp line (skip cue identifiers if present)
    let timeLineIdx = 0;
    for(let i = 0; i < lines.length; i++) {
      if(lines[i].includes('-->')) {
        timeLineIdx = i;
        break;
      }
    }
    
    if(timeLineIdx === 0 && !lines[0].includes('-->')) return null;
    
    const timeLine = lines[timeLineIdx];
    const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
    
    if(!timeMatch) return null;
    
    const startTime = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000;
    const endTime = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000;
    const text = lines.slice(timeLineIdx + 1).join('\n');
    
    return { start: startTime, end: endTime, text: text };
  }).filter(s => s !== null);
}

// Each title card is tied to the first spoken caption of its section instead of
// to a brittle timestamp. This prevents a new subject from beginning before its
// title and also fixes several historical timestamps that pointed at the wrong
// subject entirely. The card is armed just before the anchor caption, after the
// preceding caption has finished.
const TITLE_CARD_LEAD_SECONDS = 0.35;
const TITLE_CARD_SECTION_ANCHORS = {
  '1-1': [
    null,
    'this training is split into four sections',
    'next, let me tell you a little bit about who we are',
    'the short-term rental market has grown enormously',
    "let's start with the people who ultimately benefit",
    "what's different between regular home inspections"
  ],
  '1-2': [
    null,
    'first, the quality of experience'
  ],
  '1-3': [
    null,
    'photography is an important part of your documentation',
    'when an issue at a property is found',
    "let's also talk quickly about timing and job expectations",
    "let's quickly discuss logistics and how you get on-site",
    'one of the things that the corporate team looks for',
    "let's talk about what comes next"
  ],
  '2-1': [
    null,
    "let's start outside",
    'regarding outdoor features'
  ],
  '2-2': [
    null,
    "next, we'll move from the basement or maintenance room to the kitchen"
  ],
  '2-3': [
    null,
    'for accessibility within the bathroom',
    "now we're going from the bathroom to the hallway"
  ],
  '2-4': [
    null,
    'next is accessibility within the bedroom'
  ],
  '2-5': [
    null,
    'the overall section wraps up the inspection',
    'for cleanliness, is there a non-smoking policy'
  ]
};

function titleCardPartKey() {
  const source = String(GG_PLAYER.vtt || '');
  const match = source.match(/module(\d+)_part(\d+)/i);
  return match ? `${match[1]}-${match[2]}` : '';
}

function normalizedCaptionText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCardTimeBeforeCue(cueIndex) {
  const cue = subtitles[cueIndex];
  if (!cue) return null;
  const previousCue = cueIndex > 0 ? subtitles[cueIndex - 1] : null;
  const preferredTime = cue.start - TITLE_CARD_LEAD_SECONDS;
  return Math.max(0, previousCue ? Math.max(previousCue.end, preferredTime) : preferredTime);
}

function alignTitleCardTriggersToCaptionPauses() {
  if (!Array.isArray(subtitles) || subtitles.length === 0) return;

  const anchors = TITLE_CARD_SECTION_ANCHORS[titleCardPartKey()] || [];
  const adjustments = [];
  for (let groupIndex = 1; groupIndex < VB.groups.length; groupIndex++) {
    const group = VB.groups[groupIndex];
    if (!Number.isFinite(group.configuredTriggerTime)) {
      group.configuredTriggerTime = group.triggerTime;
    }

    const configuredTime = group.configuredTriggerTime;
    group.triggerTime = configuredTime;
    const anchor = normalizedCaptionText(anchors[groupIndex]);
    const anchorCueIndex = anchor
      ? subtitles.findIndex(cue => normalizedCaptionText(cue.text).includes(anchor))
      : -1;

    if (anchorCueIndex >= 0) {
      const anchorCue = subtitles[anchorCueIndex];
      const safeTime = titleCardTimeBeforeCue(anchorCueIndex);
      group.triggerTime = safeTime;
      group.actualStartTime = anchorCue.start;
      adjustments.push({
        section: group.name,
        anchor: anchors[groupIndex],
        configuredTime,
        narrationStarts: anchorCue.start,
        cardTime: safeTime,
        shiftedBy: Number((safeTime - configuredTime).toFixed(3))
      });
      continue;
    }

    // Fallback for future sections that do not yet have a semantic anchor:
    // if their timestamp lands inside speech, move to immediately before that
    // caption. Never defer to the end of the caption, which is what caused the
    // original late-card behavior.
    const containingCueIndex = subtitles.findIndex(cue =>
      configuredTime >= cue.start && configuredTime < cue.end
    );
    if (containingCueIndex < 0) continue;

    const safeTime = titleCardTimeBeforeCue(containingCueIndex);
    group.triggerTime = safeTime;
    adjustments.push({
      section: group.name,
      anchor: '(timestamp fallback)',
      configuredTime,
      narrationStarts: subtitles[containingCueIndex].start,
      cardTime: safeTime,
      shiftedBy: Number((safeTime - configuredTime).toFixed(3))
    });
  }

  // The title-card hard rule depends on section triggers, so rebuild callout
  // boundaries after the safe card times have been calculated.
  CALLOUTS = normalizeCalloutsForTitleCards(GG_PLAYER.callouts);
  window.GG_TITLE_CARD_DIAGNOSTICS = adjustments;
  if (GG_LOAD_DEBUG && adjustments.length > 0) {
    console.groupCollapsed('[GG timing] Title cards aligned before section narration');
    console.table(adjustments);
    console.groupEnd();
  }
}

function updateSubtitles(t) {
  const subsEl = document.getElementById('subsText');
  // Stay blank until the clip has loaded and the title card has finished,
  // and whenever a section title card is on screen.
  if (!subsUnlocked || document.body.classList.contains('title-card-active')) {
    subsEl.textContent = '—';
    return;
  }
  // Nudge subtitle lookup slightly later so lines do not feel ahead of the audio.
  const subT = Math.max(0, t - SUBTITLE_SYNC_DELAY - MASTER_TIMING_OFFSET);
  let currentIdx = -1;
  for (let i = 0; i < subtitles.length; i++) {
    if (subT >= subtitles[i].start) currentIdx = i;
    else break;
  }

  const currentSub = currentIdx >= 0 ? subtitles[currentIdx] : null;
  if (!currentSub) { subsEl.textContent = '—'; return; }

  // Never resurrect a line from the section before the most recent title card.
  if (currentSub.start < subtitleResetBoundary) {
    subsEl.textContent = '—';
    return;
  }

  const nextSub = subtitles[currentIdx + 1] || null;
  const holdUntil = Math.min(
    currentSub.end + SUBTITLE_HOLD_SECONDS,
    nextSub ? nextSub.start : Infinity
  );

  // Keep the previous line visible across ordinary conversational pauses. A
  // genuinely long silence clears to an empty strip after four seconds.
  subsEl.textContent = subT < currentSub.end || subT < holdUntil
    ? currentSub.text
    : '';
}

const courseStep = Number(window.GG_MODULE_ID) === 1 ? 1 : (Number(window.GG_MODULE_ID) === 2 ? 2 : null);
document.getElementById('vbTitle').textContent = courseStep
  ? VB.title.replace(/^Module\s+\d+/i, 'Step ' + courseStep)
  : VB.title;
document.getElementById('secLbl').textContent=VB.section;
document.getElementById('secName').textContent=VB.title;

// Initial load
video.addEventListener('loadedmetadata', () => {
  if(Number.isFinite(video.duration) && video.duration > 0) {
    dur = video.duration;
  }
  onT(0);
  renderTimelineMarkers();
});

// Play button and placeholder click
function startPlayback() {
  beginPlayback();
  renderTimelineMarkers();
}

vidPlaceholder.addEventListener('click', startPlayback);

playBtn.addEventListener('click', () => {
  togglePlay();
});

// Rewind the video by 10 seconds, replaying any section cards passed over.
const rewindBtn = document.getElementById('rewindBtn');
function rewind10() {
  // Only meaningful once playback has started.
  if (video.style.display === 'none') return;
  const target = Math.max(0, video.currentTime - 10);

  isSeeking = true;
  subtitleResetBoundary = 0;
  video.currentTime = target;

  // Hide any active section title card.
  cancelSectionTransition();
  hideEndcard();
  clearHighlights();

  // Allow the section transition for the landing point to replay.
  let targetIdx = -1;
  const targetTimelineT = Math.max(0, target - MASTER_TIMING_OFFSET);
  for (let i = 0; i < VB.groups.length; i++) {
    if (targetTimelineT >= VB.groups[i].triggerTime) targetIdx = i;
    else break;
  }
  if (targetIdx < lastShownSectionIdx) {
    lastShownSectionIdx = targetIdx - 1;
  }

  // Refresh overlays immediately so subtitles/callouts match the new spot.
  onT(target);

  setTimeout(() => { isSeeking = false; }, 500);
}
if (rewindBtn) {
  rewindBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    rewind10();
  });
}

vidBox.addEventListener('click', (e) => {
  if(e.target === video || e.target === vidBox) {
    if(video.style.display !== 'none') {
      togglePlay();
      showHoverCue();
    }
  }
});

video.addEventListener('timeupdate', () => {
  fakeT = video.currentTime;
  if(!isSeeking && fakeT > maxWatched) maxWatched = fakeT;
  onT(fakeT);
});

// Optional part-opening title card. Enabled per-chapter via GG_PLAYER.introCard
// (boolean, or { label, title } for custom text). Absent on Module 1, so its
// behavior is unchanged. Fires once, on the first play near the start of the clip.
let introCardArmed = !!(typeof GG_PLAYER !== 'undefined' && GG_PLAYER.introCard);
// The opening list and its heading must not flash before the opening title card.
if (introCardArmed) clearBulletsAndListsForTitleCard();

video.addEventListener('play', () => {
  isPlaying = true;
  playBtn.textContent = '❚❚';
  updateHoverIcon();
  startFadeLoop();

  if (introCardArmed && video.currentTime < 2.5 && !isSeeking) {
    introCardArmed = false;
    const ic = GG_PLAYER.introCard;
    const g0 = VB.groups[0] || {};
    const title = (ic && ic.title) ? ic.title : (g0.name || '');
    const label = (ic && ic.label) ? ic.label : (g0.label || '');
    lastShownSectionIdx = 0;
    showSectionTransition(title, label);
  }
});

video.addEventListener('pause', () => {
  isPlaying = false;
  stopFadeLoop();
  // During a section title card the clip pauses itself and resumes on its own,
  // so keep the "playing" icon to signal no click is required.
  if (!document.body.classList.contains('title-card-active')) {
    playBtn.textContent = '▶';
  }
  updateHoverIcon();
});

// End of clip: hold on black, glow the takeaways, and surface the next step.
video.addEventListener('ended', () => {
  isPlaying = false;
  stopFadeLoop();
  playBtn.textContent = '▶';
  updateHoverIcon();
  if (vidFadeBlack) vidFadeBlack.style.opacity = '1';
  flashHighlights(true);
  showEndcard();

  // Server-authoritative inspector progress hook.
  document.dispatchEvent(new CustomEvent('gg:partend'));
});

// Loading spinner — show whenever playback is waiting on data, hide once ready.
video.addEventListener('loadstart', () => { if (!video.paused) showSpinner(); });
video.addEventListener('waiting', () => { showSpinner(); updateLoadingPercent(); });
video.addEventListener('stalled', () => { if (!video.paused) showSpinner(); });
video.addEventListener('seeking', () => {
  // Custom scrubber seeks are already clamped. This second boundary catches
  // browser/native/programmatic forward seeks that bypass the scrubber.
  if (!isSeeking && video.currentTime > maxWatched + 0.35) {
    isSeeking = true;
    video.currentTime = Math.max(0, maxWatched);
    setTimeout(() => { isSeeking = false; }, 0);
  }
  if (!video.paused) showSpinner();
});
video.addEventListener('ratechange', () => {
  if (video.playbackRate !== 1) video.playbackRate = 1;
  if (video.defaultPlaybackRate !== 1) video.defaultPlaybackRate = 1;
});
video.addEventListener('progress', () => { if (vidLoading && vidLoading.classList.contains('show')) updateLoadingPercent(); });
video.addEventListener('playing', hideSpinner);
video.addEventListener('canplay', hideSpinner);
video.addEventListener('canplaythrough', hideSpinner);
video.addEventListener('canplaythrough', ggPrefetchNext);
video.addEventListener('seeked', hideSpinner);
video.addEventListener('pause', hideSpinner);
video.addEventListener('error', hideSpinner);

// Pause automatically when the viewer switches to another tab/window.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && !video.paused && !video.ended && video.style.display !== 'none') {
    video.pause();
  }
});

// End-card buttons
if (vidEndcardNext) vidEndcardNext.addEventListener('click', (e) => { e.stopPropagation(); navigateNext(); });
if (vidEndcardReplay) vidEndcardReplay.addEventListener('click', (e) => { e.stopPropagation(); replayClip(); });

// Spacebar toggles play/pause (unless typing in a field or a control is focused).
document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' && e.key !== ' ') return;
  const el = document.activeElement;
  const tag = el ? el.tagName : '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || tag === 'A' || (el && el.isContentEditable)) return;
  e.preventDefault();
  togglePlay();
  showHoverCue();
});

// NEW: Draggable scrubber implementation
let scrubberRect = null;

function updateScrubberRect() {
  scrubberRect = scrubBar.getBoundingClientRect();
}

// Update rect on resize
window.addEventListener('resize', updateScrubberRect);

function seekToPosition(clientX) {
  if (!scrubberRect) updateScrubberRect();
  
  const clickX = clientX - scrubberRect.left;
  const clickPct = Math.max(0, Math.min(1, clickX / scrubberRect.width));
  const safeDuration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : dur;
  const requestedT = clickPct * safeDuration;
  const targetT = Math.min(requestedT, Math.min(safeDuration, maxWatched));
  
  isSeeking = true;
  subtitleResetBoundary = 0;
  video.currentTime = targetT;
  
  // Hide any active transition
  cancelSectionTransition();
  hideEndcard();
  clearHighlights();
  // Synchronize section state immediately while isSeeking is still true. This
  // prevents the frame-level title-card watcher from replaying an earlier card
  // after a large jump on the timeline.
  onT(targetT);
  
  // Reset lastShownSectionIdx if seeking backward
  // This allows transitions to replay when rewatching sections
  let targetIdx = -1;
  const targetTimelineT = Math.max(0, targetT - MASTER_TIMING_OFFSET);
  for(let i=0; i<VB.groups.length; i++){
    if(targetTimelineT >= VB.groups[i].triggerTime){
      targetIdx = i;
    } else {
      break;
    }
  }
  if (targetIdx < lastShownSectionIdx) {
    lastShownSectionIdx = targetIdx - 1;
  }
  
  // Clear seeking flag after a short delay
  setTimeout(() => {
    isSeeking = false;
  }, 500);
  
  return true;
}

// Click to seek
scrubBar.addEventListener('click', (e) => {
  if (!isDragging) {
    seekToPosition(e.clientX);
  }
});

scrubBar.addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(e.key)) return;
  e.preventDefault();
  const safeDuration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : dur;
  const requested = e.key === 'Home' ? 0 : video.currentTime + (e.key === 'ArrowLeft' ? -10 : 10);
  const target = Math.max(0, Math.min(requested, Math.min(safeDuration, maxWatched)));
  subtitleResetBoundary = 0;
  video.currentTime = target;
  onT(target);
});

// Drag to seek
scrubBar.addEventListener('mousedown', (e) => {
  isDragging = true;
  scrubBar.classList.add('dragging');
  updateScrubberRect();
  seekToPosition(e.clientX);
});

document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    seekToPosition(e.clientX);
  }
});

document.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false;
    scrubBar.classList.remove('dragging');
  }
});

// Touch support for mobile
scrubBar.addEventListener('touchstart', (e) => {
  isDragging = true;
  scrubBar.classList.add('dragging');
  updateScrubberRect();
  seekToPosition(e.touches[0].clientX);
  e.preventDefault();
});

document.addEventListener('touchmove', (e) => {
  if (isDragging) {
    seekToPosition(e.touches[0].clientX);
    e.preventDefault();
  }
});

document.addEventListener('touchend', () => {
  if (isDragging) {
    isDragging = false;
    scrubBar.classList.remove('dragging');
  }
});


function updateVideoCallouts(t) {
  if (document.body.classList.contains('title-card-active')) {
    currentCalloutIdx = -1;
    videoCallout.classList.remove('show');
    videoCallout.setAttribute('aria-hidden', 'true');
    return;
  }
  // Nudge callout timing slightly later to better match the revised edit.
  const callT = Math.max(0, t - CALLOUT_SYNC_DELAY - MASTER_TIMING_OFFSET);
  let activeIdx = -1;
  for (let i = 0; i < CALLOUTS.length; i++) {
    if (callT >= CALLOUTS[i].start && callT <= CALLOUTS[i].end) {
      activeIdx = i;
      break;
    }
  }

  if (activeIdx < 0) {
    currentCalloutIdx = -1;
    videoCallout.classList.remove('show');
    videoCallout.setAttribute('aria-hidden', 'true');
    return;
  }

  const c = CALLOUTS[activeIdx];
  const itemCount = c.items.length;
  const span = Math.max(0.1, c.end - c.start);

  // Items now build cumulatively: the title appears first, then item 1,
  // then item 2 appears underneath it, and so on. Existing items stay visible
  // until the callout window ends.
  let visibleCount = 0;
  if (Array.isArray(c.itemStarts) && c.itemStarts.length === itemCount) {
    for (let i = 0; i < c.itemStarts.length; i++) {
      if (callT >= c.itemStarts[i]) visibleCount = i + 1;
    }
  } else {
    visibleCount = Math.min(itemCount, Math.max(1, Math.floor(((callT - c.start) / span) * itemCount) + 1));
  }

  const renderKey = `${activeIdx}:${visibleCount}`;
  if (renderKey === currentCalloutIdx) return;
  currentCalloutIdx = renderKey;

  videoCalloutTitle.textContent = c.title;
  videoCalloutList.innerHTML = c.items.slice(0, visibleCount).map((item, itemIdx) => `
    <li>
      <span class="video-callout-num">${itemIdx + 1}</span>
      <span>${item}</span>
    </li>
  `).join('');
  videoCallout.classList.add('show');
  videoCallout.setAttribute('aria-hidden', 'false');
}

function onT(t){
  const p=Math.min((t/dur)*100,100);
  const maxP = Math.min((maxWatched/dur)*100,100);
  
  document.getElementById('scrubFill').style.width=p+'%';
  document.getElementById('scrubDot').style.left=p+'%';
  document.getElementById('scrubMax').style.width=maxP+'%';
  scrubBar.setAttribute('aria-valuemax', String(Math.max(0, Math.round(dur))));
  scrubBar.setAttribute('aria-valuenow', String(Math.max(0, Math.round(t))));
  
  const m=Math.floor(t/60),s=Math.floor(t%60).toString().padStart(2,'0');
  document.getElementById('tDisp').textContent=`${m}:${s}`;
  
  if (!subsUnlocked && t > 0.4 && !document.body.classList.contains('title-card-active')) subsUnlocked = true;
  updateSubtitles(t);
  updateVideoCallouts(t);
  updateDisplay(t);
  applyEndFade(t);
}

function updateDisplay(t){
  const timelineT = Math.max(0, t - MASTER_TIMING_OFFSET);
  let activeIdx = -1;
  for(let i=0; i<VB.groups.length; i++){
    if(timelineT >= VB.groups[i].triggerTime){
      activeIdx = i;
    } else {
      break;
    }
  }
  
  const ag = activeIdx >= 0 ? VB.groups[activeIdx] : null;
  document.getElementById('segLbl').textContent = ag ? ag.name : 'Ready to begin';
  
  if(activeIdx !== currentGroupIdx){
    currentGroupIdx = activeIdx;

    // Entering section i means all earlier sections have been watched.
    document.dispatchEvent(new CustomEvent('gg:section', { detail: { index: activeIdx } }));
    
    // Show section transition overlay only if:
    // - Not the first section (skip intro)
    // - Not currently seeking/scrubbing
    // - Haven't shown this section's transition yet
    // - Video was playing (we'll pause it during the transition)
    if (activeIdx > 0 && !isSeeking && activeIdx !== lastShownSectionIdx && isPlaying) {
      const currentSection = VB.groups[activeIdx];
      showSectionTransition(currentSection.name, currentSection.label);
      lastShownSectionIdx = activeIdx;
    }
    
    renderGroups();
  }
}

// timeupdate can fire only a few times per second, which is enough for the
// speaker to begin a sentence before the pause is noticed. The existing
// animation-frame loop calls this lightweight boundary check while playing so
// a title card is raised within a frame of its caption-aligned trigger.
function checkUpcomingTitleCardBoundary(t) {
  if (!isPlaying || isSeeking || currentGroupIdx < 0) return;
  const nextIndex = currentGroupIdx + 1;
  if (nextIndex <= 0 || nextIndex >= VB.groups.length) return;
  if (nextIndex === lastShownSectionIdx) return;
  const timelineT = Math.max(0, t - MASTER_TIMING_OFFSET);
  if (timelineT >= VB.groups[nextIndex].triggerTime) updateDisplay(t);
}

function renderGroups(){
  const container = document.getElementById('bulInner');
  const secHdr = container.querySelector('.sec-hdr');
  container.innerHTML = '';
  container.appendChild(secHdr);
  
  const totalSections = VB.groups.length;
  const idx = currentGroupIdx >= 0 ? currentGroupIdx : 0;
  const g = VB.groups[idx];
  if(!g) return;
  
  // Calculate end time using actual section starts for display, not early card trigger time
  const startTime = Math.max(0, (g.actualStartTime ?? g.triggerTime) + MASTER_TIMING_OFFSET);
  const endTime = idx < VB.groups.length - 1
    ? Math.max(startTime, (VB.groups[idx + 1].actualStartTime ?? VB.groups[idx + 1].triggerTime) + MASTER_TIMING_OFFSET)
    : dur;
  
  const startMin = Math.floor(startTime/60);
  const startSec = Math.floor(startTime%60).toString().padStart(2,'0');
  const endMin = Math.floor(endTime/60);
  const endSec = Math.floor(endTime%60).toString().padStart(2,'0');
  
  const grpDiv = document.createElement('div');
  grpDiv.className = 'grp enter';
  grpDiv.innerHTML = `
    <div class="grp-hdr">
      <span class="grp-ts">${startMin}:${startSec} - ${endMin}:${endSec}</span>
      <span class="grp-name">${g.name}</span>
      <span class="grp-section-num">Section ${idx + 1} / ${totalSections}</span>
    </div>
    <ul class="grp-list">
      ${g.bullets.map(b => `
        <li class="grp-item anim">
          <span class="grp-dot"></span>
          <span class="grp-txt">${b}</span>
        </li>
      `).join('')}
    </ul>
  `;
  
  container.appendChild(grpDiv);
}

renderGroups();

// --- Stall watchdog -------------------------------------------------------
// If the video stops advancing while we intend to be playing — and we are NOT
// in an intentional section-card pause — gently nudge playback to recover.
// Stays out of the way of the title-card pause (isPlaying is false during it).
(function stallWatchdog(){
  let lastT = 0, lastAdvance = Date.now();
  setInterval(() => {
    const inCard = document.body.classList.contains('title-card-active');
    if (video.paused || !isPlaying || inCard || video.style.display === 'none') {
      lastT = video.currentTime; lastAdvance = Date.now(); return;
    }
    if (video.currentTime > lastT + 0.02) {
      lastT = video.currentTime; lastAdvance = Date.now();
    } else if (Date.now() - lastAdvance > 4000) {
      // Stuck while it should be playing — try to resume.
      lastAdvance = Date.now();
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  }, 1000);
})();

})();

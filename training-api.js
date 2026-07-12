// training-api.js — INSPECTOR training portal
// ---------------------------------------------------------------------------
// Auth + server-authoritative progress tracking for the inspector portal.
//
// Ported from the host portal's js/training-api.js, with three deliberate
// changes and nothing else:
//
//   1. Progress routes point at /inspector instead of /host.
//      (Per Brian: the pairs "function exactly the same ... they just modify
//      separate fields in the database." Same methods, same payload shape.)
//   2. Auth is UNCHANGED — exchange-token is explicitly shared across both
//      portals, so this is the host code verbatim.
//   3. Progress is LENGTH-WEIGHTED, not flat-per-section. The percentage comes
//      from progress-config.js (PART_DURATIONS / SECTION_TIMINGS), which is the
//      same seconds-completed ÷ total-seconds math the host already ships.
//
// The payload shape is intentionally byte-identical to the host's, including
// the `currentSegment` / `totalSegments` key names, so the mirrored backend
// route needs no special-casing. "Segment" on the host == "section" here.
//
// LOAD ORDER (in each module page, before player.js):
//   <script src="progress-config.js"></script>
//   <script src="training-api.js"></script>
//   <script src="player.js"></script>
//
// Each module page must declare which module it is, before this file loads:
//   <script>window.GG_MODULE_ID = 1;</script>
// The part number is read from the existing `#ch=N` hash, so part key === "1-3".
// ---------------------------------------------------------------------------

(function () {
  'use strict';

  // ===== Configuration =====================================================
  // Matches the host portal's shipped config.js. Note this is portal.* — the
  // value that actually went live — not the platform.* URL from the old email.
  const API_BASE = 'https://portal.guestguard.com';

  const ROUTES = {
    // Shared across host + inspector. Do not fork this one.
    exchangeToken: `${API_BASE}/api/auth/training/exchange-token`,
    // Inspector-specific mirrors of the host routes.
    progress: `${API_BASE}/api/profiles/training-progress/inspector`,
    status: `${API_BASE}/api/profiles/inspector-status`,
  };

  const SERVER_RETRY_ATTEMPTS = 3;
  const SERVER_RETRY_BASE_DELAY = 1000; // ms, doubles each attempt

  // Certification integrity: if the server won't confirm a save, do NOT let the
  // learner advance on local state alone. Host does the same. Flip to false only
  // for local dev.
  const BLOCK_ON_SYNC_FAILURE = true;

  // The inspector-status POST payload is NOT specified in anything Brian sent.
  // Route + methods are known; field names are not. Left off until he confirms.
  const POST_STATUS_ON_COMPLETE = false;

  const DEBUG = true;
  const log = (...a) => { if (DEBUG) console.log('[GG-API]', ...a); };
  const warn = (...a) => console.warn('[GG-API]', ...a);
  const err = (...a) => console.error('[GG-API]', ...a);

  // ===== State =============================================================
  const GGTraining = {
    accessToken: null,
    refreshToken: null,
    expiresAt: null,

    // Server-authoritative. Hydrated by GET; never read from localStorage.
    //   progress[partKey] = { currentSegment, totalSegments, completed, lastUpdated }
    progress: {},

    ready: false,

    // ---------------------------------------------------------------------
    // Part identity
    // ---------------------------------------------------------------------
    currentPartKey() {
      if (window.GG_PART_KEY) return window.GG_PART_KEY; // explicit override
      const mod = window.GG_MODULE_ID;
      if (!mod) return null; // e.g. index.html — hub page, no active part
      const hashMatch = (location.hash || '').match(/ch=(\d+)/);
      const queryPart = new URLSearchParams(location.search).get('ch');
      const part = queryPart ? parseInt(queryPart, 10) : (hashMatch ? parseInt(hashMatch[1], 10) : 1);
      return `${mod}-${part}`;
    },

    // How many sections a part has, per the timing config.
    totalSections(partKey) {
      const t = window.SECTION_TIMINGS && window.SECTION_TIMINGS[partKey];
      return t && t.durations ? t.durations.length : 0;
    },

    // "1-3" -> { module: 1, chapter: 3 }
    parsePartKey(key) {
      const m = String(key).match(/(\d+)-(\d+)/);
      return m ? { module: parseInt(m[1], 10), chapter: parseInt(m[2], 10) } : null;
    },

    // ---------------------------------------------------------------------
    // Auth — verbatim from host. exchange-token is shared, do not change.
    // ---------------------------------------------------------------------
    extractJWTExpiration(token) {
      try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        return decoded.exp ? decoded.exp * 1000 : null;
      } catch (e) {
        warn('Could not decode JWT expiry:', e.message);
        return null;
      }
    },

    loadStoredAuth() {
      const access = localStorage.getItem('gg_access_token');
      const refresh = localStorage.getItem('gg_refresh_token');
      const expires = localStorage.getItem('gg_expires_at');
      if (access) {
        this.accessToken = access;
        this.refreshToken = refresh;
        this.expiresAt = expires ? parseInt(expires, 10) : this.extractJWTExpiration(access);
      }
    },

    saveAuth(access, refresh, expiresAt) {
      if (!expiresAt && access) {
        expiresAt = this.extractJWTExpiration(access) || (Date.now() + 60 * 60 * 1000);
      }
      localStorage.setItem('gg_access_token', access);
      localStorage.setItem('gg_refresh_token', refresh || '');
      localStorage.setItem('gg_expires_at', String(expiresAt));
      this.accessToken = access;
      this.refreshToken = refresh;
      this.expiresAt = expiresAt;
      log('Auth saved. Expires', new Date(expiresAt).toISOString());
    },

    clearAuth() {
      localStorage.removeItem('gg_access_token');
      localStorage.removeItem('gg_refresh_token');
      localStorage.removeItem('gg_expires_at');
      this.accessToken = this.refreshToken = this.expiresAt = null;
    },

    isAuthenticated() {
      return !!this.accessToken && (!this.expiresAt || this.expiresAt > Date.now());
    },

    async authenticateWithTempToken(tempToken) {
      try {
        const url = `${ROUTES.exchangeToken}?temp_token=${encodeURIComponent(tempToken)}`;
        const res = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(`Token exchange failed: ${e.error || res.statusText}`);
        }
        const auth = await res.json();
        this.saveAuth(auth.access_token, auth.refresh_token, auth.expires_at);
        return true;
      } catch (e) {
        err('Authentication failed:', e.message);
        return false;
      }
    },

    async fetchWithAuth(url, options = {}) {
      if (!this.accessToken) throw new Error('Not authenticated');
      return fetch(url, {
        mode: 'cors',
        credentials: 'omit',
        ...options,
        headers: {
          Accept: 'application/json',
          ...(options.headers || {}),
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
    },

    async fetchWithRetry(fn, operation = 'Operation') {
      for (let attempt = 1; attempt <= SERVER_RETRY_ATTEMPTS; attempt++) {
        try {
          return { success: true, data: await fn() };
        } catch (e) {
          err(`${operation} failed (attempt ${attempt}/${SERVER_RETRY_ATTEMPTS}):`, e.message);
          if (attempt < SERVER_RETRY_ATTEMPTS) {
            const delay = SERVER_RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
            await new Promise(r => setTimeout(r, delay));
          } else {
            return { success: false, error: e.message };
          }
        }
      }
      return { success: false, error: 'Max retries exceeded' };
    },

    // ---------------------------------------------------------------------
    // Progress — GET
    // ---------------------------------------------------------------------
    async fetchProgress() {
      if (!this.isAuthenticated()) return;
      const result = await this.fetchWithRetry(async () => {
        const res = await this.fetchWithAuth(ROUTES.progress, { method: 'GET' });
        if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
        return res.json();
      }, 'Progress GET');

      if (!result.success) { err('Could not load progress:', result.error); return; }

      this.progress = this.flattenServerProgress(result.data.training_progress);
      log('Progress loaded:', this.progress);
      this.emit('gg:progressloaded', { progress: this.progress });
    },

    // Server sends nested modules{}.chapters{} (host shape). Flatten to "M-C".
    flattenServerProgress(trainingProgress) {
      const flat = {};
      const modules = (trainingProgress && trainingProgress.modules) || {};
      for (const m in modules) {
        const chapters = (modules[m] && modules[m].chapters) || {};
        for (const c in chapters) {
          const p = chapters[c] || {};
          flat[`${m}-${c}`] = {
            currentSegment: p.currentSegment || 0,
            totalSegments: p.totalSegments || this.totalSections(`${m}-${c}`),
            completed: !!p.completed,
            lastUpdated: p.lastUpdated || null,
          };
        }
      }
      return flat;
    },

    // Flat "M-C" back into the nested shape the route expects.
    nestForServer() {
      const modules = {};
      for (const key in this.progress) {
        const parsed = this.parsePartKey(key);
        if (!parsed) continue;
        const { module, chapter } = parsed;
        if (!modules[module]) modules[module] = { chapters: {} };
        modules[module].chapters[chapter] = this.progress[key];
      }
      return modules;
    },

    // ---------------------------------------------------------------------
    // Weighted percentage — the whole point of this rewrite.
    // Delegates to progress-config.js. Sections are weighted by their real
    // runtime, so a 5-minute section is worth more than a 30-second one.
    // ---------------------------------------------------------------------
    overallPercent() {
      if (typeof window.calculateWeightedPercent !== 'function') {
        warn('progress-config.js not loaded — falling back to flat count.');
        const keys = Object.keys(this.progress);
        if (!keys.length) return 0;
        const done = keys.filter(k => this.progress[k].completed).length;
        return Math.round((done / keys.length) * 100);
      }
      // calculateWeightedPercent expects { key: { currentSection, completed } }
      const shaped = {};
      for (const k in this.progress) {
        shaped[k] = {
          currentSection: this.progress[k].currentSegment || 0,
          completed: !!this.progress[k].completed,
        };
      }
      return window.calculateWeightedPercent(shaped);
    },

    isAllComplete() {
      const parts = Object.keys(window.PART_DURATIONS || {});
      if (!parts.length) return false;
      return parts.every(k => this.progress[k] && this.progress[k].completed);
    },

    // ---------------------------------------------------------------------
    // Progress — POST
    // ---------------------------------------------------------------------
    async postProgress(partKey, sectionIdx, completed) {
      if (!this.isAuthenticated()) { warn('Not authenticated — skipping POST.'); return false; }
      if (!partKey) return false;

      const total = this.totalSections(partKey);
      const prev = this.progress[partKey] || { currentSegment: 0 };

      // Monotonic: never let a rewatch or a scrub-back reduce recorded progress.
      const current = Math.max(prev.currentSegment || 0, sectionIdx);

      this.progress[partKey] = {
        currentSegment: completed && total ? total : current,
        totalSegments: total,
        completed: !!completed || !!prev.completed,
        lastUpdated: new Date().toISOString(),
      };

      const payload = {
        training_progress: {
          modules: this.nestForServer(),
          complete_training: this.isAllComplete(),
          percentCompleted: this.overallPercent(),
          last_updated: new Date().toISOString(),
        },
      };

      log(`POST ${partKey} → section ${this.progress[partKey].currentSegment}/${total}` +
          ` | overall ${payload.training_progress.percentCompleted}%`);

      const result = await this.fetchWithRetry(async () => {
        const res = await this.fetchWithAuth(ROUTES.progress, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
        return res.json();
      }, 'Progress POST');

      if (result.success) {
        if (result.data && result.data.training_progress) {
          this.progress = this.flattenServerProgress(result.data.training_progress);
        }
        this.emit('gg:progresssaved', {
          progress: this.progress,
          percent: this.overallPercent(),
        });

        if (completed && this.isAllComplete() && POST_STATUS_ON_COMPLETE) {
          await this.postStatus();
        }
        return true;
      }

      err('Progress POST failed after all retries:', result.error);
      this.emit('gg:syncfailed', { partKey, error: result.error });
      return !BLOCK_ON_SYNC_FAILURE;
    },

    // ---------------------------------------------------------------------
    // Status — route + methods are known; payload shape is NOT in Brian's spec.
    // Wired but disabled (see POST_STATUS_ON_COMPLETE). Confirm fields first.
    // ---------------------------------------------------------------------
    async fetchStatus() {
      if (!this.isAuthenticated()) return null;
      const result = await this.fetchWithRetry(async () => {
        const res = await this.fetchWithAuth(ROUTES.status, { method: 'GET' });
        if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
        return res.json();
      }, 'Status GET');
      return result.success ? result.data : null;
    },

    async postStatus(body) {
      if (!this.isAuthenticated()) return false;
      // Placeholder shape — REPLACE once Brian confirms the field names.
      const payload = body || { training_complete: true };
      const result = await this.fetchWithRetry(async () => {
        const res = await this.fetchWithAuth(ROUTES.status, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
        return res.json();
      }, 'Status POST');
      return result.success;
    },

    // ---------------------------------------------------------------------
    // Player hooks. player.js dispatches these; see the patch notes.
    // ---------------------------------------------------------------------
    emit(name, detail) {
      document.dispatchEvent(new CustomEvent(name, { detail }));
    },

    // Entering section index i means sections 0..i-1 are finished.
    onSectionEnter(idx) {
      const key = this.currentPartKey();
      if (!key || idx <= 0) return;
      const prev = this.progress[key] || {};
      if ((prev.currentSegment || 0) >= idx) return; // already recorded
      this.postProgress(key, idx, false);
    },

    onPartComplete() {
      const key = this.currentPartKey();
      if (!key) return;
      this.postProgress(key, this.totalSections(key), true);
    },

    // For Module 3 (video library) / Module 4, which have no section timings:
    // all-or-nothing until you add them to PART_DURATIONS.
    markPartComplete(partKey) {
      return this.postProgress(partKey, this.totalSections(partKey), true);
    },

    // ---------------------------------------------------------------------
    // Boot
    // ---------------------------------------------------------------------
    async init() {
      this.loadStoredAuth();

      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
      // generate-token implementations have used a few names over time. They
      // all represent the same short-lived token accepted by exchange-token.
      const tokenNames = ['temp_token', 'training_token', 'tempToken', 'token'];
      let tempToken = null;
      for (const name of tokenNames) {
        tempToken = params.get(name) || hashParams.get(name);
        if (tempToken) break;
      }

      if (!this.isAuthenticated() && tempToken) {
        await this.authenticateWithTempToken(tempToken);
      }

      // Strip the used temp_token from the URL so refreshes don't replay it.
      if (tempToken) {
        const url = new URL(window.location);
        tokenNames.forEach(name => url.searchParams.delete(name));
        const cleanHash = new URLSearchParams((url.hash || '').replace(/^#/, ''));
        tokenNames.forEach(name => cleanHash.delete(name));
        url.hash = cleanHash.toString() ? '#' + cleanHash.toString() : '';
        window.history.replaceState({}, '', url);
      }

      if (this.isAuthenticated()) {
        await this.fetchProgress();
      } else {
        warn('No valid session. Progress will not be tracked this visit.');
      }

      this.ready = true;
      this.emit('gg:ready', { authenticated: this.isAuthenticated() });
    },
  };

  // Listen for the events player.js dispatches.
  document.addEventListener('gg:section', e => GGTraining.onSectionEnter(e.detail.index));
  document.addEventListener('gg:partend', () => GGTraining.onPartComplete());

  window.GGTraining = GGTraining;
  GGTraining.init();
})();

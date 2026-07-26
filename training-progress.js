(function () {
  'use strict';
  const CFG = window.GG_PROGRESS_API || {};
  const STORE_KEY = 'gg-inspector-training-progress-v1';
  // Cloudflare serves module1.html at the canonical extensionless /module1 URL.
  // Recognize both forms so progress identity is stable locally and in production.
  const pageModule = Number((location.pathname.match(/module(\d+)(?:\.html)?(?:\/)?$/i) || [])[1] || 0);
  let state = readLocal();
  let activeKey = inferActiveKey();
  let lastSentAt = 0;
  let lastSavedAt = 0;

  function readLocal() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (_) { return {}; } }
  function saveLocal() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); render(); }
  function inferActiveKey() {
    if (pageModule === 1 || pageModule === 2) {
      const queryPart = Number(new URLSearchParams(location.search).get('ch'));
      const hashMatch = (location.hash || '').match(/(?:^#|[&#])ch=(\d+)/i);
      const hashPart = hashMatch ? Number(hashMatch[1]) : 0;
      return pageModule + '-' + (queryPart || hashPart || 1);
    }
    if (pageModule === 4) {
      const section=Number(new URLSearchParams(location.search).get('ch'));
      return '4-' + (section >= 1 && section <= 6 ? section : 1);
    }
    if (pageModule === 5) return '5-1';
    return null;
  }
  function sourceId(video) {
    const src = video.currentSrc || video.src || '';
    const file = decodeURIComponent(src.split('/').pop() || '').replace(/\.(mp4|webm).*$/i, '');
    return file || 'video';
  }
  function keyFor(video) {
    if (pageModule === 3) return '3-' + sourceId(video);
    return activeKey || inferActiveKey();
  }
  function update(video, completed) {
    const key = keyFor(video); if (!key) return;
    activeKey = key;
    const duration = Number(video.duration) || Number((window.PART_DURATIONS || {})[key]) || 0;
    const current = Number(video.currentTime) || 0;
    const prior = state[key] || {};
    const maxTime = Math.max(Number(prior.maxTime) || 0, current);
    state[key] = Object.assign({}, prior, {
      maxTime: maxTime,
      duration: duration || prior.duration || 0,
      percent: duration ? Math.min(100, Math.round(maxTime / duration * 100)) : (prior.percent || 0),
      completed: Boolean(prior.completed || completed || (duration && maxTime / duration >= (CFG.completionThreshold || .9))),
      updatedAt: new Date().toISOString()
    });
    saveLocal();
    sync(key, false);
  }
  function sync(key, force) {
    if (!CFG.endpoint || !navigator.onLine) return;
    const now = Date.now(); if (!force && now - lastSentAt < (CFG.heartbeatSeconds || 15) * 1000) return;
    lastSentAt = now;
    fetch(CFG.endpoint, {
      method: 'POST', credentials: CFG.credentials || 'include', keepalive: true,
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({courseId: CFG.courseId || 'inspector-training', itemId:key, progress:state[key]})
    }).catch(function () { /* Local progress remains the offline source of truth. */ });
  }
  function items() {
    const all = document.getElementById('allChapters');
    if (all) { try { return JSON.parse(all.textContent).chapters.map(function(c){ return {key:pageModule+'-'+c.n,label:'Part '+c.n+': '+c.short,href:'?ch='+c.n}; }); } catch (_) {} }
    if (pageModule === 3) return Array.from(document.querySelectorAll('[data-watch]')).map(function(el){ return {key:'3-'+el.dataset.watch,label:(el.querySelector('h3')||{}).textContent || el.dataset.watch,el:el}; });
    if (pageModule === 4) {
      const labels=['Property Wide','Common Room','Kitchen','Hallway','Bathroom','Bedroom'];
      return labels.map(function(label,i){ return {key:'4-'+(i+1),label:'Part '+(i+1)+': '+label,href:'module4.html?ch='+(i+1)}; });
    }
    return [];
  }
  function done(key) { return Boolean(state[key] && state[key].completed); }
  function badge() { const b=document.createElement('span'); b.className='gg-watch-badge'; b.innerHTML='<span class="gg-watch-dot">✓</span> Watched'; return b; }
  function overallPercent() {
    const durations = window.PART_DURATIONS || {};
    let total = 0, watched = 0;
    Object.keys(durations).forEach(function(key){
      const duration = Number(durations[key]) || 0;
      const p = state[key] || {};
      total += duration;
      if (p.completed) watched += duration;
      else if (Number(p.maxTime)) watched += Math.min(duration, Number(p.maxTime));
      else if (Number(p.currentSection) && typeof window.partPercent === 'function') {
        watched += duration * window.partPercent(key, Number(p.currentSection)) / 100;
      }
    });
    return total ? Math.min(100, Math.round(watched / total * 100)) : 0;
  }
  function render() {
    document.querySelectorAll('.gg-progress-shell').forEach(function(n){n.remove();});
    document.querySelectorAll('.gg-header-progress').forEach(function(n){n.remove();});
    if (pageModule !== 3) {
      const pct = overallPercent();
      const header = document.querySelector('.hdr');
      if (header) {
        const compact = document.createElement('div');
        compact.className = 'gg-header-progress';
        compact.setAttribute('role', 'progressbar');
        compact.setAttribute('aria-label', 'Overall required training progress');
        compact.setAttribute('aria-valuemin', '0');
        compact.setAttribute('aria-valuemax', '100');
        compact.setAttribute('aria-valuenow', String(pct));
        compact.title = 'Overall required training progress: ' + pct + '%';
        compact.innerHTML = '<span class="gg-header-progress-label">PROGRESS</span><span class="gg-header-progress-track"><span class="gg-header-progress-fill" style="width:'+pct+'%"></span></span><span class="gg-header-progress-value">'+pct+'%</span>';
        const theme = header.querySelector('.theme-toggle');
        header.insertBefore(compact, theme || null);
      }
    }
    items().forEach(function(x){ if(x.el){ x.el.classList.toggle('is-complete',done(x.key)); const old=x.el.querySelector('.gg-watch-badge'); if(old)old.remove(); if(done(x.key))x.el.appendChild(badge()); }});
    document.querySelectorAll('[data-section-key]').forEach(function(link){ link.classList.toggle('is-complete',done(link.dataset.sectionKey)); });
    document.querySelectorAll('.module-card[data-module]').forEach(function(card){
      const moduleId=Number(card.dataset.module);
      const prefix=moduleId+'-';
      const keys=Object.keys(state).filter(function(k){return k.indexOf(prefix)===0;});
      const expected={1:3,2:5,4:6,5:1}[moduleId]||0;
      const completed=keys.filter(done).length;
      const moduleDone=expected>0 && completed>=expected;
      card.classList.toggle('is-complete',moduleDone);
      const old=card.querySelector('.gg-watch-badge'); if(old)old.remove();
      if(moduleDone) {
        const b=badge();
        b.lastChild.textContent=' '+(card.dataset.completionLabel||'Completed');
        card.appendChild(b);
      }
      else if(completed){ const b=document.createElement('span'); b.className='gg-watch-badge'; b.innerHTML='<span class="gg-watch-dot">'+completed+'</span> In progress'; card.appendChild(b); }
    });
  }
  function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
  function bindVideo(video) {
    if (pageModule === 4 && video.id !== 'bodycamVideo') return;
    if (video.dataset.ggProgressBound) return; video.dataset.ggProgressBound='1';
    video.addEventListener('loadedmetadata',function(){ activeKey=keyFor(video); render(); });
    video.addEventListener('timeupdate',function(){ if(Date.now()-lastSavedAt>5000){ lastSavedAt=Date.now(); update(video,false); } });
    video.addEventListener('pause',function(){ update(video,false); sync(keyFor(video),true); });
    video.addEventListener('ended',function(){ update(video,true); sync(keyFor(video),true); });
    window.addEventListener('pagehide',function(){ update(video,false); sync(keyFor(video),true); });
  }
  function pullRemote() {
    if (!CFG.endpoint || !navigator.onLine) return;
    const sep=CFG.endpoint.indexOf('?')>=0?'&':'?';
    fetch(CFG.endpoint+sep+'courseId='+encodeURIComponent(CFG.courseId||'inspector-training'), {credentials:CFG.credentials||'include'})
      .then(function(r){ return r.ok?r.json():null; })
      .then(function(data){
        const remote=data && (data.progress||data.items||data);
        if(!remote || Array.isArray(remote) || typeof remote!=='object')return;
        Object.keys(remote).forEach(function(key){
          const local=state[key]||{}, incoming=remote[key]||{};
          state[key]=Object.assign({},local,incoming,{maxTime:Math.max(Number(local.maxTime)||0,Number(incoming.maxTime)||0),completed:Boolean(local.completed||incoming.completed)});
        });
        saveLocal();
      }).catch(function(){});
  }
  function mergeAuthoritative(event) {
    const progress = event && event.detail && event.detail.progress;
    if (!progress) return;
    Object.keys(progress).forEach(function(key){
      const incoming=progress[key]||{}, local=state[key]||{};
      state[key]=Object.assign({},local,{
        completed:Boolean(local.completed||incoming.completed),
        currentSection:Math.max(Number(local.currentSection)||0,Number(incoming.currentSegment)||0),
        maxTime:Math.max(
          Number(local.maxTime)||0,
          typeof window.partPercent === 'function'
            ? (Number((window.PART_DURATIONS||{})[key])||0) * window.partPercent(key, Number(incoming.currentSegment)||0) / 100
            : 0
        ),
        duration:Number(local.duration)||Number((window.PART_DURATIONS||{})[key])||0,
        updatedAt:incoming.lastUpdated||local.updatedAt
      });
    });
    saveLocal();
  }
  function boot(){
    if (pageModule === 3) {
      document.querySelectorAll('.gg-progress-shell,.gg-header-progress,.gg-watch-badge').forEach(function(n){n.remove();});
      return;
    }
    document.querySelectorAll('video').forEach(bindVideo);
    render();
    pullRemote();
    setTimeout(render,250);
    setTimeout(render,1000);
  }
  document.addEventListener('gg:progressloaded', mergeAuthoritative);
  document.addEventListener('gg:progresssaved', mergeAuthoritative);
  document.addEventListener('gg:quizcomplete', function (event) {
    const detail = event.detail || {};
    const key = detail.itemId || '5-1';
    state[key] = Object.assign({}, state[key] || {}, {
      completed: true,
      percent: 100,
      updatedAt: new Date().toISOString()
    });
    saveLocal();
    sync(key, true);
  });
  document.addEventListener('gg:quizteststate', function (event) {
    const detail = event.detail || {}, key = detail.itemId || '5-1';
    state[key] = Object.assign({}, state[key] || {}, { completed: !!detail.completed, percent: detail.completed ? 100 : 0, maxTime: detail.completed ? 1 : 0, duration: 1, updatedAt: new Date().toISOString() });
    saveLocal();
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot); else boot();
}());

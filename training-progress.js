(function () {
  'use strict';
  const CFG = window.GG_PROGRESS_API || {};
  const STORE_KEY = 'gg-inspector-training-progress-v1';
  const pageModule = Number((location.pathname.match(/module(\d+)\.html/i) || [])[1] || 0);
  let state = readLocal();
  let activeKey = inferActiveKey();
  let lastSentAt = 0;
  let lastSavedAt = 0;

  function readLocal() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (_) { return {}; } }
  function saveLocal() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); render(); }
  function inferActiveKey() {
    if (pageModule === 1 || pageModule === 2) return pageModule + '-' + (Number(new URLSearchParams(location.search).get('ch')) || 1);
    if (pageModule === 4) {
      const section=Number(new URLSearchParams(location.search).get('ch'));
      return '4-' + (section >= 1 && section <= 6 ? section : 1);
    }
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
  function render() {
    document.querySelectorAll('.gg-progress-shell').forEach(function(n){n.remove();});
    const list = items();
    if (list.length) {
      const seconds = list.reduce(function(n,x){ return n + Number((state[x.key]||{}).duration || (window.PART_DURATIONS||{})[x.key] || 0); },0);
      const watched = list.reduce(function(n,x){ const p=state[x.key]||{}; return n + (p.completed ? Number(p.duration || (window.PART_DURATIONS||{})[x.key] || 0) : Number(p.maxTime||0)); },0);
      const pct = seconds ? Math.min(100,Math.round(watched/seconds*100)) : Math.round(list.filter(function(x){return done(x.key);}).length/list.length*100);
      const shell=document.createElement('div'); shell.className='gg-progress-shell'; shell.innerHTML='<div class="gg-progress-card"><div class="gg-progress-head"><span class="gg-progress-title">Training progress & contents</span><span class="gg-progress-percent">'+pct+'% complete</span></div><div class="gg-progress-track"><div class="gg-progress-fill" style="width:'+pct+'%"></div></div><nav class="gg-toc" aria-label="Training table of contents">'+list.map(function(x){return '<a class="gg-toc-item '+(done(x.key)?'is-complete ':'')+(x.key===activeKey?'is-current':'')+'" href="'+(x.href||'#')+'"><span class="gg-watch-dot">'+(done(x.key)?'✓':'')+'</span><span>'+escapeHtml(x.label)+'</span></a>';}).join('')+'</nav></div>';
      const anchor=document.querySelector('.main') || document.querySelector('.module-selector') || document.body;
      anchor.parentNode.insertBefore(shell,anchor);
    }
    items().forEach(function(x){ if(x.el){ x.el.classList.toggle('is-complete',done(x.key)); const old=x.el.querySelector('.gg-watch-badge'); if(old)old.remove(); if(done(x.key))x.el.appendChild(badge()); }});
    document.querySelectorAll('[data-section-key]').forEach(function(link){ link.classList.toggle('is-complete',done(link.dataset.sectionKey)); });
    document.querySelectorAll('.module-card').forEach(function(card,i){
      const prefix=(i+1)+'-'; const keys=Object.keys(state).filter(function(k){return k.indexOf(prefix)===0;});
      const expected=(i===0?3:(i===1?5:(i===3?6:keys.length))); const completed=keys.filter(done).length;
      const moduleDone=expected>0 && completed>=expected;
      card.classList.toggle('is-complete',moduleDone);
      const old=card.querySelector('.gg-watch-badge'); if(old)old.remove();
      if(moduleDone) card.appendChild(badge());
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
        updatedAt:incoming.lastUpdated||local.updatedAt
      });
    });
    saveLocal();
  }
  function boot(){ document.querySelectorAll('video').forEach(bindVideo); render(); pullRemote(); setTimeout(render,250); setTimeout(render,1000); }
  document.addEventListener('gg:progressloaded', mergeAuthoritative);
  document.addEventListener('gg:progresssaved', mergeAuthoritative);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot); else boot();
}());

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
      completed: Boolean(prior.completed || completed),
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
  const REQUIRED_SECTIONS = [
    ['1-1','Introduction: Welcome'],['1-2','Introduction: Rubric'],['1-3','Introduction: Workflow'],
    ['2-1','Rubric: Property Wide'],['2-2','Rubric: Kitchen'],['2-3','Rubric: Bath & Hall'],['2-4','Rubric: Bedroom'],['2-5','Rubric: Common Room'],
    ['4-1','Walkthrough: Property Wide'],['4-2','Walkthrough: Common Room'],['4-3','Walkthrough: Kitchen'],
    ['4-4','Walkthrough: Hallway'],['4-5','Walkthrough: Bathroom'],['4-6','Walkthrough: Bedroom']
  ];
  function requiredLessonsComplete() {
    return REQUIRED_SECTIONS.every(function (section) { return done(section[0]); });
  }
  function authenticated() {
    return Boolean(window.GGTraining && window.GGTraining.isAuthenticated && window.GGTraining.isAuthenticated());
  }
  function priorChaptersComplete(moduleId, chapter) {
    for (let i = 1; i < chapter; i += 1) if (!done(moduleId + '-' + i)) return false;
    return true;
  }
  function enforcePageAccess() {
    if (pageModule === 5 && (!authenticated() || !requiredLessonsComplete())) {
      location.replace('index.html');
      return false;
    }
    if ((pageModule === 1 || pageModule === 2 || pageModule === 4) && activeKey) {
      const chapter = Number(activeKey.split('-')[1]);
      if (!priorChaptersComplete(pageModule, chapter)) {
        let available = 1;
        while (done(pageModule + '-' + available)) available += 1;
        const target = pageModule === 4
          ? 'module4.html?ch=' + available
          : 'module' + pageModule + '.html#ch=' + available;
        if (pageModule === 1 || pageModule === 2) {
          history.replaceState(null, '', target);
          location.reload();
        } else {
          location.replace(target);
        }
        return false;
      }
    }
    return true;
  }
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
    if (!total) return 0;
    const percent = Math.round(watched / total * 100);
    return Object.keys(durations).every(done) ? 100 : Math.min(99, percent);
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
        compact.title = 'Overall required training progress: ' + pct + '%';
        compact.innerHTML =
          '<button class="gg-header-progress-toggle" type="button" aria-expanded="false">' +
            '<span class="gg-header-progress-label">PROGRESS</span><span class="gg-header-progress-track" role="progressbar" aria-label="Overall required training progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'"><span class="gg-header-progress-fill" style="width:'+pct+'%"></span></span><span class="gg-header-progress-value">'+pct+'%</span><span class="gg-header-progress-arrow" aria-hidden="true">▼</span>' +
          '</button><div class="gg-progress-panel" hidden><div class="gg-progress-panel-title">Completed training sections</div><div class="gg-progress-sections">' +
          REQUIRED_SECTIONS.map(function(section){
            const complete=done(section[0]);
            return '<div class="gg-progress-section'+(complete?' is-complete':'')+'"><span class="gg-progress-section-mark">'+(complete?'✓':'')+'</span><span>'+escapeHtml(section[1])+'</span></div>';
          }).join('') + '</div></div>';
        const toggle=compact.querySelector('.gg-header-progress-toggle');
        const panel=compact.querySelector('.gg-progress-panel');
        toggle.addEventListener('click',function(){
          const expanded=toggle.getAttribute('aria-expanded')==='true';
          toggle.setAttribute('aria-expanded',String(!expanded));
          panel.hidden=expanded;
        });
        const theme = header.querySelector('.theme-toggle');
        header.insertBefore(compact, theme || null);
      }
    }
    items().forEach(function(x){ if(x.el){ x.el.classList.toggle('is-complete',done(x.key)); const old=x.el.querySelector('.gg-watch-badge'); if(old)old.remove(); if(done(x.key))x.el.appendChild(badge()); }});
    document.querySelectorAll('[data-section-key]').forEach(function(link){ link.classList.toggle('is-complete',done(link.dataset.sectionKey)); });
    document.querySelectorAll('.chapter-btn[data-ch]').forEach(function(button){
      const chapter = Number(button.dataset.ch);
      const complete = done(pageModule + '-' + chapter);
      const locked = !priorChaptersComplete(pageModule, chapter);
      button.classList.toggle('is-complete', complete);
      button.classList.toggle('is-locked', locked);
      button.disabled = locked;
      button.setAttribute('aria-label', 'Chapter ' + chapter + (locked ? ', locked until previous chapter is complete' : (complete ? ', completed' : ', not completed')));
    });
    document.querySelectorAll('.section-link[data-section-key]').forEach(function(link){
      const parts=link.dataset.sectionKey.split('-'), chapter=Number(parts[1]);
      const locked=!priorChaptersComplete(Number(parts[0]),chapter);
      link.classList.toggle('is-locked',locked);
      link.setAttribute('aria-disabled',String(locked));
      if(locked) link.setAttribute('tabindex','-1'); else link.removeAttribute('tabindex');
      link.onclick=locked?function(event){event.preventDefault();}:null;
    });
    document.querySelectorAll('.module-card[data-module]').forEach(function(card){
      const moduleId=Number(card.dataset.module);
      const prefix=moduleId+'-';
      const keys=Object.keys(state).filter(function(k){return k.indexOf(prefix)===0;});
      const expected={1:3,2:5,4:6,5:1}[moduleId]||0;
      const completed=keys.filter(done).length;
      const moduleDone=expected>0 && completed>=expected;
      const examLocked=moduleId===5 && (!authenticated() || !requiredLessonsComplete());
      const firstIncomplete=Array.from({length:expected},function(_,index){return index+1;})
        .find(function(chapter){return !done(moduleId+'-'+chapter);});
      if(firstIncomplete && (moduleId===1 || moduleId===2)) {
        card.href='module'+moduleId+'.html#ch='+firstIncomplete;
        card.title='Resume at Chapter '+firstIncomplete;
      } else if(firstIncomplete && moduleId===4) {
        card.href='module4.html?ch='+firstIncomplete;
        card.title='Resume at Chapter '+firstIncomplete;
      } else if(moduleId===1 || moduleId===2 || moduleId===4) {
        card.href='module'+moduleId+'.html';
        card.removeAttribute('title');
      }
      card.classList.toggle('is-complete',moduleDone);
      card.classList.toggle('is-locked',examLocked);
      card.setAttribute('aria-disabled',String(examLocked));
      if(examLocked) {
        card.removeAttribute('href');
        card.title=authenticated()
          ? 'Complete all lesson chapters to unlock the certification exam'
          : 'Sign in through the GuestGuard portal to take the certification exam';
        if(!card.querySelector('.module-card-lock')) {
          const lock=document.createElement('span');
          lock.className='module-card-lock';
          lock.textContent=authenticated()
            ? 'Locked until all chapters are complete'
            : 'Sign in through the GuestGuard portal';
          card.appendChild(lock);
        }
      } else {
        const lock=card.querySelector('.module-card-lock'); if(lock) lock.remove();
        if(moduleId===5) { card.href='module5.html'; card.removeAttribute('title'); }
      }
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
    video.addEventListener('ended',function(){
      // Authenticated completion is granted only after the portal confirms the
      // gg:partend save. Unauthenticated local previews may retain local state,
      // but can never unlock the certification exam.
      update(video,!authenticated());
      sync(keyFor(video),true);
    });
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
        completed:authenticated() ? Boolean(incoming.completed) : Boolean(local.completed||incoming.completed),
        currentSection:authenticated()
          ? (Number(incoming.currentSegment)||0)
          : Math.max(Number(local.currentSection)||0,Number(incoming.currentSegment)||0),
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
    // The portal response is authoritative. Hydrate it before enforcing direct
    // chapter/exam access so a completed learner is not redirected on a new
    // device merely because localStorage starts empty.
    if (authenticated() && window.GGTraining.progress) {
      REQUIRED_SECTIONS.concat([['5-1','Certification exam']]).forEach(function(section){
        const key=section[0], incoming=window.GGTraining.progress[key]||{};
        const total=Number(incoming.totalSegments)||Number((window.SECTION_TIMINGS||{})[key]?.durations?.length)||1;
        state[key]=Object.assign({},state[key]||{}, {
          completed:Boolean(incoming.completed),
          currentSection:Number(incoming.currentSegment)||0,
          maxTime:typeof window.partPercent==='function'
            ? (Number((window.PART_DURATIONS||{})[key])||0)*window.partPercent(key,Number(incoming.currentSegment)||0)/100
            : 0,
          duration:Number((window.PART_DURATIONS||{})[key])||0,
          updatedAt:incoming.lastUpdated||null,
          totalSegments:total
        });
      });
      saveLocal();
    }
    if (!enforcePageAccess()) return;
    document.querySelectorAll('video').forEach(bindVideo);
    render();
    pullRemote();
    setTimeout(render,250);
    setTimeout(render,1000);
  }
  document.addEventListener('gg:progressloaded', mergeAuthoritative);
  document.addEventListener('gg:progresssaved', mergeAuthoritative);
  document.addEventListener('gg:progressreset', function () {
    state = {};
    saveLocal();
  });
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
  function bootWhenReady() {
    if (window.GGTraining && !window.GGTraining.ready) {
      document.addEventListener('gg:ready', boot, { once:true });
      return;
    }
    boot();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootWhenReady); else bootWhenReady();
}());

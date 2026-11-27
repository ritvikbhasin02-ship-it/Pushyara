/* Pushyara — app shell. Data files are fetched from ./data. All untrusted text goes through esc()/sanitize(). */
(function () {
'use strict';
const BRAND = 'Pushyara';
const PASS = 0.7;                                   // mastery threshold
const TIERS = { free: 0, learner: 1, pro: 2, owner: 3 };
const stageTier = n => n <= 0 ? 'free' : n <= 6 ? 'learner' : 'pro';
const DAY = 864e5;

/* ---------- utilities ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayStr = (d = new Date()) => ymd(new Date(d.getTime() - 4 * 3600e3)); // study day runs 4 AM to 4 AM, so an 11 PM session that ends after midnight still counts
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
                set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const ALLOWED = new Set(['P','H2','H3','H4','UL','OL','LI','STRONG','EM','B','I','BR','TABLE','THEAD','TBODY','TR','TH','TD','DIV','SPAN','BLOCKQUOTE','CODE','SMALL','SUP','SUB','HR']);
const CLASSES = new Set(['you','schools','cross','keypts','note','eyebrow','skt','muted','tbl','mono','small','tm','status']);
function sanitize(html) {
  const t = document.createElement('template');
  t.innerHTML = String(html).replace(/\{\{term:([a-z0-9_-]+)\|([^}]*)\}\}/gi, (m, k, l) => `<span class="tm" data-k="${esc(k)}">${esc(l)}</span>`);
  (function walk(node) {
    for (const ch of [...node.childNodes]) {
      if (ch.nodeType === 8) { ch.remove(); continue; }
      if (ch.nodeType !== 1) continue;
      if (!ALLOWED.has(ch.tagName)) { if (['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','FORM','INPUT','TEXTAREA','SELECT','BUTTON','IMG','VIDEO','AUDIO','LINK','META','BASE','TEMPLATE','NOSCRIPT'].includes(ch.tagName)) { ch.remove(); continue; }
        ch.replaceWith(...ch.childNodes); walk(node); return; }
      for (const a of [...ch.attributes]) {
        const n = a.name.toLowerCase();
        if (n === 'class') { const keep = a.value.split(/\s+/).filter(c => CLASSES.has(c)); keep.length ? ch.setAttribute('class', keep.join(' ')) : ch.removeAttribute('class'); }
        else if ((n === 'colspan' || n === 'rowspan') && /^\d{1,2}$/.test(a.value)) {}
        else if (n === 'data-k' && ch.classList.contains('tm') && /^[a-z0-9_-]+$/i.test(a.value)) {}
        else if (n === 'lang' && /^[a-z-]{2,8}$/i.test(a.value)) {}
        else ch.removeAttribute(a.name);
      }
      walk(ch);
    }
  })(t.content);
  for (const s of t.content.querySelectorAll('span.tm')) {
    const k = s.dataset.k, b = document.createElement('button');
    b.className = 'term'; b.type = 'button'; b.dataset.term = k; b.textContent = s.textContent;
    if (TERMS[k]) s.replaceWith(b); else s.replaceWith(document.createTextNode(s.textContent));
  }
  for (const tb of t.content.querySelectorAll('table')) if (!tb.parentElement || !tb.parentElement.classList.contains('tbl')) { const w = document.createElement('div'); w.className = 'tbl'; tb.replaceWith(w); w.appendChild(tb); }
  return t.content;
}
async function getJSON(path) { const r = await fetch(path); if (!r.ok) throw new Error(path + ' ' + r.status); return r.json(); }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ---------- state ---------- */
let MANIFEST = null, TERMS = {}, LESSONS = [], byId = {};
const stageCache = {};
let ledger = store.get('jp-ledger', []);
let progress = store.get('jp-progress', { done: {}, scores: {}, plan: null, strict: true, onboarded: false });
if (!progress || typeof progress !== 'object') progress = {};
if (!progress.scores || typeof progress.scores !== 'object') progress.scores = {};
if (!progress.done || typeof progress.done !== 'object') progress.done = {};
for (const k of Object.keys(progress.scores)) if (progress.scores[k] == null) delete progress.scores[k];
if (progress.strict == null) progress.strict = true;
if (!Array.isArray(ledger)) ledger = [];
for (const [k, v] of Object.entries(progress.scores)) if (typeof v === 'number') progress.scores[k] = { best: v, last: v, n: 1, hist: [] };
let daily = null, user = null, db = null, uid = null, owner = false, tts = null;
let syncState = 'local';
window.APP = { esc, sanitize, getJSON, store, get db() { return db; }, get uid() { return uid; }, get owner() { return owner; }, openDlg, closeDlg, setSync, todayStr, kundliSVG: null };

/* ---------- tiers and gating ---------- */
function plan() { return owner && !progress.previewPlan ? 'owner' : (progress.previewPlan || progress.plan || 'free'); }
function hasTier(n) { return TIERS[plan()] >= TIERS[stageTier(n)]; }
function lessonDone(id) { const s = progress.scores[id]; return !!(progress.done[id] && s && s.best >= PASS); }
function stageComplete(st) { return st.lessons.every(l => lessonDone(l.id)); }
function stageUnlocked(n) {
  if (!progress.strict || n <= 1) return true;
  const prev = MANIFEST.stages.find(s => s.n === n - 1); return !prev || stageComplete(prev);
}
function access(l) { // returns null if open, else reason
  if (l.extra) return hasTier(1) ? null : 'learner';
  if (!hasTier(l.stage)) return stageTier(l.stage);
  if (!stageUnlocked(l.stage)) return 'mastery';
  return null;
}
function nextLesson() { return LESSONS.find(l => !l.extra && !lessonDone(l.id) && !access(l)) || null; }
function reviewDue() {
  const now = Date.now(), out = [];
  for (const l of LESSONS) { const s = progress.scores[l.id]; if (!s || !progress.done[l.id]) continue;
    const last = s.at ? Date.parse(s.at) : Date.parse(progress.done[l.id]); const gap = [3, 7, 21, 60][Math.min(s.n - 1, 3)] * DAY;
    if (s.best < 0.9 && now - last > gap) out.push(l); }
  return out.slice(0, 5);
}
function streak() {
  const days = new Set(Object.values(progress.done || {}).concat(Object.values(progress.scores || {}).map(s => s && s.at ? todayStr(new Date(s.at)) : null)).filter(Boolean)); let n = 0; const d = new Date(Date.now() - 4 * 3600e3);
  if (!days.has(ymd(d))) d.setDate(d.getDate() - 1);
  while (days.has(ymd(d))) { n++; d.setDate(d.getDate() - 1); }
  // one free miss per 7 days (forgiving streak)
  return n;
}

/* ---------- sync ---------- */
function setSync(t) { syncState = t; const s = $('#sync'); if (s) s.textContent = t === 'account' ? 'Saved to your account' : t === 'error' ? 'Not synced — will retry' : t === 'saving' ? 'Saving…' : 'Saved on this device'; }
function mergeProgress(a, b) {
  const out = { ...a, done: { ...a.done }, scores: { ...a.scores } };
  for (const [k, v] of Object.entries(b.done || {})) if (!out.done[k] || v < out.done[k]) out.done[k] = v;
  for (const [k, v0] of Object.entries(b.scores || {})) { const v = typeof v0 === 'number' ? { best: v0, last: v0, n: 1, hist: [] } : v0, c = out.scores[k];
    out.scores[k] = !c ? v : { best: Math.max(c.best, v.best), last: (c.at || '') >= (v.at || '') ? c.last : v.last, at: (c.at || '') >= (v.at || '') ? c.at : v.at, n: Math.max(c.n || 1, v.n || 1), hist: (c.hist || []).concat(v.hist || []).filter((x, i, arr) => arr.findIndex(y => y.at === x.at) === i).slice(-20) }; }
  for (const k of ['plan', 'strict', 'onboarded', 'previewPlan']) if (out[k] == null && b[k] != null) out[k] = b[k];
  return out;
}
let saveTimer = null, saving = false;
function save() { store.set('jp-progress', progress); clearTimeout(saveTimer); saveTimer = setTimeout(pushProgress, 600); }
async function pushProgress() {
  if (!db || !uid) return; if (saving) { saveTimer = setTimeout(pushProgress, 800); return; }
  saving = true; setSync('saving');
  try { await db.doc(`data/users/${uid}/progress`).set(JSON.parse(JSON.stringify(progress))); setSync('account'); }
  catch (e) { setSync('error'); saveTimer = setTimeout(pushProgress, 30000); }
  saving = false;
}
async function initAccount() {
  try {
    const [d, u] = await Promise.all([window.claude?.use?.('db'), window.claude?.use?.('user')]);
    if (!d || !u) return; db = d; user = u;
    uid = await u.id(); owner = (await u.isOwner?.()) ?? false; if (!uid) { db = null; return; }
    const snap = await db.doc(`data/users/${uid}/progress`).get();
    if (snap.exists) progress = mergeProgress(progress, JSON.parse(JSON.stringify(snap.data() || {})));
    store.set('jp-progress', progress); await pushProgress();
    try { const ds = await db.doc(`data/users/${uid}/daily`).get(); if (ds.exists) daily = ds.data(); } catch (e) {}
    try { const ls = await db.collection(`data/users/${uid}/ledger`).get(); const remote = []; for (const x of (ls.docs || [])) remote.push({ id: x.id, ...JSON.parse(JSON.stringify(x.data() || {})) });
      const ids = new Set(remote.map(x => x.id)); for (const x of ledger) if (!ids.has(x.id)) { remote.push(x); db.doc(`data/users/${uid}/ledger/${x.id}`).set(x).catch(() => {}); }
      ledger = remote; store.set('jp-ledger', ledger); } catch (e) {}
    softRender();
  } catch (e) { setSync('local'); }
}

/* ---------- data ---------- */
async function loadManifest() {
  MANIFEST = await getJSON('data/manifest.json');
  TERMS = await getJSON('data/terms.json');
  LESSONS = [];
  for (const st of MANIFEST.stages) for (const l of st.lessons) LESSONS.push({ ...l, stage: st.n });
  for (const l of MANIFEST.extras) LESSONS.push({ ...l, stage: 1, extra: true });
  byId = {}; for (const l of LESSONS) if (!byId[l.id]) byId[l.id] = l;
}
async function loadLesson(id) {
  const l = byId[id]; if (!l) return null;
  const file = l.extra ? 'data/extras.json' : `data/stage-${String(l.stage).padStart(2, '0')}.json`;
  if (!stageCache[file]) stageCache[file] = getJSON(file);
  const st = await stageCache[file];
  const full = st.lessons.find(x => String(x.id) === String(id));
  if (!full) return null;
  full.quiz = (full.quiz || []).map(q => ({ q: String(q.q), o: (q.o || []).map(String), a: Number(q.a), w: String(q.w || '') })).filter(q => Number.isInteger(q.a) && q.a >= 0 && q.a < q.o.length);
  return full;
}

/* ---------- dialogs ---------- */
const dlg = $('#dlg'), dlgBody = $('#dlg-body');
let dlgGuard = null;
function openDlg(node, guard) { dlgBody.textContent = ''; dlgBody.append(node); dlgGuard = guard || null; if (!dlg.open) dlg.showModal(); const f = dlgBody.querySelector('button,[href],input'); f && f.focus(); }
function closeDlg() { dlgGuard = null; if (dlg.open) dlg.close(); }
dlg.addEventListener('cancel', e => { if (dlgGuard) { e.preventDefault(); dlgGuard(); } });
dlg.addEventListener('click', e => { if (e.target === dlg) { if (dlgGuard) dlgGuard(); else closeDlg(); } });
function h(html) { const t = document.createElement('template'); t.innerHTML = html; return t.content; } // trusted, app-authored templates only
function openTerm(k) {
  const t = TERMS[k]; if (!t) return;
  const n = h(`<h2 id="dlg-title"></h2><p></p><div class="row"><button class="btn" type="button">Got it</button></div>`);
  n.querySelector('h2').textContent = t[0]; n.querySelector('p').textContent = t[1]; n.querySelector('button').onclick = closeDlg; openDlg(n);
}
document.addEventListener('click', e => { const t = e.target.closest('button.term[data-term]'); if (t) { e.preventDefault(); openTerm(t.dataset.term); } });

function confetti(n) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas'); c.className = 'confetti'; c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio; document.body.appendChild(c);
  const x = c.getContext('2d'), cs = getComputedStyle(document.documentElement), cols = ['--kumkum', '--haldi', '--mor', '--neel'].map(v => cs.getPropertyValue(v).trim());
  const ps = Array.from({ length: n }, () => ({ x: c.width / 2, y: c.height * .55, vx: (Math.random() - .5) * 18 * devicePixelRatio, vy: (-Math.random() * 16 - 6) * devicePixelRatio, r: (4 + Math.random() * 5) * devicePixelRatio, c: cols[Math.floor(Math.random() * 4)], a: Math.random() * 6 }));
  let t = 0; (function f() { x.clearRect(0, 0, c.width, c.height); for (const p of ps) { p.vy += .45 * devicePixelRatio; p.x += p.vx; p.y += p.vy; p.a += .2; x.fillStyle = p.c; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); x.restore(); }
    if (++t < 110) requestAnimationFrame(f); else c.remove(); })();
}
function updateStreakPill() { const n = $('#streak-n'); if (n) n.textContent = streak(); }

const NAKS_T = 'Ashwini ✦ Bharani ✦ Krittika ✦ Rohini ✦ Mrigashira ✦ Ardra ✦ Punarvasu ✦ Pushya ✦ Ashlesha ✦ Magha ✦ Purva Phalguni ✦ Uttara Phalguni ✦ Hasta ✦ Chitra ✦ Swati ✦ Vishakha ✦ Anuradha ✦ Jyeshtha ✦ Mula ✦ Purva Ashadha ✦ Uttara Ashadha ✦ Shravana ✦ Dhanishta ✦ Shatabhisha ✦ Purva Bhadrapada ✦ Uttara Bhadrapada ✦ Revati';
/* ---------- views ---------- */
const view = $('#view');
let route = '';
function setTab(t) { for (const a of document.querySelectorAll('nav.tabs a')) a.setAttribute('aria-current', a.dataset.tab === t ? 'page' : 'false'); }
function wheelSVG() {
  let s = '<svg class="wheel" viewBox="-110 -110 220 220" aria-hidden="true"><circle r="100" fill="none" stroke="currentColor" stroke-width="1.5"/><circle r="72" fill="none" stroke="currentColor"/><circle r="40" fill="none" stroke="currentColor"/>';
  for (let i = 0; i < 27; i++) { const a = i * 2 * Math.PI / 27; s += `<line x1="${(72 * Math.cos(a)).toFixed(1)}" y1="${(72 * Math.sin(a)).toFixed(1)}" x2="${(100 * Math.cos(a)).toFixed(1)}" y2="${(100 * Math.sin(a)).toFixed(1)}" stroke="currentColor"/>`; }
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; s += `<line x1="${(40 * Math.cos(a)).toFixed(1)}" y1="${(40 * Math.sin(a)).toFixed(1)}" x2="${(72 * Math.cos(a)).toFixed(1)}" y2="${(72 * Math.sin(a)).toFixed(1)}" stroke="currentColor" stroke-width="1.5"/>`; }
  return s + '</svg>';
}
function lessonLabel(l) { return l.extra ? 'Sister science' : `Stage ${l.stage} · Lesson ${l.id}`; }
function lockLabel(r) { return r === 'mastery' ? 'Pass the previous stage' : r === 'learner' ? '₹399 plan' : r === 'pro' ? '₹999 plan' : ''; }

function renderToday() {
  setTab('today');
  const nx = nextLesson(), done = Object.keys(progress.done).filter(k => byId[k] && lessonDone(k)).length, total = LESSONS.filter(l => !l.extra).length;
  const scores = Object.values(progress.scores).map(s => s.best); const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) + '%' : '—';
  const rev = reviewDue();
  view.innerHTML = `
  <section class="card hero" aria-labelledby="t-h">${wheelSVG()}
    <div class="eyebrow">Tonight’s lesson</div>
    ${nx ? `<div class="t" id="t-h">${esc(nx.title)}</div><div class="muted">${esc(lessonLabel(nx))} · ${nx.mins} min</div>
      <div class="row"><a class="btn accent" href="#${esc(nx.id)}">Start</a><a class="btn ghost" href="#learn">All lessons</a></div>`
    : `<div class="t" id="t-h">You are up to date.</div><p class="muted">Review a past lesson below, or open the Life Report.</p>`}
  </section>
  <div class="grid2 stats3" style="margin-top:12px">
    <div class="card stat"><span class="eyebrow">Streak</span><b>${streak()} night${streak() === 1 ? '' : 's'}</b></div>
    <div class="card stat"><span class="eyebrow">Mastered</span><b>${done} / ${total}</b><div class="progressbar" aria-hidden="true"><i style="width:${Math.round(done / Math.max(1, total) * 100)}%"></i></div></div>
    <div class="card stat"><span class="eyebrow">Avg score</span><b>${avg}</b></div>
  </div>
  <section class="card" style="margin-top:12px" id="brief" aria-label="Tomorrow's brief"></section>
  ${rev.length ? `<h2>Review due</h2><p class="muted">Short quiz retakes, spaced out so the ideas stick.</p><ul class="lessons">${rev.map(l => `<li><a href="#${esc(l.id)}"><span class="num">${esc(l.id)}</span><span>${esc(l.title)}</span><span class="end">${Math.round(progress.scores[l.id].best * 100)}%</span></a></li>`).join('')}</ul>` : ''}
  <div class="ticker" aria-hidden="true"><span>${(NAKS_T + ' ✦ ' + NAKS_T + ' ✦ ')}</span></div>
  <h2>The <span class="hl">11 PM</span> routine</h2>
  <ol><li><strong>10 min</strong> — read tomorrow’s brief and plan the day</li><li><strong>15 min</strong> — tonight’s lesson</li><li><strong>5 min</strong> — its quiz (70% to master it)</li><li><strong>5 min</strong> — log one prediction in the <a href="#ledger">Ledger</a>; score yesterday’s</li></ol>`;
  renderBrief();
}
function renderBrief() {
  const el = $('#brief'); if (!el) return; el.textContent = '';
  const add = (tag, txt, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; n.textContent = txt; el.appendChild(n); return n; };
  if (!daily || typeof daily !== 'object') { add('div', 'Tomorrow’s brief', 'eyebrow'); add('p', 'Your scheduled task writes it here each night before 11 PM: grade for the day, Moon and tara, Rahu Kaal, what to do and avoid, and the week and month ahead — each checked across several systems.', 'muted'); return; }
  const s = v => typeof v === 'string' ? v : '';
  const top = add('div', `Brief for ${s(daily.date)}`, 'eyebrow');
  if (['A', 'B', 'C'].includes(daily.grade)) { const g = document.createElement('span'); g.className = 'grade ' + daily.grade; g.textContent = daily.grade; g.style.marginLeft = '8px'; top.appendChild(g); }
  if (daily.headline) add('h3', s(daily.headline));
  const facts = [['Moon', daily.moon], ['Tithi', daily.tithi], ['Tara', daily.tara], ['Rahu Kaal', daily.rahu_kaal], ['Dasha', daily.dasha]].filter(f => typeof f[1] === 'string' && f[1]);
  if (facts.length) { const ul = document.createElement('ul'); for (const [k, v] of facts) { const li = document.createElement('li'), b = document.createElement('strong'); b.textContent = k + ': '; li.append(b, document.createTextNode(v)); ul.appendChild(li); } el.appendChild(ul); }
  const list = (label, arr) => { if (!Array.isArray(arr) || !arr.length) return; add('div', label, 'eyebrow'); const ul = document.createElement('ul'); for (const x of arr) if (typeof x === 'string') { const li = document.createElement('li'); li.textContent = x; ul.appendChild(li); } el.appendChild(ul); };
  list('Do', daily.do); list('Avoid', daily.avoid);
  if (daily.week) { add('div', 'Next 7 days', 'eyebrow'); add('p', s(daily.week)); }
  if (daily.month) { add('div', 'Next 30 days', 'eyebrow'); add('p', s(daily.month)); }
  if (daily.lesson) add('p', 'Sky lesson: ' + s(daily.lesson), 'muted');
  if (daily.crosscheck) add('p', 'Cross-check: ' + s(daily.crosscheck), 'status');
}

function renderLearn() {
  setTab('learn');
  const nx = nextLesson(), here = nx ? nx.stage : -1;
  const parts = [`<h1>Your <span class="hl">path</span></h1><p class="muted">13 stages, easy to hard. Each lesson ends in a quiz — hit 70% to master it.${progress.strict ? ' Master a stage to unlock the next.' : ''}</p><div class="path">`];
  for (const st of MANIFEST.stages) {
    const mastered = st.lessons.filter(l => lessonDone(l.id)).length, frac = mastered / Math.max(1, st.lessons.length);
    const tierLock = !hasTier(st.n) ? lockLabel(stageTier(st.n)) : '', gate = !stageUnlocked(st.n);
    const cls = frac === 1 ? 'done' : (tierLock || gate) ? 'locked' : '';
    const C = 2 * Math.PI * 30, ring = cls === 'done' ? '' : `<svg viewBox="0 0 66 66" aria-hidden="true"><circle cx="33" cy="33" r="30" fill="none" stroke="transparent" stroke-width="4"/><circle cx="33" cy="33" r="30" fill="none" stroke="var(--ink)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(C * frac).toFixed(1)} ${C.toFixed(1)}"/></svg>`;
    const SC = ['--yellow','--lime','--pink','--blue','--purple','--green','--red'];
    parts.push(`<details class="stage${st.n === here ? ' here' : ''}" ${st.n === here ? 'open' : ''}><summary><span class="node ${cls}" style="--c:var(${SC[st.n % SC.length]})">${ring}<b>${cls === 'done' ? '✓' : st.n}</b></span><span class="tt"><b>${esc(st.title)}</b><span class="small muted">${esc(st.level)} · ${mastered}/${st.lessons.length} mastered</span></span>${tierLock ? `<span class="lock">${esc(tierLock)}</span>` : gate ? `<span class="lock">Locked</span>` : ''}<span class="chev" aria-hidden="true">›</span></summary>
      <div class="inner">${st.goal ? `<p class="small muted" style="margin-top:0">Done when you can: ${esc(st.goal.replace(/^done when you can:?\s*/i, ''))}</p>` : ''}
      <ul class="lessons">${st.lessons.map(l => { const L = byId[l.id], r = access(L), d = lessonDone(l.id), sc = progress.scores[l.id];
        return r ? `<li><span class="locked"><span class="num">${esc(l.id)}</span><span>${esc(l.title)}</span><span class="end">${esc(lockLabel(r))}</span></span></li>`
                 : `<li><a href="#${esc(l.id)}"><span class="num">${esc(l.id)}</span><span>${esc(l.title)}</span><span class="end ${d ? 'done-mark' : ''}">${d ? '✓ ' + Math.round(sc.best * 100) + '%' : sc ? 'Retake · ' + Math.round(sc.best * 100) + '%' : l.mins + ' min'}</span></a></li>`; }).join('')}</ul></div></details>`);
  }
  parts.push(`<details class="stage"><summary><span class="node"><b>✦</b></span><span class="tt"><b>Sister sciences</b><span class="small muted">Electives</span></span><span class="chev" aria-hidden="true">›</span></summary><div class="inner"><ul class="lessons">${MANIFEST.extras.map(l => `<li><a href="#${esc(l.id)}"><span class="num">✦</span><span>${esc(l.title)}</span><span class="end">${l.mins} min</span></a></li>`).join('')}</ul></div></details></div>`);
  view.innerHTML = parts.join('');
  const hereEl = view.querySelector('details.here'); hereEl && hereEl.scrollIntoView({ block: 'start' });
}

let ttsBound = false;
async function renderLesson(id) {
  setTab('learn');
  const meta = byId[id]; if (!meta) return renderToday();
  const r = access(meta);
  if (r) { view.innerHTML = `<article class="lesson"><div class="meta"><span class="eyebrow">${esc(lessonLabel(meta))}</span></div><h1>${esc(meta.title)}</h1><div class="card"><p>${r === 'mastery' ? 'This stage opens when you master every lesson of the stage before it. Mastery means 70% or more on a lesson’s quiz.' : `This lesson is part of the ${esc(lockLabel(r))}.`}</p><div class="row">${r === 'mastery' ? '<a class="btn" href="#learn">See your progress</a>' : '<a class="btn accent" href="#plans">See plans</a>'}</div></div></article>`; return; }
  view.innerHTML = `<p class="muted">Loading lesson…</p>`;
  let l; try { l = await loadLesson(id); } catch (e) { l = null; }
  if (route !== id) return;  // user navigated away meanwhile
  if (!l) { view.innerHTML = `<h1>Lesson not available</h1><p>This lesson could not be loaded. Check your connection and try again.</p><a class="btn" href="#learn">Back to lessons</a>`; return; }
  const idx = LESSONS.indexOf(meta), prev = LESSONS[idx - 1], next = LESSONS[idx + 1], s = progress.scores[id];
  view.innerHTML = `<article class="lesson"><div class="meta"><span class="eyebrow">${esc(lessonLabel(meta))}</span><span>${meta.mins} min</span>${lessonDone(id) ? `<span class="pill teal">Mastered · ${Math.round(s.best * 100)}%</span>` : s ? `<span class="pill rose">Best ${Math.round(s.best * 100)}% — retake to master</span>` : ''}</div>
    <h1 id="lesson-h"></h1><div class="row" id="listen-row" hidden><button class="btn ghost small" id="listen" type="button">▶ Listen to the summary</button></div>
    <nav id="toc" aria-label="In this lesson"></nav><div id="lesson-body"></div>
    <div class="card" style="margin-top:24px"><div class="eyebrow">Check yourself</div><p>${l.quiz.length} questions. Score 70% or more to master this lesson.</p><button class="btn accent" id="quiz-btn" type="button">${lessonDone(id) ? 'Retake the quiz' : 'Take the quiz'}</button></div>
    <nav class="lesson-nav" aria-label="Lesson navigation">${prev ? `<a class="btn ghost" href="#${esc(prev.id)}">← ${esc(prev.title)}</a>` : '<span></span>'}${next && !access(next) ? `<a class="btn ghost" href="#${esc(next.id)}">${esc(next.title)} →</a>` : '<span></span>'}</nav></article>`;
  $('#lesson-h').textContent = l.title;
  const body = $('#lesson-body'); body.append(sanitize(l.body || ''));
  if (Array.isArray(l.sources) && l.sources.length) { const p = document.createElement('p'); p.className = 'status'; p.textContent = 'Sources: ' + l.sources.map(String).join(' · '); body.appendChild(p); }
  const hs = body.querySelectorAll('h2');
  if (hs.length > 2) { const t = $('#toc'); const ol = document.createElement('ol'); ol.className = 'toc small'; hs.forEach((h2, i) => { h2.id = 'sec-' + i; const li = document.createElement('li'), a = document.createElement('a'); a.href = '#' + id; a.textContent = h2.textContent; a.onclick = e => { e.preventDefault(); h2.scrollIntoView({ behavior: 'smooth' }); }; li.appendChild(a); ol.appendChild(li); }); t.append(ol); }
  for (const w of body.querySelectorAll('.tbl')) if (w.scrollWidth > w.clientWidth + 4) w.classList.add('scrolls');
  $('#quiz-btn').onclick = () => openQuiz(meta, l);
  if (tts && l.listen) { $('#listen-row').hidden = false; $('#listen').onclick = () => { const b = $('#listen'); if (b.dataset.on) tts.stop(); else tts.speak(String(l.listen).slice(0, 2000)).catch(() => {}); }; }
  const pos = store.get('jp-pos', {})[id]; window.scrollTo(0, pos && !lessonDone(id) ? pos : 0);
  $('#readbar').hidden = false;
}

function openQuiz(meta, l) {
  const qs = l.quiz.map(q => ({ ...q, order: shuffle(q.o.map((_, i) => i)) }));
  if (!qs.length) { const n = h(`<h2 id="dlg-title">No quiz for this lesson yet</h2><p>This lesson has no questions yet, so it cannot be mastered.</p><div class="row"><button class="btn" type="button">Close</button></div>`); n.querySelector('button').onclick = closeDlg; openDlg(n); return; }
  let i = 0, right = 0, answered = false;
  const guard = () => { if (i === 0 && !answered) return closeDlg();
    const n = h(`<h2 id="dlg-title">Leave the quiz?</h2><p>Your answers so far will not be saved.</p><div class="row"><button class="btn" type="button" data-a="stay">Keep going</button><button class="btn ghost" type="button" data-a="leave">Leave</button></div>`);
    n.querySelector('[data-a=stay]').onclick = step; n.querySelector('[data-a=leave]').onclick = closeDlg; openDlg(n, guard); };
  const step = () => {
    if (i >= qs.length) return finish();
    const q = qs[i]; answered = false;
    const n = h(`<div class="qdots" aria-hidden="true">${qs.map((x, j) => `<i class="${j < i ? (x.ok ? 'ok' : 'no') : j === i ? 'cur' : ''}"></i>`).join('')}</div><div class="eyebrow">Question ${i + 1} of ${qs.length}</div><h2 id="dlg-title"></h2><div class="opts"></div><p id="why" role="status" aria-live="polite" hidden></p><div class="row"><button class="btn accent" type="button" id="next-q" hidden>${i + 1 < qs.length ? 'Next question' : 'See result'}</button></div>`);
    n.querySelector('h2').textContent = q.q;
    const box = n.querySelector('.opts');
    q.order.forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.textContent = q.o[k]; b.dataset.k = k;
      b.onclick = () => { if (answered) return; answered = true; for (const x of box.children) { x.disabled = true; if (+x.dataset.k === q.a) x.classList.add('right'); }
        q.ok = k === q.a; if (q.ok) right++; else b.classList.add('wrong');
        const w = dlgBody.querySelector('#why'); w.hidden = false; w.textContent = (k === q.a ? 'Correct. ' : 'Not quite. ') + q.w;
        const nb = dlgBody.querySelector('#next-q'); nb.hidden = false; nb.onclick = () => { i++; step(); }; nb.focus(); };
      box.appendChild(b); });
    openDlg(n, guard);
  };
  const finish = () => {
    const score = right / qs.length, at = new Date().toISOString(), prev = progress.scores[meta.id];
    progress.scores[meta.id] = { best: Math.max(prev ? prev.best : 0, score), last: score, at, n: (prev ? prev.n : 0) + 1, hist: ((prev && prev.hist) || []).concat([{ at, s: score }]).slice(-20) };
    const passed = score >= PASS; if (passed && !progress.done[meta.id]) progress.done[meta.id] = todayStr();
    save();
    const nx = nextLesson(); const st = MANIFEST.stages.find(x => x.n === meta.stage); const stageDone = passed && !meta.extra && st && stageComplete(st);
    if (passed) confetti(stageDone ? 260 : 120);
    const n = h(`<div class="big-result">${right}/${qs.length}</div><h2 id="dlg-title">${stageDone ? `Stage ${meta.stage} mastered` : passed ? 'Lesson mastered' : 'Almost there'}</h2><p>${stageDone ? `You have mastered every lesson of “${esc(st.title)}”. You can now: ${esc((st.goal || 'move on to the next stage').replace(/^done when you can:?\s*/i, ''))}` : passed ? `Mastered. ${streak()} night streak.` : 'Not mastered yet. Reread the “Remember” box and the parts you missed, then retake the quiz — tonight or tomorrow.'}</p><div class="row">${passed && nx ? `<a class="btn accent" href="#${esc(nx.id)}">Next: ${esc(nx.title)}</a>` : `<button class="btn accent" type="button" data-a="retry">Retake now</button>`}<button class="btn ghost" type="button" data-a="close">Close</button></div>`);
    n.querySelector('[data-a=close]').onclick = () => { closeDlg(); renderLesson(meta.id); };
    const rb = n.querySelector('[data-a=retry]'); if (rb) rb.onclick = () => openQuiz(meta, l);
    const nl = n.querySelector('a'); if (nl) nl.onclick = () => closeDlg();
    openDlg(n);
  };
  step();
}

function renderTerms() {
  setTab('terms');
  const keys = Object.keys(TERMS).sort((a, b) => TERMS[a][0].localeCompare(TERMS[b][0]));
  view.innerHTML = `<h1>Terms</h1><label class="f" for="term-q">Find a term</label><input id="term-q" type="search" placeholder="e.g. nakshatra, dasha, neecha" autocomplete="off"><ul class="lessons" id="term-list" style="margin-top:12px"></ul>`;
  const list = $('#term-list'), q = $('#term-q');
  const draw = () => { list.textContent = ''; const f = q.value.trim().toLowerCase();
    for (const k of keys) { const t = TERMS[k]; if (f && !(t[0] + ' ' + t[1]).toLowerCase().includes(f)) continue;
      const li = document.createElement('li'), b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.dataset.term = k; b.classList.add('term-row');
      b.textContent = t[0]; b.onclick = () => openTerm(k); li.appendChild(b); list.appendChild(li); } };
  q.oninput = draw; draw();
}

function renderPlans() {
  setTab('plans');
  const p = plan();
  view.innerHTML = `<h1>Plans</h1><p class="muted">Learn at your pace. Cancel any time. No remedies or gemstones are ever sold here.</p>
  <div class="grid2 plans">
    <div class="card plan"><span class="eyebrow">Free</span><div class="price">₹0</div><ul><li>Stage 0: orientation</li><li>Glossary and daily brief preview</li></ul></div>
    <div class="card plan"><span class="eyebrow">Learner</span><div class="price">₹399<span class="small muted"> / month</span></div><ul><li>Stages 0–6: foundations to yogas</li><li>Quizzes, mastery tracking, review</li><li>Nightly brief and prediction ledger</li><li>Sister sciences</li></ul></div>
    <div class="card plan featured"><span class="eyebrow">Practitioner</span><div class="price">₹999<span class="small muted"> / month</span></div><ul><li>Everything in Learner</li><li>Stages 7–12: vargas, strength, Jaimini, Muhurta and matching, KP and Tajika, synthesis</li><li>Blind practice on case charts</li><li>One Life Report every 3 months</li></ul></div>
    <div class="card plan"><span class="eyebrow">Life Report</span><div class="price">₹499<span class="small muted"> once</span></div><ul><li>Your chart, read from life purpose down to this week</li><li>What is yours to do, and what is not</li><li>Gita guidance for your periods</li></ul><a class="btn ghost small" href="#report">Open the Life Report</a></div>
  </div>
  <p class="status" style="margin-top:14px">Payments open when the app moves to its own website. ${owner ? 'As the owner you have every plan.' : ''}</p>
  ${owner ? `<h2>Owner settings</h2><div class="card form"><label class="f" for="pv">Preview the app as</label><select id="pv"><option value="">Owner (everything)</option><option value="free">Free</option><option value="learner">Learner ₹399</option><option value="pro">Practitioner ₹999</option></select>
     <label class="row" style="gap:8px"><input type="checkbox" id="strict" style="width:auto;min-height:auto"> Mastery gates (a stage opens when the previous one is mastered)</label></div>` : `<div class="card form" style="margin-top:12px"><label class="row" style="gap:8px"><input type="checkbox" id="strict" style="width:auto;min-height:auto"> Mastery gates</label></div>`}`;
  const pv = $('#pv'); if (pv) { pv.value = progress.previewPlan || ''; pv.onchange = () => { progress.previewPlan = pv.value || null; save(); }; }
  const sc = $('#strict'); sc.checked = !!progress.strict; sc.onchange = () => { progress.strict = sc.checked; save(); };
  void p;
}

function renderLedger() {
  setTab('ledger');
  const scored = ledger.filter(x => x.outcome && x.outcome !== 'open'), hits = scored.filter(x => x.outcome === 'hit').length, part = scored.filter(x => x.outcome === 'partial').length;
  view.innerHTML = `<h1>Prediction ledger</h1><p class="muted">Write a prediction before the window opens, then score it honestly after. Over months this shows which techniques actually work for you.</p>
  <div class="grid2"><div class="card stat"><span class="eyebrow">Logged</span><b>${ledger.length}</b></div><div class="card stat"><span class="eyebrow">Scored</span><b>${scored.length}</b></div><div class="card stat"><span class="eyebrow">Hit rate</span><b>${scored.length ? Math.round((hits + part / 2) / scored.length * 100) + '%' : '—'}</b></div></div>
  <h2>New prediction</h2>
  <form class="card form" id="lf"><label class="f" for="l-claim">Prediction (specific enough to be wrong)</label><textarea id="l-claim" required maxlength="400" placeholder="e.g. Between 3 and 10 Dec, a pending payment clears."></textarea>
    <div class="two"><label class="f">Window from<input type="date" id="l-from" required></label><label class="f">Window to<input type="date" id="l-to" required></label></div>
    <label class="f" for="l-basis">Basis (planet, house, dasha, transit)</label><input id="l-basis" maxlength="200" placeholder="e.g. Jupiter transit over natal Moon; Mercury–Saturn–Rahu">
    <label class="f" for="l-conf">Confidence</label><select id="l-conf"><option>Low</option><option selected>Medium</option><option>High</option></select>
    <div class="row"><button class="btn accent" type="submit">Log it</button></div></form>
  <h2>Your predictions</h2><div id="l-list"></div>`;
  const f = $('#lf'); const t = todayStr(); $('#l-from').value = t; $('#l-to').value = t;
  f.onsubmit = e => { e.preventDefault(); const x = { id: 'p' + Date.now().toString(36), made: new Date().toISOString(), claim: $('#l-claim').value.trim().slice(0, 400), from: $('#l-from').value, to: $('#l-to').value, basis: $('#l-basis').value.trim().slice(0, 200), conf: $('#l-conf').value, outcome: 'open' };
    if (!x.claim) return; ledger.unshift(x); store.set('jp-ledger', ledger); if (db && uid) db.doc(`data/users/${uid}/ledger/${x.id}`).set(x).catch(() => setSync('error')); renderLedger(); };
  const list = $('#l-list');
  if (!ledger.length) { list.innerHTML = '<p class="muted">Nothing logged yet. Start with one prediction for tomorrow from your brief.</p>'; return; }
  for (const x of ledger.slice(0, 100)) {
    const c = document.createElement('div'); c.className = 'card'; c.style.marginBottom = '10px';
    const top = document.createElement('div'); top.className = 'meta'; top.textContent = `${x.from} → ${x.to} · ${x.conf} confidence${x.basis ? ' · ' + x.basis : ''}`;
    const p = document.createElement('p'); p.textContent = x.claim;
    const row = document.createElement('div'); row.className = 'row';
    for (const [k, lab] of [['hit', 'Happened'], ['partial', 'Partly'], ['miss', 'Did not happen']]) { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === 'miss' ? ' no' : ''); b.textContent = lab; b.setAttribute('aria-pressed', x.outcome === k ? 'true' : 'false');
      b.onclick = () => { x.outcome = x.outcome === k ? 'open' : k; x.scored = new Date().toISOString(); store.set('jp-ledger', ledger); if (db && uid) db.doc(`data/users/${uid}/ledger/${x.id}`).set(x).catch(() => setSync('error')); renderLedger(); }; row.appendChild(b); }
    c.append(top, p, row); list.appendChild(c);
  }
}

function renderWelcome() {
  setTab('');
  view.innerHTML = `<section class="card hero">${wheelSVG()}<div class="eyebrow">Welcome</div><div class="t">Learn Jyotish properly, one night at a time.</div>
  <p>Thirteen stages take you from the nine planets to reading a full chart across systems. Every lesson uses your own chart, shows where the schools disagree, and ends with a short quiz. Score 70% to master it.</p>
  <ul><li><strong>30 minutes a night.</strong> The 11 PM routine: tomorrow’s brief, one lesson, one quiz, one logged prediction.</li><li><strong>Honest by design.</strong> The astronomy is exact. Interpretation is tradition, so you test it in your own prediction ledger.</li><li><strong>Your Life Report.</strong> Your chart read from life purpose down to this week, with what is in your hands and what is not.</li></ul>
  <div class="row"><button class="btn accent" type="button" id="go">Begin with Stage 0</button></div></section>`;
  $('#go').onclick = () => { progress.onboarded = true; save(); location.hash = nextLesson() ? nextLesson().id : 'today'; };
}

/* ---------- router ---------- */
function render() {
  updateStreakPill();
  requestAnimationFrame(() => { const h1 = view.querySelector('h1,.t'); document.title = (h1 ? h1.textContent.trim().slice(0, 60) + ' · ' : '') + BRAND; if (document.activeElement === document.body || !document.body.contains(document.activeElement)) view.focus({ preventScroll: true }); });
  const hsh = decodeURIComponent((location.hash || '').slice(1));
  route = hsh || 'today';
  $('#readbar').hidden = true;
  if (!MANIFEST) { view.innerHTML = '<p class="muted">Loading…</p>'; return; }
  if (!progress.onboarded && !hsh) return renderWelcome();
  if (route === 'learn') return renderLearn();
  if (route === 'terms') return renderTerms();
  if (route === 'plans') return renderPlans();
  if (route === 'ledger') return renderLedger();
  if (route === 'welcome') return renderWelcome();
  if (route === 'report' || route.startsWith('r-')) { setTab('report'); return window.REPORT ? window.REPORT.render(route) : (view.innerHTML = '<p>Loading…</p>'); }
  if (byId[route]) return renderLesson(route);
  return renderToday();
}
function softRender() { if (['today', 'learn', 'plans', 'ledger'].includes(route) || !route) render(); }
window.APP.render = render; window.APP.view = view; window.APP.setTab = setTab; window.APP.TERMS = () => TERMS; window.APP.wheelSVG = wheelSVG;
window.addEventListener('hashchange', () => { if (tts) { try { tts.stop(); } catch (e) {} } closeDlg(); render(); });
let scrollT = null;
window.addEventListener('scroll', () => {
  const rb = $('#readbar'); if (rb.hidden) return;
  const max = document.documentElement.scrollHeight - innerHeight; rb.firstElementChild.style.width = (max > 0 ? Math.min(100, scrollY / max * 100) : 0) + '%';
  clearTimeout(scrollT); scrollT = setTimeout(() => { if (byId[route]) { const p = store.get('jp-pos', {}); p[route] = Math.round(scrollY); store.set('jp-pos', p); } }, 400);
}, { passive: true });
$('#brand').onclick = () => { location.hash = 'today'; };

(async () => {
  setSync('local');
  try { await loadManifest(); } catch (e) { view.innerHTML = '<h1>Could not load the course</h1><p>Check your connection and reload.</p>'; return; }
  render();
  initAccount();
  try { tts = await window.claude?.use?.('tts'); if (tts && !ttsBound) { ttsBound = true; tts.onState?.(({ state }) => { const b = $('#listen'); if (!b) return; const on = state !== 'idle'; if (on) b.dataset.on = '1'; else delete b.dataset.on; b.textContent = on ? '■ Stop' : '▶ Listen to the summary'; }); }
    if (tts && byId[route]) { const r = $('#listen-row'); if (r && r.hidden) render(); } } catch (e) { tts = null; }
})();
})();

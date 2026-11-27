/* Pushyara Rahu kaal today: Rahu kaal, Yamaganda, Gulika, Abhijit muhurta for any Indian city and date. Runs fully in the browser. */
(function () {
  var A = window.Astronomy, CITIES = null, picked = null, timer = null, cur = null;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var RAHU = [8, 2, 7, 5, 6, 4, 3], YAMA = [5, 4, 3, 2, 1, 7, 6], GULI = [7, 6, 5, 4, 3, 2, 1]; /* index 0 = Sunday, value = which eighth of daylight (1 = first after sunrise) */
  var MIN = 60000;

  function loadCities() {
    if (CITIES) return Promise.resolve(CITIES);
    return fetch('/assets/js/cities.json').then(function (r) { return r.json(); }).then(function (c) { CITIES = c; return c; });
  }

  /* ---- time zone helpers: everything is worked out in the city's own zone ---- */
  function tzOffset(tz, ms) {
    var p = {}; new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = +x.value; });
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
  }
  function localMidnight(y, m, d, tz) {
    var g = Date.UTC(y, m - 1, d), t = g - tzOffset(tz, g); return g - tzOffset(tz, t);
  }
  function todayIn(tz) {
    var p = {}; new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date()).forEach(function (x) { p[x.type] = +x.value; });
    return [p.year, p.month, p.day];
  }
  function addDays(ymd, n) { var t = new Date(Date.UTC(ymd[0], ymd[1] - 1, ymd[2] + n)); return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]; }
  function iso(ymd) { return ymd[0] + '-' + ('0' + ymd[1]).slice(-2) + '-' + ('0' + ymd[2]).slice(-2); }
  function round(ms) { return Math.round(ms / MIN) * MIN; }
  function fmtT(ms, tz) { return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(ms)); }
  function fmtD(ymd, long) { return new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: long ? 'long' : 'short', day: 'numeric', month: 'short', year: long ? 'numeric' : undefined }).format(new Date(Date.UTC(ymd[0], ymd[1] - 1, ymd[2]))); }
  function tzName(tz) { try { var s = new Intl.DateTimeFormat('en-IN', { timeZone: tz, timeZoneName: 'long' }).formatToParts(new Date()).filter(function (x) { return x.type === 'timeZoneName'; })[0]; return s ? s.value : tz; } catch (e) { return tz; } }

  /* ---- the calculation ---- */
  function calc(ymd, c) {
    var tz = c[5], obs = new A.Observer(c[3], c[4], 0), start = new Date(localMidnight(ymd[0], ymd[1], ymd[2], tz));
    var rise = A.SearchRiseSet(A.Body.Sun, obs, +1, start, 1);
    var set = rise ? A.SearchRiseSet(A.Body.Sun, obs, -1, rise.date, 1) : null;
    if (!rise || !set) return null;
    var r = round(rise.date.getTime()), s = round(set.date.getTime()), wd = new Date(Date.UTC(ymd[0], ymd[1] - 1, ymd[2])).getUTCDay(), eighth = (s - r) / 8;
    var slot = function (n) { return { start: round(r + (n - 1) * eighth), end: round(r + n * eighth), n: n }; };
    var noon = (r + s) / 2;
    return { ymd: ymd, wd: wd, rise: r, set: s, rahu: slot(RAHU[wd]), yama: slot(YAMA[wd]), guli: slot(GULI[wd]), abhijit: { start: round(noon - 12 * MIN), end: round(noon + 12 * MIN) } };
  }

  /* ---- city picker (same pattern as the free kundli page) ---- */
  var place = $('rk-place'), sugg = $('rk-sugg');
  place.addEventListener('input', function () {
    var q = place.value.trim().toLowerCase();
    if (q.length < 2) { sugg.hidden = true; return; }
    loadCities().then(function (c) {
      var hits = c.filter(function (x) { return x[0].toLowerCase().indexOf(q) === 0; }).slice(0, 8);
      if (!hits.length) hits = c.filter(function (x) { return x[0].toLowerCase().indexOf(q) > 0; }).slice(0, 8);
      sugg.innerHTML = hits.map(function (x) { return '<li role="option" tabindex="0" data-i="' + c.indexOf(x) + '">' + esc(x[0]) + ', ' + esc(x[1]) + (x[2] !== 'IN' ? ', ' + esc(x[2]) : '') + '</li>'; }).join('');
      sugg.hidden = !hits.length;
    });
  });
  function choose(li) {
    picked = CITIES[+li.dataset.i]; place.value = picked[0] + ', ' + picked[1]; sugg.hidden = true; $('rk-err').textContent = '';
    try { localStorage.setItem('rk-city', picked[0] + '|' + picked[1]); } catch (e) {}
    render();
  }
  sugg.addEventListener('click', function (e) { var li = e.target.closest('li'); if (li) choose(li); });
  sugg.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var li = e.target.closest('li'); if (li) choose(li); } });
  document.addEventListener('click', function (e) { if (!e.target.closest('.fk-row')) sugg.hidden = true; });
  $('rk').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!picked) { $('rk-err').textContent = 'Choose your city from the list. If your town is not listed, choose the nearest city.'; place.focus(); return; }
    render();
  });
  $('rk-date').addEventListener('change', function () { if (picked) render(); });
  $('rk-today').addEventListener('click', function () { $('rk-date').value = iso(todayIn(picked[5])); render(); });
  $('rk-tomorrow').addEventListener('click', function () { $('rk-date').value = iso(addDays(todayIn(picked[5]), 1)); render(); });

  /* ---- output ---- */
  function range(s, tz) { return fmtT(s.start, tz) + ' to ' + fmtT(s.end, tz); }
  function render() {
    var err = $('rk-err'); err.textContent = '';
    var dv = $('rk-date').value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dv)) { err.textContent = 'Choose a date.'; return; }
    var ymd = dv.split('-').map(Number), tz = picked[5], c = calc(ymd, picked);
    if (!c) { err.textContent = 'The sun does not rise and set normally at this place on this date, so these timings cannot be worked out.'; return; }
    cur = { c: c, tz: tz, city: picked[0] };
    var o = '<h2 id="rk-res">Rahu kaal on ' + esc(fmtD(ymd, true)) + ' in ' + esc(picked[0]) + '</h2>';
    o += '<div class="rk-hero"><span>Rahu kaal (' + esc(DAYS[c.wd]) + ', ' + c.rahu.n + ordSuffix(c.rahu.n) + ' eighth of daylight)</span><b>' + esc(fmtT(c.rahu.start, tz)) + ' to ' + esc(fmtT(c.rahu.end, tz)) + '</b><p class="rk-count" id="rk-count" role="status"></p></div>';
    o += '<p class="muted small">All times are ' + esc(picked[0]) + ' local time (' + esc(tzName(tz)) + '), whatever your phone clock says.</p>';
    o += '<div class="tablewrap"><table class="data"><tr><th>Timing</th><th>From</th><th>To</th><th>What it is</th></tr>'
      + '<tr class="now"><td>Rahu kaal</td><td>' + fmtT(c.rahu.start, tz) + '</td><td>' + fmtT(c.rahu.end, tz) + '</td><td>Avoid starting new things</td></tr>'
      + '<tr><td>Sunrise</td><td colspan="2">' + fmtT(c.rise, tz) + '</td><td>Start of the day-count</td></tr>'
      + '<tr><td>Sunset</td><td colspan="2">' + fmtT(c.set, tz) + '</td><td>End of the day-count</td></tr>'
      + '<tr><td>Yamaganda</td><td>' + fmtT(c.yama.start, tz) + '</td><td>' + fmtT(c.yama.end, tz) + '</td><td>Another avoid-window</td></tr>'
      + '<tr><td>Gulika kaal</td><td>' + fmtT(c.guli.start, tz) + '</td><td>' + fmtT(c.guli.end, tz) + '</td><td>Another avoid-window</td></tr>'
      + '<tr><td>Abhijit muhurta</td><td>' + fmtT(c.abhijit.start, tz) + '</td><td>' + fmtT(c.abhijit.end, tz) + '</td><td>' + (c.wd === 3 ? 'Wednesday: many traditions skip it today' : 'Midday window favoured for starting things') + '</td></tr></table></div>';
    o += '<h3>Rahu kaal for the next 7 days in ' + esc(picked[0]) + '</h3><div class="tablewrap"><table class="data"><tr><th>Day</th><th>Rahu kaal</th><th>Sunrise</th><th>Sunset</th></tr>';
    for (var i = 0; i < 7; i++) {
      var d = addDays(ymd, i), x = i ? calc(d, picked) : c;
      if (!x) continue;
      o += '<tr' + (i === 0 ? ' class="now"' : '') + '><td>' + esc(fmtD(d, false)) + '</td><td>' + range(x.rahu, tz) + '</td><td>' + fmtT(x.rise, tz) + '</td><td>' + fmtT(x.set, tz) + '</td></tr>';
    }
    o += '</table></div>';
    $('rk-out').innerHTML = o; $('rk-out').hidden = false;
    $('rk-city-lead').textContent = picked[0] + ', ' + picked[1];
    tick(); clearInterval(timer); timer = setInterval(tick, 20000);
  }
  function ordSuffix(n) { return ['th', 'st', 'nd', 'rd'][n % 10 > 3 || ((n % 100) - (n % 10) === 10) ? 0 : n % 10]; }
  function dur(ms) { var m = Math.max(1, Math.round(ms / MIN)), h = Math.floor(m / 60); return h ? h + ' h ' + (m % 60) + ' min' : m + ' min'; }
  function tick() {
    var el = $('rk-count'); if (!el || !cur) return;
    var c = cur.c, tz = cur.tz, now = Date.now(), t = todayIn(tz), same = iso(t) === iso(c.ymd), msg;
    if (!same) {
      var before = iso(c.ymd) < iso(t);
      msg = (before ? 'This date has already passed.' : 'This is not today.') + ' <button type="button" class="link" id="rk-jump">Show today in ' + esc(cur.city) + '</button>';
    } else if (now < c.rahu.start) msg = 'Rahu kaal starts in ' + dur(c.rahu.start - now) + ', at ' + fmtT(c.rahu.start, tz) + '.';
    else if (now < c.rahu.end) msg = 'Rahu kaal is running now, until ' + fmtT(c.rahu.end, tz) + '.';
    else {
      var nx = calc(addDays(c.ymd, 1), picked);
      msg = 'Today’s Rahu kaal ended at ' + fmtT(c.rahu.end, tz) + '.' + (nx ? ' Tomorrow it runs ' + range(nx.rahu, tz) + '.' : '');
    }
    el.innerHTML = msg;
    var j = $('rk-jump'); if (j) j.onclick = function () { $('rk-date').value = iso(todayIn(tz)); render(); };
  }

  /* ---- WhatsApp lead form: same endpoints as the free kundli page ---- */
  $('rk-lead').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var nm = $('rl-nm').value.trim(), ph = $('rl-ph').value.trim(), em = $('rl-em').value.trim(), e2 = $('rl-err'); e2.textContent = '';
    if (!/^[+\d][\d\s]{9,12}$/.test(ph)) { e2.textContent = 'Enter a 10-digit WhatsApp number.'; return; }
    if (!$('rl-ok').checked) { e2.textContent = 'Tick the box so we can message you on WhatsApp.'; return; }
    var btn = this.querySelector('button'); btn.disabled = true; btn.textContent = 'Saving…';
    var cityTxt = picked ? picked[0] + ', ' + picked[1] : '';
    var LEADS = 'https://script.google.com/macros/s/AKfycbxRUP2RIuxP-tFVECKsqF6St1zvxV0OkIHbwWDYPTJ_SpWs-vSks8jTCn-s_jbroNeVow/exec';
    var leadObj = { _subject: 'Rahu kaal lead: ' + (nm || 'no name') + ' ' + ph, _template: 'table', _captcha: 'false', Source: 'Rahu kaal page, WhatsApp daily timings', Name: nm, WhatsApp: ph, Email: em, City: cityTxt, 'WhatsApp consent': 'Yes' };
    if (LEADS) { try { fetch(LEADS, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ _type: 'Rahu kaal lead' }, leadObj)) }).catch(function () {}); } catch (e) {} }
    fetch('https://formsubmit.co/ajax/28cee976f24a2645d13462831bcfe48d', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(leadObj) })
      .then(function (r) { return r.json(); }).then(function (j) { if (String(j.success) !== 'true') throw 0; $('rk-lead').innerHTML = '<h3>Done</h3><p class="muted">Your first Rahu kaal message will reach you on WhatsApp soon.</p>'; })
      .catch(function () { btn.disabled = false; btn.textContent = 'Send me daily timings'; e2.textContent = 'Could not save right now. Please try again.'; });
  });

  /* ---- start: today, in a sensible default city (Delhi, or the last one this browser used) ---- */
  loadCities().then(function (c) {
    var want = 'Delhi|Delhi';
    try { want = localStorage.getItem('rk-city') || want; } catch (e) {}
    var i = -1; c.forEach(function (x, k) { if (i < 0 && x[0] + '|' + x[1] === want && x[2] === 'IN') i = k; });
    if (i < 0) c.forEach(function (x, k) { if (i < 0 && x[0] === 'Delhi') i = k; });
    picked = c[i]; place.value = picked[0] + ', ' + picked[1];
    $('rk-date').value = iso(todayIn(picked[5]));
    render();
  });
})();

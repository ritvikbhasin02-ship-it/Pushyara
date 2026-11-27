/* Pushyara free kundli: lagna, Moon sign, nakshatra, current dasha. Runs fully in the browser. */
(function () {
  var J = window.JyotishCore, Z = window.LifeFacts, CITIES = null, picked = null;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var slug = function (s) { return String(s).toLowerCase().replace(/\s+/g, '-'); };
  var AB = { Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke' };
  var ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

  function loadCities() {
    if (CITIES) return Promise.resolve(CITIES);
    return fetch('/assets/js/cities.json').then(function (r) { return r.json(); }).then(function (c) { CITIES = c; return c; });
  }
  var place = $('fk-place'), sugg = $('fk-sugg');
  place.addEventListener('input', function () {
    picked = null; var q = place.value.trim().toLowerCase();
    if (q.length < 2) { sugg.hidden = true; return; }
    loadCities().then(function (c) {
      var hits = c.filter(function (x) { return x[0].toLowerCase().indexOf(q) === 0; }).slice(0, 8);
      if (!hits.length) hits = c.filter(function (x) { return x[0].toLowerCase().indexOf(q) > 0; }).slice(0, 8);
      sugg.innerHTML = hits.map(function (x, i) { return '<li role="option" tabindex="0" data-i="' + c.indexOf(x) + '">' + esc(x[0]) + ', ' + esc(x[1]) + (x[2] !== 'IN' ? ', ' + esc(x[2]) : '') + '</li>'; }).join('');
      sugg.hidden = !hits.length;
    });
  });
  function choose(li) { var x = CITIES[+li.dataset.i]; picked = x; place.value = x[0] + ', ' + x[1]; sugg.hidden = true; }
  sugg.addEventListener('click', function (e) { var li = e.target.closest('li'); if (li) choose(li); });
  sugg.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var li = e.target.closest('li'); if (li) choose(li); } });

  function chartSVG(c) {
    var P = { 1: '200,1 299.5,100.5 200,200 100.5,100.5', 2: '1,1 200,1 100.5,100.5', 3: '1,1 100.5,100.5 1,200', 4: '1,200 100.5,100.5 200,200 100.5,299.5', 5: '1,200 100.5,299.5 1,399', 6: '1,399 100.5,299.5 200,399', 7: '200,399 100.5,299.5 200,200 299.5,299.5', 8: '200,399 299.5,299.5 399,399', 9: '399,399 299.5,299.5 399,200', 10: '399,200 299.5,299.5 200,200 299.5,100.5', 11: '399,200 299.5,100.5 399,1', 12: '399,1 299.5,100.5 200,1' };
    var C = { 1: [200, 100], 2: [100, 40], 3: [40, 100], 4: [100, 200], 5: [40, 300], 6: [100, 362], 7: [200, 300], 8: [300, 362], 9: [362, 300], 10: [300, 200], 11: [362, 100], 12: [300, 40] };
    var by = {}; Object.keys(c.planets).forEach(function (p) { var h = c.planets[p].house; (by[h] = by[h] || []).push(AB[p]); });
    var s = '<svg viewBox="0 0 400 400" class="fk-chart" role="img" aria-label="North Indian birth chart"><g fill="none" stroke="rgba(185,119,22,.6)" stroke-width="1.2"><rect x="1" y="1" width="398" height="398"/><path d="M1 1 L399 399 M399 1 L1 399 M200 1 L399 200 L200 399 L1 200 Z"/></g>';
    for (var h = 1; h <= 12; h++) {
      var sg = (c.lagna + h - 1) % 12 + 1, x = C[h][0], y = C[h][1], ps = by[h] || [];
      s += '<text x="' + x + '" y="' + (y - 14 - (ps.length > 2 ? 8 : 0)) + '" class="sn">' + sg + (h === 1 ? ' Asc' : '') + '</text>';
      ps.forEach(function (p, i) { s += '<text x="' + x + '" y="' + (y + 6 + i * 17 - (ps.length > 2 ? 8 : 0)) + '" class="pl">' + p + '</text>'; });
    }
    return s + '</svg>';
  }

  $('fk').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('fk-err'); err.textContent = '';
    var d = $('fk-date').value, t = $('fk-time').value;
    if (!d) { err.textContent = 'Enter your date of birth.'; $('fk-date').focus(); return; }
    if (!t) { err.textContent = 'Enter your time of birth. If you are not sure, use the closest time you know.'; $('fk-time').focus(); return; }
    if (!picked) { err.textContent = 'Choose your birth place from the list. If your town is not listed, choose the nearest city.'; place.focus(); return; }
    var dp = d.split('-').map(Number), tp = t.split(':').map(Number);
    var utc = Z.zonedToUtc(dp[0], dp[1], dp[2], tp[0], tp[1], picked[5]);
    var c = J.chart(utc, picked[3], picked[4]), moon = c.planets.Moon, S = J.SIGNS, N = J.NAKS;
    var ds = J.dashas(utc, moon.lon, 2), now = Date.now(), md = null, ad = null, nextAd = null;
    ds.forEach(function (m) { if (m.start <= now && now < m.end) { md = m; m.sub.forEach(function (a, i) { if (a.start <= now && now < a.end) { ad = a; nextAd = m.sub[i + 1] || null; } }); } });
    var f = function (x) { return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: picked[5] }).format(x); };
    var yr = function (x) { return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric', timeZone: picked[5] }).format(x); };
    var nm = $('fk-name').value.trim(), lag = S[c.lagna], ms = S[moon.sign], nk = N[moon.nak];
    var o = '<h2 id="fk-res">' + (nm ? esc(nm) + '’s kundli' : 'Your kundli') + '</h2>';
    o += '<p class="muted">' + esc(f(utc)) + ', ' + esc(t) + ' · ' + esc(picked[0]) + '</p>';
    o += '<div class="fk-keys">'
      + '<a href="/learn/' + slug(lag) + '-ascendant.html"><span>Lagna (ascendant)</span><b>' + lag + '</b><em>' + c.ascDeg.toFixed(1) + '°</em></a>'
      + '<a href="/learn/' + slug(ms) + '-moon-sign.html"><span>Moon sign (rashi)</span><b>' + ms + '</b><em>Moon in the ' + ORD[moon.house] + ' house</em></a>'
      + '<a href="/learn/' + slug(nk) + '-nakshatra.html"><span>Nakshatra</span><b>' + nk + '</b><em>Pada ' + moon.pada + '</em></a>'
      + (md && ad ? '<a href="/learn/' + slug(md.lord) + '-mahadasha-' + slug(ad.lord) + '-antardasha.html"><span>Running now</span><b>' + md.lord + '–' + ad.lord + '</b><em>until ' + f(ad.end) + '</em></a>' : '')
      + '</div>';
    o += '<div class="fk-grid">' + chartSVG(c) + '<div><table class="data"><tr><th>Planet</th><th>Sign</th><th>Nakshatra</th><th>House</th></tr>';
    ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'].forEach(function (p) {
      var q = c.planets[p]; o += '<tr><td>' + p + (q.retro ? ' (R)' : '') + '</td><td>' + S[q.sign] + ' ' + q.deg.toFixed(1) + '°</td><td>' + N[q.nak] + ' ' + q.pada + '</td><td>' + ORD[q.house] + '</td></tr>';
    });
    o += '</table></div></div>';
    if (md) {
      o += '<h3>Your dasha periods</h3><table class="data"><tr><th>Mahadasha</th><th>From</th><th>Until</th></tr>';
      ds.filter(function (m) { return m.end > utc && m.start < new Date(utc.getTime() + 100 * 365.25 * 864e5); }).forEach(function (m) {
        o += '<tr' + (m === md ? ' class="now"' : '') + '><td>' + m.lord + (m === md ? ' · now' : '') + '</td><td>' + (m.start < utc ? 'Birth' : yr(m.start)) + '</td><td>' + yr(m.end) + '</td></tr>';
      });
      o += '</table>';
      o += '<div class="fk-tease"><h3>What ' + md.lord + '–' + ad.lord + ' means for you</h3><p>You are in the ' + md.lord + ' mahadasha, ' + ad.lord + ' antardasha, until ' + f(ad.end) + '.' + (nextAd ? ' Then ' + nextAd.lord + ' takes over until ' + f(nextAd.end) + '.' : '') + ' What this period brings for your work, money, home and relationships depends on where ' + md.lord + ' and ' + ad.lord + ' sit in your ' + lag + ' lagna chart.</p><p>Your Life Report reads that for you, and dates every chapter, this year month by month and each day of this week.</p><a class="btn" id="fk-cta" href="#">Read my full Life Report for ₹499</a> <a class="link" href="/learn/' + slug(md.lord) + '-mahadasha-' + slug(ad.lord) + '-antardasha.html">Or read the general guide to this period</a></div>';
    }
    o += '<form class="fk-lead" id="fk-lead" novalidate><h3>Get your good days on WhatsApp</h3><p class="muted">Each week we send your A, B and C days and Rahu Kaal for your city. Free, stop any time.</p><div class="fk-row two"><label>WhatsApp number<input id="fl-ph" inputmode="tel" maxlength="13" autocomplete="tel"></label><label>Email (optional)<input id="fl-em" type="email" maxlength="80" autocomplete="email"></label></div><label class="chk"><input type="checkbox" id="fl-ok"> <span>Yes, send me weekly good days and occasional offers on WhatsApp.</span></label><p class="fk-err" id="fl-err" role="alert"></p><button class="btn quiet" type="submit">Send me my good days</button></form>';
    var out = $('fk-out'); out.innerHTML = o; out.hidden = false;
    $('fk-lead').addEventListener('submit', function (ev) {
      ev.preventDefault(); var ph = $('fl-ph').value.trim(), em = $('fl-em').value.trim(), e2 = $('fl-err'); e2.textContent = '';
      if (!/^[+\d][\d\s]{9,12}$/.test(ph)) { e2.textContent = 'Enter a 10-digit WhatsApp number.'; return; }
      if (!$('fl-ok').checked) { e2.textContent = 'Tick the box so we can message you on WhatsApp.'; return; }
      var btn = this.querySelector('button'); btn.disabled = true; btn.textContent = 'Saving…';
      var LEADS = 'https://script.google.com/macros/s/AKfycbxRUP2RIuxP-tFVECKsqF6St1zvxV0OkIHbwWDYPTJ_SpWs-vSks8jTCn-s_jbroNeVow/exec'; var leadObj = { _subject: 'Free kundli lead: ' + (nm || 'no name') + ' ' + ph, _template: 'table', _captcha: 'false', Source: 'Free kundli, WhatsApp good days', Name: nm, WhatsApp: ph, Email: em, 'Date of birth': d, 'Time of birth': t, Place: picked[0] + ', ' + picked[1], Lagna: lag, 'Moon sign': ms, Nakshatra: nk + ' ' + moon.pada, 'Running dasha': md && ad ? md.lord + '-' + ad.lord : '', 'WhatsApp consent': 'Yes' }; if (LEADS) { try { fetch(LEADS, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ _type: 'Free kundli lead' }, leadObj)) }).catch(function () {}); } catch (e) {} }
      fetch('https://formsubmit.co/ajax/28cee976f24a2645d13462831bcfe48d', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ _subject: 'Free kundli lead: ' + (nm || 'no name') + ' ' + ph, _template: 'table', _captcha: 'false', Source: 'Free kundli, WhatsApp good days', Name: nm, WhatsApp: ph, Email: em, 'Date of birth': d, 'Time of birth': t, Place: picked[0] + ', ' + picked[1], Lagna: lag, 'Moon sign': ms, Nakshatra: nk + ' ' + moon.pada, 'Running dasha': md && ad ? md.lord + '-' + ad.lord : '', 'WhatsApp consent': 'Yes' }) })
        .then(function (r) { return r.json(); }).then(function (j) { if (String(j.success) !== 'true') throw 0; $('fk-lead').innerHTML = '<h3>Done</h3><p class="muted">Your first good-days message will reach you on WhatsApp this week.</p>'; })
        .catch(function () { btn.disabled = false; btn.textContent = 'Send me my good days'; e2.textContent = 'Could not save right now. Please try again.'; });
    });
    var qs = '?edition=digital&nm=' + encodeURIComponent(nm) + '&dob=' + d + '&tob=' + t + '&pob=' + encodeURIComponent(picked[0] + ', ' + picked[1]);
    var cta = $('fk-cta'); if (cta) cta.href = '/order.html' + qs; $('fk-buy').href = '/order.html' + qs;
    $('fk-res').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();

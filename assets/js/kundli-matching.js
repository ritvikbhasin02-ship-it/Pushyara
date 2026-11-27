/* Pushyara kundli matching: two charts, 36-point guna milan, Manglik check. Runs fully in the browser. */
(function () {
  var J = window.JyotishCore, Z = window.LifeFacts, K = window.KundliMatch, CITIES = null;
  var picked = { b: null, g: null };
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

  function loadCities() {
    if (CITIES) return Promise.resolve(CITIES);
    return fetch('/assets/js/cities.json').then(function (r) { return r.json(); }).then(function (c) { CITIES = c; return c; });
  }

  function setupPlace(p) {
    var place = $(p + '-place'), sugg = $(p + '-sugg');
    place.addEventListener('input', function () {
      picked[p] = null; var q = place.value.trim().toLowerCase();
      if (q.length < 2) { sugg.hidden = true; return; }
      loadCities().then(function (c) {
        var hits = c.filter(function (x) { return x[0].toLowerCase().indexOf(q) === 0; }).slice(0, 8);
        if (!hits.length) hits = c.filter(function (x) { return x[0].toLowerCase().indexOf(q) > 0; }).slice(0, 8);
        sugg.innerHTML = hits.map(function (x) { return '<li role="option" tabindex="0" data-i="' + c.indexOf(x) + '">' + esc(x[0]) + ', ' + esc(x[1]) + (x[2] !== 'IN' ? ', ' + esc(x[2]) : '') + '</li>'; }).join('');
        sugg.hidden = !hits.length;
      });
    });
    function choose(li) { var x = CITIES[+li.dataset.i]; picked[p] = x; place.value = x[0] + ', ' + x[1]; sugg.hidden = true; }
    sugg.addEventListener('click', function (e) { var li = e.target.closest('li'); if (li) choose(li); });
    sugg.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var li = e.target.closest('li'); if (li) choose(li); } });
  }
  setupPlace('b'); setupPlace('g');

  function fmt(n) { return (Math.round(n * 10) / 10).toString(); }
  function cls(k) { return k.got >= k.max ? 'km-full' : (k.got <= 0 ? 'km-zero' : 'km-part'); }

  function manglikText(who, m) {
    if (!m.isManglik) return '<p><strong>' + who + ' is not Manglik.</strong> Mars is not in the 1st, 2nd, 4th, 7th, 8th or 12th house from the Lagna, the Moon or Venus.</p>';
    var parts = m.from.map(function (f) { return ORD[f.house] + ' house from ' + (f.ref === 'Lagna' ? 'the Lagna (ascendant)' : (f.ref === 'Moon' ? 'the Moon' : 'Venus')); });
    return '<p><strong>' + who + ' is Manglik (' + m.strength + ').</strong> Mars sits in the ' + parts.join(' and in the ') + '. ' + (m.strength === 'mild' ? 'Only one of the three reference points is triggered, which is usually read as mild.' : 'More than one reference point is triggered, which is usually read as stronger.') + '</p>';
  }

  $('km').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('km-err'); err.textContent = '';
    var P = {}, who = { b: 'boy', g: 'girl' };
    var ps = ['b', 'g'];
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i], d = $(p + '-date').value, t = $(p + '-time').value;
      if (!d) { err.textContent = 'Enter the ' + who[p] + '’s date of birth.'; $(p + '-date').focus(); return; }
      if (!t) { err.textContent = 'Enter the ' + who[p] + '’s time of birth. If you are not sure, use the closest time you know.'; $(p + '-time').focus(); return; }
      if (!picked[p]) { err.textContent = 'Choose the ' + who[p] + '’s birth place from the list. If the town is not listed, choose the nearest city.'; $(p + '-place').focus(); return; }
      var dp = d.split('-').map(Number), tp = t.split(':').map(Number);
      var utc = Z.zonedToUtc(dp[0], dp[1], dp[2], tp[0], tp[1], picked[p][5]);
      P[p] = { d: d, t: t, nm: $(p + '-name').value.trim(), city: picked[p], utc: utc, chart: J.chart(utc, picked[p][3], picked[p][4]) };
    }
    var R = K.match(P.b.chart, P.g.chart), mb = K.manglik(P.b.chart), mg = K.manglik(P.g.chart);
    var bn = P.b.nm || 'Boy', gn = P.g.nm || 'Girl';
    var o = '<h2 id="km-res">Kundli matching result</h2>';
    o += '<p class="muted">' + esc(bn) + ' (' + esc(P.b.city[0]) + ') and ' + esc(gn) + ' (' + esc(P.g.city[0]) + ')</p>';
    o += '<div class="km-score"><div class="km-num"><b>' + fmt(R.total) + '</b> / ' + R.max + '</div><div><span class="km-band">' + esc(R.verdict.band) + '</span><p>' + esc(R.verdict.line) + '</p></div></div>';

    o += '<h3>The eight kootas</h3><div class="km-scroll"><table class="data km-table"><thead><tr><th>Koota</th><th>What it covers</th><th>His</th><th>Hers</th><th>Score</th></tr></thead><tbody>';
    R.kootas.forEach(function (k) {
      o += '<tr><td data-label="Koota"><b>' + esc(k.name) + '</b> <span class="deva" lang="hi">' + esc(k.hindi) + '</span></td><td data-label="What it covers">' + esc(k.means) + '</td><td data-label="His">' + esc(k.boy) + '</td><td data-label="Hers">' + esc(k.girl) + '</td><td data-label="Score" class="km-sc ' + cls(k) + '">' + fmt(k.got) + ' / ' + k.max + '</td></tr>';
    });
    o += '</tbody><tfoot><tr><td data-label="Koota"><b>Total</b></td><td data-label="What it covers"></td><td data-label="His"></td><td data-label="Hers"></td><td data-label="Score" class="km-sc"><b>' + fmt(R.total) + ' / ' + R.max + '</b></td></tr></tfoot></table></div>';

    o += '<div class="km-box"><h3>Doshas and cancellations</h3>';
    if (R.notes.length) {
      o += '<ul>' + R.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
      if (R.notes.some(function (n) { return /cancelled/.test(n); })) o += '<p class="small muted">The score above still counts that koota as 0. Cancellations are shown separately because most jyotishis apply them when they read the match.</p>';
    } else o += '<p>No dosha flagged. Nadi differs between the two, and the Moon signs are not in a 6/8, 5/9 or 2/12 pair, so neither the Nadi nor the Bhakoot koota loses points.</p>';
    o += '<p class="small"><a href="/learn/nadi-dosha.html">About Nadi dosha</a> · <a href="/learn/bhakoot-dosha.html">About Bhakoot dosha</a></p></div>';

    o += '<div class="km-box"><h3>Manglik check</h3>' + manglikText(esc(bn), mb) + manglikText(esc(gn), mg);
    if (mb.isManglik && mg.isManglik) o += '<p>Both charts are Manglik. Traditionally a Manglik–Manglik match is considered to cancel the dosha out.</p>';
    else if (mb.isManglik || mg.isManglik) o += '<p>Only one chart is Manglik. Many families ask a jyotishi to look at Mars’s sign and strength in the full chart before treating this as a problem, and a mild case is often not one.</p>';
    else o += '<p>Neither chart is Manglik, so there is nothing to weigh here.</p>';
    o += '<p class="small"><a href="/learn/manglik-dosha.html">About Manglik dosha</a></p></div>';

    o += '<h3>Moon details</h3><div class="km-scroll"><table class="data km-table km-moon"><thead><tr><th></th><th>' + esc(bn) + '</th><th>' + esc(gn) + '</th></tr></thead><tbody>';
    function row(label, a, b) { o += '<tr><td data-label=""><b>' + label + '</b></td><td data-label="' + esc(bn) + '">' + esc(a) + '</td><td data-label="' + esc(gn) + '">' + esc(b) + '</td></tr>'; }
    var B = R.boy, G = R.girl;
    row('Moon sign (rashi)', B.signName, G.signName);
    row('Nakshatra and pada', B.nakName + ', pada ' + B.pada, G.nakName + ', pada ' + G.pada);
    row('Gana', B.gana, G.gana);
    row('Nadi', B.nadi, G.nadi);
    row('Yoni', B.yoni + ' (' + (B.yoniSex === 'M' ? 'male' : 'female') + ')', G.yoni + ' (' + (G.yoniSex === 'M' ? 'male' : 'female') + ')');
    o += '</tbody></table></div>';

    var qs = function (p) { return '?edition=digital&nm=' + encodeURIComponent(P[p].nm) + '&dob=' + P[p].d + '&tob=' + P[p].t + '&pob=' + encodeURIComponent(P[p].city[0] + ', ' + P[p].city[1]); };
    o += '<div class="fk-tease"><h3>Guna milan is one layer, not the verdict</h3><p>The 36 points only compare the two Moons. The full charts decide more: the Navamsa (D9) chart, the 7th house and its lord, and whether the two dasha periods help or strain each other over the next ten years. A 30 can sit beside a hard dasha overlap and a 17 beside a very steady one.</p><p>The Life Report reads one full chart with dates for every chapter, including marriage and partnership. It costs ₹499, with no gemstones or pujas to buy afterwards.</p><a class="btn" href="/order.html' + qs('b') + '">Life Report for the boy, ₹499</a> <a class="btn quiet" href="/order.html' + qs('g') + '">Life Report for the girl, ₹499</a></div>';

    o += '<form class="fk-lead" id="km-lead" novalidate><h3>Get good days on WhatsApp</h3><p class="muted">Each week we send A, B and C days and Rahu Kaal for your city. Free, stop any time.</p><div class="fk-row two"><label>WhatsApp number<input id="kl-ph" inputmode="tel" maxlength="13" autocomplete="tel"></label><label>Email (optional)<input id="kl-em" type="email" maxlength="80" autocomplete="email"></label></div><label class="chk"><input type="checkbox" id="kl-ok"> <span>Yes, send me weekly good days and occasional offers on WhatsApp.</span></label><p class="fk-err" id="kl-err" role="alert"></p><button class="btn quiet" type="submit">Send me good days</button></form>';

    var out = $('km-out'); out.innerHTML = o; out.hidden = false;

    var nm = (P.b.nm || P.g.nm) ? [P.b.nm, P.g.nm].filter(Boolean).join(' & ') : '';
    $('km-lead').addEventListener('submit', function (ev) {
      ev.preventDefault(); var ph = $('kl-ph').value.trim(), em = $('kl-em').value.trim(), e2 = $('kl-err'); e2.textContent = '';
      if (!/^[+\d][\d\s]{9,12}$/.test(ph)) { e2.textContent = 'Enter a 10-digit WhatsApp number.'; return; }
      if (!$('kl-ok').checked) { e2.textContent = 'Tick the box so we can message you on WhatsApp.'; return; }
      var btn = this.querySelector('button'); btn.disabled = true; btn.textContent = 'Saving…';
      var LEADS = 'https://script.google.com/macros/s/AKfycbxRUP2RIuxP-tFVECKsqF6St1zvxV0OkIHbwWDYPTJ_SpWs-vSks8jTCn-s_jbroNeVow/exec';
      var leadObj = { _subject: 'Kundli matching lead: ' + (nm || 'no name'), _template: 'table', _captcha: 'false', Source: 'Kundli matching, WhatsApp good days', Name: nm, WhatsApp: ph, Email: em,
        'Boy name': P.b.nm, 'Boy date of birth': P.b.d, 'Boy time of birth': P.b.t, 'Boy place': P.b.city[0] + ', ' + P.b.city[1], 'Boy Moon sign': B.signName, 'Boy Nakshatra': B.nakName + ' ' + B.pada,
        'Girl name': P.g.nm, 'Girl date of birth': P.g.d, 'Girl time of birth': P.g.t, 'Girl place': P.g.city[0] + ', ' + P.g.city[1], 'Girl Moon sign': G.signName, 'Girl Nakshatra': G.nakName + ' ' + G.pada,
        'Guna milan score': fmt(R.total) + '/36', 'WhatsApp consent': 'Yes' };
      if (LEADS) { try { fetch(LEADS, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ _type: 'Kundli matching lead' }, leadObj)) }).catch(function () {}); } catch (x) {} }
      fetch('https://formsubmit.co/ajax/28cee976f24a2645d13462831bcfe48d', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(leadObj) })
        .then(function (r) { return r.json(); }).then(function (j) { if (String(j.success) !== 'true') throw 0; $('km-lead').innerHTML = '<h3>Done</h3><p class="muted">Your first good-days message will reach you on WhatsApp this week.</p>'; })
        .catch(function () { btn.disabled = false; btn.textContent = 'Send me good days'; e2.textContent = 'Could not save right now. Please try again.'; });
    });
    $('km-res').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();

/* Pushyara मुफ़्त कुंडली (हिंदी): लग्न, चंद्र राशि, नक्षत्र, चल रही दशा। पूरा हिसाब आपके ब्राउज़र में होता है।
   free-kundli.js का हिंदी रूप: वही इंजन और वही ढाँचा, सिर्फ़ दिखने वाले शब्द बदले हैं। */
(function () {
  var J = window.JyotishCore, Z = window.LifeFacts, CITIES = null, picked = null;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var slug = function (s) { return String(s).toLowerCase().replace(/\s+/g, '-'); };
  var AB = { Sun: 'सू', Moon: 'चं', Mars: 'मं', Mercury: 'बु', Jupiter: 'गु', Venus: 'शु', Saturn: 'श', Rahu: 'रा', Ketu: 'के' };
  var PL = { Sun: 'सूर्य', Moon: 'चंद्रमा', Mars: 'मंगल', Mercury: 'बुध', Jupiter: 'गुरु', Venus: 'शुक्र', Saturn: 'शनि', Rahu: 'राहु', Ketu: 'केतु' };
  var SIGNS_HI = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुंभ', 'मीन'];
  var NAKS_HI = ['अश्विनी', 'भरणी', 'कृत्तिका', 'रोहिणी', 'मृगशिरा', 'आर्द्रा', 'पुनर्वसु', 'पुष्य', 'आश्लेषा', 'मघा', 'पूर्वा फाल्गुनी', 'उत्तरा फाल्गुनी', 'हस्त', 'चित्रा', 'स्वाति', 'विशाखा', 'अनुराधा', 'ज्येष्ठा', 'मूल', 'पूर्वाषाढ़ा', 'उत्तराषाढ़ा', 'श्रवण', 'धनिष्ठा', 'शतभिषा', 'पूर्वा भाद्रपद', 'उत्तरा भाद्रपद', 'रेवती'];
  var ORD = ['', 'पहले', 'दूसरे', 'तीसरे', 'चौथे', 'पाँचवें', 'छठे', 'सातवें', 'आठवें', 'नौवें', 'दसवें', 'ग्यारहवें', 'बारहवें'];

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

  /* समय को भारतीय ढंग से: "दोपहर 12:59 बजे" */
  function hiTime(t) {
    var p = t.split(':').map(Number), h = p[0], m = p[1], w = h < 4 ? 'रात' : h < 12 ? 'सुबह' : h < 16 ? 'दोपहर' : h < 19 ? 'शाम' : 'रात';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return w + ' ' + h12 + ':' + (m < 10 ? '0' : '') + m + ' बजे';
  }

  function chartSVG(c) {
    var P = { 1: '200,1 299.5,100.5 200,200 100.5,100.5', 2: '1,1 200,1 100.5,100.5', 3: '1,1 100.5,100.5 1,200', 4: '1,200 100.5,100.5 200,200 100.5,299.5', 5: '1,200 100.5,299.5 1,399', 6: '1,399 100.5,299.5 200,399', 7: '200,399 100.5,299.5 200,200 299.5,299.5', 8: '200,399 299.5,299.5 399,399', 9: '399,399 299.5,299.5 399,200', 10: '399,200 299.5,299.5 200,200 299.5,100.5', 11: '399,200 299.5,100.5 399,1', 12: '399,1 299.5,100.5 200,1' };
    var C = { 1: [200, 100], 2: [100, 40], 3: [40, 100], 4: [100, 200], 5: [40, 300], 6: [100, 362], 7: [200, 300], 8: [300, 362], 9: [362, 300], 10: [300, 200], 11: [362, 100], 12: [300, 40] };
    var by = {}; Object.keys(c.planets).forEach(function (p) { var h = c.planets[p].house; (by[h] = by[h] || []).push(AB[p]); });
    var s = '<svg viewBox="0 0 400 400" class="fk-chart" role="img" aria-label="उत्तर भारतीय जन्म कुंडली"><g fill="none" stroke="rgba(185,119,22,.6)" stroke-width="1.2"><rect x="1" y="1" width="398" height="398"/><path d="M1 1 L399 399 M399 1 L1 399 M200 1 L399 200 L200 399 L1 200 Z"/></g>';
    for (var h = 1; h <= 12; h++) {
      var sg = (c.lagna + h - 1) % 12 + 1, x = C[h][0], y = C[h][1], ps = by[h] || [];
      s += '<text x="' + x + '" y="' + (y - 14 - (ps.length > 2 ? 8 : 0)) + '" class="sn">' + sg + (h === 1 ? ' लग्न' : '') + '</text>';
      ps.forEach(function (p, i) { s += '<text x="' + x + '" y="' + (y + 6 + i * 17 - (ps.length > 2 ? 8 : 0)) + '" class="pl">' + p + '</text>'; });
    }
    return s + '</svg>';
  }

  $('fk').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('fk-err'); err.textContent = '';
    var d = $('fk-date').value, t = $('fk-time').value;
    if (!d) { err.textContent = 'अपनी जन्म तारीख भरें।'; $('fk-date').focus(); return; }
    if (!t) { err.textContent = 'अपना जन्म समय भरें। पक्का न पता हो तो जो सबसे नज़दीकी समय मालूम है, वही भरें।'; $('fk-time').focus(); return; }
    if (!picked) { err.textContent = 'सूची में से अपना जन्म स्थान चुनें। आपका शहर न मिले तो सबसे नज़दीकी बड़ा शहर चुनें।'; place.focus(); return; }
    var dp = d.split('-').map(Number), tp = t.split(':').map(Number);
    var utc = Z.zonedToUtc(dp[0], dp[1], dp[2], tp[0], tp[1], picked[5]);
    var c = J.chart(utc, picked[3], picked[4]), moon = c.planets.Moon, S = J.SIGNS, N = J.NAKS;
    var ds = J.dashas(utc, moon.lon, 2), now = Date.now(), md = null, ad = null, nextAd = null;
    ds.forEach(function (m) { if (m.start <= now && now < m.end) { md = m; m.sub.forEach(function (a, i) { if (a.start <= now && now < a.end) { ad = a; nextAd = m.sub[i + 1] || null; } }); } });
    var f = function (x) { return new Intl.DateTimeFormat('hi-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: picked[5] }).format(x); };
    var yr = function (x) { return new Intl.DateTimeFormat('hi-IN', { month: 'long', year: 'numeric', timeZone: picked[5] }).format(x); };
    var nm = $('fk-name').value.trim(), lag = S[c.lagna], ms = S[moon.sign], nk = N[moon.nak];
    var lagH = SIGNS_HI[c.lagna], msH = SIGNS_HI[moon.sign], nkH = NAKS_HI[moon.nak];
    var o = '<h2 id="fk-res">' + (nm ? esc(nm) + ' की जन्म कुंडली' : 'आपकी जन्म कुंडली') + '</h2>';
    o += '<p class="muted">' + esc(f(utc)) + ', ' + esc(hiTime(t)) + ' · ' + esc(picked[0]) + '</p>';
    o += '<div class="fk-keys">'
      + '<a href="/learn/' + slug(lag) + '-ascendant.html"><span>लग्न (ascendant)</span><b>' + lagH + '</b><em>' + c.ascDeg.toFixed(1) + '°</em></a>'
      + '<a href="/learn/' + slug(ms) + '-moon-sign.html"><span>चंद्र राशि</span><b>' + msH + '</b><em>चंद्रमा ' + ORD[moon.house] + ' भाव में</em></a>'
      + '<a href="/learn/' + slug(nk) + '-nakshatra.html"><span>नक्षत्र</span><b>' + nkH + '</b><em>पद ' + moon.pada + '</em></a>'
      + (md && ad ? '<a href="/learn/' + slug(md.lord) + '-mahadasha-' + slug(ad.lord) + '-antardasha.html"><span>अभी चल रही दशा</span><b>' + PL[md.lord] + '–' + PL[ad.lord] + '</b><em>' + f(ad.end) + ' तक</em></a>' : '')
      + '</div>';
    o += '<div class="fk-grid"><div>' + chartSVG(c) + '<p class="small muted">चार्ट के अंक राशियाँ हैं (1 मेष … 12 मीन)। सबसे ऊपर का बीच वाला खाना पहला भाव (लग्न) है। सू सूर्य, चं चंद्रमा, मं मंगल, बु बुध, गु गुरु, शु शुक्र, श शनि, रा राहु, के केतु।</p></div><div><table class="data"><tr><th>ग्रह</th><th>राशि</th><th>नक्षत्र</th><th>भाव</th></tr>';
    ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'].forEach(function (p) {
      var q = c.planets[p]; o += '<tr><td>' + PL[p] + (q.retro ? ' (वक्री)' : '') + '</td><td>' + SIGNS_HI[q.sign] + ' ' + q.deg.toFixed(1) + '°</td><td>' + NAKS_HI[q.nak] + ' ' + q.pada + '</td><td>' + ORD[q.house] + '</td></tr>';
    });
    o += '</table></div></div>';
    if (md) {
      o += '<h3>आपकी महादशाएँ</h3><table class="data"><tr><th>महादशा</th><th>कब से</th><th>कब तक</th></tr>';
      ds.filter(function (m) { return m.end > utc && m.start < new Date(utc.getTime() + 100 * 365.25 * 864e5); }).forEach(function (m) {
        o += '<tr' + (m === md ? ' class="now"' : '') + '><td>' + PL[m.lord] + (m === md ? ' · अभी' : '') + '</td><td>' + (m.start < utc ? 'जन्म से' : yr(m.start)) + '</td><td>' + yr(m.end) + '</td></tr>';
      });
      o += '</table>';
      o += '<div class="fk-tease"><h3>' + PL[md.lord] + '–' + PL[ad.lord] + ' दशा आपके लिए क्या मायने रखती है</h3><p>आप अभी ' + PL[md.lord] + ' की महादशा और ' + PL[ad.lord] + ' की अंतर्दशा में हैं, जो ' + f(ad.end) + ' तक चलेगी।' + (nextAd ? ' इसके बाद ' + PL[nextAd.lord] + ' की अंतर्दशा ' + f(nextAd.end) + ' तक रहेगी।' : '') + ' काम, पैसे, घर और रिश्तों पर इसका असर इस बात पर टिका है कि ' + PL[md.lord] + ' और ' + PL[ad.lord] + ' आपकी ' + lagH + ' लग्न की कुंडली में कहाँ बैठे हैं।</p><p>यही बात आपकी जीवन रिपोर्ट आपके लिए खोलकर पढ़ती है। उसमें हर अध्याय की तारीखें हैं, यह साल महीने दर महीने है, और इस हफ़्ते का हर दिन भी।</p><a class="btn" id="fk-cta" href="#">मेरी पूरी जीवन रिपोर्ट पढ़ें, ₹499</a> <a class="link" href="/learn/' + slug(md.lord) + '-mahadasha-' + slug(ad.lord) + '-antardasha.html">या इस दशा की आम जानकारी पढ़ें</a></div>';
    }
    o += '<form class="fk-lead" id="fk-lead" novalidate><h3>अच्छे दिन WhatsApp पर पाएँ</h3><p class="muted">हर हफ़्ते हम आपके शहर के हिसाब से आपके A, B और C दिन और राहु काल भेजेंगे। मुफ़्त है, जब चाहें बंद करवा लें।</p><div class="fk-row two"><label>WhatsApp नंबर<input id="fl-ph" inputmode="tel" maxlength="13" autocomplete="tel"></label><label>ईमेल (चाहें तो)<input id="fl-em" type="email" maxlength="80" autocomplete="email"></label></div><label class="chk"><input type="checkbox" id="fl-ok"> <span>हाँ, मुझे हर हफ़्ते अच्छे दिन और कभी-कभार ऑफ़र WhatsApp पर भेजें।</span></label><p class="fk-err" id="fl-err" role="alert"></p><button class="btn quiet" type="submit">मुझे मेरे अच्छे दिन भेजें</button></form>';
    var out = $('fk-out'); out.innerHTML = o; out.hidden = false;
    $('fk-lead').addEventListener('submit', function (ev) {
      ev.preventDefault(); var ph = $('fl-ph').value.trim(), em = $('fl-em').value.trim(), e2 = $('fl-err'); e2.textContent = '';
      if (!/^[+\d][\d\s]{9,12}$/.test(ph)) { e2.textContent = '10 अंकों का WhatsApp नंबर भरें।'; return; }
      if (!$('fl-ok').checked) { e2.textContent = 'डिब्बे पर टिक लगाएँ, ताकि हम आपको WhatsApp पर संदेश भेज सकें।'; return; }
      var btn = this.querySelector('button'); btn.disabled = true; btn.textContent = 'सहेजा जा रहा है…';
      var LEADS = 'https://script.google.com/macros/s/AKfycbxRUP2RIuxP-tFVECKsqF6St1zvxV0OkIHbwWDYPTJ_SpWs-vSks8jTCn-s_jbroNeVow/exec'; var leadObj = { _subject: 'Free kundli lead (Hindi): ' + (nm || 'no name') + ' ' + ph, _template: 'table', _captcha: 'false', Source: 'Free kundli Hindi, WhatsApp good days', Language: 'Hindi', Name: nm, WhatsApp: ph, Email: em, 'Date of birth': d, 'Time of birth': t, Place: picked[0] + ', ' + picked[1], Lagna: lag, 'Moon sign': ms, Nakshatra: nk + ' ' + moon.pada, 'Running dasha': md && ad ? md.lord + '-' + ad.lord : '', 'WhatsApp consent': 'Yes' }; if (LEADS) { try { fetch(LEADS, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ _type: 'Free kundli lead' }, leadObj)) }).catch(function () {}); } catch (e) {} }
      fetch('https://formsubmit.co/ajax/28cee976f24a2645d13462831bcfe48d', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(leadObj) })
        .then(function (r) { return r.json(); }).then(function (j) { if (String(j.success) !== 'true') throw 0; $('fk-lead').innerHTML = '<h3>हो गया</h3><p class="muted">आपका पहला अच्छे-दिनों वाला संदेश इसी हफ़्ते WhatsApp पर पहुँच जाएगा।</p>'; })
        .catch(function () { btn.disabled = false; btn.textContent = 'मुझे मेरे अच्छे दिन भेजें'; e2.textContent = 'अभी सहेजा नहीं जा सका। कृपया दोबारा कोशिश करें।'; });
    });
    var qs = '?edition=digital&lang=hi&nm=' + encodeURIComponent(nm) + '&dob=' + d + '&tob=' + t + '&pob=' + encodeURIComponent(picked[0] + ', ' + picked[1]);
    var cta = $('fk-cta'); if (cta) cta.href = '/order.html' + qs; $('fk-buy').href = '/order.html' + qs;
    $('fk-res').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();

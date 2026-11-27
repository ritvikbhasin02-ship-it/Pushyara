/* Pushyara — site behaviour */
(function () {
  var b = document.querySelector('.burger'), m = document.querySelector('.menu');
  if (b) b.addEventListener('click', function () { m.classList.toggle('open'); });
  document.querySelectorAll('.dd>span').forEach(function (s) { s.addEventListener('click', function () { s.parentNode.classList.toggle('open'); }); });
  var lb = document.querySelector('.lightbox');
  document.querySelectorAll('[data-zoom]').forEach(function (i) {
    i.addEventListener('click', function () { lb.querySelector('img').src = i.src; lb.classList.add('on'); });
  });
  if (lb) lb.addEventListener('click', function () { lb.classList.remove('on'); });
  var fb = document.querySelectorAll('.filters button');
  fb.forEach(function (x) {
    x.addEventListener('click', function () {
      fb.forEach(function (y) { y.classList.remove('on'); }); x.classList.add('on');
      var f = x.dataset.f;
      document.querySelectorAll('[data-pillar]').forEach(function (c) { c.style.display = (f === 'all' || c.dataset.pillar === f) ? '' : 'none'; });
    });
  });

  /* ---------- order page ---------- */
  var form = document.getElementById('orderform');
  if (!form) return;
  var P = window.PRODUCTS || {}, C = window.CONFIG || {};
  var sel = document.getElementById('product');
  function pick() {
    var h = (location.hash || '').replace('#', '');
    if (h && P[h]) sel.value = h;
    show();
  }
  function show() {
    var p = P[sel.value];
    document.getElementById('pname').textContent = p.name;
    document.getElementById('pprice').innerHTML = '₹' + p.price.toLocaleString('en-IN') + ' <s>₹' + p.mrp.toLocaleString('en-IN') + '</s>';
    document.getElementById('ptag').textContent = p.tagline;
    document.getElementById('partner').style.display = p.partner ? 'block' : 'none';
    document.getElementById('ptitle').textContent = p.slug === 'hire-partner' ? 'The person you are hiring / partnering with' : 'Your partner';
  }
  sel.addEventListener('change', show);
  window.addEventListener('hashchange', pick);
  pick();
  var v = function (id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; };
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var p = P[sel.value];
    var req = ['name', 'dob', 'tob', 'pob', 'email', 'wa'];
    if (p.partner) req = req.concat(['p_name', 'p_dob', 'p_tob', 'p_pob']);
    var bad = req.some(function (id) { return !v(id); }) || !document.getElementById('ok').checked || !/^\S+@\S+\.\S+$/.test(v('email'));
    document.getElementById('err').style.display = bad ? 'block' : 'none';
    if (bad) return;
    var rows = [['Report', p.name], ['Price', '₹' + p.price.toLocaleString('en-IN')], ['Name', v('name')], ['Born', v('dob') + ' · ' + v('tob')], ['Place', v('pob')], ['Email', v('email')], ['WhatsApp', v('wa')]];
    if (p.partner) rows.push(['Second person', v('p_name') + ' · ' + v('p_dob') + ' ' + v('p_tob') + ' · ' + v('p_pob')]);
    var s = document.getElementById('sum'); s.innerHTML = '';
    rows.forEach(function (r) { var d = document.createElement('div'), a = document.createElement('span'), b = document.createElement('b'); a.textContent = r[0]; b.textContent = r[1]; d.append(a, b); s.append(d); });
    var msg = 'New order — ' + p.name + ' (₹' + p.price + ')\nName: ' + v('name') + '\nGender: ' + v('gender') + '\nDOB: ' + v('dob') + '\nTime: ' + v('tob') + '\nPlace: ' + v('pob') + '\nEmail: ' + v('email') + '\nWhatsApp: ' + v('wa');
    if (p.partner) msg += '\n\nSecond person: ' + v('p_name') + '\nGender: ' + v('p_gender') + '\nDOB: ' + v('p_dob') + '\nTime: ' + v('p_tob') + '\nPlace: ' + v('p_pob');
    msg += '\nQuestion: ' + (v('q') || '-');
    var pay = document.getElementById('pay');
    pay.href = (C.pay && C.pay[p.slug]) || C.payDefault || '#';
    pay.textContent = 'Pay ₹' + p.price.toLocaleString('en-IN') + ' securely';
    document.getElementById('wabtn').href = 'https://wa.me/' + (C.whatsapp || '') + '?text=' + encodeURIComponent(msg);
    form.style.display = 'none'; document.getElementById('done').style.display = 'block';
    window.scrollTo(0, document.getElementById('done').offsetTop - 90);
  });
  document.getElementById('edit').addEventListener('click', function (e) { e.preventDefault(); document.getElementById('done').style.display = 'none'; form.style.display = 'block'; });
})();

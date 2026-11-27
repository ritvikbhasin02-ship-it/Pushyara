/* Life Report fact engine — needs Astronomy + JyotishCore. Produces a deterministic fact sheet. */
(function (root) {
  const A = root.Astronomy || (typeof require !== 'undefined' ? require('astronomy-engine') : null);
  const J = root.JyotishCore;
  const TARA = ['Janma','Sampat','Vipat','Kshema','Pratyak','Sadhana','Naidhana','Mitra','Param Mitra'];
  const TARA_Q = {Janma:'mixed',Sampat:'good',Vipat:'avoid',Kshema:'good',Pratyak:'avoid',Sadhana:'good',Naidhana:'avoid','Mitra':'good','Param Mitra':'best'};
  const RK = {1:2,2:7,3:5,4:6,5:4,6:3,0:8}; // JS getDay(): Sun=0 → 8th part
  const DAY = 864e5;

  /** Convert local wall time in an IANA zone to a UTC Date (handles DST and historic offsets via Intl). */
  function zonedToUtc(y, mo, d, h, mi, tz) {
    let guess = Date.UTC(y, mo - 1, d, h, mi);
    for (let i = 0; i < 3; i++) {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
        .formatToParts(new Date(guess)).filter(x => x.type !== 'literal').map(x => [x.type, +x.value]));
      const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute);
      guess += Date.UTC(y, mo - 1, d, h, mi) - asUtc;
    }
    return new Date(guess);
  }
  function fmtLocal(date, tz, opts) { return new Intl.DateTimeFormat('en-IN', Object.assign({ timeZone: tz }, opts || { day: 'numeric', month: 'short', year: 'numeric' })).format(date); }

  function signOf(body, date) { return J.chart(date, 0, 0).planets[body].sign; }
  function ingresses(body, from, to, stepDays) {
    const out = []; let t = from.getTime(), s0 = signOf(body, from);
    while (t < to.getTime()) {
      const t2 = Math.min(t + stepDays * DAY, to.getTime()), s1 = signOf(body, new Date(t2));
      if (s1 !== s0) { let a = t, b = t2; for (let k = 0; k < 30; k++) { const m = (a + b) / 2; if (signOf(body, new Date(m)) === s0) a = m; else b = m; } out.push({ body, date: new Date(b), from: s0, to: s1 }); }
      t = t2; s0 = s1;
    }
    return out;
  }
  function stations(body, from, to) {
    const out = []; const sp = d => J.chart(d, 0, 0).planets[body];
    let t = from.getTime(), r0 = sp(from).retro;
    while (t < to.getTime()) { const t2 = t + DAY, r1 = sp(new Date(t2)).retro;
      if (r1 !== r0) out.push({ body, date: new Date(t2), turns: r1 ? 'retrograde' : 'direct', sign: sp(new Date(t2)).sign }); t = t2; r0 = r1; }
    return out;
  }
  function sunTimes(date, lat, lon) {
    const obs = new A.Observer(lat, lon, 0);
    const rise = A.SearchRiseSet(A.Body.Sun, obs, +1, date, 1), set = rise && A.SearchRiseSet(A.Body.Sun, obs, -1, rise.date, 1);
    return rise && set ? { rise: rise.date, set: set.date } : null;
  }

  function facts(input) {
    const { name, y, mo, d, h, mi, tz, lat, lon, place, timeConfidence } = input;
    const birth = zonedToUtc(y, mo, d, h, mi, tz);
    const c = J.chart(birth, lat, lon), P = c.planets, L = c.lagna, M = P.Moon.sign;
    const now = input.now || new Date();
    const ageAt = dt => (dt - birth) / (365.25 * DAY);
    // boundary sensitivity
    const warn = [];
    if (c.ascDeg < 2 || c.ascDeg > 28) warn.push(`Lagna is ${c.ascDeg.toFixed(1)}° into ${J.SIGNS[L]}: a birth-time error of a few minutes can change the lagna.`);
    for (const [p, v] of Object.entries(P)) { if (v.deg < 1 || v.deg > 29) warn.push(`${p} is at ${v.deg.toFixed(1)}° — near a sign edge.`); }
    const mn = (P.Moon.lon % (360 / 27)); if (mn < 0.5 || mn > 360 / 27 - 0.5) warn.push('The Moon is near a nakshatra edge: dasha dates may shift by months if the birth time is off.');
    let lagnaStable = null;
    { let a = 0, b = 0; for (let k = 1; k <= 240; k++) { if (J.chart(new Date(birth.getTime() - k * 6e4), lat, lon).lagna !== L) break; a = k; }
      for (let k = 1; k <= 240; k++) { if (J.chart(new Date(birth.getTime() + k * 6e4), lat, lon).lagna !== L) break; b = k; } lagnaStable = { before: a, after: b }; }
    // dashas
    const ds = J.dashas(birth, P.Moon.lon, 2);
    const curMD = ds.find(m => m.start <= now && now < m.end), curAD = curMD && curMD.sub.find(a => a.start <= now && now < a.end);
    const lifeArc = ds.filter(m => ageAt(m.start) < 95).map(m => ({ lord: m.lord, start: m.start, end: m.end, ageFrom: Math.max(0, ageAt(m.start)), ageTo: ageAt(m.end),
      rules: Object.keys(c.lords).filter(hh => c.lords[hh] === m.lord).map(Number), house: P[m.lord].house, current: m === curMD }));
    const ads = [];
    for (const m of ds) for (const a of m.sub) if (a.end > new Date(now.getTime() - 400 * DAY) && a.start < new Date(now.getTime() + 3 * 365 * DAY)) ads.push({ md: m.lord, ad: a.lord, start: a.start, end: a.end, current: a === curAD,
      adRules: Object.keys(c.lords).filter(hh => c.lords[hh] === a.lord).map(Number), adHouse: P[a.lord].house });
    // 12-month transit timeline
    const end = new Date(now.getTime() + 366 * DAY);
    const slow = ['Saturn', 'Jupiter', 'Rahu', 'Ketu'];
    const months = [];
    for (let k = 0; k < 12; k++) {
      const dt = new Date(now.getFullYear(), now.getMonth() + k, 15, 12);
      const tc = J.chart(dt, lat, lon); const row = { month: dt, planets: {} };
      for (const p of slow.concat(['Sun', 'Mars', 'Venus', 'Mercury'])) { const s = tc.planets[p].sign; row.planets[p] = { sign: s, fromMoon: (s - M + 12) % 12 + 1, fromLagna: (s - L + 12) % 12 + 1, retro: tc.planets[p].retro }; }
      const ad = ads.find(a => a.start <= dt && dt < a.end); row.dasha = ad ? `${ad.md}–${ad.ad}` : '';
      months.push(row);
    }
    const events = [...ingresses('Saturn', now, end, 5), ...ingresses('Jupiter', now, end, 3), ...ingresses('Rahu', now, end, 5), ...stations('Saturn', now, end), ...stations('Jupiter', now, end)]
      .map(e => Object.assign(e, { fromMoon: ((e.to ?? e.sign) - M + 12) % 12 + 1, fromLagna: ((e.to ?? e.sign) - L + 12) % 12 + 1 })).sort((a, b) => a.date - b.date);
    // Sade Sati
    const satNow = J.chart(now, 0, 0).planets.Saturn.sign, ss = (satNow - M + 12) % 12 + 1;
    const sadeSati = ss === 12 ? 'phase1' : ss === 1 ? 'phase2' : ss === 2 ? 'phase3' : (ss === 4 || ss === 8) ? 'dhaiya' : null;
    // next 7 days
    const week = [];
    for (let k = 1; k <= 7; k++) {
      const day = new Date(now.getTime() + k * DAY); const st = sunTimes(new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0)), lat, lon);
      const noon = st ? new Date((st.rise.date || st.rise).getTime() / 2 + (st.set.date || st.set).getTime() / 2) : day;
      const tc = J.chart(noon, lat, lon), mo2 = tc.planets.Moon, tara = TARA[((mo2.nak - P.Moon.nak + 27) % 27) % 9], mh = (mo2.sign - M + 12) % 12 + 1;
      let rk = null; if (st) { const r = st.rise.date || st.rise, s = st.set.date || st.set, seg = (s - r) / 8, part = RK[new Date(r).getDay()] || 8; rk = [new Date(r.getTime() + (part - 1) * seg), new Date(r.getTime() + part * seg)]; }
      const grade = mh === 8 ? 'C' : (TARA_Q[tara] === 'avoid' || [4, 12].includes(mh)) ? 'C' : (TARA_Q[tara] === 'good' || TARA_Q[tara] === 'best') && [1, 3, 6, 7, 10, 11].includes(mh) ? 'A' : 'B';
      week.push({ date: noon, moonSign: mo2.sign, nak: mo2.nak, moonHouse: mh, tara, taraQ: TARA_Q[tara], rahuKaal: rk, grade, chandrashtama: mh === 8 });
    }
    return { name, place, tz, birth, timeConfidence, chart: c, yogas: J.yogas(c), warn, lagnaStable, lifeArc, ads, current: { md: curMD && curMD.lord, ad: curAD && curAD.lord, adEnd: curAD && curAD.end },
      months, events, sadeSati, week, rahuHouse: P.Rahu.house, ketuHouse: P.Ketu.house, ak: c.karakas.AK, karakamsa: c.karakamsa, fmt: (dt, o) => fmtLocal(dt, tz, o) };
  }
  root.LifeFacts = { facts, zonedToUtc, TARA };
})(typeof window !== 'undefined' ? window : globalThis);

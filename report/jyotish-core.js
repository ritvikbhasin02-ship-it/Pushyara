/* Pushyara chart core — browser + node. Needs global `Astronomy` (astronomy-engine 2.1.19).
   Sidereal Lahiri (polynomial fit to Swiss Ephemeris, <0.001″ 1900–2150), whole-sign houses, mean node. */
(function (root) {
  const A = root.Astronomy || (typeof require !== 'undefined' ? require('astronomy-engine') : null);
  const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const NAKS = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
  const LORD = ['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
  const EXALT = {Sun:0,Moon:1,Mars:9,Mercury:5,Jupiter:3,Venus:11,Saturn:6};
  const MOOLA = {Sun:4,Moon:1,Mars:0,Mercury:5,Jupiter:8,Venus:6,Saturn:10};
  const FRIEND = {Sun:[['Moon','Mars','Jupiter'],['Mercury']],Moon:[['Sun','Mercury'],['Mars','Jupiter','Venus','Saturn']],Mars:[['Sun','Moon','Jupiter'],['Venus','Saturn']],
    Mercury:[['Sun','Venus'],['Mars','Jupiter','Saturn']],Jupiter:[['Sun','Moon','Mars'],['Saturn']],Venus:[['Mercury','Saturn'],['Mars','Jupiter']],Saturn:[['Mercury','Venus'],['Jupiter']]};
  const DL = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'], DY = [7,20,6,10,7,18,16,19,17], YEAR = 365.25;
  const BODIES = [['Sun','Sun'],['Moon','Moon'],['Mars','Mars'],['Mercury','Mercury'],['Jupiter','Jupiter'],['Venus','Venus'],['Saturn','Saturn']];
  const n360 = x => ((x % 360) + 360) % 360;
  const AYA = [9.313802952413725e-10, 0.0003070908080718847, 1.396887959000156, 23.85709235185325];

  function jdUT(date) { return date.getTime() / 86400000 + 2440587.5; }
  function ayanamsa(date) { const T = (jdUT(date) - 2451545.0) / 36525; return ((AYA[0]*T + AYA[1])*T + AYA[2])*T + AYA[3]; }
  function tropical(body, date) {
    if (body === 'Moon') return A.EclipticGeoMoon(date).lon;
    return A.Ecliptic(A.GeoVector(body, date, true)).elon;
  }
  function meanNode(date) {
    const T = (jdUT(date) - 2451545.0) / 36525;
    return n360(125.0445479 - 1934.1362891*T + 0.0020754*T*T + T*T*T/467441 - T*T*T*T/60616000);
  }
  function speed(body, date) { const d2 = new Date(date.getTime() + 3600e3), d1 = new Date(date.getTime() - 3600e3);
    let v = tropical(body, d2) - tropical(body, d1); if (v > 180) v -= 360; if (v < -180) v += 360; return v * 12; }
  function ascendantTropical(date, lat, lon) {
    const gast = A.SiderealTime(date); const ramc = n360(gast * 15 + lon) * Math.PI / 180;
    const eps = A.e_tilt(A.MakeTime(date)).tobl * Math.PI / 180, phi = lat * Math.PI / 180;
    const asc = Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)));
    return n360(asc * 180 / Math.PI);
  }
  const sign = x => Math.floor(n360(x) / 30), deg = x => n360(x) % 30;
  const nak = x => Math.floor(n360(x) / (360/27)) % 27, pada = x => Math.floor((n360(x) % (360/27)) / (360/108)) + 1;
  function d9(x) { const s = sign(x), p = Math.floor(deg(x) / (10/3)); return ([0,9,6,3][s % 4] + p) % 12; }
  const MT = {Sun:[4,0,20],Moon:[1,3,30],Mars:[0,0,12],Mercury:[5,15,20],Jupiter:[8,0,10],Venus:[6,0,15],Saturn:[10,0,20]};
  function dignity(p, s, d) {
    if (!(p in EXALT)) return '';
    if (s === (EXALT[p]+6) % 12) return 'debilitated';
    if (p === 'Moon' && s === 1) return d < 3 ? 'exalted' : 'moolatrikona';
    if (p === 'Mercury' && s === 5) return d < 15 ? 'exalted' : d < 20 ? 'moolatrikona' : 'own';
    if (s === EXALT[p]) return 'exalted';
    const [ms, a, b] = MT[p]; if (s === ms) return (d >= a && d < b) ? 'moolatrikona' : 'own';
    if (LORD[s] === p) return 'own';
    const [f, n] = FRIEND[p]; return f.includes(LORD[s]) ? 'friend' : n.includes(LORD[s]) ? 'neutral' : 'enemy';
  }
  /** utcDate: JS Date in UTC for the birth moment. */
  function chart(utcDate, lat, lon) {
    const nut = A.e_tilt(A.MakeTime(utcDate)).dpsi / 3600;
    const ay = ayanamsa(utcDate) + nut, P = {};
    for (const [name, body] of BODIES) P[name] = { lon: n360(tropical(body, utcDate) - ay), speed: speed(body, utcDate) };
    const ra = n360(meanNode(utcDate) - ay + nut); P.Rahu = { lon: ra, speed: -0.053 }; P.Ketu = { lon: n360(ra + 180), speed: -0.053 };
    const asc = n360(ascendantTropical(utcDate, lat, lon) - ay), L = sign(asc), sun = P.Sun.lon;
    const COMB = {Moon:12,Mars:17,Mercury:14,Jupiter:11,Venus:10,Saturn:15};
    const planets = {};
    for (const [p, v] of Object.entries(P)) {
      const s = sign(v.lon), retro = v.speed < 0 && !['Rahu','Ketu'].includes(p);
      const orb = COMB[p] ? COMB[p] - (retro && (p === 'Mercury' || p === 'Venus') ? 2 : 0) : 0;
      const sep = Math.abs(((v.lon - sun + 540) % 360) - 180);
      planets[p] = { lon: v.lon, sign: s, deg: deg(v.lon), house: (s - L + 12) % 12 + 1, nak: nak(v.lon), pada: pada(v.lon), retro,
        dignity: dignity(p, s, deg(v.lon)), combust: !!COMB[p] && sep < orb, d9: d9(v.lon) };
    }
    const seven = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'].sort((a, b) => deg(P[b].lon) - deg(P[a].lon));
    const karakas = {}; ['AK','AmK','BK','MK','PK','GK','DK'].forEach((k, i) => karakas[k] = seven[i]);
    const lords = {}; for (let h = 1; h <= 12; h++) lords[h] = LORD[(L + h - 1) % 12];
    return { ayanamsa: ay, asc, lagna: L, ascDeg: deg(asc), planets, karakas, karakamsa: d9(P[seven[0]].lon), lords, d9asc: d9(asc) };
  }
  function dashas(utcDate, moonLon, levels = 2) {
    const nk = moonLon / (360/27), i = Math.floor(nk) % 9, frac = nk - Math.floor(nk);
    let t = utcDate.getTime() - frac * DY[i] * YEAR * 864e5; const out = [];
    for (let k = 0; k < 9 * 2; k++) {       // two full cycles cover any lifetime
      const j = (i + k) % 9, len = DY[j] * YEAR * 864e5, md = { lord: DL[j], start: new Date(t), end: new Date(t + len), sub: [] };
      if (levels > 1) { let a = t; for (let m = 0; m < 9; m++) { const q = (j + m) % 9, l2 = DY[j] * DY[q] / 120 * YEAR * 864e5;
        md.sub.push({ lord: DL[q], start: new Date(a), end: new Date(a + l2) }); a += l2; } }
      out.push(md); t += len;
    }
    return out;
  }
  function yogas(c) {
    const pl = c.planets, hl = c.lords, res = [], kendra = [1,4,7,10];
    [['Mars','Ruchaka'],['Mercury','Bhadra'],['Jupiter','Hamsa'],['Venus','Malavya'],['Saturn','Shasha']].forEach(([p, n]) => {
      if (kendra.includes(pl[p].house) && ['own','exalted','moolatrikona'].includes(pl[p].dignity)) res.push({ name: n, kind: 'Pancha Mahapurusha', why: `${p} ${pl[p].dignity} in house ${pl[p].house}` }); });
    [[6,'Harsha'],[8,'Sarala'],[12,'Vimala']].forEach(([h, n]) => { const l = hl[h]; if ([6,8,12].includes(pl[l].house)) res.push({ name: n, kind: 'Viparita Raja', why: `${h}th lord ${l} in house ${pl[l].house}` }); });
    if (pl.Sun.sign === pl.Mercury.sign) res.push({ name: 'Budh-Aditya', kind: 'Solar', why: `Sun and Mercury together in house ${pl.Sun.house}` });
    if ((pl.Jupiter.sign - pl.Moon.sign + 12) % 3 === 0) res.push({ name: 'Gajakesari', kind: 'Lunar', why: 'Jupiter in a kendra from the Moon' });
    ['Mercury','Jupiter','Venus'].forEach(p => { const ks = kendra.filter(h => hl[h] === p); if (ks.length === 2 && ![1,5,9].some(t => hl[t] === p)) res.push({ name: 'Kendradhipati dosha', kind: 'Caution', why: `${p} rules kendras ${ks.join(' and ')}` }); });
    for (const p of ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']) if (pl[p].dignity === 'debilitated') {
      const rules = [['R1 lord of the sign it sits in', [LORD[pl[p].sign]]], ['R2 lord of its exaltation sign', [LORD[EXALT[p]]]],
        ['R3 planet exalted in that sign', Object.keys(EXALT).filter(q => EXALT[q] === pl[p].sign)], ['R4 the planet itself', [p]]];
      const why = [];
      for (const [label, qs] of rules) for (const q of qs) {
        if (kendra.includes(pl[q].house)) why.push(`${label} (${q}) in a kendra from the lagna`);
        if (q !== 'Moon' && (pl[q].sign - pl.Moon.sign + 12) % 3 === 0) why.push(`${label} (${q}) in a kendra from the Moon`);
      }
      res.push(why.length ? { name: 'Neecha bhanga', kind: 'Cancellation', why: `${p} is debilitated; cancelled by ${why.join('; ')}. Rule sets differ by text (R4 is a later addition).` }
                          : { name: 'Debilitated ' + p, kind: 'Caution', why: `${p} is debilitated with no classic cancellation.` });
    }
    return res;
  }
  root.JyotishCore = { SIGNS, NAKS, LORD, DL, chart, dashas, yogas, ayanamsa, sign, deg, nak, pada, d9 };
})(typeof window !== 'undefined' ? window : globalThis);

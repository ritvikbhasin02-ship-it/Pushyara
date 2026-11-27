/* Pushyara: Ashtakoota (36 guna) milan + Manglik. Sidereal, Lahiri. Needs JyotishCore. */
(function (root) {
  var NAKS = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
  var SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  var SIGNLORD = ['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];

  /* ---- Varna: 1 point ---- */
  var VARNA = ['Kshatriya','Vaishya','Shudra','Brahmin','Kshatriya','Vaishya','Shudra','Brahmin','Kshatriya','Vaishya','Shudra','Brahmin'];
  var VRANK = { Brahmin: 4, Kshatriya: 3, Vaishya: 2, Shudra: 1 };

  /* ---- Vashya: 2 points ---- */
  var VASHYA_ORDER = ['Chatushpada','Manava','Jalachara','Vanachara','Keeta'];
  var VASHYA_M = {
    Chatushpada: { Chatushpada:2, Manava:1,   Jalachara:1,   Vanachara:0,   Keeta:1 },
    Manava:      { Chatushpada:1, Manava:2,   Jalachara:1,   Vanachara:0,   Keeta:1 },
    Jalachara:   { Chatushpada:1, Manava:1,   Jalachara:2,   Vanachara:0.5, Keeta:1 },
    Vanachara:   { Chatushpada:1, Manava:0,   Jalachara:1,   Vanachara:2,   Keeta:0 },
    Keeta:       { Chatushpada:1, Manava:1,   Jalachara:0.5, Vanachara:1,   Keeta:2 }
  };
  function vashyaOf(signIdx, degInSign) {
    switch (signIdx) {
      case 0: case 1: return 'Chatushpada';
      case 2: case 5: case 6: case 10: return 'Manava';
      case 3: case 11: return 'Jalachara';
      case 4: return 'Vanachara';
      case 7: return 'Keeta';
      case 8: return degInSign < 15 ? 'Manava' : 'Chatushpada';
      case 9: return degInSign < 15 ? 'Chatushpada' : 'Jalachara';
    }
    return 'Manava';
  }

  /* ---- Yoni: 4 points ---- */
  var YONI = ['Horse','Elephant','Sheep','Serpent','Serpent','Dog','Cat','Sheep','Cat','Rat','Rat','Cow','Buffalo','Tiger','Buffalo','Tiger','Deer','Deer','Dog','Monkey','Mongoose','Monkey','Lion','Horse','Lion','Cow','Elephant'];
  var YSEX = ['M','M','F','M','F','F','F','M','M','M','F','M','F','F','M','M','F','M','M','M','F','F','F','F','M','F','F'];
  var YO = ['Horse','Elephant','Sheep','Serpent','Dog','Cat','Rat','Cow','Buffalo','Tiger','Deer','Monkey','Mongoose','Lion'];
  var YM = [
    [4,2,2,3,2,2,2,1,0,1,3,3,2,1],
    [2,4,3,3,2,2,2,2,3,1,2,3,2,0],
    [2,3,4,2,1,2,1,3,3,1,2,0,3,1],
    [3,3,2,4,2,1,1,1,1,2,2,2,0,2],
    [2,2,1,2,4,2,1,2,2,1,0,2,1,1],
    [2,2,2,1,2,4,0,2,2,1,3,3,3,1],
    [2,2,1,1,1,0,4,2,2,2,2,2,1,2],
    [2,2,3,1,2,2,2,4,3,0,3,2,2,1],
    [0,3,3,1,2,2,2,3,4,1,2,2,2,1],
    [1,1,1,2,1,1,2,0,1,4,1,1,2,1],
    [3,2,2,2,0,3,2,3,2,1,4,2,2,1],
    [3,3,0,2,2,3,2,2,2,1,2,4,3,2],
    [2,2,3,0,1,3,1,2,2,2,2,3,4,2],
    [1,0,1,2,1,1,2,1,1,1,1,2,2,4]
  ];

  /* ---- Graha Maitri: 5 points ---- */
  var FR = {
    Sun:    { f:['Moon','Mars','Jupiter'],    n:['Mercury'],                      e:['Venus','Saturn'] },
    Moon:   { f:['Sun','Mercury'],            n:['Mars','Jupiter','Venus','Saturn'], e:[] },
    Mars:   { f:['Sun','Moon','Jupiter'],     n:['Venus','Saturn'],               e:['Mercury'] },
    Mercury:{ f:['Sun','Venus'],              n:['Mars','Jupiter','Saturn'],      e:['Moon'] },
    Jupiter:{ f:['Sun','Moon','Mars'],        n:['Saturn'],                       e:['Mercury','Venus'] },
    Venus:  { f:['Mercury','Saturn'],         n:['Mars','Jupiter'],               e:['Sun','Moon'] },
    Saturn: { f:['Mercury','Venus'],          n:['Jupiter'],                      e:['Sun','Moon','Mars'] }
  };
  function rel(a, b) {
    if (a === b) return 'f';
    if (FR[a].f.indexOf(b) >= 0) return 'f';
    if (FR[a].e.indexOf(b) >= 0) return 'e';
    return 'n';
  }

  /* ---- Gana: 6 points ---- */
  var GANA = ['Deva','Manushya','Rakshasa','Manushya','Deva','Manushya','Deva','Deva','Rakshasa','Rakshasa','Manushya','Manushya','Deva','Rakshasa','Deva','Rakshasa','Deva','Rakshasa','Rakshasa','Manushya','Manushya','Deva','Rakshasa','Rakshasa','Manushya','Manushya','Deva'];
  var GI = { Deva:0, Manushya:1, Rakshasa:2 };
  var GM = [[6,5,1],[6,6,0],[0,0,6]];

  /* ---- Nadi: 8 points ---- */
  var NADI = ['Adi','Madhya','Antya','Antya','Madhya','Adi','Adi','Madhya','Antya','Antya','Madhya','Adi','Adi','Madhya','Antya','Antya','Madhya','Adi','Adi','Madhya','Antya','Antya','Madhya','Adi','Adi','Madhya','Antya'];

  function round1(x) { return Math.round(x * 100) / 100; }

  function person(chart) {
    var m = chart.planets ? chart.planets.Moon : chart.Moon;
    var lon = (m.lon !== undefined) ? m.lon : m.longitude;
    var sign = Math.floor(lon / 30) % 12;
    var nk = Math.floor(lon / (360 / 27)) % 27;
    return {
      moonLon: lon,
      sign: sign,
      signName: SIGNS[sign],
      degInSign: lon - sign * 30,
      nak: nk,
      nakName: NAKS[nk],
      pada: Math.floor((lon % (360 / 27)) / (360 / 108)) + 1,
      lord: SIGNLORD[sign],
      varna: VARNA[sign],
      vashya: vashyaOf(sign, lon - sign * 30),
      yoni: YONI[nk],
      yoniSex: YSEX[nk],
      gana: GANA[nk],
      nadi: NADI[nk]
    };
  }

  function match(boyChart, girlChart) {
    var b = person(boyChart), g = person(girlChart), k = [];

    /* 1 Varna */
    var vOk = VRANK[b.varna] >= VRANK[g.varna];
    k.push({ id:'varna', name:'Varna', hindi:'वर्ण', max:1, got: vOk ? 1 : 0,
      boy:b.varna, girl:g.varna,
      means:'Whether the two can work as equals, without one quietly expecting deference.' });

    /* 2 Vashya */
    var vs = VASHYA_M[b.vashya][g.vashya];
    k.push({ id:'vashya', name:'Vashya', hindi:'वश्य', max:2, got: vs,
      boy:b.vashya, girl:g.vashya,
      means:'Who naturally gives way to whom when the two of you disagree.' });

    /* 3 Tara */
    function tara(from, to) { var c = ((to - from + 27) % 27) + 1; var r = c % 9; return (r === 3 || r === 5 || r === 7) ? 0 : 1.5; }
    var t1 = tara(g.nak, b.nak), t2 = tara(b.nak, g.nak);
    k.push({ id:'tara', name:'Tara', hindi:'तारा', max:3, got: t1 + t2,
      boy:b.nakName, girl:g.nakName,
      means:'Whether being together tends to bring each of you luck and health, or drain it.' });

    /* 4 Yoni */
    var ys = YM[YO.indexOf(b.yoni)][YO.indexOf(g.yoni)];
    k.push({ id:'yoni', name:'Yoni', hindi:'योनि', max:4, got: ys,
      boy:b.yoni + ' (' + (b.yoniSex === 'M' ? 'male' : 'female') + ')',
      girl:g.yoni + ' (' + (g.yoniSex === 'M' ? 'male' : 'female') + ')',
      means:'Physical and instinctive compatibility, including the bedroom.' });

    /* 5 Graha Maitri */
    var r1 = rel(b.lord, g.lord), r2 = rel(g.lord, b.lord), gm;
    if (b.lord === g.lord) gm = 5;
    else if (r1 === 'f' && r2 === 'f') gm = 5;
    else if ((r1 === 'f' && r2 === 'n') || (r1 === 'n' && r2 === 'f')) gm = 4;
    else if (r1 === 'n' && r2 === 'n') gm = 3;
    else if ((r1 === 'f' && r2 === 'e') || (r1 === 'e' && r2 === 'f')) gm = 1;
    else if ((r1 === 'n' && r2 === 'e') || (r1 === 'e' && r2 === 'n')) gm = 0.5;
    else gm = 0;
    k.push({ id:'maitri', name:'Graha Maitri', hindi:'ग्रह मैत्री', max:5, got: gm,
      boy:b.lord, girl:g.lord,
      means:'How the two minds get along day to day: conversation, trust, friendship.' });

    /* 6 Gana */
    k.push({ id:'gana', name:'Gana', hindi:'गण', max:6, got: GM[GI[b.gana]][GI[g.gana]],
      boy:b.gana, girl:g.gana,
      means:'Temperament: gentle, practical or intense. A wide gap shows up as repeated friction.' });

    /* 7 Bhakoot */
    var d1 = ((b.sign - g.sign + 12) % 12) + 1, d2 = ((g.sign - b.sign + 12) % 12) + 1;
    var pair = [Math.min(d1, d2), Math.max(d1, d2)].join('-');
    var bad = (pair === '6-8' || pair === '5-9' || pair === '2-12');
    k.push({ id:'bhakoot', name:'Bhakoot', hindi:'भकूट', max:7, got: bad ? 0 : 7,
      boy:b.signName, girl:g.signName, detail: d1 + '/' + d2,
      means:'The long arc: money, health, children and whether life together keeps rising.' });

    /* 8 Nadi */
    var sameNadi = b.nadi === g.nadi;
    k.push({ id:'nadi', name:'Nadi', hindi:'नाड़ी', max:8, got: sameNadi ? 0 : 8,
      boy:b.nadi, girl:g.nadi,
      means:'Constitution and the health of children. The single heaviest koota.' });

    var total = k.reduce(function (s, x) { return s + x.got; }, 0);

    /* Dosha cancellations, stated plainly */
    var cancels = [];
    if (sameNadi) {
      if (b.nak === g.nak && b.pada !== g.pada) cancels.push('Nadi dosha is treated as cancelled: both are in ' + b.nakName + ' but in different padas.');
      else if (b.sign === g.sign && b.nak !== g.nak) cancels.push('Nadi dosha is treated as cancelled: same rashi but different nakshatras.');
      else if (b.nak !== g.nak && b.sign !== g.sign) cancels.push('Nadi dosha stands. Classical texts weigh it heavily; many modern jyotishis check the D9 chart before refusing a match on this alone.');
    }
    if (bad) {
      if (rel(b.lord, g.lord) === 'f' && rel(g.lord, b.lord) === 'f') cancels.push('Bhakoot dosha is treated as cancelled: the two rashi lords are friends.');
      else if (b.lord === g.lord) cancels.push('Bhakoot dosha is treated as cancelled: both rashis have the same lord.');
      else cancels.push('Bhakoot dosha stands (' + pair + ' between the Moon signs).');
    }

    var verdict;
    if (total >= 25) verdict = { band:'Very good', line:'A strong match on guna milan.' };
    else if (total >= 18) verdict = { band:'Acceptable', line:'The usual threshold is 18. This clears it.' };
    else if (total >= 15) verdict = { band:'Borderline', line:'Below the usual 18. Worth a full chart reading before deciding.' };
    else verdict = { band:'Weak on guna milan', line:'Well below 18. Guna milan alone should not decide this either way, but take a full reading seriously.' };

    return { boy:b, girl:g, kootas:k, total: round1(total), max:36, verdict:verdict, notes:cancels,
             bhakootPair: pair, sameNadi: sameNadi };
  }

  /* Manglik / Mangal dosha: Mars in 1,2,4,7,8,12 from Lagna, Moon or Venus */
  function manglik(chart) {
    var pl = chart.planets || chart;
    function houseFrom(refLon, lon) { return ((Math.floor(lon / 30) - Math.floor(refLon / 30) + 12) % 12) + 1; }
    var marsLon = pl.Mars.lon !== undefined ? pl.Mars.lon : pl.Mars.longitude;
    var hot = [1, 2, 4, 7, 8, 12], from = [];
    var ascLon = chart.ascendant !== undefined ? chart.ascendant : (chart.asc !== undefined ? chart.asc : (pl.Lagna ? pl.Lagna.lon : null));
    if (ascLon !== null && ascLon !== undefined) { var h = houseFrom(ascLon, marsLon); if (hot.indexOf(h) >= 0) from.push({ ref:'Lagna', house:h }); }
    var mh = houseFrom(pl.Moon.lon !== undefined ? pl.Moon.lon : pl.Moon.longitude, marsLon);
    if (hot.indexOf(mh) >= 0) from.push({ ref:'Moon', house:mh });
    var vh = houseFrom(pl.Venus.lon !== undefined ? pl.Venus.lon : pl.Venus.longitude, marsLon);
    if (hot.indexOf(vh) >= 0) from.push({ ref:'Venus', house:vh });
    return { isManglik: from.length > 0, from: from,
             strength: from.length >= 2 ? 'strong' : (from.length === 1 ? 'mild' : 'none') };
  }

  root.KundliMatch = { match:match, manglik:manglik, person:person, NAKS:NAKS, SIGNS:SIGNS };
})(typeof window !== 'undefined' ? window : globalThis);

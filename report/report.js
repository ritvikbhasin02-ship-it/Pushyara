/* Life Report — deterministic chart reading from the engine + interpretation library + Gita library.
   English and Hindi (library.hi.json / gita.hi.json + the T table below). A prediction tracker records what came true.
   Optional personal letter via the `sample` capability, written only from the computed facts. */
(function () {
'use strict';
const A = window.APP, esc = A.esc, J = window.JyotishCore;
const AB = { Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke' };
const AB_HI = { Sun: 'सू', Moon: 'चं', Mars: 'मं', Mercury: 'बु', Jupiter: 'गु', Venus: 'शु', Saturn: 'श', Rahu: 'रा', Ketu: 'के' };
const NAK_LORD = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
let LIB = null, GITA = null, LIB_HI = null, GITA_HI = null, CITIES = null, EXM = null, EXM_HI = null;
async function libs(lang) {
  if (!LIB) [LIB, GITA] = await Promise.all([A.getJSON('data/library.json'), A.getJSON('data/gita.json')]);
  if (!EXM) { try { EXM = await A.getJSON('data/examples.json'); } catch (e) { EXM = {}; } }
  if (lang === 'hi' && !EXM_HI) { try { EXM_HI = await A.getJSON('data/examples.hi.json'); } catch (e) { EXM_HI = null; } }
  if (lang === 'hi' && !LIB_HI) { try { [LIB_HI, GITA_HI] = await Promise.all([A.getJSON('data/library.hi.json'), A.getJSON('data/gita.hi.json')]); } catch (e) { LIB_HI = null; GITA_HI = null; } }
}
async function cities() { if (!CITIES) CITIES = await A.getJSON('data/cities.json'); return CITIES; }

/* ---------- language table ---------- */
const EN = {
  signs: J.SIGNS, naks: J.NAKS,
  planet: p => p,
  area: { 1: 'self and health', 2: 'money, family and speech', 3: 'effort, courage and siblings', 4: 'home, mother and peace of mind', 5: 'children, learning and creativity', 6: 'work routine, debts and health habits', 7: 'partnership and marriage', 8: 'sudden change and shared money', 9: 'fortune, father and teachers', 10: 'career and reputation', 11: 'income, gains and networks', 12: 'expenses, rest, foreign lands and inner life' },
  ord: n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'),
  house: n => `${EN.ord(n)} house`,
  dig: { exalted: 'exalted', debilitated: 'debilitated', own: 'in its own sign', moolatrikona: 'moolatrikona', friend: 'in a friendly sign', neutral: 'in a neutral sign', enemy: 'in an unfriendly sign' },
  tara: x => x,
  chapters: ['How to read this', 'Who you are', 'What you are here to learn', 'Your nine teachers', 'The chapters of your life', 'This year', 'Month by month', 'This week', 'Yours and not yours', 'The Gita for your road', 'Your weekly practice', 'Your prediction tracker', null],
  letterFor: n => `A letter for ${n}`,
  inThis: 'Jump to a chapter', chaptersBtn: 'Chapters', lifeReport: 'Life Report',
  lagna: 'Lagna', moon: 'Moon', running: 'Now running', until: 'until',
  kundliKey: 'Numbers are <strong>signs</strong> (1 Aries … 12 Pisces). Houses are fixed boxes: the top diamond is the <strong>1st house</strong>, then anticlockwise.',
  how: 'This report is built from an exact calculation of the sky at your birth (sidereal zodiac, Lahiri ayanamsa, whole-sign houses, Vimshottari dashas). The reading itself is classical Jyotish tradition. Treat it as a map of tendencies and timing, not a verdict.',
  timeNote: { exact: 'You marked the birth time as exact.', 15: 'You marked the birth time as accurate to about 15 minutes.', 60: 'You marked the birth time as accurate to about an hour, so lagna-based parts are less certain.', unknown: 'The birth time is not known, so everything that depends on the lagna and houses is uncertain. Moon-based parts hold better.' },
  stable: (s, a, b) => `The lagna stays ${s} from ${a} minutes before to ${b} minutes after the time given.`,
  markIt: 'Each pattern below is specific enough to be wrong. Mark it <em>This is me</em> or <em>Not me</em>. If it does not match your life, skip the advice attached to it.',
  pro: 'Health, money, legal and mental-health decisions belong with qualified professionals. If low mood lasts more than two weeks, talk to a doctor or counsellor.',
  match: 'Does this match you?', me: 'This is me', notMe: 'Not me',
  rising: (s, l, h, area) => `Your rising sign is ${s}, ruled by ${l}, which sits in your ${h} (${area}).`,
  moonLine: (s, h, n, l) => `Your Moon, your mind, is in ${s}, in the ${h}, in ${n} nakshatra (ruled by ${l}).`,
  strongLine: (p, d, h) => `${p} is strong (${d}) in your ${h}.`,
  ak: p => `Your soul’s teacher (Atmakaraka) is ${p}.`, kl: s => `Your Karakamsa, the soul’s sign, is ${s}.`,
  nodes: (a, b) => `Rahu in your ${a}, Ketu in your ${b}:`, ten: (p, h) => `Your work house is ruled by ${p}, placed in your ${h}.`,
  teachersIntro: 'Each planet is a teacher with one lesson for you. Open each to read where it sits and what it asks.',
  retro: 'retrograde', combust: 'combust', practice: 'Practice', lesson: 'The lesson', now: 'now',
  lifeIntro: 'Vimshottari dashas divide life into chapters, each led by one planet. Look back at the past chapters: do the themes fit what you lived?',
  cols: { chapter: 'Chapter', age: 'Age', dates: 'Dates', about: 'What it is about', date: 'Date', event: 'Event', house: 'House', brings: 'What it tends to bring', month: 'Month', period: 'Period', focus: 'Focus', day: 'Day', grade: 'Grade', tara: 'Tara', rk: 'Rahu Kaal' },
  nowCh: (p, d) => `Now: the ${p} chapter (until ${d})`, nextCh: (p, d) => `Next: the ${p} chapter, from ${d}`,
  rules: (p, h, area) => `${p} rules your ${h} (${area}):`,
  inAd: (a, b, d) => `You are in ${a}–${b} until ${d}.`, then: 'Then', from: 'from',
  satTitle: 'Saturn’s long transit', dhaiya: 'Saturn is in the 4th or 8th from your Moon (dhaiya): a slower, heavier stretch for home or shared matters. Keep routines simple and finish what is started.',
  bigTurns: 'The big turns in the next 12 months', turns: (b, x) => `${b} turns ${x === 'retrograde' ? 'retrograde' : 'direct'}`, enters: (b, s) => `${b} enters ${s}`,
  fromMoon: n => `${EN.ord(n)} from Moon`, fromLagna: n => `${EN.ord(n)} from lagna`, pause: 'A pause point: review rather than start.',
  monthsIntro: 'Slow planets set the weather of each month. Jupiter in a good house from your Moon opens doors; Saturn in a good house rewards effort.',
  focusJ: a => `Openings in ${a}`, focusS: a => `Effort pays in ${a}`, slow: 'Slow and steady; protect energy', cons: 'Consolidate; finish what is open',
  weekIntro: 'Graded from the Moon’s house counted from your natal Moon (Chandra bala) and your tara. Start important things on A days; on C days, keep to routine.',
  chandrashtama: 'Chandrashtama',
  yoursIntro: 'The Gita’s first practical teaching: put your full effort into what is yours, and let go of what is not. For each area of life:',
  ruledBy: (l, h) => `Ruled by ${l}, placed in your ${h}.`, yours: 'Yours to do', notYours: 'Not yours to carry',
  gitaIntro: 'Each verse below was chosen for the period you are living through. Read the plain meaning first; the Sanskrit is there if you want it.',
  gitaNote: 'Linking planets to Gita themes is a modern teaching aid, not scripture.',
  gita: k => `Bhagavad Gita ${k}`, why: 'Why this verse is here for you:', simple: 'In simple words:', words: 'What the words mean', sanskrit: 'Read it in Sanskrit', tryWeek: 'Try this week:',
  forCh: p => `For your ${p} chapter:`, forAd: p => `For the ${p} sub-period:`,
  ifthen: 'Plans written as “if…, then I will…” are followed far more often than intentions. Write three of your own:',
  plan: n => `Plan ${n}`, ph: ['If it is 11 PM and I feel restless, then I will open tonight’s lesson.', 'If a hard conversation is due, then I will have it on an A day before noon.', 'If I catch myself worrying about the outcome, then I will write the next small step.'], saved: 'Saved.',
  trackIntro: 'Every timed statement in this report is listed here. When its window arrives, mark what actually happened. Your score shows how well this chart reads your life, and it sharpens which parts to trust.',
  happened: 'Happened', partly: 'Partly', didnt: 'Didn’t', checkBack: d => `Check back from ${d}`, score: 'Your hit rate', marked: (n, t) => `${n} of ${t} marked`, noScore: 'Mark a few to see your hit rate.',
  pWeekA: 'An easier day: what you start today should meet less resistance.', pWeekB: 'An ordinary day: steady work goes fine; nothing pushes for or against you.', pWeekC: 'A heavier day: delays, tiredness or friction are more likely. Routine works better than new starts.',
  pAd: (a, b) => `${a}–${b} period:`,
  letterIntro: 'A short personal letter that ties the report together, written from the facts above only.', writeLetter: 'Write the letter', rewrite: 'Rewrite the letter', writing: 'Writing…', letterOff: '',
  cannot: 'What this report cannot do', cannotP: 'It cannot know what other people will decide, or promise outcomes. Timings are windows, not exact days. Use it alongside good sense and good advice, and come back each month to mark what matched in your prediction tracker.',
  allReports: 'All reports', reading: 'Reading the chart…', notFound: 'Report not found', back: 'Back', calcErr: 'Could not compute this chart', calcErrP: 'Check the date, time and place, then make the report again.',
  aspHi: false
};
const HI_SIGNS = ['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुंभ','मीन'];
const HI_NAKS = ['अश्विनी','भरणी','कृत्तिका','रोहिणी','मृगशिरा','आर्द्रा','पुनर्वसु','पुष्य','आश्लेषा','मघा','पूर्वा फाल्गुनी','उत्तरा फाल्गुनी','हस्त','चित्रा','स्वाति','विशाखा','अनुराधा','ज्येष्ठा','मूल','पूर्वाषाढ़ा','उत्तराषाढ़ा','श्रवण','धनिष्ठा','शतभिषा','पूर्वा भाद्रपद','उत्तरा भाद्रपद','रेवती'];
const HI_PL = { Sun: 'सूर्य', Moon: 'चंद्रमा', Mars: 'मंगल', Mercury: 'बुध', Jupiter: 'गुरु', Venus: 'शुक्र', Saturn: 'शनि', Rahu: 'राहु', Ketu: 'केतु' };
const HI_ORD = ['पहले','दूसरे','तीसरे','चौथे','पाँचवें','छठे','सातवें','आठवें','नौवें','दसवें','ग्यारहवें','बारहवें'];
const HI_TARA = { Janma: 'जन्म', Sampat: 'संपत', Vipat: 'विपत', Kshema: 'क्षेम', Pratyak: 'प्रत्यक', Sadhana: 'साधक', Naidhana: 'नैधन', Mitra: 'मित्र', 'Param Mitra': 'परम मित्र' };
const HI = Object.assign({}, EN, {
  signs: HI_SIGNS, naks: HI_NAKS, planet: p => HI_PL[p] || p,
  area: { 1: 'स्वयं और सेहत', 2: 'धन, परिवार और वाणी', 3: 'मेहनत, हिम्मत और भाई-बहन', 4: 'घर, माँ और मन की शांति', 5: 'संतान, पढ़ाई और रचनात्मकता', 6: 'रोज़ का काम, कर्ज़ और सेहत की आदतें', 7: 'साझेदारी और विवाह', 8: 'अचानक बदलाव और साझा धन', 9: 'भाग्य, पिता और गुरु', 10: 'करियर और प्रतिष्ठा', 11: 'आमदनी, लाभ और संपर्क', 12: 'खर्च, विश्राम, विदेश और अंतर्मन' },
  ord: n => HI_ORD[n - 1] || n, house: n => `${HI_ORD[n - 1]} भाव`,
  dig: { exalted: 'उच्च', debilitated: 'नीच', own: 'स्वराशि में', moolatrikona: 'मूलत्रिकोण में', friend: 'मित्र राशि में', neutral: 'सम राशि में', enemy: 'शत्रु राशि में' },
  tara: x => HI_TARA[x] || x,
  chapters: ['इसे कैसे पढ़ें', 'आप कौन हैं', 'आप यहाँ क्या सीखने आए हैं', 'आपके नौ गुरु', 'आपके जीवन के अध्याय', 'यह साल', 'महीने दर महीने', 'यह हफ़्ता', 'आपका और जो आपका नहीं', 'आपकी राह के लिए गीता', 'आपका साप्ताहिक अभ्यास', 'आपका भविष्यवाणी ट्रैकर', null],
  letterFor: n => `${n} के लिए एक पत्र`,
  inThis: 'किसी अध्याय पर जाएँ', chaptersBtn: 'अध्याय', lifeReport: 'जीवन रिपोर्ट',
  lagna: 'लग्न', moon: 'चंद्रमा', running: 'अभी चल रही', until: 'तक',
  kundliKey: 'अंक <strong>राशियाँ</strong> हैं (1 मेष … 12 मीन)। भाव तय खाने हैं: ऊपर का बीच वाला खाना <strong>पहला भाव</strong> है, फिर उल्टी घड़ी की दिशा में।',
  how: 'यह रिपोर्ट आपके जन्म के समय के आकाश की सटीक गणना से बनी है (निरयण राशिचक्र, लाहिरी अयनांश, पूरी राशि वाले भाव, विंशोत्तरी दशा)। पढ़त पारंपरिक ज्योतिष के अनुसार है। इसे फ़ैसला नहीं, स्वभाव और समय का नक्शा मानिए।',
  timeNote: { exact: 'आपने जन्म समय को सटीक बताया है।', 15: 'आपने जन्म समय को लगभग 15 मिनट तक सही बताया है।', 60: 'आपने जन्म समय को लगभग एक घंटे तक सही बताया है, इसलिए लग्न वाली बातें कम पक्की हैं।', unknown: 'जन्म समय पता नहीं है, इसलिए लग्न और भावों पर टिकी हर बात अनिश्चित है। चंद्रमा वाली बातें ज़्यादा भरोसेमंद हैं।' },
  stable: (s, a, b) => `दिए गए समय से ${a} मिनट पहले से ${b} मिनट बाद तक लग्न ${s} ही रहता है।`,
  markIt: 'नीचे की हर बात इतनी साफ़ लिखी है कि गलत भी हो सकती है। उसे <em>यह मैं हूँ</em> या <em>यह मैं नहीं</em> चुनें। जो आपकी ज़िंदगी से मेल न खाए, उसकी सलाह छोड़ दें।',
  pro: 'सेहत, पैसे, कानून और मानसिक स्वास्थ्य के फ़ैसले योग्य जानकार से ही लें। अगर उदासी दो हफ़्ते से ज़्यादा रहे, तो डॉक्टर या काउंसलर से बात करें।',
  match: 'क्या यह आप पर सही बैठता है?', me: 'यह मैं हूँ', notMe: 'यह मैं नहीं',
  rising: (s, l, h, area) => `आपका लग्न ${s} है, जिसके स्वामी ${l} आपके ${h} (${area}) में हैं।`,
  moonLine: (s, h, n, l) => `आपका चंद्रमा, यानी आपका मन, ${s} राशि में, ${h} में, ${n} नक्षत्र में है (स्वामी ${l})।`,
  strongLine: (p, d, h) => `${p} आपके ${h} में बलवान (${d}) हैं।`,
  ak: p => `आपकी आत्मा के गुरु (आत्मकारक) ${p} हैं।`, kl: s => `आपका कारकांश, यानी आत्मा की राशि, ${s} है।`,
  nodes: (a, b) => `राहु आपके ${a} में, केतु ${b} में:`, ten: (p, h) => `आपके कर्म भाव के स्वामी ${p} हैं, जो आपके ${h} में बैठे हैं।`,
  teachersIntro: 'हर ग्रह एक गुरु है जिसकी आपके लिए एक सीख है। हर एक को खोलकर पढ़ें कि वह कहाँ है और क्या माँगता है।',
  retro: 'वक्री', combust: 'अस्त', practice: 'अभ्यास', lesson: 'सीख', now: 'अभी',
  lifeIntro: 'विंशोत्तरी दशा जीवन को अध्यायों में बाँटती है, हर अध्याय का नेतृत्व एक ग्रह करता है। बीते अध्यायों को देखें: क्या उनकी बातें आपके जिए हुए से मेल खाती हैं?',
  cols: { chapter: 'अध्याय', age: 'उम्र', dates: 'तारीखें', about: 'किस बारे में', date: 'तारीख', event: 'घटना', house: 'भाव', brings: 'आमतौर पर क्या लाता है', month: 'महीना', period: 'दशा', focus: 'ध्यान', day: 'दिन', grade: 'ग्रेड', tara: 'तारा', rk: 'राहु काल' },
  nowCh: (p, d) => `अभी: ${p} का अध्याय (${d} तक)`, nextCh: (p, d) => `आगे: ${p} का अध्याय, ${d} से`,
  rules: (p, h, area) => `${p} आपके ${h} (${area}) के स्वामी हैं:`,
  inAd: (a, b, d) => `आप ${d} तक ${a}–${b} दशा में हैं।`, then: 'उसके बाद', from: 'से',
  satTitle: 'शनि का लंबा गोचर', dhaiya: 'शनि आपके चंद्रमा से चौथे या आठवें में है (ढैया): घर या साझा मामलों में धीमा, भारी समय। दिनचर्या सरल रखें और शुरू किया काम पूरा करें।',
  bigTurns: 'अगले 12 महीनों के बड़े मोड़', turns: (b, x) => `${b} ${x === 'retrograde' ? 'वक्री' : 'मार्गी'} होंगे`, enters: (b, s) => `${b} का ${s} में प्रवेश`,
  fromMoon: n => `चंद्रमा से ${n}`, fromLagna: n => `लग्न से ${n}`, pause: 'रुककर देखने का समय: नया शुरू करने से ज़्यादा समीक्षा करें।',
  monthsIntro: 'धीमे ग्रह हर महीने का मौसम तय करते हैं। चंद्रमा से अच्छे भाव में गुरु दरवाज़े खोलते हैं; अच्छे भाव में शनि मेहनत का फल देते हैं।',
  focusJ: a => `${a} में अवसर`, focusS: a => `${a} में मेहनत का फल`, slow: 'धीरे और स्थिर; ऊर्जा बचाएँ', cons: 'मज़बूती दें; अधूरे काम पूरे करें',
  weekIntro: 'आपके जन्म चंद्रमा से गोचर चंद्रमा के भाव (चंद्र बल) और तारा से ग्रेड दिया गया है। ज़रूरी काम A दिनों पर शुरू करें; C दिनों पर दिनचर्या पर टिके रहें।',
  chandrashtama: 'चंद्राष्टम',
  yoursIntro: 'गीता की पहली व्यावहारिक सीख: जो आपका है उसमें पूरी मेहनत लगाइए, और जो आपका नहीं उसे छोड़ दीजिए। जीवन के हर क्षेत्र के लिए:',
  ruledBy: (l, h) => `स्वामी ${l}, आपके ${h} में।`, yours: 'आपके करने का', notYours: 'जो आपको ढोना नहीं है',
  gitaIntro: 'नीचे का हर श्लोक उस समय के लिए चुना गया है जिससे आप गुज़र रहे हैं। पहले सरल अर्थ पढ़ें; संस्कृत भी दी गई है।',
  gitaNote: 'ग्रहों को गीता के विषयों से जोड़ना आज का एक सिखाने का तरीका है, शास्त्र नहीं।',
  gita: k => `भगवद्गीता ${k}`, why: 'यह श्लोक आपके लिए क्यों:', simple: 'सरल शब्दों में:', words: 'शब्दों के अर्थ', sanskrit: 'संस्कृत में पढ़ें', tryWeek: 'इस हफ़्ते करके देखें:',
  forCh: p => `आपके ${p} अध्याय के लिए:`, forAd: p => `${p} की अंतर्दशा के लिए:`,
  ifthen: '“अगर…, तो मैं…” की तरह लिखी योजनाएँ सिर्फ़ इरादों से कहीं ज़्यादा निभाई जाती हैं। अपनी तीन लिखिए:',
  plan: n => `योजना ${n}`, ph: ['अगर रात के 11 बजे मन बेचैन हो, तो मैं आज का पाठ खोलूँगा।', 'अगर कोई मुश्किल बात करनी है, तो मैं A दिन पर दोपहर से पहले करूँगा।', 'अगर मैं नतीजे की चिंता करने लगूँ, तो मैं अगला छोटा कदम लिखूँगा।'], saved: 'सहेज लिया।',
  trackIntro: 'इस रिपोर्ट की हर समय वाली बात यहाँ है। जब उसका समय आए, तो लिखिए कि असल में क्या हुआ। आपका स्कोर दिखाएगा कि यह कुंडली आपकी ज़िंदगी को कितना सही पढ़ती है, और किन हिस्सों पर भरोसा करना है।',
  happened: 'हुआ', partly: 'कुछ हद तक', didnt: 'नहीं हुआ', checkBack: d => `${d} से देखें`, score: 'आपका सही होने का प्रतिशत', marked: (n, t) => `${t} में से ${n} चुने`, noScore: 'प्रतिशत देखने के लिए कुछ बातें चुनें।',
  pWeekA: 'आसान दिन: आज जो शुरू करेंगे उसमें रुकावट कम आनी चाहिए।', pWeekB: 'सामान्य दिन: रोज़ का काम ठीक चलेगा; न ज़्यादा साथ, न ज़्यादा विरोध।', pWeekC: 'भारी दिन: देरी, थकान या खटपट की संभावना ज़्यादा। नई शुरुआत से बेहतर दिनचर्या।',
  pAd: (a, b) => `${a}–${b} दशा:`,
  letterIntro: 'एक छोटा निजी पत्र जो पूरी रिपोर्ट को जोड़ता है, सिर्फ़ ऊपर के तथ्यों से लिखा गया।', writeLetter: 'पत्र लिखें', rewrite: 'पत्र दोबारा लिखें', writing: 'लिखा जा रहा है…', letterOff: '',
  cannot: 'यह रिपोर्ट क्या नहीं कर सकती', cannotP: 'यह नहीं जान सकती कि दूसरे लोग क्या फ़ैसला करेंगे, और नतीजों का वादा नहीं कर सकती। समय एक खिड़की है, सटीक दिन नहीं। इसे समझदारी और अच्छी सलाह के साथ इस्तेमाल करें, और हर महीने ट्रैकर में लिखें कि क्या मेल खाया।',
  allReports: 'सभी रिपोर्ट', reading: 'कुंडली पढ़ी जा रही है…', notFound: 'रिपोर्ट नहीं मिली', back: 'वापस', calcErr: 'यह कुंडली नहीं बन सकी', calcErrP: 'तारीख, समय और जगह जाँचें, फिर रिपोर्ट दोबारा बनाएँ।'
});

/* ---------- saved reports ---------- */
function localReports() { return A.store.get('jp-reports', []); }
async function listReports() {
  let list = localReports();
  if (A.db && A.uid) { try { const s = await A.db.collection(`data/users/${A.uid}/reports`).get(); const remote = (s.docs || []).map(d => ({ id: d.id, ...JSON.parse(JSON.stringify(d.data() || {})) }));
    const ids = new Set(remote.map(r => r.id)); list = remote.concat(list.filter(r => !ids.has(r.id))); } catch (e) {} }
  return list.sort((a, b) => String(b.created).localeCompare(String(a.created)));
}
async function saveReport(r) {
  const loc = localReports().filter(x => x.id !== r.id); loc.unshift(r); A.store.set('jp-reports', loc.slice(0, 30));
  if (A.db && A.uid) { try { await A.db.doc(`data/users/${A.uid}/reports/${r.id}`).set(JSON.parse(JSON.stringify(r))); A.setSync('account'); } catch (e) { A.setSync('error'); } }
}
async function getReport(id) { const all = await listReports(); return all.find(r => r.id === id) || null; }

/* ---------- North Indian kundli ---------- */
function kundli(c, T) {
  T = T || EN; const ab = T === HI ? AB_HI : AB;
  const pos = { 1: [150, 78], 2: [75, 38], 3: [38, 78], 4: [80, 150], 5: [38, 222], 6: [75, 262], 7: [150, 222], 8: [225, 262], 9: [262, 222], 10: [220, 150], 11: [262, 78], 12: [225, 38] };
  const byH = {}; for (const [p, v] of Object.entries(c.planets)) (byH[v.house] = byH[v.house] || []).push(ab[p] + (v.retro ? '℞' : ''));
  let s = `<svg class="kundli" viewBox="0 0 300 300" role="img" aria-label="North Indian chart"><rect class="frame" x="2" y="2" width="296" height="296" rx="6"/><path class="frame" d="M2 2 L298 298 M298 2 L2 298 M150 2 L298 150 L150 298 L2 150 Z"/>`;
  for (let h = 1; h <= 12; h++) { const [x, y] = pos[h], sign = (c.lagna + h - 1) % 12 + 1, pl = byH[h] || [];
    s += `<text class="hn${h === 1 ? ' asc' : ''}" x="${x}" y="${y - 12}" text-anchor="middle">${sign}${h === 1 ? (T === HI ? ' लग्न' : ' Asc') : ''}</text>`;
    pl.forEach((p, i) => { s += `<text class="pl" x="${x}" y="${y + 3 + i * 12 - (pl.length - 1) * 4}" text-anchor="middle">${esc(p)}</text>`; }); }
  return s + `</svg><p class="small" style="text-align:center;margin:0">${T.kundliKey}</p>`;
}
A.kundliSVG = c => kundli(c, EN);

/* ---------- form ---------- */
async function renderForm() {
  const v = A.view, list = await listReports();
  v.innerHTML = `<section class="hero">${A.wheelSVG()}<div class="eyebrow">Life Report · ₹499, once</div><h1 class="t" style="margin:0;color:inherit">Your whole chart, read from life purpose down to this week.</h1>
    <p>Who you are, what is in your hands and what is not, the chapters of your life with dates, this year month by month, and a plan for the week. In English or Hindi, with the Gita’s guidance for the road you are on.</p>
    <p class="status">${A.owner ? 'Free for you as the owner.' : 'Payment opens when the report moves to its own website.'} The astronomy is exact; the reading is tradition, offered as guidance.</p></section>
  <div class="grid2" style="margin-top:16px">
    <div class="card"><div class="eyebrow">Exact sky</div><p class="small" style="margin:.3em 0 0">Planet positions checked against Swiss Ephemeris to within seconds of arc.</p></div>
    <div class="card"><div class="eyebrow">Scored, not guessed</div><p class="small" style="margin:.3em 0 0">Every timed statement goes into your tracker, so you see how often it came true.</p></div>
    <div class="card"><div class="eyebrow">No fear, no remedies to buy</div><p class="small" style="margin:.3em 0 0">What is yours to do, what to leave to God, and practical steps.</p></div>
  </div>
  <h2>Birth details</h2>
  <form class="card form" id="rf" autocomplete="off">
    <label class="f" for="r-name">Name</label><input id="r-name" required maxlength="60" placeholder="Full name">
    <div class="two"><label class="f">Date of birth<input type="date" id="r-date" required min="1900-01-01" max="2100-12-31"></label><label class="f">Time of birth<input type="time" id="r-time" required></label></div>
    <label class="f" for="r-conf">How sure are you of the time?</label><select id="r-conf"><option value="exact">Exact (birth certificate or hospital record)</option><option value="15">Within about 15 minutes</option><option value="60">Within about an hour</option><option value="unknown">Not known</option></select>
    <label class="f" for="r-place">Place of birth</label><input id="r-place" placeholder="Start typing a city, e.g. Satna" required><div id="r-sugg" class="row"></div>
    <details><summary class="small muted">Enter coordinates by hand</summary><div class="two" style="margin-top:8px"><label class="f">Latitude<input id="r-lat" inputmode="decimal" placeholder="24.58"></label><label class="f">Longitude<input id="r-lon" inputmode="decimal" placeholder="80.83"></label></div><label class="f">Time zone<input id="r-tz" placeholder="Asia/Kolkata"></label></details>
    <label class="f" for="r-lang">Report language</label><select id="r-lang"><option value="en">English</option><option value="hi">हिंदी (Hindi)</option></select>
    <p class="status" id="r-err" role="alert"></p>
    <div class="row"><button class="btn accent" type="submit">Make my report</button></div>
  </form>
  ${list.length ? `<h2>Saved reports</h2><ul class="lessons">${list.map(r => `<li><a href="#r-${esc(r.id)}"><span>${esc(r.input.name)}</span><span class="end">${esc(r.input.date)} · ${esc(r.input.place)}</span></a></li>`).join('')}</ul>` : ''}`;
  const place = v.querySelector('#r-place'), sugg = v.querySelector('#r-sugg');
  place.addEventListener('input', async () => { const q = place.value.trim().toLowerCase(); sugg.textContent = ''; if (q.length < 2) return;
    const cs = await cities(); const hits = cs.filter(c => c[0].toLowerCase().startsWith(q)).slice(0, 6);
    for (const c of hits) { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = `${c[0]}${c[1] ? ', ' + c[1] : ''} (${c[2]})`;
      b.onclick = () => { place.value = `${c[0]}${c[1] ? ', ' + c[1] : ''}`; sugg.textContent = ''; v.querySelector('#r-lat').value = c[3]; v.querySelector('#r-lon').value = c[4]; v.querySelector('#r-tz').value = c[5]; }; sugg.appendChild(b); } });
  v.querySelector('#rf').onsubmit = async e => {
    e.preventDefault(); const err = v.querySelector('#r-err'); err.textContent = '';
    const name = v.querySelector('#r-name').value.trim(), date = v.querySelector('#r-date').value, time = v.querySelector('#r-time').value;
    const lat = parseFloat(v.querySelector('#r-lat').value), lon = parseFloat(v.querySelector('#r-lon').value), tz = v.querySelector('#r-tz').value.trim();
    if (!name || !date || !time) { err.textContent = 'Enter the name, date and time of birth.'; return; }
    if (!(lat >= -66 && lat <= 66) || !(lon >= -180 && lon <= 180)) { err.textContent = 'Choose a city from the suggestions, or enter latitude and longitude by hand.'; return; }
    try { new Intl.DateTimeFormat('en', { timeZone: tz || 'x' }); } catch (x) { err.textContent = 'Choose a city, or enter a valid time zone such as Asia/Kolkata.'; return; }
    const r = { id: 'r' + Date.now().toString(36), created: new Date().toISOString(), lang: v.querySelector('#r-lang').value === 'hi' ? 'hi' : 'en', input: { name: name.slice(0, 60), date, time, conf: v.querySelector('#r-conf').value, place: place.value.trim().slice(0, 80) || `${lat}, ${lon}`, lat, lon, tz }, confirms: {}, outcomes: {}, ifthen: ['', '', ''], letter: '' };
    await saveReport(r); location.hash = 'r-' + r.id;
  };
}

/* ---------- helpers ---------- */
const THEME_PLAIN = { Sun: 'owning your duty and your place in the world', Moon: 'steadying the mind', Mars: 'courage with self-control', Mercury: 'clear thinking and good judgement', Jupiter: 'right conduct, learning and finding your teachers', Venus: 'enjoying life without losing yourself in it', Saturn: 'patient effort, endurance and service', Rahu: 'handling strong desires and ambition', Ketu: 'letting go of what no longer serves you' };
const THEME_HI = { Sun: 'अपने कर्तव्य और दुनिया में अपनी जगह को अपनाना', Moon: 'मन को स्थिर रखना', Mars: 'संयम के साथ साहस', Mercury: 'साफ़ सोच और सही निर्णय', Jupiter: 'सही आचरण, सीखना और अपने गुरु ढूँढना', Venus: 'जीवन का आनंद, खुद को खोए बिना', Saturn: 'धैर्य से मेहनत, सहनशीलता और सेवा', Rahu: 'तेज़ इच्छाओं और महत्वाकांक्षा को संभालना', Ketu: 'जो अब काम का नहीं उसे छोड़ना' };
const lib = (o, k, fb = '') => (o && typeof o[k] === 'string') ? o[k] : fb;
function scrollToId(id) {
  const t = document.getElementById(id); if (!t) return;
  const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  try { t.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' }); } catch (e) { t.scrollIntoView(true); }
  t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true });
}

async function renderReport(id) {
  const v = A.view; v.innerHTML = `<section class="hero">${A.wheelSVG()}<p class="muted">${EN.reading}</p></section>`;
  const r = await getReport(id);
  if (!r) { v.innerHTML = `<h1>${EN.notFound}</h1><a class="btn" href="#report">${EN.back}</a>`; return; }
  r.outcomes = r.outcomes || {}; r.confirms = r.confirms || {}; r.ifthen = r.ifthen || ['', '', ''];
  const lang = r.lang === 'hi' ? 'hi' : 'en'; await libs(lang);
  const T = lang === 'hi' && LIB_HI ? HI : EN, L = T === HI ? LIB_HI : LIB, G = T === HI ? GITA_HI : GITA, THEME = T === HI ? THEME_HI : THEME_PLAIN;
  const PN = p => T.planet(p), S = i => T.signs[i];
  const X = (T === HI && EXM_HI) ? EXM_HI : (EXM || {});
  const EGL = T === HI ? 'असल ज़िंदगी में' : 'In real life';
  const eg = (sec, key, field) => { const o = X[sec] && X[sec][key]; const t = typeof o === 'string' ? o : (o && o[field || 'example']); return t ? `<p class="eg"><span>${EGL}</span> ${esc(t)}</p>` : ''; };
  const BX = ids => { const B = X.basics || {}; const items = ids.filter(i => B[i]); if (!items.length) return '';
    return `<details class="basics"><summary>${T === HI ? 'बुनियादी बातें समझें' : 'Learn the basics'}: ${items.map(i => esc(B[i].term)).join(', ')}</summary><dl>${items.map(i => `<dt>${esc(B[i].term)}</dt><dd><p>${esc(B[i].what)}</p><p class="like">${esc(B[i].like)}</p><p class="eg"><span>${EGL}</span> ${esc(B[i].example)}</p></dd>`).join('')}</dl></details>`; };
  const [y, mo, d] = r.input.date.split('-').map(Number), [hh, mi] = r.input.time.split(':').map(Number);
  let f; try { f = window.LifeFacts.facts({ name: r.input.name, y, mo, d, h: hh, mi, tz: r.input.tz, lat: r.input.lat, lon: r.input.lon, place: r.input.place, timeConfidence: r.input.conf }); }
  catch (e) { v.innerHTML = `<h1>${T.calcErr}</h1><p>${T.calcErrP}</p><a class="btn" href="#report">${T.back}</a>`; return; }
  const loc = T === HI ? 'hi-IN' : 'en-IN';
  const fm = (dt, o) => new Intl.DateTimeFormat(loc, Object.assign({ timeZone: f.tz }, o || { day: 'numeric', month: 'short', year: 'numeric' })).format(dt);
  const c = f.chart, P = c.planets, first = r.input.name.split(/\s+/)[0];
  const lagLord = c.lords[1], moon = P.Moon, strong = Object.keys(P).filter(p => ['exalted', 'own', 'moolatrikona'].includes(P[p].dignity));
  const ad = f.ads.find(a => a.current), nextAds = f.ads.filter(a => a.start > new Date()).slice(0, 3);
  const md = f.lifeArc.find(m => m.current), nextMd = f.lifeArc[f.lifeArc.indexOf(md) + 1];
  const H = n => T.house(n);
  const claim = (key, html) => { const st = r.confirms[key]; return `<div class="claim" data-key="${esc(key)}">${html}<div class="row" style="margin-top:8px"><span class="small muted">${T.match}</span><button type="button" class="chip" data-c="yes" aria-pressed="${st === 'yes'}">${T.me}</button><button type="button" class="chip no" data-c="no" aria-pressed="${st === 'no'}">${T.notMe}</button></div></div>`; };
  const chapterTitles = T.chapters.slice(0, 12).concat([T.letterFor(first)]);
  const ids = ['s-how', 's-who', 's-purpose', 's-teachers', 's-life', 's-year', 's-months', 's-week', 's-yours', 's-gita', 's-plan', 's-track', 's-letter'];
  const head = i => `<h2 id="${ids[i]}" class="rsec"><span class="num">${i + 1}</span>${esc(chapterTitles[i])}</h2>`;
  const sec = [];
  sec.push(`<section class="hero" id="r-top">${A.wheelSVG()}
    <div class="row" style="justify-content:space-between;position:relative;z-index:1"><div class="eyebrow">${T.lifeReport}</div>
      <div class="langswitch" role="group" aria-label="Language"><button type="button" data-lang="en" aria-pressed="${T === EN}">English</button><button type="button" data-lang="hi" aria-pressed="${T === HI}">हिंदी</button></div><button type="button" class="pdfbtn" data-print>${T === HI ? 'PDF सहेजें' : 'Save as PDF'}</button></div>
    <div class="t">${esc(r.input.name)}</div>
    <p class="muted">${esc(fm(f.birth, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }))} · ${esc(r.input.place)}</p>
    ${kundli(c, T)}
    <p><strong>${T.lagna}</strong> ${S(c.lagna)} ${c.ascDeg.toFixed(1)}° · <strong>${T.moon}</strong> ${S(moon.sign)}, ${T.naks[moon.nak]} ${T === HI ? 'चरण' : 'pada'} ${moon.pada} · <strong>${T.running}</strong> ${esc(PN(f.current.md))}–${esc(PN(f.current.ad))} ${T === HI ? esc(fm(f.current.adEnd)) + ' ' + T.until : T.until + ' ' + esc(fm(f.current.adEnd))}</p></section>`);
  sec.push(`<nav class="card" id="r-index" aria-label="${T.inThis}" style="margin-top:18px"><div class="eyebrow">${T.inThis}</div><ol class="chapters">${chapterTitles.map((t, i) => `<li><button type="button" data-go="${ids[i]}"><b>${i + 1}</b><span>${esc(t)}</span></button></li>`).join('')}</ol></nav>`);
  sec.push(`${head(0)}${BX(['lagna', 'moon_sign', 'sun_sign_vs_vedic', 'sign', 'degree', 'house', 'planet', 'nakshatra', 'pada', 'birth_time_accuracy', 'ayanamsa'])}<p>${T.how}</p>
    <ul><li>${esc(T.timeNote[r.input.conf] || '')} ${esc(T.stable(S(c.lagna), f.lagnaStable.before, f.lagnaStable.after))}</li>${T === EN ? f.warn.map(w => `<li>${esc(w)}</li>`).join('') : ''}
    <li>${T.markIt}</li><li>${T.pro}</li></ul>`);
  const who = [claim('lagna', `<p><strong>${esc(T.rising(S(c.lagna), PN(lagLord), H(P[lagLord].house), T.area[P[lagLord].house]))}</strong> ${esc(lib(L.planet_in_house, `${lagLord}-${P[lagLord].house}`))}</p>${eg('planet_in_house', `${lagLord}-${P[lagLord].house}`)}<p></p>`),
               claim('moon', `<p><strong>${esc(T.moonLine(S(moon.sign), H(moon.house), T.naks[moon.nak], PN(NAK_LORD[moon.nak % 9])))}</strong> ${esc(lib(L.planet_in_house, `Moon-${moon.house}`))}</p>${eg('planet_in_house', `Moon-${moon.house}`)}<p></p>`)];
  for (const p of strong.filter(p => p !== lagLord && p !== 'Moon').slice(0, 3)) who.push(claim('s-' + p, `<p><strong>${esc(T.strongLine(PN(p), T.dig[P[p].dignity], H(P[p].house)))}</strong> ${esc(lib(L.planet_in_house, `${p}-${P[p].house}`))} ${esc(lib(L.dignity, P[p].dignity))}</p>${eg('planet_in_house', `${p}-${P[p].house}`)}`));
  for (const yg of f.yogas) { const t = lib(L.yogas, yg.name) || lib(L.yogas, yg.name.replace('Debilitated ', '')); who.push(`<div class="claim"><p><strong>${esc(T === HI ? yg.name.replace('Debilitated ', 'नीच ') + ' योग' : yg.name)}</strong>${T === EN ? ' — ' + esc(yg.why.replace(/\.$/, '')) + '.' : ''} ${esc(t)}</p>${eg('yogas', yg.name) || eg('yogas', yg.name.replace('Debilitated ', ''))}</div>`); }
  sec.push(`${head(1)}${BX(['house_lord', 'exalted', 'own_sign', 'debilitated', 'neecha_bhanga', 'yoga', 'retrograde', 'combust'])}${who.join('')}`);
  const ak = f.ak, ten = c.lords[10];
  const akVerse = G.planets[ak] && G.planets[ak].verses[0] && G.verses.find(x => x.key === G.planets[ak].verses[0]);
  sec.push(`${head(2)}${BX(['atmakaraka', 'karakamsa', 'navamsa', 'rahu_ketu'])}
    ${claim('ak', `<p><strong>${esc(T.ak(PN(ak)))}</strong> ${esc(lib(L.purpose.AK, ak))}</p>`)}
    ${claim('kl', `<p><strong>${esc(T.kl(S(f.karakamsa)))}</strong> ${esc(lib(L.purpose.karakamsa, J.SIGNS[f.karakamsa]))}</p>`)}
    ${claim('nodes', `<p><strong>${esc(T.nodes(H(f.rahuHouse), H(f.ketuHouse)))}</strong> ${esc(lib(L.purpose.nodes, String(f.rahuHouse)))}</p>`)}
    ${claim('ten', `<p><strong>${esc(T.ten(PN(ten), H(P[ten].house)))}</strong> ${esc(lib(L.planet_in_house, `${ten}-${P[ten].house}`))}</p>${eg('planet_in_house', `${ten}-${P[ten].house}`)}<p></p>`)}
    ${akVerse ? verseHTML(akVerse, T === HI ? `${PN(ak)} आपकी आत्मा के गुरु हैं, और उनकी सीख है ${THEME[ak]}।` : `${ak} is your soul's teacher, and its lesson is ${THEME[ak]}.`, T) : ''}`);
  sec.push(`${head(3)}${BX(['karaka'])}<p class="muted">${T.teachersIntro}</p>` +
    Object.keys(P).map(p => { const q = P[p], PL = L.planets[p] || {}; return `<details class="card" style="margin:10px 0"><summary><strong>${esc(PN(p))}</strong> <span class="muted small">· ${S(q.sign)} · ${H(q.house)}${q.dignity ? ' · ' + T.dig[q.dignity] : ''}${q.retro ? ' · ' + T.retro : ''}${q.combust ? ' · ' + T.combust : ''}</span></summary>
      <p>${esc(lib(PL, 'life_lesson'))}</p>${eg('planets', p)}<p>${esc(lib(L.planet_in_house, `${p}-${q.house}`))}</p>${eg('planet_in_house', `${p}-${q.house}`)}${q.dignity ? `<p class="small">${esc(lib(L.dignity, q.dignity))}</p>` : ''}${q.retro ? `<p class="small">${esc(lib(L.dignity, 'retro'))}</p>` : ''}${q.combust ? `<p class="small">${esc(lib(L.dignity, 'combust'))}</p>` : ''}
      <p class="small"><strong>${T.practice}:</strong> ${esc(lib(PL, 'practice'))}</p></details>`; }).join(''));
  const C = T.cols;
  sec.push(`${head(4)}${BX(['dasha', 'antardasha'])}<p class="muted">${T.lifeIntro}</p>
    <div class="tbl"><table><thead><tr><th>${C.chapter}</th><th>${C.age}</th><th>${C.dates}</th><th>${C.about}</th></tr></thead><tbody>${f.lifeArc.filter(m => m.ageTo > 0).map(m => `<tr class="${m.current ? 'now' : ''}"><td><strong>${esc(PN(m.lord))}</strong>${m.current ? ' · ' + T.now : ''}</td><td class="mono">${m.ageFrom.toFixed(0)}–${m.ageTo.toFixed(0)}</td><td class="mono">${esc(fm(m.start, { month: 'short', year: 'numeric' }))} – ${esc(fm(m.end, { month: 'short', year: 'numeric' }))}</td><td>${esc(lib(L.dasha[m.lord], 'theme'))}</td></tr>`).join('')}</tbody></table></div>
    ${md ? `<h3>${esc(T.nowCh(PN(md.lord), fm(md.end)))}</h3><p><strong>${T.lesson}:</strong> ${esc(lib(L.dasha[md.lord], 'lesson'))}</p>${eg('dasha', md.lord)}${md.rules.map(hn => `<p>${esc(T.rules(PN(md.lord), H(hn), T.area[hn]))} ${esc(lib(L.dasha_by_house, String(hn)))}</p>`).join('')}` : ''}
    ${nextMd ? `<h3>${esc(T.nextCh(PN(nextMd.lord), fm(nextMd.start, { month: 'long', year: 'numeric' })))}</h3><p>${esc(lib(L.dasha[nextMd.lord], 'theme'))} <strong>${T.lesson}:</strong> ${esc(lib(L.dasha[nextMd.lord], 'lesson'))}</p>` : ''}`);
  const evs = f.events.filter(e => e.body !== 'Ketu');
  const evText = e => e.turns ? T.turns(PN(e.body), e.turns) : T.enters(PN(e.body), S(e.to));
  const evRows = evs.map(e => `<tr><td class="mono">${esc(fm(e.date))}</td><td>${esc(evText(e))}</td><td>${esc(T.fromMoon(T === HI ? e.fromMoon : e.fromMoon))}<br><span class="small muted">${esc(T.fromLagna(e.fromLagna))}</span></td><td>${e.turns ? T.pause : esc(lib(L.transits[e.body], String(e.fromMoon)))}</td></tr>`).join('');
  sec.push(`${head(5)}${BX(['transit', 'sade_sati'])}${ad ? `<p><strong>${esc(T.inAd(PN(ad.md), PN(ad.ad), fm(ad.end)))}</strong> ${esc(lib(L.dasha[ad.ad], 'theme'))}</p>${eg('dasha', ad.ad)}${ad.adRules.map(hn => `<p>${esc(T.rules(PN(ad.ad), H(hn), T.area[hn]))} ${esc(lib(L.dasha_by_house, String(hn)))}</p>`).join('')}` : ''}
    ${nextAds.length ? `<p class="muted">${T.then}: ${nextAds.map(a => `${esc(PN(a.md))}–${esc(PN(a.ad))} ${T === HI ? esc(fm(a.start, { month: 'short', year: 'numeric' })) + ' ' + T.from : T.from + ' ' + esc(fm(a.start, { month: 'short', year: 'numeric' }))}`).join(' · ')}</p>` : ''}
    ${f.sadeSati ? `<div class="schools"><div class="eyebrow">${T.satTitle}</div><p>${esc(f.sadeSati === 'dhaiya' ? T.dhaiya : lib(L.sade_sati, f.sadeSati))}</p>${f.sadeSati === 'dhaiya' ? '' : eg('sade_sati', f.sadeSati)}</div>` : ''}
    ${evRows ? `<h3>${T.bigTurns}</h3><div class="tbl"><table><thead><tr><th>${C.date}</th><th>${C.event}</th><th>${C.house}</th><th>${C.brings}</th></tr></thead><tbody>${evRows}</tbody></table></div>` : ''}`);
  const goodJ = [2, 5, 7, 9, 11], goodS = [3, 6, 11];
  const focusOf = m => { const j = m.planets.Jupiter.fromMoon, s = m.planets.Saturn.fromMoon; return goodJ.includes(j) ? T.focusJ(T.area[j]) : goodS.includes(s) ? T.focusS(T.area[s]) : [12, 1, 2].includes(s) ? T.slow : T.cons; };
  const dashaPN = s => String(s || '').split('–').map(x => PN(x)).join('–');
  sec.push(`${head(6)}<p class="muted">${T.monthsIntro}</p><div class="tbl"><table><thead><tr><th>${C.month}</th><th>${C.period}</th><th>${T === HI ? 'गुरु' : 'Jupiter'}</th><th>${T === HI ? 'शनि' : 'Saturn'}</th><th>${C.focus}</th></tr></thead><tbody>${f.months.map(m => `<tr><td class="mono">${esc(fm(m.month, { month: 'short', year: 'numeric' }))}</td><td>${esc(dashaPN(m.dasha))}</td><td>${m.planets.Jupiter.fromMoon}</td><td>${m.planets.Saturn.fromMoon}</td><td>${esc(focusOf(m))}</td></tr>`).join('')}</tbody></table></div>`);
  sec.push(`${head(7)}${BX(['tara', 'chandra_bala', 'rahu_kaal'])}<p class="muted">${T.weekIntro}</p><div class="tbl"><table><thead><tr><th>${C.day}</th><th>${C.grade}</th><th>${T.moon}</th><th>${C.tara}</th><th>${C.rk}</th></tr></thead><tbody>${f.week.map(w => `<tr><td class="mono">${esc(fm(w.date, { weekday: 'short', day: 'numeric', month: 'short' }))}</td><td><span class="grade ${w.grade}">${w.grade}</span></td><td>${esc(T.fromMoon(w.moonHouse))}${w.chandrashtama ? ' (' + T.chandrashtama + ')' : ''}<br><span class="small muted">${esc(lib(L.weekly_day.moon_house, String(w.moonHouse)))}</span></td><td>${esc(T.tara(w.tara))}<br><span class="small muted">${esc(lib(L.weekly_day.tara, w.tara))}</span></td><td class="mono">${w.rahuKaal ? esc(fm(w.rahuKaal[0], { hour: '2-digit', minute: '2-digit' })) + '–' + esc(fm(w.rahuKaal[1], { hour: '2-digit', minute: '2-digit' })) : '—'}</td></tr>`).join('')}</tbody></table></div>`);
  sec.push(`${head(8)}<p class="muted">${T.yoursIntro}</p>` +
    [1, 2, 4, 7, 10, 11].map(hn => { const HH = L.houses[String(hn)] || {}, lord = c.lords[hn]; return `<div class="card" style="margin:12px 0"><div class="eyebrow">${esc(H(hn))} · ${esc(lib(HH, 'area', T.area[hn]))}</div><p class="small muted">${esc(T.ruledBy(PN(lord), H(P[lord].house)))}</p>${eg('houses', String(hn))}
      <div class="grid2"><div><strong>${T.yours}</strong><ul>${(HH.yours || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div><div><strong>${T.notYours}</strong><ul>${(HH.not_yours || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div>${(HH.questions || []).length ? `<p class="small"><em>${esc(HH.questions[0])}</em></p>` : ''}</div>`; }).join(''));
  sec.push(`${head(9)}<p>${esc(G.frame_simple || (G.frame && G.frame.long) || '')}</p><p>${T.gitaIntro}</p>${pickVerses(f, fm, T, G, THEME).map(x => verseHTML(x.v, x.why, T)).join('')}<p class="status">${T.gitaNote}</p>`);
  const pm = L.planets[f.current.md] || {}, pa = L.planets[f.current.ad] || {};
  sec.push(`${head(10)}<div class="card"><p><strong>${esc(T.forCh(PN(f.current.md)))}</strong> ${esc(lib(pm, 'practice'))}</p><p><strong>${esc(T.forAd(PN(f.current.ad)))}</strong> ${esc(lib(pa, 'practice'))}</p>
    <p>${T.ifthen}</p>
    ${[0, 1, 2].map(i => `<label class="f">${T.plan(i + 1)}<input data-ift="${i}" maxlength="160" placeholder="${esc(T.ph[i])}"></label>`).join('')}
    <p class="status" id="ift-s"></p></div>`);
  /* prediction tracker */
  const preds = buildPredictions(f, T, L, PN, fm, focusOf, evText);
  sec.push(`${head(11)}<p class="muted">${T.trackIntro}</p><div class="card" id="track-score"></div><div class="card" style="margin-top:12px">${preds.map(p => { const st = r.outcomes[p.key], open = p.start <= new Date();
    return `<div class="pred" data-key="${esc(p.key)}"><div class="when">${esc(p.when)}</div><div>${esc(p.text)}</div>${open ? `<div class="row"><button type="button" class="chip" data-o="yes" aria-pressed="${st === 'yes'}">${T.happened}</button><button type="button" class="chip mid" data-o="part" aria-pressed="${st === 'part'}">${T.partly}</button><button type="button" class="chip no" data-o="no" aria-pressed="${st === 'no'}">${T.didnt}</button></div>` : `<div class="small muted">${esc(T.checkBack(fm(p.start)))}</div>`}</div>`; }).join('')}</div>`);
  sec.push(`${head(12)}<div class="card" id="letter-box"><p class="muted">${T.letterIntro}</p><div class="row"><button class="btn ghost" type="button" id="letter-btn" hidden>${T.writeLetter}</button></div><div id="letter" style="white-space:pre-wrap"></div></div>
    <h2>${T.cannot}</h2><p>${T.cannotP}</p>
    <div class="row" style="margin-top:20px"><a class="btn ghost" href="#report">${T.allReports}</a></div>
    <button type="button" class="jump" id="jump" hidden aria-label="${T.chaptersBtn}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg>${T.chaptersBtn}</button>`);
  v.innerHTML = sec.join('');
  if (T === HI) v.setAttribute('lang', 'hi'); else v.removeAttribute('lang');
  for (const el of v.querySelectorAll('.tbl')) if (el.scrollWidth > el.clientWidth + 4) el.classList.add('scrolls');
  v.querySelectorAll('[data-go]').forEach(b => b.onclick = e => { e.preventDefault(); scrollToId(b.dataset.go); });
  const jump = v.querySelector('#jump'), idx = v.querySelector('#r-index');
  jump.onclick = () => scrollToId('r-index');
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { for (const x of es) jump.hidden = x.isIntersecting || x.boundingClientRect.top > 0; }).observe(idx);
  v.querySelectorAll('[data-print]').forEach(b => b.onclick = () => { v.querySelectorAll('details').forEach(d => d.open = true); window.print(); });
  v.querySelectorAll('[data-lang]').forEach(b => b.onclick = async () => { if ((r.lang || 'en') === b.dataset.lang) return; r.lang = b.dataset.lang; await saveReport(r); renderReport(id); });
  v.querySelectorAll('.claim[data-key] .chip').forEach(b => b.onclick = async () => { const key = b.closest('.claim').dataset.key, val = b.dataset.c; r.confirms[key] = r.confirms[key] === val ? null : val;
    b.parentElement.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', String(r.confirms[key] === x.dataset.c))); await saveReport(r); });
  const paintScore = () => { const box = v.querySelector('#track-score'), open = preds.filter(p => p.start <= new Date()), vals = open.map(p => r.outcomes[p.key]).filter(Boolean);
    const pts = vals.reduce((s, x) => s + (x === 'yes' ? 1 : x === 'part' ? .5 : 0), 0);
    box.innerHTML = vals.length ? `<div class="score"><b>${Math.round(100 * pts / vals.length)}%</b><span>${T.score}</span><span class="small muted">${esc(T.marked(vals.length, preds.length))}</span></div><div class="progressbar" style="margin-top:10px"><i style="width:${Math.round(100 * pts / vals.length)}%"></i></div>` : `<p class="small muted" style="margin:0">${T.noScore}</p>`; };
  paintScore();
  v.querySelectorAll('.pred .chip').forEach(b => b.onclick = async () => { const key = b.closest('.pred').dataset.key, val = b.dataset.o; r.outcomes[key] = r.outcomes[key] === val ? null : val; if (!r.outcomes[key]) delete r.outcomes[key];
    b.parentElement.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', String(r.outcomes[key] === x.dataset.o))); paintScore(); await saveReport(r); });
  v.querySelectorAll('[data-ift]').forEach(inp => { inp.value = r.ifthen[+inp.dataset.ift] || ''; let t; inp.oninput = () => { clearTimeout(t); t = setTimeout(async () => { r.ifthen[+inp.dataset.ift] = inp.value.slice(0, 160); await saveReport(r); const s = v.querySelector('#ift-s'); if (s) s.textContent = T.saved; }, 700); }; });
  const box = v.querySelector('#letter');
  const letterKey = T === HI ? 'letter_hi' : 'letter';
  if (r[letterKey]) box.textContent = r[letterKey];
  (async () => { let sample = null; try { sample = await window.claude?.use?.('sample'); } catch (e) {}
    const btn = v.querySelector('#letter-btn'); if (!sample || !btn) { if (!r[letterKey]) { ['#s-letter', '#letter-box'].forEach(q => v.querySelector(q)?.remove()); v.querySelector('[data-go="s-letter"]')?.closest('li')?.remove(); } return; }
    btn.hidden = false; if (r[letterKey]) btn.textContent = T.rewrite;
    btn.onclick = async () => { btn.disabled = true; box.textContent = T.writing;
      const factsTxt = [`Name: ${first}`, `Lagna ${J.SIGNS[c.lagna]}, lord ${lagLord} in house ${P[lagLord].house}`, `Moon ${J.SIGNS[moon.sign]} house ${moon.house}, ${J.NAKS[moon.nak]}`, `Atmakaraka ${ak}; Karakamsa ${J.SIGNS[f.karakamsa]}`, `Rahu house ${f.rahuHouse}, Ketu house ${f.ketuHouse}`,
        `Strong: ${strong.join(', ') || 'none'}`, `Yogas: ${f.yogas.map(y => y.name).join(', ') || 'none'}`, `Current chapter ${f.current.md} until ${f.fmt(md ? md.end : f.current.adEnd)}; sub-period ${f.current.ad} until ${f.fmt(f.current.adEnd)}`, nextMd ? `Next chapter ${nextMd.lord} from ${f.fmt(nextMd.start, { month: 'long', year: 'numeric' })}` : '',
        `Saturn long transit: ${f.sadeSati || 'none'}`, `Confirmed by reader: ${Object.entries(r.confirms).filter(([, x]) => x === 'yes').map(([k]) => k).join(', ') || 'none yet'}; rejected: ${Object.entries(r.confirms).filter(([, x]) => x === 'no').map(([k]) => k).join(', ') || 'none'}`].filter(Boolean).join('\n');
      const langRule = T === HI ? 'Write in simple, warm, everyday Hindi (Devanagari), addressing the reader as "आप". Planet names in Hindi (शनि, गुरु, केतु…).' : 'Write in plain warm English, second person.';
      const prompt = `You are writing the closing letter of a Vedic astrology Life Report for ${first}. Use ONLY these computed facts; do not add any other placements, dates or predictions:\n${factsTxt}\n\nInterpretation notes you may draw on:\nAtmakaraka: ${lib(LIB.purpose.AK, ak)}\nCurrent chapter lesson: ${lib(LIB.dasha[f.current.md], 'lesson')}\nNext chapter lesson: ${nextMd ? lib(LIB.dasha[nextMd.lord], 'lesson') : ''}\n\n${langRule} 230–300 words, short paragraphs. Structure: (1) name what this person has likely been carrying, specific to the facts, without flattery; (2) what this current chapter is teaching and how hardship here is training, not punishment; (3) what is in their hands this month (two concrete actions) and what to leave to God; (4) close with Bhagavad Gita 2.47 in one plain line and one sentence of steady hope. Rules: no fear words, no guarantees, no "must/should", no gemstones, pujas or paid remedies, no medical or financial directives, no exact-day predictions. Do not mention that you are an AI. Return only the letter text.`;
      try { const res = await sample(prompt, { modelTier: 'default', onText: ({ text }) => { box.textContent = text; } }); r[letterKey] = String(res.text || '').slice(0, 4000); box.textContent = r[letterKey]; await saveReport(r); btn.textContent = T.rewrite; }
      catch (e) { box.textContent = e && e.code === 'not_granted' ? 'Letter writing is turned off for this app.' : 'The letter could not be written right now. Try again later.'; }
      btn.disabled = false; };
  })();
}

function verseHTML(v, why, T) {
  T = T || EN;
  const words = Array.isArray(v.words) && v.words.length ? `<details class="small"><summary>${T.words}</summary><ul>${v.words.map(w => `<li><strong>${esc(w.t)}</strong> — ${esc(w.m)}</li>`).join('')}</ul></details>` : '';
  return `<div class="verse"><div class="eyebrow">${esc(T.gita(v.key))}</div>${why ? `<p class="small"><strong>${T.why}</strong> ${esc(why)}</p>` : ''}
    <p><strong>${esc(v.plain)}</strong></p>${v.simple ? `<p><strong>${T.simple}</strong> ${esc(v.simple)}</p>` : ''}${words}
    <details class="small"><summary>${T.sanskrit}</summary><div class="dv" lang="sa">${esc(v.devanagari).replace(/\n|\s\/\s|\|/g, '<br>')}</div><div class="ia">${esc(v.iast)}</div></details>
    ${v.action ? `<p class="small"><strong>${T.tryWeek}</strong> ${esc(v.action)}</p>` : ''}</div>`;
}
function pickVerses(f, fm, T, G, THEME) {
  const out = [], seen = new Set(), hi = T === HI, PN = p => T.planet(p);
  const add = (k, why) => { const v = k && G.verses.find(x => x.key === k); if (v && !seen.has(k)) { seen.add(k); out.push({ v, why }); } };
  const first = p => ((G.planets[p] && G.planets[p].verses) || []).find(k => !seen.has(k));
  const md = f.lifeArc.find(m => m.current), my = d => fm(d, { month: 'long', year: 'numeric' });
  if (md) add(first(md.lord), hi ? `आप ${my(md.end)} तक अपने जीवन के ${PN(md.lord)} अध्याय में हैं, और ${PN(md.lord)} की सीख है ${THEME[md.lord]}।` : `you are in your ${md.lord} chapter of life until ${my(md.end)}, and ${md.lord}'s lesson is ${THEME[md.lord]}.`);
  if (f.current.ad) add(first(f.current.ad), hi ? `उस अध्याय के अंदर ${my(f.current.adEnd)} तक ${PN(f.current.ad)} आगे हैं, जो ${THEME[f.current.ad]} की सीख जोड़ते हैं।` : `inside that chapter, ${f.current.ad} leads until ${my(f.current.adEnd)}, adding the lesson of ${THEME[f.current.ad]}.`);
  add(first(f.ak), hi ? `${PN(f.ak)} आपकी आत्मा के गुरु (आत्मकारक) हैं, इसलिए ${THEME[f.ak]} की सीख पूरे जीवन चलती है।` : `${f.ak} is your soul's teacher (Atmakaraka), so ${THEME[f.ak]} is the lesson that runs through your whole life.`);
  if (f.sadeSati || f.current.md === 'Saturn' || f.current.ad === 'Saturn') add((G.themes.hardship || []).find(k => !seen.has(k)), hi ? 'अभी शनि आपके चंद्रमा पर दबाव डाल रहे हैं; यह श्लोक भारी समय को हिम्मत खोए बिना पार करने के बारे में है।' : 'Saturn is pressing on your Moon right now; this verse is about getting through heavy stretches without losing heart.');
  add('2.47', hi ? 'यह इस पूरी रिपोर्ट की नींव है: मेहनत देना आपका काम है, नतीजा आपके हाथ में नहीं।' : 'it sits under everything in this report: the effort is yours to give, the result is not yours to control.');
  add((G.themes.worth || []).find(k => !seen.has(k)), hi ? 'जो भी ऐसी रिपोर्ट तक पहुँचता है, उसने कभी न कभी खुद को कम महसूस किया है। यह श्लोक उसका जवाब है।' : 'anyone who reaches for a report like this has felt, at some point, not good enough. This verse answers that.');
  add('18.66', hi ? 'यह रिपोर्ट को पूरा करता है: अपना हिस्सा पूरा करें, फिर बाकी उसे सौंप दें जो सब संभालता है।' : 'it closes the report: do your part fully, then hand the rest to the one who holds it.');
  return out.slice(0, 6);
}
function buildPredictions(f, T, L, PN, fm, focusOf, evText) {
  const out = [], DAY = 864e5, ymd = d => d.toISOString().slice(0, 10);
  for (const w of f.week) out.push({ key: 'w-' + ymd(w.date), start: new Date(w.date.getTime() - 6 * 3600e3), when: fm(w.date, { weekday: 'long', day: 'numeric', month: 'short' }) + ` · ${w.grade}`, text: w.grade === 'A' ? T.pWeekA : w.grade === 'C' ? T.pWeekC : T.pWeekB });
  const ad = f.ads.find(a => a.current);
  if (ad) out.push({ key: `ad-${ad.md}-${ad.ad}`, start: ad.start, when: `${fm(ad.start)} – ${fm(ad.end)}`, text: `${T.pAd(PN(ad.md), PN(ad.ad))} ${lib(L.dasha[ad.ad], 'theme')}` });
  f.months.slice(0, 4).forEach(m => { const s = new Date(m.month.getFullYear(), m.month.getMonth(), 1); out.push({ key: 'm-' + ymd(s).slice(0, 7), start: s, when: fm(m.month, { month: 'long', year: 'numeric' }), text: focusOf(m) }); });
  for (const e of f.events.filter(e => e.body !== 'Ketu' && !e.turns)) out.push({ key: `e-${e.body}-${ymd(e.date)}`, start: e.date, when: `${fm(e.date)} · ${evText(e)}`, text: lib(L.transits[e.body], String(e.fromMoon)) });
  return out.filter(p => p.text).sort((a, b) => a.start - b.start);
}

window.REPORT = { render(route) { if (route === 'report') return renderForm(); return renderReport(route.slice(2)); } };
if (/^#(report|r-)/.test(location.hash)) A.render();
})();

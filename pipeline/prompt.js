// pipeline/prompt.js — builds the LLM input packet for Daily Horoscope v2.
// Usage:
//   node prompt.js [YYYY-MM-DD] [Sign]
// Examples:
//   node prompt.js 2026-06-24
//   node prompt.js 2026-06-24 Cancer
const { computeSky } = require('./sky');

const ORDER = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'
];

const KEY = {
  Aries:'aries', Taurus:'taurus', Gemini:'gemini', Cancer:'cancer',
  Leo:'leo', Virgo:'virgo', Libra:'libra', Scorpio:'scorpio',
  Sagittarius:'sagittarius', Capricorn:'capricorn', Aquarius:'aquarius', Pisces:'pisces'
};

const DISPLAY_EN = {
  Aries:'Aries', Taurus:'Taurus', Gemini:'Gemini', Cancer:'Cancer',
  Leo:'Leo', Virgo:'Virgo', Libra:'Libra', Scorpio:'Scorpius',
  Sagittarius:'Sagittarius', Capricorn:'Capricornus', Aquarius:'Aquarius', Pisces:'Pisces'
};

const ALIAS = {
  scorpius: 'Scorpio',
  capricornus: 'Capricorn'
};

function dateArgToKstNoon(arg){
  return arg ? new Date(arg + 'T12:00:00+09:00') : new Date();
}

function localDate(date){
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone:'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit'
  }).formatToParts(date).reduce((a,p)=>{ a[p.type]=p.value; return a; }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function bodyPhrase(items, lang){
  if(!items.length) return lang === 'ko' ? '직접 들어온 천체 없음' : 'no planets directly in this sign';
  return items.map(x => lang === 'ko' ? x.ko : x.body).join(', ');
}

function buildSignPacket(sky, sign){
  const ctx = sky.perSign[sign];
  if(!ctx) throw new Error(`Unknown sign: ${sign}`);

  const bodiesInSign = ctx.bodiesInSign.map(x => ({
    body:x.body,
    ko:x.ko,
    retrograde:x.retro
  }));
  const allBodies = Object.fromEntries(Object.entries(sky.bodies).map(([body, b]) => [body, {
    sign:b.sign,
    signKo:b.signKo,
    degree:b.deg,
    retrograde:b.retro
  }]));

  return {
    key: KEY[sign],
    sign,
    displayEn: DISPLAY_EN[sign],
    ko: ctx.signKo,
    layer1_background: {
      bodiesInSign,
      ruler: ctx.ruler,
      summaryKo: `${ctx.signKo}: ${bodyPhrase(bodiesInSign, 'ko')}; 지배성 ${ctx.ruler.ko}은 ${ctx.ruler.inSignKo}에 있음`,
      summaryEn: `${DISPLAY_EN[sign]}: ${bodyPhrase(bodiesInSign, 'en')}; ruler ${ctx.ruler.body} is in ${ctx.ruler.inSign}`
    },
    layer2_dailyVariation: {
      moon: sky.moon,
      moonRelation: ctx.moonRelation,
      antiRepeatSeed: [
        sky.moon.phaseEn,
        sky.moon.sign,
        ctx.moonRelation.en,
        `${ctx.ruler.body}:${ctx.ruler.inSign}`,
        bodiesInSign.map(x => x.body).join('+') || 'empty'
      ].join('|')
    },
    sky: allBodies
  };
}

function buildPacket(date, onlySign){
  const sky = computeSky(date);
  const signs = onlySign ? [onlySign] : ORDER;
  return {
    date: localDate(date),
    timezone: 'Asia/Seoul',
    purpose: 'Generate Daily Horoscope v2 readings for Yonderkeep.',
    outputContract: {
      shape: 'daily.js DAILY_SEED-compatible object',
      perSign: {
        ko: { teaser: 'one short line', body: 'array of exactly 10 Korean sentences' },
        en: { teaser: 'one short line', body: 'array of exactly 10 native English sentences' }
      }
    },
    generationRules: [
      'Use the sky facts as grounding, not as a mechanical report.',
      'Two-layer structure: layer 1 is the slower sign background; layer 2 is today-specific variation from Moon phase, Moon relation, ruler placement, and planets in sign.',
      'Write Korean first in the established tone: wistful, warm, not fortune-telling, a single breath of comfort.',
      'Then produce native English, not literal translation. Use horoscope terms: reading, zodiac sign, sign. Do not use "Daily Stars" or repeated "your star" phrasing.',
      'Keep each body line as one sentence. No bullets, section headers, emojis, or overt astrology jargon in the final reading body.',
      'Avoid repeating yesterday-like language: vary the teaser image, first line, closing line, and the concrete advice using antiRepeatSeed.',
      'Do not promise certainty. Prefer gentle tendencies: may, can, invites, asks, points to.'
    ],
    sky,
    signs: signs.map(sign => buildSignPacket(sky, sign))
  };
}

const dateArg = process.argv[2];
const signArg = process.argv[3];
const normalizedSignArg = signArg && (ALIAS[signArg.toLowerCase()] || signArg);
const sign = normalizedSignArg && ORDER.find(s => s.toLowerCase() === normalizedSignArg.toLowerCase());
if(signArg && !sign) throw new Error(`Unknown sign "${signArg}". Use one of: ${ORDER.join(', ')}`);

console.log(JSON.stringify(buildPacket(dateArgToKstNoon(dateArg), sign), null, 2));

module.exports = { buildPacket };

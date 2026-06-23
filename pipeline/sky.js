// pipeline/sky.js — 결정론적 "오늘의 하늘" 사실 + 별자리별 점성 컨텍스트 생성기.
// 데일리 운세 v2(천문 하이브리드)의 ① 계산 단계. 출력 JSON을 LLM 프롬프트에 주입.
// 사용: node sky.js [YYYY-MM-DD]   (생략 시 현재 시각)
// 의존: npm i astronomy-engine   (검증 v2.1.19)
// 좌표계: 현재 J2000 황경(≈0.36° 세차 오차, 별자리 배정엔 사실상 무해). TODO: of-date(tropical) 정밀화.
const A = require('astronomy-engine');

const SIGNS    = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const SIGNS_KO = ['양자리','황소자리','쌍둥이자리','게자리','사자자리','처녀자리','천칭자리','전갈자리','궁수자리','염소자리','물병자리','물고기자리'];
// 고전 7행성 지배성(7천체만 계산하므로 전통 지배성 사용)
const RULER    = ['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
const BODIES   = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];
const BODY_KO  = { Sun:'태양', Moon:'달', Mercury:'수성', Venus:'금성', Mars:'화성', Jupiter:'목성', Saturn:'토성' };

const norm    = d => ((d % 360) + 360) % 360;
const signIdx = elon => Math.floor(norm(elon) / 30);
const elonOf  = (body, date) => A.Ecliptic(A.GeoVector(A.Body[body], date, true)).elon;

// 달이 '내 별자리' 기준 어디에 있나 (별자리 간 거리 d = (moonSign - mySign + 12) % 12)
function moonRelLabel(d){
  switch(d){
    case 0:            return ['in your sign',        '당신의 자리에'];
    case 6:            return ['opposite your sign',  '당신의 자리 맞은편에'];
    case 3: case 9:    return ['square your sign',    '당신의 자리와 직각으로(긴장)'];
    case 4: case 8:    return ['trine your sign',     '당신의 자리와 조화롭게(트라인)'];
    case 2: case 10:   return ['sextile your sign',   '당신의 자리와 부드럽게(섹스타일)'];
    default:           return ['quietly distant from your sign', '당신의 자리와 느슨하게'];
  }
}

function phaseName(a){
  if(a < 22.5 || a >= 337.5) return ['New','삭'];
  if(a < 67.5)  return ['Waxing Crescent','초승달'];
  if(a < 112.5) return ['First Quarter','상현달'];
  if(a < 157.5) return ['Waxing Gibbous','상현~보름'];
  if(a < 202.5) return ['Full','보름달'];
  if(a < 247.5) return ['Waning Gibbous','보름~하현'];
  if(a < 292.5) return ['Last Quarter','하현달'];
  return ['Waning Crescent','그믐달'];
}

function computeSky(date){
  const next = new Date(date.getTime() + 86400000);   // +1일 (역행 판정용)
  const bodies = {};
  for(const b of BODIES){
    const L = elonOf(b, date), i = signIdx(L);
    let retro = false;
    if(b !== 'Sun' && b !== 'Moon'){
      let dd = elonOf(b, next) - L;
      if(dd > 180) dd -= 360; if(dd < -180) dd += 360;
      retro = dd < 0;   // 황경이 줄면 역행
    }
    bodies[b] = { sign:SIGNS[i], signKo:SIGNS_KO[i], idx:i, deg:+(norm(L) - i*30).toFixed(1), retro };
  }

  // 달 위상 + 오늘 별자리 진입 여부
  const pa  = A.MoonPhase(date);
  const ill = A.Illumination(A.Body.Moon, date).phase_fraction;
  const pn  = phaseName(pa);
  const moonIdx = bodies.Moon.idx;
  const dayStart = new Date(date); dayStart.setUTCHours(0,0,0,0);
  const dayEnd   = new Date(dayStart.getTime() + 86400000);
  const moonIngress = signIdx(elonOf('Moon', dayStart)) !== signIdx(elonOf('Moon', dayEnd));

  // 별자리별 컨텍스트 (LLM이 별자리당 이 묶음을 받아 본문 생성)
  const perSign = {};
  for(let s = 0; s < 12; s++){
    const inSign = BODIES.filter(b => bodies[b].idx === s)
                         .map(b => ({ body:b, ko:BODY_KO[b], retro:bodies[b].retro }));
    const ruler = RULER[s], rb = bodies[ruler];
    const rel = moonRelLabel(((moonIdx - s) + 12) % 12);
    perSign[SIGNS[s]] = {
      signKo: SIGNS_KO[s],
      bodiesInSign: inSign,                                                   // 이 별자리 안의 천체(배경층 핵심)
      ruler: { body:ruler, ko:BODY_KO[ruler], inSign:rb.sign, inSignKo:rb.signKo, retro:rb.retro },
      moonRelation: { en:rel[0], ko:rel[1] }                                  // 오늘 달과의 관계(데일리 변주)
    };
  }

  return {
    date: date.toISOString(),
    moon: {
      phaseAngle:+pa.toFixed(1), illum:Math.round(ill*100),
      phaseEn:pn[0], phaseKo:pn[1], waxing: pa < 180,
      sign:bodies.Moon.sign, signKo:bodies.Moon.signKo, ingressToday:moonIngress
    },
    bodies,
    perSign
  };
}

if(require.main === module){
  const arg  = process.argv[2];
  const date = arg ? new Date(arg + 'T12:00:00+09:00') : new Date();
  console.log(JSON.stringify(computeSky(date), null, 2));
}

module.exports = { computeSky };

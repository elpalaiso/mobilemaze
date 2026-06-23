/* ===== sky.js — 오늘의 하늘(실제 천체 계산) =====
   목적: 데일리 별자리 v2 상단 2줄(☽ 오늘의 하늘 / ✦ 별의 자리)을 매일 진짜로 계산.
   외부 의존성 없음. 정밀도는 '황도 30° 별자리 구간' 판정에 충분(태양·달 ~0.3°, 행성 ~1°).
   - 행성: Standish 저정밀 케플러 원소(1800–2050), 지심 황도경도 → 트로피컬 별자리.
   - 달: Meeus 단축 급수(황경 ~0.3°), 위상=태양과의 이각(elongation).
   - 결과는 SKY.compute(date) 로 노출. node에서도 require 가능(맨 아래 export).
   참고 앵커(2026-06-24): 태양·수성·목성=게자리 / 금성=사자 / 화성=황소 / 토성=양 / 달=천칭, 72% 차오름. */
(function(global){
  "use strict";
  var D2R=Math.PI/180, R2D=180/Math.PI;
  function norm360(x){ x=x%360; return x<0?x+360:x; }
  function norm180(x){ x=norm360(x); return x>180?x-360:x; }

  // 별자리 키(황경 0°=양자리 시작)
  var SIGN_KEYS=["aries","taurus","gemini","cancer","leo","virgo",
                 "libra","scorpio","sagittarius","capricorn","aquarius","pisces"];
  function signOf(lon){ return SIGN_KEYS[Math.floor(norm360(lon)/30)]; }

  // 율리우스일(UT 자정 기준이면 충분)
  function julianDay(date){
    return date.getTime()/86400000 + 2440587.5;   // Unix epoch(ms) → JD
  }

  // Standish 저정밀 케플러 원소 (J2000 값 + 세기당 변화율). [a, e, I, L, ϖ(longPeri), Ω(longNode)]
  // a:AU, 각: deg. 출처: JPL Approximate Positions of the Planets (1800 AD – 2050 AD).
  var EL={
    mercury:[ 0.38709927, 0.20563593,  7.00497902, 252.25032350, 77.45779628, 48.33076593,
              0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
    venus:  [ 0.72333566, 0.00677672,  3.39467605, 181.97909950,131.60246718, 76.67984255,
              0.00000390,-0.00004107, -0.00078890,  58517.81538729, 0.00268329, -0.27769418],
    earth:  [ 1.00000261, 0.01671123, -0.00001531, 100.46457166,102.93768193,  0.0,
              0.00000562,-0.00004392, -0.01294668,  35999.37244981, 0.32327364,  0.0],
    mars:   [ 1.52371034, 0.09339410,  1.84969142,  -4.55343205,-23.94362959, 49.55953891,
              0.00001847, 0.00007882, -0.00813131,  19140.30268499, 0.44441088, -0.29257343],
    jupiter:[ 5.20288700, 0.04838624,  1.30439695,  34.39644051, 14.72847983,100.47390909,
             -0.00011607,-0.00013253, -0.00183714,   3034.74612775, 0.21252668,  0.20469106],
    saturn: [ 9.53667594, 0.05386179,  2.48599187,  49.95424423, 92.59887831,113.66242448,
             -0.00125060,-0.00050991,  0.00193609,   1222.49362201,-0.41897216, -0.28867794]
  };

  // 행성의 일심 황도 직교좌표(J2000 황도면)
  function heliocentric(name, T){
    var p=EL[name];
    var a=p[0]+p[6]*T, e=p[1]+p[7]*T, I=p[2]+p[8]*T,
        L=p[3]+p[9]*T, wbar=p[4]+p[10]*T, Om=p[5]+p[11]*T;
    var w=wbar-Om;                       // 근일점 인수
    var M=norm180(L-wbar);               // 평균근점이각(-180..180)
    // 케플러 방정식(도 단위, Standish 방식)
    var estar=R2D*e, E=M+estar*Math.sin(M*D2R), dE=1, it=0;
    while(Math.abs(dE)>1e-7 && it++<12){
      var dM=M-(E-estar*Math.sin(E*D2R));
      dE=dM/(1-e*Math.cos(E*D2R)); E+=dE;
    }
    var Er=E*D2R;
    var xp=a*(Math.cos(Er)-e), yp=a*Math.sqrt(1-e*e)*Math.sin(Er);  // 궤도면
    var wr=w*D2R, Ir=I*D2R, Or=Om*D2R;
    var cw=Math.cos(wr),sw=Math.sin(wr),cO=Math.cos(Or),sO=Math.sin(Or),cI=Math.cos(Ir),sI=Math.sin(Ir);
    var x=(cw*cO - sw*sO*cI)*xp + (-sw*cO - cw*sO*cI)*yp;
    var y=(cw*sO + sw*cO*cI)*xp + (-sw*sO + cw*cO*cI)*yp;
    var z=(sw*sI)*xp + (cw*sI)*yp;
    return {x:x,y:y,z:z};
  }

  // 일반세차(황경) 보정: J2000 → 분점-of-date(트로피컬). ~1.39697°/세기.
  function precession(T){ return 1.396971*T; }

  // 지심 황도경도(트로피컬, deg)
  function geoLongitude(name, T){
    var earth=heliocentric("earth",T);
    if(name==="sun"){
      var lon=Math.atan2(-earth.y,-earth.x)*R2D;        // 태양 = -지구
      return norm360(lon+precession(T));
    }
    var pl=heliocentric(name,T);
    var gx=pl.x-earth.x, gy=pl.y-earth.y;
    return norm360(Math.atan2(gy,gx)*R2D+precession(T));
  }

  // 달(Meeus 축약 급수, 상위 15항) — 트로피컬 황경(deg), 정밀도 ~0.1°. d=J2000 이후 일수.
  function moonLongitude(d){
    var Lp=218.316+13.176396*d;        // 평균황경(분점-of-date)
    var M =357.529+0.985600*d;         // 태양 평균근점이각
    var Mp=134.963+13.064993*d;        // 달 평균근점이각
    var Dm=297.850+12.190749*d;        // 평균이각
    var F =93.272 +13.229350*d;        // 위도인수
    function s(x){ return Math.sin(x*D2R); }
    var lon=Lp
      +6.289*s(Mp)        +1.274*s(2*Dm-Mp)   +0.658*s(2*Dm)      +0.214*s(2*Mp)
      -0.186*s(M)         -0.114*s(2*F)        +0.059*s(2*Dm-2*Mp) +0.057*s(2*Dm-M-Mp)
      +0.053*s(2*Dm+Mp)   +0.046*s(2*Dm-M)     +0.041*s(M-Mp)      -0.035*s(Dm)
      -0.031*s(M+Mp)      -0.015*s(2*F-2*Dm)   +0.011*s(Mp-4*Dm);
    return norm360(lon);
  }

  function moonPhaseName(elong){      // elong=달-태양 이각 0..360, key 반환
    var e=norm360(elong);
    if(e<22.5||e>=337.5) return "new";
    if(e<67.5)  return "waxingCrescent";
    if(e<112.5) return "firstQuarter";
    if(e<157.5) return "waxingGibbous";
    if(e<202.5) return "full";
    if(e<247.5) return "waningGibbous";
    if(e<292.5) return "lastQuarter";
    return "waningCrescent";
  }

  function compute(date){
    date=date||new Date();
    var JD=julianDay(date), T=(JD-2451545.0)/36525.0, d=JD-2451545.0;
    var bodies={};
    bodies.sun=geoLongitude("sun",T);
    ["mercury","venus","mars","jupiter","saturn"].forEach(function(n){ bodies[n]=geoLongitude(n,T); });
    var moonLon=moonLongitude(d);
    var elong=norm360(moonLon-bodies.sun);
    var illum=(1-Math.cos(elong*D2R))/2;     // 0..1
    var signs={};
    Object.keys(bodies).forEach(function(n){ signs[n]=signOf(bodies[n]); });
    signs.moon=signOf(moonLon);
    // 별자리별 머무는 천체(달 제외 — 달은 따로 표기)
    var bySign={};
    SIGN_KEYS.forEach(function(k){ bySign[k]=[]; });
    ["sun","mercury","venus","mars","jupiter","saturn"].forEach(function(n){ bySign[signs[n]].push(n); });
    return {
      jd:JD, lon:bodies, moonLon:moonLon, signs:signs, bySign:bySign,
      moon:{ sign:signs.moon, illum:illum, illumPct:Math.round(illum*100),
             elong:elong, phase:moonPhaseName(elong) }
    };
  }

  var SKY={ compute:compute, signOf:signOf, SIGN_KEYS:SIGN_KEYS,
            geoLongitude:geoLongitude, moonLongitude:moonLongitude, julianDay:julianDay };
  global.SKY=SKY;
  if(typeof module!=="undefined" && module.exports) module.exports=SKY;
})(typeof window!=="undefined"?window:globalThis);

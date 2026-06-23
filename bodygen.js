/* ===== bodygen.js — 완전 동적 본문 생성기 =====
   "별 읽는 목소리" 톤을 유지하면서 매일 다른 본문을 만든다.
   기계적 치환이 아니라: 손으로 쓴 따뜻한 문장 뱅크 + 고정 감정 아크 + 오늘 하늘 조건(sky.js) + 날짜 시드.
   - 매일 하늘이 바뀌므로(달 위상·행성 자리·지배 천체) 조건 자체가 달라져 글이 실제로 바뀜.
   - 같은 조건이어도 (날짜+별자리) 시드로 표현 변형 → 반복 없이 흐름.
   composeBody(sky, signKey, dateStr, lang) → { teaser, body:[10문장] }.
   참고: 본문은 천체 '이름'을 직접 박지 않고(좌석 문장만 이름 사용) 테마 의미로 풀어 → 어색한 조사/거짓 배치 방지. */
(function(global){
  "use strict";
  // ---- 결정적 시드 PRNG ----
  function hashSeed(str){ let h=2166136261>>>0; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
  function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

  const RULERS={ aries:"mars",taurus:"venus",gemini:"mercury",cancer:"moon",leo:"sun",virgo:"mercury",
    libra:"venus",scorpio:"mars",sagittarius:"jupiter",capricorn:"saturn",aquarius:"saturn",pisces:"jupiter" };
  const WEIGHT={ sun:6,jupiter:5,saturn:4,mars:3,venus:2,mercury:1,moon:0 };  // 본문서 '주연' 천체 우선순위

  // ===== 문장 뱅크 =====
  const BANK={
  ko:{
    bodies:{ sun:"태양",moon:"달",mercury:"수성",venus:"금성",mars:"화성",jupiter:"목성",saturn:"토성" },
    signs:{ aries:"양자리",taurus:"황소자리",gemini:"쌍둥이자리",cancer:"게자리",leo:"사자자리",virgo:"처녀자리",
      libra:"천칭자리",scorpio:"전갈자리",sagittarius:"궁수자리",capricorn:"염소자리",aquarius:"물병자리",pisces:"물고기자리" },
    // 1) 달 위상으로 여는 밤 풍경
    phaseOpen:{
      new:["새 달이 어둠 속에 씨앗처럼 숨어 있는 밤이에요.","하늘이 가장 어두워, 오히려 새로 시작하기 좋은 저녁이에요."],
      waxingCrescent:["가는 초승달이 막 차오르기 시작한 저녁이에요.","얇은 달빛이 조심스레 부풀어 오르는 밤이에요."],
      firstQuarter:["반쯤 차오른 상현달이 하늘 한가운데 떠 있어요.","절반의 달이 균형을 잡으며 차오르는 밤이에요."],
      waxingGibbous:["보름을 며칠 앞두고 달이 점점 차오르는 밤이에요.","거의 다 찬 달이 천천히 하늘을 채우는 저녁이에요."],
      full:["둥근 보름달이 온 하늘을 환히 밝히는 밤이에요.","가득 찬 달빛이 모든 것을 부드럽게 비추는 저녁이에요."],
      waningGibbous:["보름을 지난 달이 조금씩 이지러지는 밤이에요.","환했던 달이 천천히 빛을 덜어내는 저녁이에요."],
      lastQuarter:["반으로 기운 하현달이 새벽을 향해 가는 밤이에요.","절반의 달이 고요히 저물어 가는 저녁이에요."],
      waningCrescent:["가느다란 그믐달이 마지막 빛을 남기는 밤이에요.","곧 사라질 얇은 달이 하늘 끝에 걸린 저녁이에요."]
    },
    // 2) 위상이 주는 한 호흡의 교훈
    phaseLesson:{
      new:["비어 있음은 부족이 아니라 새로 채울 자리예요.","오늘 품은 작은 바람 하나가 다음 달의 씨앗이 됩니다."],
      waxingCrescent:["아직 작아도 분명히 자라는 중이에요, 조급하지 않아도 돼요.","시작은 늘 이렇게 얇고 여린 빛으로 와요."],
      firstQuarter:["차오름의 한가운데선 망설임도 자연스러운 거예요.","절반쯤 왔다는 건 이미 충분히 멀리 왔다는 뜻이에요."],
      waxingGibbous:["다 차지 않았다고 조급해하지 않아도 돼요, 보름은 며칠 남았어요.","당신의 무언가도 지금 천천히 차오르는 중이에요."],
      full:["가득 찬 지금, 무언가를 거둬들이기 좋은 때예요.","환한 만큼 그림자도 함께 봐 주면 마음이 둥글어져요."],
      waningGibbous:["덜어내는 일도 채우는 일만큼 당신을 가볍게 해요.","오늘은 무언가를 놓아주기에 좋은 밤이에요."],
      lastQuarter:["기우는 달처럼, 끝맺음도 당신에게 잘 어울려요.","비워야 다음이 들어올 자리가 생겨요."],
      waningCrescent:["사라지는 빛은 끝이 아니라 다음 시작을 위한 쉼이에요.","오늘 밤은 그저 가만히 쉬어도 충분한 날이에요."]
    },
    // 3·4) 주연 천체의 의미/안내
    theme:{
      sun:{ mean:["오늘은 누구의 빛도 빌리지 않고 당신으로 존재하는 하루예요.","당신의 계절이 하늘 쪽에서 조용히 당신을 비추고 있어요."],
            guide:["굳이 증명하지 않아도 당신의 자리는 이미 따뜻해요.","오늘만큼은 당신을 가장 앞자리에 두어도 괜찮아요."] },
      moon:{ mean:["출렁이던 감정이 오늘은 천천히 수면을 고르고 있어요.","마음의 물결이 가만히 잦아드는 하루예요."],
            guide:["약해 보이는 게 아니라 깊은 거예요, 그 마음을 믿어요.","오늘은 누구보다 당신 자신을 먼저 돌봐 주세요."] },
      mercury:{ mean:["머릿속 소음이 잦아들고 또렷한 한 마디가 남는 날이에요.","흩어졌던 생각이 한 줄로 정리되는 하루예요."],
            guide:["삼키기만 했던 말 한마디를 오늘은 가볍게 건네 보세요.","당신의 말은 생각보다 부드럽게 가닿을 거예요."] },
      venus:{ mean:["작은 아름다움 하나가 오늘 하루를 정돈해 줘요.","다정함이 당신 쪽으로 천천히 기울어 오는 하루예요."],
            guide:["받은 온기는 움켜쥐지 말고 그대로 흘려보내요.","오늘은 좋아하는 것 곁에 잠시 머물러도 괜찮아요."] },
      mars:{ mean:["식은 줄 알았던 열이 오늘 다시 데워지고 있어요.","미뤄둔 한 걸음을 뗄 용기가 차오르는 하루예요."],
            guide:["이기려는 마음은 잠깐 내려놓아도 잃을 게 없어요.","작은 일 하나를 끝까지 해내면 그게 오늘의 승리예요."] },
      jupiter:{ mean:["하늘이 당신의 자리를 너그럽게 넓혀 주는 하루예요.","그동안 키워온 것들이 조용히 보답으로 돌아오는 때예요."],
            guide:["큰 보답은 자주 요란하지 않게 익숙한 자리에 도착해요.","오늘은 당신의 가능성을 조금 더 믿어도 좋아요."] },
      saturn:{ mean:["오래 쌓아온 것이 오늘 조용히 더 단단해지고 있어요.","묵묵한 하루가 내일의 디딤돌이 되는 때예요."],
            guide:["성과가 보이지 않아도 오늘의 성실은 사라지지 않아요.","가끔은 짐을 내려놓아야 더 멀리 갈 수 있어요."] }
    },
    // 5) 별자리 기질(기존 본문서 흡수) — 위로/안내
    sign:{
      aries:{ comfort:["당신의 열정은 식는 게 아니라 데워지는 중이에요.","천천히 쥔 것이 더 오래 당신 손에 남아요."], guide:["서두르지 않아도 길은 사라지지 않아요."] },
      taurus:{ comfort:["익숙함은 지루함이 아니라 단단함이에요.","가진 것을 세어보면 생각보다 따뜻할 거예요."], guide:["누가 재촉해도 당신의 속도를 믿어도 돼요."] },
      gemini:{ comfort:["솔직함은 관계를 무너뜨리지 않고 오히려 이어줘요.","가벼운 농담 하나가 무거운 공기를 풀어줘요."], guide:["듣는 일도 말하는 일만큼 오늘 당신을 빛내요."] },
      cancer:{ comfort:["집처럼 편한 자리에서 잠시 머물러도 괜찮아요.","받은 다정함은 당신에게 가장 먼저 닿아야 해요."], guide:["돌보는 일에 지쳤다면 오늘은 당신을 돌볼 차례예요."] },
      leo:{ comfort:["빛내려 들수록 빛이 옅어진다는 걸 기억해요.","당신이 머문 자리는 저절로 따뜻해져요."], guide:["자존심을 잠시 내려두면 더 큰 사람이 돼요."] },
      virgo:{ comfort:["당신이 보는 결점은 대개 당신만 보는 거예요.","작은 쉼표 하나가 긴 문장을 살려요."], guide:["완벽 대신 '충분'으로도 충분한 하루예요."] },
      libra:{ comfort:["모두를 만족시키는 답은 원래 없는 거였어요.","당신의 마음도 똑같이 무게를 가질 자격이 있어요."], guide:["오늘만큼은 저울을 당신 쪽으로 한 뼘 기울여 봐요."] },
      scorpio:{ comfort:["당신의 진심은 약점이 아니라 깊이예요.","어두운 물속에도 별빛은 끝내 닿아요."], guide:["다 드러내지 않아도 한 겹쯤은 내려놓아 봐요."] },
      sagittarius:{ comfort:["새 풍경은 꼭 멀리 있지 않아요, 모퉁이 하나 너머일 수도.","자유는 도망이 아니라 스스로 고른 방향이에요."], guide:["조급한 큰 그림보다 또렷한 한 걸음을 믿어요."] },
      capricorn:{ comfort:["당신의 성실은 누가 안 봐도 사라지지 않아요.","천천히 굳은 것이 가장 오래 버텨요."], guide:["책임감 옆에 다정함도 한 자리 내어 주어요."] },
      aquarius:{ comfort:["다르다는 건 틀린 게 아니라 새롭다는 뜻이에요.","혼자만의 시간은 당신에겐 충전이지 외로움이 아니에요."], guide:["무리에 섞이려 자신을 지우지 않아도 돼요."] },
      pisces:{ comfort:["눈물 한 방울도 당신에겐 정직한 언어예요.","상상은 도피가 아니라 당신만의 깊은 우물이에요."], guide:["흐르는 대로 두되, 키는 당신이 쥐고 있어요."] }
    },
    reassure:["오늘 하루, 잘 버틴 당신을 조용히 안아 주세요.","무엇 하나 이루지 않아도 오늘의 당신은 충분했어요.","곁에 있는 사람의 표정을 한 번 더 살펴봐도 좋아요."],
    close:["오늘 밤은 하늘에 가만히 기대어 쉬어요.","잠들기 전, 따뜻했던 순간 하나를 품고 눈 감으세요.","서두르지 않은 오늘의 자신을 조용히 칭찬해 주세요.","별빛은 늘 당신 편이라는 걸 잊지 말아요."],
    // 좌석(천체 위치) 문장 — 이름은 모두 받침으로 끝나 '이'/'은' 통일
    seatVisit:(names)=> names.join("·")+"이 오늘 당신의 자리에 깃들었어요.",
    seatSeason:"게다가 태양이 당신의 자리에 머무는, 한 해 중 당신의 계절이에요.",
    seatMoon:"오늘은 달이 당신의 자리에 들러, 마음이 한결 가까이 느껴지는 밤이에요.",
    seatQuiet:(ruler,sign)=> "오늘 당신의 자리는 고요하고, 수호별 "+ruler+"은 "+sign+"에서 멀리 당신을 비춰요.",
    teaser:{ sun:"당신의 계절, 하늘이 당신 쪽으로 기운 날.", moon:"마음의 물결이 잔잔해지는 밤.", mercury:"흩어진 말이 한 줄로 모이는 날.",
      venus:"다정함이 당신 쪽으로 기울어 오는 날.", mars:"식었던 열이 다시 데워지는 날.", jupiter:"하늘이 당신의 자리를 넓혀 주는 날.",
      saturn:"오래 쌓은 것이 단단해지는 날.", _def:"별이 당신 쪽으로 기운 밤." }
  },
  en:{
    bodies:{ sun:"the Sun",moon:"the Moon",mercury:"Mercury",venus:"Venus",mars:"Mars",jupiter:"Jupiter",saturn:"Saturn" },
    signs:{ aries:"Aries",taurus:"Taurus",gemini:"Gemini",cancer:"Cancer",leo:"Leo",virgo:"Virgo",
      libra:"Libra",scorpio:"Scorpio",sagittarius:"Sagittarius",capricorn:"Capricorn",aquarius:"Aquarius",pisces:"Pisces" },
    phaseOpen:{
      new:["The new moon hides like a seed in the dark tonight.","The sky is at its darkest — a good evening to begin anew."],
      waxingCrescent:["A thin crescent has just begun to swell tonight.","Slender moonlight carefully grows in the evening sky."],
      firstQuarter:["A half-lit first-quarter moon stands at the middle of the sky.","The half moon climbs, finding its balance tonight."],
      waxingGibbous:["A few days from full, the moon keeps filling the night.","The nearly full moon slowly fills the evening sky."],
      full:["A round full moon lights the whole sky tonight.","Brimming moonlight softens everything this evening."],
      waningGibbous:["Past full, the moon wanes a little tonight.","The once-bright moon slowly sheds its light this evening."],
      lastQuarter:["A half last-quarter moon leans toward the dawn tonight.","The half moon quietly sets in the evening sky."],
      waningCrescent:["A slender old moon leaves its last light tonight.","A thin, fading moon hangs at the sky's edge this evening."]
    },
    phaseLesson:{
      new:["Emptiness isn't lack; it's room to fill anew.","One small wish you hold tonight becomes next month's seed."],
      waxingCrescent:["Small as it is, it's surely growing — no need to rush.","Beginnings always come as light this thin and tender."],
      firstQuarter:["In the middle of growing, hesitation is natural too.","Halfway means you've already come far enough."],
      waxingGibbous:["Don't fret that it isn't full — the full moon is days away.","Something in you is slowly filling now, too."],
      full:["Full as it is, this is a good time to gather things in.","As bright as it is, see the shadow too — your heart rounds out."],
      waningGibbous:["Letting go lightens you as much as filling up does.","Tonight is a good night to release something."],
      lastQuarter:["Like the waning moon, endings suit you well.","You must empty for the next thing to find room."],
      waningCrescent:["Fading light isn't an end; it's rest before a new start.","Tonight, simply resting is more than enough."]
    },
    theme:{
      sun:{ mean:["Today you exist as yourself, borrowing no one's light.","Your season shines quietly on you from the sky."],
            guide:["You needn't prove a thing — your place is already warm.","Just for today, put yourself in the front row."] },
      moon:{ mean:["The feelings that swayed are settling calm today.","The tide of your heart quietly grows still."],
            guide:["It isn't weakness, it's depth — trust that heart.","Today, care for yourself before anyone else."] },
      mercury:{ mean:["The noise quiets and one clear sentence remains today.","Scattered thoughts gather into a single line."],
            guide:["Say the words you'd swallowed — lightly, today.","They will land more gently than you expect."] },
      venus:{ mean:["One small beauty sets your whole day in order.","Tenderness leans slowly toward you today."],
            guide:["Don't clutch the warmth you receive — let it flow on.","Linger a while beside something you love today."] },
      mars:{ mean:["A fire you thought had cooled is warming again.","The courage for one delayed step is rising today."],
            guide:["Set the urge to win down — you lose nothing.","Finish one small thing, and that's today's victory."] },
      jupiter:{ mean:["The sky widens your place generously today.","What you've grown returns quietly as reward."],
            guide:["Great returns often arrive quietly, in familiar places.","Trust your own possibility a little more today."] },
      saturn:{ mean:["What you've long built grows quietly more solid today.","This steady day becomes tomorrow's foothold."],
            guide:["Even with no visible result, today's diligence won't vanish.","Sometimes you must set the load down to go farther."] }
    },
    sign:{
      aries:{ comfort:["Your fire isn't cooling; it's warming through.","What you hold slowly stays with you longer."], guide:["The road won't vanish just because you slow down."] },
      taurus:{ comfort:["The familiar isn't dullness; it's steadiness.","Count what you hold — it's warmer than you thought."], guide:["Even if others rush you, trust your own pace."] },
      gemini:{ comfort:["Honesty doesn't break a bond; it ties it closer.","A light joke loosens the heavy air."], guide:["Listening makes you shine as much as speaking today."] },
      cancer:{ comfort:["It's fine to linger in a place that feels like home.","The tenderness you receive should reach you first."], guide:["If caring for others tired you, today it's your turn."] },
      leo:{ comfort:["Remember: the harder you try to shine, the dimmer it gets.","Wherever you rest grows warm on its own."], guide:["Set your pride down a moment and you grow larger."] },
      virgo:{ comfort:["The flaw you see is usually one only you can see.","One small comma saves a long sentence."], guide:["Today, enough is enough; it needn't be perfect."] },
      libra:{ comfort:["The answer that satisfies everyone never existed.","Your own heart deserves to carry weight too."], guide:["Just for today, lean the scale toward yourself."] },
      scorpio:{ comfort:["Your sincerity is not weakness, but depth.","Even in dark water, starlight reaches in the end."], guide:["You needn't reveal it all — just let one layer go."] },
      sagittarius:{ comfort:["New scenery isn't always distant; it may be one corner away.","Freedom isn't flight; it's a direction you chose."], guide:["Trust one clear step over an anxious grand plan."] },
      capricorn:{ comfort:["Your diligence doesn't vanish just because no one watches.","What grows solid slowly endures the longest."], guide:["Make room beside your duty for tenderness too."] },
      aquarius:{ comfort:["Different doesn't mean wrong; it means new.","Time alone recharges you; it isn't loneliness."], guide:["You needn't erase yourself to blend into the crowd."] },
      pisces:{ comfort:["Even a single tear is an honest language for you.","Imagination isn't escape; it's your own deep well."], guide:["Let things flow, but keep your hand on the rudder."] }
    },
    reassure:["Tonight, quietly hold the self that made it through.","Even achieving nothing, you were enough today.","Look once more at the face of the person beside you."],
    close:["Tonight, lean gently on the sky and rest.","Before sleep, close your eyes holding one warm moment.","Quietly praise the self that didn't rush today.","Don't forget — the starlight is always on your side."],
    seatVisit:(names)=>{ let s; if(names.length===1) s=names[0]+" rests in your sign tonight."; else s=names.slice(0,-1).join(", ")+" and "+names[names.length-1]+" are gathered in your sign tonight."; return s.charAt(0).toUpperCase()+s.slice(1); },
    seatSeason:"And the Sun is in your sign — this is your season of the year.",
    seatMoon:"Tonight the Moon visits your sign, and your heart feels a little closer.",
    seatQuiet:(ruler,sign)=> "Your sign is quiet tonight, and your ruling star, "+ruler+", watches over you from "+sign+".",
    teaser:{ sun:"Your season — the day the sky leans your way.", moon:"A night the tide of your heart grows calm.", mercury:"A day scattered words gather into one line.",
      venus:"A day tenderness leans toward you.", mars:"A day a cooled fire warms again.", jupiter:"A day the sky widens your place.",
      saturn:"A day what you've built grows solid.", _def:"A night the stars lean your way." }
  }};

  function composeBody(sky, signKey, dateStr, lang){
    const t=BANK[lang]||BANK.ko;
    if(!sky||!sky.moon) return { teaser:t.teaser._def, body:[] };
    const rng=mulberry32(hashSeed((dateStr||"")+":"+signKey));
    const pick=arr=>arr[Math.floor(rng()*arr.length)];
    const pick2=arr=>{ if(arr.length<2) return [pick(arr),pick(arr)]; const i=Math.floor(rng()*arr.length); let j=Math.floor(rng()*(arr.length-1)); if(j>=i)j++; return [arr[i],arr[j]]; };

    const visitors=(sky.bySign[signKey]||[]).slice().sort((a,b)=>WEIGHT[b]-WEIGHT[a]);
    const ruler=RULERS[signKey], rulerSign=sky.signs[ruler];
    const sunInSign=sky.signs.sun===signKey, moonInSign=sky.signs.moon===signKey;
    const phase=sky.moon.phase;
    // 주연 천체: 자리에 머무는 천체 우선, 없으면 수호성
    const dominant = visitors.length ? visitors[0] : ruler;
    const secondary = visitors.length>1 ? visitors[1] : null;

    const body=[];
    body.push(pick(t.phaseOpen[phase]||t.phaseOpen.full));                       // 1
    if(visitors.length){ body.push(t.seatVisit(visitors.map(b=>t.bodies[b])));   // 2
      if(sunInSign && dominant!=="sun") body.push(t.seatSeason); }               // 2b (태양이 주연이 아니어도 계절 강조)
    else if(moonInSign) body.push(t.seatMoon);
    else body.push(t.seatQuiet(t.bodies[ruler], t.signs[rulerSign]));
    body.push(pick(t.theme[dominant].mean));                                     // 3
    body.push(pick(t.theme[dominant].guide));                                    // 4
    if(secondary) body.push(pick(t.theme[secondary].mean));                      // 5
    else if(moonInSign && dominant!=="moon") body.push(pick(t.theme.moon.mean));
    else body.push(pick(t.sign[signKey].guide));
    body.push(pick(t.phaseLesson[phase]||t.phaseLesson.full));                   // 6
    const cf=pick2(t.sign[signKey].comfort);
    body.push(cf[0]);                                                            // 7
    body.push(pick(t.reassure));                                                 // 8
    body.push(cf[1]);                                                            // 9
    body.push(pick(t.close));                                                    // 10

    const teaser = t.teaser[dominant] || t.teaser._def;
    return { teaser, body };
  }

  const BODYGEN={ composeBody };
  global.BODYGEN=BODYGEN;
  if(typeof module!=="undefined" && module.exports) module.exports=BODYGEN;
})(typeof window!=="undefined"?window:globalThis);

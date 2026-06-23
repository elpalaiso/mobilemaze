/* ===== 데일리 별자리 =====
   ZODIAC = 정적 메타(고정: 글리프·날짜·별자리 점). 매일 안 바뀜.
   DAILY_SEED = 생성물(Phase 2서 daily/horoscope.json 으로 대체) — 날짜 + 별자리별 ko/en 운세 텍스트.
   프론트(engine.js)가 ZODIAC[i] + getDaily().readings[key] 를 합쳐 카드로 렌더.
   stars = 정규화(0..1) 별점 — '별 잇기' 제스처(전부 지나면 카드 점등). 정확한 천문 모양 아님, 잇는 맛 위주. */
const ZODIAC = [
  { key:"aries",       glyph:"♈", stars:[{x:0.20,y:0.70},{x:0.38,y:0.46},{x:0.55,y:0.58},{x:0.74,y:0.34},{x:0.86,y:0.56}],
    ko:{ name:"양자리",     dates:"3.21–4.19" }, en:{ name:"Aries",       dates:"Mar 21 – Apr 19" } },
  { key:"taurus",      glyph:"♉", stars:[{x:0.18,y:0.40},{x:0.34,y:0.58},{x:0.52,y:0.50},{x:0.70,y:0.64},{x:0.84,y:0.42}],
    ko:{ name:"황소자리",   dates:"4.20–5.20" }, en:{ name:"Taurus",      dates:"Apr 20 – May 20" } },
  { key:"gemini",      glyph:"♊", stars:[{x:0.30,y:0.30},{x:0.30,y:0.72},{x:0.55,y:0.34},{x:0.55,y:0.70},{x:0.78,y:0.50}],
    ko:{ name:"쌍둥이자리", dates:"5.21–6.21" }, en:{ name:"Gemini",      dates:"May 21 – Jun 21" } },
  { key:"cancer",      glyph:"♋", stars:[{x:0.24,y:0.52},{x:0.42,y:0.36},{x:0.58,y:0.58},{x:0.76,y:0.40},{x:0.66,y:0.70}],
    ko:{ name:"게자리",     dates:"6.22–7.22" }, en:{ name:"Cancer",      dates:"Jun 22 – Jul 22" } },
  { key:"leo",         glyph:"♌", stars:[{x:0.20,y:0.62},{x:0.36,y:0.42},{x:0.54,y:0.36},{x:0.72,y:0.48},{x:0.84,y:0.66}],
    ko:{ name:"사자자리",   dates:"7.23–8.22" }, en:{ name:"Leo",         dates:"Jul 23 – Aug 22" } },
  { key:"virgo",       glyph:"♍", stars:[{x:0.22,y:0.34},{x:0.38,y:0.52},{x:0.52,y:0.40},{x:0.66,y:0.60},{x:0.82,y:0.50}],
    ko:{ name:"처녀자리",   dates:"8.23–9.22" }, en:{ name:"Virgo",       dates:"Aug 23 – Sep 22" } },
  { key:"libra",       glyph:"♎", stars:[{x:0.20,y:0.56},{x:0.40,y:0.44},{x:0.60,y:0.44},{x:0.80,y:0.56},{x:0.50,y:0.70}],
    ko:{ name:"천칭자리",   dates:"9.23–10.22" }, en:{ name:"Libra",       dates:"Sep 23 – Oct 22" } },
  { key:"scorpio",     glyph:"♏", stars:[{x:0.18,y:0.40},{x:0.34,y:0.52},{x:0.50,y:0.46},{x:0.68,y:0.58},{x:0.84,y:0.72}],
    ko:{ name:"전갈자리",   dates:"10.23–11.22" }, en:{ name:"Scorpio",     dates:"Oct 23 – Nov 22" } },
  { key:"sagittarius", glyph:"♐", stars:[{x:0.22,y:0.68},{x:0.40,y:0.50},{x:0.58,y:0.40},{x:0.78,y:0.30},{x:0.64,y:0.58}],
    ko:{ name:"궁수자리",   dates:"11.23–12.21" }, en:{ name:"Sagittarius", dates:"Nov 23 – Dec 21" } },
  { key:"capricorn",   glyph:"♑", stars:[{x:0.20,y:0.44},{x:0.36,y:0.62},{x:0.54,y:0.54},{x:0.70,y:0.66},{x:0.84,y:0.50}],
    ko:{ name:"염소자리",   dates:"12.22–1.19" }, en:{ name:"Capricorn",   dates:"Dec 22 – Jan 19" } },
  { key:"aquarius",    glyph:"♒", stars:[{x:0.18,y:0.50},{x:0.36,y:0.40},{x:0.52,y:0.56},{x:0.70,y:0.42},{x:0.86,y:0.54}],
    ko:{ name:"물병자리",   dates:"1.20–2.18" }, en:{ name:"Aquarius",    dates:"Jan 20 – Feb 18" } },
  { key:"pisces",      glyph:"♓", stars:[{x:0.24,y:0.38},{x:0.42,y:0.54},{x:0.40,y:0.72},{x:0.62,y:0.44},{x:0.80,y:0.60}],
    ko:{ name:"물고기자리", dates:"2.19–3.20" }, en:{ name:"Pisces",      dates:"Feb 19 – Mar 20" } },
];

/* 샘플 하루치 — Phase 2의 생성 JSON과 같은 모양. 톤 = 아련·포근, 점괘 아닌 한 호흡의 위로. */
const DAILY_SEED = {
  date: "2026-06-23",
  readings: {
    aries:       { ko:{ teaser:"서두르던 걸음이 잠깐 숨을 고른다.", body:"오늘은 앞서 나가기보다 곁을 살피는 하루예요. 작은 기다림이 뜻밖의 길을 열어줍니다." },
                   en:{ teaser:"A hurried step pauses to breathe.", body:"Today is for looking beside you rather than racing ahead. A small wait opens an unexpected road." } },
    taurus:      { ko:{ teaser:"익숙한 자리에서 작은 빛을 발견한다.", body:"바꾸려 애쓰지 않아도 좋은 날이에요. 늘 있던 것에서 오늘은 새 결이 보일 거예요." },
                   en:{ teaser:"A small light in a familiar place.", body:"No need to force any change today. The everyday will show you a grain you hadn't noticed." } },
    gemini:      { ko:{ teaser:"두 마음이 오늘은 같은 곳을 본다.", body:"흩어지던 생각이 한 줄로 모이는 날. 망설였던 말을 가볍게 건네보세요." },
                   en:{ teaser:"Two minds look the same way today.", body:"Scattered thoughts gather into one line. Say the words you'd been holding — lightly." } },
    cancer:      { ko:{ teaser:"마음의 물결이 잔잔해진다.", body:"오늘은 누군가의 안부가 당신을 데우는 날이에요. 받은 온기를 그대로 흘려보내도 좋아요." },
                   en:{ teaser:"The tide of your heart goes calm.", body:"A quiet hello will warm you today. Let the warmth you receive pass gently onward." } },
    leo:         { ko:{ teaser:"빛내려 하지 않아도 이미 환하다.", body:"애써 증명할 일이 없는 하루. 가만한 자신감이 주변을 부드럽게 밝힙니다." },
                   en:{ teaser:"Bright already, without trying to shine.", body:"Nothing to prove today. A quiet confidence lights the room more softly than effort would." } },
    virgo:       { ko:{ teaser:"작은 정돈이 큰 안심을 부른다.", body:"오늘은 완벽 대신 충분으로 충분한 날. 하나만 제자리에 두어도 마음이 한결 가벼워져요." },
                   en:{ teaser:"A small tidying brings a large ease.", body:"Enough is enough today, not perfect. Put one thing in its place and your mind grows lighter." } },
    libra:       { ko:{ teaser:"기울던 저울이 천천히 중심을 찾는다.", body:"양쪽을 다 헤아리느라 지쳤다면, 오늘은 당신 쪽으로 한 뼘 기울여도 돼요." },
                   en:{ teaser:"A tilting scale finds its center, slowly.", body:"If weighing both sides has worn you out, lean a hand's width toward yourself today." } },
    scorpio:     { ko:{ teaser:"깊은 곳의 물이 맑아진다.", body:"감추던 마음 하나를 오늘은 가만히 풀어놓아도 좋아요. 가라앉았던 것이 빛을 받습니다." },
                   en:{ teaser:"The deep water clears.", body:"You may quietly set down one hidden feeling today. What had sunk will catch the light." } },
    sagittarius: { ko:{ teaser:"멀리 보던 눈이 가까운 길을 본다.", body:"떠나고 싶은 마음은 잠시 접어두어도 괜찮아요. 오늘의 한 걸음이 그 먼 곳으로 이어집니다." },
                   en:{ teaser:"Far-looking eyes find the near road.", body:"Let the wish to leave rest a moment. Today's single step already leads toward that far place." } },
    capricorn:   { ko:{ teaser:"오래 쌓은 것이 조용히 단단해진다.", body:"성과가 안 보여도 헛되지 않은 하루예요. 묵묵한 오늘이 내일의 디딤돌이 됩니다." },
                   en:{ teaser:"What you've built quietly hardens.", body:"Even with no visible result, today is not wasted. This steady day becomes tomorrow's foothold." } },
    aquarius:    { ko:{ teaser:"남다른 생각이 오늘은 길을 만든다.", body:"이상하게 보일까 접어둔 생각이 있다면, 오늘 한 번 꺼내보세요. 누군가에겐 빛이 됩니다." },
                   en:{ teaser:"An odd idea makes a road today.", body:"If you've folded away a thought for fear it seemed strange, unfold it once today — it may be light to someone." } },
    pisces:      { ko:{ teaser:"흐릿하던 마음에 윤곽이 잡힌다.", body:"꿈과 현실 사이를 떠돌았다면, 오늘은 한쪽에 살며시 발을 디뎌요. 그 자리가 당신을 받쳐줍니다." },
                   en:{ teaser:"A blurred feeling finds its outline.", body:"If you've drifted between dream and day, set one foot down gently. That ground will hold you." } },
  },
};

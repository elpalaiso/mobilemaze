/* ===== 시나리오 매니페스트 =====
   새 항해(시나리오) 추가 = 여기에 객체 하나 + levels.js의 I18N 키.
   각 레벨 = { sec: DOM 섹션 id, trick: engine.js TRICKS registry의 키 }.
   (현재는 튜토리얼 1개. 다음 단계에서 DOM 템플릿 재사용 + 허브를 얹어
    sec 하드코딩을 트릭 템플릿으로 일반화한다.) */
const SCENARIOS = {
  tutorial: {
    id: "tutorial",
    titleKey: "sc_tutorial",
    levels: [
      { sec:"lv1", trick:"press", ans:"l1answer", text:{ tag:"l1tag", riddle:"l1riddle", press:"l1press", reveal:"l1reveal", hint:"l1hint" } },
      { sec:"lv2", trick:"pinch",    ans:"l2answer", text:{ tag:"l2tag", riddle:"l2riddle", before:"l2before", tiny:"l2tiny", after:"l2after", hint:"l2hint" } },
      { sec:"lv3", trick:"tilt",     ans:"l3answer", text:{ tag:"l3tag", riddle:"l3riddle", secret:"l3secret", hint:"l3hint", fbhint:"l3fbhint" } },
      { sec:"lv4", trick:"blow",     text:{ tag:"l4tag", riddle:"l4riddle", hint:"l4hint" } },
      { sec:"lv5", trick:"route",    ans:"l5answer", text:{ tag:"l5tag", riddle:"l5riddle", hint:"l5hint", reveal:"l5reveal" } },
      { sec:"lv6", trick:"flame",    text:{ tag:"l6tag", riddle:"l6riddle", hint:"l6hint" } },
      { sec:"lv7", trick:"row",      text:{ tag:"l7tag", riddle:"l7riddle", hint:"l7hint" } },
      { sec:"lv8", trick:"farewell", text:{ tag:"l8tag", hint:"l8hint" } },
    ],
    ending: { title:"doneTitle", body:"doneBody", end:"doneEnd" },
  },
  /* 첫 신규 시나리오(slice1: reuse-only 검증판). 새 트릭 '체온 나누기' + 전용 엔딩은 다음 단계. */
  snow_lake: {
    id: "snow_lake",
    titleKey: "sc_snow",
    levels: [
      { sec:"lvWarm", trick:"warm", text:{ tag:"snow1tag", riddle:"snow1riddle", hint:"snow1hint" } },
      { sec:"lv7",    trick:"row",  text:{ tag:"snow2tag", riddle:"snow2riddle", hint:"snow2hint" } },
    ],
    ending: { title:"snowDoneTitle", body:"snowDoneBody", end:"snowDoneEnd" },   // 코다(목줄)는 소설 본문 몫
  },
  /* 새벽 강 — 이사 가는 아이. 신규 트릭 '나란히 젓기'(두 노 동시). 돌아봄의 반전 + 종이배 코다. */
  dawn_river: {
    id: "dawn_river",
    titleKey: "sc_dawn",
    levels: [
      { sec:"lvFold",   trick:"fold",   text:{ tag:"foldTag", riddle:"foldRiddle", hint:"foldHint" } },
      { sec:"lvRowPar", trick:"rowpar", text:{ tag:"dawnTag", riddle:"dawnRiddle", hint:"dawnHint" } },
    ],
    ending: { title:"dawnDoneTitle", body:"dawnDoneBody", end:"dawnDoneEnd" },   // 코다(종이배)는 소설 본문 몫
  },
  /* 등불 항구 — 잊혀가는 기억. 신규 트릭 '불씨 옮기기'(손 떼지 않고 천천히). 시선=못 알아봄, 코다=이름 없는 등불. */
  lantern_harbor: {
    id: "lantern_harbor",
    titleKey: "sc_lantern",
    levels: [
      { sec:"lvEmber", trick:"ember", text:{ tag:"emberTag", riddle:"emberRiddle", hint:"emberHint" } },
    ],
    ending: { title:"lanternDoneTitle", body:"lanternDoneBody", end:"lanternDoneEnd" },   // 코다(이름 없는 등불)는 소설 본문 몫
  },
  /* 측량가 시리즈 「그려둔 길」의 *인라인 매듭* 2개 — 허브 카드 아님. 소설(book) 본문의
     ⟦KNOT:road⟧·⟦KNOT:erase⟧ 지점에서 실행 → 엔딩 카드(측량가 버전) → 이야기로 복귀.
     series:"memory"+knot:true → 엔딩 카드 오버라이드 + backHarborBtn=이야기로 돌아가기. */
  road_knot: {                 // 작별 매듭 — 길 그리기(시작점→도시)
    id: "road_knot", titleKey: "sc_road", series: "memory", knot: true,
    levels: [
      { sec:"lvRoad", trick:"road", text:{ tag:"roadTag", riddle:"roadRiddle", hint:"roadHint", reveal:"roadReveal" } },
    ],
    ending: { title:"roadDoneTitle", body:"roadDoneBody", end:"roadDoneEnd", stay:"roadStay" },   // 코다는 소설 본문 몫
  },
  erase_knot: {                // 망각 매듭 — 되짚어 지우기(끝→시작점). 느린 망각 seqKey + 잔류.
    id: "erase_knot", titleKey: "sc_erase", series: "memory", knot: true,
    levels: [
      { sec:"lvErase", trick:"erase", text:{ tag:"eraseTag", riddle:"eraseRiddle", hint:"eraseHint", reveal:"eraseReveal" } },
    ],
    ending: { title:"eraseDoneTitle", body:"eraseDoneBody", end:"eraseDoneEnd", stay:"eraseStay", seqKey:"eraseSeq" },   // 코다는 소설 본문 몫
  },
  tower_t1: {
    id: "tower_t1", titleKey: "sc_tower_t1", series:"tower", quiz:true,
    levels: [
      { sec:"lv1", trick:"press", text:{ tag:"qt1pTag", riddle:"qt1pRiddle", press:"qt1pPress", reveal:"qtReveal", hint:"qt1pHint" }, hints:["qt1pH1","qt1pH2","qt1pH3"] },
      { sec:"lv2", trick:"pinch", ansHash:{ko:5352836329947915,en:2518879951497208}, text:{ tag:"qt1zTag", riddle:"qt1zRiddle", before:"qt1zBefore", tiny:"qt1zTiny", after:"qt1zAfter", hint:"qt1zHint" }, hints:["qt1zH1","qt1zH2","qt1zH3"] },
      { sec:"lv3", trick:"tilt", text:{ tag:"qt1tTag", riddle:"qt1tRiddle", secret:"qtReveal", hint:"qt1tHint", fbhint:"qt1tFbHint" }, hints:["qt1tH1","qt1tH2","qt1tH3"] },
      { sec:"lv4", trick:"blow", text:{ tag:"qt1bTag", riddle:"qt1bRiddle", hint:"qt1bHint" }, hints:["qt1bH1","qt1bH2","qt1bH3"] },
      { sec:"lv5", trick:"route", text:{ tag:"qt1rTag", riddle:"qt1rRiddle", hint:"qt1rHint", reveal:"qtReveal" }, hints:["qt1rH1","qt1rH2","qt1rH3"] },
      { sec:"lv6", trick:"flame", text:{ tag:"qt1fTag", riddle:"qt1fRiddle", hint:"qt1fHint" }, hints:["qt1fH1","qt1fH2","qt1fH3"] },
    ],
    ending: { title:"qt1DoneTitle", body:"qt1DoneBody", end:"qt1DoneEnd" },
  },
  tower_t2: {
    id: "tower_t2", titleKey: "sc_tower_t2", series:"tower", quiz:true, gate:"tower_t1",
    levels: [
      { sec:"lv1", trick:"press", pressMs:1000, text:{ tag:"qt2pTag", riddle:"qt2pRiddle", press:"qt2pPress", reveal:"qtReveal", hint:"qt2pHint" }, hints:["qt2pH1","qt2pH2","qt2pH3"] },
      { sec:"lv6", trick:"flame", flameGain:1.45, text:{ tag:"qt2fTag", riddle:"qt2fRiddle", hint:"qt2fHint" }, hints:["qt2fH1","qt2fH2","qt2fH3"] },
      { sec:"lv7", trick:"row", need:16, text:{ tag:"qt2rTag", riddle:"qt2rRiddle", hint:"qt2rHint" }, hints:["qt2rH1","qt2rH2","qt2rH3"] },
      { sec:"lv3", trick:"tilt", text:{ tag:"qt2tTag", riddle:"qt2tRiddle", secret:"qtReveal", hint:"qt2tHint", fbhint:"qt2tFbHint" }, hints:["qt2tH1","qt2tH2","qt2tH3"] },
      { sec:"lv4", trick:"blow", text:{ tag:"qt2bTag", riddle:"qt2bRiddle", hint:"qt2bHint" }, hints:["qt2bH1","qt2bH2","qt2bH3"] },
      { sec:"lv5", trick:"route", text:{ tag:"qt2gTag", riddle:"qt2gRiddle", hint:"qt2gHint", reveal:"qtReveal" }, hints:["qt2gH1","qt2gH2","qt2gH3"] },
      { sec:"lvRowPar", trick:"rowpar", text:{ tag:"qt2rpTag", riddle:"qt2rpRiddle", hint:"qt2rpHint" }, hints:["qt2rpH1","qt2rpH2","qt2rpH3"] },
      { sec:"lvEmber", trick:"ember", text:{ tag:"qt2eTag", riddle:"qt2eRiddle", hint:"qt2eHint" }, hints:["qt2eH1","qt2eH2","qt2eH3"] },
    ],
    ending: { title:"qt2DoneTitle", body:"qt2DoneBody", end:"qt2DoneEnd" },
  },
  tower_t3: {
    id: "tower_t3", titleKey: "sc_tower_t3", series:"tower", quiz:true, gate:"tower_t2",
    levels: [
      { sec:"lv3", trick:"tilt", text:{ tag:"qt3tTag", riddle:"qt3tRiddle", secret:"qtReveal", hint:"qt3tHint", fbhint:"qt3tFbHint" }, hints:["qt3tH1","qt3tH2","qt3tH3"] },
      { sec:"lv4", trick:"blow", text:{ tag:"qt3bTag", riddle:"qt3bRiddle", hint:"qt3bHint" }, hints:["qt3bH1","qt3bH2","qt3bH3"] },
      { sec:"lv5", trick:"route", text:{ tag:"qt3b2routeTag", riddle:"qt3b2routeRiddle", hint:"qt3b2routeHint", reveal:"qtReveal" }, hints:["qt3b2routeH1","qt3b2routeH2","qt3b2routeH3"] },
      { sec:"lv1", trick:"press", pressMs:950, text:{ tag:"qt3b2pressTag", riddle:"qt3b2pressRiddle", press:"qt3b2pressPress", reveal:"qtReveal", hint:"qt3b2pressHint" }, hints:["qt3b2pressH1","qt3b2pressH2","qt3b2pressH3"] },
      { sec:"lv1", trick:"press", pressMs:950, text:{ tag:"qt3b3pressTag", riddle:"qt3b3pressRiddle", press:"qt3b3pressPress", reveal:"qtReveal", hint:"qt3b3pressHint" }, hints:["qt3b3pressH1","qt3b3pressH2","qt3b3pressH3"] },
      { sec:"lv3", trick:"tilt", text:{ tag:"qt3b3tiltTag", riddle:"qt3b3tiltRiddle", secret:"qtReveal", hint:"qt3b3tiltHint", fbhint:"qt3b3tiltFbHint" }, hints:["qt3b3tiltH1","qt3b3tiltH2","qt3b3tiltH3"] },
      { sec:"lv4", trick:"blow", text:{ tag:"qt3b4blowTag", riddle:"qt3b4blowRiddle", hint:"qt3b4blowHint" }, hints:["qt3b4blowH1","qt3b4blowH2","qt3b4blowH3"] },
      { sec:"lv5", trick:"route", text:{ tag:"qt3b4routeTag", riddle:"qt3b4routeRiddle", hint:"qt3b4routeHint", reveal:"qtReveal" }, hints:["qt3b4routeH1","qt3b4routeH2","qt3b4routeH3"] },
      { sec:"lv7", trick:"row", need:14, text:{ tag:"qt3b5rowTag", riddle:"qt3b5rowRiddle", hint:"qt3b5rowHint" }, hints:["qt3b5rowH1","qt3b5rowH2","qt3b5rowH3"] },
      { sec:"lv3", trick:"tilt", text:{ tag:"qt3b5tiltTag", riddle:"qt3b5tiltRiddle", secret:"qtReveal", hint:"qt3b5tiltHint", fbhint:"qt3b5tiltFbHint" }, hints:["qt3b5tiltH1","qt3b5tiltH2","qt3b5tiltH3"] },
      { sec:"lv6", trick:"flame", flameGain:1.6, text:{ tag:"qt3b6flameTag", riddle:"qt3b6flameRiddle", hint:"qt3b6flameHint" }, hints:["qt3b6flameH1","qt3b6flameH2","qt3b6flameH3"] },
      { sec:"lvEmber", trick:"ember", text:{ tag:"qt3b6emberTag", riddle:"qt3b6emberRiddle", hint:"qt3b6emberHint" }, hints:["qt3b6emberH1","qt3b6emberH2","qt3b6emberH3"] },
    ],
    ending: { title:"qt3DoneTitle", body:"qt3DoneBody", end:"qt3DoneEnd" },
  },
  /* 재회 — 단편 소설(책)의 마지막 장으로 이전. 플레이 곁가지에선 제거(중복 회피).
     ember 트릭 메시지 오버라이드 + 긴 엔딩 seqKey 시스템은 코드에 유지 → 다음 긴-엔딩 곁가지에서 재사용. */
};

/* ===== 스토리 시리즈 =====
   각 시리즈 = 독립적으로 확장되는 연속 사가(자기 항해들 + 캡스톤 단편). 허브가 시리즈별 섹션으로 렌더.
   새 시리즈 추가 = 여기 객체 하나 + (있으면) levels.js에 그 시리즈 storyText/제목 키. */
/* 각 시리즈 = 소설-먼저(novelFirst): stories 배열의 각 단편이 📖 입구, 본문 ⟦KNOT:key⟧에서
   매듭(트릭) 실행 후 그 자리로 복귀. knots: key → { scid 시나리오 id, label 버튼 i18n 키 }. */
const SERIES = {
  boatman: {
    id: "boatman",
    titleKey: "seriesBoatman",
    scenarios: [],          // 항해는 소설 안 매듭으로 — 허브 항해 카드 없음
    novelFirst: true,
    stories: [
      { titleKey:"learnTitle", tagKey:"learnTag", textKey:"learnStory",
        knots: { tutorial:{ scid:"tutorial", label:"knotTutorialLabel" } } },
      { titleKey:"crossTitle", tagKey:"crossTag", textKey:"crossStory",
        knots: { snow:{ scid:"snow_lake", label:"knotSnowLabel" },
                 dawn:{ scid:"dawn_river", label:"knotDawnLabel" },
                 lantern:{ scid:"lantern_harbor", label:"knotLanternLabel" } } },
    ],
  },
  memory: {
    id: "memory",
    titleKey: "seriesMemory",
    scenarios: [],
    novelFirst: true,
    stories: [
      { titleKey:"memTitle", tagKey:"memTag", textKey:"memStory",
        knots: { road:{ scid:"road_knot", label:"knotRoadLabel" },
                 erase:{ scid:"erase_knot", label:"knotEraseLabel" } } },
    ],
  },
  tower: {
    id: "tower",
    titleKey: "seriesTower",
    scenarios: ["tower_t1","tower_t2","tower_t3"],
    novelFirst: false,
    quiz: true,
    stories: [],
  },
};

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
  tower_a3: {
    id: "tower_a3", titleKey: "sc_tower_a3", series:"tower", quiz:true, gate:"tower_a2",
    levels: [
      { sec:"lvDial", trick:"twist",
        text:{ tag:"qtA3Tag", riddle:"qtA3Riddle", hint:"qtA3Hint", reveal:"qtReveal" },
        hints:["qtA3H1","qtA3H2","qtA3H3"] },
    ],
    ending: { title:"qtA3DoneTitle", body:"qtA3DoneBody", end:"qtA3DoneEnd" },
  },
  tower_a4: {
    id: "tower_a4", titleKey: "sc_tower_a4", series:"tower", quiz:true, gate:"tower_a3",
    levels: [
      { sec:"lvHold", trick:"holdfast",
        stars:[{x:0.15,y:0.72},{x:0.30,y:0.34},{x:0.48,y:0.62},{x:0.67,y:0.28},{x:0.86,y:0.54}],
        text:{ tag:"qtA4aTag", riddle:"qtA4aRiddle", hint:"qtA4aHint", reveal:"qtReveal" },
        hints:["qtA4aH1","qtA4aH2","qtA4aH3"] },
    ],
    ending: { title:"qtA4DoneTitle", body:"qtA4DoneBody", end:"qtA4DoneEnd" },
  },
  tower_a2: {
    id: "tower_a2", titleKey: "sc_tower_a2", series:"tower", quiz:true, gate:"tower_t1",
    levels: [
      { sec:"lvStar", trick:"stardust",
        text:{ tag:"qtA2Tag", riddle:"qtA2Riddle", hint:"qtA2Hint", reveal:"qtReveal" },
        hints:["qtA2H1","qtA2H2","qtA2H3"] },
    ],
    ending: { title:"qtA2DoneTitle", body:"qtA2DoneBody", end:"qtA2DoneEnd" },
  },
  tower_a6: {
    id: "tower_a6", titleKey: "sc_tower_a6", series:"tower", quiz:true, gate:"tower_a4",
    levels: [
      { sec:"lvRope", trick:"tightrope",
        text:{ tag:"qtA6Tag", riddle:"qtA6Riddle", hint:"qtA6Hint", reveal:"qtReveal" },
        hints:["qtA6H1","qtA6H2","qtA6H3"] },
    ],
    ending: { title:"qtA6DoneTitle", body:"qtA6DoneBody", end:"qtA6DoneEnd" },
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
    scenarios: ["tower_t1","tower_a2","tower_a3","tower_a4","tower_a6"],
    novelFirst: false,
    quiz: true,
    stories: [],
  },
};

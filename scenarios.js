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
    ending: { title:"snowDoneTitle", body:"snowDoneBody", end:"snowDoneEnd", coda:"snowCoda" },
  },
  /* 새벽 강 — 이사 가는 아이. 신규 트릭 '나란히 젓기'(두 노 동시). 돌아봄의 반전 + 종이배 코다. */
  dawn_river: {
    id: "dawn_river",
    titleKey: "sc_dawn",
    levels: [
      { sec:"lvFold",   trick:"fold",   text:{ tag:"foldTag", riddle:"foldRiddle", hint:"foldHint" } },
      { sec:"lvRowPar", trick:"rowpar", text:{ tag:"dawnTag", riddle:"dawnRiddle", hint:"dawnHint" } },
    ],
    ending: { title:"dawnDoneTitle", body:"dawnDoneBody", end:"dawnDoneEnd", coda:"dawnCoda" },
  },
  /* 등불 항구 — 잊혀가는 기억. 신규 트릭 '불씨 옮기기'(손 떼지 않고 천천히). 시선=못 알아봄, 코다=이름 없는 등불. */
  lantern_harbor: {
    id: "lantern_harbor",
    titleKey: "sc_lantern",
    levels: [
      { sec:"lvEmber", trick:"ember", text:{ tag:"emberTag", riddle:"emberRiddle", hint:"emberHint" } },
    ],
    ending: { title:"lanternDoneTitle", body:"lanternDoneBody", end:"lanternDoneEnd", coda:"lanternCoda" },
  },
  /* 기억 시리즈 「그려둔 길」의 *인라인 매듭* 2개 — 허브 카드 아님. 소설(book) 본문의
     ⟦KNOT:road⟧·⟦KNOT:erase⟧ 지점에서 실행 → 엔딩 카드(측량가 버전) → 이야기로 복귀.
     series:"memory"+knot:true → 엔딩 카드 오버라이드 + backHarborBtn=이야기로 돌아가기. */
  road_knot: {                 // 작별 매듭 — 길 그리기(시작점→도시)
    id: "road_knot", titleKey: "sc_road", series: "memory", knot: true,
    levels: [
      { sec:"lvRoad", trick:"road", text:{ tag:"roadTag", riddle:"roadRiddle", hint:"roadHint", reveal:"roadReveal" } },
    ],
    ending: { title:"roadDoneTitle", body:"roadDoneBody", end:"roadDoneEnd", coda:"roadCoda", stay:"roadStay" },
  },
  erase_knot: {                // 망각 매듭 — 되짚어 지우기(끝→시작점). 느린 망각 seqKey + 잔류.
    id: "erase_knot", titleKey: "sc_erase", series: "memory", knot: true,
    levels: [
      { sec:"lvErase", trick:"erase", text:{ tag:"eraseTag", riddle:"eraseRiddle", hint:"eraseHint", reveal:"eraseReveal" } },
    ],
    ending: { title:"eraseDoneTitle", body:"eraseDoneBody", end:"eraseDoneEnd", coda:"eraseCoda", stay:"eraseStay", seqKey:"eraseSeq" },
  },
  /* 재회 — 단편 소설(책)의 마지막 장으로 이전. 플레이 곁가지에선 제거(중복 회피).
     ember 트릭 메시지 오버라이드 + 긴 엔딩 seqKey 시스템은 코드에 유지 → 다음 긴-엔딩 곁가지에서 재사용. */
};

/* ===== 스토리 시리즈 =====
   각 시리즈 = 독립적으로 확장되는 연속 사가(자기 항해들 + 캡스톤 단편). 허브가 시리즈별 섹션으로 렌더.
   새 시리즈 추가 = 여기 객체 하나 + (있으면) levels.js에 그 시리즈 storyText/제목 키. */
const SERIES = {
  boatman: {
    id: "boatman",
    titleKey: "seriesBoatman",
    scenarios: ["tutorial", "snow_lake", "dawn_river", "lantern_harbor"],
    story: { titleKey: "storyTitle", tagKey: "storyTag", textKey: "storyText" },   // 「건너간 자리」
  },
  memory: {
    id: "memory",
    titleKey: "seriesMemory",
    scenarios: [],                          // 곁가지 카드 없음 — 소설 안에서 인라인 매듭으로 실행
    story: { titleKey: "memTitle", tagKey: "memTag", textKey: "memStory" },   // 「그려둔 길」
    novelFirst: true,                       // 허브에서 📖 소설이 *입구*
    knots: { road: "road_knot", erase: "erase_knot" },   // ⟦KNOT:key⟧ → 시나리오 id
    comingSoon: false,
  },
};

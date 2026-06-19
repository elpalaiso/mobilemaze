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
};

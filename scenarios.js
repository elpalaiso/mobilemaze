/* ===== 시나리오 매니페스트 =====
   새 항해(시나리오) 추가 = 여기에 객체 하나 + levels.js의 I18N 키.
   각 레벨 = { sec: DOM 섹션 id, trick: engine.js TRICKS registry의 키 }.
   (현재는 튜토리얼 1개. 다음 단계에서 DOM 템플릿 재사용 + 허브를 얹어
    sec 하드코딩을 트릭 템플릿으로 일반화한다.) */
const SCENARIOS = {
  tutorial: {
    id: "tutorial",
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
  },
};

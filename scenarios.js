/* ===== 시나리오 매니페스트 =====
   새 항해(시나리오) 추가 = 여기에 객체 하나 + levels.js의 I18N 키.
   각 레벨 = { sec: DOM 섹션 id, trick: engine.js TRICKS registry의 키 }.
   (현재는 튜토리얼 1개. 다음 단계에서 DOM 템플릿 재사용 + 허브를 얹어
    sec 하드코딩을 트릭 템플릿으로 일반화한다.) */
const SCENARIOS = {
  tutorial: {
    id: "tutorial",
    levels: [
      { sec:"lv1", trick:"press" },
      { sec:"lv2", trick:"pinch" },
      { sec:"lv3", trick:"tilt" },
      { sec:"lv4", trick:"blow" },
      { sec:"lv5", trick:"route" },
      { sec:"lv6", trick:"flame" },
      { sec:"lv7", trick:"row" },
      { sec:"lv8", trick:"farewell" },
    ],
  },
};

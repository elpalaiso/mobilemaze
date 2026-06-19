const $ = id => document.getElementById(id);
  const setT = (id,t) => { const e=$(id); if(e) e.textContent=t; };
  let CUR = I18N.ko;
  let curView = "play";   // 현재 화면(play/hub/gate) — 상단 타이틀 분기용
  const LANG_KEY = "mobilemaze.lang";

  /* ===== 저장 v2 — 시나리오별 진행 + 언어. 구 progress/lang 1회 마이그레이션 ===== */
  const SAVE2_KEY = "mobilemaze.v2";
  function loadSave(){
    try{ const raw=localStorage.getItem(SAVE2_KEY); if(raw) return JSON.parse(raw); }catch(e){}
    const oldStep=parseInt(localStorage.getItem("mobilemaze.progress")||"0",10);
    const oldLang=localStorage.getItem("mobilemaze.lang")||null;
    const s={ lang:oldLang, scenarios:{}, unlocked:["tutorial"] };
    if(!isNaN(oldStep) && oldStep>0) s.scenarios.tutorial={ step:oldStep, cleared:false };
    return s;
  }
  let SAVE = loadSave();
  function persist(){ try{ localStorage.setItem(SAVE2_KEY, JSON.stringify(SAVE)); }catch(e){} }
  function scenarioState(){ const id=RUN.scenario.id; return SAVE.scenarios[id] || (SAVE.scenarios[id]={ step:0, cleared:false }); }

  function detectLang(){
    const saved = SAVE.lang;
    if(saved && I18N[saved]) return saved;
    return (navigator.language||"ko").toLowerCase().startsWith("ko") ? "ko" : "en";
  }

  function applyLang(lang){
    if(!I18N[lang]) lang="ko";
    CUR = I18N[lang];
    document.documentElement.lang = lang;
    SAVE.lang=lang; persist();

    refreshTitle(); setT("resetBtn",CUR.reset);
    { const mb=$("menuBtn"); if(mb) mb.textContent="☰ "+CUR.menu; }
    const sub=$("t-subtitle"); if(sub){ sub.textContent=CUR.subtitle||""; sub.style.display=CUR.subtitle?"":"none"; }
    // 트릭 chrome (레벨 콘텐츠는 매니페스트 → registry bind 가 담당)
    setT("sensorBtn",CUR.sensor); setT("gauge",CUR.gaugeInit);
    setT("windBtn",CUR.l4windBtn); setT("oarBtn",CUR.l4oar); setT("windGauge",CUR.l4windPrefix+"0%");
    setT("routeClearBtn",CUR.l5clear);
    setT("shelterBtn",CUR.l6shelterBtn); setT("flameGauge",CUR.l6shelterPrefix+"0%");
    setT("rowGauge",CUR.l7rowPrefix+"0%"); setT("warmGauge",CUR.warmPrefix+"0%");
    setT("rpGauge",CUR.rpPrefix+"0%"); setT("rpSyncBtn",CUR.rpSyncBtn);
    setT("foldGauge",CUR.foldPrefix+"0/3");
    setT("emberGauge",CUR.emberPrefix+"0%");
    setT("fwBtn",CUR.l8btn); fwShow();
    setT("done-title",endK("title","doneTitle")); setT("done-end",endK("end","doneEnd")); setT("hubTitle",CUR.hubTitle);
    setT("end-stay",CUR.endStay); setCoda();
    setT("share-title",CUR.shareTitle); setT("share-body",CUR.shareBody);
    setT("shareBtn",CUR.shareBtn); setT("backHarborBtn",CUR.backToHarbor);
    setT("gatePrompt",CUR.gatePrompt); setT("gateYes",CUR.gateYes); setT("gateNo",CUR.gateNo);
    $("done-body").innerHTML = endK("body","doneBody");
    document.querySelectorAll(".confirmBtn").forEach(b=>b.textContent=CUR.confirm);
    ["in1","in2","in3","in5"].forEach(id=>{ const e=$(id); if(e) e.placeholder=CUR.placeholder; });
    document.querySelectorAll(".langbar button").forEach(b=>
      b.classList.toggle("on", b.dataset.lang===lang));
    // 현재 활성 레벨 콘텐츠 재바인딩(언어 토글 반영)
    const _l=RUN.scenario.levels.find(x=>x.sec===ORDER[curIdx]);
    if(_l && TRICKS[_l.trick] && TRICKS[_l.trick].bind) TRICKS[_l.trick].bind(_l);
    const _hub=$("hub"); if(_hub && _hub.style.display!=="none") buildHub();   // 허브 열려있으면 카드도 새 언어로
  }
  document.querySelectorAll(".langbar button").forEach(b=>
    b.addEventListener("click",()=>applyLang(b.dataset.lang)));

  /* ===== 정답 확인 (정답은 현재 언어 사전에서) ===== */
  const norm = s => (s||"").trim().toLowerCase();
  /* 햅틱(Vibration API) — 미지원/데스크탑은 자동 무시. 작은도착=짧게, 막완료=패턴.
     동시에 화면 글로우로 *시각 미러*(iOS 등 햅틱 미지원 환경 커버). */
  function haptic(p){
    try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){}
    if(Array.isArray(p)) glow(1); else if(p>=15) glow(0);   // 자잘한 노젓기(8)는 글로우 제외
  }
  function glow(big){
    const g=$("glow"); if(!g) return;
    g.style.transition="none"; g.style.opacity = big ? "0.5" : "0.26";
    requestAnimationFrame(()=>{ g.style.transition="opacity "+(big?720:400)+"ms ease-out"; g.style.opacity="0"; });
  }
  function check(inId, msgId){
    const lvl = RUN.scenario.levels.find(x=>x.sec===ORDER[curIdx]);
    const target = lvl && lvl.ans ? CUR[lvl.ans] : "";   // 정답 = 현재 시나리오 레벨의 매니페스트 키
    const v = norm($(inId).value);
    const m = $(msgId);
    if(target && v === norm(target)){
      m.className="msg ok"; m.textContent=CUR.ok; haptic(20);
      setTimeout(advance, 600);
    } else {
      m.className="msg bad"; m.textContent=CUR.bad;
    }
  }

  /* ===== 진행/네비 — 현재 레벨 기준(정답 인덱스와 분리) ===== */
  const SAVE_KEY="mobilemaze.progress";
  const RUN = { scenario: SCENARIOS.tutorial };               // 현재 진행 중 시나리오
  let ORDER = RUN.scenario.levels.map(l=>l.sec).concat("done");  // 시나리오 전환 시 startScenario가 갱신
  /* 트릭 registry — 트릭별 init/cleanup 계약(향후 reset/fallback/hint도 이리로) */
  const TRICKS = {   // inc2: 콘텐츠는 매니페스트 text 키 → bind 가 템플릿에 주입(시나리오 재사용 가능)
    press:    { bind:(lv)=>{ const t=lv.text||{};
      setT("l1-tag",CUR[t.tag]); setT("l1-riddle",CUR[t.riddle]); setT("l1-press",CUR[t.press]);
      setT("l1-reveal",CUR[t.reveal]); setT("l1-hint",CUR[t.hint]); } },
    pinch:    { bind:(lv)=>{ const t=lv.text||{};
      setT("l2-tag",CUR[t.tag]); setT("l2-riddle",CUR[t.riddle]); setT("l2-before",CUR[t.before]);
      setT("l2-tiny",CUR[t.tiny]); setT("l2-after",CUR[t.after]); setT("l2-hint",CUR[t.hint]); } },
    tilt:     { init:tiltInit, bind:(lv)=>{ const t=lv.text||{};
      setT("l3-tag",CUR[t.tag]); setT("l3-riddle",CUR[t.riddle]); setT("l3-secret",CUR[t.secret]);
      setT("l3-hint",CUR[t.hint]); setT("l3-fallback-hint",CUR[t.fbhint]); } },
    blow:     { cleanup:stopMic, bind:(lv)=>{ const t=lv.text||{};
      setT("l4-tag",CUR[t.tag]); setT("l4-riddle",CUR[t.riddle]); setT("l4-hint",CUR[t.hint]); } },
    route:    { init:routeInit, bind:(lv)=>{ const t=lv.text||{};
      setT("l5-tag",CUR[t.tag]); setT("l5-riddle",CUR[t.riddle]); setT("l5-hint",CUR[t.hint]); setT("l5-reveal",CUR[t.reveal]); } },
    flame:    { init:flameInit, cleanup:flameStop, bind:(lv)=>{ const t=lv.text||{};
      setT("l6-tag",CUR[t.tag]); setT("l6-riddle",CUR[t.riddle]); setT("l6-hint",CUR[t.hint]); } },
    row:      { init:rowInit, bind:(lv)=>{ const t=lv.text||{};
      setT("l7-tag",CUR[t.tag]); setT("l7-riddle",CUR[t.riddle]); setT("l7-hint",CUR[t.hint]); } },
    rowpar:   { init:rpInit, bind:(lv)=>{ const t=lv.text||{};
      setT("rp-tag",CUR[t.tag]); setT("rp-riddle",CUR[t.riddle]); setT("rp-hint",CUR[t.hint]); } },
    fold:     { init:foldInit, bind:(lv)=>{ const t=lv.text||{};
      setT("fold-tag",CUR[t.tag]); setT("fold-riddle",CUR[t.riddle]); setT("fold-hint",CUR[t.hint]); } },
    ember:    { init:emberInit, cleanup:emberStop, bind:(lv)=>{ const t=lv.text||{};
      setT("ember-tag",CUR[t.tag]); setT("ember-riddle",CUR[t.riddle]); setT("ember-hint",CUR[t.hint]); } },
    farewell: { init:fwInit, cleanup:fwStopLoop, bind:(lv)=>{ const t=lv.text||{};
      setT("l8-tag",CUR[t.tag]); setT("l8-hint",CUR[t.hint]); } },
    warm:     { init:warmInit, cleanup:warmStop, reset:warmReset, bind:(lv)=>{ const t=lv.text||{};
      setT("warm-tag",CUR[t.tag]); setT("warm-riddle",CUR[t.riddle]); setT("warm-hint",CUR[t.hint]); } },
  };
  function trickOf(sec){ const l=RUN.scenario.levels.find(x=>x.sec===sec); return l ? TRICKS[l.trick] : null; }
  let curIdx = 0;
  function show(idx){
    idx=Math.max(0,Math.min(idx,ORDER.length-1));
    const pt=trickOf(ORDER[curIdx]); if(pt && pt.cleanup) pt.cleanup();   // 떠나는 트릭 정리(registry)
    curIdx = idx;
    document.querySelectorAll(".level").forEach(el=>el.classList.remove("active"));
    const _lv=$(ORDER[idx]); _lv.classList.add("active");
    _lv.style.opacity="0"; requestAnimationFrame(()=>{ _lv.style.transition="opacity .35s ease"; _lv.style.opacity="1"; });
    document.querySelectorAll("#dots i").forEach((d,k)=>d.classList.toggle("on", k<idx));
    window.scrollTo(0,0);
    const lvl=RUN.scenario.levels.find(x=>x.sec===ORDER[idx]);            // 콘텐츠 바인딩 + 트릭 준비(registry)
    const nt=lvl ? TRICKS[lvl.trick] : null;
    if(nt){ if(nt.bind) nt.bind(lvl); if(nt.init) nt.init(); }
    const _st=scenarioState(); _st.step=idx; if(ORDER[idx]==="done") _st.cleared=true; persist();
    if(ORDER[idx]==="done") runEnding(); else resetEnding();
  }
  /* ===== 엔딩 3박 연출: 도착 → (hold) → 잔류 비트 → (hold) → 공유 카드 ===== */
  /* 엔딩 카피는 시나리오별(매니페스트 ending) → 없으면 글로벌 폴백. 잔류 항상성 라인·공유 카드는 불변(글로벌). */
  let endingTimers=[];
  let seqLines=null, seqIdx=0, seqTimer=null, seqFinished=false, seqTapBound=false;   // 긴 엔딩 시퀀스
  function endK(name, fb){ const e=RUN.scenario && RUN.scenario.ending; return (e && e[name]) ? CUR[e[name]] : CUR[fb]; }
  /* 현재 레벨의 매니페스트 text 오버라이드(없으면 글로벌 폴백) — 트릭 메시지 시나리오별화 */
  function curLevelText(name, fb){ const lvl=RUN.scenario.levels.find(x=>x.sec===ORDER[curIdx]); const t=lvl&&lvl.text; return (t && t[name]) ? CUR[t[name]] : CUR[fb]; }
  function setCoda(){ const cd=$("end-coda"); if(!cd) return; const e=RUN.scenario && RUN.scenario.ending; cd.textContent = (e && e.coda) ? CUR[e.coda] : ""; }
  function seqClearTimer(){ if(seqTimer){ clearTimeout(seqTimer); seqTimer=null; } }
  function resetEnding(){
    endingTimers.forEach(t=>clearTimeout(t)); endingTimers=[];
    seqClearTimer(); seqLines=null; seqIdx=0; seqFinished=false;
    const s=$("endStayBeat"), c=$("endCard");
    if(s) s.classList.remove("in"); if(c) c.classList.remove("in");
    const sq=$("endSeq"); if(sq) sq.innerHTML="";
  }
  function seqStep(){     // 다음 줄을 *추가*(누적). 탭/타이머 공용.
    seqClearTimer();
    const seqEl=$("endSeq");
    if(!seqLines || !seqEl) return;
    if(seqIdx >= seqLines.length){ seqFinish(); return; }
    const line=seqLines[seqIdx]; seqIdx++;
    const p=document.createElement("p"); p.className="seq-line"; p.textContent=line;
    seqEl.appendChild(p);
    requestAnimationFrame(()=>{ p.classList.add("in"); try{ p.scrollIntoView({behavior:"smooth", block:"nearest"}); }catch(e){} });
    if(seqIdx < seqLines.length) seqTimer=setTimeout(seqStep, (line.length<=10?1500:2200));
    else seqTimer=setTimeout(seqFinish, 2200);
  }
  function seqFinish(){
    seqClearTimer();
    if(seqFinished) return; seqFinished=true;
    endingTimers.push(setTimeout(()=>{ const s=$("endStayBeat"); if(s) s.classList.add("in"); }, 700));
    endingTimers.push(setTimeout(()=>{ const c=$("endCard"); if(c) c.classList.add("in"); }, 1900));
  }
  function runEnding(){
    resetEnding();
    // 활성 시나리오 엔딩 카피 주입(허브로 시나리오가 바뀐 경우 대비)
    setT("done-title",endK("title","doneTitle")); setT("done-end",endK("end","doneEnd"));
    $("done-body").innerHTML = endK("body","doneBody"); setCoda();
    const e=RUN.scenario && RUN.scenario.ending;
    const seqArr = (e && e.seqKey && Array.isArray(CUR[e.seqKey])) ? CUR[e.seqKey] : null;
    const seqEl=$("endSeq");
    if(seqArr && seqEl){
      // 긴 엔딩: 한 줄씩 *쌓이며* 등장. 화면 탭하면 다음 줄 즉시(성격 급한 사람용).
      seqLines=seqArr; seqIdx=0; seqFinished=false;
      if(!seqTapBound){ seqTapBound=true; const dn=$("done"); if(dn) dn.addEventListener("click",ev=>{
        if(ev.target.closest("#endCard")) return;        // 카드 버튼은 그대로
        if(seqLines && !seqFinished) seqStep();           // 탭 = 다음 줄 즉시(마지막이면 마무리)
      }); }
      endingTimers.push(setTimeout(seqStep, 1400));        // 도착 후 시작
    } else {
      endingTimers.push(setTimeout(()=>{ const s=$("endStayBeat"); if(s) s.classList.add("in"); }, 1000));
      endingTimers.push(setTimeout(()=>{ const c=$("endCard"); if(c) c.classList.add("in"); }, 2000));
    }
  }
  function advance(){ show(curIdx+1); }
  function loadProgress(){ return scenarioState().step || 0; }
  /* 시나리오 전환 기계장치 — ORDER·dots를 현재 시나리오에 맞게 동적 생성 */
  function buildDots(){
    const n=RUN.scenario.levels.length, d=$("dots");
    if(d) d.innerHTML = Array.from({length:n},()=>"<i></i>").join("");
  }
  function startScenario(id){
    stopMic(); flameStop(); warmStop(); fwStopLoop(); emberStop();    // 이전 시나리오 루프 정리(방어)
    RUN.scenario = SCENARIOS[id] || SCENARIOS.tutorial;
    ORDER = RUN.scenario.levels.map(l=>l.sec).concat("done");
    buildDots();
    resetLevels();            // 트릭 전역 상태 0으로 — 시나리오 간 공유 트릭(row 등) 오염 방지
    show(loadProgress());
  }
  /* 화면 라우터: play(레벨) / hub(항구) / gate(처음?) */
  function showView(v){
    curView=v;
    ["play","hub","gate","book"].forEach(id=>{ const e=$(id); if(e) e.style.display=(id===v)?"":"none"; });
    const mb=$("menuBtn"); if(mb) mb.classList.toggle("on", v==="hub");   // 허브 열림=강조(언어 토글처럼)
    refreshTitle();
  }
  /* 상단 타이틀: play=현재 시나리오 제목 / hub·gate=게임 제목("밤바다") */
  function refreshTitle(){
    const t=$("t-title"); if(!t) return;
    t.textContent = (curView==="play") ? (CUR[RUN.scenario.titleKey]||CUR.title)
                  : (curView==="book") ? (CUR.storyTitle||CUR.title) : CUR.title;
  }
  function buildHub(){
    const list=$("hubList"); if(!list) return;
    setT("hubTitle", CUR.hubTitle);
    list.innerHTML="";
    Object.values(SCENARIOS).forEach(sc=>{
      const st=SAVE.scenarios[sc.id]||{};
      const card=document.createElement("button");
      card.className="hubcard";
      const total=sc.levels.length, done=Math.min(st.step||0, total);   // step=완료 레벨 수
      card.innerHTML=(st.cleared?"🟡 ":"🕯️ ")+(CUR[sc.titleKey]||sc.id)+
        ' <span class="hubcount'+(done>=total&&total>0?' full':'')+'">('+done+'/'+total+')</span>';
      card.addEventListener("click",()=>{ startScenario(sc.id); showView("play"); });
      list.appendChild(card);
    });
    // 이야기(단편 소설) — 곁가지 아래, 구별되는 표시(📖 + 점선 카드)
    const div=document.createElement("div"); div.className="hub-divider"; div.textContent=CUR.libraryLabel||""; list.appendChild(div);
    const book=document.createElement("button"); book.className="hubcard bookcard";
    book.innerHTML="📖 "+(CUR.storyTitle||"")+' <span class="hubcount story">'+(CUR.storyTag||"")+'</span>';
    book.addEventListener("click", openBook);
    list.appendChild(book);
  }
  function openBook(){
    const page=$("bookPage");
    if(page){
      page.innerHTML="";
      const paras = CUR.storyText || (I18N.ko && I18N.ko.storyText) || [];
      paras.forEach((para,i)=>{
        const sep=(para==="✶");
        const el=document.createElement(sep?"div":"p");
        el.className = sep ? "book-sep" : "book-para";
        el.textContent = para;
        el.style.opacity="0";
        page.appendChild(el);
        setTimeout(()=>{ el.style.transition="opacity .35s ease"; el.style.opacity="1"; }, 70*i);  // 펼치면 촤르륵
      });
    }
    setT("bookBack", CUR.backToHarbor);
    window.scrollTo(0,0);
    showView("book");
  }

  /* ===== L4/L5 상태 — show()/resetLevels보다 먼저 선언(TDZ 방지) ===== */
  let audioCtx=null, micStream=null, micRaf=null, sailDone=false, oarFill=0;
  let routeCanvas=null, routeCtx=null, routeStars=[], routeStroke=[], routeDrawing=false, routeDone=false;
  let flameShelter=0, flameDone=false, flameSheltering=false, flameBtnHold=false, flameRaf=null, flameBox=null;
  let rowCount=0, rowNeed=12, rowNext='left', rowDone=false, rowBound=false;
  let rpCount=0, rpNeed=10, rpLeftDown=false, rpRightDown=false, rpLast=0, rpDone=false, rpBound=false;
  let foldCount=0, foldNeed=3, foldDone=false, foldBound=false, foldSX=0, foldSY=0, foldDrag=false;
  let revealAdv=false, revealTimer=null;   // L1/L3/L5 자동진행 — resetLevels보다 먼저 선언(TDZ 방지)
  let emberProg=0, emberTarget=0, emberCarry=false, emberDone=false, emberBound=false, emberRaf=null;  // 불씨 옮기기
  let emberTrackLeft=0, emberX0=0, emberX1=0;   // 두 등불 중심(트랙 기준 px)
  let warmFill=0, warmDone=false, warmHold=false, warmRaf=null, warmBox=null;
  let tiltGotEvent=false, tiltBound=false, tiltTimer=null;
  let fwStep=0, fwDone=false, fwBound=false, fwProgress=0, fwHold=false, fwRaf=null;

  /* 다시하기: 진행뿐 아니라 각 레벨의 일시적 UI 상태까지 초기화 */
  function resetLevels(){
    revealCancel();                                   // 대기 중인 자동진행 타이머 취소
    $("pressBox").classList.remove("lit");            // L1
    $("tiltBox").classList.remove("show");            // L3
    { const tf=$("tiltFallback"); if(tf) tf.style.display="none"; tiltGotEvent=false; }
    $("gauge").textContent = CUR.gaugeInit;
    sailDone=false; oarFill=0; setSail(0,0);          // L4
    $("windBtn").style.display=""; $("oarBtn").style.display="none";
    routeReset();                                     // L5
    flameReset();                                     // L6
    rowReset();                                       // L7
    rpReset();                                        // 나란히 젓기(새벽 강)
    foldReset();                                      // 종이배 접기(새벽 강)
    emberReset();                                     // 불씨 옮기기(등불 항구)
    warmReset();                                      // 체온 나누기
    fwReset();                                         // L8 작별
    ["in1","in2","in3","in5"].forEach(id=>{ const e=$(id); if(e) e.value=""; });
    ["msg1","msg2","msg3","msg5"].forEach(id=>{ const e=$(id); if(e){ e.textContent=""; e.className="msg"; } });
  }

  /* ===== 초기화 ===== */
  applyLang(detectLang());
  startScenario("tutorial");
  if(!SAVE.seenTutorial){ showView("gate"); } else { buildHub(); showView("hub"); }   // 첫 방문=게이트, 기존=항구
  $("menuBtn").addEventListener("click",()=>{
    if($("hub").style.display!=="none"){ showView("play"); }   // 이미 열림 → 닫고 플레이로(토글)
    else { buildHub(); showView("hub"); }
  });
  $("gateYes").addEventListener("click",()=>{ SAVE.seenTutorial=true; persist(); showView("play"); });
  $("gateNo").addEventListener("click",()=>{ SAVE.seenTutorial=true; persist(); buildHub(); showView("hub"); });
  { const bk=$("bookBack"); if(bk) bk.addEventListener("click",()=>{ buildHub(); showView("hub"); }); }
  $("resetBtn").addEventListener("click",()=>{
    stopMic(); resetLevels();
    const _st=scenarioState(); _st.step=0; _st.cleared=false; persist(); show(0);
  });
  /* 공유 = 등불을 다음 사람에게(데려다주기의 잔류 제스처). Web Share + 클립보드 폴백. */
  { const sb=$("shareBtn"); if(sb) sb.addEventListener("click", async ()=>{
      const data={ text:CUR.shareText, url:location.href.split("#")[0] };
      try{ if(navigator.share){ await navigator.share(data); return; } }catch(e){ return; }   // 사용자 취소 포함 → 조용히
      try{ await navigator.clipboard.writeText(data.text+" "+data.url);
        sb.textContent="🔗"; setTimeout(()=>setT("shareBtn",CUR.shareBtn),1500); }catch(e){}
    }); }
  { const bb=$("backHarborBtn"); if(bb) bb.addEventListener("click",()=>{ buildHub(); showView("hub"); }); }

  /* 제스처로 답이 드러나는 레벨(L1/L3/L5)은 타이핑 없이 — 드러나면 3초 여운 후 자동 진행 (상태는 상단 선언) */
  function revealAdvance(){ if(revealAdv) return; revealAdv=true; revealTimer=setTimeout(()=>{ revealAdv=false; revealTimer=null; advance(); }, 3000); }
  function revealCancel(){ if(revealTimer){ clearTimeout(revealTimer); revealTimer=null; } revealAdv=false; }

  /* ===== LEVEL 1 — 길게 누르기(600ms) ===== */
  (function(){
    const box=$("pressBox"); let t=null;
    const start=e=>{ t=setTimeout(()=>{ box.classList.add("lit"); haptic(20); revealAdvance(); },600); };
    const end=e=>{ clearTimeout(t); };
    box.addEventListener("touchstart",start,{passive:true});
    box.addEventListener("touchend",end);
    box.addEventListener("mousedown",start);
    box.addEventListener("mouseup",end);
    box.addEventListener("mouseleave",end);
  })();

  /* ===== LEVEL 3 — 기울이기(deviceorientation) + 슬라이더 폴백(몰입형 미러) ===== */
  function tiltReveal(){ const b=$("tiltBox"); if(!b.classList.contains("show")){ haptic(20); revealAdvance(); } b.classList.add("show"); }
  function tiltOnTilt(e){
    tiltGotEvent = true;
    const g = Math.round(e.gamma||0);
    $("gauge").textContent = CUR.gaugePrefix + g + "°";
    if(Math.abs(g) > 40) tiltReveal();
  }
  function tiltShowFallback(){ $("tiltFallback").style.display="block"; }
  function tiltEnable(){
    if(typeof DeviceOrientationEvent!=="undefined" &&
       typeof DeviceOrientationEvent.requestPermission==="function"){
      DeviceOrientationEvent.requestPermission().then(p=>{
        if(p==="granted"){ window.addEventListener("deviceorientation",tiltOnTilt); $("sensorBtn").style.display="none"; }
        else tiltShowFallback();
      }).catch(tiltShowFallback);
    } else {
      window.addEventListener("deviceorientation",tiltOnTilt); $("sensorBtn").style.display="none";
    }
  }
  function tiltInit(){
    if(!tiltBound){
      tiltBound=true;
      $("sensorBtn").addEventListener("click",tiltEnable);
      $("tiltSlider").addEventListener("input",e=>{
        const v=+e.target.value;
        if(v<=8 || v>=92) tiltReveal();          // 끝까지 밀면(기울이면) 드러남(폴백=같은 추론)
      });
      if(typeof DeviceOrientationEvent==="undefined"){
        tiltShowFallback();                        // 센서 API 없음(데스크탑 등) → 즉시 폴백
      } else if(typeof DeviceOrientationEvent.requestPermission!=="function"){
        window.addEventListener("deviceorientation",tiltOnTilt);   // 안드로이드/일반
      }
    }
    clearTimeout(tiltTimer);
    tiltTimer = setTimeout(()=>{ if(!tiltGotEvent) tiltShowFallback(); }, 4000);  // 이벤트 없으면 폴백 노출
  }

  /* ===== LEVEL 4 — 불기(돛): 마이크 소리로 돛 채우기 ===== */
  function setSail(fill){
    $("windFill").style.width = fill + "%";
    const s=$("sail");
    s.style.filter = "grayscale(" + (1-fill/100).toFixed(2) + ") opacity(" + (0.4+0.6*fill/100).toFixed(2) + ")";
    s.style.transform = "scale(" + (1+0.18*fill/100).toFixed(2) + ")";
    const wg=$("windGauge"); wg.textContent = CUR.l4windPrefix + Math.round(fill) + "%"; wg.classList.remove("done");
  }
  function stopMic(){
    if(micRaf){ cancelAnimationFrame(micRaf); micRaf=null; }
    if(micStream){ micStream.getTracks().forEach(t=>t.stop()); micStream=null; }
    if(audioCtx){ try{ audioCtx.close(); }catch(e){} audioCtx=null; }
  }
  function sailComplete(msg){
    if(sailDone) return; sailDone=true; haptic([0,80,40,120]);
    const wg=$("windGauge"); wg.textContent = msg || CUR.l4set; wg.classList.add("done");
    stopMic();
    setTimeout(advance, 3000);   // lv4 → lv5
  }
  /* 마이크 폴백 = 스킵이 아니라 '같은 게이지를 탭으로 채워' 같은 출항 흐름으로 */
  function oarRow(){
    if(sailDone) return;
    oarFill = Math.min(100, oarFill + 12);
    $("windFill").style.width = oarFill + "%";          // 마이크와 동일한 게이지 공유
    $("windGauge").textContent = CUR.l4oarPrefix + Math.round(oarFill) + "%";
    if(oarFill >= 100) sailComplete(CUR.l4oarSet);
  }
  async function startWind(){
    try{
      micStream = await navigator.mediaDevices.getUserMedia({audio:true});
      audioCtx = new (window.AudioContext||window.webkitAudioContext)();
      if(audioCtx.state==="suspended") await audioCtx.resume();
      const src = audioCtx.createMediaStreamSource(micStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      $("windBtn").style.display="none";
      let fill = 0;
      (function loop(){
        analyser.getByteFrequencyData(data);
        let sum=0, n=24;                       // 저주파 에너지 ≈ 입김
        for(let i=2;i<2+n;i++) sum+=data[i];
        const lvl = sum/n;                      // 0..255
        if(lvl > 55) fill = Math.min(100, fill + 3.2);
        else        fill = Math.max(0, fill - 1.4);
        setSail(fill);
        if(fill>=100){ sailComplete(); return; }
        micRaf = requestAnimationFrame(loop);
      })();
    }catch(e){
      $("oarBtn").style.display="block";        // 마이크 거부/불가 → 노 젓기 폴백
    }
  }
  $("windBtn").addEventListener("click",startWind);
  $("oarBtn").addEventListener("pointerdown",e=>{ e.preventDefault(); oarRow(); });

  /* ===== LEVEL 5 — 손가락 긋기(항로 그리기): 별을 모두 이으면 길잡이 별이 드러남 ===== */
  function routeInit(){
    if(!routeCanvas){
      routeCanvas = $("routeCanvas");
      routeCtx = routeCanvas.getContext("2d");
      routeStars = [
        {x:0.14,y:0.68,hit:false},{x:0.33,y:0.30,hit:false},
        {x:0.52,y:0.64,hit:false},{x:0.71,y:0.26,hit:false},{x:0.88,y:0.52,hit:false}
      ];
      const down=e=>{ routeDrawing=true; routeAdd(e); };
      const move=e=>{ if(routeDrawing){ e.preventDefault(); routeAdd(e); } };
      const up=()=>{ routeDrawing=false; };
      routeCanvas.addEventListener("pointerdown",down);
      routeCanvas.addEventListener("pointermove",move);
      routeCanvas.addEventListener("pointerup",up);
      routeCanvas.addEventListener("pointerleave",up);
      $("routeClearBtn").addEventListener("click",()=>{ routeReset(); });
    }
    routeSize(); routeRender();
  }
  function routeSize(){
    if(!routeCanvas) return;
    routeCanvas.width = routeCanvas.clientWidth || 320;
    routeCanvas.height = 200;
  }
  function routeAdd(e){
    if(routeDone || !routeCanvas) return;
    const r=routeCanvas.getBoundingClientRect();
    const x=e.clientX-r.left, y=e.clientY-r.top;
    routeStroke.push({x,y});
    routeStars.forEach(s=>{
      const sx=s.x*routeCanvas.width, sy=s.y*routeCanvas.height;
      if(!s.hit && Math.hypot(x-sx,y-sy) < 24) s.hit=true;
    });
    routeRender();
    if(routeStars.length && routeStars.every(s=>s.hit)) routeComplete();
  }
  function routeComplete(){
    if(routeDone) return; routeDone=true; haptic([0,80,40,120]);
    $("l5-reveal").classList.add("show");
    routeRender();
    revealAdvance();
  }
  function routeReset(){
    routeStroke=[]; routeDone=false;
    routeStars.forEach(s=>s.hit=false);
    const rv=$("l5-reveal"); if(rv) rv.classList.remove("show");
    routeRender();
  }
  function routeRender(){
    if(!routeCtx) return;
    const w=routeCanvas.width, h=routeCanvas.height;
    routeCtx.clearRect(0,0,w,h);
    if(routeStroke.length>1){
      routeCtx.strokeStyle="rgba(227,165,66,.55)"; routeCtx.lineWidth=3;
      routeCtx.lineCap="round"; routeCtx.lineJoin="round";
      routeCtx.beginPath();
      routeStroke.forEach((p,i)=> i ? routeCtx.lineTo(p.x,p.y) : routeCtx.moveTo(p.x,p.y));
      routeCtx.stroke();
    }
    routeStars.forEach(s=>{
      const sx=s.x*w, sy=s.y*h;
      if(s.hit){
        routeCtx.beginPath(); routeCtx.arc(sx,sy,11,0,7);
        routeCtx.strokeStyle="rgba(227,165,66,.4)"; routeCtx.lineWidth=2; routeCtx.stroke();
      }
      routeCtx.beginPath(); routeCtx.arc(sx,sy, s.hit?6:4, 0, 7);
      routeCtx.fillStyle = s.hit ? "#e3a542" : "#3a4663"; routeCtx.fill();
    });
  }

  /* ===== LEVEL 6 — 두 손가락 감싸기(등불 보살핌): 불씨를 양손으로 감싸 지킨다 ===== */
  function flameRender(){
    $("flameFill").style.width = flameShelter + "%";
    const f=$("flame");
    f.classList.toggle("steady", (flameSheltering||flameBtnHold) && !flameDone);
    f.style.opacity = (0.5 + 0.5*flameShelter/100).toFixed(2);
    $("flameGauge").textContent = CUR.l6shelterPrefix + Math.round(flameShelter) + "%";
  }
  function flameEval(e){
    if(flameDone){ flameSheltering=false; return; }
    const t=e.touches;
    if(t && t.length>=2){
      const d=Math.hypot(t[0].clientX-t[1].clientX, t[0].clientY-t[1].clientY);
      flameSheltering = d < 180;            // 두 손가락이 등불을 감쌀 만큼 가까움
    } else flameSheltering=false;
  }
  function flameLoop(){
    if(!flameDone){
      if(flameSheltering || flameBtnHold) flameShelter=Math.min(100, flameShelter+2.0);
      else                                flameShelter=Math.max(0, flameShelter-1.1);
      flameRender();
      if(flameShelter>=100){ flameComplete(); return; }
    }
    flameRaf=requestAnimationFrame(flameLoop);
  }
  function flameStop(){ if(flameRaf){ cancelAnimationFrame(flameRaf); flameRaf=null; } }
  function flameComplete(){
    if(flameDone) return; flameDone=true; haptic([0,80,40,120]);
    const f=$("flame"); f.classList.add("steady"); f.style.opacity="1";
    const fg=$("flameGauge"); fg.textContent = CUR.l6set; fg.classList.add("done");
    flameStop();
    setTimeout(advance, 3000);              // lv6 → done
  }
  function flameReset(){
    flameShelter=0; flameDone=false; flameSheltering=false; flameBtnHold=false;
    const ff=$("flameFill"); if(ff) ff.style.width="0%";
    const fl=$("flame"); if(fl){ fl.classList.remove("steady"); fl.style.opacity=""; }
    const fg=$("flameGauge"); if(fg){ fg.textContent=CUR.l6shelterPrefix+"0%"; fg.classList.remove("done"); }
  }
  function flameInit(){
    if(!flameBox){
      flameBox=$("flameBox");
      const ev=e=>{ e.preventDefault(); flameEval(e); };
      flameBox.addEventListener("touchstart",ev,{passive:false});
      flameBox.addEventListener("touchmove",ev,{passive:false});
      flameBox.addEventListener("touchend",e=>flameEval(e));
      const b=$("shelterBtn");
      b.addEventListener("pointerdown",()=>{ flameBtnHold=true; });
      b.addEventListener("pointerup",()=>{ flameBtnHold=false; });
      b.addEventListener("pointerleave",()=>{ flameBtnHold=false; });
    }
    if(!flameDone) flameRender();
    flameStop(); flameRaf=requestAnimationFrame(flameLoop);
  }

  /* ===== LEVEL 7 — 좌우 노 젓기(폭풍): 동행과 박자 맞춰 좌우 번갈아 ===== */
  function rowRender(){
    const pct = Math.min(100, Math.round(rowCount / rowNeed * 100));
    $("rowFill").style.width = pct + "%";
    $("oarL").classList.toggle("next", !rowDone && rowNext==='left');
    $("oarR").classList.toggle("next", !rowDone && rowNext==='right');
    const b=$("rowBoat"); if(b) b.style.transform = "translateX(" + (rowNext==='left' ? -3 : 3) + "px)";
    $("rowGauge").textContent = CUR.l7rowPrefix + pct + "%";
  }
  function rowStroke(side){
    if(rowDone || side !== rowNext) return;     // 좌우 번갈아만 인정(틀려도 벌점 없음)
    rowCount++; rowNext = side==='left' ? 'right' : 'left'; haptic(8);
    const o = side==='left' ? $("oarL") : $("oarR");
    o.classList.add("stroke"); setTimeout(()=>o.classList.remove("stroke"), 120);
    rowRender();
    if(rowCount >= rowNeed) rowComplete();
  }
  function rowComplete(){
    if(rowDone) return; rowDone=true; haptic([0,80,40,120]);
    $("oarL").classList.remove("next"); $("oarR").classList.remove("next");
    const rg=$("rowGauge"); rg.textContent = CUR.l7set; rg.classList.add("done");
    setTimeout(advance, 3000);                  // lv7 → done
  }
  function rowReset(){
    rowCount=0; rowNext='left'; rowDone=false;
    const f=$("rowFill"); if(f) f.style.width="0%";
    ["oarL","oarR"].forEach(id=>{ const o=$(id); if(o) o.classList.remove("stroke","next"); });
    const rg=$("rowGauge"); if(rg){ rg.classList.remove("done"); rowRender(); }
  }
  function rowInit(){
    if(!rowBound){
      rowBound=true;
      $("oarL").addEventListener("pointerdown",e=>{ e.preventDefault(); rowStroke('left'); });
      $("oarR").addEventListener("pointerdown",e=>{ e.preventDefault(); rowStroke('right'); });
    }
    rowRender();
  }

  /* ===== 불씨 옮기기(ember) — 등불 항구: 손 떼지 않고 *천천히* 빈 등불로. 떼면 꺼짐, 빠르면 진행 안 됨(레이트캡) ===== */
  function emberMeasure(){            // 두 등불 중심을 트랙 기준 px로 — 시작=왼 등불, 100%=오른 촛불에 딱
    const track=$("emberTrack"), from=$("emberFrom"), to=$("emberTo");
    if(!track||!from||!to) return;
    const tr=track.getBoundingClientRect(), fr=from.getBoundingClientRect(), tor=to.getBoundingClientRect();
    emberTrackLeft = tr.left;
    emberX0 = (fr.left+fr.right)/2 - tr.left;
    emberX1 = (tor.left+tor.right)/2 - tr.left;
  }
  function emberXToPct(clientX){
    if(emberX1<=emberX0) return 0;
    const fx = clientX - emberTrackLeft;
    return Math.max(0, Math.min(100, (fx - emberX0)/(emberX1 - emberX0)*100));
  }
  function emberRender(){
    const d=$("emberDot"); if(d) d.style.left = (emberX0 + (emberX1-emberX0)*emberProg/100) + "px";
    const to=$("emberTo"); if(to) to.classList.toggle("lit", emberDone);
    const g=$("emberGauge");
    if(g) g.textContent = emberDone ? curLevelText("set","emberSet") : (curLevelText("prefix","emberPrefix") + Math.round(emberProg) + "%");
  }
  function emberLoop(){
    if(!emberDone && emberCarry){
      if(emberTarget > emberProg) emberProg = Math.min(emberTarget, emberProg + 0.9);  // 천천히만 전진(레이트캡)
      else emberProg = emberTarget;                                                     // 손가락 뒤로 가면 따라 내려감
      emberRender();
      if(emberProg >= 99.5){ emberComplete(); return; }
    }
    emberRaf = requestAnimationFrame(emberLoop);
  }
  function emberStop(){ if(emberRaf){ cancelAnimationFrame(emberRaf); emberRaf=null; } }
  function emberComplete(){
    if(emberDone) return; emberDone=true; emberCarry=false; emberProg=100; haptic([0,80,40,120]);
    const d=$("emberDot"); if(d) d.classList.remove("out");
    const g=$("emberGauge"); if(g){ g.textContent = CUR.emberSet; g.classList.add("done"); }
    emberRender(); emberStop();
    setTimeout(advance, 3000);
  }
  function emberOutReset(){            // 손 떼서 꺼짐 — 처음부터(벌점 없음, 배웅에 관대)
    emberCarry=false; emberProg=0; emberTarget=0;
    const d=$("emberDot"); if(d){ d.classList.add("out");
      setTimeout(()=>{ const e=$("emberDot"); if(e && !emberDone) e.classList.remove("out"); }, 600); }
    emberRender();
    const g=$("emberGauge"); if(g) g.textContent = curLevelText("out","emberOut");   // render의 0% 덮어 꺼짐 메시지
  }
  function emberReset(){
    emberStop(); emberProg=0; emberTarget=0; emberCarry=false; emberDone=false;
    const d=$("emberDot"); if(d) d.classList.remove("out");
    const to=$("emberTo"); if(to) to.classList.remove("lit");
    const g=$("emberGauge"); if(g) g.classList.remove("done");
    emberRender();
  }
  function emberInit(){
    if(!emberBound){
      emberBound=true;
      const box=$("emberBox");
      box.addEventListener("pointerdown",e=>{ if(emberDone) return; e.preventDefault(); emberMeasure(); emberCarry=true; emberTarget=emberXToPct(e.clientX); });
      box.addEventListener("pointermove",e=>{ if(emberCarry && !emberDone){ e.preventDefault(); emberTarget=emberXToPct(e.clientX); } });
      const lift=()=>{ if(emberCarry && !emberDone && emberProg < 99.5) emberOutReset(); else emberCarry=false; };
      box.addEventListener("pointerup",lift);
      box.addEventListener("pointerleave",lift);
      box.addEventListener("pointercancel",lift);
    }
    emberMeasure(); emberReset();
    requestAnimationFrame(()=>{ emberMeasure(); if(!emberCarry && !emberDone) emberRender(); });  // 레이아웃 안정 후 재측정(초기 위치 보정)
    emberStop(); emberRaf=requestAnimationFrame(emberLoop);
  }

  /* ===== 종이배 접기(fold) — 새벽 강: 종이를 *쓸어서* 한 번씩 접는다(세 번). 단일 포인터 드래그 = 터치/마우스 공용 ===== */
  function foldRender(){
    const p=$("foldPaper");
    if(p){
      p.textContent = foldDone ? "🛶" : "📄";
      const s = foldDone ? 1 : (1 - 0.16*foldCount);
      const r = foldDone ? 0 : (foldCount*4 - 4);
      p.style.transform = "scale("+s.toFixed(2)+") rotate("+r+"deg)";
    }
    const g=$("foldGauge");
    if(g) g.textContent = foldDone ? CUR.foldSet : (CUR.foldPrefix + foldCount + "/" + foldNeed);
  }
  function foldStroke(){
    if(foldDone) return;
    foldCount++; haptic(20);
    const p=$("foldPaper"); if(p){ p.classList.add("crease"); setTimeout(()=>p.classList.remove("crease"),160); }
    foldRender();
    if(foldCount>=foldNeed) foldComplete();
  }
  function foldComplete(){
    if(foldDone) return; foldDone=true; haptic([0,80,40,120]);
    foldRender(); $("foldGauge").classList.add("done");
    setTimeout(advance, 3000);
  }
  function foldReset(){
    foldCount=0; foldDone=false; foldDrag=false;
    const p=$("foldPaper"); if(p){ p.style.transform=""; p.textContent="📄"; }
    const fg2=$("foldGauge"); if(fg2){ fg2.classList.remove("done"); foldRender(); }
  }
  function foldInit(){
    if(!foldBound){
      foldBound=true;
      const box=$("foldBox");
      box.addEventListener("pointerdown",e=>{ e.preventDefault(); foldDrag=true; foldSX=e.clientX; foldSY=e.clientY; });
      box.addEventListener("pointerup",e=>{
        if(!foldDrag) return; foldDrag=false;
        if(Math.hypot(e.clientX-foldSX, e.clientY-foldSY) > 40) foldStroke();   // 결정적 쓸기 = 한 번 접기
      });
      box.addEventListener("pointerleave",()=>{ foldDrag=false; });
    }
    foldRender();
  }

  /* ===== 나란히 젓기(rowpar) — 새벽 강: 아이와 박자 맞춰 두 노를 *동시에*. 단일 포인터=탭 폴백(같은 게이지) ===== */
  function rpRender(){
    const pct=Math.min(100, Math.round(rpCount/rpNeed*100));
    const f=$("rpFill"); if(f) f.style.width=pct+"%";
    const l=$("rpL"), r=$("rpR");
    if(l) l.classList.toggle("next", !rpDone); if(r) r.classList.toggle("next", !rpDone);
    const g=$("rpGauge"); if(g) g.textContent = CUR.rpPrefix + pct + "%";
  }
  function rpTally(){                      // 두 노가 *함께* 눌렸을 때 1스트로크(디바운스)
    if(rpDone) return;
    if(rpLeftDown && rpRightDown){
      const now=Date.now();
      if(now - rpLast > 260){
        rpLast=now; rpCount++; haptic(8);
        [$("rpL"),$("rpR")].forEach(o=>{ if(o){ o.classList.add("stroke"); setTimeout(()=>o.classList.remove("stroke"),120); } });
        rpRender();
        if(rpCount>=rpNeed) rpComplete();
      }
    }
  }
  function rpTap(){                         // 단일 포인터(데스크탑) 폴백 — 같은 게이지 공유
    if(rpDone) return;
    const now=Date.now(); if(now-rpLast<120) return; rpLast=now;
    rpCount++; haptic(8); rpRender();
    if(rpCount>=rpNeed) rpComplete();
  }
  function rpComplete(){
    if(rpDone) return; rpDone=true; haptic([0,80,40,120]);
    const l=$("rpL"), r=$("rpR"); if(l) l.classList.remove("next"); if(r) r.classList.remove("next");
    const g=$("rpGauge"); if(g){ g.textContent = CUR.rpSet; g.classList.add("done"); }
    setTimeout(advance, 3000);
  }
  function rpReset(){
    rpCount=0; rpLeftDown=false; rpRightDown=false; rpLast=0; rpDone=false;
    const f=$("rpFill"); if(f) f.style.width="0%";
    ["rpL","rpR"].forEach(id=>{ const o=$(id); if(o) o.classList.remove("stroke","next"); });
    const g=$("rpGauge"); if(g){ g.classList.remove("done"); rpRender(); }
  }
  function rpInit(){
    if(!rpBound){
      rpBound=true;
      const L=$("rpL"), R=$("rpR");
      L.addEventListener("pointerdown",e=>{ e.preventDefault(); rpLeftDown=true; rpTally(); });
      L.addEventListener("pointerup",()=>{ rpLeftDown=false; });
      L.addEventListener("pointerleave",()=>{ rpLeftDown=false; });
      R.addEventListener("pointerdown",e=>{ e.preventDefault(); rpRightDown=true; rpTally(); });
      R.addEventListener("pointerup",()=>{ rpRightDown=false; });
      R.addEventListener("pointerleave",()=>{ rpRightDown=false; });
      const fb=$("rpSyncBtn");
      if(fb){
        fb.addEventListener("pointerdown",e=>{ e.preventDefault(); rpTap(); });
        if(!('ontouchstart' in window)) fb.style.display="";   // 터치 미지원 → 탭 폴백 노출
      }
    }
    rpRender();
  }

  /* ===== 체온 나누기(warm): 떨고 있는 강아지를 길게 눌러 데움(짧은 탭=놓침) ===== */
  function warmRender(){
    $("warmFill").style.width = warmFill + "%";
    const d=$("dog"); if(d){ d.classList.toggle("warm", warmHold || warmDone); d.style.opacity=(0.55+0.45*warmFill/100).toFixed(2); }
    $("warmGauge").textContent = CUR.warmPrefix + Math.round(warmFill) + "%";
  }
  function warmLoop(){
    if(!warmDone){
      if(warmHold) warmFill=Math.min(100, warmFill+1.8);
      else         warmFill=Math.max(0, warmFill-1.0);
      warmRender();
      if(warmFill>=100){ warmComplete(); return; }
    }
    warmRaf=requestAnimationFrame(warmLoop);
  }
  function warmStop(){ if(warmRaf){ cancelAnimationFrame(warmRaf); warmRaf=null; } }
  function warmComplete(){
    if(warmDone) return; warmDone=true; warmHold=false;
    const d=$("dog"); if(d){ d.classList.add("warm"); d.style.opacity="1"; }
    const wg2=$("warmGauge"); wg2.textContent = CUR.warmSet; wg2.classList.add("done"); haptic([0,80,40,120]);
    warmStop();
    setTimeout(advance, 3000);
  }
  function warmReset(){
    warmFill=0; warmDone=false; warmHold=false;
    const f=$("warmFill"); if(f) f.style.width="0%";
    const d=$("dog"); if(d){ d.classList.remove("warm"); d.style.opacity=""; }
    const g=$("warmGauge"); if(g){ g.textContent=CUR.warmPrefix+"0%"; g.classList.remove("done"); }
  }
  function warmInit(){
    if(!warmBox){
      warmBox=$("warmBox");
      const down=e=>{ e.preventDefault(); warmHold=true; };
      const up=()=>{ warmHold=false; };
      warmBox.addEventListener("pointerdown",down);
      warmBox.addEventListener("pointerup",up);
      warmBox.addEventListener("pointerleave",up);
      warmBox.addEventListener("pointercancel",up);
    }
    if(!warmDone) warmRender();
    warmStop(); warmRaf=requestAnimationFrame(warmLoop);
  }

  /* ===== LEVEL 8 — 작별(졸업 연주): 배운 동작을 한 호흡씩, 데려다주기 코다 ===== */
  function fwShow(){
    if(fwDone) return;
    if(fwStep < CUR.l8lines.length){
      setT("l8-line", CUR.l8lines[fwStep]);
      const scenes=["🕯️","🏮","⛵","🌊"];
      const sc=$("fwScene");
      if(sc){
        sc.textContent = scenes[fwStep] || "🕯️";
        sc.style.transition="none"; sc.style.transform="translateX(0)"; sc.style.opacity="1";
        if(fwStep===1){   // 등불 건네기 — 건너편으로 천천히 흘러감
          requestAnimationFrame(()=>{ sc.style.transition="transform 1.8s ease-out, opacity 1.8s"; sc.style.transform="translateX(64px)"; sc.style.opacity=".5"; });
        }
      }
    }
  }
  /* 졸업 연주 = 끊어 누르기 ×4 ✕ → *하나의 연속된 홀드*. 누른 채로 네 동작이 흐르고, 끝에서 손을 뗀다.
     떼면 진행만 멈춤(되감김 없음 = 배웅에 관대). */
  function fwLoop(){
    if(!fwDone){
      if(fwHold) fwProgress = Math.min(100, fwProgress + 0.30);
      const seg = 100 / CUR.l8lines.length;
      const step = Math.min(CUR.l8lines.length-1, Math.floor(fwProgress / seg));
      if(step !== fwStep){ fwStep = step; haptic(25); fwShow(); }
      if(fwProgress >= 100){ fwComplete(); return; }
    }
    fwRaf = requestAnimationFrame(fwLoop);
  }
  function fwStopLoop(){ if(fwRaf){ cancelAnimationFrame(fwRaf); fwRaf=null; } }
  function fwComplete(){
    if(fwDone) return; fwDone=true; fwHold=false; haptic([0,110,60,160]);
    setT("l8-line", CUR.l8end);
    const sc=$("fwScene"); if(sc) sc.textContent = "🌅";
    const b=$("fwBtn"); if(b) b.style.display="none";
    fwStopLoop();
    setTimeout(advance, 2400);              // lv8 → done(코다)
  }
  function fwReset(){
    fwStep=0; fwDone=false; fwProgress=0; fwHold=false;
    const b=$("fwBtn"); if(b) b.style.display="";
    fwShow(); fwStopLoop();
  }
  function fwInit(){
    if(!fwBound){
      fwBound=true;
      const btn=$("fwBtn");
      const down=e=>{ e.preventDefault(); fwHold=true; };
      const up=()=>{ fwHold=false; };
      btn.addEventListener("pointerdown",down);
      btn.addEventListener("pointerup",up);
      btn.addEventListener("pointerleave",up);
      btn.addEventListener("pointercancel",up);
    }
    fwStep=0; fwProgress=0; fwHold=false;
    fwShow();
    fwStopLoop(); fwRaf=requestAnimationFrame(fwLoop);
  }

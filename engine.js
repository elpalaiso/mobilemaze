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
    setT("end-stay",endK("stay","endStay")); setCoda();
    endCardChrome();
    setT("gatePrompt",CUR.gatePrompt); setT("gateYes",CUR.gateYes); setT("gateNo",CUR.gateNo);
    $("done-body").innerHTML = endK("body","doneBody");
    document.querySelectorAll(".confirmBtn").forEach(b=>b.textContent=CUR.confirm);
    ["in1","in2","in3","in5"].forEach(id=>{ const e=$(id); if(e) e.placeholder=CUR.placeholder; });
    document.querySelectorAll(".langbar button").forEach(b=>
      b.classList.toggle("on", b.dataset.lang===lang));
    // 현재 활성 레벨 콘텐츠 재바인딩(언어 토글 반영)
    const _l=currentLevel();
    if(_l && TRICKS[_l.trick] && TRICKS[_l.trick].bind) TRICKS[_l.trick].bind(_l);
    const _hub=$("hub"); if(_hub && _hub.style.display!=="none") buildHub();   // 허브 열려있으면 카드도 새 언어로
    const _bk=$("book"); if(_bk && _bk.style.display!=="none") renderBook(false);   // 책 열려있으면 내용·버튼도 새 언어로
  }
  document.querySelectorAll(".langbar button").forEach(b=>
    b.addEventListener("click",()=>applyLang(b.dataset.lang)));

  /* ===== 정답 확인 (정답은 현재 언어 사전에서) ===== */
  const norm = s => (s||"").trim().toLowerCase();
  function cyrb53(str, seed=0){ let h1=0xdeadbeef^seed,h2=0x41c6ce57^seed;
    for(let i=0,c;i<str.length;i++){c=str.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677);}
    h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);
    h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
    return 4294967296*(2097151&h2)+(h1>>>0); }
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
    const lvl = currentLevel();
    const v = norm($(inId).value);
    const m = $(msgId);
    const lang = document.documentElement.lang || "ko";
    const h = lvl && lvl.ansHash ? (typeof lvl.ansHash==="object" ? (lvl.ansHash[lang] || lvl.ansHash.ko || lvl.ansHash.en) : lvl.ansHash) : null;
    const target = (!h && lvl && lvl.ans) ? CUR[lvl.ans] : "";   // 정답 = 현재 시나리오 레벨의 매니페스트 키
    if((h && cyrb53(v) === h) || (target && v === norm(target))){
      m.className="msg ok"; m.textContent=CUR.ok; haptic(20);
      setTimeout(advance, 600);
    } else {
      m.className="msg bad"; m.textContent=CUR.bad;
      hintFail();
    }
  }

  /* ===== 진행/네비 — 현재 레벨 기준(정답 인덱스와 분리) ===== */
  const SAVE_KEY="mobilemaze.progress";
  const RUN = { scenario: SCENARIOS.tutorial };               // 현재 진행 중 시나리오
  let ORDER = RUN.scenario.levels.map(l=>l.sec).concat("done");  // 시나리오 전환 시 startScenario가 갱신
  /* 트릭 registry — 트릭별 init/cleanup 계약(향후 reset/fallback/hint도 이리로) */
  const TRICKS = {   // inc2: 콘텐츠는 매니페스트 text 키 → bind 가 템플릿에 주입(시나리오 재사용 가능)
    press:    { reset:pressReset, bind:(lv)=>{ const t=lv.text||{};
      setT("l1-tag",CUR[t.tag]); setT("l1-riddle",CUR[t.riddle]); setT("l1-press",CUR[t.press]);
      setT("l1-reveal",CUR[t.reveal]); setT("l1-hint",CUR[t.hint]); } },
    pinch:    { reset:pinchReset, bind:(lv)=>{ const t=lv.text||{};
      setT("l2-tag",CUR[t.tag]); setT("l2-riddle",CUR[t.riddle]); setT("l2-before",CUR[t.before]);
      setT("l2-tiny",CUR[t.tiny]); setT("l2-after",CUR[t.after]); setT("l2-hint",CUR[t.hint]); } },
    tilt:     { init:tiltInit, reset:tiltReset, bind:(lv)=>{ const t=lv.text||{};
      setT("l3-tag",CUR[t.tag]); setT("l3-riddle",CUR[t.riddle]); setT("l3-secret",CUR[t.secret]);
      setT("l3-hint",CUR[t.hint]); setT("l3-fallback-hint",CUR[t.fbhint]); } },
    blow:     { cleanup:stopMic, reset:blowReset, bind:(lv)=>{ const t=lv.text||{};
      setT("l4-tag",CUR[t.tag]); setT("l4-riddle",CUR[t.riddle]); setT("l4-hint",CUR[t.hint]); } },
    route:    { init:routeInit, reset:routeReset, bind:(lv)=>{ const t=lv.text||{};
      setT("l5-tag",CUR[t.tag]); setT("l5-riddle",CUR[t.riddle]); setT("l5-hint",CUR[t.hint]); setT("l5-reveal",CUR[t.reveal]); } },
    holdfast: { init:holdfastInit, cleanup:holdfastCleanup, reset:holdfastReset, bind:(lv)=>{ const t=lv.text||{};
      holdfastLevel=lv; holdfastReset(); setT("hold-tag",CUR[t.tag]); setT("hold-riddle",CUR[t.riddle]); setT("hold-hint",CUR[t.hint]);
      setT("holdPadLabel",CUR.holdPadLabel); setT("holdLockLabel",CUR.holdLockLabel); setT("holdGauge",CUR.holdPrefix+"0%");
      setT("hold-reveal",CUR[t.reveal]); } },
    tightrope:{ init:tightropeInit, cleanup:tightropeCleanup, reset:tightropeReset, bind:(lv)=>{ const t=lv.text||{};
      tightropeLevel=lv; tightropeReset(); setT("rope-tag",CUR[t.tag]); setT("rope-riddle",CUR[t.riddle]); setT("rope-hint",CUR[t.hint]);
      setT("ropeSensorBtn",CUR.ropeSensorBtn); setT("ropeLeftBtn",CUR.ropeLeftBtn); setT("ropeRightBtn",CUR.ropeRightBtn);
      setT("ropeGauge",CUR.ropePrefix+"0/"+ROPE_PTS.length); setT("rope-reveal",CUR[t.reveal]); } },
    stardust: { init:stardustInit, cleanup:stardustCleanup, reset:stardustReset, bind:(lv)=>{ const t=lv.text||{};
      starLevel=lv; stardustReset(); setT("star-tag",CUR[t.tag]); setT("star-riddle",CUR[t.riddle]); setT("star-hint",CUR[t.hint]);
      setT("starShakeBtn",CUR.starShakeBtn); setT("starShakeFb",CUR.starShakeFb); setT("starGauge",CUR.starPrefix+"0%"); setT("star-reveal",CUR[t.reveal]); } },
    twist:    { init:twistInit, cleanup:twistCleanup, reset:twistReset, bind:(lv)=>{ const t=lv.text||{};
      twistReset(); setT("dial-tag",CUR[t.tag]); setT("dial-riddle",CUR[t.riddle]); setT("dial-hint",CUR[t.hint]);
      setT("dialGauge",CUR.dialPrefix+"0%"); setT("dial-reveal",CUR[t.reveal]); } },
    gate:     { init:gateInit, cleanup:gateCleanup, reset:gateReset, bind:(lv)=>{ const t=lv.text||{};
      gateTarget=lv.gateTarget||0; gateReset();
      setT("gate-tag",CUR[t.tag]); setT("gate-riddle",CUR[t.riddle]); setT("gate-hint",CUR[t.hint]); setT("gate-reveal",CUR[t.reveal]); } },
    tide:     { init:tideInit, cleanup:tideStop, reset:tideReset, bind:(lv)=>{ const t=lv.text||{};
      tideReset(); setT("tide-tag",CUR[t.tag]); setT("tide-riddle",CUR[t.riddle]); setT("tide-hint",CUR[t.hint]);
      setT("tideBtn",CUR.tideBtn); setT("tideFb",CUR.tideFb); setT("tide-reveal",CUR[t.reveal]); } },
    flame:    { init:flameInit, cleanup:flameStop, reset:flameReset, bind:(lv)=>{ const t=lv.text||{};
      setT("l6-tag",CUR[t.tag]); setT("l6-riddle",CUR[t.riddle]); setT("l6-hint",CUR[t.hint]); } },
    row:      { init:rowInit, reset:rowReset, bind:(lv)=>{ const t=lv.text||{};
      setT("l7-tag",CUR[t.tag]); setT("l7-riddle",CUR[t.riddle]); setT("l7-hint",CUR[t.hint]); } },
    rowpar:   { init:rpInit, reset:rpReset, bind:(lv)=>{ const t=lv.text||{};
      setT("rp-tag",CUR[t.tag]); setT("rp-riddle",CUR[t.riddle]); setT("rp-hint",CUR[t.hint]); } },
    fold:     { init:foldInit, reset:foldReset, bind:(lv)=>{ const t=lv.text||{};
      setT("fold-tag",CUR[t.tag]); setT("fold-riddle",CUR[t.riddle]); setT("fold-hint",CUR[t.hint]); } },
    ember:    { init:emberInit, cleanup:emberStop, reset:emberReset, bind:(lv)=>{ const t=lv.text||{};
      setT("ember-tag",CUR[t.tag]); setT("ember-riddle",CUR[t.riddle]); setT("ember-hint",CUR[t.hint]); } },
    farewell: { init:fwInit, cleanup:fwStopLoop, reset:fwReset, bind:(lv)=>{ const t=lv.text||{};
      setT("l8-tag",CUR[t.tag]); setT("l8-hint",CUR[t.hint]); } },
    warm:     { init:warmInit, cleanup:warmStop, reset:warmReset, bind:(lv)=>{ const t=lv.text||{};
      setT("warm-tag",CUR[t.tag]); setT("warm-riddle",CUR[t.riddle]); setT("warm-hint",CUR[t.hint]); } },
    road:     { init:roadInit, reset:roadReset, bind:(lv)=>{ const t=lv.text||{};
      setT("road-tag",CUR[t.tag]); setT("road-riddle",CUR[t.riddle]); setT("road-hint",CUR[t.hint]); setT("road-reveal",CUR[t.reveal]); } },
    erase:    { init:eraseInit, reset:eraseReset, bind:(lv)=>{ const t=lv.text||{};
      setT("erase-tag",CUR[t.tag]); setT("erase-riddle",CUR[t.riddle]); setT("erase-hint",CUR[t.hint]); setT("erase-reveal",CUR[t.reveal]); } },
  };
  function trickOf(sec){ const l=RUN.scenario.levels.find(x=>x.sec===sec); return l ? TRICKS[l.trick] : null; }
  let curIdx = 0;
  function currentLevel(){ return RUN.scenario.levels[curIdx] || null; }
  function show(idx){
    idx=Math.max(0,Math.min(idx,ORDER.length-1));
    const pt=trickOf(ORDER[curIdx]); if(pt && pt.cleanup) pt.cleanup();   // 떠나는 트릭 정리(registry)
    curIdx = idx;
    document.querySelectorAll(".level").forEach(el=>el.classList.remove("active"));
    const _lv=$(ORDER[idx]); _lv.classList.add("active");
    _lv.style.opacity="0"; requestAnimationFrame(()=>{ _lv.style.transition="opacity .35s ease"; _lv.style.opacity="1"; });
    document.querySelectorAll("#dots i").forEach((d,k)=>d.classList.toggle("on", k<idx));
    window.scrollTo(0,0);
    const lvl=RUN.scenario.levels[idx] || null;            // 콘텐츠 바인딩 + 트릭 준비(registry)
    const nt=lvl ? TRICKS[lvl.trick] : null;
    if(nt && nt.reset) nt.reset();
    if(nt){ if(nt.bind) nt.bind(lvl); if(nt.init) nt.init(); }
    setupHint(lvl);
    const _st=scenarioState(); _st.step=idx; if(ORDER[idx]==="done") _st.cleared=true; persist();
    if(ORDER[idx]==="done") runEnding(); else resetEnding();
  }
  /* ===== 엔딩 3박 연출: 도착 → (hold) → 잔류 비트 → (hold) → 공유 카드 ===== */
  /* 엔딩 카피는 시나리오별(매니페스트 ending) → 없으면 글로벌 폴백. 잔류 항상성 라인·공유 카드는 불변(글로벌). */
  let endingTimers=[];
  let bookSeries=null;   // 현재 책 뷰의 시리즈
  let bookStory=null;    // 현재 책 뷰가 보여주는 단편(시리즈당 1+개)
  let fromStory=false;   // 곁가지 매듭을 소설(book)에서 실행했는가 → 엔딩 카드가 이야기로 복귀
  let lastKnotScid=null; // 직전 실행한 매듭 시나리오 id(복귀 시 그 자리로 스크롤)
  let lastKnotStory=null;// 그 매듭이 속한 단편(복귀 시 그 책으로)
  let seqLines=null, seqIdx=0, seqTimer=null, seqFinished=false, seqTapBound=false;   // 긴 엔딩 시퀀스
  function endK(name, fb){ const e=RUN.scenario && RUN.scenario.ending; return (e && e[name]) ? CUR[e[name]] : CUR[fb]; }
  /* 현재 레벨의 매니페스트 text 오버라이드(없으면 글로벌 폴백) — 트릭 메시지 시나리오별화 */
  function curLevelText(name, fb){ const lvl=currentLevel(); const t=lvl&&lvl.text; return (t && t[name]) ? CUR[t[name]] : CUR[fb]; }
  function setCoda(){ const cd=$("end-coda"); if(!cd) return; const e=RUN.scenario && RUN.scenario.ending; cd.textContent = (e && e.coda) ? CUR[e.coda] : ""; }
  /* 엔딩 카드 하단: 시리즈별 오버라이드. 측량가=공유 버튼 숨김 + 측량가 카피 + "이야기로 돌아가기". */
  function endCardChrome(){
    const mem = RUN.scenario && RUN.scenario.series==="memory";
    setT("share-title", mem?CUR.memShareTitle:CUR.shareTitle);
    setT("share-body",  mem?CUR.memShareBody :CUR.shareBody);
    const sb=$("shareBtn"); if(sb){ sb.textContent=CUR.shareBtn; sb.style.display = mem?"none":""; }
    setT("backHarborBtn", fromStory?CUR.backToStory:CUR.backToHarbor);   // 매듭(소설서 옴)=이야기로, 그 외=항구로
  }
  function seqClearTimer(){ if(seqTimer){ clearTimeout(seqTimer); seqTimer=null; } }
  function resetEnding(){
    endingTimers.forEach(t=>clearTimeout(t)); endingTimers=[];
    seqClearTimer(); seqLines=null; seqIdx=0; seqFinished=false;
    const s=$("endStayBeat"), c=$("endCard");
    if(s) s.classList.remove("in"); if(c) c.classList.remove("in");
    const sq=$("endSeq"); if(sq) sq.innerHTML="";
  }
  function seqAppend(line){   // 한 줄 추가 + 페이드인
    const seqEl=$("endSeq"); if(!seqEl) return;
    const p=document.createElement("p"); p.className="seq-line"; p.textContent=line;
    seqEl.appendChild(p);
    requestAnimationFrame(()=>{ p.classList.add("in"); try{ p.scrollIntoView({behavior:"smooth", block:"nearest"}); }catch(e){} });
  }
  function seqRun(){      // 단편소설처럼 *쫙* — 빠른 캐스케이드로 줄줄이 흘러내림
    seqClearTimer();
    const seqEl=$("endSeq"); if(!seqLines || !seqEl) return;
    if(seqIdx >= seqLines.length){ seqFinish(); return; }
    seqAppend(seqLines[seqIdx]); seqIdx++;
    if(seqIdx < seqLines.length) seqTimer=setTimeout(seqRun, 130);   // 쫙(빠른 촤르륵)
    else seqTimer=setTimeout(seqFinish, 600);
  }
  function seqRevealAll(){   // 탭 = 남은 줄 즉시 다 + 마무리
    seqClearTimer();
    if(!seqLines) return;
    while(seqIdx < seqLines.length){ seqAppend(seqLines[seqIdx]); seqIdx++; }
    seqFinish();
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
    setT("end-stay",endK("stay","endStay"));   // 시리즈별 잔류 라인(ending.stay) → 없으면 글로벌 폴백
    endCardChrome();                            // 카드 하단 시리즈별(측량가 vs 뱃사공)
    const e=RUN.scenario && RUN.scenario.ending;
    const seqArr = (e && e.seqKey && Array.isArray(CUR[e.seqKey])) ? CUR[e.seqKey] : null;
    const seqEl=$("endSeq");
    if(seqArr && seqEl){
      // 긴 엔딩: 한 줄씩 *쌓이며* 등장. 화면 탭하면 다음 줄 즉시(성격 급한 사람용).
      seqLines=seqArr; seqIdx=0; seqFinished=false;
      if(!seqTapBound){ seqTapBound=true; const dn=$("done"); if(dn) dn.addEventListener("click",ev=>{
        if(ev.target.closest("#endCard")) return;        // 카드 버튼은 그대로
        if(seqLines && !seqFinished) seqRevealAll();       // 탭 = 남은 줄 즉시 다
      }); }
      endingTimers.push(setTimeout(seqRun, 800));          // 도착 후 곧 시작
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
  function startScenario(id, fresh){
    fromStory=false;          // 기본은 허브 경유 — openKnot가 호출 후 true로 덮음
    stopMic(); flameStop(); holdfastCleanup(); warmStop(); fwStopLoop(); emberStop();    // 이전 시나리오 루프 정리(방어)
    RUN.scenario = SCENARIOS[id] || SCENARIOS.tutorial;
    ORDER = RUN.scenario.levels.map(l=>l.sec).concat("done");
    buildDots();
    resetLevels();            // 트릭 전역 상태 0으로 — 시나리오 간 공유 트릭(row 등) 오염 방지
    show(fresh ? 0 : loadProgress());   // 매듭은 항상 트릭부터(fresh)
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
                  : (curView==="book") ? ((bookStory && CUR[bookStory.titleKey]) || CUR.title)
                  : CUR.title;
  }
  function knotCount(scid){   // 매듭(단일 레벨) 진행 — 항해 카드와 동일 (done/total)
    const sc=SCENARIOS[scid], st=SAVE.scenarios[scid]||{};
    const total=sc?sc.levels.length:1, done=Math.min(st.step||0,total);
    return { done, total, cleared:!!st.cleared };
  }
  function isUnlocked(scid){ const sc=SCENARIOS[scid]; if(!sc||!sc.gate) return true;
    const own=SAVE.scenarios[scid];
    if(own && (own.cleared || own.step>0)) return true;   // 새 층이 앞에 끼어도 이미 진행한 층은 다시 안 잠김
    const series=sc.series && SERIES[sc.series], ids=(series&&series.scenarios)||[], at=ids.indexOf(scid);
    if(at>=0 && ids.slice(at+1).some(id=>{ const st=SAVE.scenarios[id]; return st && (st.cleared || st.step>0); })) return true;
    return !!(SAVE.scenarios[sc.gate] && SAVE.scenarios[sc.gate].cleared); }
  function buildHub(){
    const list=$("hubList"); if(!list) return;
    setT("hubTitle", CUR.hubTitle);
    list.innerHTML="";
    // 시리즈별 섹션: 헤더 + 그 항해 카드들 + 그 시리즈의 단편(📖). 각 시리즈가 독립 확장.
    Object.values(SERIES).forEach(series=>{
      const head=document.createElement("div"); head.className="series-head";
      head.textContent=CUR[series.titleKey]||series.id; list.appendChild(head);
      if(series.quiz){
        const ids=series.scenarios||[], cleared=ids.filter(id=>SAVE.scenarios[id]&&SAVE.scenarios[id].cleared).length;
        const prog=document.createElement("div"); prog.className="tower-progress"; prog.textContent=(CUR.towerProgress||"Current")+" "+cleared+" / "+ids.length; list.appendChild(prog);
      }
      (series.scenarios||[]).forEach(scid=>{
        const sc=SCENARIOS[scid]; if(!sc) return;
        const st=SAVE.scenarios[sc.id]||{};
        const card=document.createElement("button"); card.className="hubcard";
        const locked=!isUnlocked(sc.id), tower=series.quiz;
        const total=sc.levels.length, done=Math.min(st.step||0, total);   // step=완료 레벨 수
        if(tower) card.classList.add("tower-card", locked?"locked":(st.cleared?"cleared":"current"));
        card.innerHTML=(locked?"🔒 ":(st.cleared?(tower?"✓ ":"🟡 "):(tower?"✦ ":"🕯️ ")))+(CUR[sc.titleKey]||sc.id)+
          ' <span class="hubcount'+(done>=total&&total>0?' full':'')+'">('+done+'/'+total+')</span>';
        if(locked) card.disabled=true; else card.addEventListener("click",()=>{ startScenario(sc.id); showView("play"); });
        list.appendChild(card);
      });
      // 그 시리즈의 단편들(각 📖 + 하위 매듭 들여쓰기). 소설-먼저 = 항해는 매듭으로만.
      if(series.quiz) return;
      (series.stories||[]).forEach((story, si)=>{
        if(!CUR[story.textKey]) return;
        const keys = story.knots ? Object.keys(story.knots) : [];
        const knotsDone = keys.filter(k=>{ const st=SAVE.scenarios[story.knots[k].scid]; return st && st.cleared; }).length;
        const book=document.createElement("button"); book.className="hubcard bookcard";
        book.innerHTML="📖 "+(CUR[story.titleKey]||"")+' <span class="hubcount story">'+(CUR[story.tagKey]||"")+'</span>'+
          (keys.length?' <span class="hubcount'+(knotsDone>=keys.length?' full':'')+'">('+knotsDone+'/'+keys.length+')</span>':'');
        book.addEventListener("click",()=>openBook(series.id, si));
        list.appendChild(book);
        // 단편 하위로 매듭 트릭 들여쓰기(구조 가시화 + 직접 점프 + 완료/개수)
        keys.forEach(key=>{
          const k=story.knots[key], sc=SCENARIOS[k.scid]; if(!sc) return;
          const c=knotCount(k.scid);
          const sub=document.createElement("button"); sub.className="hubcard knotsub";
          sub.innerHTML='<span class="knotbranch">└</span> '+(c.cleared?"✓ ":"")+(CUR[k.label]||key)+
            ' <span class="hubcount'+(c.done>=c.total?' full':'')+'">('+c.done+'/'+c.total+')</span>';
          sub.addEventListener("click",()=>openKnot(k.scid, story));   // 허브서 실행해도 끝나면 소설로 복귀
          list.appendChild(sub);
        });
      });
    });
  }
  function renderBook(cascade){      // cascade=true 펼치는 연출 / false 즉시(언어 토글·복귀 재렌더)
    const page=$("bookPage");
    const story = bookStory || (SERIES.boatman.stories && SERIES.boatman.stories[0]);
    if(page && story){
      page.innerHTML="";
      const paras = CUR[story.textKey] || (I18N.ko && I18N.ko[story.textKey]) || [];
      const knotM = story.knots || {};
      paras.forEach((para,i)=>{
        let el;
        const km = (typeof para==="string") && para.match(/^⟦KNOT:(\w+)⟧$/);
        if(km && knotM[km[1]]){
          // 인라인 매듭 — 소설 본문서 트릭 실행 버튼
          const k=knotM[km[1]], scid=k.scid;
          el=document.createElement("button"); el.className="knot-btn"; el.id="knot-"+scid;
          const c = knotCount(scid);
          el.innerHTML = (c.cleared?"✓ ":"▶ ")+(CUR[k.label]||km[1])+
            ' <span class="hubcount'+(c.done>=c.total?' full':'')+'">('+c.done+'/'+c.total+')</span>';
          if(c.cleared) el.classList.add("done");
          el.addEventListener("click",()=>openKnot(scid, story));
        } else {
          const sep=(para==="✶");
          el=document.createElement(sep?"div":"p");
          el.className = sep ? "book-sep" : "book-para";
          el.textContent = para;
        }
        if(cascade){ el.style.opacity="0"; setTimeout(()=>{ el.style.transition="opacity .35s ease"; el.style.opacity="1"; }, 70*i); }  // 펼치면 촤르륵
        page.appendChild(el);
      });
    }
    setT("bookBack", CUR.backToHarbor);
  }
  function openBook(seriesId, storyIdx){
    bookSeries = SERIES[seriesId] || SERIES.boatman;
    bookStory = (bookSeries.stories||[])[storyIdx||0] || (bookSeries.stories||[])[0];
    renderBook(true); window.scrollTo(0,0); showView("book");
  }
  /* 매듭(곁가지) 실행 — 완료된 매듭은 엔딩카드부터(트릭 강제반복 X), 미완은 트릭부터.
     허브/소설 어디서 들어오든 *끝나면 늘 그 단편의 그 자리로* 복귀. */
  function openKnot(scid, story){ if(!SCENARIOS[scid]) return;
    lastKnotScid=scid; lastKnotStory = story || bookStory;
    const done = SAVE.scenarios[scid] && SAVE.scenarios[scid].cleared;
    startScenario(scid, !done); fromStory=true; window.scrollTo(0,0); showView("play"); }
  /* 매듭 끝나고 소설로 — 그 단편 즉시 재렌더 후 *그 매듭 자리*로 스크롤(처음으로 안 튐) */
  function returnToStory(){
    if(lastKnotStory) bookStory=lastKnotStory;
    renderBook(false); showView("book");
    const el = lastKnotScid && $("knot-"+lastKnotScid);
    if(el){ requestAnimationFrame(()=>{ try{ el.scrollIntoView({block:"center"}); }catch(e){ window.scrollTo(0,0); } }); }
    else window.scrollTo(0,0);
  }

  /* ===== L4/L5 상태 — show()/resetLevels보다 먼저 선언(TDZ 방지) ===== */
  let audioCtx=null, micStream=null, micRaf=null, sailDone=false, oarFill=0;
  let routeCanvas=null, routeCtx=null, routeStars=[], routeStroke=[], routeDrawing=false, routeDone=false;
  let holdfastLevel=null, holdCanvas=null, holdCtx=null, holdPad=null, holdLockBtn=null, holdGauge=null, holdStars=[], holdStroke=[], holdDone=false;
  let holdActive=false, holdLocked=false, holdId=null, holdDrawId=null, holdRaf=null, holdBound=false, holdListeners=[];
  let tightropeLevel=null, ropeCanvas=null, ropeCtx=null, ropeGauge=null, ropeFill=null, ropeFallback=null;
  let ropeStars=[], ropeNext=0, ropeTapFlash=null, ropeCompleteDone=false, ropeRaf=null, ropeBound=false, ropeListeners=[];
  let ropeX=0, ropeV=0, ropeTilt=0, ropeFallbackDir=0, ropeFallMs=0, ropeLastTs=0, ropeGotEvent=false, ropeTimer=null, ropeLastDrift=1, ropeBaseline=0;
  const ROPE_PTS = [ {x:0.12,y:0.72},{x:0.29,y:0.42},{x:0.48,y:0.56},{x:0.67,y:0.34},{x:0.88,y:0.62} ];  // A6 — tightropeReset가 init때 읽으므로 resetLevels보다 먼저 선언(TDZ 방지)
  let starLevel=null, starCanvas=null, starCtx=null, starDots=[], starStroke=[], starDrawing=false, starDone=false, starConverged=false, starShakeE=0, starBound=false, starListeners=[], starGotMotion=false, starLastMag=0, starMotionTimer=null;  // A2 별가루(shake)
  const STAR_TARGET = [ {x:0.18,y:0.66},{x:0.36,y:0.30},{x:0.54,y:0.58},{x:0.72,y:0.30},{x:0.86,y:0.62} ];  // A2 별자리 목표 — stardustReset가 init때 읽음(resetLevels보다 먼저, TDZ)
  const STAR_SHAKE_NEED = 6;     // A2 수렴까지 필요한 흔들기 누적 — 키우면 더 많이 흔들어야(빡셈)
  const STAR_HIT_R = 24;         // A2 별 잇기 인식 반경(px)
  const STAR_SCATTER = 0.42;     // A2 초기 산포 — stardustReset(init)가 읽으므로 반드시 resetLevels보다 먼저(TDZ)
  let dialCanvas=null, dialCtx=null, dialAngle=0, dialTarget=0, dialHoldMs=0, dialDone=false, dialRaf=null, dialBound=false, dialListeners=[], dialPtrs=new Map(), dialLastAng=null, dialLastTs=0;  // A3 톱니(twist)
  const TWIST_TARGET=140, TWIST_TOL=12, TWIST_HOLD_MS=800;  // A3 — twistReset(init)가 TWIST_TARGET 읽음 → 상단(TDZ 방지)
  let gateTarget=0, gatePressIdx=-1, gatePressStart=0, gateRaf=null, gateDone=false, gateBound=false;  // A1 문간(gate)
  const GATE_HOLD_MS=650;  // A1 정답 패드 길게누르기 시간
  let tideCtx=null, tideStream=null, tideRaf=null, tideLevel=0, tideHold=0, tideDone=false, tideBound=false, tideFallback=false, tideFallbackHold=false, tideLastTs=0;  // A5 물때(tide)
  const TIDE_LOW=42, TIDE_HIGH=70, TIDE_HOLD_MS=2600;  // A5 — tideReset/init가 읽으므로 resetLevels보다 먼저(TDZ 방지)
  let flameShelter=0, flameDone=false, flameSheltering=false, flameBtnHold=false, flameRaf=null, flameBox=null, flameGain=2.0;
  let rowCount=0, rowNeed=12, rowNext='left', rowDone=false, rowBound=false;
  let rpCount=0, rpNeed=10, rpLeftDown=false, rpRightDown=false, rpLast=0, rpDone=false, rpBound=false;
  let foldCount=0, foldNeed=3, foldDone=false, foldBound=false, foldSX=0, foldSY=0, foldDrag=false;
  let revealAdv=false, revealTimer=null;   // L1/L3/L5 자동진행 — resetLevels보다 먼저 선언(TDZ 방지)
  let emberProg=0, emberTarget=0, emberCarry=false, emberDone=false, emberBound=false, emberRaf=null;  // 불씨 옮기기
  let emberTrackLeft=0, emberX0=0, emberX1=0;   // 두 등불 중심(트랙 기준 px)
  let roadCanvas=null, roadCtx=null, roadPts=[], roadHit=0, roadStroke=[], roadDrawing=false, roadDone=false, roadBound=false;  // 길 그리기(측량가)
  let eraseCanvas=null, eraseCtx=null, erasePts=[], eraseGone=0, eraseDrawing=false, eraseDone=false, eraseBound=false;  // 되짚어 지우기(측량가)
  let warmFill=0, warmDone=false, warmHold=false, warmRaf=null, warmBox=null;
  let tiltGotEvent=false, tiltBound=false, tiltTimer=null;
  let fwStep=0, fwDone=false, fwBound=false, fwProgress=0, fwHold=false, fwRaf=null;
  let hintTimer=null, hintFails=0, hintStep=0, hintLevel=null, pressNeed=600;

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
    holdfastReset();                                  // A4
    tightropeReset();                                 // A6
    stardustReset();                                  // A2
    twistReset();                                     // A3
    gateReset();                                      // A1
    tideReset();                                      // A5
    flameReset();                                     // L6
    rowReset();                                       // L7
    rpReset();                                        // 나란히 젓기(새벽 강)
    foldReset();                                      // 종이배 접기(새벽 강)
    emberReset();                                     // 불씨 옮기기(등불 항구)
    roadReset();                                      // 길 그리기(작별 매듭)
    eraseReset();                                     // 되짚어 지우기(망각 매듭)
    warmReset();                                      // 체온 나누기
    fwReset();                                         // L8 작별
    ["in1","in2","in3","in5"].forEach(id=>{ const e=$(id); if(e) e.value=""; });
    ["msg1","msg2","msg3","msg5"].forEach(id=>{ const e=$(id); if(e){ e.textContent=""; e.className="msg"; } });
  }

  function levelOpt(name, fb){ const l=currentLevel(); return (l && l[name]) || fb; }
  function pressReset(){ pressNeed=levelOpt("pressMs",600); const b=$("pressBox"); if(b) b.classList.remove("lit"); revealCancel(); }
  function pinchReset(){ const e=$("in2"), m=$("msg2"); if(e) e.value=""; if(m){ m.textContent=""; m.className="msg"; } }
  function tiltReset(){ const b=$("tiltBox"); if(b) b.classList.remove("show"); const g=$("gauge"); if(g) g.textContent=CUR.gaugeInit; revealCancel(); }
  function blowReset(){ stopMic(); sailDone=false; oarFill=0; setSail(0,0); $("windBtn").style.display=""; $("oarBtn").style.display="none"; }
  function clearHintUI(){
    const old=document.querySelector(".hintbox"); if(old) old.remove();
    if(hintTimer){ clearTimeout(hintTimer); hintTimer=null; }
  }
  function setupHint(lvl){
    clearHintUI(); hintFails=0; hintStep=0; hintLevel=lvl;
    if(!lvl || !lvl.hints) return;
    hintTimer=setTimeout(showHintButton,60000);
  }
  function hintFail(){ hintFails++; if(hintFails>=3) showHintButton(); }
  function showHintButton(){
    if(!hintLevel || !hintLevel.hints || document.querySelector(".hintbox")) return;
    const lv=$(ORDER[curIdx]); if(!lv) return;
    const box=document.createElement("div"); box.className="hintbox";
    const btn=document.createElement("button"); btn.className="hint-reveal"; btn.textContent=CUR.hintCta||"Hint";
    const text=document.createElement("div"); text.className="hint-detail";
    btn.addEventListener("click",()=>{ const keys=hintLevel.hints||[]; if(hintStep<keys.length) text.textContent=CUR[keys[hintStep++]]||""; });
    box.appendChild(btn); box.appendChild(text); lv.appendChild(box);
  }

  /* ===== 초기화 ===== */
  applyLang(detectLang());
  startScenario("tutorial");
  if(!SAVE.seenTutorial){ showView("gate"); } else { buildHub(); showView("hub"); }   // 첫 방문=게이트, 기존=항구
  $("menuBtn").addEventListener("click",()=>{
    if($("hub").style.display!=="none"){ showView("play"); }   // 이미 열림 → 닫고 플레이로(토글)
    else { buildHub(); showView("hub"); }
  });
  $("gateYes").addEventListener("click",()=>{ SAVE.seenTutorial=true; persist(); openBook("boatman",0); });   // 「손을 배우는 밤」부터(튜토리얼 매듭 포함)
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
  { const bb=$("backHarborBtn"); if(bb) bb.addEventListener("click",()=>{
      if(fromStory){ fromStory=false; returnToStory(); }   // 소설 매듭 → 이야기의 그 자리로 복귀
      else { buildHub(); showView("hub"); }
    }); }

  /* 제스처로 답이 드러나는 레벨(L1/L3/L5)은 타이핑 없이 — 드러나면 3초 여운 후 자동 진행 (상태는 상단 선언) */
  function revealAdvance(){ if(revealAdv) return; revealAdv=true; revealTimer=setTimeout(()=>{ revealAdv=false; revealTimer=null; advance(); }, 3000); }
  function revealCancel(){ if(revealTimer){ clearTimeout(revealTimer); revealTimer=null; } revealAdv=false; }

  /* ===== LEVEL 1 — 길게 누르기(600ms) ===== */
  (function(){
    const box=$("pressBox"); let t=null;
    const start=e=>{ t=setTimeout(()=>{ box.classList.add("lit"); haptic(20); revealAdvance(); },pressNeed); };
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

  /* ===== A4 — 버팀(Holdfast): 닻을 유지하는 동안만 별길이 머문다 ===== */
  const HOLD_DECAY = 1.35;
  const HOLD_MIN_STROKE = 2;
  function holdfastInit(){
    holdCanvas=$("holdCanvas"); holdPad=$("holdPad"); holdLockBtn=$("holdLockBtn"); holdGauge=$("holdGauge");
    if(!holdCanvas || !holdPad || !holdLockBtn) return;
    holdCtx=holdCanvas.getContext("2d");
    if(!holdBound){
      const on=(el,type,fn,opt)=>{ el.addEventListener(type,fn,opt); holdListeners.push([el,type,fn,opt]); };
      const padDown=e=>{
        e.preventDefault();
        if(holdId===null){ holdId=e.pointerId; holdActive=true; try{ holdPad.setPointerCapture(e.pointerId); }catch(_){} holdRender(); }
      };
      const padEnd=e=>{
        if(e.pointerId===holdId){ holdId=null; holdActive=false; try{ holdPad.releasePointerCapture(e.pointerId); }catch(_){} holdRender(); }
      };
      const canvasDown=e=>{
        if(holdDone || holdDrawId!==null) return;
        e.preventDefault(); holdDrawId=e.pointerId; try{ holdCanvas.setPointerCapture(e.pointerId); }catch(_){}
        holdAdd(e);
      };
      const canvasMove=e=>{ if(e.pointerId===holdDrawId){ e.preventDefault(); holdAdd(e); } };
      const canvasEnd=e=>{
        if(e.pointerId===holdDrawId){ holdDrawId=null; try{ holdCanvas.releasePointerCapture(e.pointerId); }catch(_){} }
      };
      const lock=e=>{ e.preventDefault(); holdLocked=!holdLocked; holdRender(); };
      on(holdPad,"pointerdown",padDown);
      on(holdPad,"pointerup",padEnd); on(holdPad,"pointercancel",padEnd); on(holdPad,"lostpointercapture",padEnd);
      on(holdCanvas,"pointerdown",canvasDown);
      on(holdCanvas,"pointermove",canvasMove);
      on(holdCanvas,"pointerup",canvasEnd); on(holdCanvas,"pointercancel",canvasEnd); on(holdCanvas,"lostpointercapture",canvasEnd);
      on(holdLockBtn,"click",lock);
      holdBound=true;
    }
    holdSize(); holdRender(); holdfastStop(); holdRaf=requestAnimationFrame(holdLoop);
  }
  function holdfastStop(){ if(holdRaf){ cancelAnimationFrame(holdRaf); holdRaf=null; } }
  function holdfastCleanup(){
    holdfastStop();
    holdListeners.forEach(([el,type,fn,opt])=>el.removeEventListener(type,fn,opt));
    holdListeners=[]; holdBound=false; holdId=null; holdDrawId=null; holdActive=false;
  }
  function holdSize(){
    if(!holdCanvas) return;
    holdCanvas.width = holdCanvas.clientWidth || 320;
    holdCanvas.height = 220;
  }
  function holdResetStars(){
    const src=(holdfastLevel && holdfastLevel.stars) || [
      {x:0.15,y:0.72},{x:0.32,y:0.32},{x:0.50,y:0.62},{x:0.70,y:0.28},{x:0.86,y:0.56}
    ];
    holdStars=src.map(p=>({x:p.x,y:p.y,hit:false}));
  }
  function holdfastReset(){
    holdfastStop(); holdResetStars(); holdStroke=[]; holdDone=false; holdActive=false; holdLocked=false; holdId=null; holdDrawId=null;
    const rv=$("hold-reveal"); if(rv) rv.classList.remove("show");
    if(holdGauge){ holdGauge.classList.remove("done"); holdGauge.textContent=CUR.holdPrefix+"0%"; }
    holdRender();
  }
  function holdIsKept(){ return holdActive || holdLocked; }
  function holdAdd(e){
    if(holdDone || !holdCanvas || !holdIsKept()) return;
    const r=holdCanvas.getBoundingClientRect();
    const x=e.clientX-r.left, y=e.clientY-r.top;
    holdStroke.push({x,y});
    holdStars.forEach(s=>{
      const sx=s.x*holdCanvas.width, sy=s.y*holdCanvas.height;
      if(!s.hit && Math.hypot(x-sx,y-sy) < 25){ s.hit=true; haptic(8); }
    });
    if(holdStars.length && holdStars.every(s=>s.hit)) holdComplete();
    else holdRender();
  }
  function holdLoop(){
    if(!holdDone){
      if(!holdIsKept() && holdStroke.length){
        const n=Math.max(HOLD_MIN_STROKE, Math.ceil(HOLD_DECAY));
        holdStroke.splice(Math.max(0, holdStroke.length-n), n);
        holdRehit();
      }
      holdRender();
      holdRaf=requestAnimationFrame(holdLoop);
    }
  }
  function holdRehit(){
    holdStars.forEach(s=>s.hit=false);
    holdStroke.forEach(p=>holdStars.forEach(s=>{
      const sx=s.x*holdCanvas.width, sy=s.y*holdCanvas.height;
      if(Math.hypot(p.x-sx,p.y-sy) < 25) s.hit=true;
    }));
  }
  function holdComplete(){
    if(holdDone || !holdIsKept()) return;
    holdDone=true; haptic([0,80,40,120]);
    const rv=$("hold-reveal"); if(rv) rv.classList.add("show");
    if(holdGauge){ holdGauge.textContent=CUR.holdSet; holdGauge.classList.add("done"); }
    holdRender(); holdfastStop(); revealAdvance();
  }
  function holdRender(){
    if(holdPad) holdPad.classList.toggle("on", !!holdActive);
    if(holdLockBtn) holdLockBtn.classList.toggle("on", !!holdLocked);
    if(!holdCtx || !holdCanvas) return;
    const w=holdCanvas.width, h=holdCanvas.height;
    holdCtx.clearRect(0,0,w,h);
    const kept=holdIsKept();
    if(holdStroke.length>1){
      holdCtx.strokeStyle=kept ? "rgba(227,165,66,.68)" : "rgba(191,88,48,.35)";
      holdCtx.lineWidth=3; holdCtx.lineCap="round"; holdCtx.lineJoin="round";
      holdCtx.beginPath();
      holdStroke.forEach((p,i)=> i ? holdCtx.lineTo(p.x,p.y) : holdCtx.moveTo(p.x,p.y));
      holdCtx.stroke();
    }
    holdStars.forEach(s=>{
      const sx=s.x*w, sy=s.y*h;
      if(s.hit){
        holdCtx.beginPath(); holdCtx.arc(sx,sy,12,0,7);
        holdCtx.strokeStyle="rgba(227,165,66,.42)"; holdCtx.lineWidth=2; holdCtx.stroke();
      }
      holdCtx.beginPath(); holdCtx.arc(sx,sy, s.hit?6:4, 0, 7);
      holdCtx.fillStyle = s.hit ? "#e3a542" : (kept ? "#4b5878" : "#2c3448"); holdCtx.fill();
    });
    if(holdGauge && !holdDone){
      const pct=holdStars.length ? Math.round(holdStars.filter(s=>s.hit).length / holdStars.length * 100) : 0;
      holdGauge.textContent=(kept ? CUR.holdPrefix : CUR.holdDecayPrefix) + pct + "%";
    }
  }

  /* ===== A6 — 외줄(Tightrope): 기울여 공을 중심에 두면서 중앙에서 별을 순서대로 탭한다 ===== */
  const ROPE_BUTTON_SPEED = 0.026;  // 폴백 좌우 버튼 이동 속도
  const ROPE_TILT_SPEED = 0.028;    // 기울임 이동 속도(정규화 기울기 기준)
  const ROPE_TILT_DEAD = 0.055;     // 손 떨림/센서 잡음 무시 구간
  const ROPE_TAP_NUDGE = 0.34;      // 별을 찍을 때마다 다음 균형을 요구하는 밀림
  const ROPE_LIMIT = 0.26;          // 중앙 허용 폭
  const ROPE_FALL_MS = 1400;
  const ROPE_TAP_RADIUS = 30;       // 다음 별 탭 허용 반경(px)
  const ROPE_FLASH_MS = 240;        // 무효/성공 탭 피드백
  // ROPE_PTS는 위(resetLevels보다 먼저)로 이동함 — TDZ 방지
  function tightropeInit(){
    ropeCanvas=$("ropeCanvas"); ropeGauge=$("ropeGauge"); ropeFill=$("ropeBalanceFill"); ropeFallback=$("ropeFallback");
    if(!ropeCanvas) return;
    ropeCtx=ropeCanvas.getContext("2d");
    if(!ropeBound){
      const on=(el,type,fn,opt)=>{ el.addEventListener(type,fn,opt); ropeListeners.push([el,type,fn,opt]); };
      const sensorBtn=$("ropeSensorBtn"), left=$("ropeLeftBtn"), right=$("ropeRightBtn");
      const canvasDown=e=>{ if(ropeCompleteDone) return; e.preventDefault(); ropeTap(e); };
      const holdDir=dir=>e=>{ e.preventDefault(); ropeFallbackDir=dir; ropeLastDrift=-dir; };
      const clearDir=dir=>e=>{ if(ropeFallbackDir===dir) ropeFallbackDir=0; };
      on(ropeCanvas,"pointerdown",canvasDown);
      if(sensorBtn) on(sensorBtn,"click",tightropeEnable);
      if(left){
        on(left,"pointerdown",holdDir(-1)); on(left,"pointerup",clearDir(-1)); on(left,"pointercancel",clearDir(-1));
      }
      if(right){
        on(right,"pointerdown",holdDir(1)); on(right,"pointerup",clearDir(1)); on(right,"pointercancel",clearDir(1));
      }
      ropeBound=true;
    }
    ropeSize(); ropeRender(); tightropeStop(); ropeLastTs=0; ropeRaf=requestAnimationFrame(tightropeLoop);
    if(typeof DeviceOrientationEvent==="undefined") tightropeShowFallback();
    else if(typeof DeviceOrientationEvent.requestPermission!=="function") tightropeEnable();
    clearTimeout(ropeTimer);
    ropeTimer=setTimeout(()=>{ if(!ropeGotEvent) tightropeShowFallback(); },4000);
  }
  function tightropeStop(){ if(ropeRaf){ cancelAnimationFrame(ropeRaf); ropeRaf=null; } }
  function tightropeCleanup(){
    tightropeStop();
    window.removeEventListener("deviceorientation",tightropeOnTilt);
    if(ropeTimer){ clearTimeout(ropeTimer); ropeTimer=null; }
    ropeListeners.forEach(([el,type,fn,opt])=>el.removeEventListener(type,fn,opt));
    ropeListeners=[]; ropeBound=false; ropeFallbackDir=0;
  }
  function tightropeEnable(){
    if(typeof DeviceOrientationEvent!=="undefined" && typeof DeviceOrientationEvent.requestPermission==="function"){
      DeviceOrientationEvent.requestPermission().then(p=>{
        if(p==="granted"){ window.addEventListener("deviceorientation",tightropeOnTilt); const b=$("ropeSensorBtn"); if(b) b.style.display="none"; }
        else tightropeShowFallback();
      }).catch(tightropeShowFallback);
    } else {
      window.addEventListener("deviceorientation",tightropeOnTilt);
      const b=$("ropeSensorBtn"); if(b) b.style.display="none";
    }
  }
  function tightropeShowFallback(){ if(ropeFallback) ropeFallback.style.display="grid"; const b=$("ropeSensorBtn"); if(b) b.style.display="none"; }
  function tightropeOnTilt(e){
    const g=Number.isFinite(e.gamma) ? e.gamma : 0;
    if(!ropeGotEvent) ropeBaseline=g;     // 첫 이벤트의 기울기를 영점으로 보정(자연스러운 파지각=중립)
    ropeGotEvent=true;
    const rel=g-ropeBaseline;
    ropeTilt=Math.max(-28,Math.min(28,rel));
    if(Math.abs(ropeTilt)>1) ropeLastDrift = ropeTilt>0 ? 1 : -1;
  }
  function tightropeReset(){
    tightropeStop();
    ropeStars=ROPE_PTS.map(p=>({x:p.x,y:p.y,hit:false}));
    ropeNext=0; ropeTapFlash=null; ropeCompleteDone=false;
    ropeX=0; ropeV=0; ropeTilt=0; ropeFallbackDir=0; ropeFallMs=0; ropeLastTs=0; ropeGotEvent=false; ropeLastDrift=1; ropeBaseline=0;
    const rv=$("rope-reveal"); if(rv) rv.classList.remove("show");
    const b=$("ropeSensorBtn"); if(b) b.style.display="";
    if(ropeFallback) ropeFallback.style.display="none";
    if(ropeGauge){ ropeGauge.classList.remove("done"); ropeGauge.textContent=CUR.ropePrefix+"0/"+ROPE_PTS.length; }
    if(ropeFill) ropeFill.style.width="0%";
    ropeRender();
  }
  function tightropeSoftReset(){
    ropeStars.forEach(s=>s.hit=false); ropeNext=0; ropeTapFlash=null;
    ropeX=0; ropeV=0; ropeFallMs=0;
    haptic([0,40,30,40]);
  }
  function ropeSize(){
    if(!ropeCanvas) return;
    ropeCanvas.width = ropeCanvas.clientWidth || 320;
    ropeCanvas.height = 230;
  }
  function ropeTap(e){
    if(ropeCompleteDone || !ropeCanvas) return;
    const r=ropeCanvas.getBoundingClientRect();
    const x=e.clientX-r.left, y=e.clientY-r.top;
    const next=ropeStars[ropeNext];
    const centered=Math.abs(ropeX)<=ROPE_LIMIT;
    let ok=false;
    if(next){
      const sx=next.x*ropeCanvas.width, sy=next.y*ropeCanvas.height;
      ok=centered && Math.hypot(x-sx,y-sy) <= ROPE_TAP_RADIUS;
      if(ok){
        next.hit=true; ropeNext++; haptic(8);
        if(ropeNext>=ropeStars.length){ ropeRender(); tightropeComplete(); return; }
        ropeX = Math.max(-0.6, Math.min(0.6, ropeX + (ropeNext%2 ? ROPE_TAP_NUDGE : -ROPE_TAP_NUDGE)));
      } else haptic(4);
    }
    ropeTapFlash={x,y,ok,ts:performance.now()};
    ropeRender();
  }
  function tightropeLoop(ts){
    if(!ropeCanvas || ropeCompleteDone) return;
    const dt=Math.min(34, ropeLastTs ? ts-ropeLastTs : 16);
    ropeLastTs=ts;
    const dtf = dt/16;
    const rawTilt = Math.max(-1, Math.min(1, ropeTilt/18));      // 정규화 기울기(±18°=최대 이동)
    const tiltN = Math.abs(rawTilt)<ROPE_TILT_DEAD ? 0 : rawTilt;
    const ctrl = ropeFallbackDir ? ropeFallbackDir*ROPE_BUTTON_SPEED : tiltN*ROPE_TILT_SPEED;
    ropeX += ctrl*dtf;                                           // 속도 누적/양의 피드백 없이 직접 이동
    ropeX = Math.max(-0.6, Math.min(0.6, ropeX));
    const centered = Math.abs(ropeX) <= ROPE_LIMIT;
    if(centered) ropeFallMs=Math.max(0,ropeFallMs-dt*1.8);
    else ropeFallMs += dt;
    if(ropeFallMs >= ROPE_FALL_MS) tightropeSoftReset();
    ropeRender();
    ropeRaf=requestAnimationFrame(tightropeLoop);
  }
  function tightropeComplete(){
    if(ropeCompleteDone) return;
    ropeCompleteDone=true; haptic([0,80,40,120]);
    const rv=$("rope-reveal"); if(rv) rv.classList.add("show");
    if(ropeGauge){ ropeGauge.textContent=CUR.ropeSet; ropeGauge.classList.add("done"); }
    tightropeStop(); revealAdvance();
  }
  function ropeRender(){
    if(!ropeCtx || !ropeCanvas) return;
    const w=ropeCanvas.width, h=ropeCanvas.height, mid=w/2, ballY=34;
    ropeCtx.clearRect(0,0,w,h);
    ropeCtx.strokeStyle="rgba(227,165,66,.26)"; ropeCtx.lineWidth=8; ropeCtx.lineCap="round";
    ropeCtx.beginPath(); ropeCtx.moveTo(mid-w*ROPE_LIMIT*0.72, ballY); ropeCtx.lineTo(mid+w*ROPE_LIMIT*0.72, ballY); ropeCtx.stroke();  // 레인 폭 = 공 렌더 스케일(0.72)과 일치 → 중앙판정과 시각 정합
    ropeCtx.strokeStyle="rgba(227,165,66,.56)"; ropeCtx.lineWidth=2;
    ropeCtx.beginPath(); ropeCtx.moveTo(mid, 20); ropeCtx.lineTo(mid, 52); ropeCtx.stroke();
    const hitStars=ropeStars.filter(s=>s.hit);
    if(hitStars.length>1){
      ropeCtx.strokeStyle="rgba(227,165,66,.72)";
      ropeCtx.lineWidth=3; ropeCtx.lineCap="round"; ropeCtx.lineJoin="round";
      ropeCtx.beginPath();
      hitStars.forEach((s,i)=>{
        const sx=s.x*w, sy=s.y*h;
        if(i) ropeCtx.lineTo(sx,sy); else ropeCtx.moveTo(sx,sy);
      });
      ropeCtx.stroke();
    }
    if(ropeNext>0 && ropeNext<ropeStars.length){
      const prev=ropeStars[ropeNext-1], next=ropeStars[ropeNext];
      ropeCtx.strokeStyle="rgba(227,165,66,.24)"; ropeCtx.lineWidth=2; ropeCtx.setLineDash([5,7]);
      ropeCtx.beginPath(); ropeCtx.moveTo(prev.x*w,prev.y*h); ropeCtx.lineTo(next.x*w,next.y*h); ropeCtx.stroke();
      ropeCtx.setLineDash([]);
    }
    ropeStars.forEach((s,i)=>{
      const sx=s.x*w, sy=s.y*h;
      const next=i===ropeNext && !ropeCompleteDone;
      if(s.hit){
        ropeCtx.beginPath(); ropeCtx.arc(sx,sy,12,0,7);
        ropeCtx.strokeStyle="rgba(227,165,66,.42)"; ropeCtx.lineWidth=2; ropeCtx.stroke();
      }
      if(next){
        ropeCtx.beginPath(); ropeCtx.arc(sx,sy,18,0,7);
        ropeCtx.strokeStyle=Math.abs(ropeX)<=ROPE_LIMIT ? "rgba(240,197,107,.86)" : "rgba(191,88,48,.62)";
        ropeCtx.lineWidth=3; ropeCtx.stroke();
      }
      ropeCtx.beginPath(); ropeCtx.arc(sx,sy, s.hit?6:4, 0, 7);
      ropeCtx.fillStyle=s.hit ? "#e3a542" : (next ? "#f0c56b" : "#3a4663"); ropeCtx.fill();
    });
    if(ropeTapFlash){
      const age=performance.now()-ropeTapFlash.ts;
      if(age<ROPE_FLASH_MS){
        const a=1-age/ROPE_FLASH_MS;
        ropeCtx.beginPath(); ropeCtx.arc(ropeTapFlash.x,ropeTapFlash.y,10+8*(1-a),0,7);
        ropeCtx.strokeStyle=ropeTapFlash.ok ? `rgba(227,165,66,${a*.65})` : `rgba(191,88,48,${a*.55})`;
        ropeCtx.lineWidth=2; ropeCtx.stroke();
      } else ropeTapFlash=null;
    }
    const bx=mid + ropeX*w*0.72;
    ropeCtx.beginPath(); ropeCtx.arc(bx,ballY,10,0,7);
    ropeCtx.fillStyle=Math.abs(ropeX)<=ROPE_LIMIT ? "#f0c56b" : "#bf5830"; ropeCtx.fill();
    ropeCtx.strokeStyle="rgba(255,255,255,.28)"; ropeCtx.lineWidth=1; ropeCtx.stroke();
    const balancePct=Math.max(0,Math.min(100,Math.round((1-Math.abs(ropeX)/ROPE_LIMIT)*100)));
    if(ropeFill) ropeFill.style.width=balancePct+"%";
    if(ropeGauge && !ropeCompleteDone) ropeGauge.textContent=CUR.ropePrefix+ropeNext+"/"+ropeStars.length;
  }

  /* ===== A2 — 별가루(Stardust): 흔들어 흩어진 별을 별자리로 모은 뒤 한 획으로 잇는다(상태빚기) =====
     ⚠️ STAR_SHAKE_NEED/HIT_R/SCATTER 상수는 상단(STAR_TARGET 옆)으로 이동함 — stardustReset가 init때 STAR_SCATTER를 읽으므로 TDZ 방지 */
  function stardustInit(){
    starCanvas=$("starCanvas"); if(!starCanvas) return;
    starCtx=starCanvas.getContext("2d");
    if(!starBound){
      const on=(el,t,fn,opt)=>{ el.addEventListener(t,fn,opt); starListeners.push([el,t,fn,opt]); };
      const down=e=>{ if(!starConverged||starDone) return; e.preventDefault(); starDrawing=true; starAdd(e); };
      const move=e=>{ if(starDrawing){ e.preventDefault(); starAdd(e); } };
      const up=()=>{ starDrawing=false; };
      on(starCanvas,"pointerdown",down); on(starCanvas,"pointermove",move);
      on(starCanvas,"pointerup",up); on(starCanvas,"pointerleave",up);
      const sb=$("starShakeBtn"); if(sb) on(sb,"click",stardustEnable);
      const fb=$("starShakeFb"); if(fb) on(fb,"click",()=>starShake(2.2));  // 폴백: 탭으로 흔들기(센서 없는 기기)
      starBound=true;
    }
    starSize(); starRender();
    if(typeof DeviceMotionEvent==="undefined") starShowFallback();
    else if(typeof DeviceMotionEvent.requestPermission!=="function") window.addEventListener("devicemotion",stardustOnMotion);
    clearTimeout(starMotionTimer);
    starMotionTimer=setTimeout(()=>{ if(!starGotMotion) starShowFallback(); },4000);
  }
  function stardustEnable(){
    if(typeof DeviceMotionEvent!=="undefined" && typeof DeviceMotionEvent.requestPermission==="function"){
      DeviceMotionEvent.requestPermission().then(p=>{
        if(p==="granted"){ window.addEventListener("devicemotion",stardustOnMotion); const b=$("starShakeBtn"); if(b) b.style.display="none"; }
        else starShowFallback();
      }).catch(starShowFallback);
    } else {
      window.addEventListener("devicemotion",stardustOnMotion);
      const b=$("starShakeBtn"); if(b) b.style.display="none";
    }
  }
  function starShowFallback(){ const fb=$("starShakeFb"); if(fb) fb.style.display=""; const b=$("starShakeBtn"); if(b) b.style.display="none"; }
  function stardustOnMotion(e){
    starGotMotion=true;
    const a=e.accelerationIncludingGravity||e.acceleration||{x:0,y:0,z:0};
    const mag=Math.hypot(a.x||0,a.y||0,a.z||0);
    const d=Math.abs(mag-starLastMag); starLastMag=mag;
    if(d>3.2) starShake(d/8);   // 흔들림 스파이크 → 에너지
  }
  function starShake(amt){
    if(starConverged||starDone) return;
    starShakeE=Math.min(STAR_SHAKE_NEED, starShakeE+amt);
    const t=starShakeE/STAR_SHAKE_NEED;
    starDots.forEach(d=>{ d.x=d.x0+(d.tx-d.x0)*t; d.y=d.y0+(d.ty-d.y0)*t; });   // 흔들수록 목표로 수렴
    if(starShakeE>=STAR_SHAKE_NEED){ starConverged=true; starDots.forEach(d=>{ d.x=d.tx; d.y=d.ty; }); haptic([0,60,30,60]); }
    else haptic(6);
    if($("starGauge")) $("starGauge").textContent = starConverged ? (CUR.starReady||"") : (CUR.starPrefix+Math.round(t*100)+"%");
    starRender();
  }
  function stardustReset(){
    starStroke=[]; starDrawing=false; starDone=false; starConverged=false; starShakeE=0; starGotMotion=false; starLastMag=0;
    starDots=STAR_TARGET.map(p=>{
      const ox=(Math.random()-0.5)*STAR_SCATTER, oy=(Math.random()-0.5)*STAR_SCATTER;
      const x0=Math.max(0.06,Math.min(0.94,p.x+ox)), y0=Math.max(0.10,Math.min(0.90,p.y+oy));
      return { tx:p.x, ty:p.y, x0, y0, x:x0, y:y0, hit:false };
    });
    const rv=$("star-reveal"); if(rv) rv.classList.remove("show");
    const b=$("starShakeBtn"); if(b) b.style.display="";
    const fb=$("starShakeFb"); if(fb) fb.style.display="none";
    const g=$("starGauge"); if(g){ g.classList.remove("done"); g.textContent=CUR.starPrefix+"0%"; }
    starRender();
  }
  function stardustCleanup(){
    window.removeEventListener("devicemotion",stardustOnMotion);
    if(starMotionTimer){ clearTimeout(starMotionTimer); starMotionTimer=null; }
    starListeners.forEach(([el,t,fn,opt])=>el.removeEventListener(t,fn,opt));
    starListeners=[]; starBound=false; starDrawing=false;
  }
  function starSize(){ if(!starCanvas) return; starCanvas.width=starCanvas.clientWidth||320; starCanvas.height=210; }
  function starAdd(e){
    if(!starConverged||starDone||!starCanvas) return;
    const r=starCanvas.getBoundingClientRect(); const x=e.clientX-r.left, y=e.clientY-r.top;
    starStroke.push({x,y});
    starDots.forEach(s=>{ const sx=s.x*starCanvas.width, sy=s.y*starCanvas.height; if(!s.hit && Math.hypot(x-sx,y-sy)<STAR_HIT_R) s.hit=true; });
    starRender();
    if(starDots.length && starDots.every(s=>s.hit)) stardustComplete();
  }
  function stardustComplete(){
    if(starDone) return; starDone=true; haptic([0,80,40,120]);
    const rv=$("star-reveal"); if(rv) rv.classList.add("show");
    const g=$("starGauge"); if(g){ g.textContent=CUR.ropeSet||""; g.classList.add("done"); }
    starRender(); revealAdvance();
  }
  function starRender(){
    if(!starCtx||!starCanvas) return;
    const w=starCanvas.width, h=starCanvas.height;
    starCtx.clearRect(0,0,w,h);
    if(starStroke.length>1){
      starCtx.strokeStyle="rgba(227,165,66,.55)"; starCtx.lineWidth=3; starCtx.lineCap="round"; starCtx.lineJoin="round";
      starCtx.beginPath(); starStroke.forEach((p,i)=> i?starCtx.lineTo(p.x,p.y):starCtx.moveTo(p.x,p.y)); starCtx.stroke();
    }
    starDots.forEach(s=>{
      const sx=s.x*w, sy=s.y*h;
      if(s.hit){ starCtx.beginPath(); starCtx.arc(sx,sy,11,0,7); starCtx.strokeStyle="rgba(227,165,66,.4)"; starCtx.lineWidth=2; starCtx.stroke(); }
      starCtx.beginPath(); starCtx.arc(sx,sy, s.hit?6:(starConverged?5:3), 0, 7);
      starCtx.fillStyle = s.hit ? "#e3a542" : (starConverged ? "#f0c56b" : "#3a4663"); starCtx.fill();
    });
  }

  /* ===== A3 — 톱니(Cogwork): 두 손가락으로 비틀어 다이얼을 목표 각도에 맞춰 유지(회전 협응) ===== */
  function twistInit(){
    dialCanvas=$("dialCanvas"); if(!dialCanvas) return;
    dialCtx=dialCanvas.getContext("2d");
    if(!dialBound){
      const on=(el,t,fn,opt)=>{ el.addEventListener(t,fn,opt); dialListeners.push([el,t,fn,opt]); };
      on(dialCanvas,"pointerdown",twistDown);
      on(dialCanvas,"pointermove",twistMove);
      on(dialCanvas,"pointerup",twistUp); on(dialCanvas,"pointercancel",twistUp); on(dialCanvas,"pointerleave",twistUp);
      dialBound=true;
    }
    twistSize(); twistRender(); twistStop(); dialLastTs=0; dialRaf=requestAnimationFrame(twistLoop);
  }
  function twistStop(){ if(dialRaf){ cancelAnimationFrame(dialRaf); dialRaf=null; } }
  function twistCleanup(){ twistStop(); dialListeners.forEach(([el,t,fn,o])=>el.removeEventListener(t,fn,o)); dialListeners=[]; dialBound=false; dialPtrs.clear(); }
  function twistSize(){ if(!dialCanvas) return; dialCanvas.width=dialCanvas.clientWidth||320; dialCanvas.height=230; }
  function twistPt(e){ const r=dialCanvas.getBoundingClientRect(); return {x:e.clientX-r.left, y:e.clientY-r.top}; }
  function twistInputAngle(){
    const pts=[...dialPtrs.values()];
    if(pts.length>=2) return Math.atan2(pts[1].y-pts[0].y, pts[1].x-pts[0].x)*180/Math.PI;   // 두 손가락 사이 각(회전) — 주 입력
    const multi=(navigator.maxTouchPoints||0)>1;
    if(pts.length===1 && !multi) return Math.atan2(pts[0].y-dialCanvas.height/2, pts[0].x-dialCanvas.width/2)*180/Math.PI;  // 한 손가락 호 = 멀티터치 없는 기기(데스크탑) 폴백만
    return null;
  }
  function twistDown(e){ if(dialDone) return; try{ dialCanvas.setPointerCapture(e.pointerId); }catch(_){} dialPtrs.set(e.pointerId, twistPt(e)); dialLastAng=twistInputAngle(); }
  function twistMove(e){
    if(dialDone || !dialPtrs.has(e.pointerId)) return; e.preventDefault();
    dialPtrs.set(e.pointerId, twistPt(e));
    const a=twistInputAngle();
    if(a!=null && dialLastAng!=null){ let d=a-dialLastAng; while(d>180)d-=360; while(d<-180)d+=360; dialAngle+=d; }
    dialLastAng=a; twistRender();
  }
  function twistUp(e){ dialPtrs.delete(e.pointerId); dialLastAng = dialPtrs.size ? twistInputAngle() : null; }
  function twistLoop(ts){
    if(!dialCanvas || dialDone) return;
    const dt=Math.min(34, dialLastTs ? ts-dialLastTs : 16); dialLastTs=ts;
    const diff=Math.abs(((dialAngle-dialTarget)%360+540)%360-180);   // 0~180 최소 각차
    if(diff<=TWIST_TOL) dialHoldMs+=dt; else dialHoldMs=Math.max(0,dialHoldMs-dt*1.5);
    if(dialHoldMs>=TWIST_HOLD_MS) twistComplete();
    twistRender();
    dialRaf=requestAnimationFrame(twistLoop);
  }
  function twistComplete(){
    if(dialDone) return; dialDone=true; haptic([0,80,40,120]);
    const rv=$("dial-reveal"); if(rv) rv.classList.add("show");
    const g=$("dialGauge"); if(g){ g.textContent=CUR.ropeSet||""; g.classList.add("done"); }
    twistStop(); twistRender(); revealAdvance();
  }
  function twistReset(){
    twistStop();
    dialAngle=0; dialTarget=TWIST_TARGET; dialHoldMs=0; dialDone=false; dialPtrs.clear(); dialLastAng=null; dialLastTs=0;
    const rv=$("dial-reveal"); if(rv) rv.classList.remove("show");
    const g=$("dialGauge"); if(g){ g.classList.remove("done"); g.textContent=CUR.dialPrefix+"0%"; }
    twistRender();
  }
  function twistRender(){
    if(!dialCtx || !dialCanvas) return;
    const w=dialCanvas.width, h=dialCanvas.height, cx=w/2, cy=h/2, R=Math.min(w,h)*0.36;
    dialCtx.clearRect(0,0,w,h);
    dialCtx.beginPath(); dialCtx.arc(cx,cy,R,0,7); dialCtx.strokeStyle="rgba(227,165,66,.30)"; dialCtx.lineWidth=6; dialCtx.stroke();
    const tr=(dialTarget-90)*Math.PI/180;
    dialCtx.beginPath(); dialCtx.moveTo(cx+Math.cos(tr)*(R-14), cy+Math.sin(tr)*(R-14)); dialCtx.lineTo(cx+Math.cos(tr)*(R+10), cy+Math.sin(tr)*(R+10));
    dialCtx.strokeStyle="rgba(240,197,107,.9)"; dialCtx.lineWidth=4; dialCtx.stroke();
    const ar=(dialAngle-90)*Math.PI/180;
    const diff=Math.abs(((dialAngle-dialTarget)%360+540)%360-180);
    dialCtx.beginPath(); dialCtx.moveTo(cx,cy); dialCtx.lineTo(cx+Math.cos(ar)*(R-6), cy+Math.sin(ar)*(R-6));
    dialCtx.strokeStyle = diff<=TWIST_TOL ? "#f0c56b" : "#bf5830"; dialCtx.lineWidth=4; dialCtx.lineCap="round"; dialCtx.stroke();
    dialCtx.beginPath(); dialCtx.arc(cx,cy,7,0,7); dialCtx.fillStyle="#e3a542"; dialCtx.fill();
    const g=$("dialGauge"); if(g && !dialDone) g.textContent=CUR.dialPrefix+Math.round(Math.min(100,dialHoldMs/TWIST_HOLD_MS*100))+"%";
  }

  /* ===== A1 — 문간(Antechamber): 수수께끼의 답에 해당하는 표식만 길게 누르면 열린다(인지 라우팅) ===== */
  function gatePads(){ return document.querySelectorAll("#lvGate .gatepad"); }
  function setGateFill(i,frac){ const p=gatePads()[i]; if(!p) return; const f=p.querySelector(".gatefill"); if(f) f.style.height=(Math.max(0,Math.min(1,frac))*100)+"%"; }
  function gateInit(){
    const pads=gatePads(); if(!pads.length) return;
    if(!gateBound){
      pads.forEach(p=>{
        const i=+p.dataset.i;
        p.addEventListener("pointerdown",e=>{ e.preventDefault(); try{ p.setPointerCapture(e.pointerId); }catch(_){} gatePadDown(i,p); });
        p.addEventListener("pointerup",gatePadUp);
        p.addEventListener("pointercancel",gatePadUp);
        p.addEventListener("pointerleave",gatePadUp);
      });
      gateBound=true;
    }
    gateReset();
  }
  function gatePadDown(i,p){
    if(gateDone) return;
    if(i!==gateTarget){ p.classList.add("wrong"); haptic(8); setTimeout(()=>p.classList.remove("wrong"),260); return; }   // 오답 표식: 열리지 않음
    gatePressIdx=i; gatePressStart=performance.now();
    if(gateRaf) cancelAnimationFrame(gateRaf);
    gateRaf=requestAnimationFrame(gateLoop);
  }
  function gatePadUp(){
    gatePressIdx=-1;
    if(gateRaf){ cancelAnimationFrame(gateRaf); gateRaf=null; }
    if(!gateDone) setGateFill(gateTarget,0);
  }
  function gateLoop(){
    if(gatePressIdx<0 || gateDone) return;
    const el=(performance.now()-gatePressStart)/GATE_HOLD_MS;
    setGateFill(gateTarget, el);
    if(el>=1){ gateComplete(); return; }
    gateRaf=requestAnimationFrame(gateLoop);
  }
  function gateComplete(){
    if(gateDone) return; gateDone=true; haptic([0,80,40,120]);
    if(gateRaf){ cancelAnimationFrame(gateRaf); gateRaf=null; }
    setGateFill(gateTarget,1);
    const rv=$("gate-reveal"); if(rv) rv.classList.add("show");
    revealAdvance();
  }
  function gateReset(){
    gatePressIdx=-1; gateDone=false;
    if(gateRaf){ cancelAnimationFrame(gateRaf); gateRaf=null; }
    setGateFill(0,0); setGateFill(1,0); setGateFill(2,0);
    gatePads().forEach(p=>p.classList.remove("wrong"));
    const rv=$("gate-reveal"); if(rv) rv.classList.remove("show");
  }
  function gateCleanup(){ if(gateRaf){ cancelAnimationFrame(gateRaf); gateRaf=null; } gatePressIdx=-1; }

  /* ===== A5 — 물때(Tide): 숨 세기를 중앙 띠 안에 유지한다 ===== */
  function tideBox(){ return $("lvTide") && $("lvTide").querySelector(".tidebox"); }
  function tideRender(){
    const fill=$("tideFill"), orb=$("tideOrb"), box=tideBox(), gauge=$("tideGauge");
    const pct=Math.max(0,Math.min(100,tideLevel));
    if(fill) fill.style.width=pct+"%";
    if(orb) orb.style.transform="scale("+(0.78+pct*0.004).toFixed(2)+")";
    const inBand=pct>=TIDE_LOW && pct<=TIDE_HIGH, tooHigh=pct>TIDE_HIGH;
    if(box){ box.classList.toggle("in-band",inBand); box.classList.toggle("too-high",tooHigh); }
    if(gauge && !tideDone) gauge.textContent=(CUR.tidePrefix||"tide: ")+Math.round(tideHold/TIDE_HOLD_MS*100)+"%";
  }
  function tideStop(){
    if(tideRaf){ cancelAnimationFrame(tideRaf); tideRaf=null; }
    if(tideStream){ tideStream.getTracks().forEach(t=>t.stop()); tideStream=null; }
    if(tideCtx){ try{ tideCtx.close(); }catch(e){} tideCtx=null; }
    tideFallbackHold=false;
  }
  function tideComplete(){
    if(tideDone) return;
    tideDone=true; haptic([0,80,40,120]); tideStop();
    const rv=$("tide-reveal"); if(rv) rv.classList.add("show");
    const g=$("tideGauge"); if(g){ g.textContent=CUR.tideSet; g.classList.add("done"); }
    setTimeout(advance,1600);
  }
  function tideTick(input,ts){
    if(tideDone) return;
    const dt=Math.min(40,tideLastTs ? ts-tideLastTs : 16); tideLastTs=ts;
    if(tideFallback) tideLevel += (tideFallbackHold ? 1.8 : -0.9) * (dt/16);
    else tideLevel += (input - tideLevel) * 0.18;
    tideLevel=Math.max(0,Math.min(100,tideLevel));
    if(tideLevel>=TIDE_LOW && tideLevel<=TIDE_HIGH) tideHold=Math.min(TIDE_HOLD_MS,tideHold+dt);
    else if(tideLevel>TIDE_HIGH) tideHold=Math.max(0,tideHold-dt*2.4);
    else tideHold=Math.max(0,tideHold-dt*.7);
    tideRender();
    if(tideHold>=TIDE_HOLD_MS) tideComplete();
  }
  async function tideStart(){
    try{
      tideStream = await navigator.mediaDevices.getUserMedia({audio:true});
      tideCtx = new (window.AudioContext||window.webkitAudioContext)();
      if(tideCtx.state==="suspended") await tideCtx.resume();
      const src=tideCtx.createMediaStreamSource(tideStream), analyser=tideCtx.createAnalyser();
      analyser.fftSize=512; src.connect(analyser);
      const data=new Uint8Array(analyser.frequencyBinCount);
      const b=$("tideBtn"); if(b) b.style.display="none";
      (function loop(ts){
        analyser.getByteFrequencyData(data);
        let sum=0, n=24; for(let i=2;i<2+n;i++) sum+=data[i];
        const lvl=Math.max(0,Math.min(100,((sum/n)-28)*1.15));
        tideTick(lvl,ts||performance.now());
        if(!tideDone) tideRaf=requestAnimationFrame(loop);
      })();
    }catch(e){
      tideShowFallback();
    }
  }
  function tideShowFallback(){
    tideFallback=true;
    const b=$("tideBtn"), fb=$("tideFb");
    if(b) b.style.display="none";
    if(fb) fb.style.display="";
    tideLastTs=0;
    if(!tideRaf){
      const loop=ts=>{ tideTick(0,ts); if(!tideDone) tideRaf=requestAnimationFrame(loop); };
      tideRaf=requestAnimationFrame(loop);
    }
  }
  function tideInit(){
    if(!tideBound){
      tideBound=true;
      const b=$("tideBtn"), fb=$("tideFb");
      if(b) b.addEventListener("click",tideStart);
      if(fb){
        fb.addEventListener("pointerdown",e=>{ e.preventDefault(); tideFallbackHold=true; });
        ["pointerup","pointercancel","pointerleave"].forEach(ev=>fb.addEventListener(ev,()=>{ tideFallbackHold=false; }));
      }
    }
    tideRender();
  }
  function tideReset(){
    tideStop(); tideLevel=0; tideHold=0; tideDone=false; tideFallback=false; tideLastTs=0;
    const rv=$("tide-reveal"); if(rv) rv.classList.remove("show");
    const b=$("tideBtn"), fb=$("tideFb"), g=$("tideGauge");
    if(b) b.style.display="";
    if(fb) fb.style.display="none";
    if(g){ g.classList.remove("done"); g.textContent=(CUR.tidePrefix||"tide: ")+"0%"; }
    tideRender();
  }

  /* ===== 길 그리기(road) — 측량가 시리즈: 측량가가 떠나는 사람에게 건네는 길을 *순서대로* 그린다 =====
     route와 달리 웨이포인트를 처음→끝 순서로 통과해야 한다(길이니까). 마지막 점=떠나는 사람. 완주 시
     떠나는 사람이 흐려지고(잊혀짐의 시작) #road-reveal(작별 약속)이 떠오른 뒤 느린-망각 엔딩으로. */
  const ROAD_PTS = [
    {x:0.10,y:0.80},{x:0.27,y:0.62},{x:0.43,y:0.68},
    {x:0.60,y:0.46},{x:0.77,y:0.52},{x:0.90,y:0.30}
  ];
  function roadInit(){
    if(!roadCanvas){
      roadCanvas = $("roadCanvas");
      roadCtx = roadCanvas.getContext("2d");
      roadPts = ROAD_PTS.map(p=>({x:p.x,y:p.y}));
      const down=e=>{ roadDrawing=true; roadAdd(e); };
      const move=e=>{ if(roadDrawing){ e.preventDefault(); roadAdd(e); } };
      const up=()=>{ roadDrawing=false; };
      roadCanvas.addEventListener("pointerdown",down);
      roadCanvas.addEventListener("pointermove",move);
      roadCanvas.addEventListener("pointerup",up);
      roadCanvas.addEventListener("pointerleave",up);
      roadBound=true;
    }
    if(!roadPts.length) roadPts = ROAD_PTS.map(p=>({x:p.x,y:p.y}));
    roadSize(); roadRender();
  }
  function roadSize(){
    if(!roadCanvas) return;
    roadCanvas.width = roadCanvas.clientWidth || 320;
    roadCanvas.height = 220;
  }
  function roadAdd(e){
    if(roadDone || !roadCanvas) return;
    const r=roadCanvas.getBoundingClientRect();
    const x=e.clientX-r.left, y=e.clientY-r.top;
    roadStroke.push({x,y});
    // 순서대로: 다음 웨이포인트에 닿으면 한 칸 전진(길이니까 건너뛸 수 없다)
    if(roadHit < roadPts.length){
      const nx=roadPts[roadHit].x*roadCanvas.width, ny=roadPts[roadHit].y*roadCanvas.height;
      if(Math.hypot(x-nx,y-ny) < 26){ roadHit++; haptic(12); }
    }
    roadRender();
    if(roadHit >= roadPts.length) roadComplete();
  }
  function roadComplete(){
    if(roadDone) return; roadDone=true; haptic([0,80,40,120]);
    const rv=$("road-reveal"); if(rv) rv.classList.add("show");
    roadRender();
    revealAdvance();
  }
  function roadReset(){
    roadStroke=[]; roadDone=false; roadHit=0;
    const rv=$("road-reveal"); if(rv) rv.classList.remove("show");
    roadRender();
  }
  function roadRender(){
    if(!roadCtx || !roadCanvas) return;
    const w=roadCanvas.width, h=roadCanvas.height;
    roadCtx.clearRect(0,0,w,h);
    // 그어진 길(따라간 만큼 황금빛)
    if(roadStroke.length>1){
      roadCtx.strokeStyle="rgba(227,165,66,.5)"; roadCtx.lineWidth=3;
      roadCtx.lineCap="round"; roadCtx.lineJoin="round";
      roadCtx.beginPath();
      roadStroke.forEach((p,i)=> i ? roadCtx.lineTo(p.x,p.y) : roadCtx.moveTo(p.x,p.y));
      roadCtx.stroke();
    }
    // 통과한 웨이포인트끼리 잇는 *길*의 윤곽(점선 → 통과분은 실선화)
    roadCtx.lineWidth=2;
    for(let i=0;i<roadPts.length-1;i++){
      const a=roadPts[i], b=roadPts[i+1];
      roadCtx.beginPath();
      roadCtx.moveTo(a.x*w,a.y*h); roadCtx.lineTo(b.x*w,b.y*h);
      roadCtx.strokeStyle = (i < roadHit-0) && (i+1 <= roadHit) ? "rgba(227,165,66,.35)" : "rgba(58,70,99,.5)";
      roadCtx.stroke();
    }
    // 웨이포인트 점들
    roadPts.forEach((p,i)=>{
      const sx=p.x*w, sy=p.y*h, passed = i < roadHit;
      roadCtx.beginPath(); roadCtx.arc(sx,sy, passed?6:4, 0, 7);
      roadCtx.fillStyle = passed ? "#e3a542" : "#3a4663"; roadCtx.fill();
    });
    // 마지막 점 = 떠나는 사람. 완주 전엔 또렷, 완주(작별) 후엔 흐려진다 — 잊혀짐의 시작.
    const last=roadPts[roadPts.length-1];
    if(last){
      roadCtx.save();
      roadCtx.globalAlpha = roadDone ? 0.32 : 1;
      roadCtx.font = "20px serif"; roadCtx.textAlign="center"; roadCtx.textBaseline="middle";
      roadCtx.fillText("🚶", last.x*w, last.y*h - 16);
      roadCtx.restore();
    }
  }

  /* ===== 되짚어 지우기(erase) — 측량가 시리즈 망각: 그어 둔 길을 *끝→시작점* 거꾸로 천천히 지운다 =====
     길 그리기(road)의 역(逆). 같은 경로(ROAD_PTS)가 처음부터 다 그어져 있고, 끝(🏙)부터 역순으로
     웨이포인트를 되짚으면 길이 한 칸씩 사라진다. 다 지우면 빈 종이 → 망각 seqKey 엔딩으로. */
  function eraseInit(){
    if(!eraseCanvas){
      eraseCanvas = $("eraseCanvas");
      eraseCtx = eraseCanvas.getContext("2d");
      erasePts = ROAD_PTS.map(p=>({x:p.x,y:p.y}));
      const down=e=>{ eraseDrawing=true; eraseAdd(e); };
      const move=e=>{ if(eraseDrawing){ e.preventDefault(); eraseAdd(e); } };
      const up=()=>{ eraseDrawing=false; };
      eraseCanvas.addEventListener("pointerdown",down);
      eraseCanvas.addEventListener("pointermove",move);
      eraseCanvas.addEventListener("pointerup",up);
      eraseCanvas.addEventListener("pointerleave",up);
      eraseBound=true;
    }
    if(!erasePts.length) erasePts = ROAD_PTS.map(p=>({x:p.x,y:p.y}));
    eraseSize(); eraseRender();
  }
  function eraseSize(){
    if(!eraseCanvas) return;
    eraseCanvas.width = eraseCanvas.clientWidth || 320;
    eraseCanvas.height = 220;
  }
  function eraseAdd(e){
    if(eraseDone || !eraseCanvas) return;
    const r=eraseCanvas.getBoundingClientRect();
    const x=e.clientX-r.left, y=e.clientY-r.top;
    const idx=(erasePts.length-1)-eraseGone;   // 끝에서부터 역순 프런티어
    if(idx>=0){
      const nx=erasePts[idx].x*eraseCanvas.width, ny=erasePts[idx].y*eraseCanvas.height;
      if(Math.hypot(x-nx,y-ny) < 26){ eraseGone++; haptic(10); }
    }
    eraseRender();
    if(eraseGone >= erasePts.length) eraseComplete();
  }
  function eraseComplete(){
    if(eraseDone) return; eraseDone=true; haptic([0,60,30,60,30,90]);
    const rv=$("erase-reveal"); if(rv) rv.classList.add("show");
    eraseRender();
    revealAdvance();
  }
  function eraseReset(){
    eraseGone=0; eraseDone=false;
    const rv=$("erase-reveal"); if(rv) rv.classList.remove("show");
    eraseRender();
  }
  function eraseRender(){
    if(!eraseCtx || !eraseCanvas) return;
    const w=eraseCanvas.width, h=eraseCanvas.height, n=erasePts.length;
    eraseCtx.clearRect(0,0,w,h);
    const frontier=(n-1)-eraseGone;   // 이 인덱스까지 길이 남아 있음(-1이면 다 지워짐)
    eraseCtx.lineWidth=3; eraseCtx.lineCap="round"; eraseCtx.lineJoin="round";
    // 남은 길(황금 실선)
    if(frontier>0){
      eraseCtx.strokeStyle="rgba(227,165,66,.6)";
      eraseCtx.beginPath();
      for(let i=0;i<=frontier;i++){ const p=erasePts[i]; i?eraseCtx.lineTo(p.x*w,p.y*h):eraseCtx.moveTo(p.x*w,p.y*h); }
      eraseCtx.stroke();
    }
    // 지워진 꼬리(흐릿한 잔흔) — 다 지우기 전까지만
    if(frontier < n-1 && !eraseDone){
      const s=Math.max(0,frontier);
      eraseCtx.strokeStyle="rgba(58,70,99,.22)";
      eraseCtx.beginPath();
      for(let i=s;i<n;i++){ const p=erasePts[i]; i===s?eraseCtx.moveTo(p.x*w,p.y*h):eraseCtx.lineTo(p.x*w,p.y*h); }
      eraseCtx.stroke();
    }
    // 점들
    erasePts.forEach((p,i)=>{
      const sx=p.x*w, sy=p.y*h, kept=i<=frontier;
      eraseCtx.beginPath(); eraseCtx.arc(sx,sy, kept?5:3, 0,7);
      eraseCtx.fillStyle = kept ? "#e3a542" : "#222a3d"; eraseCtx.fill();
    });
    // 시작점 ● / 끝 🏙 — 지우기 시작하면 도시는 흐려진다
    const a=erasePts[0], z=erasePts[n-1];
    eraseCtx.save(); eraseCtx.font="16px serif"; eraseCtx.textAlign="center"; eraseCtx.textBaseline="middle";
    if(a && !eraseDone){ eraseCtx.fillStyle="#e3a542"; eraseCtx.fillText("●", a.x*w, a.y*h-14); }
    if(z){ eraseCtx.globalAlpha = eraseGone>0?0.22:1; eraseCtx.fillText("🏙", z.x*w, z.y*h-16); }
    eraseCtx.restore();
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
      if(flameSheltering || flameBtnHold) flameShelter=Math.min(100, flameShelter+flameGain);
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
    flameShelter=0; flameDone=false; flameSheltering=false; flameBtnHold=false; flameGain=levelOpt("flameGain",2.0);
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
    rowCount=0; rowNeed=levelOpt("need",12); rowNext='left'; rowDone=false;
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

const $ = id => document.getElementById(id);
  const setT = (id,t) => { const e=$(id); if(e) e.textContent=t; };
  let CUR = I18N.ko;
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

    setT("t-title",CUR.title); setT("resetBtn",CUR.reset);
    const sub=$("t-subtitle"); if(sub){ sub.textContent=CUR.subtitle||""; sub.style.display=CUR.subtitle?"":"none"; }
    // 트릭 chrome (레벨 콘텐츠는 매니페스트 → registry bind 가 담당)
    setT("sensorBtn",CUR.sensor); setT("gauge",CUR.gaugeInit);
    setT("windBtn",CUR.l4windBtn); setT("oarBtn",CUR.l4oar); setT("windGauge",CUR.l4windPrefix+"0%");
    setT("routeClearBtn",CUR.l5clear);
    setT("shelterBtn",CUR.l6shelterBtn); setT("flameGauge",CUR.l6shelterPrefix+"0%");
    setT("rowGauge",CUR.l7rowPrefix+"0%");
    setT("fwBtn",CUR.l8btn); fwShow();
    setT("done-title",CUR.doneTitle); setT("done-end",CUR.doneEnd);
    $("done-body").innerHTML = CUR.doneBody;
    document.querySelectorAll(".confirmBtn").forEach(b=>b.textContent=CUR.confirm);
    ["in1","in2","in3","in5"].forEach(id=>{ const e=$(id); if(e) e.placeholder=CUR.placeholder; });
    document.querySelectorAll(".langbar button").forEach(b=>
      b.classList.toggle("on", b.dataset.lang===lang));
    // 현재 활성 레벨 콘텐츠 재바인딩(언어 토글 반영)
    const _l=RUN.scenario.levels.find(x=>x.sec===ORDER[curIdx]);
    if(_l && TRICKS[_l.trick] && TRICKS[_l.trick].bind) TRICKS[_l.trick].bind(_l);
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
  const ORDER = RUN.scenario.levels.map(l=>l.sec).concat("done");
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
    farewell: { init:fwInit, bind:(lv)=>{ const t=lv.text||{};
      setT("l8-tag",CUR[t.tag]); setT("l8-hint",CUR[t.hint]); } },
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
  }
  function advance(){ show(curIdx+1); }
  function loadProgress(){ return scenarioState().step || 0; }

  /* ===== L4/L5 상태 — show()/resetLevels보다 먼저 선언(TDZ 방지) ===== */
  let audioCtx=null, micStream=null, micRaf=null, sailDone=false, oarFill=0;
  let routeCanvas=null, routeCtx=null, routeStars=[], routeStroke=[], routeDrawing=false, routeDone=false;
  let flameShelter=0, flameDone=false, flameSheltering=false, flameBtnHold=false, flameRaf=null, flameBox=null;
  let rowCount=0, rowNeed=12, rowNext='left', rowDone=false, rowBound=false;
  let tiltGotEvent=false, tiltBound=false, tiltTimer=null;
  let fwStep=0, fwDone=false, fwBound=false;

  /* 다시하기: 진행뿐 아니라 각 레벨의 일시적 UI 상태까지 초기화 */
  function resetLevels(){
    $("pressBox").classList.remove("lit");            // L1
    $("tiltBox").classList.remove("show");            // L3
    { const tf=$("tiltFallback"); if(tf) tf.style.display="none"; tiltGotEvent=false; }
    $("gauge").textContent = CUR.gaugeInit;
    sailDone=false; oarFill=0; setSail(0,0);          // L4
    $("windBtn").style.display=""; $("oarBtn").style.display="none";
    routeReset();                                     // L5
    flameReset();                                     // L6
    rowReset();                                       // L7
    fwReset();                                         // L8 작별
    ["in1","in2","in3","in5"].forEach(id=>{ const e=$(id); if(e) e.value=""; });
    ["msg1","msg2","msg3","msg5"].forEach(id=>{ const e=$(id); if(e){ e.textContent=""; e.className="msg"; } });
  }

  /* ===== 초기화 ===== */
  applyLang(detectLang());
  show(loadProgress());
  $("resetBtn").addEventListener("click",()=>{
    stopMic(); resetLevels();
    const _st=scenarioState(); _st.step=0; _st.cleared=false; persist(); show(0);
  });

  /* ===== LEVEL 1 — 길게 누르기(600ms) ===== */
  (function(){
    const box=$("pressBox"); let t=null;
    const start=e=>{ t=setTimeout(()=>{ box.classList.add("lit"); haptic(20); },600); };
    const end=e=>{ clearTimeout(t); };
    box.addEventListener("touchstart",start,{passive:true});
    box.addEventListener("touchend",end);
    box.addEventListener("mousedown",start);
    box.addEventListener("mouseup",end);
    box.addEventListener("mouseleave",end);
  })();

  /* ===== LEVEL 3 — 기울이기(deviceorientation) + 슬라이더 폴백(몰입형 미러) ===== */
  function tiltReveal(){ const b=$("tiltBox"); if(!b.classList.contains("show")) haptic(20); b.classList.add("show"); }
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
    $("windGauge").textContent = CUR.l4windPrefix + Math.round(fill) + "%";
  }
  function stopMic(){
    if(micRaf){ cancelAnimationFrame(micRaf); micRaf=null; }
    if(micStream){ micStream.getTracks().forEach(t=>t.stop()); micStream=null; }
    if(audioCtx){ try{ audioCtx.close(); }catch(e){} audioCtx=null; }
  }
  function sailComplete(msg){
    if(sailDone) return; sailDone=true; haptic([0,80,40,120]);
    $("windGauge").textContent = msg || CUR.l4set;
    stopMic();
    setTimeout(advance, 800);   // lv4 → lv5
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
    $("flameGauge").textContent = CUR.l6set;
    flameStop();
    setTimeout(advance, 1000);              // lv6 → done
  }
  function flameReset(){
    flameShelter=0; flameDone=false; flameSheltering=false; flameBtnHold=false;
    const ff=$("flameFill"); if(ff) ff.style.width="0%";
    const fl=$("flame"); if(fl){ fl.classList.remove("steady"); fl.style.opacity=""; }
    const fg=$("flameGauge"); if(fg) fg.textContent=CUR.l6shelterPrefix+"0%";
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
    $("rowGauge").textContent = CUR.l7set;
    setTimeout(advance, 1000);                  // lv7 → done
  }
  function rowReset(){
    rowCount=0; rowNext='left'; rowDone=false;
    const f=$("rowFill"); if(f) f.style.width="0%";
    ["oarL","oarR"].forEach(id=>{ const o=$(id); if(o) o.classList.remove("stroke","next"); });
    if($("rowGauge")) rowRender();
  }
  function rowInit(){
    if(!rowBound){
      rowBound=true;
      $("oarL").addEventListener("pointerdown",e=>{ e.preventDefault(); rowStroke('left'); });
      $("oarR").addEventListener("pointerdown",e=>{ e.preventDefault(); rowStroke('right'); });
    }
    rowRender();
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
  function fwAdvanceBeat(){
    if(fwDone) return;
    fwStep++;
    if(fwStep < CUR.l8lines.length){
      haptic(25); fwShow();
    } else {
      fwDone=true; haptic([0,110,60,160]);
      setT("l8-line", CUR.l8end);
      const sc=$("fwScene"); if(sc) sc.textContent = "🌅";
      const b=$("fwBtn"); if(b) b.style.display="none";
      setTimeout(advance, 2400);              // lv8 → done(코다)
    }
  }
  function fwReset(){
    fwStep=0; fwDone=false;
    const b=$("fwBtn"); if(b) b.style.display="";
    fwShow();
  }
  function fwInit(){
    if(!fwBound){
      fwBound=true;
      const btn=$("fwBtn"); let t=null;
      const start=()=>{ clearTimeout(t); t=setTimeout(fwAdvanceBeat, 700); };
      const end=()=>{ clearTimeout(t); };
      btn.addEventListener("pointerdown",e=>{ e.preventDefault(); start(); });
      btn.addEventListener("pointerup",end);
      btn.addEventListener("pointerleave",end);
    }
    fwShow();
  }

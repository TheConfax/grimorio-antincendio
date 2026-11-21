/* Salvataggio online del Grimorio.
   Ogni dispositivo, dalla prima apertura, ha un suo utente online (un "gruppo") e ci salva i progressi.
   Due dispositivi si collegano con un QR: il gruppo più grande assorbe il più piccolo (a parità vince chi mostra il QR),
   e il gruppo assorbito lascia un rimando così gli altri suoi dispositivi lo seguono da soli. */
(function(){
"use strict";
if(window.NOAPP)return;
const API="https://rdoohwdwqkwllqspgnby.supabase.co/rest/v1/rpc/",KEY="sb_publishable_xbEaA0Fw18HxwigWEg76GQ_Kdytbh81";
const BASE=new URL(".",document.currentScript.src).href;
const DATA=["qa3for_grimorio","qa3for_sess","qa3for_homey","grimorio_letti","grimorio_pos","gq_last"];
const MERGE=["gs_base","gs_mine","gs_last","gs_lt"];
const L=localStorage;
const get=(k,d)=>{try{const v=L.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}};
const set=(k,v)=>{try{L.setItem(k,JSON.stringify(v))}catch(e){}};
const del=k=>{try{L.removeItem(k)}catch(e){}};
const rid=n=>{const a=new Uint8Array(n);crypto.getRandomValues(a);return Array.from(a,b=>b.toString(16).padStart(2,"0")).join("")};
const dev=()=>{let d=get("gs_dev",null);if(!d){d=rid(8);set("gs_dev",d)}return d};
const gid=()=>get("gs_id",null);
function newGroup(){set("gs_id",rid(24));set("gs_wipe",0);del("gs_n");del("gs_at")}
if(!gid())newGroup();

function rpc(fn,body,keep){
  return fetch(API+fn,{method:"POST",keepalive:!!keep,headers:{apikey:KEY,"Content-Type":"application/json"},body:JSON.stringify(body)})
    .then(r=>r.text().then(t=>{let j=null;try{j=t?JSON.parse(t):null}catch(e){}if(!r.ok)throw new Error((j&&j.message)||("errore "+r.status));return j}));
}

/* Porta nel proprio registro le novità locali dall'ultimo salvataggio.
   Alla primissima volta le risposte vecchie non hanno un'ora vera: restano segnate come "ora sconosciuta". */
function absorb(now){
  const first=get("gs_base",null)===null;
  const st=get("qa3for_grimorio",{}),base=get("gs_base",{}),mine=get("gs_mine",{}),last=get("gs_last",{});
  for(const n in st){
    const a=st[n]||{},b=base[n]||{},dr=(a.r||0)-(b.r||0),dw=(a.w||0)-(b.w||0);
    if(dr>0||dw>0){const m=mine[n]||[0,0];m[0]+=Math.max(0,dr);m[1]+=Math.max(0,dw);mine[n]=m;last[n]=first?[a.l?1:0,now,1]:[a.l?1:0,now]}
  }
  const on=new Set(get("grimorio_letti",[]).map(String)),lt=get("gs_lt",{});
  on.forEach(c=>{if(!(lt[c]&&lt[c][0]===1))lt[c]=[1,now]});
  for(const c in lt)if(lt[c][0]===1&&!on.has(c))lt[c]=[0,now];
  set("gs_mine",mine);set("gs_last",last);set("gs_lt",lt);
}

function clearLocal(){DATA.concat(MERGE).forEach(del)}

/* Ultima risposta di una domanda: vince la più recente; se una delle due ha l'ora sconosciuta
   e non è sicuramente più vecchia dell'altra, e non sono d'accordo, vince la rossa. */
function pickLast(a,x){
  if(!x)return a;if(!a)return x;
  const fa=!!a[2],fx=!!x[2];
  if(!fa&&!fx)return x[1]>a[1]?x:a;
  if(fa!==fx){const real=fa?x:a,unk=fa?a:x;if(real[1]>unk[1])return real}
  return[Math.min(a[0],x[0]),Math.max(a[1],x[1]),1];
}
const norm=R=>{R=R&&R.v?R:{v:1,wiped:0,dev:{},last:{},lt:{}};R.dev=R.dev||{};R.last=R.last||{};R.lt=R.lt||{};R.wiped=R.wiped||0;return R};
/* Unisce il gruppo G dentro W. */
function mergeGroups(W,G){
  for(const d in G.dev)if(!W.dev[d]||(W.dev[d].t||0)<(G.dev[d].t||0))W.dev[d]=G.dev[d];
  for(const n in G.last)W.last[n]=pickLast(W.last[n],G.last[n]);
  for(const c in G.lt)if(!W.lt[c]||W.lt[c][1]<G.lt[c][1])W.lt[c]=G.lt[c];
  return W;
}
const count=R=>Object.keys(R.dev).filter(d=>!R.dev[d].gone).length;

/* Unisce i dati remoti con quelli locali e riscrive la copia locale. */
function merge(R0){
  let R=norm(R0),myW=get("gs_wipe",0),wiped=false;
  if(myW===-1){myW=R.wiped;set("gs_wipe",myW)}
  if(R.wiped>myW){clearLocal();set("gs_base",{});set("gs_wipe",R.wiped);wiped=true}
  else if(myW>R.wiped)R={v:1,wiped:myW,dev:{},last:{},lt:{}};
  absorb(Date.now());
  R.dev[dev()]={q:get("gs_mine",{}),t:Date.now()};
  mergeGroups(R,{dev:{},last:get("gs_last",{}),lt:get("gs_lt",{})});
  const st={};
  for(const d in R.dev){const q=R.dev[d].q||{};for(const n in q){const s=st[n]||(st[n]={r:0,w:0});s.r+=q[n][0]||0;s.w+=q[n][1]||0}}
  for(const n in st){if(R.last[n])st[n].l=R.last[n][0];else if(!(st[n].r+st[n].w))delete st[n]}
  const on=Object.keys(R.lt).filter(c=>R.lt[c][0]===1).map(Number).sort((a,b)=>a-b);
  set("qa3for_grimorio",st);set("gs_base",st);set("gs_last",R.last);set("gs_lt",R.lt);set("grimorio_letti",on);
  return {R,wiped};
}

let chain=Promise.resolve(),state="idle",timer=0;
const emit=()=>dispatchEvent(new CustomEvent("gs:status"));
function run(hop){
  const id=gid();state="busy";emit();
  return rpc("sync_get",{p_id:id}).then(R0=>{
    if(gid()!==id)return;
    if(R0&&R0.moved){if((hop||0)<4){set("gs_id",R0.moved);set("gs_wipe",-1);return run((hop||0)+1)}throw new Error("rimandi")}
    const {R,wiped}=merge(R0);
    set("gs_n",count(R));
    dispatchEvent(new CustomEvent("gs:update"));
    return rpc("sync_put",{p_id:id,p_data:R}).then(()=>{set("gs_at",Date.now());state="ok";emit();if(wiped)location.reload()});
  }).catch(()=>{state="err";emit()});
}
const sync=()=>(chain=chain.then(()=>run(),()=>run()));
const soon=()=>{clearTimeout(timer);timer=setTimeout(sync,1500)};

/* "Cancella tutti i dati": cancella qui e su tutti i dispositivi del gruppo. */
function wipeAll(){
  clearLocal();
  const t=Date.now(),id=gid();set("gs_wipe",t);set("gs_base",{});
  /* i dispositivi restano nel gruppo, con i conteggi azzerati */
  const put=R=>{const dev={};R=norm(R);for(const d in R.dev)if(!R.dev[d].gone)dev[d]={q:{},t};return rpc("sync_put",{p_id:id,p_data:{v:1,wiped:t,dev,last:{},lt:{}}},true)};
  return Promise.race([rpc("sync_get",{p_id:id}),new Promise((_,ko)=>setTimeout(ko,3000))]).then(put,()=>put(null)).catch(()=>{});
}

/* Collega questo dispositivo (gruppo mio) con il gruppo di chi ha mostrato il QR (other):
   il gruppo con più dispositivi assorbe l'altro; a parità vince chi ha mostrato il QR. */
function join(other){
  return sync().then(()=>{
    if(state==="err")throw new Error("rete");
    const mineId=gid();
    const follow=(id,h)=>rpc("sync_get",{p_id:id}).then(R=>R&&R.moved&&h<4?follow(R.moved,h+1):[id,R]);
    return Promise.all([follow(other,0),follow(mineId,0)]).then(([[oId,RO],[mId,RM]])=>{
      if(oId===mId)return"same";
      RO=norm(RO);RM=norm(RM);
      const [wId,W,lId,G]=count(RM)>count(RO)?[mId,RM,oId,RO]:[oId,RO,mId,RM];
      mergeGroups(W,G);
      return rpc("sync_put",{p_id:wId,p_data:W})
        .then(()=>rpc("sync_put",{p_id:lId,p_data:{moved:wId}}))
        .then(()=>{if(gid()!==wId){set("gs_id",wId);set("gs_wipe",-1)}return sync()}).then(()=>"ok");
    });
  });
}

/* Scollega: questo dispositivo esce dal gruppo (che lo conta come uscito, ma tiene le sue risposte)
   e riparte con un utente tutto suo, con le risposte date da lui. */
function unlink(){
  clearTimeout(timer);timer=0;
  const old=gid(),me=dev();
  rpc("sync_get",{p_id:old}).then(R=>{if(R&&R.v&&R.dev&&R.dev[me]){R.dev[me].gone=1;return rpc("sync_put",{p_id:old,p_data:R})}}).catch(()=>{});
  newGroup();state="idle";paintBox();sync();
}

addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")sync();else if(timer){clearTimeout(timer);timer=0;sync()}});
addEventListener("online",sync);
addEventListener("pageshow",e=>{if(e.persisted)sync()});

/* ---------- Pulsanti e pecetta (nel pannello dell'ingranaggio, box #gsBox) ---------- */
/* sul telefono il pulsante principale è Inquadra, sul computer Mostra */
const phone=()=>matchMedia("(pointer:coarse)").matches;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const loadLib=f=>new Promise((ok,ko)=>{if((f==="qrcode"&&window.qrcode)||(f==="jsQR"&&window.jsQR))return ok();const s=document.createElement("script");s.src=BASE+"lib/"+(f==="qrcode"?"qrcode.min.js":"jsQR.min.js");s.onload=ok;s.onerror=()=>ko(new Error("lib"));document.head.appendChild(s)});
const I={
  phone:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10.5 18.5h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  qr:'<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2"/></g><g fill="currentColor"><rect x="14" y="14" width="2.6" height="2.6" rx=".5"/><rect x="17.9" y="17.9" width="2.6" height="2.6" rx=".5"/><rect x="17.9" y="14" width="2.6" height="2.6" rx=".5"/><rect x="14" y="17.9" width="2.6" height="2.6" rx=".5"/></g></svg>',
  cam:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3v10H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="13.3" r="3.3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  x:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>'
};
function ago(t){
  if(!t)return"";const s=(Date.now()-t)/1e3;
  if(s<60)return"sync adesso";if(s<3600){const m=Math.floor(s/60);return`sync ${m} min fa`}
  const d=new Date(t),n=new Date(),hm=d.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});
  return d.toDateString()===n.toDateString()?`sync alle ${hm}`:`sync il ${d.toLocaleDateString("it-IT",{day:"numeric",month:"numeric"})} alle ${hm}`;
}
function paintBox(){
  const box=document.getElementById("gsBox");if(!box)return;
  const n=get("gs_n",0),what=state==="busy"||!get("gs_at",0)?"sync in corso…":state==="err"?"offline":esc(ago(get("gs_at",0)));
  const who=n?(n===1?"1 dispositivo":n+" dispositivi"):"";
  box.innerHTML=`<button type="button" class="gsst${n>1?"":" solo"}" data-gs="unlink">${I.phone}<span class="gsw">${who?`<span>${who}</span><span class="gsdot">&nbsp;·&nbsp;</span>`:""}<span>${what}</span></span></button>`
    +`<div class="gsbtns"><button class="btn${phone()?" ghost":""} gsb" data-gs="show">${I.qr}Mostra QR</button><button class="btn${phone()?"":" ghost"} gsb" data-gs="scan">${I.cam}Inquadra QR</button></div>`;
  /* se non ci sta su una riga (senza passare sotto lo gnomo) va su due righe, spezzata sul puntino */
  const st=box.querySelector(".gsst");if(st&&st.clientWidth&&st.scrollWidth>st.clientWidth+1)st.classList.add("two");
}
addEventListener("gs:status",()=>{if(!document.querySelector('#gsBox [data-sure]'))paintBox()});
setInterval(()=>{if(state==="ok"&&!document.querySelector('#gsBox [data-sure]'))paintBox()},30e3);

function overlay(html){
  const o=document.createElement("div");o.className="gsov";o.innerHTML=`<div class="gscard" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(o);document.documentElement.classList.add("gslock");
  o.close=()=>{o.remove();if(!document.querySelector(".gsov:not([hidden])"))document.documentElement.classList.remove("gslock")};return o;
}
const OK='<h3>Collegato!</h3><p class="gsok">✓</p><p class="gsmsg">Ora i progressi si salvano su tutti i dispositivi collegati.</p>';

function showQR(){
  const o=overlay(`<h3>Collega un dispositivo</h3><div class="gsqr"><p class="gsmute">Preparo il codice…</p></div><p class="gsmsg">Sull'altro dispositivo apri il Grimorio, vai su <b>Quiz</b>, tocca l'ingranaggio e poi <b>Inquadra QR</b>.</p><p class="gsmute gsleft"></p><button class="btn ghost gsx" data-gs="close">${I.x}Chiudi</button>`);
  let tick=0,poll=0;
  const stop=()=>{clearInterval(tick);clearInterval(poll)};
  o.addEventListener("click",e=>{const b=e.target.closest("[data-gs]");if(!b)return;if(b.dataset.gs==="close"){stop();o.close();paintBox()}else if(b.dataset.gs==="again"){stop();make()}});
  const done=()=>{stop();o.querySelector(".gscard").innerHTML=OK;sync().then(()=>setTimeout(()=>{o.close();paintBox()},1500))};
  const make=()=>{
    const q=o.querySelector(".gsqr"),left=o.querySelector(".gsleft");q.innerHTML='<p class="gsmute">Preparo il codice…</p>';left.textContent="";
    let devs=0;const id0=()=>gid();
    Promise.all([loadLib("qrcode"),sync()]).then(()=>{if(state==="err")throw new Error("rete");return rpc("sync_get",{p_id:gid()})}).then(R=>{
      devs=count(norm(R));
      return rpc("pair_create",{p_id:gid()});
    }).then(code=>{
      const qr=qrcode(0,"M");qr.addData("GRIMORIO:"+code);qr.make();
      q.innerHTML=qr.createSvgTag({cellSize:6,margin:3,scalable:true});
      const end=Date.now()+5*60e3,mine=id0();
      const t=()=>{const s=Math.max(0,Math.round((end-Date.now())/1e3));
        if(!s){stop();q.innerHTML='<p class="gsmute">Codice scaduto</p>';left.innerHTML=`<button class="btn gsagain" data-gs="again">Nuovo codice</button>`;return}
        left.textContent=`Il codice vale ancora ${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`};
      t();tick=setInterval(t,1000);
      /* si è collegato qualcuno se il mio gruppo ha più dispositivi o se è stato assorbito da un altro */
      poll=setInterval(()=>{rpc("sync_get",{p_id:mine}).then(R=>{if(R&&(R.moved||count(norm(R))>devs))done()}).catch(()=>{})},2500);
    }).catch(()=>{q.innerHTML='<p class="gsmute">Non riesco a collegarmi a internet.</p>';left.innerHTML=`<button class="btn gsagain" data-gs="again">Riprova</button>`});
  };
  make();
}

function scanQR(){
  const o=overlay(`<h3>Inquadra il QR</h3><div class="gscam"><video playsinline muted autoplay></video></div><p class="gsmsg">Inquadra il QR che compare sull'altro dispositivo dopo aver toccato <b>Mostra QR</b>.</p><button class="btn ghost gsx" data-gs="close">${I.x}Annulla</button>`);
  const v=o.querySelector("video"),c=document.createElement("canvas"),x=c.getContext("2d",{willReadFrequently:true});
  let stream=null,raf=0,done=false;
  const stop=()=>{done=true;cancelAnimationFrame(raf);if(stream)stream.getTracks().forEach(t=>t.stop())};
  const say=(h,m)=>{o.querySelector(".gscard").innerHTML=`<h3>${h}</h3>${m}<button class="btn ghost gsx" data-gs="close">${I.x}Chiudi</button>`};
  o.addEventListener("click",e=>{const b=e.target.closest("[data-gs]");if(b&&b.dataset.gs==="close"){stop();o.close();paintBox()}});
  const found=code=>{
    stop();say("Collego…",'<p class="gsmute">Un attimo.</p>');
    rpc("pair_claim",{p_code:code}).then(other=>{
      if(!other){say("Codice scaduto",'<p class="gsmsg">Questo codice è scaduto o è già stato usato. Sull\'altro dispositivo tocca <b>Nuovo codice</b> e riprova.</p>');return}
      return join(other).then(r=>{
        if(r==="same")say("Già collegati",'<p class="gsmsg">Questi due dispositivi sono già nello stesso gruppo.</p>');
        else{o.querySelector(".gscard").innerHTML=OK;setTimeout(()=>{o.close();paintBox()},1500)}
      });
    }).catch(()=>say("Niente rete",'<p class="gsmsg">Non riesco a collegarmi a internet. Riprova quando c\'è rete.</p>'));
  };
  const loop=()=>{
    if(done)return;
    if(v.readyState>=2&&v.videoWidth){
      const k=Math.min(1,640/Math.max(v.videoWidth,v.videoHeight)),w=c.width=Math.round(v.videoWidth*k),h=c.height=Math.round(v.videoHeight*k);
      x.drawImage(v,0,0,w,h);const r=jsQR(x.getImageData(0,0,w,h).data,w,h,{inversionAttempts:"dontInvert"});
      if(r&&/^GRIMORIO:[0-9a-f]{32}$/.test(r.data))return found(r.data.slice(9));
    }
    raf=requestAnimationFrame(loop);
  };
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){say("Fotocamera non disponibile",'<p class="gsmsg">Da qui non riesco a usare la fotocamera.</p>');return}
  Promise.all([loadLib("jsQR"),navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false})]).then(([,s])=>{
    if(done){s.getTracks().forEach(t=>t.stop());return}
    stream=s;v.srcObject=s;v.play().catch(()=>{});loop();
  }).catch(e=>{
    if(e&&e.name==="NotAllowedError")say("Serve la fotocamera",'<p class="gsmsg">Per inquadrare il QR devi consentire l\'accesso alla fotocamera. Chiudi e riprova, poi tocca <b>Consenti</b>.</p>');
    else say("Fotocamera non disponibile",'<p class="gsmsg">Non riesco ad aprire la fotocamera.</p>');
  });
}

document.addEventListener("click",e=>{
  const b=e.target.closest("#gsBox [data-gs]"),u=document.querySelector('#gsBox [data-gs="unlink"][data-sure]');
  if(u&&u!==b)paintBox();
  if(!b)return;
  if(b.dataset.gs==="show")showQR();else if(b.dataset.gs==="scan")scanQR();
  else if(b.dataset.gs==="unlink"&&get("gs_n",0)>1){if(b.dataset.sure)unlink();else{b.dataset.sure=1;b.classList.remove("two");b.lastElementChild.textContent="Scollega dal gruppo?"}}
});

window.GS={sync,soon,wipeAll,join,paint:paintBox};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",paintBox);else paintBox();
sync();
})();

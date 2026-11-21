/* Su telefoni e tablet il Grimorio si usa solo dall'icona nella schermata Home:
   aperto nel browser mostra come installarlo, perché lì i progressi finirebbero in un posto separato.
   Sui computer non blocca niente. */
(function(){try{
  if(!matchMedia("(pointer:coarse)").matches)return;
  if(navigator.standalone||matchMedia("(display-mode: standalone)").matches||matchMedia("(display-mode: fullscreen)").matches)return;
  window.NOAPP=true;
  var base=new URL(".",document.currentScript.src).href,ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
  var share='<svg viewBox="0 0 20 24" aria-hidden="true"><path d="M10 2v13M6 6l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 9.5H4.5v12h11v-12H13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  var add='<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2" y="2" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 6v8M6 10h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  var steps=ios
    ?'<li><span class="n">1</span><span>In Safari tocca <b>···</b>, poi <b>Condividi</b> '+share+'</span></li><li><span class="n">2</span><span>Scorri, scegli <b>Aggiungi alla schermata Home</b> '+add+' e poi <b>Aggiungi</b></span></li><li><span class="n">3</span><span>Apri il Grimorio dalla sua icona</span></li>'
    :'<li><span class="n">1</span><span>Apri il menu <b>⋮</b> del browser</span></li><li><span class="n">2</span><span>Scegli <b>Installa app</b> o <b>Aggiungi a schermata Home</b></span></li><li><span class="n">3</span><span>Apri il Grimorio dalla sua icona</span></li>';
  var css=document.createElement("style");
  css.textContent='html.noapp{color-scheme:light dark;background:light-dark(#efe5cf,#171c15)}html.noapp body>*:not(#noapp){display:none!important}html.noapp body{margin:0;background:light-dark(#efe5cf,#171c15)}'
   +'#noapp{min-height:100svh;display:grid;place-items:center;padding:28px 22px calc(28px + env(safe-area-inset-bottom));box-sizing:border-box;font:16.5px/1.5 Nunito,system-ui,sans-serif;color:light-dark(#2e251a,#ece2cc);text-align:center}'
   +'#noapp .in{max-width:360px}#noapp img{width:104px;height:104px;border-radius:24px;box-shadow:0 12px 30px -12px #0008}'
   +'#noapp h1{margin:22px 0 8px;font:700 34px/1.1 Caveat,cursive;color:light-dark(#7b4f30,#d39b6c)}#noapp p{margin:0 0 22px;color:light-dark(#6b5a44,#b8ab92)}'
   +'#noapp ol{list-style:none;margin:0;padding:0;display:grid;gap:10px;text-align:left}#noapp li{display:flex;align-items:center;gap:12px;background:light-dark(#fffaf0,#262f21);border:1px solid light-dark(#d8c9a8,#3b4532);border-radius:8px;padding:12px 14px}'
   +'#noapp .n{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;border:1.5px solid light-dark(#4d6a35,#93b56e);color:light-dark(#4d6a35,#93b56e);font-weight:800}'
   +'#noapp li svg{width:18px;height:20px;vertical-align:-4px;color:light-dark(#255b7c,#9ccbe8)}';
  document.documentElement.classList.add("noapp");document.head.appendChild(css);
  var show=function(){if(document.getElementById("noapp"))return;var d=document.createElement("div");d.id="noapp";
    d.innerHTML='<div class="in"><img src="'+base+'icons/grimorio-180.png" alt=""><h1>Aprimi dalla Home</h1><p>Il Grimorio salva i tuoi progressi solo nella sua app, non nel browser.</p><ol>'+steps+'</ol></div>';
    document.body.appendChild(d)};
  if(document.body)show();else document.addEventListener("DOMContentLoaded",show);
}catch(e){}})();

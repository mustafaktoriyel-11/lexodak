/* Hukukçunun Ufku · 3B yol sahnesi
   Günler, görseldeki yolun üstünde perspektife göre dizilmiş levhalardır.
   Bugün odakta; geçmiş yakında (aşağıda), gelecek uzakta (tapınağa doğru).
   Sürükleme parmağı izler: yolu yukarı it = geçmişe, aşağı çek = ileriye. */
(function(){
  'use strict';
  var IW=2431,IH=1512,VPX=.5,VPY=.528,TY=640/1512;   /* TY: tapınağın ortası */     /* görseldeki kaçış noktası */
  var ZF=1.75,ARA=1;                        /* odak derinliği, günler arası mesafe */
  function esc(x){return String(x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function az(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}}
  var TIK='<path class="lv-ic" d="M34 64 l10 10 l20 -22" fill="none" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>';
  var KIL='<g class="lv-kil" transform="translate(36 46)"><rect x="2" y="14" width="24" height="20" rx="4"/><path d="M7 14 v-5 a7 7 0 0 1 14 0 v5" fill="none" stroke-width="4.5" stroke-linecap="round"/></g>';
  function levha(g){
    var ic='';
    if(g.t==='tam'||g.t==='gec'||g.t==='bugunTam')ic=TIK;
    else if(g.t==='bos')ic='<path class="lv-ic" d="M38 66 h24" stroke-width="6" stroke-linecap="round"/>';
    else if(g.t==='bugun')ic='<text class="lv-rom" x="50" y="80" text-anchor="middle">'+esc(g.rom)+'</text>';
    else ic=KIL;
    return '<svg viewBox="0 0 100 120" aria-hidden="true"><path class="lv-gv" d="M8 116 V34 A42 30 0 0 1 92 34 V116 Z" stroke-width="4"/><path class="lv-tb" d="M2 116 h96" stroke-width="5" stroke-linecap="round"/>'+ic+'</svg>';
  }
  /* G: [{k, t:'tam'|'gec'|'bos'|'bugun'|'bugunTam'|'kilit', lab, alt, aria, rom}] ; hk: bugünün k'si */
  function html(G,ust){
    var o='<div class="uf-sahne" tabindex="0" role="group" aria-label="Günlerin yolu. Önceki ve sonraki gün düğmeleriyle ya da yukarı aşağı sürükleyerek gezin.">'+
      '<div class="uf-s-bg" aria-hidden="true"><img class="uf-s-gun" src="img/ufuk-duz.webp" alt="" draggable="false"><img class="uf-s-gece" src="img/ufuk-gece.webp" alt="" draggable="false"><svg class="uf-s-yazi" viewBox="0 0 2431 1512" aria-hidden="true"><g class="uf-tapinak"><rect class="tp-c" x="1134" y="697" width="160" height="7"/><rect class="tp-b" x="1140" y="691" width="150" height="6.5"/><rect class="tp-a" x="1140" y="691" width="150" height="1.6"/><rect class="tp-d" x="1150" y="640" width="130" height="51"/><rect class="tp-e" x="1208" y="652" width="13" height="39"/><rect class="tp-b" x="1145.5" y="640" width="11" height="50"/><rect class="tp-c" x="1153.5" y="640" width="3" height="50"/><rect class="tp-a" x="1147.0" y="640" width="2.4" height="50"/><rect class="tp-a" x="1142.5" y="633.5" width="17" height="4"/><rect class="tp-b" x="1144.5" y="637.5" width="13" height="3"/><rect class="tp-b" x="1143.5" y="686.5" width="15" height="4.5"/><rect class="tp-b" x="1169.5" y="640" width="11" height="50"/><rect class="tp-c" x="1177.5" y="640" width="3" height="50"/><rect class="tp-a" x="1171.0" y="640" width="2.4" height="50"/><rect class="tp-a" x="1166.5" y="633.5" width="17" height="4"/><rect class="tp-b" x="1168.5" y="637.5" width="13" height="3"/><rect class="tp-b" x="1167.5" y="686.5" width="15" height="4.5"/><rect class="tp-b" x="1194.5" y="640" width="11" height="50"/><rect class="tp-c" x="1202.5" y="640" width="3" height="50"/><rect class="tp-a" x="1196.0" y="640" width="2.4" height="50"/><rect class="tp-a" x="1191.5" y="633.5" width="17" height="4"/><rect class="tp-b" x="1193.5" y="637.5" width="13" height="3"/><rect class="tp-b" x="1192.5" y="686.5" width="15" height="4.5"/><rect class="tp-b" x="1223.5" y="640" width="11" height="50"/><rect class="tp-c" x="1231.5" y="640" width="3" height="50"/><rect class="tp-a" x="1225.0" y="640" width="2.4" height="50"/><rect class="tp-a" x="1220.5" y="633.5" width="17" height="4"/><rect class="tp-b" x="1222.5" y="637.5" width="13" height="3"/><rect class="tp-b" x="1221.5" y="686.5" width="15" height="4.5"/><rect class="tp-b" x="1249.0" y="640" width="11" height="50"/><rect class="tp-c" x="1257.0" y="640" width="3" height="50"/><rect class="tp-a" x="1250.5" y="640" width="2.4" height="50"/><rect class="tp-a" x="1246.0" y="633.5" width="17" height="4"/><rect class="tp-b" x="1248.0" y="637.5" width="13" height="3"/><rect class="tp-b" x="1247.0" y="686.5" width="15" height="4.5"/><rect class="tp-b" x="1272.5" y="640" width="11" height="50"/><rect class="tp-c" x="1280.5" y="640" width="3" height="50"/><rect class="tp-a" x="1274.0" y="640" width="2.4" height="50"/><rect class="tp-a" x="1269.5" y="633.5" width="17" height="4"/><rect class="tp-b" x="1271.5" y="637.5" width="13" height="3"/><rect class="tp-b" x="1270.5" y="686.5" width="15" height="4.5"/><rect class="tp-b" x="1143" y="621" width="144" height="12.5"/><rect class="tp-c" x="1143" y="630.5" width="144" height="3"/><rect class="tp-a" x="1143" y="621" width="144" height="2"/><rect class="tp-c" x="1139" y="616.5" width="152" height="4.5"/><rect class="tp-a" x="1137" y="610.5" width="156" height="6.5"/><path class="tp-a" d="M1142 611 L1215 584 L1288 611 Z"/><path class="tp-b" d="M1156 609 L1215 589.5 L1274 609 Z"/><path class="tp-c" d="M1158 609 L1272 609 L1270 607.4 L1160 607.4 Z"/><path class="tp-a" d="M1136 611 L1139 603 L1147 611 Z M1294 611 L1291 603 L1283 611 Z M1211 586 L1215 580 L1219 586 Z"/></g><text x="1215" y="606.6" text-anchor="middle">IVSTITIA</text></svg></div>'+
      '<div class="uf-s-sis" aria-hidden="true"></div>'+(ust||'')+'<div class="uf-s-lv">';
    G.forEach(function(g,n){o+='<button type="button" class="uf-lv t-'+g.t+'" data-n="'+n+'" aria-label="'+esc(g.aria)+'" tabindex="-1">'+levha(g)+'<span class="uf-lv-et">'+esc(g.lab)+'<small>'+esc(g.alt)+'</small></span></button>';});
    return o+'</div></div>';
  }
  /* kap: .uf-sahne öğesi; G: günler; i0: başlangıç odağı (G içindeki sıra); degis(n): odak değişince */
  function bagla(kap,G,i0,degis,dokun){
    var bg=kap.querySelector('.uf-s-bg'),img=kap.querySelector('.uf-s-gun'),EL=[].slice.call(kap.querySelectorAll('.uf-lv'));
    var W=0,H=0,s0=1,ox=0,oy=0,vx=0,vy=0,c=i0,hedef=i0,akan=false,AZ=az();
    function olc(){W=kap.clientWidth;H=kap.clientHeight;if(!W||!H)return;s0=Math.max(W/IW,H/IH)*1.02;
      vx=W/2;vy=H*.44;ox=vx-VPX*IW*s0;oy=vy-VPY*IH*s0;
      oy=Math.min(0,Math.max(H-IH*s0,oy));vy=oy+VPY*IH*s0;ox=Math.min(0,Math.max(W-IW*s0,ox));vx=ox+VPX*IW*s0;
      bg.style.width=IW*s0+'px';bg.style.height=IH*s0+'px';}
    function ciz(){if(!W)return;
      var f=c-i0,F=Math.max(1,G.length-1-i0),bs;
      if(f<=0)bs=Math.max(1,1.28*Math.pow(1.055,f));
      else{var hT=Math.max(1.6,(.46*Math.min(W,H*.9)/146)/s0);bs=1.28*Math.pow(hT/1.28,Math.pow(Math.min(1,f/F),1.6));}
      /* ileri giderken kamera tapınağa döner: tapınak ekranın ortasına iner */
      var tt=f>0?Math.min(1,f/F):0,ty=vy+(TY-VPY)*IH*s0*bs,dy=tt*tt*(H*.5-ty);
      bg.style.transform='translate('+(vx-(vx-ox)*bs).toFixed(1)+'px,'+(vy-(vy-oy)*bs+dy).toFixed(1)+'px) scale('+bs.toFixed(4)+')';
      var vY=vy+dy,k=Math.max(60,H-vY),bW=Math.min(W,H*1.2)/400,odak=Math.round(c);
      G.forEach(function(g,n){var e=EL[n],z=(n-c)*ARA+ZF;
        if(z<.85||z>9){if(e.style.display!=='none')e.style.display='none';return;}
        if(e.style.display)e.style.display='';
        var y=vY+k/z*.95,x=vx+(n%2?1:-1)*(y-vY)*.42,sc=bW/z*1.05;
        var op=z>5?Math.max(0,1-(z-5)/4):z<1.3?Math.max(0,(z-.85)/.45):1;
        e.style.transform='translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px) scale('+sc.toFixed(4)+')';
        e.style.opacity=op.toFixed(3);e.style.zIndex=Math.round(1000-z*100);
        e.classList.toggle('odak',odak===n);
        e.classList.toggle('etg',sc>.5&&Math.abs(n-c)<1.6);});
    }
    function dongu(){var f=hedef-c;if(Math.abs(f)<.002){c=hedef;ciz();akan=false;return;}c+=f*(AZ?1:.14);ciz();requestAnimationFrame(dongu);}
    function bas(){if(!akan){akan=true;requestAnimationFrame(dongu);}}
    function sinir(n){return Math.max(0,Math.min(G.length-1,n));}
    var son=i0;
    function git(n){n=sinir(n);hedef=n;bas();if(n!==son){son=n;degis(n);}}
    /* sürükleme */
    var y0=null,c0=0,sur=false,iz=[];
    kap.addEventListener('pointerdown',function(e){if(e.button>0)return;y0=e.clientY;c0=hedef;sur=false;iz=[[e.timeStamp,e.clientY]];});
    kap.addEventListener('pointermove',function(e){if(y0===null)return;var dy=e.clientY-y0;
      if(!sur){if(Math.abs(dy)<8)return;sur=true;try{kap.setPointerCapture(e.pointerId);}catch(x){}}
      hedef=c=Math.max(-.4,Math.min(G.length-.6,c0+dy/(H*.22)));ciz();iz.push([e.timeStamp,e.clientY]);if(iz.length>5)iz.shift();});
    function birak(){if(y0===null)return;y0=null;if(!sur)return;
      var v=0;if(iz.length>1){var a=iz[0],b=iz[iz.length-1];v=(b[1]-a[1])/Math.max(16,b[0]-a[0]);}
      git(Math.round(c+v*2.2));setTimeout(function(){sur=false;},60);}
    kap.addEventListener('pointerup',birak);kap.addEventListener('pointercancel',birak);
    /* dokunma ve klavye */
    EL.forEach(function(e,n){e.addEventListener('click',function(){if(sur)return;if(Math.round(hedef)===n)dokun(n);else git(n);});});
    kap.addEventListener('keydown',function(e){
      if(e.key==='ArrowUp'||e.key==='ArrowRight'){e.preventDefault();git(Math.round(hedef)+1);}
      else if(e.key==='ArrowDown'||e.key==='ArrowLeft'){e.preventDefault();git(Math.round(hedef)-1);}
      else if(e.key==='Enter'||e.key===' '){e.preventDefault();dokun(Math.round(hedef));}});
    function hazir(){olc();ciz();}
    if(img.complete)hazir();else{img.addEventListener('load',hazir);hazir();}
    if(window.ResizeObserver)new ResizeObserver(function(){olc();ciz();}).observe(kap);
    else window.addEventListener('resize',function(){olc();ciz();});
    return {git:git,odak:function(){return Math.round(hedef);}};
  }
  window.LEX_UFUK_SAHNE={html:html,bagla:bagla};
})();

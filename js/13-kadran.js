(function(){
  var h=document.getElementById('pm-saat'),hl=document.getElementById('pm-halka');if(!h||!hl)return;
  var ROM=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'],C=2*Math.PI*52;
  function pt(r,a){a=a*Math.PI/180;return (150+r*Math.sin(a)).toFixed(2)+' '+(150-r*Math.cos(a)).toFixed(2);}
  function sek(r1,r2,a1,a2){var b=a2-a1>180?1:0;return 'M'+pt(r2,a1)+' A'+r2+' '+r2+' 0 '+b+' 1 '+pt(r2,a2)+' L'+pt(r1,a2)+' A'+r1+' '+r1+' 0 '+b+' 0 '+pt(r1,a1)+' Z';}
  var o='<defs><path id="lv-yay" d="M'+pt(93,-50)+' A93 93 0 0 1 '+pt(93,50)+'"/></defs>';
  o+='<circle class="lv-c" cx="150" cy="150" r="143"/>';
  for(var i=0;i<12;i++){var a1=i*30+2.2,a2=(i+1)*30-2.2,p=sek(114,134,a1,a2),m=pt(124,(i+.5)*30).split(' ');
    o+='<g data-i="'+i+'"><path class="lv-z" d="'+p+'"/><path class="lv-d" d="'+p+'"/><path class="lv-k" d=""/><text class="lv-r"'+(ROM[i].length>3?' textLength="20" lengthAdjust="spacingAndGlyphs" style="font-size:12px"':'')+' dominant-baseline="central" x="'+m[0]+'" y="'+(+m[1]+.6).toFixed(2)+'">'+ROM[i]+'</text></g>';}
  o+='<circle class="lv-i" cx="150" cy="150" r="104"/>';
  o+='<text><textPath href="#lv-yay" startOffset="50%" text-anchor="middle" class="lv-y">LEX · XII · TABULARUM</textPath><textPath href="#lv-yay" startOffset="50%" text-anchor="middle" class="lv-ym">MOLA · OTIUM</textPath></text>';
  var NS='http://www.w3.org/2000/svg',s=document.createElementNS(NS,'svg');s.setAttribute('viewBox','0 0 300 300');s.setAttribute('class','lv');s.setAttribute('aria-hidden','true');s.innerHTML=o;
  h.insertBefore(s,h.querySelector('.pm-yazi'));
  var G=s.querySelectorAll('g[data-i]'),son=-1,oncCu=-1;
  function guncelle(){
    var off=parseFloat(hl.style.strokeDashoffset);if(isNaN(off))off=0;var fr=off/C;if(h.classList.contains('serbest'))fr=1-fr;
    fr=Math.max(0,Math.min(1,fr));var dn=fr*12,cu=Math.floor(dn);if(fr>=1)cu=12;
    var anah=Math.round(fr*2400);if(anah===son)return;son=anah;
    for(var i=0;i<12;i++){var g=G[i],a1=i*30+2.2,a2=(i+1)*30-2.2;
      g.classList.toggle('bitti',i<cu);g.classList.toggle('simdi',i===cu&&fr>0);
      g.querySelector('.lv-k').setAttribute('d',(i===cu&&dn-cu>0.004)?sek(114,134,a1,a1+(a2-a1)*(dn-cu)):'');}
  }
  new MutationObserver(guncelle).observe(hl,{attributes:true,attributeFilter:['style']});
  new MutationObserver(function(){son=-1;guncelle();}).observe(h,{attributes:true,attributeFilter:['class']});
  guncelle();
  // yalnız tamamen dolmuş levhalar (kenar + rakam) 15 saniyede bir parlar
  var azHar=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!azHar)setInterval(function(){if(document.hidden)return;
    var L=s.querySelectorAll('g.bitti');if(!L.length)return;
    for(var i=0;i<L.length;i++)L[i].classList.remove('parla');void s.getBBox();
    for(var j=0;j<L.length;j++)L[j].classList.add('parla');
    setTimeout(function(){for(var k=0;k<L.length;k++)L[k].classList.remove('parla');},1900);},15000);
  var b=document.createElement('button');b.type='button';b.className='lv-bilgi';b.setAttribute('aria-label','On İki Levha hakkında');
  b.addEventListener('click',function(e){e.stopPropagation();var t='On İki Levha (Lex XII Tabularum): Roma’nın ilk yazılı kanunu, MÖ 450 civarı. Her levha turun on ikide biri.';if(window.MF_TOAST)MF_TOAST(t);});
  h.appendChild(b);
})();

(function(){
  var $=function(i){return document.getElementById(i);};
  var saat=$('pm-saat'),bb=$('pm-basla'),sy=$('pg-sayac');if(!saat||!bb||!sy)return;
  var az=matchMedia('(prefers-reduced-motion: reduce)');
  function sure(){return az.matches?0:620;}
  // yüksekliği ölçerek yumuşak katla / aç
  function katla(e,k,aninda){
    if(!e)return;var tok=(e._oeTok||0)+1;e._oeTok=tok;
    var bitir=function(){if(e._oeTok!==tok)return;if(k){e.style.height='0px';}else{e.classList.remove('oe-kt');e.style.height='';e.style.overflow='';e.style.boxSizing='';}};
    if(k){
      if(e._oeK)return;e._oeK=1;e.inert=true;e.setAttribute('aria-hidden','true');
      e.classList.remove('seans-gizli');
      var h=e.getBoundingClientRect().height;
      e.style.boxSizing='border-box';e.style.overflow='hidden';
      if(aninda||!sure()||!h){e.classList.add('oe-kt','oe-kapan');e.style.height='0px';return;}
      e.classList.remove('oe-kt');e.style.height=h+'px';void e.offsetHeight;
      e.classList.add('oe-kt','oe-kapan');e.style.height='0px';
      setTimeout(bitir,sure()+60);
    }else{
      if(!e._oeK)return;e._oeK=0;e.inert=false;e.removeAttribute('aria-hidden');e.classList.remove('seans-gizli');
      var ec=e.classList.contains('oe-kt');e.classList.remove('oe-kt','oe-kapan');e.style.height='auto';
      var h2=e.getBoundingClientRect().height;
      if(aninda||!sure()||!h2){e.style.height='';e.style.overflow='';e.style.boxSizing='';return;}
      e.classList.add('oe-kapan');e.style.height='0px';void e.offsetHeight;
      e.classList.add('oe-kt');e.classList.remove('oe-kapan');e.style.height=h2+'px';
      setTimeout(bitir,sure()+60);
    }
  }
  window.LV_KATLA=katla;
  function hedefler(){
    var l=[document.querySelector('header.ust'),document.querySelector('#pg-sayac .pm-mod'),$('pm-domates')];
    var ilk=sy.querySelector('section.kart');
    [].forEach.call(sy.children,function(c){if(c!==ilk)l.push(c);});
    l.push($('pm-sik-k'));
    return l.filter(Boolean);
  }
  var mk=document.createElement('div');mk.className='oe-maskot';mk.id='oe-maskot';mk.setAttribute('aria-hidden','true');
  var dg=document.querySelector('#pg-sayac .pm-dugmeler');if(dg&&dg.parentNode)dg.parentNode.insertBefore(mk,dg.nextSibling);
  function maskot(){var as=!!($('pm-siki')&&$('pm-siki').checked);
    mk.innerHTML='<div class="om-i">'+(as?(window.LX_SUTUN||''):'')+'<svg viewBox="0 0 120 120"><use href="#'+(as?'mf-aslan':'mf-kedi')+'"/></svg></div>';}
  function olc(){
    var B=saat.offsetWidth||230,gen=innerWidth>=760,nav=$('alt-nav');
    var navH=(!gen&&nav)?nav.offsetHeight:0;
    var avW=gen?(sy.clientWidth-60):(innerWidth-20);
    var H=innerHeight-navH,EK=OE_EK,Wt=Math.min(avW,680),M;
    if(H-EK-64-10>=Wt){M=Math.round(Math.min(112,H-EK-10-Wt));}else{M=0;}
    maskotsuz=!M;document.body.style.setProperty('--omS',(M||64)+'px');
    var W=Math.max(B,Math.min(Wt,H-EK-(M?M+10:0))),S=W/B;
    var bos=H-(W+EK+(M?M+10:0));document.body.style.setProperty('--oeUst',Math.max(8,Math.round(bos/2))+'px');
    saat.style.setProperty('--lvS',S.toFixed(4));saat.style.setProperty('--lvI',(1/S).toFixed(4));saat.style.setProperty('--lvM',((W-B)/2).toFixed(1)+'px');
  }
  var acik=null,maskotsuz=false,OE_EK=150;
  function sayacSayfasi(){return !/(^|\s)s-(program|istat|mantik|mevzuat|kutuphane)(\s|$)/.test(document.body.className);}
  function guncelle(aninda){
    var on=/Duraklat/.test(bb.textContent)&&sayacSayfasi();
    if(on===acik)return;var ilk=acik===null;acik=on;
    if(on)olc();
    hedefler().forEach(function(e){katla(e,on,aninda||ilk);});
    if(on)maskot();katla(mk,!on||maskotsuz,aninda||ilk);
    document.body.classList.toggle('lv-odak',on);
    if(on&&!ilk&&!aninda)window.scrollTo({top:0,behavior:az.matches?'auto':'smooth'});
  }
  new MutationObserver(function(){guncelle(false);}).observe(bb,{childList:true,characterData:true,subtree:true});
  new MutationObserver(function(){guncelle(true);}).observe(document.body,{attributes:true,attributeFilter:['class']});
  addEventListener('resize',function(){if(acik)olc();});
  guncelle(true);
})();

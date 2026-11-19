(function(){
  var sp=document.getElementById('pm-ses-p');if(!sp)return;var k=sp.querySelector('.sheet-k');if(!k)return;
  var y0=null,x0=0,dy=0,t0=0,surukle=false,yut=false;
  function kapat(){sp.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
  function bas(e){if(e.target.closest('input,select,textarea,a'))return;var p=e.touches?e.touches[0]:e;y0=p.clientY;x0=p.clientX;dy=0;t0=Date.now();surukle=false;}
  function hareket(e){if(y0===null)return;var p=e.touches?e.touches[0]:e,d=p.clientY-y0,dx=Math.abs(p.clientX-x0);
    if(!surukle){if(d>8&&d>dx){surukle=true;k.style.transition='none';}else if(Math.abs(d)>8||dx>8){y0=null;return;}else return;}
    dy=Math.max(0,d);k.style.transform='translateY('+dy+'px)';
    sp.style.background='rgba(39,19,22,'+(.55*Math.max(0,1-dy/(k.offsetHeight||400))).toFixed(3)+')';
    if(e.cancelable)e.preventDefault();}
  function birak(){if(y0===null)return;y0=null;if(!surukle)return;surukle=false;yut=true;setTimeout(function(){yut=false;},60);
    var hiz=dy/Math.max(1,Date.now()-t0);k.style.transition='';sp.style.background='';
    if(dy>Math.min(110,k.offsetHeight*.25)||hiz>.6){k.style.transform='';kapat();}else{k.style.transform='';}}
  k.addEventListener('touchstart',bas,{passive:true});k.addEventListener('touchmove',hareket,{passive:false});k.addEventListener('touchend',birak);k.addEventListener('touchcancel',birak);
  k.addEventListener('mousedown',bas);addEventListener('mousemove',function(e){if(y0!==null&&e.buttons)hareket(e);});addEventListener('mouseup',birak);
  k.addEventListener('click',function(e){if(yut){e.stopPropagation();e.preventDefault();}},true);
})();

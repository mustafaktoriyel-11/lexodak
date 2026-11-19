// ---- Program: hazır şablonlar ----
(function(){
  function $(i){return document.getElementById(i);}
  var p=$('sb-p');if(!p||!$('sb-ac'))return;
  var GK=['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'],GUN=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];
  var GENEL=/^(genel|diğer|genel \/ diğer|serbest|genel çalışma)$/i;
  function dersler(){
    var l=[].map.call(($('pm-ders')||{options:[]}).options,function(o){return o.value;}).filter(function(x){return x&&!GENEL.test(x.trim());});
    var g={};return l.filter(function(x){if(g[x])return false;g[x]=1;return true;});
  }
  function sinavlar(){var l=[];try{l=JSON.parse(localStorage.getItem('lex-sinavlar')||'[]');}catch(e){}if(!Array.isArray(l))l=[];
    var b=new Date();b.setHours(0,0,0,0);
    return l.map(function(x){var q=String(x.tarih||'').split('-');var t=new Date(+q[0],+q[1]-1,+q[2]);return {ders:x.ders,tur:x.tur,gun:Math.round((t-b)/864e5)};}).filter(function(x){return x.gun>=0;});}
  function sk(dk){var h=Math.floor(dk/60),m=dk%60;return h?(h+(m?','+Math.round(m/6):'')+' sa'):(m+' dk');}
  // ağırlıklı, dengeli dağıtım: aynı gün aynı ders iki kez gelmesin
  function dagit(D,W,gunler){
    var cur=D.map(function(){return 0;}),top=W.reduce(function(a,b){return a+b;},0),g=[[],[],[],[],[],[],[]];
    gunler.forEach(function(dkl,gi){
      var bugun={};
      dkl.forEach(function(dk){
        for(var i=0;i<D.length;i++)cur[i]+=W[i];
        var en=-1;
        for(i=0;i<D.length;i++){if(bugun[D[i]]&&D.length>dkl.length-1)continue;if(en<0||cur[i]>cur[en])en=i;}
        if(en<0)en=0;cur[en]-=top;
        var var_=null;g[gi].forEach(function(o){if(o.ders===D[en])var_=o;});
        if(var_)var_.dk+=dk;else g[gi].push({ders:D[en],dk:dk});bugun[D[en]]=1;
      });
    });
    return g;
  }
  function sablonlar(){
    var D=dersler();if(!D.length)return [];
    var S=sinavlar(),yak={};S.forEach(function(x){if(x.ders&&(yak[x.ders]==null||x.gun<yak[x.ders]))yak[x.ders]=x.gun;});
    // kamp: sınavı yakın olan önce ve daha ağır
    var DK=D.slice().sort(function(a,b){var x=yak[a]==null?999:yak[a],y=yak[b]==null?999:yak[b];return x-y;});
    var WK=DK.map(function(d){var f=yak[d];return f==null?1:f<=7?4:f<=14?3:f<=28?2:1;});
    var W1=D.map(function(){return 1;});
    var hafif=[[45],[45],[45],[45],[45],[60,60],[]];
    var duzen=[[60,60],[60,60],[60,60],[60,60],[60,60],[60,60,60],[60]];
    var kamp=[[90,60,60],[90,60,60],[90,60,60],[90,60,60],[90,60,60],[90,90,60],[90,60]];
    var yakS=S.filter(function(x){return x.gun<=28;}).length;
    return [
      {id:'hafif',ad:'Hafif tempo',ac:'İşte çalışanlar ya da dönem başı için. Hafta içi günde tek ders, Cumartesi iki ders, Pazar dinlenme.',g:dagit(D,W1,hafif)},
      {id:'duzen',ad:'Düzenli dönem',ac:'Dönem boyunca sürdürülebilir tempo. Her gün iki ders, Cumartesi üç ders, Pazar hafif tekrar.',g:dagit(D,W1,duzen)},
      {id:'kamp',ad:'Vize / Final kampı',ac:(yakS?'Sınav takvimine göre: sınavı yaklaşan dersler öne alındı ve daha sık geliyor. ':'Sınav takviminde yakın tarih yok; dersler eşit dağıtıldı. Sınav eklersen yaklaşanlar öne alınır. ')+'Günde üç blok, ilki 90 dk.',g:dagit(DK,WK,kamp)}
    ];
  }
  var SB=[],SEC='';
  function toplam(g){var t=0;g.forEach(function(x){x.forEach(function(o){t+=o.dk;});});return t;}
  function esc(t){return String(t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function ciz(){
    var D=dersler();
    $('sb-p-a').textContent=D.length?D.length+' dersine göre':'';
    $('sb-p-ac').textContent=D.length?(D.length<=8?'Seçtiğin dersler: '+D.join(', ')+'. ':'')+'Birine dokun, gün gün nasıl dağıldığını gör.':'';
    if(!D.length){$('sb-liste').innerHTML='<p class="sb-aciklama">Önce derslerini seçmelisin. Çalışma ekranında ders listesini düzenle, sonra buraya dön.</p>';return;}
    $('sb-liste').innerHTML=SB.map(function(s){
      var gun=s.g.map(function(x,i){var t=0;x.forEach(function(o){t+=o.dk;});return '<div class="sb-g'+(t?'':' bos')+'"><b>'+GK[i]+'</b><small>'+(t?t+'′':'–')+'</small></div>';}).join('');
      var det=s.g.map(function(x,i){return x.length?'<li><i>'+GK[i]+'</i><span>'+x.map(function(o){return esc(o.ders)+' '+o.dk+' dk';}).join(' · ')+'</span></li>':'';}).join('');
      var var_={};s.g.forEach(function(x){x.forEach(function(o){var_[o.ders]=1;});});
      var dis=D.filter(function(d){return !var_[d];}),uy=dis.length?'<p class="sb-uyari">'+D.length+' dersin var; bu programa '+(D.length-dis.length)+' tanesi sığdı. Dışarıda kalan: '+esc(dis.join(', '))+'</p>':'';
      return '<div class="sb-kart'+(SEC===s.id?' sec':'')+'" data-id="'+s.id+'" role="button" tabindex="0"><div class="sb-bas"><b>'+s.ad+'</b><span>haftada '+sk(toplam(s.g))+'</span></div><p>'+esc(s.ac)+'</p>'+uy+'<div class="sb-gunler">'+gun+'</div><ul class="sb-detay">'+det+'</ul><button type="button" class="sb-uygula" data-u="'+s.id+'">Bu programı uygula</button></div>';
    }).join('');
  }
  function ac(){SB=sablonlar();SEC='';ciz();p.classList.add('acik');requestAnimationFrame(function(){requestAnimationFrame(function(){p.classList.add('gor');});});
    if(window.LEX_GERI)window.LEX_GERI.ekle('sb-p',function(){kapat(true);});}
  function kapat(geriden){if(!p.classList.contains('acik'))return;p.classList.remove('gor');setTimeout(function(){p.classList.remove('acik');},280);if(!geriden&&window.LEX_GERI)window.LEX_GERI.dus('sb-p');}
  $('sb-ac').addEventListener('click',ac);
  p.addEventListener('click',function(e){
    if(e.target===p){kapat();return;}
    var u=e.target.closest('[data-u]');
    if(u){var s=null;SB.forEach(function(x){if(x.id===u.dataset.u)s=x;});if(!s||!window.MF_PR_SABLON)return;
      if(window.MF_PR_VAR&&window.MF_PR_VAR()&&!confirm('Mevcut haftalık programın silinip yerine “'+s.ad.replace(/^\S+\s/,'')+'” konsun mu?'))return;
      window.MF_PR_SABLON(JSON.parse(JSON.stringify(s.g)));kapat();
      if(window.MF_TOAST)window.MF_TOAST(s.ad.replace(/^\S+\s/,'')+' uygulandı. Dersleri dokunarak değiştirebilirsin.');
      return;}
    var k=e.target.closest('.sb-kart');if(k){SEC=SEC===k.dataset.id?'':k.dataset.id;ciz();}
  });
})();

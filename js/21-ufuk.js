// ================= HUKUKCUNUN UFKU: oyun katmani (seri, unvan, maskot, toren) =================
(function(){
  var NS=12,ANAHTAR='lex-ufuk';
  var UNV=[['Tiro','Stajyer'],['Auditor','Hukuk Asistanı'],['Discipulus','Stajyer Avukat'],['Advocatus','Avukat'],['Patronus','Kıdemli Avukat'],['Iuris Peritus','Uzman Avukat'],['Iurisconsultus','Hukuk Danışmanı']];
  var RS=[[0,0],[1,0],[3,0],[6,7],[10,14],[20,30],[40,60]];
  var DEFS='<radialGradient id="uf-gov" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#F9CB6A"/><stop offset="1" stop-color="#E9A43C"/></radialGradient><radialGradient id="uf-yele" cx="50%" cy="50%" r="55%"><stop offset=".55" stop-color="#E0782A"/><stop offset="1" stop-color="#B9531B"/></radialGradient><linearGradient id="uf-bor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9A3446"/><stop offset="1" stop-color="#6E2432"/></linearGradient><linearGradient id="uf-cub" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFDF8"/><stop offset="1" stop-color="#E6D9C2"/></linearGradient><linearGradient id="uf-kol" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#EFE4D2"/><stop offset="1" stop-color="#FBF6EC"/></linearGradient><linearGradient id="uf-altin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE48A"/><stop offset=".5" stop-color="#F1C543"/><stop offset="1" stop-color="#C99A2E"/></linearGradient><radialGradient id="uf-hale" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFE9A3" stop-opacity=".95"/><stop offset=".6" stop-color="#F8D66B" stop-opacity=".35"/><stop offset="1" stop-color="#F8D66B" stop-opacity="0"/></radialGradient><linearGradient id="uf-bronz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E2BC52"/><stop offset="1" stop-color="#B08A28"/></linearGradient>';
  var GOVDE='<circle class="ac-hale" cx="120" cy="92" r="112" fill="url(#uf-hale)"/><g class="ac-pelerin"><path d="M70 152 C40 166 26 204 22 240 L62 240 C60 206 64 176 78 160 Z" fill="#6E2432"/><path d="M170 152 C200 166 214 204 218 240 L178 240 C180 206 176 176 162 160 Z" fill="#6E2432"/><path class="pk" d="M70 152 C40 166 26 204 22 240 M170 152 C200 166 214 204 218 240" stroke="#E2B13F" stroke-width="3.2" fill="none"/><path class="pk" d="M30 226 l6 -4 l6 4 l6 -4 l6 4 M186 226 l6 -4 l6 4 l6 -4 l6 4" stroke="#E2B13F" stroke-width="1.6" fill="none"/></g><g class="as-kuyruk"><path d="M176 222 C214 222 226 190 214 164" stroke="#E9A43C" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M214 164 c-11 -7 -8 -23 4 -23 c10 -2 17 11 9 21 c8 4 2 14 -6 10 Z" fill="#9C4416"/></g><path d="M66 156 C50 172 42 204 40 238 L200 238 C198 204 190 172 174 156 C150 142 90 142 66 156 Z" class="as-toga" fill="url(#uf-cub)"/><path d="M52 214 C49 224 47 232 46 238 M188 214 C191 224 193 232 194 238 M97 222 C96 228 96 233 96 238 M143 222 C144 228 144 233 144 238" stroke="#CDBDA2" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/><path d="M106 150 L134 150 L120 196 Z" fill="#E9DCC4"/><g class="as-serit"><path d="M101 148 L111 148 L121 200 L115 238 L105 238 L108 198 Z" fill="url(#uf-bor)"/><path d="M139 148 L129 148 L119 200 L125 238 L135 238 L132 198 Z" fill="url(#uf-bor)"/><path d="M108 198 L105 238 M132 198 L135 238" stroke="#C99A2E" stroke-width="1.4" opacity=".75"/><path d="M70 162 C96 150 122 168 150 196 C166 212 178 226 186 238 L166 238 C158 226 146 212 132 200 C110 180 90 170 74 176 Z" fill="url(#uf-bor)"/><path d="M74 176 C90 170 110 180 132 200 C146 212 158 226 166 238" fill="none" stroke="#C99A2E" stroke-width="1.4" opacity=".85"/><path d="M96 160 C118 170 140 190 160 214 M88 200 C100 214 108 228 112 238" stroke="#D3C3A8" stroke-width="1.5" fill="none" stroke-linecap="round"/></g><path class="as-kol" d="M62 168 C54 186 54 204 58 216 L92 216 C92 200 88 182 80 166 Z" fill="url(#uf-kol)" stroke="#CBB99C" stroke-width="1.4"/><path class="as-kol" d="M178 168 C186 186 186 204 182 216 L148 216 C148 200 152 182 160 166 Z" fill="url(#uf-kol)" stroke="#CBB99C" stroke-width="1.4"/><g class="ac-pallium"><path d="M58 166 C66 152 86 148 104 152 L98 168 C84 166 72 172 64 184 Z" fill="#8A6A44" stroke="#5E4527" stroke-width="1.2"/><path d="M182 166 C174 152 154 148 136 152 L142 168 C156 166 168 172 176 184 Z" fill="#8A6A44" stroke="#5E4527" stroke-width="1.2"/><path d="M66 172 C74 164 86 160 98 162 M174 172 C166 164 154 160 142 162" stroke="#6E5233" stroke-width="1.2" fill="none"/></g><rect class="ac-manset" x="55" y="208" width="39" height="13" rx="5" fill="url(#uf-bor)"/><rect class="ac-manset" x="146" y="208" width="39" height="13" rx="5" fill="url(#uf-bor)"/><path class="ac-mcizgi" d="M57 211 h35 M148 211 h35" stroke="#C99A2E" stroke-width="1.2" opacity=".7"/><g class="ac-maltin"><rect x="55" y="208" width="39" height="13" rx="5" fill="none" stroke="#E2B13F" stroke-width="2"/><rect x="146" y="208" width="39" height="13" rx="5" fill="none" stroke="#E2B13F" stroke-width="2"/><circle cx="74.5" cy="214.5" r="2.4" fill="#E2B13F"/><circle cx="165.5" cy="214.5" r="2.4" fill="#E2B13F"/></g><g class="ac-fibula"><circle cx="76" cy="170" r="8.5" fill="#E2B13F" stroke="#8A6D12" stroke-width="1.6"/><circle cx="76" cy="170" r="4.2" fill="#9A1F2E" stroke="#F6D77A" stroke-width="1"/><path d="M66 170 h-6 M86 170 h6" stroke="#8A6D12" stroke-width="2" stroke-linecap="round"/></g><path class="ac-nakis" d="M103 150 L112 196 M137 150 L128 196" stroke="#F2CF5B" stroke-width="2" stroke-dasharray="3 3" fill="none"/><g class="as-bas"><g transform="translate(6 -6) scale(1.9)"><polygon fill="url(#uf-yele)" points="60,6 68,18 80,10 82,24 96,22 91,35 104,40 93,49 103,60 90,63 95,76 81,74 80,88 69,79 60,90 51,79 40,88 39,74 25,76 30,63 17,60 27,49 16,40 29,35 24,22 38,24 40,10 52,18"/><polygon fill="#F08A33" points="60,14 67,24 77,19 78,30 89,30 85,40 95,45 86,52 93,61 82,63 85,73 74,71 72,81 63,74 60,82 57,74 48,81 46,71 35,73 38,63 27,61 34,52 25,45 35,40 31,30 42,30 43,19 53,24"/><circle cx="42" cy="32" r="7" fill="#E9A43C"/><circle cx="42" cy="32" r="3.6" fill="#C96E2A"/><circle cx="78" cy="32" r="7" fill="#E9A43C"/><circle cx="78" cy="32" r="3.6" fill="#C96E2A"/><ellipse cx="60" cy="49" rx="21" ry="22" fill="url(#uf-gov)"/><ellipse cx="60" cy="60" rx="12.5" ry="9.5" fill="#FBE0A8"/><path d="M44 40 l10 1.6 M76 40 l-10 1.6" stroke="#8A3D14" stroke-width="2.8" stroke-linecap="round"/><ellipse class="as-goz" cx="50" cy="47" rx="4.6" ry="5.4" fill="#2A2140"/><ellipse class="as-goz" cx="70" cy="47" rx="4.6" ry="5.4" fill="#2A2140"/><circle cx="51.6" cy="45.4" r="1.7" fill="#fff"/><circle cx="71.6" cy="45.4" r="1.7" fill="#fff"/><path d="M45 44.5 q5 -3 10 0 M65 44.5 q5 -3 10 0" fill="#E9A43C"/><path d="M55 55 h10 l-5 5.5 Z" fill="#6B2E12" stroke="#6B2E12" stroke-width="1.4" stroke-linejoin="round"/><path d="M60 60.5 v2.5 q-3 4 -7 2 M60 63 q3 4 7 2" stroke="#6B2E12" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="51" cy="61" r=".9" fill="#B8761F"/><circle cx="48" cy="59" r=".9" fill="#B8761F"/><circle cx="69" cy="61" r=".9" fill="#B8761F"/><circle cx="72" cy="59" r=".9" fill="#B8761F"/><g class="as-defne"><path d="M25.4 26.0 A40 36 0 0 1 94.6 26.0" fill="none" stroke="#3B2A10" stroke-width="1.4"/><ellipse cx="59.0" cy="5.5" rx="5.6" ry="2.5" transform="rotate(-40 59.0 5.5)" fill="#3E5A1E" stroke="#1F3210" stroke-width="0.7"/><ellipse cx="59.5" cy="10.2" rx="5.6" ry="2.5" transform="rotate(28 59.5 10.2)" fill="#5F7F2C" stroke="#1F3210" stroke-width="0.7"/><ellipse cx="51.3" cy="6.2" rx="5.6" ry="2.5" transform="rotate(-50 51.3 6.2)" fill="#3E5A1E" stroke="#1F3210" stroke-width="0.7"/><ellipse cx="52.6" cy="10.7" rx="5.6" ry="2.5" transform="rotate(18 52.6 10.7)" fill="#5F7F2C" stroke="#1F3210" stroke-width="0.7"/><ellipse cx="43.9" cy="8.3" rx="5.6" ry="2.5" transform="rotate(-61 43.9 8.3)" fill="#3E5A1E" stroke="#1F3210" stroke-width="0.7"/><ellipse cx="46.0" cy="12.4" rx="5.6" ry="2.5" transform="rotate(7 46.0 12.4)" fill="#5F7F2C" stroke="#1F3210" stroke-width="0.7"/><ellipse cx="37.0" cy="11.5" rx="5.6" ry="2.5" transform="rotate(-72 37.0 11.5)" fill="#3E5A1E" stroke="#1F3210" stroke-width="0.7"/><ellipse cx="39.8" cy="15.2" rx="5.6" ry="2.5" transform="rotate(-4 39.8 15.2)" fill="#5F7F2C" stroke="#1F3210" stroke-width="0.7"/><ellipse cx="30.9" cy="15.8" rx="5.6" ry="2.5" transform="rotate(-82 30.9 15.8)" fill="#3E5A1E" stroke="#1F3210" stroke-width="0.7"/><ellipse cx="34.3" cy="18.9" rx="5.6" ry="2.5" transform="rotate(-14 34.3 18.9)" fill="#5F7F2C" stroke="#1F3210" stroke-width="0.7"/><ellipse cx="25.7" cy="21.0" rx="5.6" ry="2.5" transform="rotate(-92 25.7 21.0)" fill="#3E5A1E" stroke="#1F3210" stroke-width="0.7"/><ellipse cx="29.7" cy="23.4" rx="5.6" ry="2.5" transform="rotate(-24 29.7 23.4)" fill="#5F7F2C" stroke="#1F3210" stroke-width="0.7"/><ellipse cx="61.0" cy="5.5" rx="5.6" ry="2.5" transform="rotate(-140 61.0 5.5)" fill="#3E5A1E" stroke="#1F3210" stroke-width="0.7"/><ellipse cx="60.5" cy="10.2" rx="5.6" ry="2.5" transform="rotate(-208 60.5 10.2)" fill="#5F7F2C" stroke="#1F3210" stroke-width="0.7"/><ellipse cx="68.7" cy="6.2" rx="5.6" ry="2.5" transform="rotate(-130 68.7 6.2)" fill="#3E5A1E" stroke="#1F3210" stroke-width="0.7"/><ellipse cx="67.4" cy="10.7" rx="5.6" ry="2.5" transform="rotate(-198 67.4 10.7)" fill="#5F7F2C" stroke="#1F3210" stroke-width="0.7"/><ellipse cx="76.1" cy="8.3" rx="5.6" ry="2.5" transform="rotate(-119 76.1 8.3)" fill="#3E5A1E" stroke="#1F3210" stroke-width="0.7"/><ellipse cx="74.0" cy="12.4" rx="5.6" ry="2.5" transform="rotate(-187 74.0 12.4)" fill="#5F7F2C" stroke="#1F3210" stroke-width="0.7"/><ellipse cx="83.0" cy="11.5" rx="5.6" ry="2.5" transform="rotate(-108 83.0 11.5)" fill="#3E5A1E" stroke="#1F3210" stroke-width="0.7"/><ellipse cx="80.2" cy="15.2" rx="5.6" ry="2.5" transform="rotate(-176 80.2 15.2)" fill="#5F7F2C" stroke="#1F3210" stroke-width="0.7"/><ellipse cx="89.1" cy="15.8" rx="5.6" ry="2.5" transform="rotate(-98 89.1 15.8)" fill="#3E5A1E" stroke="#1F3210" stroke-width="0.7"/><ellipse cx="85.7" cy="18.9" rx="5.6" ry="2.5" transform="rotate(-166 85.7 18.9)" fill="#5F7F2C" stroke="#1F3210" stroke-width="0.7"/><ellipse cx="94.3" cy="21.0" rx="5.6" ry="2.5" transform="rotate(-88 94.3 21.0)" fill="#3E5A1E" stroke="#1F3210" stroke-width="0.7"/><ellipse cx="90.3" cy="23.4" rx="5.6" ry="2.5" transform="rotate(-156 90.3 23.4)" fill="#5F7F2C" stroke="#1F3210" stroke-width="0.7"/><circle class="as-parilti" cx="60" cy="8.5" r="2.6" fill="#C9A227" stroke="#7A5A10" stroke-width="0.8"/></g></g></g><g class="as-levha"><path d="M98 170 Q98 164 104 164 H140 Q146 164 146 170 V232 H98 Z" fill="url(#uf-bronz)" stroke="#8A6D12" stroke-width="2.2"/><path d="M98 170 Q98 164 104 164 H140 Q146 164 146 170" fill="none" stroke="#F2D27A" stroke-width="1.3" opacity=".8"/><text x="122" y="203" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="20" fill="#3F1219">__NO__</text><path d="M106 214 H138 M106 220 H130" stroke="#7A5A10" stroke-width="1.4" opacity=".7"/><g class="lv-tahta"><path d="M98 170 Q98 164 104 164 H140 Q146 164 146 170 V232 H98 Z" fill="#8B5A2B" stroke="#5A3618" stroke-width="2.2"/><rect x="104" y="170" width="36" height="56" rx="2" fill="#3E2A1C"/><text x="122" y="203" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="18" fill="#C9A27A">__NO__</text><path d="M108 212 l26 1 M108 218 l18 0" stroke="#B48A5E" stroke-width="1.2"/></g><g class="lv-altin"><path d="M98 170 Q98 164 104 164 H140 Q146 164 146 170 V232 H98 Z" fill="url(#uf-altin)" stroke="#9A7414" stroke-width="2.2"/><rect x="102.5" y="168.5" width="39" height="60" rx="2" fill="none" stroke="#FFF1B8" stroke-width="1.2"/><circle cx="122" cy="178" r="4.6" fill="#9A1F2E" stroke="#FFF1B8" stroke-width="1.2"/><circle cx="120.6" cy="176.6" r="1.4" fill="#F6B0B8"/><text x="122" y="207" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="20" fill="#5A1420">__NO__</text><path d="M106 216 H138 M106 222 H130" stroke="#9A7414" stroke-width="1.4"/></g><ellipse cx="82" cy="224" rx="17" ry="10.5" fill="#F4BA55"/><ellipse cx="158" cy="224" rx="17" ry="10.5" fill="#F4BA55"/><path d="M75 225 v5 M83 226 v5 M91 225 v5 M149 225 v5 M157 226 v5 M165 225 v5" stroke="#B8761F" stroke-width="2.4" stroke-linecap="round"/></g>';
  function rom(n){var s='',t=[[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];if(n<1)return '0';for(var i=0;i<t.length;i++)while(n>=t[i][0]){s+=t[i][1];n-=t[i][0];}return s;}
  function az(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}}
  function esc(x){return String(x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  /* maskotun SVG gradyanlari sayfada bir kez durur; her maskot yalniz url(#uf-..) ile basvurur */
  (function(){if(document.getElementById('uf-defs'))return;var s=document.createElement('div');s.id='uf-defs';s.setAttribute('aria-hidden','true');s.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
    s.innerHTML='<svg width="0" height="0" xmlns="http://www.w3.org/2000/svg" focusable="false"><defs>'+DEFS+'</defs></svg>';document.body.appendChild(s);})();
  function kayit(){var o=null;try{o=JSON.parse(localStorage.getItem(ANAHTAR)||'null');}catch(e){}
    return o&&typeof o.r==='number'?o:null;}
  function kayitYaz(o){try{localStorage.setItem(ANAHTAR,JSON.stringify(o));}catch(e){}}
  /* v: {gunNo:{d,sn,...}} gecmis; h: bugunun gun no. Tamamlanan her gun bir set; seri mazeret gunuyle surer */
  function hesap(v,h){
    var ks=Object.keys(v||{}).map(Number).filter(function(x){return isFinite(x);}).sort(function(a,b){return a-b;});
    var set=ks.length,seri=0,uzun=0,kul={},ilk=ks.length?ks[0]:h;
    if(ks.length){var son=Math.max(h,ks[ks.length-1]);
      for(var d=ks[0];d<=son;d++){
        if(v[d]){seri++;if(seri>uzun)uzun=seri;}
        else if(d<h&&seri>0){var w=Math.floor(d/7);if(!kul[w])kul[w]=1;else seri=0;}
      }}
    var r=0;for(var i=0;i<RS.length;i++)if(set>=RS[i][0]&&uzun>=RS[i][1])r=i;
    var sn=r<RS.length-1?r+1:-1,fr=1;
    if(sn>=0){var n=RS[sn];fr=Math.min(set/n[0],1);if(n[1])fr=(fr+Math.min(uzun/n[1],1))/2;}
    return {set:set,uzun:uzun,seri:seri,kul:!!kul[Math.floor(h/7)],ilk:ilk,r:r,sn:sn,fr:fr,bugun:!!(v&&v[h])};
  }
  function kayitR(){var k=kayit();return k?Math.max(0,Math.min(6,k.r)):0;}
  /* ilk acilista (eski kullanici) var olan gecmisten unvan sessizce belirlenir; tören yalniz bundan sonraki atlamalarda */
  function baslat(v,h){if(!kayit())kayitYaz({v:1,r:hesap(v,h).r});}
  function maskot(px,ek,r,ic){
    if(r===undefined||r===null)r=kayitR();
    return '<div class="uf-m r-'+(r+1)+(ek?' '+ek:'')+'" style="width:'+px+'px;height:'+px+'px">'+(ic&&ic.on||'')+'<div class="as-buyu"><div class="as-govde"><svg class="as-svg" viewBox="0 0 240 240" width="'+px+'" height="'+px+'" role="img" aria-label="Toga giymiş aslan maskot">'+GOVDE.split('__NO__').join('XII')+'</svg></div></div>'+(ic&&ic.son||'')+'</div>';
  }
  function sinifGuncelle(){var r=kayitR()+1;[].forEach.call(document.querySelectorAll('.uf-m:not(.uf-m-t)'),function(e){e.className=e.className.replace(/\br-\d\b/,'r-'+r);});}
  /* soru sayisi kadar noktali yol: dogru/yanlis/bos ozeti ya da ilerleme */
  function nokta(n,i){var w=358,x0=8,aralik=n>1?(w-2*x0)/(n-1):0;return x0+i*aralik;}
  function yolOzet(cev,S){
    var n=S.length,o='<svg class="uf-yolsvg" role="img" viewBox="0 0 358 36" xmlns="http://www.w3.org/2000/svg" aria-label="Yolun özeti: '+n+' levhadan ';
    var yk=[];S.forEach(function(q,j){if(cev[j]!==q.c)yk.push(rom(j+1));});
    o+=(yk.length?yk.join(', ')+' doğru değil, diğerleri doğru':'hepsi doğru')+'">';
    o+='<path d="M8 18 H350" fill="none" stroke="#8A2F3F" stroke-width="3" stroke-linecap="round"/>';
    S.forEach(function(q,j){var x=nokta(n,j).toFixed(1),c=cev[j];
      if(c===q.c)o+='<circle cx="'+x+'" cy="18" r="6" fill="#5E1F2A"/>';
      else if(c===null)o+='<circle cx="'+x+'" cy="18" r="7" class="uf-bos" stroke-width="2"/>';
      else o+='<circle cx="'+x+'" cy="18" r="8" class="uf-yan" stroke="#9B2C2C" stroke-width="2.5"/>';});
    return o+'</svg>';
  }
  function yolIlerle(cev,i,n){
    var o='<svg class="uf-yolsvg ilerle" aria-hidden="true" viewBox="0 0 358 24" xmlns="http://www.w3.org/2000/svg">';
    var cevN=0;cev.forEach(function(x){if(x!==null)cevN++;});
    o+='<path d="M8 12 H350" fill="none" stroke="#CDBFAE" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 7"/>';
    o+='<path d="M8 12 H'+nokta(n,i).toFixed(1)+'" fill="none" stroke="#8A2F3F" stroke-width="3" stroke-linecap="round"/>';
    for(var j=0;j<n;j++){var x=nokta(n,j).toFixed(1);
      if(j===i)o+='<circle cx="'+x+'" cy="12" r="9" fill="#C9A227" stroke="#5E1F2A" stroke-width="2"/>';
      else if(cev[j]!==null)o+='<circle cx="'+x+'" cy="12" r="5" fill="#5E1F2A"/>';
      else o+='<circle cx="'+x+'" cy="12" r="5" class="uf-bos" stroke-width="2"/>';}
    return o+'</svg>';
  }
  var ALEV='<svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c1 3 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z"/></svg>';
  function seriKart(d){
    var alt;
    if(d.seri>0)alt=d.kul?'Bu hafta mazeret hakkını kullandın':'Bu hafta 1 mazeret hakkın var';
    else alt=d.set>0?'Dün çalışılmadı. Yeniden başlamak için bugün bir set yeter.':'İlk setinle yola çık';
    return '<div class="uf-kart2 uf-seri"><span class="uf-ik">'+ALEV+'</span><div><b>Seri: '+d.seri+' gün</b><small>'+alt+'</small></div></div>';
  }
  function unvanKart(d,r){
    if(r===undefined)r=kayitR();var u=UNV[r],alt;
    if(r<6){var n=RS[r+1];alt='Sonraki: '+UNV[r+1][0]+' · '+Math.min(d.set,n[0])+'/'+n[0]+' set'+(n[1]?' · '+Math.min(d.uzun,n[1])+'/'+n[1]+' gün seri':'');}
    else alt='En üst unvandasın';
    var fr=r<6?hesap2(d,r):1;
    return '<div class="uf-kart2 uf-unvan"><div class="uf-u1"><b>'+u[0]+'</b><span>'+u[1]+'</span></div><div class="uf-bar" role="img" aria-label="Sonraki unvana ilerleme yüzde '+Math.round(fr*100)+'"><i style="width:'+Math.round(fr*100)+'%"></i></div><small>'+alt+'</small></div>';
  }
  /* kayitli unvana gore sonraki basamaga ilerleme orani */
  function hesap2(d,r){var n=RS[r+1];if(!n)return 1;var f=Math.min(d.set/n[0],1);if(n[1])f=(f+Math.min(d.uzun/n[1],1))/2;return f;}
  // ---- ana ekran: kemer onunde sabit dikey patika ----
  var KEMER='<g aria-hidden="true" fill="none" stroke="#E6DAC8" stroke-width="2" stroke-linecap="round" class="uf-kemer"><path d="M10 100 V70 A55 55 0 0 1 120 70 V100 M140 100 V70 A55 55 0 0 1 250 70 V100 M270 100 V70 A55 55 0 0 1 380 70 V100"/><path d="M0 100 H390"/></g>';
  var KILIT='<g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></g>';
  var SAAT='<g class="uf-sat2" transform="translate(0 0)"><circle cx="0" cy="0" r="9" class="uf-saty"/><path d="M0 -5v5l3.4 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></g>';
  /* son 1-2 gun, bugun (altin, buyuk), yarin ve birkac gun kilitli */
  function yol(d,v,h,ad,devam,G){
    G=G||{};var ks=[],k,ilk=d.set?d.ilk:h;
    Object.keys(G).forEach(function(x){x=+x;if(x<ilk)ilk=x;});
    for(k=Math.max(h-2,ilk);k<h;k++)ks.push({k:k,t:v[k]?'tam':G[k]?'gec':'bos'});
    ks.push({k:h,t:'bugun'});ks.push({k:h+1,t:'kilit'});ks.push({k:h+2,t:'kilit'});ks.push({k:h+3,t:'kilit'});
    ks.reverse();   /* en ustte gelecek, en altta en eski gun */
    var n=ks.length,Gp=84,ust=58,H=ust+(n-1)*Gp+54,XS=[110,250],o='',i,jb=0;
    ks.forEach(function(e,j){if(e.t==='bugun')jb=j;});
    var pos=ks.map(function(e,j){return {x:(Math.abs(j-jb)%2?XS[0]:XS[1]),y:ust+j*Gp};});
    o+='<svg class="uf-yolsvg uf-patika" viewBox="0 0 360 '+H+'" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Son günler ve bugünün seti">';
    o+='<g transform="translate(-15 0)">'+KEMER+'</g>';
    for(i=0;i<n-1;i++){var a=pos[i],b=pos[i+1],ym=((a.y+b.y)/2).toFixed(1),
      dolu=(ks[i+1].t==='tam')&&(ks[i].t==='tam'||ks[i].t==='bugun');
      o+='<path d="M'+b.x+' '+b.y+' C'+b.x+' '+ym+' '+a.x+' '+ym+' '+a.x+' '+a.y+'" fill="none" '+(dolu?'stroke="#8A2F3F" stroke-width="5"':'stroke="#CDBFAE" stroke-width="4" stroke-dasharray="1 10"')+' stroke-linecap="round" class="'+(dolu?'uf-yd':'uf-yb')+'" aria-hidden="true"/>';}
    ks.forEach(function(e,j){var p=pos[j],x=p.x,y=p.y,sol=x>200,tx=sol?x-(e.t==='bugun'?46:32):x+32,an=sol?'end':'start',r=v[e.k]||G[e.k],lab,alt,aria;
      if(e.t==='tam'||e.t==='gec'){var g=e.t==='gec';lab=ad(e.k);alt=g?'geç çözüldü':r.d+'/'+NS+' doğru';aria=lab+', '+(g?'geç çözüldü, seriye sayılmaz':'tamamlandı, '+r.d+' doğru')+'. Sonucu aç';
        o+='<g class="uf-dg '+e.t+'" data-uk="'+e.k+'" role="button" tabindex="0" aria-label="'+esc(aria)+'"><circle cx="'+x+'" cy="'+y+'" r="26" fill="transparent"/><circle cx="'+x+'" cy="'+y+'" r="24" class="uf-kn '+(g?'uf-c-gec':'uf-c-tam')+'" stroke-width="3"/><path d="M'+(x-8)+' '+(y+1)+' L'+(x-2)+' '+(y+7)+' L'+(x+9)+' '+(y-6)+'" fill="none" stroke="'+(g?'#7A5A10':'#F8EBC4')+'" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'+(g?'<g transform="translate('+(x+17)+' '+(y+17)+')">'+SAAT+'</g>':'');}
      else if(e.t==='bos'){lab=ad(e.k);alt='çözülmedi';
        o+='<g class="uf-dg bos" aria-label="'+esc(lab+', çözülmedi')+'" role="img"><circle cx="'+x+'" cy="'+y+'" r="20" class="uf-bsd" stroke-width="2"/><path d="M'+(x-6)+' '+y+' h12" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>';}
      else if(e.t==='bugun'){var bit=!!r;lab='Bugün';alt=bit?r.d+'/'+NS+' doğru':(devam?'Devam et':'Başla');aria='Bugünün seti, '+(bit?'tamamlandı, '+r.d+' doğru. Sonucu aç':(devam?'devam et':'başla'));
        o+='<g class="uf-dg bugun" data-uk="'+e.k+'" role="button" tabindex="0" aria-label="'+esc(aria)+'"><circle cx="'+x+'" cy="'+y+'" r="46" fill="transparent"/><circle cx="'+x+'" cy="'+y+'" r="42" class="uf-hl"/><circle cx="'+x+'" cy="'+y+'" r="34" fill="#C9A227" stroke="#FFFFFF" stroke-width="3" class="uf-kn"/>';
        if(bit)o+='<path d="M'+(x-12)+' '+(y+1)+' L'+(x-3)+' '+(y+10)+' L'+(x+13)+' '+(y-9)+'" fill="none" stroke="#3F1219" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>';
        else o+='<text x="'+x+'" y="'+(y+9)+'" text-anchor="middle" class="uf-rom">'+rom(d.set+1)+'</text>';}
      else{var nn=e.k-h;lab=nn===1?'Yarın':nn+' gün sonra';alt='kilitli';
        o+='<g class="uf-dg kilit" data-kn="'+nn+'" role="button" tabindex="0" aria-label="'+esc(lab+', kilitli. Dokununca bilgi verir')+'"><circle cx="'+x+'" cy="'+y+'" r="26" fill="transparent"/><g class="uf-ks"><circle cx="'+x+'" cy="'+y+'" r="22" class="uf-kl" stroke-width="2"/><g transform="translate('+(x-10)+' '+(y-10)+') scale(.85)" class="uf-kg">'+KILIT+'</g></g>';}
      o+='<text x="'+tx+'" y="'+(y-1)+'" text-anchor="'+an+'" class="uf-l1">'+esc(lab)+'</text><text x="'+tx+'" y="'+(y+16)+'" text-anchor="'+an+'" class="uf-l2'+(e.t==='bugun'?' bg':'')+'">'+esc(alt)+'</text></g>';});
    return o+'</svg>';
  }
  /* Onceki levhalar: son 30 gun (veri olan ilk gune kadar), en yeni ustte */
  function liste(v,G,h,ad,tumu){
    G=G||{};var ks=Object.keys(v).concat(Object.keys(G)).map(Number);if(!ks.length)return '';
    var ilk=Math.max(0,h-30,Math.min.apply(null,ks)),rows=[],k;
    for(k=h-1;k>=ilk;k--)rows.push(k);
    if(!rows.length)return '';
    var o='<div class="mt-kart uf-onc"><h3 class="uf-baslik" style="margin-top:0">Önceki levhalar</h3><div class="uf-or-l">';
    rows.forEach(function(k,j){var t=v[k]?'tam':G[k]?'gec':'bos',r=v[k]||G[k],gz=(j>=7&&!tumu)?' hidden':'',dur,ic;
      if(t==='tam'){dur=r.d+'/'+NS+' doğru';ic='<svg class="uf-oi tam" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m7.5 12.5 3 3 6-6.5"/></svg>';}
      else if(t==='gec'){dur='geç çözüldü · '+r.d+'/'+NS+' doğru';ic='<svg class="uf-oi gec" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m7.5 12.5 3 3 6-6.5"/></svg>';}
      else{dur='çözülmedi';ic='<svg class="uf-oi bos" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>';}
      o+='<div class="uf-or-k"'+gz+'><button type="button" class="uf-or '+t+'" data-k="'+k+'" data-t="'+t+'" aria-label="'+esc(ad(k)+', '+dur+(t==='bos'?'. Seçenekleri aç':'. Sonucu aç'))+'">'+ic+'<b>'+esc(ad(k))+'</b><span>'+esc(dur)+'</span><em aria-hidden="true">'+(t==='bos'?'Sonradan çöz ›':'›')+'</em></button>'+
        (t==='bos'?'<div class="uf-or-e" hidden><p>Bu set sonradan çözülür; seriye ve unvana sayılmaz.</p><button type="button" class="uf-btn2 gc" data-k="'+k+'">Sonradan çöz</button></div>':'')+'</div>';});
    o+='</div>'+(rows.length>7&&!tumu?'<button type="button" class="uf-btn2 uf-tum">Tümünü göster ('+rows.length+')</button>':'')+'</div>';
    return o;
  }
  /* ---- unvan töreni: geçilemez ---- */
  var tAktif=false,tZ=[];
  function tEngel(e){if(!tAktif)return;e.preventDefault();e.stopPropagation();}
  function toren(eski,yeni,bitti){
    if(tAktif)return false;tAktif=true;
    var reduce=az(),sure=reduce?2000:3300,u=UNV[yeni];
    var son='<div class="muhur" aria-hidden="true"><b>'+esc(u[0].toUpperCase())+'</b><span>'+esc(u[1])+'</span></div>';
    var o=document.createElement('div');o.className='uf-toren';o.setAttribute('role','alertdialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-label','Yeni unvan: '+u[0]+', '+u[1]);o.tabIndex=-1;
    o.innerHTML='<div class="uf-tr-k"><div class="uf-tr-st">Yeni unvan</div>'+maskot(220,'uf-m-t toren',reduce?yeni:eski,{on:'<div class="isik" aria-hidden="true"></div>',son:son})+
      '<div class="uf-tr-ad" role="status">'+esc(u[1])+' oldun</div><p>Emeğin bir basamak daha ilerledi.</p></div>';
    document.body.appendChild(o);document.body.classList.add('uf-kilit');
    try{if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();o.focus();}catch(e){}
    ['keydown','keyup','keypress'].forEach(function(t){document.addEventListener(t,tEngel,true);});
    ['touchstart','touchmove','touchend','click','pointerdown'].forEach(function(tp){o.addEventListener(tp,function(e){e.stopPropagation();if(e.cancelable)e.preventDefault();},{passive:false});});
    var geri=function(){if(tAktif&&window.LEX_GERI)LEX_GERI.ekle('ufk-toren',geri);};
    if(window.LEX_GERI)LEX_GERI.ekle('ufk-toren',geri);
    if(!reduce)tZ.push(setTimeout(function(){var m=o.querySelector('.uf-m');if(m)m.className=m.className.replace(/\br-\d\b/,'r-'+(yeni+1));},1150));
    tZ.push(setTimeout(function(){
      tAktif=false;tZ=[];
      kayitYaz({v:1,r:yeni});
      ['keydown','keyup','keypress'].forEach(function(t){document.removeEventListener(t,tEngel,true);});
      if(o.parentNode)o.parentNode.removeChild(o);document.body.classList.remove('uf-kilit');
      if(window.LEX_GERI)LEX_GERI.dus('ufk-toren');
      sinifGuncelle();if(bitti)bitti();
    },sure));
    return true;
  }
  window.LEX_UFUK={rom:rom,UNV:UNV,hesap:hesap,kayitR:kayitR,baslat:baslat,maskot:maskot,sinifGuncelle:sinifGuncelle,yolOzet:yolOzet,yolIlerle:yolIlerle,seriKart:seriKart,unvanKart:unvanKart,yol:yol,liste:liste,toren:toren,
    kur:function(ns){NS=ns;},aktifToren:function(){return tAktif;},esc:esc};
})();

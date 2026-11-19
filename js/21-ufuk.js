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
  // ---- ana ekran: perspektifli Roma yolu (dikey kaydirilir, levhalara oturur) ----
  var KILIT='<g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" transform="translate(26 26) scale(.5)"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></g>';
  var NS_='http://www.w3.org/2000/svg';
  var SAAT='<g class="uf-sat2"><circle cx="58" cy="58" r="10" class="uf-saty"/><path d="M58 52v6l4 2.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></g>';
  function slabSvg(t,rm){
    var c=38,s='<svg class="uf-sl-s" viewBox="0 0 76 76" width="76" height="76" aria-hidden="true" focusable="false">';
    if(t==='tam')s+='<circle cx="38" cy="38" r="26" class="uf-c-tam" stroke-width="3"/><path d="M29 39 L36 46 L48 32" fill="none" stroke="#F8EBC4" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>';
    else if(t==='gec')s+='<circle cx="38" cy="38" r="26" class="uf-c-gec" stroke-width="3"/><path d="M28 38 L35 45 L47 31" fill="none" class="uf-c-gk" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'+SAAT;
    else if(t==='bos')s+='<circle cx="38" cy="38" r="22" class="uf-bsd" stroke-width="2"/><path d="M32 38 h12" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>';
    else if(t==='bugun')s+='<circle cx="38" cy="38" r="37" class="uf-hl"/><circle cx="38" cy="38" r="31" fill="#C9A227" stroke="#fff" stroke-width="3" class="uf-kn"/>'+(rm==='tik'?'<path d="M26 39 L35 48 L51 30" fill="none" stroke="#3F1219" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>':'<text x="38" y="47" text-anchor="middle" class="uf-rom">'+rm+'</text>');
    else s+='<circle cx="38" cy="38" r="24" class="uf-kl" stroke-width="2"/>'+KILIT.replace('translate(26 26)','translate(26 26)');
    return s+'</svg>';
  }
  function yol3(host,hint,o){
    var d=o.d,v=o.v,h=o.h,G=o.gec||{},ad=o.ad,NSx=o.NS||NS;
    var ilk=d.set?d.ilk:h,lo=Math.max(0,Math.min(ilk,h-30)),hi=h+7;
    Object.keys(G).forEach(function(k){k=+k;if(k<lo&&k>=0)lo=k;});
    var CX=0,reduce=az(),W=0,H=360,Y0=205,PX=62,pos=h,target=h,raf=0,last=0,ps=null;
    function tur(k){return k===h?'bugun':k>h?'kilit':v[k]?'tam':G[k]?'gec':'bos';}
    function l1(k,t){return t==='kilit'?(k===h+1?'Yarın':(k-h)+' gün sonra'):(t==='bugun'?'Bugün':ad(k));}
    function l2(k,t){var r=v[k]||G[k];return t==='tam'?r.d+'/'+NSx+' doğru':t==='gec'?'geç çözüldü':t==='bos'?'çözülmedi':t==='kilit'?'kilitli':(r?r.d+'/'+NSx+' doğru':(o.devam?'Devam et':'Başla'));}
    function aria(k,t){var r=v[k]||G[k];return l1(k,t)+', '+(t==='tam'?'tamamlandı, '+r.d+' doğru. Sonucu aç':t==='gec'?'geç çözüldü, seriye sayılmaz. Sonucu aç':t==='bos'?'çözülmedi. Seçenekleri aç':t==='kilit'?'kilitli':(r?'bugünün seti, tamamlandı. Sonucu aç':'bugünün seti, '+(o.devam?'devam et':'başla')));}
    var BG='<svg class="uf-3d-bg" viewBox="0 0 390 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M10 120 V90 A55 55 0 0 1 120 90 V120 M140 120 V90 A55 55 0 0 1 250 90 V120 M270 120 V90 A55 55 0 0 1 380 90 V120"/><path d="M0 120 H390"/><path d="M-6 120 V30 M-6 30 h14 M-2 36 h6 M12 120 V30 M12 30 h-10 M378 120 V30 M396 120 V30 M378 30 h20 M382 36 h12" class="uf-col"/><path d="M24 360 V150 M24 150 h-10 M20 156 h-2" class="uf-col2"/><path d="M366 360 V150 M366 150 h10 M370 156 h2" class="uf-col2"/></g></svg>';
    var html=BG+'<div class="uf-3d-sur"></div><svg class="uf-3d-yol" xmlns="'+NS_+'" aria-hidden="true" focusable="false"><path class="uf-pat-b"/><path class="uf-pat-d"/></svg>';
    var items=[],k;
    for(k=lo;k<=hi;k++){var t=tur(k),r=v[k]||G[k],rm=t==='bugun'?(r?'tik':rom(d.set+1)):'',sag=k<=h?((h-k)%2===1||k===h):((k-h)%2===0);
      html+='<button type="button" class="uf-sl '+t+(sag?' R':' L')+'" data-k="'+k+'" data-t="'+t+'" tabindex="-1" aria-label="'+esc(aria(k,t))+'">'+slabSvg(t,rm)+'<span class="lb"><b>'+esc(l1(k,t))+'</b><i'+(t==='bugun'?' class="bg"':'')+'>'+esc(l2(k,t))+'</i></span></button>';}
    html+='<div class="uf-3d-aslan" aria-hidden="true">'+maskot(84)+'</div>';
    html+='<div class="uf-3d-ok"><button type="button" class="uf-ileri" aria-label="Yolda ileri: gelecek günlere"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg></button><button type="button" class="uf-geri" aria-label="Yolda geri: geçmiş günlere"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button></div>';
    html+='<button type="button" class="uf-3d-don" aria-label="Bugüne dön">Bugüne dön</button>';
    host.className='uf-3d';host.setAttribute('role','group');host.setAttribute('tabindex','0');host.setAttribute('aria-label','Günlük setler. Yukarı ok ileri, aşağı ok geri, Home bugüne döner.');
    host.innerHTML=html;
    var sl=[].slice.call(host.querySelectorAll('.uf-sl')),yolSvg=host.querySelector('.uf-3d-yol'),pb=host.querySelector('.uf-pat-b'),pd=host.querySelector('.uf-pat-d'),btnD=host.querySelector('.uf-3d-don'),bI=host.querySelector('.uf-ileri'),bG=host.querySelector('.uf-geri'),aslan=host.querySelector('.uf-3d-aslan');
    function clamp(x,a,b){return x<a?a:x>b?b:x;}
    /* d: odaga uzaklik (0 = odak). Hafif kuculme ve solma; ust tarafta gelecek, altta gecmis */
    function yerZ(dd){return dd>=0?Y0-72*dd/(1+.1*dd):Y0+72*(-dd)/(1+.05*(-dd));}
    function gom(el,g){if(el._g!==g){el._g=g;el.style.visibility=g?'hidden':'';}}
    function ciz(){
      if(!document.body.contains(host)){removeEventListener('resize',boyut);return;}
      var cx=CX,i,dd,y,a,sc,op,off,e,pts=[];
      for(i=0;i<sl.length;i++){e=sl[i];var kk=lo+i,sag=e.classList.contains('R');dd=kk-pos;a=dd<0?-dd:dd;
        y=yerZ(dd);sc=1/(1+(dd<0?.2:.14)*a);off=(kk===h?0:(sag?1:-1))*34*sc*Math.min(1,a);
        if(dd<-2.3||dd>3.6){gom(e,true);continue;}gom(e,false);
        op=dd<0?Math.max(0,1-.42*a):Math.max(.12,1-.24*a);if(dd>3)op*=Math.max(0,3.6-dd)/.6;
        e.style.transform='translate3d('+(cx+off-38).toFixed(1)+'px,'+(y-38).toFixed(1)+'px,0) scale('+sc.toFixed(3)+')';
        e.style.opacity=op.toFixed(3);e.style.zIndex=String(500-Math.round(a*20));
        var fo=a<.5;if(e._f!==fo){e._f=fo;e.classList.toggle('fo',fo);}
        e.tabIndex=a<.5?0:-1;pts.push([kk,cx+off,y]);}
      /* levhalari baglayan kivrimli patika: gecmis dolu, gelecek noktali */
      var sb='',sd='',p0,p1,ym,seg;
      for(i=0;i<pts.length-1;i++){p0=pts[i];p1=pts[i+1];ym=((p0[2]+p1[2])/2).toFixed(1);
        seg='M'+p1[1].toFixed(1)+' '+p1[2].toFixed(1)+' C'+p1[1].toFixed(1)+' '+ym+' '+p0[1].toFixed(1)+' '+ym+' '+p0[1].toFixed(1)+' '+p0[2].toFixed(1);
        if(p1[0]<=h)sb+=seg;else sd+=seg;}
      pb.setAttribute('d',sb);pd.setAttribute('d',sd);
      if(aslan){var uz=pos-h;uz=uz<0?-uz:uz;aslan.style.opacity=String(Math.max(.25,1-.75*Math.min(1,uz)).toFixed(2));}
      var uz=Math.abs(target-h)>=1;btnD.classList.toggle('g',uz);btnD.tabIndex=uz?0:-1;
      bI.disabled=target>=hi;bG.disabled=target<=lo;
    }
    function boyut(){W=host.clientWidth;CX=(W-52)/2+4;yolSvg.setAttribute('viewBox','0 0 '+W+' '+H);yolSvg.setAttribute('width',W);yolSvg.setAttribute('height',H);
      aslan.style.transform='translate3d('+Math.max(2,CX-128).toFixed(0)+'px,'+(Y0-30)+'px,0)';ciz();}
    function tick(ts){var dt=Math.min(64,ts-last);last=ts;var df=target-pos;
      if(Math.abs(df)<.002){pos=target;ciz();raf=0;return;}
      pos+=df*(1-Math.exp(-dt/95));ciz();raf=requestAnimationFrame(tick);}
    function git(t){target=clamp(Math.round(t),lo,hi);bilgi();
      if(reduce){pos=target;ciz();return;}
      if(!raf){last=performance.now();raf=requestAnimationFrame(tick);}}
    /* odaktaki levhanin ozeti ve eylemi */
    function bilgi(ipucu){
      var k=target,t=tur(k),r=v[k]||G[k],s='',b='',n=k-h;
      if(t==='bugun')s=r?'Bugün · '+r.d+'/'+NSx+' doğru':'Bugün · yeni set seni bekliyor';
      else if(t==='tam')s=ad(k)+' · '+r.d+'/'+NSx+' doğru';
      else if(t==='gec')s=ad(k)+' · geç çözüldü, '+r.d+'/'+NSx+' doğru. Seriye sayılmaz.';
      else if(t==='bos'){s=ad(k)+' · çözülmedi. Sonradan çözersen seriye ve unvana sayılmaz.';b='<button type="button" class="uf-btn2 gc">Bu seti sonradan çöz</button>';}
      else s=ipucu?(n===1?'Bu levha yarın açılır':'Bu levha '+n+' gün sonra açılır'):(n===1?'Yarın · kilitli':n+' gün sonra · kilitli');
      hint.innerHTML='<span>'+esc(s)+'</span>'+b;
      var gb=hint.querySelector('.gc');if(gb)gb.addEventListener('click',function(){o.gecCoz(k);});
    }
    var surukle=false;
    host.addEventListener('pointerdown',function(e){if(e.target.closest('.uf-3d-ok,.uf-3d-don'))return;if(e.pointerType==='mouse'&&e.button!==0)return;
      if(e.pointerType==='touch'){var hr=host.getBoundingClientRect();if(Math.abs(e.clientX-hr.left-hr.width/2)>hr.width*.25){ps=null;return;}}
      ps={id:e.pointerId,y:e.clientY,p:pos,m:false,ly:e.clientY,lt:performance.now(),v:0};if(raf){cancelAnimationFrame(raf);raf=0;}});
    host.addEventListener('pointermove',function(e){if(!ps||e.pointerId!==ps.id)return;var dy=ps.y-e.clientY;
      if(!ps.m&&Math.abs(dy)>6){ps.m=true;try{host.setPointerCapture(ps.id);}catch(x){}}
      if(!ps.m)return;e.preventDefault();var nw=performance.now(),dt=nw-ps.lt;
      if(dt>0){ps.v=ps.v*.6+((ps.ly-e.clientY)/PX/dt)*.4;}ps.ly=e.clientY;ps.lt=nw;
      pos=clamp(ps.p+dy/PX,lo-.35,hi+.35);target=pos;ciz();});
    function birak(e){if(!ps||(e&&e.pointerId!==ps.id))return;var m=ps.m,vel=ps.v;ps=null;
      if(m){surukle=true;setTimeout(function(){surukle=false;},60);try{host.releasePointerCapture(e.pointerId);}catch(x){}
        var hd=Math.round(pos+clamp(vel*170,-5,5));target=pos;git(hd);}}
    host.addEventListener('pointerup',birak);host.addEventListener('pointercancel',birak);
    ['touchstart','touchmove','touchend'].forEach(function(tp){host.addEventListener(tp,function(e){e.stopPropagation();},{passive:true});});
    host.addEventListener('click',function(e){
      var b=e.target.closest('.uf-sl');if(!b||surukle)return;var k=+b.getAttribute('data-k'),t=b.getAttribute('data-t');
      if(t==='kilit'){git(k);bilgi(true);if(!reduce){b.classList.remove('sal');void b.offsetWidth;b.classList.add('sal');setTimeout(function(){b.classList.remove('sal');},520);}return;}
      if(t==='bos'){git(k);return;}
      o.ac(k);});
    bI.addEventListener('click',function(){git(Math.round(target)+1);});
    bG.addEventListener('click',function(){git(Math.round(target)-1);});
    btnD.addEventListener('click',function(){git(h);host.focus({preventScroll:true});});
    host.addEventListener('keydown',function(e){if(e.target!==host)return;
      if(e.key==='ArrowUp'){e.preventDefault();git(Math.round(target)+1);}else if(e.key==='ArrowDown'){e.preventDefault();git(Math.round(target)-1);}else if(e.key==='Home'){e.preventDefault();git(h);}});
    addEventListener('resize',boyut);
    boyut();bilgi();
    if(window.ResizeObserver){try{new ResizeObserver(function(){if(host.clientWidth!==W)boyut();}).observe(host);}catch(x){}}
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
  window.LEX_UFUK={rom:rom,UNV:UNV,hesap:hesap,kayitR:kayitR,baslat:baslat,maskot:maskot,sinifGuncelle:sinifGuncelle,yolOzet:yolOzet,yolIlerle:yolIlerle,seriKart:seriKart,unvanKart:unvanKart,yol3:yol3,toren:toren,
    kur:function(ns){NS=ns;},aktifToren:function(){return tAktif;},esc:esc};
})();

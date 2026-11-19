/* LEX_DOSYA(blob, ad, mime, metin, secenek): dosya/metin paylaş ya da indir. Uygulamada (Capacitor WebView) navigator.share ve <a download> çalışmaz: Filesystem + Share eklentileri kullanılır. Web'de: dosya paylaşılabiliyorsa navigator.share, değilse indirme. Söz verir: 'paylasildi' | 'indirildi' | 'iptal' | 'hata'. secenek: {baslik, indir:true (web'de paylaşma yerine doğrudan indir)} */
(function(){
  function b64(blob){return new Promise(function(ok,hata){var r=new FileReader();r.onload=function(){var s=String(r.result||''),i=s.indexOf(',');ok(i<0?'':s.slice(i+1));};r.onerror=function(){hata(r.error||new Error('okunamadi'));};r.readAsDataURL(blob);});}
  function temiz(ad){return String(ad||'dosya').replace(/[\\\/:*?"<>|\u0000-\u001f]+/g,'_').slice(0,120)||'dosya';}
  function iptalMi(e){var s=String(e&&(e.name||e.message||e)||'');return /AbortError|cancel|iptal|dismiss/i.test(s);}
  function indir(blob,ad){
    var u=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=u;a.download=ad;a.style.display='none';document.body.appendChild(a);a.click();
    setTimeout(function(){try{a.remove();}catch(_){}URL.revokeObjectURL(u);},30000);
  }
  window.LEX_DOSYA=async function(blob,ad,mime,metin,sec){
    sec=sec||{};window.LEX_DOSYA_HATA='';ad=temiz(ad);
    var baslik=sec.baslik||ad,P=window.Capacitor&&window.Capacitor.Plugins;
    try{
      if(window.Capacitor&&P&&P.Share){
        var Fs=P.Filesystem,Sh=P.Share;
        if(blob){
          if(!Fs)return 'hata';
          // büyük dosyalar (yedek onlarca MB olabilir) tek seferde köprüden geçmez: 3 MB'lık parçalar hâlinde yaz
          var PARCA=3*1024*1024,w=null;
          for(var o=0;o<Math.max(1,blob.size);o+=PARCA){
            var d=await b64(blob.slice(o,o+PARCA));
            if(o===0)w=await Fs.writeFile({path:ad,data:d,directory:'CACHE',recursive:true});
            else await Fs.appendFile({path:ad,data:d,directory:'CACHE'});
          }
          var uri=w&&w.uri;
          if(!uri){var g=await Fs.getUri({path:ad,directory:'CACHE'});uri=g&&g.uri;}
          var po={title:baslik,dialogTitle:baslik,files:[uri]};if(sec.yazi)po.text=sec.yazi;await Sh.share(po);
        }else{
          await Sh.share({title:baslik,dialogTitle:baslik,text:metin||''});
        }
        return 'paylasildi';
      }
      if(blob){
        var f=null;try{f=new File([blob],ad,{type:mime||blob.type||'application/octet-stream'});}catch(e){}
        if(!sec.indir&&f&&navigator.share&&navigator.canShare&&navigator.canShare({files:[f]})){
          try{var so={files:[f],title:baslik};if(sec.yazi)so.text=sec.yazi;await navigator.share(so);return 'paylasildi';}
          catch(e){if(iptalMi(e))return 'iptal';}
        }
        indir(blob,ad);return 'indirildi';
      }
      if(!sec.indir&&navigator.share){
        try{await navigator.share({title:baslik,text:metin||''});return 'paylasildi';}
        catch(e){if(iptalMi(e))return 'iptal';}
      }
      indir(new Blob([metin||''],{type:mime||'text/plain;charset=utf-8'}),ad);return 'indirildi';
    }catch(e){
      if(iptalMi(e))return 'iptal';
      window.LEX_DOSYA_HATA=String(e&&(e.message||e.errorMessage||e)||'bilinmeyen hata').slice(0,160);
      return 'hata';
    }
  };
})();

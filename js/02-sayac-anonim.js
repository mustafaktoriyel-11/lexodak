// ---- Anonim kullanım sayacı: Google Apps Script adresi buraya yazılınca çalışır (boşken hiçbir veri gönderilmez) ----
var SAYAC_URL='https://script.google.com/macros/s/AKfycbxVbGhs7Gjpt_nkIjYZmiuLL0dSnSFc07JKoeM6n_zVfUb652R3K3U7Dh3_kRXYjEznCQ/exec';
// ---- Hazır ders listeleri (fakülteye göre değişebilir; kullanıcı "Dersleri düzenle" ile değiştirir) ----
var LEX_SINIF={
  '1':['Anayasa Hukuku','Medeni Hukuk','Hukuk Başlangıcı','Roma Hukuku','Hukuk Tarihi','İktisat'],
  '2':['Borçlar Genel','Ceza Genel','İdare Hukuku','Milletlerarası Hukuk','Genel Kamu Hukuku','Hukuk Felsefesi','Kamu Maliyesi'],
  '3':['Borçlar Özel','Ceza Özel','Eşya Hukuku','Medeni Usul','Ticaret Hukuku','İdari Yargı','Vergi Hukuku'],
  '4':['Ceza Muhakemesi','İcra ve İflas','İş Hukuku','Miras Hukuku','Kıymetli Evrak','Deniz Ticareti','Sigorta Hukuku','MÖHUK','Avukatlık Hukuku'],
  'H':['Anayasa Hukuku','İdare Hukuku','İdari Yargı','Genel Kamu Hukuku','Medeni Hukuk','Borçlar Hukuku','Ticaret Hukuku','Medeni Usul','İcra ve İflas','İş Hukuku','MÖHUK','Ceza Hukuku','Ceza Muhakemesi','Vergi Hukuku','Avukatlık Hukuku','Milletlerarası Hukuk','Hukuk Felsefesi','Hukuk Tarihi']
};
var LEX_SINIF_AD={'1':'1. sınıf','2':'2. sınıf','3':'3. sınıf','4':'4. sınıf','H':'HMGS'};
function lexDersler(){
  var l=null;try{l=JSON.parse(localStorage.getItem('lex-dersler')||'null');}catch(e){}
  if(!l||!l.length)l=LEX_SINIF.H;
  return l.filter(function(x){return typeof x==='string'&&x&&x!=='Diğer';}).slice(0,40);
}
(function(){
  var l=lexDersler().concat(['Diğer']);
  ['pm-ders','dnm-o-ders'].forEach(function(id){var s=document.getElementById(id);if(!s)return;s.innerHTML='';
    l.forEach(function(x){var o=document.createElement('option');o.value=x;o.textContent=x;s.appendChild(o);});});
})();

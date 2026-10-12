(function(){
 'use strict';
 var form=document.getElementById('gastro-form');
 if(!form)return;
 function track(name){
  if(window.PPZConsent&&window.PPZConsent.hasConsent('analytics')&&typeof window.gtag==='function')window.gtag('event',name,{form_id:'kontakt_gastro',service:'gastro'});
 }
 var started=false;
 form.addEventListener('input',function(){if(!started){started=true;track('form_start');}},{passive:true});
 form.addEventListener('submit',async function(event){
  event.preventDefault();
  var button=form.querySelector('button[type="submit"]'),status=document.getElementById('form-status');
  if(button.disabled)return;
  button.disabled=true;status.textContent='Wysyłanie zapytania…';
  try{
   var data=new FormData(form);
   if(window.PPZConsent&&window.PPZConsent.hasConsent('analytics')){
    var query=new URLSearchParams(location.search);
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(k){
     data.set(k,(query.get(k)||'').slice(0,200));
    });
   }
   var response=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data).toString()});
   if(!response.ok)throw Error('send');
   track('generate_lead');
   if(window.PPZConsent&&window.PPZConsent.hasConsent('marketing')&&typeof window.fbq==='function')window.fbq('track','Lead',{content_name:'ksiegowosc_gastro'});
   status.textContent='Zapytanie zostało wysłane. Dziękujemy!';form.reset();
   button.textContent='Zapytanie wysłane';
  }catch(err){status.textContent='Nie udało się wysłać formularza. Spróbuj ponownie lub zadzwoń: 513 013 580.';button.disabled=false;}
 });
})();

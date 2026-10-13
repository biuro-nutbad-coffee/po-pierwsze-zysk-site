(function(){'use strict';
const q=new URLSearchParams(location.search),source=q.get('source')||'';
if(/^[a-zA-Z0-9.-]{1,100}$/.test(source))document.querySelectorAll('[data-offer-link]').forEach(a=>{let u=new URL(a.href);u.searchParams.set('utm_source',source);u.searchParams.set('utm_medium','referral');u.searchParams.set('utm_campaign','gastro_offer');u.searchParams.set('utm_content','embedded_packages');a.href=u.href;});
let last=0;function size(){const height=Math.ceil(document.body.getBoundingClientRect().height);if(height!==last){last=height;parent.postMessage({type:'ppz-offer-height',height},'*');}}
new ResizeObserver(size).observe(document.body);addEventListener('load',size);document.fonts.ready.then(size);
})();

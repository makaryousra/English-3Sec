/* Offline support: caches the site, its JSON files, audio and the Firebase scripts after the first online visit. */
const V='s3-offline-v17';
const CORE=['./','index.html','reading.json','writing.json'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(V).then(c=>Promise.all([fetch('./').then(r=>{if(r&&r.ok){c.put(new Request('./'),r.clone());c.put(new Request('index.html'),r.clone())}}).catch(()=>{}),...CORE.filter(u=>u!=='./'&&u!=='index.html').map(u=>c.add(new Request(u)).catch(()=>{}))])))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
const OK=u=>u.origin===location.origin||u.hostname==='www.gstatic.com'||u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com';
const timeout=(ms)=>new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),ms));
async function range(req,res){const m=/bytes=(\d*)-(\d*)/.exec(req.headers.get('range')||'');if(!m)return res;const b=await res.arrayBuffer(),n=b.byteLength;let s=m[1]===''?Math.max(0,n-(+m[2]||0)):+m[1],e=m[1]===''||m[2]===''?n-1:Math.min(+m[2],n-1);
 return new Response(b.slice(s,e+1),{status:206,statusText:'Partial Content',headers:{'Content-Type':res.headers.get('Content-Type')||'application/octet-stream','Content-Range':'bytes '+s+'-'+e+'/'+n,'Content-Length':String(e-s+1),'Accept-Ranges':'bytes'}})}
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;const url=new URL(req.url);if(!OK(url))return;if(/audio_(us|uk)_[^\/]*\.bin$/.test(url.pathname)||/audio_index_(us|uk)\.json$/.test(url.pathname)){return} /* big audio packs: leave to the network (real Range requests) */
 const isDoc=req.mode==='navigate'||/(\/|index\.html|\.json)$/.test(url.pathname);
 e.respondWith((async()=>{const cache=await caches.open(V),key=req.mode==='navigate'?new Request(url.origin+url.pathname):new Request(req.url);
  const hasRange=req.headers.has('range');
  if(isDoc){ /* network first (fresh updates), cached copy when offline or slow */
   try{const fp=fetch(req.mode==='navigate'?req:new Request(req.url,{cache:'no-cache'}));fp.then(r2=>{if(r2&&r2.ok){cache.put(key,r2.clone()).catch(()=>{});if(req.mode==='navigate')cache.put(new Request(url.origin+url.pathname+'index.html'),r2.clone()).catch(()=>{})}}).catch(()=>{});e.waitUntil(fp.catch(()=>{}));const res=await Promise.race([fp.then(r3=>r3.clone()),timeout(5000)]);if(res&&res.ok){cache.put(key,res.clone()).catch(()=>{});if(req.mode==='navigate')cache.put(new Request(url.origin+url.pathname+'index.html'),res.clone()).catch(()=>{})}return res}
   catch(err){const c=await cache.match(key)||await cache.match(url.origin+url.pathname.replace(/[^\/]*$/,'')+'index.html')||await cache.match('index.html');if(c)return c;throw err}}
  /* everything else: cache first, then network and remember it */
  const c=await cache.match(new Request(req.url));if(c){if(!hasRange&&navigator.onLine!==false)e.waitUntil(fetch(new Request(req.url,{cache:'no-cache'})).then(r=>{if(r&&r.ok&&r.status===200)return cache.put(new Request(req.url),r)}).catch(()=>{}));return hasRange?range(req,c):c}
  const res=await fetch(hasRange?new Request(req.url):req);if(res&&res.ok&&res.status===200)cache.put(new Request(req.url),res.clone()).catch(()=>{});return hasRange&&res.status===200?range(req,res):res})())});

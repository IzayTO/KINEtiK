// Atomic local asset cache. No CDN, backend or account. Bump VERSION when publishing edits.
const VERSION='v3-visores-landscape-20261120-1',PREFIX='nodo09-'+self.registration.scope+'-',CACHE=PREFIX+VERSION;
const FILES=['./','index.html','style.css','icon.svg','three.module.min.js','game.js','physics.js','input.js','level.js','render.js','combat.js','hud.js','preferences.js','settings-v2.js','refinements.js','weapon-models.js','world-v2.js','world-v3.js','navigation.js','match.js','soldier.js','audio.js','supplies.js','aim-support.js','combat-feedback.js','combat-ui.js','loot-visuals.js','blood.js','bot-roster.js','environment.js','ordnance.js','objectives.js','field-models.js','field-view.js','field-hud.js','audio-bank.js','rc.js','rc-view.js','interface.js','interface.css','field-effects.js','airport.js','rocket-model.js','config-io.js','airfield.css','stars.js','support.js','support-view.js','support-ui.js','accolades.js','nuclear.js','operation-ui.js','nuclear-view.js','operation.css','atomic-cloud.js','arsenal-layout.js','throw-guide.js','prop-geometry.js','talon-model.js','standalone.html','kinetik.webmanifest','visor-designs.js','visor-mesh.js','visor-board.js','visor-preview.js','visor-editor.js','visor.css'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
// A new worker activates after existing game tabs close, never in the middle of a match.
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const url=new URL(e.request.url),scope=new URL(self.registration.scope);
 if(e.request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname)||url.searchParams.has('qa'))return;
 e.respondWith((async()=>{const cache=await caches.open(CACHE);if(e.request.mode==='navigate'){const shell=url.pathname===new URL('standalone.html',scope).pathname?'standalone.html':'index.html';return await cache.match(shell)||fetch(e.request);}
 const local=FILES.find(f=>new URL(f,scope).pathname===url.pathname);if(!local)return fetch(e.request);return await cache.match(local)||fetch(e.request);})());
});

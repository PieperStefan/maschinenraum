// Maschinenraum – App: Bots, Live-Status, Bedienfeld, Sekretariat/Arzt, Mutter.
// Alles Persönliche kommt aus /api/config (privat/config.json). Die Welt baut welt.js aus raeume/*.json.
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {CSS2DRenderer,CSS2DObject} from 'three/addons/renderers/CSS2DRenderer.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {baueWelt} from './welt.js';

const CFG=await (await fetch('api/config',{cache:'no-store'})).json();
document.title=CFG.titel;document.getElementById('titel').textContent=CFG.titel;
const BENUTZER=CFG.benutzer||'Du';

// ── Renderer, Szene, Kamera ────────────────────────────────
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.78;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.getElementById('c').appendChild(renderer.domElement);
const labels=new CSS2DRenderer({element:document.getElementById('labels')});labels.setSize(innerWidth,innerHeight);
const scene=new THREE.Scene();
const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.3;
const camera=new THREE.PerspectiveCamera(32,innerWidth/innerHeight,.1,9000);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.minPolarAngle=.3;controls.maxPolarAngle=1.48;controls.minDistance=3;controls.maxDistance=120;controls.screenSpacePanning=false;

function portalUrl(){const p=CFG.portal;if(!p)return null;const h=location.hostname;
  const t=(p.urls||[]).find(u=>h.endsWith(u.wenn_host_endet||'\u0000'));return (t?t.url:p.url||'').replace('{host}',h)}
const AKTIONEN={mutter:()=>openMutter(),sekretariat:()=>openSekretariat()};
const W=await baueWelt(scene,CFG,n=>AKTIONEN[n]&&AKTIONEN[n](),portalUrl);

// ── Spielzustand ───────────────────────────────────────────
const COL={ok:0x22c55e,run:0xfacc15,err:0xef4444,off:0x8b95a3},CSSC={ok:'#22c55e',run:'#facc15',err:'#ef4444',off:'#8b95a3'};
const RANG={err:3,run:2,ok:1,off:0};
const fx={tresorT:0,pruefen:null,postFehler:false,mutterDenkt:false};
let sim=Date.now(),selected=null;
const hm=ms=>new Date(ms).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
const dur=ms=>{ms=Math.max(0,ms);const m=Math.round(ms/6e4);if(m>=2880)return Math.round(m/1440)+' Tagen';if(m>=60)return Math.floor(m/60)+' h '+(m%60)+' min';return m+' min'};
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtKurz=s=>{if(!s)return '–';const d=new Date(typeof s==='number'?s:Date.parse(s)),h=new Date();const t=d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});return d.toDateString()===h.toDateString()?'heute '+t:(d-h<864e5*1.5&&d>h?'morgen '+t:d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})+' '+t)};
const ts=s=>s?(typeof s==='number'?s:Date.parse(s)):0;
const fmt=s=>s?new Date(ts(s)).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'–';
const schlimmster=l=>l.reduce((a,b)=>RANG[b]>RANG[a]?b:a,'off');
function kurz(l){for(const p of CFG.prefixe||[])if(l.startsWith(p))return l.slice(p.length);return l.replace(/^homebrew\.mxcl\./,'')}

// ── Anzeigen (Wandtafeln) ──────────────────────────────────
const SC={ok:'#22c55e',run:'#facc15',err:'#ef4444',off:'#64748b'};
function zeichneTabelle(tex,title,rows){const c=tex.image,g=c.getContext('2d'),w=c.width,h=c.height,k=w/1024;g.fillStyle='#0b1526';g.fillRect(0,0,w,h);g.fillStyle='#38bdf8';g.font=`bold ${52*k}px sans-serif`;g.textAlign='left';g.fillText(title,40*k,76*k);
  rows.forEach((r,i)=>{const y=150*k+i*Math.min(64*k,(h-170*k)/Math.max(1,rows.length));g.fillStyle=SC[r[2]]||'#94a3b8';g.beginPath();g.arc(58*k,y-12*k,14*k,0,7);g.fill();
    g.fillStyle='#e2e8f0';g.font=`${34*k}px sans-serif`;g.textAlign='left';g.fillText(r[0],92*k,y);g.fillStyle='#93c5fd';g.textAlign='right';g.fillText(r[1],w-40*k,y);g.textAlign='left'});tex.needsUpdate=true}
const anz=n=>W.anzeigen[n]||[];
function zeichneSicherungen(liste){for(const a of anz('sicherungen')){const c=a.tex.image,g=c.getContext('2d'),Wd=c.width,H=c.height;g.fillStyle='#0b1526';g.fillRect(0,0,Wd,H);g.fillStyle='#38bdf8';g.font='bold 76px sans-serif';g.fillText('SICHERUNGEN',50,100);
  const cols=[[130,'Sicherung'],[900,'Rhythmus'],[1450,'Zuletzt'],[1990,'Nächster Lauf']];g.font='bold 40px sans-serif';g.fillStyle='#64748b';cols.forEach(([x,t])=>g.fillText(t,x,170));
  const zh=Math.min(100,(H-210)/Math.max(1,liste.length));liste.forEach((b,i)=>{const y=245+i*zh;if(i%2){g.fillStyle='rgba(148,163,184,.06)';g.fillRect(30,y-zh*.62,Wd-60,zh)}g.fillStyle=SC[b.status]||'#94a3b8';g.beginPath();g.arc(80,y-16,20,0,7);g.fill();
    g.font='54px sans-serif';g.fillStyle='#f1f5f9';g.fillText(b.name,130,y);g.fillStyle='#93c5fd';g.fillText(b.rhythmus||'–',900,y);g.fillStyle='#cbd5e1';g.fillText(b.status==='run'?'läuft gerade':fmtKurz(b.zuletzt),1450,y);
    g.fillStyle='#fde68a';g.fillText(fmtKurz(b.naechst)+(b.naechst?'  ('+dur(Date.parse(b.naechst)-Date.now())+')':''),1990,y)});a.tex.needsUpdate=true}
  for(const a of anz('regal'))a.etiketten.forEach((t,i)=>{const g=t.image.getContext('2d'),b=liste[i];g.fillStyle='#0b1526';g.fillRect(0,0,640,90);if(!b){t.needsUpdate=true;return}
    g.fillStyle='#1f2b44';g.fillRect(8,10,70,70);g.fillStyle=SC[b.status]||'#94a3b8';g.fillRect(16,58,54,10);
    g.fillStyle='#e2e8f0';g.font='bold 30px sans-serif';g.fillText(b.name.replace(/ \([^)]*\)$/,''),92,38);g.fillStyle='#93c5fd';g.font='24px sans-serif';g.fillText(b.rhythmus||'',92,72);
    g.textAlign='right';g.fillStyle='#cbd5e1';g.fillText('nächster '+fmtKurz(b.naechst),628,72);g.textAlign='left';t.needsUpdate=true})}
for(const a of anz('system'))zeichneTabelle(a.tex,CFG.check_titel,[['lade …','','off']]);
for(const a of anz('aufgaben'))zeichneTabelle(a.tex,'ALLE AUFGABEN',[['lade …','','off']]);

// ── Aufgaben-Bausteine ─────────────────────────────────────
const walk=(to,o={})=>Object.assign({type:'walk',to},o);
const act=(dur,label,o={})=>Object.assign({type:'act',dur,label},o);
const at=(n,o={})=>{const p=W.punkte[n];return p?walk(p,{face:p.ry,...o}):null};
const backupQueue=[];
const T=(a,art,i,def)=>((a.texte||{})[art]||[])[i]||def;
const ARBEIT={
  sicherung(a){a.state='run';return[
    at('band'),act(2.6,`Holt Sicherung „${a.aktuell=backupQueue.shift()||'Sicherung'}“`,{end:a=>a.carry='band'}),
    at('pruefstation'),act(3.6,T(a,'sicherung',0,'Prüft das Band …'),{start:()=>fx.pruefen='busy'}),act(1.5,'Prüfung ok ✓',{start:()=>fx.pruefen='ok'}),
    at('tresor'),act(3,'Band in den Tresor',{start:()=>fx.tresorT=3.4,end:a=>{a.carry=null;fx.pruefen=null}}),
    at('tafel'),act(2.2,'Haken an der Tafel ✓',{end:a=>{a.state=a.liveState||'ok';if(backupQueue.length)a.pending=true}}),
    a.seat?walk(a.seat,{face:a.seat.ry}):null,a.seat?act(14,'Frühstückt ☕',{pose:'sit',seat:a.seat,carry:'tasse'}):null]},
  konten(a){a.state='run';return[
    at('bank'),act(4.5,T(a,'konten',0,'Gleicht Kontoumsätze ab …')),act(1.5,T(a,'konten',1,'Umsätze übernommen ✓'),{end:a=>a.carry='ordner'}),
    at('regal'),act(2,T(a,'konten',2,'Ordner ins Regal'),{end:a=>{a.carry=null;a.state=a.liveState||'ok'}})]},
  post(a){const fail=a.liveState==='err';a.state='run';return[
    at('post'),act(3.5,T(a,'post',0,'Ruft Mails ab …')),
    fail?act(6,'Fehler: '+(a.last||'Lauf fehlgeschlagen'),{scratch:true,start:a=>{a.state='err';fx.postFehler=true}})
        :act(1.5,T(a,'post',1,'Mails abgerufen ✓'),{end:a=>{a.state=a.liveState||'ok';fx.postFehler=false}})]},
  pruefen(a){a.state='run';return[at('regal'),act(6,T(a,'pruefen',0,'Prüft die Wissensbasis …')),at('anzeige'),act(2,T(a,'pruefen',1,'Bericht abgelegt ✓'),{end:a=>{a.state=a.liveState||'ok'}})]},
};
const PAUSEN=Object.entries(W.punkte).filter(([,p])=>p.pause);
const idleDesk=a=>[walk(a.seat,{idle:true,face:a.seat.ry}),act(Infinity,'',{pose:'sit',seat:a.seat,idle:true})];
const idleBed=a=>[walk(W.bett.ap,{idle:true}),act(Infinity,'Zzz …',{pose:'lie',idle:true})];
function idleWander(a){if(W.tischsitze.length&&Math.random()<.25){const s=W.tischsitze[Math.floor(Math.random()*W.tischsitze.length)];return[walk(s,{idle:true,face:s.ry}),act(4+Math.random()*5,'Frühstückspause',{idle:true,pose:'sit',seat:s,carry:'tasse'})]}
  if(!PAUSEN.length)return[act(5,'',{idle:true})];const [n,p]=PAUSEN[Math.floor(Math.random()*PAUSEN.length)];return[at(n,{idle:true}),act(3+Math.random()*5,p.pause,{idle:true})]}
function freierPunkt(){for(let k=0;k<200;k++){const i=Math.floor(Math.random()*W.NX),j=Math.floor(Math.random()*W.NZ);if(W.free(i,j))return W.zelle(i,j)}return{x:W.b.cx,z:W.b.cz}}

// ── Agenten aus der Konfiguration ──────────────────────────
const agents=(CFG.agenten||[]).map(d=>{
  const seat=d.platz&&W.tische[d.platz]||null,bett=d.platz==='bett'&&W.bett;
  const idle=seat?idleDesk:bett?idleBed:idleWander;
  const p=seat||(bett?W.bett.ap:(d.start?{x:d.start[0],z:d.start[1]}:freierPunkt()));
  const koerper=d.farbe?new THREE.Color(d.farbe).getHex():null;
  const bot=W.figur(koerper??COL.ok);
  const tag=document.createElement('div');tag.className='tag';const tagO=new CSS2DObject(tag);tagO.position.set(0,1.85,0);bot.root.add(tagO);
  const bub=document.createElement('div');bub.className='bubble';const bubO=new CSS2DObject(bub);bubO.position.set(0,2.3,0);bubO.visible=false;bot.root.add(bubO);
  bub.onclick=()=>{const x=ag(d.id);if(x&&x.fall)openFall(d.id)};
  if(d.hat_protokoll){const zt=document.createElement('div');zt.className='zettel';zt.textContent='📄 Protokoll';zt.onclick=e=>{e.stopPropagation();openPanel(d.id)};const zO=new CSS2DObject(zt);zO.position.set(.6,1.2,0);bot.root.add(zO)}
  if(koerper!=null){bot.headMat=bot.mat.clone();bot.headBall.material=bot.headMat}
  bot.root.position.set(p.x,0,p.z);bot.root.userData.agent=d.id;
  const f=(d.quelle||{}).art==='fest'?d.quelle:null;
  return{...d,koerper,seat,idle,job:d.arbeit,bot,tag,bub,bubO,x:p.x,z:p.z,ry:0,queue:[],cur:null,carry:null,phase:0,walking:false,
    state:f?f.status||'off':'ok',last:f?f.text||'':'lade …'}});
const ag=id=>agents.find(a=>a.id===id);

// ── A*-Wegfindung ──────────────────────────────────────────
const {ci,cj,free,NX,NZ}=W;
function nearestFree(i,j){if(free(i,j))return[i,j];for(let r=1;r<10;r++)for(let di=-r;di<=r;di++)for(let dj=-r;dj<=r;dj++)if(free(i+di,j+dj))return[i+di,j+dj];return[i,j]}
function astar(a,b){const [si,sj]=nearestFree(ci(a.x),cj(a.z)),[ti,tj]=nearestFree(ci(b.x),cj(b.z));
  const key=(i,j)=>j*NX+i,g=new Float32Array(NX*NZ).fill(1e9),came=new Int32Array(NX*NZ).fill(-1),closed=new Uint8Array(NX*NZ);
  const open=[[0,si,sj]];g[key(si,sj)]=0;
  while(open.length){let bi=0;for(let k=1;k<open.length;k++)if(open[k][0]<open[bi][0])bi=k;const [,i,j]=open.splice(bi,1)[0];const k0=key(i,j);if(closed[k0])continue;closed[k0]=1;
    if(i===ti&&j===tj)break;
    for(let di=-1;di<=1;di++)for(let dj=-1;dj<=1;dj++){if(!di&&!dj)continue;const ni=i+di,nj=j+dj;if(!free(ni,nj))continue;if(di&&dj&&(!free(i+di,j)||!free(i,j+dj)))continue;
      const k1=key(ni,nj),ng=g[k0]+(di&&dj?1.414:1);if(ng<g[k1]){g[k1]=ng;came[k1]=k0;open.push([ng+Math.hypot(ti-ni,tj-nj),ni,nj])}}}
  const pts=[];let k=key(ti,tj);if(came[k]<0&&k!==key(si,sj))return[b];
  while(k>=0&&k!==key(si,sj)){pts.unshift(W.zelle(k%NX,Math.floor(k/NX)));k=came[k]}
  pts.push({x:b.x,z:b.z});
  const los=(p,q)=>{const d=Math.hypot(q.x-p.x,q.z-p.z),n=Math.ceil(d/.2);for(let s=1;s<n;s++){const x=p.x+(q.x-p.x)*s/n,z=p.z+(q.z-p.z)*s/n;if(!free(ci(x),cj(z)))return false}return true};
  const out=[];let cur={x:a.x,z:a.z},idx=0;while(idx<pts.length){let far=idx;for(let k2=pts.length-1;k2>idx;k2--)if(los(cur,pts[k2])){far=k2;break}out.push(pts[far]);cur=pts[far];idx=far+1}
  return out}

// ── Logik ──────────────────────────────────────────────────
function update(dt){sim=Date.now();fx.tresorT=Math.max(0,fx.tresorT-dt);
  for(const a of agents){
    if(a.pending&&a.job&&ARBEIT[a.job]&&(!a.cur||a.cur.idle)){a.pending=false;a.cur=null;a.queue=ARBEIT[a.job](a).filter(Boolean)}
    if(!a.cur){if(!a.queue.length)a.queue=a.idle(a).filter(Boolean);a.cur=a.queue.shift();a.cur.t=0;
      if(a.cur.type==='walk')a.cur.path=astar({x:a.x,z:a.z},a.cur.to);
      a.cur.start&&a.cur.start(a)}
    const c=a.cur;a.walking=false;
    if(c.type==='walk'){const p=c.path[0];if(!p){a.cur=null;continue}const dx=p.x-a.x,dz=p.z-a.z,d=Math.hypot(dx,dz),v=1.7*dt;
      if(d<=v){a.x=p.x;a.z=p.z;c.path.shift();if(!c.path.length){if(c.face!=null)a.ry=c.face;a.cur=null}}
      else{a.x+=dx/d*v;a.z+=dz/d*v;a.walking=true;a.phase+=dt*9;const tr=Math.atan2(dx,dz);let df=tr-a.ry;df=Math.atan2(Math.sin(df),Math.cos(df));a.ry+=df*Math.min(1,dt*10)}}
    else{c.t+=dt;if(c.t>=c.dur){c.end&&c.end(a);a.cur=null}}
  }}

// ── Posen ──────────────────────────────────────────────────
function pose(a,t){const b=a.bot,c=a.cur||{},sit=c.type==='act'&&c.pose==='sit',lie=c.type==='act'&&c.pose==='lie';
  const col=COL[a.state];
  if(a.koerper!=null){b.mat.color.setHex(a.koerper);b.headMat.color.lerp(new THREE.Color(col),.15)}else b.mat.color.lerp(new THREE.Color(col),.15);
  b.tipMat.emissive.setHex(col);b.tipMat.emissiveIntensity=a.state==='off'?.2:a.state==='err'?2+2*Math.sin(t*10):2.5;
  let px=a.x,py=0,pz=a.z,ry=a.ry,rx=0;
  const [la,ra]=b.arms,[ll,rl]=b.legs;
  la.rotation.set(0,0,0);ra.rotation.set(0,0,0);ll.rotation.set(0,0,0);rl.rotation.set(0,0,0);b.head.rotation.set(0,0,0);b.body.position.set(0,0,0);
  if(lie){const B=c.bed||W.bett;px=B.x;pz=B.z;py=B.y+.32;ry=B.ry;rx=-Math.PI/2;b.body.position.y=-.3;b.head.rotation.x=.25}
  else if(sit){const s=c.seat;px=s.x;pz=s.z;ry=s.ry;ll.rotation.x=rl.rotation.x=-Math.PI/2;b.body.position.y=-.02;b.body.position.z=.05;
    const typing=!c.carry&&a.state!=='off';la.rotation.x=-1.15+(typing?Math.sin(t*14)*.08:0);ra.rotation.x=-1.15-(typing?Math.sin(t*14)*.08:0);
    if(c.carry==='tasse'){ra.rotation.x=-1.5+Math.sin(t*1.5)*.35}
    if(a.state==='off'){la.rotation.x=ra.rotation.x=-.25;b.head.rotation.x=.35}}
  else{const sw=a.walking?Math.sin(a.phase):0;ll.rotation.x=sw*.65;rl.rotation.x=-sw*.65;la.rotation.x=-sw*.6;ra.rotation.x=sw*.6;
    b.body.position.y=a.walking?Math.abs(Math.cos(a.phase))*.05:Math.sin(t*2)*.01;
    if(a.carry){la.rotation.x=ra.rotation.x=-1.25}
    else if(c.scratch){ra.rotation.x=-2.7;ra.rotation.z=Math.sin(t*14)*.15;b.head.rotation.z=Math.sin(t*3)*.12}
    else if(c.type==='act'&&!c.idle){la.rotation.x=-.9+Math.sin(t*10)*.15;ra.rotation.x=-.9-Math.sin(t*10)*.15}}
  b.root.position.set(px,py,pz);b.root.rotation.set(0,ry,0);b.body.rotation.set(rx,0,0);
  const item=sit?c.carry:a.carry;for(const k in b.items)b.items[k].visible=k===item;
  b.carry.position.set(sit?.22:0,sit?.88:.74,sit?.32:.42)}

// ── Beschriftungen + Seitenleiste ──────────────────────────
function subline(a){const c=a.cur||{};if(a.state==='off'||a.state==='err')return a.last;if(c.idle&&a.next)return(c.pose==='lie'?'schläft · ':'Pause · ')+(a.nextName?'nächste: '+a.nextName+' in ':'nächster Lauf in ')+dur(a.next-sim);return''}
function labelsUpdate(){for(const a of agents){const c=a.cur||{};const s=subline(a);a.tag.innerHTML=esc(a.name)+(s?`<small>${esc(s)}</small>`:'');
  const say=c.type==='act'&&c.label&&(!c.idle||a===selected)?c.label:(c.type==='walk'&&!c.idle&&a===selected?'unterwegs …':'');
  a.bubO.visible=!!say;if(say){a.bub.textContent=say;a.bub.style.setProperty('--c',CSSC[a.state])}
  a.tag.style.outline=a===selected?'2px solid #38bdf8':'none'}}
const list=document.getElementById('list');
let LIVE=null;const prevRun={};
function liveClock(){if(!LIVE||!LIVE.erzeugt)return `lade Daten vom ${CFG.rechner} …`;const alt=Date.now()-Date.parse(LIVE.erzeugt);return 'Stand '+new Date(LIVE.erzeugt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})+(alt>180000?' · veraltet!':'')}
function renderList(){list.innerHTML=agents.map(a=>{const c=a.cur||{};const line=c.type==='act'&&!c.idle&&c.label?c.label:(c.type==='walk'&&!c.idle?'unterwegs …':a.last);
  const nx=a.next&&a.state!=='off'?`<small>nächster Lauf in ${dur(a.next-sim)}</small>`:'';
  return`<div class="ag${a===selected?' sel':''}" data-id="${esc(a.id)}"><span class="dot" style="background:${CSSC[a.state]};box-shadow:0 0 8px ${CSSC[a.state]}"></span><div><b>${esc(a.name)}</b><small>${esc(line)}</small>${nx}</div></div>`}).join('');
  document.getElementById('clock').textContent=liveClock()}
list.addEventListener('click',e=>{const el=e.target.closest('.ag');if(!el)return;const a=ag(el.dataset.id);selected=a;focusOn(a);renderList();openPanel(a.id)});
setInterval(()=>{renderList();labelsUpdate()},300);

// ── Live-Status je Bot ─────────────────────────────────────
// quelle.art: aufgaben (labels) · gruppe · sicherungen · system · plugin · fest
const PLUG={},PROT={};
function jobsVon(a){if(!LIVE||!LIVE.jobs)return[];const q=a.quelle||{};let l=[];
  if(q.art==='sicherungen')l=LIVE.sicherungen.map(s=>LIVE.jobs.find(j=>j.label===s.label));
  else if(q.art==='system')l=LIVE.jobs.filter(j=>j.status==='err'||(j.dauer&&j.geladen&&j.status!=='ok'));
  else if(q.art==='gruppe')l=LIVE.jobs.filter(j=>j.gruppe===q.gruppe);
  else if(q.labels)l=q.labels.map(x=>LIVE.jobs.find(j=>j.label===x));
  for(const x of a.labels||[])l.push(LIVE.jobs.find(j=>j.label===x));
  return [...new Set(l.filter(Boolean))]}
function setLive(a,state,last,next,lastRun){a.liveState=state;if(!a.cur||a.cur.idle)a.state=state;a.last=last;a.next=next||0;
  if(lastRun&&a.job){if(prevRun[a.id]&&lastRun>prevRun[a.id])a.pending=true;prevRun[a.id]=Math.max(prevRun[a.id]||0,lastRun)}}
function auswerten(a){const q=a.quelle||{};
  if(q.art==='fest')return;
  if(q.art==='sicherungen'){const sb=LIVE.sicherungen,bad=sb.filter(s=>s.status==='err').map(s=>s.name),n=sb.filter(s=>s.naechst).sort((x,y)=>ts(x.naechst)-ts(y.naechst))[0];
    sb.forEach(b=>{const t=ts(b.zuletzt),k='b:'+b.name;if(prevRun[k]&&t>prevRun[k])backupQueue.push(b.name);if(t)prevRun[k]=Math.max(prevRun[k]||0,t)});
    a.nextName=n?n.name.replace(/ \([^)]*\)$/,''):'';if(backupQueue.length&&a.job)a.pending=true;
    return setLive(a,sb.length?schlimmster(sb.map(s=>s.status==='off'?'ok':s.status)):'off',!sb.length?'keine Sicherungen eingetragen':bad.length?'Fehler: '+bad.join(', '):'alle '+sb.length+' ok · nächste: '+(n?a.nextName+' '+fmtKurz(n.naechst):'–'),n?ts(n.naechst):0,0)}
  if(q.art==='system'){const st=LIVE.system,bad=st.zeilen.filter(z=>z[2]!=='ok').map(z=>z[0]+': '+z[1]);return setLive(a,st.status,bad.length?bad.join(' · '):'alles im grünen Bereich',0,0)}
  const teile=[];let text='',next=0,lastRun=0;
  const jobs=q.art==='plugin'?[]:jobsVon(a);
  if(jobs.length){const err=jobs.filter(j=>j.status==='err'),run=jobs.filter(j=>j.status==='run');
    teile.push(jobs.every(j=>j.status==='off')?'off':err.length?'err':run.length?'run':'ok');
    text=err.length?'Fehler: '+err.map(j=>kurz(j.label)+(j.code!=null?' (Code '+j.code+')':'')).join(', '):run.length?'läuft gerade':jobs.every(j=>j.status==='off')?'aus':'ok · zuletzt '+fmt(Math.max(...jobs.map(j=>ts(j.zuletzt)))) ;
    const nx=jobs.map(j=>ts(j.naechst)).filter(Boolean);next=nx.length?Math.min(...nx):0;lastRun=Math.max(0,...jobs.map(j=>ts(j.zuletzt)))}
  else if(q.art!=='plugin'&&!a.plugin){teile.push('off');text='keine passenden Aufgaben gefunden'}
  const pr=PROT[a.id];if(pr&&pr.da&&!(teile[0]==='err'))text=(pr.ergebnis||'Lauf ohne Ergebnis')+' · Lauf '+(pr.zeit||'–');
  const pl=PLUG[a.id];if(pl){teile.push(pl.status||'off');if(pl.status!=='ok'||!text)text=pl.text||text;if(pl.naechst)next=ts(pl.naechst);if(pl.zuletzt)lastRun=ts(pl.zuletzt)}
  setLive(a,schlimmster(teile),text,next,lastRun)}
function applyLive(){const d=LIVE;
  for(const a of anz('system'))zeichneTabelle(a.tex,CFG.check_titel,d.system.zeilen);
  zeichneSicherungen(d.sicherungen);
  for(const a of anz('aufgaben'))zeichneTabelle(a.tex,'ALLE AUFGABEN · '+d.jobs.length,d.gruppen.map(g=>[g.name,g.anzahl+(g.fehler?' · '+g.fehler+' Fehler':''),g.fehler?'err':'ok']));
  for(const a of agents)auswerten(a);
  renderJobs();renderList();labelsUpdate()}
function renderJobs(){const el=document.getElementById('jobs');const offen=new Set([...el.querySelectorAll('details[open]')].map(x=>x.dataset.g));
  el.innerHTML=LIVE.gruppen.map(g=>`<details data-g="${esc(g.name)}" ${offen.has(g.name)?'open':''}><summary><span class="dot" style="background:${CSSC[g.fehler?'err':'ok']}"></span><span>${esc(g.name)}</span><small>${g.anzahl}${g.fehler?' · '+g.fehler+' Fehler':''}</small></summary>`+
   LIVE.jobs.filter(j=>j.gruppe===g.name).map(j=>`<div class="job" data-l="${esc(j.label)}" style="cursor:pointer"><span class="dot" style="background:${CSSC[j.status]}"></span><div><b>${esc(kurz(j.label))}</b><small>${j.plan}${j.status==='err'?' · Fehler Code '+j.code:''}${j.status==='off'?' · aus':''}${j.zuletzt?' · zuletzt '+fmt(j.zuletzt):''}${j.naechst?' · nächster '+fmt(j.naechst):''}</small></div></div>`).join('')+'</details>').join('')}
async function poll(){try{const r=await fetch('api/status',{cache:'no-store'});if(!r.ok)throw new Error(r.status);const d=await r.json();if(!d.jobs)return;LIVE=d;applyLive()}catch(e){document.getElementById('clock').textContent=`Keine Daten vom ${CFG.rechner} (${e.message})`}}
async function nebenquellen(){await Promise.all(agents.map(async a=>{const n=a.plugin||((a.quelle||{}).art==='plugin'&&a.quelle.name);
  try{if(n)PLUG[a.id]=await (await fetch('api/plugin?name='+encodeURIComponent(n),{cache:'no-store'})).json();
      if(a.hat_protokoll)PROT[a.id]=await (await fetch('api/protokoll?bot='+encodeURIComponent(a.id),{cache:'no-store'})).json()}
  catch(e){if(n)PLUG[a.id]={status:'err',text:'Maschinenraum-Server nicht erreichbar'}}}));
  if(LIVE)applyLive();else for(const a of agents)if(PLUG[a.id]&&(a.quelle||{}).art==='plugin')setLive(a,PLUG[a.id].status,PLUG[a.id].text,0,0);
  if(!panel.hidden&&panel.dataset.bot)openPanel(panel.dataset.bot)}
poll();setInterval(poll,15000);setTimeout(nebenquellen,300);setInterval(nebenquellen,30000);

// ── Bedienfeld ────────────────────────────────────────────
const panel=document.getElementById('panel'),pb=document.getElementById('pb');
const panelZu=()=>{panel.hidden=true;delete panel.dataset.bot;delete panel.dataset.fall};
document.getElementById('px').onclick=panelZu;addEventListener('keydown',e=>{if(e.key==='Escape')panelZu()});
function panelAuf(titel,farbe){delete panel.dataset.bot;delete panel.dataset.fall;document.getElementById('pt').textContent=titel;document.getElementById('pd').style.background=farbe;panel.hidden=false}
function statusText(j){return j.deaktiviert?'deaktiviert':j.status==='err'?'Fehler (Code '+j.code+')':j.status==='run'?'läuft gerade':j.status==='off'?(j.geladen?'aus':'nicht geladen / pausiert'):j.dauer?'läuft':'ok'}
function jobRow(j){return `<div class="pj" data-l="${esc(j.label)}"><div class="pjh"><span class="dot" style="background:${CSSC[j.deaktiviert?'off':j.status]}"></span><div><b>${esc(kurz(j.label))}</b>
  <small>${esc(statusText(j))} · ${esc(j.rhythmus||j.plan)}${j.zuletzt?' · zuletzt '+fmtKurz(j.zuletzt):''}${j.naechst?' · nächster '+fmtKurz(j.naechst):''}</small></div></div>
  <div class="btns"><button class="go" data-a="starten">▶ Starten</button><button class="warn" data-a="stoppen">■ Stoppen</button><button class="warn" data-a="pausieren">⏸ Pausieren</button>
  ${j.deaktiviert?'<button class="go" data-a="aktivieren">✅ Aktivieren</button>':'<button class="bad" data-a="deaktivieren">⛔ Deaktivieren</button>'}<button data-a="log">📄 Protokoll</button>${j.status==='err'?'<button class="go" data-a="freigabe">🔓 Freigabe geben</button>':''}</div><div class="out"></div></div>`}
function pluginHtml(p){if(!p)return '';let h=`<div class="diag ${p.status==='ok'?'ok':'err'}">${esc(p.text)}</div>`;
  for(const s of p.abschnitte||[]){if(s.titel)h+=`<h4 style="margin:12px 0 4px">${esc(s.titel)}</h4>`;if(s.text)h+=`<div class="tip" style="margin:4px 0 8px">${esc(s.text)}</div>`;
    h+=(s.zeilen||[]).map(z=>`<div class="job"><span class="dot" style="background:${CSSC[z.status]||CSSC.off}"></span><div><b>${esc(z.titel)}</b><small>${esc(z.text||'')}${z.fehler?'<br><span style="color:#fca5a5">'+esc(z.fehler)+'</span>':''}</small></div></div>`).join('');
    if(s.hinweis)h+=`<div class="tip" style="margin-top:10px">${esc(s.hinweis)}</div>`}
  if((p.links||[]).length)h+='<div class="btns">'+p.links.map(l=>`<button class="go" data-link="${esc(l.url)}">${esc(l.text)}</button>`).join('')+'</div>';return h}
function protokollHtml(z){if(!z)return '<div class="tip">lade Protokoll …</div>';if(!z.da)return `<div class="tip">${esc(z.hinweis||'noch kein Lauf protokolliert')}</div>`;
  const gut=/^ok/i.test(z.ergebnis||'');
  return `<h4 style="margin:12px 0 4px">Protokoll</h4><div class="job"><span class="dot" style="background:${CSSC[gut?'ok':'err']}"></span><div><b>Letzter Lauf: ${esc(z.zeit||'–')}</b><small>Ergebnis: ${esc(z.ergebnis||'–')} · zuletzt geschrieben ${esc(fmt(z.geaendert))}</small></div></div><pre class="zettel-protokoll">${(z.zeilen||[]).map(esc).join('\n')}</pre>`}
function openPanel(agentId,labels){
  if(labels){const jobs=LIVE?labels.map(l=>LIVE.jobs.find(j=>j.label===l)).filter(Boolean):[];panelAuf(kurz(labels[0]||''),CSSC[jobs[0]?jobs[0].status:'off']);pb.innerHTML=jobs.map(jobRow).join('')||'<div class="tip">Keine Daten.</div>';return}
  const a=ag(agentId);if(!a)return;panelAuf(a.name,CSSC[a.state]);panel.dataset.bot=a.id;
  const jobs=jobsVon(a),q=a.quelle||{};
  pb.innerHTML=`<div class="tip" style="margin:4px 0 8px">${esc(a.last||'')}</div>`+(a.info?`<div class="tip" style="margin:0 0 8px">${esc(a.info)}</div>`:'')+
    pluginHtml(PLUG[a.id])+(a.hat_protokoll?protokollHtml(PROT[a.id]):'')+
    (jobs.length?(PLUG[a.id]||a.hat_protokoll?'<h4 style="margin:12px 0 4px">Aufgaben</h4>':'')+jobs.map(jobRow).join(''):(q.art==='system'?'<div class="tip">Keine Aufgaben mit Problemen.</div>':''));
  pb.querySelectorAll('[data-link]').forEach(b=>b.onclick=()=>window.open(b.dataset.link,'_blank'))}
function zeigeErgebnis(out,r){const d=r.diagnose;const okLauf=r.nachher?(r.nachher.code===0||r.nachher.pid):r.zustand&&r.zustand.code===0;
  let h=d?`<div class="diag err">⚠️ ${esc(d)}</div>`:(r.aktion==='starten'?(okLauf?'<div class="diag ok">✓ Läuft bzw. ohne Fehler beendet.</div>':''):(r.aktion?`<div class="diag ok">✓ ${esc({stoppen:'Gestoppt',pausieren:'Pausiert (bis zum nächsten Start oder Neustart)',deaktivieren:'Deaktiviert (bleibt aus, auch nach Neustart)',aktivieren:'Aktiviert'}[r.aktion]||'Erledigt')}</div>`:''));
  if(r.meldung)h+=`<div class="diag ${r.aktion==='freigabe'?'ok':'err'}">${esc(r.meldung)}</div>`;if(r.app)h+=`<div class="tip">Programm: ${esc(r.app)}</div>`;if(r.aktion==='freigabe'){out.innerHTML=h;return}
  if(r.nachher)h+=`<div class="tip" style="margin:4px 0">Zustand: ${r.nachher.geladen?'geladen':'nicht geladen'}${r.nachher.pid?' · läuft (PID '+r.nachher.pid+')':''}${r.nachher.code!=null?' · letzter Code '+r.nachher.code:''}${r.deaktiviert?' · deaktiviert':''}</div>`;
  (r.logs||[]).forEach(l=>{h+=`<div class="tip" style="margin:6px 0 2px">${esc(l.datei)} · geändert ${fmtKurz(l.geaendert)}</div><pre>${esc(l.zeilen.slice(-15).join('\n'))}</pre>`});
  if(!(r.logs||[]).length&&r.aktion!=='log')h+='<div class="tip">Kein Protokoll vorhanden.</div>';out.innerHTML=h}
async function mPost(url,body){return (await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-Maschinenraum':'1'},body:JSON.stringify(body)})).json()}
pb.addEventListener('click',async e=>{const b=e.target.closest('button[data-a]');if(!b)return;const box=b.closest('.pj'),label=box.dataset.l,was=b.dataset.a,out=box.querySelector('.out');
  if(['stoppen','pausieren','deaktivieren'].includes(was)&&!confirm(`${kurz(label)} wirklich ${was}?`))return;
  box.querySelectorAll('button').forEach(x=>x.disabled=true);out.innerHTML='<div class="tip">'+(was==='starten'?'Starte und beobachte bis zu 8 Sekunden …':'Bitte warten …')+'</div>';
  try{let r;if(was==='log'){r=await (await fetch('api/log?label='+encodeURIComponent(label))).json()}
    else{r=await mPost('api/aktion',{label,aktion:was});
      if(was==='starten'){const a=agents.find(x=>x.job&&jobsVon(x).some(j=>j.label===label));if(a){if((a.quelle||{}).art==='sicherungen'){const bk=LIVE.sicherungen.find(s=>s.label===label);backupQueue.push(bk?bk.name:'Sicherung')}a.pending=true}}
      setTimeout(poll,1500)}
    zeigeErgebnis(out,r)}catch(err){out.innerHTML=`<div class="diag err">Keine Verbindung zum Maschinenraum: ${esc(err.message)}</div>`}
  box.querySelectorAll('button').forEach(x=>x.disabled=false)});
document.getElementById('jobs').addEventListener('click',e=>{const j=e.target.closest('.job');if(j&&j.dataset.l)openPanel(null,[j.dataset.l])});

// ── Sekretariat & Arzt: Fälle ──────────────────────────────
let FAELLE={};const PHASE={sekretariat:'im Sekretariat – wird analysiert …',analysiert:'Analyse fertig – 👆 klick mich: 3 Vorschläge',arzt:'beim Arzt – wird behandelt …',fertig:'Behandlung abgeschlossen',fehler:'Fehler'};
const PFARBE={sekretariat:'#facc15',analysiert:'#38bdf8',arzt:'#f472b6',fertig:'#22c55e',fehler:'#ef4444'};
function botLabels(a){const l=jobsVon(a);const rot=l.filter(j=>j.status==='err');return (rot.length?rot:l).map(j=>j.label)}
function freierSitz(){const belegt=agents.filter(a=>a.fall&&['sekretariat','analysiert'].includes(a.fall.phase)).length;return W.wartesitze[belegt%Math.max(1,W.wartesitze.length)]}
function fallBewegen(a){const f=a.fall;if(!f)return;
  if(['sekretariat','analysiert'].includes(f.phase)){const lab=PHASE[f.phase];if(a.cur&&a.cur.fallAct&&a.cur.pose==='sit'){a.cur.label=lab;return}const st=a.sitz||(a.sitz=freierSitz());if(!st)return;a.cur=null;a.queue=[walk(st,{face:st.ry}),act(Infinity,lab,{pose:'sit',seat:st,fallAct:true})];a.state='run';return}
  if(f.phase==='arzt'&&W.liege){if(a.cur&&a.cur.fallAct&&a.cur.pose==='lie')return;a.sitz=null;a.cur=null;a.queue=[walk(W.liege.ap),act(Infinity,PHASE.arzt,{pose:'lie',bed:W.liege,fallAct:true})];a.state='run';return}
  if((f.phase==='fertig'||f.phase==='fehler')&&a.cur&&a.cur.fallAct){a.cur=null;a.queue=[act(4,f.phase==='fertig'?(f.ergebnis&&f.ergebnis.erfolg?'Geheilt ✓':'Behandelt – siehe Bericht'):'Fehler – siehe Fall',{fallEnde:true})];a.sitz=null;a.state=a.liveState||a.state;setTimeout(poll,1000)}}
function faelleTafel(){for(const z of anz('faelle')){const c=z.tex.image,g=c.getContext('2d');g.fillStyle='#1f160d';g.fillRect(0,0,c.width,c.height);g.fillStyle='#fbbf24';g.font='bold 70px sans-serif';g.fillText('SEKRETARIAT · FÄLLE',40,90);
  const l=Object.values(FAELLE).sort((x,y)=>(x.start<y.start?1:-1)).slice(0,7);if(!l.length){g.fillStyle='#a8a29e';g.font='44px sans-serif';g.fillText('Keine Fälle. Rechtsklick auf einen Bot → Ins Sekretariat',40,200)}
  l.forEach((f,i)=>{const y=190+i*100;g.fillStyle=f.phase==='fertig'&&!(f.ergebnis&&f.ergebnis.erfolg)?'#f59e0b':PFARBE[f.phase];g.beginPath();g.arc(70,y-16,20,0,7);g.fill();
    g.fillStyle='#f5f5f4';g.font='bold 48px sans-serif';g.fillText(f.bot,110,y);g.fillStyle='#d6d3d1';g.font='40px sans-serif';g.fillText(PHASE[f.phase]||f.phase,620,y)});z.tex.needsUpdate=true}}
async function faelleHolen(){try{FAELLE=(await (await fetch('api/faelle')).json()).faelle||{}}catch(e){return}
  for(const a of agents){const mine=Object.values(FAELLE).filter(f=>f.botid===a.id).sort((x,y)=>(x.start>y.start?1:-1)).pop();if(mine){const vorher=a.fall&&a.fall.phase;a.fall=mine;if(vorher!==mine.phase||['sekretariat','analysiert','arzt'].includes(mine.phase))fallBewegen(a)}
    a.bub.classList.toggle('klick',!!(a.fall&&['sekretariat','analysiert','arzt'].includes(a.fall.phase)))}
  faelleTafel();if(!panel.hidden&&panel.dataset.fall)openFall(panel.dataset.fall)}
async function insSekretariat(a){const labels=botLabels(a);if(!labels.length){openPanel(a.id);return}
  const r=await mPost('api/fall',{was:'sekretariat',bot:a.name,botid:a.id,labels});if(!r.ok){alert(r.meldung);return}a.fall=r.fall;a.sitz=null;fallBewegen(a);openFall(a.id)}
async function zumArzt(a,nr){if(!a.fall)return;const r=await mPost('api/fall',{was:'arzt',id:a.fall.id,vorschlag:nr});if(!r.ok){alert(r.meldung);return}a.fall=r.fall;fallBewegen(a);openFall(a.id)}
function openFall(agentId){const a=ag(agentId);const f=a&&a.fall;panelAuf('Fall · '+(a?a.name:''),PFARBE[f&&f.phase]||'#64748b');panel.dataset.fall=agentId;
  if(!f){pb.innerHTML='<div class="tip">Noch kein Fall. Rechtsklick auf den Bot → „Ins Sekretariat“.</div>';return}
  let h=`<div class="tip" style="margin:4px 0 8px">${esc(PHASE[f.phase]||f.phase)} · seit ${fmtKurz(f.start)} · Aufgaben: ${f.labels.map(kurz).map(esc).join(', ')}</div>`;
  if(f.phase==='sekretariat')h+='<div class="diag ok">Das Sekretariat liest gerade Skripte und Protokolle (nur lesend). Das dauert meist 1–3 Minuten.</div>';
  if(f.meldung)h+=`<div class="diag err">${esc(f.meldung)}</div>`;
  if(f.analyse){h+=`<div class="diag err">🩺 Diagnose: ${esc(f.analyse.diagnose)}</div><div class="tip" style="margin:4px 0 10px">Ursache: ${esc(f.analyse.ursache)}</div>`;
    (f.analyse.vorschlaege||[]).forEach((v,i)=>{h+=`<div class="vs"><b>Vorschlag ${i+1}: ${esc(v.titel)}</b><small>${esc(v.beschreibung)}</small><br><small>Wer: ${v.wer==='claude'?'Claude':esc(BENUTZER)+' (kann Claude nicht)'} · Risiko: ${esc(v.risiko||'?')}</small>
      ${f.phase==='analysiert'?`<div class="btns"><button class="go" data-arzt="${i}">🩺 Mit diesem Vorschlag zum Arzt</button></div>`:(f.gewaehlt===i?'<div class="tip" style="margin:6px 0 0">← gewählt</div>':'')}</div>`})}
  if(f.phase==='arzt')h+='<div class="diag ok">Claude behandelt gerade (legt Sicherungen an, löscht nichts). Das kann bis zu 15 Minuten dauern.</div>';
  if(f.ergebnis){const an=f.ergebnis.benutzer;h+=`<div class="diag ${f.ergebnis.erfolg?'ok':'err'}">${f.ergebnis.erfolg?'✓ Geheilt':'✗ Nicht vollständig geheilt'}</div><div class="tip" style="white-space:pre-wrap">${esc(f.ergebnis.bericht)}</div>`;
    if(an)h+=`<div class="diag err" style="white-space:pre-wrap">${esc(an)}</div>`}
  if(['fertig','fehler'].includes(f.phase))h+=`<div class="btns"><button data-neu="1">📋 Erneut ins Sekretariat</button></div>`;
  pb.innerHTML=h;pb.querySelectorAll('[data-arzt]').forEach(b=>b.onclick=()=>zumArzt(a,+b.dataset.arzt));const n=pb.querySelector('[data-neu]');if(n)n.onclick=()=>insSekretariat(a)}
function openSekretariat(){panelAuf('Sekretariat · alle Fälle','#a78bfa');
  const proBot={};for(const f of Object.values(FAELLE))if(!proBot[f.botid]||proBot[f.botid].start<f.start)proBot[f.botid]=f;
  const l=Object.values(proBot).sort((x,y)=>(x.start<y.start?1:-1));
  pb.innerHTML=l.length?'<div class="tip" style="margin:4px 0 8px">Klick auf einen Fall zeigt Diagnose und die 3 Vorschläge.</div>'+l.map(f=>`<div class="vs" data-bot="${esc(f.botid)}" style="cursor:pointer"><b>${esc(f.bot)}</b> · ${esc(PHASE[f.phase]||f.phase)}<br><small>${f.analyse?esc(f.analyse.diagnose):'seit '+fmtKurz(f.start)}</small><div class="btns"><button class="go">📄 Vorschläge ansehen</button></div></div>`).join(''):'<div class="tip">Keine Fälle. Rechtsklick auf einen Bot → „Ins Sekretariat“.</div>';
  pb.querySelectorAll('[data-bot]').forEach(el=>el.onclick=()=>openFall(el.dataset.bot))}
faelleHolen();setInterval(faelleHolen,5000);

// ── Mutter ────────────────────────────────────────────────
const MCHAT=[];
function mRender(){const c=document.getElementById('mchat');if(!c)return;c.innerHTML=MCHAT.map(m=>`<div class="msg ${m.wer}">${esc(m.text)}</div>`).join('')||'<div class="msg sys">Frag mich etwas, z. B. „Welche Aufgabe ist rot und warum?“ oder „Welche Sicherung läuft als Nächstes?“</div>';c.scrollTop=c.scrollHeight}
async function mListe(liste){if(!liste)liste=(await (await fetch('api/auftraege')).json()).auftraege;const el=document.getElementById('mliste');if(!el)return;
  el.innerHTML=liste.length?liste.slice().reverse().map(a=>`<div class="auf ${a.status}"><div>${esc(a.text)}<br><small style="color:var(--muted)">${fmtKurz(a.angelegt)} · ${a.status}</small></div>${a.status==='offen'?`<button data-id="${a.id}" data-s="erledigt">✓</button>`:''}<button data-id="${a.id}" data-s="geloescht">🗑</button></div>`).join(''):'<div class="tip">Noch keine Aufträge.</div>'}
function openMutter(){panelAuf('Mutter · Großrechner (Claude)','#f472b6');
  pb.innerHTML=`<div class="tip" style="margin:4px 0 6px">Mutter liest den Live-Zustand und antwortet über Claude – <b>nur lesend</b>. Was erledigt werden soll, speicherst du als Auftrag; Claude arbeitet die Aufträge ab, wenn du ihm sagst: „Aufträge aus dem Maschinenraum abarbeiten“.</div>
  <div id="mchat" class="mchat"></div><textarea id="mtext" rows="3" placeholder="Nachricht an Mutter …"></textarea>
  <div class="btns"><button class="go" id="msend">Senden</button><button id="mauf">📋 Als Auftrag speichern</button><button id="mneu">Neues Gespräch</button></div>
  <h2 style="font-size:11px;letter-spacing:.14em;color:var(--muted);text-transform:uppercase;margin:14px 0 4px">Aufträge an Claude</h2><div id="mliste"></div>`;
  mRender();mListe();const ta=document.getElementById('mtext');ta.focus();
  ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey))document.getElementById('msend').click()});
  document.getElementById('msend').onclick=async()=>{const t=ta.value.trim();if(!t||fx.mutterDenkt)return;MCHAT.push({wer:'du',text:t});ta.value='';MCHAT.push({wer:'sys',text:'Mutter denkt nach … (kann bis zu einer Minute dauern)'});mRender();fx.mutterDenkt=true;
    try{const r=await mPost('api/mutter',{nachricht:t,neu:MCHAT.filter(m=>m.wer==='du').length===1&&!MCHAT.some(m=>m.wer==='mu')});MCHAT.pop();MCHAT.push({wer:'mu',text:r.antwort+(r.sekunden?`\n\n(${r.sekunden} s)`:'')})}
    catch(e){MCHAT.pop();MCHAT.push({wer:'sys',text:'Keine Verbindung: '+e.message})}fx.mutterDenkt=false;mRender()};
  document.getElementById('mauf').onclick=async()=>{const t=ta.value.trim()||(MCHAT.filter(m=>m.wer==='du').pop()||{}).text;if(!t)return;const r=await mPost('api/auftraege',{text:t});ta.value='';MCHAT.push({wer:'sys',text:'📋 Als Auftrag gespeichert: '+t});mRender();mListe(r.auftraege)};
  document.getElementById('mneu').onclick=async()=>{MCHAT.length=0;mRender();await mPost('api/mutter',{nachricht:'Neues Gespräch. Antworte nur mit: Bereit.',neu:true})};
  document.getElementById('mliste').onclick=async e=>{const b=e.target.closest('button[data-id]');if(!b)return;const r=await mPost('api/auftraege',{id:+b.dataset.id,status:b.dataset.s});mListe(r.auftraege)}}

// ── Klicks in die Szene ────────────────────────────────────
const ray=new THREE.Raycaster(),mp=new THREE.Vector2();let down=null;
function treffer(e){mp.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(mp,camera);
  for(const h of ray.intersectObjects(scene.children,true)){let o=h.object;while(o&&!o.userData.agent&&!o.userData.klick)o=o.parent;if(o)return o.userData}return null}
const ctx=document.getElementById('ctx');addEventListener('click',e=>{if(!ctx.contains(e.target))ctx.hidden=true});
renderer.domElement.addEventListener('contextmenu',e=>{e.preventDefault();const u=treffer(e);const a=u&&u.agent&&ag(u.agent);if(!a){ctx.hidden=true;return}
  const f=a.fall,bereit=f&&f.phase==='analysiert',offen=f&&['sekretariat','arzt'].includes(f.phase);
  ctx.innerHTML=`<div>${esc(a.name)}</div><button data-c="sek" ${offen?'disabled':''}>📋 Ins Sekretariat (analysieren)</button><button data-c="arzt" ${bereit?'':'disabled'}>🩺 Zum Arzt (reparieren)</button><button data-c="fall" ${f?'':'disabled'}>📄 Fall-Protokoll</button><button data-c="bed">⚙️ Bedienfeld</button>`;
  ctx.style.left=Math.min(e.clientX,innerWidth-250)+'px';ctx.style.top=Math.min(e.clientY,innerHeight-200)+'px';ctx.hidden=false;
  ctx.onclick=ev=>{const b=ev.target.closest('button[data-c]');if(!b||b.disabled)return;ctx.hidden=true;({sek:()=>insSekretariat(a),arzt:()=>openFall(a.id),fall:()=>openFall(a.id),bed:()=>openPanel(a.id)})[b.dataset.c]()}});
renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);
renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;const u=treffer(e);if(!u)return;
  if(u.klick){if(u.klick.art==='link')window.open(u.klick.url,'_blank');else AKTIONEN[u.klick.art]&&AKTIONEN[u.klick.art]();return}
  const x=ag(u.agent);if(x&&x.fall&&['sekretariat','analysiert','arzt'].includes(x.fall.phase))openFall(x.id);else openPanel(u.agent)});

// ── Kamera-Ansichten ───────────────────────────────────────
let goal=null;const views=document.getElementById('views');
views.innerHTML=W.ansichten.map((v,i)=>`<button data-v="${i}">${esc(v.name)}</button>`).join('');
function setView(i,instant){const v=W.ansichten[i];if(!v)return;goal={p:new THREE.Vector3(...v.p),t:new THREE.Vector3(...v.t)};if(instant){camera.position.copy(goal.p);controls.target.copy(goal.t);goal=null}
  views.querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.v===i))}
function focusOn(a){const t=new THREE.Vector3(a.x,0,a.z);goal={t,p:t.clone().add(new THREE.Vector3(11,12,10))}}
views.querySelectorAll('button').forEach(b=>b.onclick=()=>setView(+b.dataset.v));
controls.addEventListener('start',()=>goal=null);
setView(0,true);

// ── Zahnrad ────────────────────────────────────────────────
const intro=document.getElementById('intro');
const enterHQ=()=>{intro.classList.add('hide');const g=W.ansichten.find(v=>v.gesamt);if(g)camera.position.set(...g.p);setView(0)};document.getElementById('enter').addEventListener('click',enterHQ);if(window.__enterAsked)enterHQ();
document.getElementById('gear').onclick=()=>intro.classList.remove('hide');

// ── Nachbearbeitung + Schleife ─────────────────────────────
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.3,.35,1.05));composer.addPass(new OutputPass());
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);labels.setSize(innerWidth,innerHeight)});
const clock=new THREE.Clock();
renderer.setAnimationLoop(()=>{const dt=Math.min(.05,clock.getDelta()),t=clock.elapsedTime;update(dt);
  for(const a of agents)pose(a,t);for(const f of W.ticks)f(t,fx);
  if(goal){camera.position.lerp(goal.p,.05);controls.target.lerp(goal.t,.05);if(camera.position.distanceTo(goal.p)<.05)goal=null}
  controls.target.y=Math.max(0,Math.min(3,controls.target.y));if(camera.position.y<.4)camera.position.y=.4;controls.update();composer.render();labels.render(scene,camera)});
renderList();labelsUpdate();
const _q=new URLSearchParams(location.search);if(_q.has('shot')){intro.classList.add('hide');setView(+_q.get('shot'),true);const ff=+(_q.get('ff')||0);for(let i=0;i<ff*30;i++)update(1/30);for(const a of agents)pose(a,ff);if(_q.get('side')==='0')document.getElementById('side').style.display='none'}
window.__mr={agents,W,astar,CFG};

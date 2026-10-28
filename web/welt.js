// Welt-Baukasten: setzt Räume (raeume/*.json) und ihre Teile mit einer Bibliothek (bibliothek/*.js) zusammen.
// Koordinaten: Meter. x nach rechts, z zum Betrachter (vorne = +z), y nach oben. Winkel in der Raum-Datei in Grad.
// Jeder Raum hat "mitte":[x,z] und "groesse":[breite,tiefe]; die Teile stehen in Raum-Koordinaten (0,0 = Raummitte).
import * as THREE from 'three';
import {CSS2DObject} from 'three/addons/renderers/CSS2DRenderer.js';

export const WH=4.2;   // Wandhöhe
const CS=.5;           // Rastergröße der Wegfindung

export async function baueWelt(scene,cfg,aktion,portalUrl){
  const name=(cfg.welt&&cfg.welt.bibliothek)||'neon';
  const std_=await import('./bibliothek/standard.js');
  let lib=std_;
  if(name!=='standard'){try{lib=await import(`./bibliothek/${name}.js`)}catch(e){console.warn('Bibliothek nicht geladen, nutze standard:',name,e)}}
  // Was eine Bibliothek nicht mitbringt, kommt aus „standard“
  const L={materialien:lib.materialien||std_.materialien,umgebung:lib.umgebung||std_.umgebung,boden:lib.boden||std_.boden,wand:lib.wand||std_.wand,figur:lib.figur||std_.figur,teile:{...std_.teile,...(lib.teile||{})}};

  // ── Werkzeugkasten für die Bibliothek ──
  let s=11;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
  const ctex=(w,h,draw,rx=1,ry=1)=>{const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.anisotropy=8;return t};
  const std=o=>new THREE.MeshStandardMaterial(o);
  function mesh(geo,mat,x=0,y=0,z=0,parent=scene,shadow=true){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);if(shadow){m.castShadow=true;m.receiveShadow=true}parent.add(m);return m}
  const box=(w,h,d,mat,x,y,z,p=scene,sh=true)=>mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,p,sh);
  const cyl=(rt,rb,h,mat,x,y,z,p=scene,seg=32)=>mesh(new THREE.CylinderGeometry(rt,rb,h,seg),mat,x,y,z,p);

  // Raumgrenzen → Raster
  const raeume=(cfg.welt&&cfg.welt.raeume||[]).map((r,i)=>{const [cx,cz]=r.mitte||[0,0],[w,d]=r.groesse||[10,10];return{...r,i,cx,cz,w,d,x0:cx-w/2,x1:cx+w/2,zv:cz+d/2,zh:cz-d/2}});
  const b={x0:Math.min(...raeume.map(r=>r.x0)),x1:Math.max(...raeume.map(r=>r.x1)),zv:Math.max(...raeume.map(r=>r.zv)),zh:Math.min(...raeume.map(r=>r.zh))};
  b.w=b.x1-b.x0;b.d=b.zv-b.zh;b.cx=(b.x0+b.x1)/2;b.cz=(b.zv+b.zh)/2;
  const NX=Math.ceil(b.w/CS),NZ=Math.ceil(b.d/CS),blocked=new Uint8Array(NX*NZ);
  const ci=x=>Math.floor((x-b.x0)/CS),cj=z=>Math.floor((b.zv-z)/CS);
  // Alles außerhalb der Räume ist gesperrt
  for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){const x=b.x0+(i+.5)*CS,z=b.zv-(j+.5)*CS;if(!raeume.some(r=>x>=r.x0&&x<=r.x1&&z<=r.zv&&z>=r.zh))blocked[j*NX+i]=1}
  function block(x0,z0,x1,z1,m=.3){for(let i=Math.max(0,ci(Math.min(x0,x1)-m));i<=Math.min(NX-1,ci(Math.max(x0,x1)+m));i++)for(let j=Math.max(0,cj(Math.max(z0,z1)+m));j<=Math.min(NZ-1,cj(Math.min(z0,z1)-m));j++)blocked[j*NX+i]=1}
  const v=new THREE.Vector3();
  const gruppe=o=>{const g=new THREE.Group();g.position.set(o.x,0,o.z);g.rotation.y=o.ry||0;scene.add(g);g.updateMatrixWorld();return g};
  const punkt=(g,lx,lz,lry=0)=>{g.updateMatrixWorld();v.set(lx,0,lz).applyMatrix4(g.matrixWorld);return{x:v.x,z:v.z,ry:lry+g.rotation.y}};
  function sperre(g,lx0,lz0,lx1,lz1,m=.15){const ps=[[lx0,lz0],[lx1,lz0],[lx0,lz1],[lx1,lz1]].map(([x,z])=>punkt(g,x,z));block(Math.min(...ps.map(p=>p.x)),Math.max(...ps.map(p=>p.z)),Math.max(...ps.map(p=>p.x)),Math.min(...ps.map(p=>p.z)),m)}
  const anzeigeTextur=(inhalt,w,h)=>{const g={system:[2048,950],aufgaben:[2048,950],sicherungen:[2560,1000],faelle:[1600,900]}[inhalt]||[1024,Math.round(1024*h/w)];return ctex(g[0],g[1],()=>{})};

  const k={THREE,scene,CSS2DObject,WH,rnd,ctex,std,mesh,box,cyl,gruppe,punkt,sperre,block,anzeigeTextur,cfg,aktion,portalUrl};
  const {M,T,bild}=L.materialien(k);Object.assign(k,{M,T,bild});
  k.figur=farbe=>L.figur(k,farbe);
  L.umgebung(k,b);

  const W={b,NX,NZ,CS,blocked,ci,cj,tische:{},tischListe:[],bett:null,tischsitze:[],wartesitze:[],liege:null,punkte:{},anzeigen:{},ticks:[],ansichten:[],figur:k.figur,raeume};
  const rad=g=>(g||0)*Math.PI/180;
  for(const r of raeume){
    L.boden(k,r);
    // Wände: links/rechts laufen entlang z, vorne/hinten entlang x. Lücken in Raum-Koordinaten der jeweiligen Achse.
    const seiten={links:{L:r.d,x:r.x0,z:r.cz,ry:Math.PI/2,t:a=>r.d/2-a},rechts:{L:r.d,x:r.x1,z:r.cz,ry:-Math.PI/2,t:a=>a+r.d/2},
                  hinten:{L:r.w,x:r.cx,z:r.zh,ry:0,t:a=>a+r.w/2},vorne:{L:r.w,x:r.cx,z:r.zv,ry:Math.PI,t:a=>r.w/2-a}};
    for(const [seite,w] of Object.entries(r.waende||{})){const sd=seiten[seite];if(!sd||!w)continue;const ww=typeof w==='string'?{art:w}:w;
      const g=gruppe({x:sd.x,z:sd.z,ry:sd.ry});
      L.wand(k,g,{...ww,laenge:sd.L,luecken:(ww.luecken||[]).map(([a,c])=>{const p=sd.t(a),q=sd.t(c);return[Math.min(p,q),Math.max(p,q)]})})}
    // Teile
    for(const t of r.teile||[]){const fn=L.teile[t.teil];
      const o={...t,x:r.cx+(t.x||0),z:r.cz+(t.z||0),ry:rad(t.drehung)};
      if(t.teil==='punkt'){W.punkte[t.name]={x:o.x,z:o.z,ry:o.ry,pause:t.pause||'',raum:r.id};continue}
      if(!fn){console.warn('Unbekanntes Teil:',t.teil);continue}
      const e=fn(k,o)||{};
      if(e.sitz){const id=t.id||('tisch'+(W.tischListe.length+1));W.tische[id]=e.sitz;W.tischListe.push(e.sitz)}
      if(e.bett)W.bett=e.bett;if(e.liege)W.liege=e.liege;if(e.wartesitz)W.wartesitze.push(e.wartesitz);if(e.tischsitze)W.tischsitze.push(...e.tischsitze);
      if(e.tick)W.ticks.push(e.tick);
      if(e.anzeige)(W.anzeigen[e.anzeige.inhalt]=W.anzeigen[e.anzeige.inhalt]||[]).push(e.anzeige)}
    // Kamera-Ansicht des Raums (Raum-Koordinaten), sonst schräg von vorne rechts
    if(r.knopf!==false){const kam=r.kamera||{};const z=kam.ziel||[0,0,0],p=kam.pos||[10,12.5,11];
      W.ansichten.push({name:r.knopf||r.name||r.id,t:[r.cx+z[0],z[1],r.cz+z[2]],p:[r.cx+p[0],p[1],r.cz+p[2]]})}
  }
  const f=Math.max(b.w,b.d)/60;
  W.ansichten.splice(Math.min(3,W.ansichten.length),0,{name:'Gesamt',t:[b.cx,0,b.cz],p:[b.cx+38*f,46*f,b.cz+42*f],gesamt:true});
  W.free=(i,j)=>i>=0&&j>=0&&i<NX&&j<NZ&&!blocked[j*NX+i];
  W.zelle=(i,j)=>({x:b.x0+(i+.5)*CS,z:b.zv-(j+.5)*CS});
  return W;
}

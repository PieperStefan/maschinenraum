// Bibliothek „standard“ – das Aussehen des Maschinenraums (Raumschiff-Büro).
// Eine andere Bibliothek kann jede dieser Funktionen ersetzen; was fehlt, kommt von hier.
// Jedes Teil bekommt (k, o): k = Werkzeugkasten aus welt.js, o = Eintrag aus der Raum-Datei
// (o.x/o.z in Weltkoordinaten, o.ry in Bogenmaß). Teile bauen in einer Gruppe g = k.gruppe(o) mit
// lokalen Koordinaten; k.sperre(g,…) sperrt Fläche für die Wegfindung, k.punkt(g,…) rechnet Punkte in die Welt um.

export function materialien(k){
  const {ctex,rnd,std,THREE}=k;
  const T={};
  T.boden=ctex(512,512,(g,w,h)=>{g.fillStyle='#cfd5dc';g.fillRect(0,0,w,h);for(let i=0;i<9000;i++){g.fillStyle=`rgba(${rnd()>.5?255:120},${rnd()>.5?255:130},${rnd()>.5?255:140},.05)`;g.fillRect(rnd()*w,rnd()*h,2,2)}g.strokeStyle='#cfd5dc';g.lineWidth=2;g.strokeRect(0,0,w,h)});
  T.wand=ctex(512,512,(g,w,h)=>{g.fillStyle='#eef1f5';g.fillRect(0,0,w,h);g.strokeStyle='#c9d1da';g.lineWidth=3;g.strokeRect(2,2,w-4,h-4);g.beginPath();g.moveTo(0,h*.35);g.lineTo(w,h*.35);g.moveTo(w*.5,h*.35);g.lineTo(w*.5,h);g.stroke();
    g.fillStyle='#9aa7b6';for(let i=0;i<6;i++)g.fillRect(w*.6,h*.45+i*14,w*.3,5)},6,1);
  T.orange=ctex(512,512,(g,w,h)=>{g.fillStyle='#e8661f';g.fillRect(0,0,w,h);g.strokeStyle='#a5440f';g.lineWidth=4;g.strokeRect(4,4,w-8,h-8);g.beginPath();g.moveTo(0,h*.5);g.lineTo(w,h*.5);g.stroke();g.fillStyle='#fff';g.font='bold 40px sans-serif';g.fillText('⚠ ENERGIE',30,70)},4,1);
  T.warn=ctex(256,64,(g,w,h)=>{g.fillStyle='#facc15';g.fillRect(0,0,w,h);g.fillStyle='#111';for(let x=-h;x<w;x+=48){g.beginPath();g.moveTo(x,h);g.lineTo(x+24,h);g.lineTo(x+24+h,0);g.lineTo(x+h,0);g.fill()}},12,1);
  T.gitter=ctex(256,256,(g,w,h)=>{g.fillStyle='#3b1c0b';g.fillRect(0,0,w,h);g.fillStyle='#c65a1c';for(let i=0;i<w;i+=16){g.fillRect(i,0,5,h);g.fillRect(0,i,w,5)}},12,14);
  const hud=(g,w,h)=>{g.fillStyle='#04121f';g.fillRect(0,0,w,h);const cs=['#67e8f9','#38bdf8','#a5f3fc'];
    for(let i=0;i<4;i++){const x=60+rnd()*(w-120),y=50+rnd()*(h-100),r=24+rnd()*36;g.strokeStyle=cs[i%3];g.lineWidth=4;for(let k2=0;k2<3;k2++){const a=rnd()*6;g.beginPath();g.arc(x,y,r-k2*10,a,a+1.5+rnd()*3.5);g.stroke()}}
    for(let k2=0;k2<14;k2++){g.fillStyle=cs[k2%3];const bh=8+rnd()*50;g.fillRect(20+k2*18,h-20-bh,11,bh)}
    g.strokeStyle='#a5f3fc';g.lineWidth=3;g.beginPath();for(let x=w*.5;x<w-20;x+=12)g.lineTo(x,h*.75+Math.sin(x*.06)*20);g.stroke()};
  T.hud=[0,1,2].map(()=>ctex(512,256,hud));
  T.code=ctex(512,320,(g,w,h)=>{g.fillStyle='#f8fafc';g.fillRect(0,0,w,h);g.fillStyle='#1e293b';g.fillRect(0,0,w,26);const c=['#0ea5e9','#64748b','#22c55e','#a855f7'];for(let r=0;r<16;r++){let x=20;for(let k2=0;k2<4;k2++){const ww=20+rnd()*90;g.fillStyle=c[(r+k2)%4];g.fillRect(x+(r%3)*14,40+r*17,ww,7);x+=ww+12}}});
  T.buecher=ctex(256,256,(g,w,h)=>{g.fillStyle='#6b4f36';g.fillRect(0,0,w,h);const c=['#b45309','#1d4ed8','#15803d','#b91c1c','#f59e0b','#475569','#7c3aed'];for(let s=0;s<4;s++){let x=6;while(x<w-10){const bw=8+rnd()*14,bh=40+rnd()*16;g.fillStyle=c[Math.floor(rnd()*c.length)];g.fillRect(x,s*64+60-bh,bw,bh);x+=bw+2}g.fillStyle='#4a3524';g.fillRect(0,s*64+58,w,6)}});
  T.baender=ctex(256,512,(g,w,h)=>{g.fillStyle='#1d2632';g.fillRect(0,0,w,h);for(let r=0;r<16;r++)for(let k2=0;k2<4;k2++){g.fillStyle='#0d131b';g.fillRect(10+k2*60,10+r*31,52,25);g.fillStyle=rnd()>.2?'#38bdf8':'#22c55e';g.fillRect(16+k2*60,28+r*31,10,4)}});
  T.notizen=ctex(512,320,(g,w,h)=>{g.fillStyle='#fbfdff';g.fillRect(0,0,w,h);g.strokeStyle='#cbd5e1';g.lineWidth=8;g.strokeRect(0,0,w,h);const c=['#fde047','#fdba74','#86efac','#93c5fd'];for(let i=0;i<14;i++){g.fillStyle=c[i%4];g.fillRect(40+(i%5)*88+rnd()*10,40+Math.floor(i/5)*85+rnd()*10,64,58)}g.strokeStyle='#334155';g.lineWidth=3;g.beginPath();g.moveTo(30,290);g.bezierCurveTo(140,240,260,300,480,250);g.stroke()});
  const M={
    boden:std({map:T.boden,roughness:.42,metalness:.05}),wand:std({map:T.wand,roughness:.55}),
    weiss:std({color:0xe9edf1,roughness:.4,metalness:.05}),holz:std({color:0xc59a6d,roughness:.55}),holzDunkel:std({color:0x8a6342,roughness:.6}),
    dunkel:std({color:0x222a35,roughness:.45,metalness:.3}),stahl:std({color:0xa9b4c1,roughness:.3,metalness:.85}),stoff:std({color:0x4b5563,roughness:.9}),
    pflanze:std({color:0x2f7d3a,roughness:.8}),topf:std({color:0xe2e8f0,roughness:.6}),
    leucht:std({color:0,emissive:0x5fdcff,emissiveIntensity:2.6}),
    glas:new THREE.MeshPhysicalMaterial({color:0xcfefff,transparent:true,opacity:.12,roughness:0}),
    orange:std({map:T.orange,roughness:.55}),warn:std({map:T.warn,roughness:.6}),gitter:std({map:T.gitter,roughness:.6,metalness:.4}),
    schirm:t=>std({color:0,emissive:0xffffff,emissiveMap:t,emissiveIntensity:1.2}),
  };
  const bild=n=>n==='code'?T.code:n==='buecher'?T.buecher:T.hud[(+String(n||'hud0').slice(3)||0)%3];
  return{M,T,bild}
}

// ── Umgebung: Sterne, Planet, Licht ───────────────────────
export function umgebung(k,b){
  const {THREE,scene,rnd,ctex,std,mesh}=k;
  const n=3500,p=new Float32Array(n*3);for(let i=0;i<n;i++){const u=rnd()*2-1,a=rnd()*6.283,s=Math.sqrt(1-u*u);p[i*3]=Math.cos(a)*s*6000;p[i*3+1]=u*6000;p[i*3+2]=Math.sin(a)*s*6000}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(p,3));scene.add(new THREE.Points(geo,new THREE.PointsMaterial({color:0xffffff,size:2,sizeAttenuation:false})));
  const tp=ctex(512,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#0b3b7a');gr.addColorStop(1,'#0d5aa8');g.fillStyle=gr;g.fillRect(0,0,w,h);
    for(let i=0;i<70;i++){g.fillStyle=`rgba(${60+rnd()*60},${110+rnd()*50},${60+rnd()*30},.85)`;g.beginPath();g.ellipse(rnd()*w,rnd()*h,10+rnd()*40,6+rnd()*22,rnd()*3,0,7);g.fill()}
    for(let i=0;i<140;i++){g.fillStyle='rgba(255,255,255,.45)';g.beginPath();g.ellipse(rnd()*w,rnd()*h,8+rnd()*40,2+rnd()*6,rnd()*.5,0,7);g.fill()}});
  const planet=mesh(new THREE.SphereGeometry(2000,96,64),std({map:tp,roughness:.9}),b.cx-2600,-2150,b.cz,scene,false);
  const sp=new THREE.DirectionalLight(0xffffff,2);sp.position.set(-1500,1500,1500);sp.target=planet;scene.add(sp);
  scene.background=new THREE.Color(0x05070d);
  scene.add(new THREE.HemisphereLight(0xf1f7ff,0x6b7280,.55));
  const sun=new THREE.DirectionalLight(0xfff6ea,1.7);sun.position.set(b.cx+14,26,b.cz+38);sun.target.position.set(b.cx,0,b.cz);scene.add(sun.target);
  const r=Math.max(b.w,b.d)*.8;sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-r,right:r,top:r,bottom:-r,near:1,far:140});sun.shadow.bias=-.0004;sun.shadow.normalBias=.03;scene.add(sun);
}

// ── Böden ─────────────────────────────────────────────────
// stil: "fliesen" (Standard) · "gitter" (Industrie-Gitter mit Warnstreifen vorne) · "#rrggbb" (einfarbig)
export function boden(k,r){
  const {THREE,mesh,std,M}=k;
  const leg=(m,y,w,d,x=r.cx,z=r.cz)=>{const p=mesh(new THREE.PlaneGeometry(w,d),m,x,y,z);p.rotation.x=-Math.PI/2;p.castShadow=false;p.receiveShadow=true;return p};
  const stil=r.boden||'fliesen';
  if(stil.startsWith('#')){leg(std({color:new THREE.Color(stil),roughness:.6}),.003,r.w-.2,r.d);return}
  const m=M.boden.clone();m.map=M.boden.map.clone();m.map.needsUpdate=true;m.map.repeat.set(r.w/2,r.d/2);leg(m,0,r.w,r.d);
  if(stil==='gitter'){leg(M.gitter,.01,r.w-.4,r.d-.4);leg(M.warn,.015,r.w-.4,.5,r.cx,r.zv-.9)}
}

// ── Wände ─────────────────────────────────────────────────
// w = {art, laenge, hoehe, luecken:[[a,b],…] (entlang der Wand, 0 = Anfang)}. Gebaut in Gruppe g:
// lokal x entlang der Wand, lokal +z zeigt in den Raum. art: voll · fenster · niedrig · tor · offen
export function wand(k,g,w){
  const {box,M,WH,sperre}=k;const L=w.laenge,dick=w.dicke||(w.art==='tor'?.6:w.art==='niedrig'?.3:.3),zm=w.mittig?0:-dick/2;
  const stuecke=(luecken)=>{const out=[];let a=0;for(const [x0,x1] of (luecken||[]).slice().sort((p,q)=>p[0]-q[0])){if(x0>a)out.push([a,x0]);a=Math.max(a,x1)}if(a<L)out.push([a,L]);return out};
  if(w.art==='offen')return;
  if(w.art==='niedrig'){for(const [a,b] of stuecke(w.luecken)){const l=b-a,m=(a+b)/2-L/2;box(l,1.1,dick,M.weiss,m,.55,zm,g);box(l,.05,.06,M.leucht,m,1.12,zm,g,false);sperre(g,m-l/2,zm-dick/2,m+l/2,zm+dick/2,.15)}return}
  if(w.art==='tor'){const tb=w.torbreite||6,a=L/2-tb/2,b=L/2+tb/2;
    for(const [x0,x1] of [[0,a],[b,L]]){const l=x1-x0,m=(x0+x1)/2-L/2;box(l,WH,dick,M.wand,m,WH/2,zm,g);sperre(g,m-l/2,zm-dick/2,m+l/2,zm+dick/2,.2)}
    box(tb,1.2,dick,M.wand,0,WH-.6,zm,g);for(const s of[-1,1])box(.08,3,dick+.02,M.warn,s*tb/2,1.5,zm,g);box(tb,.08,dick+.02,M.leucht,0,3.02,zm,g);return}
  if(w.art==='fenster'||w.art==='voll'){
    const n=Math.max(1,Math.round(L/5)),sl=L/n;
    for(let i=0;i<n;i++){const m=-L/2+sl*(i+.5);
      if(w.art==='fenster'){box(sl,1,dick,M.wand,m,.5,zm,g);box(sl,.7,dick,M.wand,m,WH-.35,zm,g);box(sl,2.5,.06,M.glas,m,2.25,zm,g,false);box(sl,.08,.12,M.stahl,m,1.02,zm+dick/2,g)}
      else{box(sl,WH,dick,M.wand,m,WH/2,zm,g);if(w.paneele)box(sl-.6,3,.05,M.orange,m,1.9,.03,g)}
      if(w.pfeiler&&i>0){const x=-L/2+sl*i;box(.5,WH+.1,.6,M.weiss,x,WH/2,.05,g);box(.06,3.6,.04,M.leucht,x,2,.37,g)}}
    sperre(g,-L/2,zm-dick/2,L/2,zm+dick/2,.2)}
}

// ── Die Figur (runder Helfer mit Antenne) ────────────────
export function figur(k,farbe){
  const {THREE,mesh,std,box,cyl,scene,M}=k;
  const mat=new THREE.MeshPhysicalMaterial({color:farbe??0x22c55e,roughness:.35,clearcoat:1,clearcoatRoughness:.25});
  const root=new THREE.Group();scene.add(root);const body=new THREE.Group();root.add(body);
  const sp=(r,x,y,z,p,m=mat)=>mesh(new THREE.SphereGeometry(r,32,24),m,x,y,z,p);
  sp(.27,0,.72,0,body).scale.set(1,1.15,.9);
  const head=new THREE.Group();head.position.set(0,1.16,0);body.add(head);const headBall=sp(.32,0,0,0,head);
  const eyeW=std({color:0xffffff,roughness:.2}),eyeB=std({color:0x0b1020,roughness:.2});
  for(const sx of[-1,1]){sp(.085,sx*.12,.05,.27,head,eyeW).scale.set(1,1.15,.6);sp(.045,sx*.12,.05,.33,head,eyeB)}
  mesh(new THREE.CylinderGeometry(.015,.015,.22,8),M.stahl,0,.4,0,head);
  const tipMat=std({color:0,emissive:farbe??0x22c55e,emissiveIntensity:2.5});sp(.05,0,.53,0,head,tipMat);
  const limb=(r,len)=>{const g=new THREE.CapsuleGeometry(r,len,6,12);g.translate(0,-len/2-r,0);return g};
  const arms=[-1,1].map(sx=>{const p=new THREE.Group();p.position.set(sx*.27,.86,0);body.add(p);mesh(limb(.07,.26),mat,0,0,0,p);return p});
  const legs=[-1,1].map(sx=>{const p=new THREE.Group();p.position.set(sx*.12,.46,0);body.add(p);mesh(limb(.085,.24),mat,0,0,0,p);return p});
  const carry=new THREE.Group();carry.position.set(0,.78,.38);body.add(carry);
  const items={band:box(.28,.18,.1,M.dunkel,0,0,0,carry),ordner:box(.26,.32,.06,std({color:0xf59e0b,roughness:.6}),0,0,0,carry),tasse:cyl(.06,.05,.12,M.topf,0,0,0,carry)};
  return{root,body,head,headBall,arms,legs,mat,tipMat,carry,items}
}

// ── Teile ─────────────────────────────────────────────────
const farbe=(THREE,c,def)=>new THREE.Color(c||def);
function stuhlBauen(k,p,x,z,ry){const {THREE,cyl,box,M}=k;const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;p.add(g);
  cyl(.28,.3,.04,M.dunkel,0,.03,0,g);cyl(.04,.04,.36,M.stahl,0,.22,0,g);box(.48,.07,.46,M.stoff,0,.42,0,g);box(.46,.5,.06,M.stoff,0,.72,-.22,g);return g}
function teppich(k,g,w,d,c,x=0,z=0,rund=false){const {THREE,mesh,std}=k;const r=mesh(rund?new THREE.CircleGeometry(w,48):new THREE.PlaneGeometry(w,d),std({color:c,roughness:.95}),x,.012,z,g);r.rotation.x=-Math.PI/2;r.receiveShadow=true;r.castShadow=false}

export const teile={
  // Schreibtisch mit Bildschirm, Stuhl und Teppich. Gibt einen Sitzplatz für einen Bot (platz: "<id>").
  schreibtisch(k,o){const {box,mesh,M,THREE}=k;const g=k.gruppe(o);
    box(.85,.05,1.6,M.holz,0,.74,0,g);box(.8,.7,.05,M.weiss,-.38,.36,0,g);
    box(.4,.68,.45,M.weiss,0,.35,.52,g);box(.04,.7,.04,M.stahl,.38,.36,-.75,g);box(.04,.7,.04,M.stahl,.38,.36,.75,g);
    box(.05,.42,.72,M.dunkel,-.28,1.02,0,g);mesh(new THREE.PlaneGeometry(.66,.38),M.schirm(k.bild(o.bildschirm)),-.25,1.03,0,g,false).rotation.y=Math.PI/2;
    box(.12,.05,.2,M.dunkel,-.28,.79,0,g);box(.18,.02,.42,M.weiss,.06,.775,0,g);
    teppich(k,g,2.4,2.6,farbe(THREE,o.teppich,'#3b6fb9'),.35,0);
    stuhlBauen(k,g,.82,0,-Math.PI/2);k.sperre(g,-.45,-.82,.45,.82,.15);
    return{sitz:k.punkt(g,.82,0,-Math.PI/2)}},
  stuhl(k,o){const g=k.gruppe(o);stuhlBauen(k,g,0,0,0);k.sperre(g,-.3,-.3,.3,.3,.05);return{}},
  // Wartestuhl: Sitzplatz im Sekretariat für Bots, die analysiert werden
  wartestuhl(k,o){const g=k.gruppe(o);stuhlBauen(k,g,0,0,0);return{wartesitz:k.punkt(g,0,0,0)}},
  pflanze(k,o){const {THREE,cyl,mesh,M}=k;const g=k.gruppe(o);g.scale.setScalar(o.groesse||1);cyl(.22,.17,.45,M.topf,0,.22,0,g);
    for(let i=0;i<9;i++){const l=mesh(new THREE.SphereGeometry(.2,12,8),M.pflanze,Math.cos(i)*.15,.6+(i%3)*.16,Math.sin(i)*.15,g);l.scale.set(.7,1.4,.7)}k.sperre(g,-.25,-.25,.25,.25,.1);return{}},
  whiteboard(k,o){const {THREE,mesh,std,box,M}=k;const g=k.gruppe(o);mesh(new THREE.PlaneGeometry(2.3,1.45),std({map:k.T.notizen,roughness:.6}),0,1.55,.03,g,false);box(2.4,1.55,.05,M.weiss,0,1.55,0,g);
    for(const sx of[-1,1]){box(.05,1.2,.05,M.stahl,sx*1.05,.6,0,g);box(.05,.05,.6,M.stahl,sx*1.05,.03,0,g)}k.sperre(g,-1.3,-.3,1.3,.3,.2);return{}},
  buecherregal(k,o){const {THREE,mesh,std,box,M}=k;const g=k.gruppe(o);box(.6,2.2,2.2,M.holzDunkel,0,1.1,0,g);mesh(new THREE.PlaneGeometry(2.1,2.1),std({map:k.T.buecher,roughness:.8}),-.31,1.1,0,g,false).rotation.y=-Math.PI/2;k.sperre(g,-.4,-1.2,.4,1.2,.2);return{}},
  // Runder Besprechungstisch mit 4 Stühlen
  besprechungstisch(k,o){const {THREE,cyl,box,M}=k;const g=k.gruppe(o);cyl(1.05,1.05,.05,M.weiss,0,.74,0,g,48);cyl(.08,.08,.72,M.stahl,0,.37,0,g);cyl(.45,.45,.03,M.stahl,0,.02,0,g);
    teppich(k,g,2.3,0,0x9aa4b1,0,0,true);for(let i=0;i<4;i++){const a=i/4*Math.PI*2+.4;stuhlBauen(k,g,Math.cos(a)*1.45,Math.sin(a)*1.45,-a-Math.PI/2)}
    k.sperre(g,-1.1,-1.1,1.1,1.1,.1);box(.5,.12,.35,M.dunkel,.2,.83,-.2,g);cyl(.06,.05,.12,M.topf,-.3,.83,.2,g);return{}},
  wasserspender(k,o){const {THREE,cyl,std,M}=k;const g=k.gruppe(o);cyl(.22,.22,1.1,M.weiss,0,.55,0,g);cyl(.18,.18,.4,std({color:0x60a5fa,transparent:true,opacity:.7}),0,1.3,0,g);k.sperre(g,-.3,-.3,.3,.3,.15);return{}},
  drucker(k,o){const {box,M}=k;const g=k.gruppe(o);box(.6,.7,1.8,M.holz,0,.35,0,g);box(.45,.3,.5,M.dunkel,0,.85,-.4,g);k.sperre(g,-.4,-1,.4,1,.15);return{}},
  // Schlafkapsel: dort ruhen Bots mit platz "bett"
  schlafkapsel(k,o){const {box,std,M}=k;const g=k.gruppe(o);box(3.4,.45,1.7,M.weiss,0,.23,0,g);box(3.2,.18,1.5,std({color:0x6c8fc7,roughness:.85}),.1,.54,0,g);box(.6,.16,1.1,std({color:0xf1f5f9,roughness:.9}),-1.25,.64,0,g);
    box(3.5,1.3,.12,M.weiss,0,.95,-.9,g);box(.12,1.3,1.8,M.weiss,-1.75,.95,0,g);box(3.2,.04,.04,M.leucht,0,1.55,-.82,g);k.sperre(g,-1.8,-.95,1.8,.9,.15);
    const p=k.punkt(g,.15,0,Math.PI/2),a=k.punkt(g,-2.1,0,0);return{bett:{x:p.x,y:.66,z:p.z,ry:p.ry,ap:{x:a.x,z:a.z}}}},
  sofa(k,o){const {box,M}=k;const g=k.gruppe(o);box(1,.45,3.2,M.stoff,0,.23,0,g);box(.3,.5,3.2,M.stoff,-.4,.7,0,g);for(const d of[-1,1])box(1,.35,.25,M.stoff,0,.6,d*1.5,g);
    box(.8,.35,1.4,M.holz,1.5,.18,0,g);k.sperre(g,-.6,-1.7,2,1.7,.15);teppich(k,g,3.8,4.2,0x5b8a72,.8,0);return{}},
  kaffeebar(k,o){const {box,cyl,M}=k;const g=k.gruppe(o);box(.8,1,3,M.weiss,0,.5,0,g);box(.85,.05,3.05,M.holz,0,1.02,0,g);box(.4,.5,.4,M.dunkel,0,1.3,-.8,g);for(let i=0;i<3;i++)cyl(.05,.04,.1,M.topf,-.1,1.1,.3+i*.25,g);k.sperre(g,-.45,-1.6,.45,1.6,.15);return{}},
  // Runder Tisch mit 3 Stühlen – hier machen Bots „Frühstückspause“
  fruehstueckstisch(k,o){const {cyl,M}=k;const g=k.gruppe(o);cyl(.8,.8,.05,M.holz,0,.74,0,g,40);cyl(.07,.07,.72,M.stahl,0,.37,0,g);k.sperre(g,-.85,-.85,.85,.85,.1);
    const sitze=[];for(let i=0;i<3;i++){const a=i/3*Math.PI*2;stuhlBauen(k,g,Math.cos(a)*1.2,Math.sin(a)*1.2,-a-Math.PI/2);sitze.push(k.punkt(g,Math.cos(a)*1.2,Math.sin(a)*1.2,-a-Math.PI/2+Math.PI))}
    return{tischsitze:sitze}},
  // Prospekt: Klick öffnet die Portal-Adresse aus der Konfiguration (portal). Ohne Portal wird nichts gebaut.
  prospekt(k,o){const {THREE,mesh,std,ctex,M,CSS2DObject}=k;const pt=k.cfg.portal;if(!pt)return{};
    const name=(pt.name||'Portal').toUpperCase().split(/[\s-]+/);
    const t=ctex(300,420,(g)=>{const gr=g.createLinearGradient(0,0,0,420);gr.addColorStop(0,'#0ea5e9');gr.addColorStop(1,'#1e3a8a');g.fillStyle=gr;g.fillRect(0,0,300,420);g.fillStyle='#fff';g.font='bold 40px sans-serif';name.slice(0,2).forEach((w,i)=>g.fillText(w,30,90+i*50));g.font='90px sans-serif';g.fillText('⚙︎',100,290);g.font='22px sans-serif';g.fillText(pt.untertitel||'Alle Dienste & Links',30,380)});
    const b=mesh(new THREE.BoxGeometry(.32,.012,.44),[M.weiss,M.weiss,std({map:t,roughness:.5}),M.weiss,M.weiss,M.weiss],o.x,o.y??.775,o.z,k.scene,true);b.rotation.y=o.ry;
    const url=k.portalUrl();b.userData.klick={art:'link',url};
    const d=document.createElement('div');d.className='brosch';d.textContent='📖 '+(pt.name||'Portal');d.onclick=()=>window.open(url,'_blank');const lo=new CSS2DObject(d);lo.position.set(0,.35,0);b.add(lo);return{}},
  schrank(k,o){const {box,M}=k;const g=k.gruppe(o);box(.6,2,1.6,M.weiss,0,1,0,g);for(let i=0;i<3;i++)box(.02,.04,.3,M.stahl,-.31,.5+i*.6,0,g);k.sperre(g,-.35,-.9,.35,.9,.15);return{}},
  aktenschrank(k,o){const {box,M}=k;const g=k.gruppe(o);box(.6,1.6,1.4,M.holzDunkel,0,.8,0,g);k.sperre(g,-.4,-.8,.4,.8,.1);return{}},
  // Wandanzeige mit Live-Inhalt. inhalt: system · aufgaben · sicherungen · faelle (Klick öffnet das Sekretariat)
  anzeige(k,o){const {THREE,mesh,std,box,M}=k;const g=k.gruppe(o);const w=o.breite||8,h=o.hoehe||3.7,y=o.y||2.2;
    const tex=k.anzeigeTextur(o.inhalt,w,h);const m=mesh(new THREE.PlaneGeometry(w,h),std({color:0,emissive:0xffffff,emissiveMap:tex,emissiveIntensity:1}),0,y,0,g,false);box(w+.14,h+.14,.1,M.dunkel,0,y,-.06,g);
    if(o.inhalt==='faelle')m.userData.klick={art:'sekretariat'};return{anzeige:{inhalt:o.inhalt,tex}}},
  // Bodenschild (Text auf dem Boden)
  bodenschild(k,o){const {THREE,mesh,std,ctex}=k;const t=ctex(1024,160,g=>{g.fillStyle=o.farbe||'rgba(120,70,30,.55)';g.font='bold 110px sans-serif';g.textAlign='center';g.fillText(o.text||'',512,120)});
    const m=mesh(new THREE.PlaneGeometry(6,.94),std({map:t,transparent:true,roughness:.8}),o.x,.01,o.z,k.scene,false);m.rotation.x=-Math.PI/2;m.rotation.z=o.ry;m.receiveShadow=true;return{}},
  reaktor(k,o){const {THREE,mesh,std,cyl,box,M}=k;const g=k.gruppe(o);
    cyl(2.3,2.6,.5,M.stahl,0,.25,0,g,48);cyl(2,2,.08,M.warn,0,.53,0,g,48);
    mesh(new THREE.CylinderGeometry(1.2,1.2,3.4,48,1,true),new THREE.MeshPhysicalMaterial({color:0xaee9ff,transparent:true,opacity:.25,roughness:.05,side:THREE.DoubleSide}),0,2.25,0,g,false);
    const core=mesh(new THREE.CylinderGeometry(.38,.38,3.4,32),std({color:0,emissive:0x6fe6ff,emissiveIntensity:4}),0,2.25,0,g,false);
    const rings=[0,1,2].map(()=>mesh(new THREE.TorusGeometry(1.3,.06,12,48),M.leucht,0,1,0,g,false));rings.forEach(r=>r.rotation.x=Math.PI/2);
    cyl(1.6,1.3,.5,M.weiss,0,4.1,0,g,48);for(let i=0;i<6;i++){const a=i/6*Math.PI*2;box(.2,3.6,.2,M.weiss,Math.cos(a)*1.45,2.3,Math.sin(a)*1.45,g)}
    const l=new THREE.PointLight(0x6fe6ff,30,14,1.6);l.position.set(0,2.5,0);g.add(l);k.sperre(g,-2.7,-2.7,2.7,2.7,.1);
    return{tick:t=>{core.material.emissiveIntensity=3.4+Math.sin(t*2.2);l.intensity=26+Math.sin(t*2.2)*8;rings.forEach((r,i)=>r.position.y=.7+((i*1.1+t*.5)%3.2))}}},
  // Konsole mit Bildschirm (bildschirm: hud0|hud1|hud2|code)
  konsole(k,o){const {THREE,mesh,box,M}=k;const g=k.gruppe(o);box(1.6,.95,.8,M.weiss,0,.48,0,g);const top=mesh(new THREE.PlaneGeometry(1.4,.6),M.schirm(k.bild(o.bildschirm)),0,1,.05,g,false);top.rotation.x=-Math.PI/2+.5;
    box(1.6,.04,.04,M.leucht,0,.96,.42,g);k.sperre(g,-.9,-.5,.9,.5,.15);return{}},
  // Signallampe. art: pruefen (gelb blinkend beim Prüfen, grün bei ok) · post (rot blinkend bei Fehler)
  lampe(k,o){const {THREE,mesh,std}=k;const m=mesh(new THREE.SphereGeometry(.12,16,12),std({color:0,emissive:0x334155,emissiveIntensity:2}),o.x,o.y??1.25,o.z,k.scene,false);
    return{tick:(t,fx)=>{if(o.art==='post')m.material.emissive.setHex(fx.postFehler?(Math.sin(t*10)>0?0xef4444:0x330a0a):0x22c55e);
      else m.material.emissive.setHex(fx.pruefen==='busy'?(Math.sin(t*12)>0?0xfacc15:0x332b08):fx.pruefen==='ok'?0x22c55e:0x334155)}}},
  // Sicherungsregal: dunkler Turm mit 8 Leuchtetiketten (je eine Sicherung)
  sicherungsregal(k,o){const {THREE,mesh,std,box,ctex,M}=k;const g=k.gruppe(o);box(2.8,3.7,.9,M.dunkel,0,1.85,0,g);box(2.82,.08,.92,M.leucht,0,3.72,0,g);k.sperre(g,-1.5,-.5,1.5,.5,.15);
    const etiketten=[];for(let i=0;i<8;i++){const t=ctex(640,90,()=>{});etiketten.push(t);mesh(new THREE.PlaneGeometry(2.6,.36),std({color:0,emissive:0xffffff,emissiveMap:t,emissiveIntensity:1.1}),0,3.35-i*.42,.46,g,false)}
    return{anzeige:{inhalt:'regal',etiketten}}},
  bandregal(k,o){const {THREE,mesh,std,box,M}=k;const g=k.gruppe(o);const n=o.anzahl||3;
    for(let i=0;i<n;i++){const x=(i-(n-1)/2)*1.6;box(1.5,2.6,.7,M.dunkel,x,1.3,0,g);mesh(new THREE.PlaneGeometry(1.4,2.4),std({map:k.T.baender,emissiveMap:k.T.baender,emissive:0xffffff,emissiveIntensity:.6}),x,1.3,.36,g,false)}
    k.sperre(g,-n*.8,-.4,n*.8,.4,.15);return{}},
  tresor(k,o){const {THREE,mesh,std,box,M}=k;const g=k.gruppe(o);const V=new THREE.Group();V.position.set(0,1.6,0);g.add(V);
    mesh(new THREE.TorusGeometry(1.45,.2,16,48),M.stahl,0,0,0,V);const tuer=new THREE.Group();tuer.position.set(-1.35,0,.12);V.add(tuer);
    mesh(new THREE.CylinderGeometry(1.32,1.32,.35,48),std({color:0x8f9aa8,roughness:.25,metalness:.9}),1.35,0,0,tuer).rotation.x=Math.PI/2;
    const rad=new THREE.Group();rad.position.set(1.35,0,.22);tuer.add(rad);mesh(new THREE.TorusGeometry(.45,.05,10,32),M.weiss,0,0,0,rad);for(let i=0;i<3;i++){const s=box(.9,.06,.06,M.weiss,0,0,0,rad);s.rotation.z=i*Math.PI/3}
    box(2.8,.03,.3,M.warn,0,.02-0,.75,g);k.sperre(g,-1.6,-.5,1.6,.45,.2);
    return{tick:(t,fx)=>{const auf=fx.tresorT>0?Math.min(1,Math.min(fx.tresorT,3.4-fx.tresorT)*1.4):0;tuer.rotation.y=-auf*1.6;rad.rotation.z=t*(auf?3:0)}}},
  // Mutter: Großrechner mit Gehirn – Klick öffnet das Gespräch mit Claude
  mutter(k,o){const {THREE,mesh,std,box,cyl,M,CSS2DObject}=k;const g=k.gruppe(o);g.userData.klick={art:'mutter'};
    box(2.7,1.15,1.7,M.weiss,0,.58,0,g);box(2.72,.06,1.72,std({color:0,emissive:0xf472b6,emissiveIntensity:2.2}),0,1.17,0,g);
    mesh(new THREE.PlaneGeometry(2.3,.7),M.schirm(k.T.hud[2]),0,.62,.86,g,false);cyl(1.0,1.1,.22,M.stahl,0,1.3,0,g,48);
    mesh(new THREE.SphereGeometry(.98,48,24,0,Math.PI*2,0,Math.PI/2),new THREE.MeshPhysicalMaterial({color:0xffe4f1,transparent:true,opacity:.18,roughness:.05,side:THREE.DoubleSide}),0,1.4,0,g,false);
    const geo=new THREE.IcosahedronGeometry(.55,6);{const v=geo.attributes.position,t=new THREE.Vector3();for(let i=0;i<v.count;i++){t.fromBufferAttribute(v,i).normalize();
      let d=.07*Math.sin(9*t.x+2)*Math.sin(11*t.y)*Math.sin(8*t.z+1)+.035*Math.sin(23*(t.x+t.y))+.025*Math.sin(31*(t.y-t.z));if(Math.abs(t.x)<.06)d-=.12;t.multiplyScalar(.55*(1+d));v.setXYZ(i,t.x,t.y,t.z)}geo.computeVertexNormals()}
    const gm=std({color:0xf9a8d4,emissive:0xec4899,emissiveIntensity:.9,roughness:.45});const hirn=mesh(geo,gm,0,1.78,0,g,false);hirn.scale.set(.95,.78,1.18);
    const l=new THREE.PointLight(0xf472b6,6,6,1.8);l.position.set(0,1.9,0);g.add(l);
    const d=document.createElement('div');d.className='brosch mutter';d.textContent='🧠 Mutter · mit mir reden';d.onclick=()=>k.aktion('mutter');const lo=new CSS2DObject(d);lo.position.set(0,2.75,0);g.add(lo);
    k.sperre(g,-1.5,-1,1.5,1,.15);
    return{tick:(t,fx)=>{const dk=fx.mutterDenkt;hirn.rotation.y=t*(dk?1.2:.25);gm.emissiveIntensity=(dk?1.6:.8)+Math.sin(t*(dk?9:2))*(dk?.8:.25);l.intensity=gm.emissiveIntensity*6}}},
  // Empfangstresen (Sekretariat)
  tresen(k,o){const {THREE,mesh,box,M}=k;const g=k.gruppe(o);box(3.4,1.05,.85,M.holz,0,.53,0,g);box(3.42,.05,.87,M.leucht,0,1.06,0,g);k.sperre(g,-1.8,-.5,1.8,.5,.15);
    box(.05,.36,.6,M.dunkel,-.6,1.26,-.2,g);mesh(new THREE.PlaneGeometry(.56,.32),M.schirm(k.T.code),-.57,1.27,-.2,g,false).rotation.y=Math.PI/2;return{}},
  // Behandlungsliege (Arzt): dort liegen Bots während der Reparatur
  liege(k,o){const {box,std,M}=k;const g=k.gruppe(o);box(2.3,.62,.95,M.weiss,0,.31,0,g);box(2.2,.12,.9,std({color:0x99f6e4,roughness:.7}),.05,.68,0,g);box(.5,.12,.7,std({color:0xffffff,roughness:.9}),-.9,.78,0,g);k.sperre(g,-1.2,-.55,1.2,.55,.12);
    const p=k.punkt(g,.15,0,Math.PI/2),a=k.punkt(g,0,1.1,0);return{liege:{x:p.x,y:.79,z:p.z,ry:p.ry,ap:{x:a.x,z:a.z}}}},
  ekg(k,o){const {THREE,mesh,std,box,cyl,ctex,M}=k;const g=k.gruppe(o);cyl(.05,.05,1.5,M.stahl,0,.75,0,g);const t=ctex(256,128,()=>{});mesh(new THREE.PlaneGeometry(.7,.36),std({color:0,emissive:0xffffff,emissiveMap:t,emissiveIntensity:1.3}),0,1.6,.02,g,false);box(.76,.42,.06,M.dunkel,0,1.6,-.02,g);
    let x=0;return{tick:()=>{const c=t.image.getContext('2d');c.fillStyle='rgba(2,6,23,.25)';c.fillRect(0,0,256,128);const y=64+(x%60<4?-40+(x%60)*20:x%60<8?30:0);c.fillStyle='#4ade80';c.fillRect(x%256,y,3,3);x+=2;t.needsUpdate=true}}},
  medizinschrank(k,o){const {THREE,mesh,std,box,ctex,M}=k;const g=k.gruppe(o);box(.5,1.8,1.2,M.weiss,0,.9,0,g);const t=ctex(128,128,c=>{c.fillStyle='#fff';c.fillRect(0,0,128,128);c.fillStyle='#e11d48';c.fillRect(48,16,32,96);c.fillRect(16,48,96,32)});
    mesh(new THREE.PlaneGeometry(.5,.5),std({map:t}),-.26,1.35,0,g,false).rotation.y=-Math.PI/2;k.sperre(g,-.3,-.7,.3,.7,.1);return{}},
  // Personal: feste Figur ohne Aufgabe (z. B. Sekretärin, Ärztin). knopf: "faelle" zeigt ein Schild „Fälle & Vorschläge ansehen“
  personal(k,o){const {THREE,CSS2DObject}=k;const b=k.figur(new THREE.Color(o.farbe||'#a78bfa').getHex());b.root.position.set(o.x,0,o.z);b.root.rotation.y=o.ry;for(const n in b.items)b.items[n].visible=false;
    const t=document.createElement('div');t.className='tag';t.textContent=o.name||'';const lo=new CSS2DObject(t);lo.position.set(0,1.85,0);b.root.add(lo);
    if(o.knopf==='faelle'){const s=document.createElement('div');s.className='brosch';s.textContent='📋 Fälle & Vorschläge ansehen';s.onclick=()=>k.aktion('sekretariat');const so=new CSS2DObject(s);so.position.set(0,2.3,0);b.root.add(so)}
    const g=new THREE.Group();g.position.set(o.x,0,o.z);g.rotation.y=o.ry;g.updateMatrixWorld();k.sperre(g,-.4,-.35,.4,.35,0);return{}},
};

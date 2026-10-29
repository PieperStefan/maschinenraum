// Bibliothek „neon“ – dunkler Leitstand (Anthrazit, cyanfarbene Kanten, weiße Roboter).
// Was hier fehlt, kommt aus standard.js. Das Raumschiff-Büro bleibt als Bibliothek „standard“ ladbar.
// Bodenfarben aus dem Raum („#rrggbb“) behalten ihren Farbton, werden aber in die Nachtpalette gezogen.

export function materialien(k){
  const {ctex,rnd,std,THREE}=k;
  const T={};
  T.boden=ctex(512,512,(g,w,h)=>{
    g.fillStyle='#10161d';g.fillRect(0,0,w,h);
    const n=4,tw=w/n,th=h/n;
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const v=6+((x*3+y*5)%5)*4;
      g.fillStyle=`rgb(${14+v},${18+v},${26+v})`;
      g.fillRect(x*tw+4,y*th+4,tw-8,th-8);
    }
    g.strokeStyle='rgba(80,220,235,.16)';g.lineWidth=2;g.strokeRect(2,2,w-4,h-4);
  });
  T.wand=ctex(512,512,(g,w,h)=>{
    g.fillStyle='#141b24';g.fillRect(0,0,w,h);
    g.strokeStyle='#2a3848';g.lineWidth=4;g.strokeRect(10,10,w-20,h-20);
    g.beginPath();g.moveTo(0,h*.58);g.lineTo(w,h*.58);g.stroke();
    g.fillStyle='#1ad4ff';for(let i=0;i<6;i++)g.fillRect(36+i*70,h*.58+16,12,4);
  },2,1);
  T.orange=ctex(512,512,(g,w,h)=>{
    g.fillStyle='#0e1620';g.fillRect(0,0,w,h);
    g.strokeStyle='#14d4ff';g.lineWidth=3;g.strokeRect(12,12,w-24,h-24);
    g.strokeStyle='rgba(20,212,255,.4)';
    for(let y=48;y<h-20;y+=40){g.beginPath();g.moveTo(28,y);g.lineTo(w-28,y);g.stroke()}
    g.fillStyle='#22e0ff';for(let i=0;i<7;i++)g.fillRect(36,56+i*58,8,8);
  },2,1);
  T.warn=ctex(256,64,(g,w,h)=>{
    g.fillStyle='#0c1218';g.fillRect(0,0,w,h);g.fillStyle='#14d4ff';
    for(let x=-h;x<w;x+=36){g.beginPath();g.moveTo(x,h);g.lineTo(x+12,h);g.lineTo(x+12+h,0);g.lineTo(x+h,0);g.fill()}
  },8,1);
  T.gitter=ctex(256,256,(g,w,h)=>{
    g.fillStyle='#0c1218';g.fillRect(0,0,w,h);
    g.strokeStyle='#147a90';g.lineWidth=3;
    for(let i=0;i<=w;i+=32){g.beginPath();g.moveTo(i,0);g.lineTo(i,h);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(w,i);g.stroke()}
    g.fillStyle='#22d3ee';for(let y=10;y<h;y+=32)for(let x=10;x<w;x+=32)g.fillRect(x,y,5,5);
  },6,6);
  const hud=(g,w,h)=>{
    g.fillStyle='#061018';g.fillRect(0,0,w,h);
    g.strokeStyle='#1ad4ff';g.lineWidth=3;g.strokeRect(6,6,w-12,h-12);
    const dots=['#22c55e','#facc15','#ef4444','#94a3b8','#22c55e','#38bdf8'];
    for(let i=0;i<6;i++){g.fillStyle=dots[i];g.beginPath();g.arc(34,46+i*30,7,0,7);g.fill();g.fillStyle='#9be7ff';g.fillRect(50,40+i*30,60+(i*29)%48,8)}
    g.strokeStyle='#3cf0ff';g.lineWidth=2;
    const cubes=[[250,48],[292,92],[236,104],[318,58],[274,140]];
    cubes.forEach(([x,y],i)=>{g.strokeRect(x,y,26,26);if(i){g.beginPath();g.moveTo(x+13,y+13);g.lineTo(cubes[i-1][0]+13,cubes[i-1][1]+13);g.stroke()}});
    const cx=w-86,cy=h*.42;g.beginPath();g.arc(cx,cy,46,0,7);g.stroke();g.beginPath();g.arc(cx,cy,24,0,7);g.stroke();
    g.beginPath();g.moveTo(cx-50,cy);g.lineTo(cx+50,cy);g.moveTo(cx,cy-50);g.lineTo(cx,cy+50);g.stroke();
    for(let i=0;i<14;i++){g.fillStyle=i%5===3?'#facc15':i%7===2?'#ef4444':'#22d3ee';const bh=8+((i*23)%36);g.fillRect(18+i*34,h-16-bh,16,bh)}
  };
  T.hud=[0,1,2].map(()=>ctex(512,256,hud));
  T.code=ctex(512,320,(g,w,h)=>{
    g.fillStyle='#071018';g.fillRect(0,0,w,h);g.fillStyle='#10202c';g.fillRect(0,0,w,28);
    const c=['#67e8f9','#64748b','#22c55e','#38bdf8'];
    for(let r=0;r<14;r++){let x=18;for(let k2=0;k2<4;k2++){const ww=16+rnd()*80;g.fillStyle=c[(r+k2)%4];g.fillRect(x+(r%3)*10,46+r*18,ww,6);x+=ww+10}}
  });
  T.buecher=ctex(256,256,(g,w,h)=>{
    g.fillStyle='#121820';g.fillRect(0,0,w,h);
    const c=['#164e63','#1e3a5f','#14532d','#7f1d1d','#0e7490','#334155','#155e75'];
    for(let s=0;s<4;s++){let x=6;while(x<w-8){const bw=8+rnd()*12,bh=36+rnd()*18;g.fillStyle=c[Math.floor(rnd()*c.length)];g.fillRect(x,s*64+58-bh,bw,bh);x+=bw+2}g.fillStyle='#0c1218';g.fillRect(0,s*64+56,w,6)}
  });
  T.baender=ctex(256,512,(g,w,h)=>{
    g.fillStyle='#0c1218';g.fillRect(0,0,w,h);
    const c=['#22c55e','#22c55e','#22c55e','#facc15','#ef4444','#64748b','#22d3ee'];
    for(let r=0;r<16;r++){g.fillStyle='#101820';g.fillRect(8,8+r*31,w-16,24);for(let k2=0;k2<8;k2++){g.fillStyle=c[Math.floor(rnd()*c.length)];g.fillRect(16+k2*28,16+r*31,8,8)}}
  });
  T.notizen=ctex(512,320,(g,w,h)=>{
    g.fillStyle='#0c141c';g.fillRect(0,0,w,h);g.strokeStyle='#164e63';g.lineWidth=8;g.strokeRect(0,0,w,h);
    g.strokeStyle='#67e8f9';g.lineWidth=3;g.beginPath();g.moveTo(36,70);g.bezierCurveTo(120,40,200,120,320,80);g.lineTo(460,110);g.stroke();
    g.strokeStyle='#22c55e';g.beginPath();g.moveTo(40,180);g.lineTo(200,160);g.lineTo(220,210);g.lineTo(400,190);g.stroke();
    g.fillStyle='#facc15';for(let i=0;i<5;i++)g.fillRect(48+i*80,240,36,8);
  });
  const leucht=std({color:0x083848,emissive:0x12c8e4,emissiveIntensity:1.15,roughness:.42});
  const glow=std({color:0x042830,emissive:0x0e9cbc,emissiveIntensity:.55,roughness:.55});
  const M={
    boden:std({map:T.boden,roughness:.62,metalness:.16}),
    wand:std({map:T.wand,roughness:.58,metalness:.22}),
    weiss:std({color:0x1c2430,roughness:.46,metalness:.2}),
    holz:std({color:0x242c36,roughness:.5,metalness:.18}),
    holzDunkel:std({color:0x141b24,roughness:.55,metalness:.16}),
    dunkel:std({color:0x10161c,roughness:.48,metalness:.28}),
    panel:std({color:0x1b242e,roughness:.42,metalness:.24}),
    stahl:std({color:0x8ea0b2,roughness:.32,metalness:.82}),
    stoff:std({color:0x2a3340,roughness:.88}),
    pflanze:std({color:0x1f8a45,roughness:.7,emissive:0x0c3d20,emissiveIntensity:.45}),
    topf:std({color:0x1a212b,roughness:.6,metalness:.2}),
    leucht,glow,
    glas:new THREE.MeshPhysicalMaterial({color:0x8eefff,transparent:true,opacity:.16,roughness:.04,metalness:.1}),
    orange:std({map:T.orange,roughness:.5,metalness:.2,emissive:0x083848,emissiveMap:T.orange,emissiveIntensity:.35}),
    warn:std({map:T.warn,roughness:.5,emissive:0x0c3a48,emissiveMap:T.warn,emissiveIntensity:.4}),
    gitter:std({map:T.gitter,roughness:.55,metalness:.35,emissive:0x083040,emissiveMap:T.gitter,emissiveIntensity:.25}),
    schirm:t=>std({color:0x041018,emissive:0xffffff,emissiveMap:t,emissiveIntensity:1.35,roughness:.35}),
  };
  const bild=n=>n==='code'?T.code:n==='buecher'?T.buecher:T.hud[(+String(n||'hud0').slice(3)||0)%3];
  return{M,T,bild};
}

export function umgebung(k,b){
  const {THREE,scene,std,mesh}=k;
  scene.background=new THREE.Color(0x05080e);
  const ground=mesh(new THREE.PlaneGeometry(b.w+48,b.d+40),std({color:0x070b10,roughness:1}),b.cx,-.14,b.cz,scene,false);
  ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;
  scene.add(new THREE.HemisphereLight(0xb7dcff,0x0a1018,.48));
  const sun=new THREE.DirectionalLight(0xd7e6ff,1.35);
  sun.position.set(b.cx+18,34,b.cz+26);sun.target.position.set(b.cx,0,b.cz);scene.add(sun.target);
  const r=Math.max(b.w,b.d)*.85;
  sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);
  Object.assign(sun.shadow.camera,{left:-r,right:r,top:r,bottom:-r,near:1,far:180});
  sun.shadow.bias=-.00045;sun.shadow.normalBias=.04;scene.add(sun);
  const rim=new THREE.DirectionalLight(0x1ad4ff,.32);
  rim.position.set(b.cx-22,12,b.cz-16);rim.target.position.set(b.cx,1,b.cz);scene.add(rim.target);scene.add(rim);
}

function rand(k,r){
  const {box,M}=k,y=.028,h=.018,t=.045,inset=.32;
  const w=r.w-inset*2,d=r.d-inset*2;
  box(w,h,t,M.leucht,r.cx,y,r.zv-inset,k.scene,false);
  box(w,h,t,M.leucht,r.cx,y,r.zh+inset,k.scene,false);
  box(t,h,d,M.leucht,r.x0+inset,y,r.cz,k.scene,false);
  box(t,h,d,M.leucht,r.x1-inset,y,r.cz,k.scene,false);
}

export function boden(k,r){
  const {THREE,mesh,std,M}=k;
  const leg=(m,y,w,d,x=r.cx,z=r.cz)=>{const p=mesh(new THREE.PlaneGeometry(w,d),m,x,y,z);p.rotation.x=-Math.PI/2;p.castShadow=false;p.receiveShadow=true;return p};
  const stil=r.boden||'fliesen';
  if(stil.startsWith('#')){
    const c=new THREE.Color(stil),hsl={h:0,s:0,l:0};c.getHSL(hsl);
    c.setHSL(hsl.h,Math.min(.32,hsl.s*.6),.07);
    leg(std({color:c,roughness:.78,metalness:.08}),.006,r.w-.2,r.d-.2);rand(k,r);return;
  }
  if(stil==='gitter'){
    const gm=M.gitter.clone();gm.map=gm.emissiveMap=M.gitter.map.clone();gm.map.needsUpdate=true;gm.map.repeat.set(Math.max(2,r.w/2),Math.max(2,r.d/2));
    leg(gm,.004,r.w,r.d);rand(k,r);return;
  }
  const m=M.boden.clone();m.map=M.boden.map.clone();m.map.needsUpdate=true;m.map.repeat.set(r.w/2,r.d/2);
  leg(m,0,r.w,r.d);rand(k,r);
}

export function wand(k,g,w){
  const {box,M,WH,sperre}=k;
  const L=w.laenge,dick=w.dicke||(w.art==='tor'?.55:w.art==='niedrig'?.28:.28),zm=w.mittig?0:-dick/2;
  const stuecke=(luecken)=>{const out=[];let a=0;for(const [x0,x1] of (luecken||[]).slice().sort((p,q)=>p[0]-q[0])){if(x0>a)out.push([a,x0]);a=Math.max(a,x1)}if(a<L)out.push([a,L]);return out};
  const leiste=(l,m,y,hh=.035)=>box(l,hh,.045,M.leucht,m,y,zm+dick/2,g,false);
  if(w.art==='offen')return;
  if(w.art==='niedrig'){
    for(const [a,b] of stuecke(w.luecken)){const l=b-a,m=(a+b)/2-L/2;
      box(l,1.05,dick,M.panel,m,.52,zm,g);leiste(l,m,1.08);sperre(g,m-l/2,zm-dick/2,m+l/2,zm+dick/2,.15)}
    return;
  }
  if(w.art==='tor'){
    const tb=w.torbreite||6,a=L/2-tb/2,b=L/2+tb/2;
    for(const [x0,x1] of [[0,a],[b,L]]){const l=x1-x0,m=(x0+x1)/2-L/2;box(l,WH,dick,M.wand,m,WH/2,zm,g);leiste(l,m,WH+.02);sperre(g,m-l/2,zm-dick/2,m+l/2,zm+dick/2,.2)}
    box(tb,1.05,dick,M.wand,0,WH-.52,zm,g);leiste(tb,0,WH-1.02);
    for(const s of[-1,1])box(.06,2.6,.05,M.leucht,s*tb/2,1.4,zm,g,false);
    return;
  }
  if(w.art==='fenster'||w.art==='voll'){
    const n=Math.max(1,Math.round(L/5)),sl=L/n;
    for(let i=0;i<n;i++){const m=-L/2+sl*(i+.5);
      if(w.art==='fenster'){box(sl,.95,dick,M.wand,m,.48,zm,g);box(sl,.62,dick,M.wand,m,WH-.31,zm,g);box(sl,2.4,.05,M.glas,m,2.2,zm,g,false);leiste(sl,m,1.0);leiste(sl-.2,m,WH+.02)}
      else{box(sl,WH,dick,M.wand,m,WH/2,zm,g);leiste(sl-.15,m,.08,.03);leiste(sl-.15,m,WH+.02);if(w.paneele)box(sl-.7,2.6,.04,M.orange,m,1.85,.02,g)}
      if(w.pfeiler&&i>0){const x=-L/2+sl*i;box(.42,WH+.08,.5,M.panel,x,WH/2,.02,g);box(.045,WH-.4,.04,M.leucht,x,WH/2,.28,g,false)}}
    sperre(g,-L/2,zm-dick/2,L/2,zm+dick/2,.2);
  }
}

// Weißer runder Roboter. Brust und Antenne (statusMat, tipMat) zeigen den Zustand;
// ein fester Körper (farbe) färbt den Rumpf, der Kopf dann den Zustand – wie bisher.
export function figur(k,farbe){
  const {THREE,mesh,std,box,cyl,scene,M}=k;
  const mat=new THREE.MeshPhysicalMaterial({color:farbe!=null?farbe:0xf4f7fb,roughness:.28,metalness:.05,clearcoat:1,clearcoatRoughness:.2});
  const root=new THREE.Group();scene.add(root);const body=new THREE.Group();root.add(body);
  const sp=(r,x,y,z,p,m=mat)=>mesh(new THREE.SphereGeometry(r,32,24),m,x,y,z,p);
  sp(.27,0,.72,0,body).scale.set(1,1.15,.9);
  const head=new THREE.Group();head.position.set(0,1.16,0);body.add(head);const headBall=sp(.32,0,0,0,head);
  const eye=std({color:0x083848,emissive:0x3ee8ff,emissiveIntensity:1.8,roughness:.2});
  for(const sx of[-1,1])sp(.09,sx*.12,.04,.25,head,eye).scale.set(1.05,.95,.55);
  mesh(new THREE.CylinderGeometry(.014,.014,.24,8),M.stahl,0,.42,0,head);
  const tipMat=std({color:0x102028,emissive:0x22d3ee,emissiveIntensity:1.8,roughness:.35});
  sp(.09,0,.58,0,head,tipMat);
  const limb=(r,len)=>{const geo=new THREE.CapsuleGeometry(r,len,6,12);geo.translate(0,-len/2-r,0);return geo};
  const hand=std({color:0x141920,roughness:.4,metalness:.4});
  const arms=[-1,1].map(sx=>{const p=new THREE.Group();p.position.set(sx*.27,.86,0);body.add(p);mesh(limb(.07,.26),mat,0,0,0,p);sp(.068,0,-.4,.02,p,hand);return p});
  const legs=[-1,1].map(sx=>{const p=new THREE.Group();p.position.set(sx*.12,.46,0);body.add(p);mesh(limb(.085,.24),mat,0,0,0,p);return p});
  const statusMat=std({color:0x22d3ee,emissive:0x14c4de,emissiveIntensity:1.3,roughness:.35});
  // Kragen um den Kopf: von der schrägen Kamera aus als farbiger Ring lesbar (ok/läuft/Fehler/aus).
  const ring=mesh(new THREE.TorusGeometry(.38,.055,12,32),statusMat,0,.96,0,body,false);ring.rotation.x=Math.PI/2;
  mesh(new THREE.SphereGeometry(.09,16,12),statusMat,0,.7,.28,body,false);
  const carry=new THREE.Group();carry.position.set(0,.78,.38);body.add(carry);
  const items={
    band:box(.28,.18,.1,M.dunkel,0,0,0,carry),
    ordner:box(.26,.32,.06,std({color:0x67e8f9,roughness:.45,emissive:0x0e7490,emissiveIntensity:.35}),0,0,0,carry),
    tasse:cyl(.06,.05,.12,std({color:0xd5e2ec,roughness:.35}),0,0,0,carry),
  };
  for(const n in items)items[n].visible=false;
  return{root,body,head,headBall,arms,legs,mat,tipMat,statusMat,carry,items};
}

function hocker(k,parent,x,z,ry){
  const {THREE,cyl,mesh,M}=k;
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry||0;parent.add(g);
  cyl(.2,.2,.07,M.panel,0,.46,0,g);cyl(.045,.05,.4,M.stahl,0,.22,0,g);cyl(.15,.17,.04,M.dunkel,0,.04,0,g);
  const ring=mesh(new THREE.TorusGeometry(.2,.012,8,28),M.leucht,0,.5,0,g,false);ring.rotation.x=Math.PI/2;
  return g;
}

export const teile={
  schreibtisch(k,o){
    const {box,mesh,M,THREE}=k;const g=k.gruppe(o);
    box(.42,.64,.4,M.dunkel,-.22,.34,-.34,g);box(.42,.64,.4,M.dunkel,-.22,.34,.34,g);
    box(1.18,.06,1.28,M.panel,-.02,.72,0,g);
    box(1.18,.02,.03,M.leucht,-.02,.76,.64,g,false);box(1.18,.02,.03,M.leucht,-.02,.76,-.64,g,false);
    box(.025,.02,1.28,M.leucht,.56,.76,0,g,false);
    box(.85,.02,.7,M.glow,.15,.02,0,g,false);
    box(.05,.46,.7,M.dunkel,-.5,1.02,0,g);
    mesh(new THREE.PlaneGeometry(.62,.36),M.schirm(k.bild(o.bildschirm)),-.445,1.03,0,g,false).rotation.y=Math.PI/2;
    box(.016,.03,.68,M.leucht,-.44,1.23,0,g,false);box(.016,.03,.68,M.leucht,-.44,.83,0,g,false);
    box(.016,.4,.03,M.leucht,-.44,1.03,.33,g,false);box(.016,.4,.03,M.leucht,-.44,1.03,-.33,g,false);
    box(.16,.016,.38,M.panel,.16,.76,0,g);
    hocker(k,g,.9,0,0);
    k.sperre(g,-.64,-.7,.42,.7,.12);
    return{sitz:k.punkt(g,.9,0,-Math.PI/2)};
  },
  stuhl(k,o){const g=k.gruppe(o);hocker(k,g,0,0,0);k.sperre(g,-.28,-.28,.28,.28,.05);return{}},
  wartestuhl(k,o){const g=k.gruppe(o);hocker(k,g,0,0,0);return{wartesitz:k.punkt(g,0,0,0)}},
  pflanze(k,o){
    const {THREE,mesh,M,box}=k;const g=k.gruppe(o);g.scale.setScalar(o.groesse||1);
    box(.46,.4,.46,M.dunkel,0,.2,0,g);box(.48,.025,.48,M.leucht,0,.41,0,g,false);
    for(let i=0;i<8;i++){const l=mesh(new THREE.SphereGeometry(.18,12,8),M.pflanze,Math.cos(i*1.3)*.12,.62+(i%3)*.14,Math.sin(i*1.3)*.12,g);l.scale.set(.75,1.35,.75)}
    k.sperre(g,-.28,-.28,.28,.28,.1);return{};
  },
  besprechungstisch(k,o){
    const {THREE,cyl,box,mesh,M}=k;const g=k.gruppe(o);
    cyl(1.05,1.05,.06,M.panel,0,.74,0,g,48);
    const rim=mesh(new THREE.TorusGeometry(1.05,.016,8,48),M.leucht,0,.78,0,g,false);rim.rotation.x=Math.PI/2;
    cyl(.08,.08,.7,M.stahl,0,.36,0,g);cyl(.42,.42,.03,M.dunkel,0,.03,0,g);
    for(let i=0;i<4;i++){const a=i/4*Math.PI*2+.4;hocker(k,g,Math.cos(a)*1.45,Math.sin(a)*1.45,-a-Math.PI/2)}
    k.sperre(g,-1.1,-1.1,1.1,1.1,.1);box(.4,.04,.26,M.dunkel,.15,.8,-.1,g);return{};
  },
  fruehstueckstisch(k,o){
    const {THREE,cyl,mesh,M}=k;const g=k.gruppe(o);
    cyl(.8,.8,.06,M.panel,0,.74,0,g,40);
    const rim=mesh(new THREE.TorusGeometry(.8,.015,8,40),M.leucht,0,.78,0,g,false);rim.rotation.x=Math.PI/2;
    cyl(.07,.07,.7,M.stahl,0,.36,0,g);k.sperre(g,-.85,-.85,.85,.85,.1);
    const sitze=[];
    for(let i=0;i<3;i++){const a=i/3*Math.PI*2;hocker(k,g,Math.cos(a)*1.2,Math.sin(a)*1.2,-a-Math.PI/2);sitze.push(k.punkt(g,Math.cos(a)*1.2,Math.sin(a)*1.2,-a-Math.PI/2+Math.PI))}
    return{tischsitze:sitze};
  },
  schlafkapsel(k,o){
    const {box,std,M}=k;const g=k.gruppe(o);
    box(3.4,.42,1.7,M.dunkel,0,.22,0,g);box(3.15,.14,1.45,M.panel,.08,.5,0,g);
    box(.58,.1,1.05,std({color:0xd5dee8,roughness:.85}),-1.2,.6,0,g);
    box(3.45,1.15,.1,M.dunkel,0,.88,-.82,g);box(.1,1.15,1.65,M.dunkel,-1.7,.88,0,g);
    box(3.15,.03,.04,M.leucht,0,1.42,-.76,g,false);box(3.05,.025,1.35,M.glow,.05,.44,0,g,false);
    k.sperre(g,-1.8,-.95,1.8,.9,.15);
    const p=k.punkt(g,.15,0,Math.PI/2),a=k.punkt(g,-2.1,0,0);
    return{bett:{x:p.x,y:.66,z:p.z,ry:p.ry,ap:{x:a.x,z:a.z}}};
  },
  sofa(k,o){
    const {THREE,box,mesh,std,M}=k;const g=k.gruppe(o);
    box(1,.42,3.2,M.stoff,0,.22,0,g);box(.28,.48,3.2,M.stoff,-.38,.66,0,g);
    for(const d of[-1,1])box(.95,.32,.22,M.stoff,0,.55,d*1.5,g);
    box(.75,.32,1.3,M.dunkel,1.45,.17,0,g);box(.78,.02,1.34,M.leucht,1.45,.34,0,g,false);
    k.sperre(g,-.6,-1.7,2,1.7,.15);
    const r=mesh(new THREE.PlaneGeometry(3.4,3.8),std({color:0x10161c,roughness:.95}),.7,.012,0,g);
    r.rotation.x=-Math.PI/2;r.receiveShadow=true;r.castShadow=false;return{};
  },
  anzeige(k,o){
    const {THREE,mesh,std,box,M}=k;const g=k.gruppe(o);
    const w=o.breite||8,h=o.hoehe||3.7,y=o.y||2.2;
    const tex=k.anzeigeTextur(o.inhalt,w,h);
    const scr=std({color:0x041018,emissive:0xffffff,emissiveMap:tex,emissiveIntensity:1.2,roughness:.32});
    const m=mesh(new THREE.PlaneGeometry(w,h),scr,0,y,.05,g,false);
    box(w+.26,h+.26,.12,M.dunkel,0,y,-.03,g);
    const t=.04;
    box(w+.18,t,.07,M.leucht,0,y+h/2+.03,.07,g,false);box(w+.18,t,.07,M.leucht,0,y-h/2-.03,.07,g,false);
    box(t,h+.18,.07,M.leucht,w/2+.03,y,.07,g,false);box(t,h+.18,.07,M.leucht,-w/2-.03,y,.07,g,false);
    if(o.inhalt==='faelle')m.userData.klick={art:'sekretariat'};
    return{anzeige:{inhalt:o.inhalt,tex}};
  },
  konsole(k,o){
    const {THREE,mesh,box,M}=k;const g=k.gruppe(o);
    box(1.6,.9,.78,M.dunkel,0,.46,0,g);box(1.64,.045,.82,M.panel,0,.93,0,g);
    const top=mesh(new THREE.PlaneGeometry(1.35,.55),M.schirm(k.bild(o.bildschirm)),0,.98,.04,g,false);top.rotation.x=-Math.PI/2+.55;
    box(1.5,.028,.035,M.leucht,0,.95,.4,g,false);box(1.2,.04,.55,M.glow,0,.08,0,g,false);
    k.sperre(g,-.9,-.5,.9,.5,.15);return{};
  },
  sicherungsregal(k,o){
    const {THREE,mesh,std,box,ctex,M}=k;const g=k.gruppe(o);
    box(2.8,3.7,.9,M.dunkel,0,1.85,0,g);
    box(.05,3.5,.05,M.leucht,-1.36,1.85,.46,g,false);box(.05,3.5,.05,M.leucht,1.36,1.85,.46,g,false);
    box(2.65,.035,.04,M.leucht,0,3.62,.46,g,false);
    k.sperre(g,-1.5,-.5,1.5,.5,.15);
    const etiketten=[];
    for(let i=0;i<8;i++){const t=ctex(640,90,()=>{});etiketten.push(t);
      mesh(new THREE.PlaneGeometry(2.45,.32),std({color:0x041018,emissive:0xffffff,emissiveMap:t,emissiveIntensity:1.15}),0,3.25-i*.42,.48,g,false)}
    return{anzeige:{inhalt:'regal',etiketten}};
  },
  bandregal(k,o){
    const {THREE,mesh,std,box,M}=k;const g=k.gruppe(o);const n=o.anzahl||3;
    for(let i=0;i<n;i++){const x=(i-(n-1)/2)*1.6;
      box(1.45,2.55,.68,M.dunkel,x,1.3,0,g);
      mesh(new THREE.PlaneGeometry(1.3,2.3),std({map:k.T.baender,emissiveMap:k.T.baender,emissive:0xffffff,emissiveIntensity:.8}),x,1.3,.36,g,false);
      box(.035,2.4,.04,M.leucht,x-.7,1.3,.36,g,false);box(.035,2.4,.04,M.leucht,x+.7,1.3,.36,g,false)}
    k.sperre(g,-n*.8,-.4,n*.8,.4,.15);return{};
  },
  reaktor(k,o){
    const {THREE,mesh,std,cyl,box,M}=k;const g=k.gruppe(o);
    cyl(2.3,2.6,.5,M.stahl,0,.25,0,g,48);cyl(2,2,.08,M.panel,0,.53,0,g,48);
    mesh(new THREE.CylinderGeometry(1.2,1.2,3.4,48,1,true),new THREE.MeshPhysicalMaterial({color:0x9eefff,transparent:true,opacity:.22,roughness:.05,side:THREE.DoubleSide}),0,2.25,0,g,false);
    const core=mesh(new THREE.CylinderGeometry(.32,.32,3.2,32),std({color:0x062028,emissive:0x5ee8ff,emissiveIntensity:1.5}),0,2.25,0,g,false);
    const rings=[0,1,2].map(()=>mesh(new THREE.TorusGeometry(1.25,.05,12,48),M.leucht,0,1,0,g,false));rings.forEach(r=>r.rotation.x=Math.PI/2);
    cyl(1.5,1.2,.45,M.panel,0,4.05,0,g,48);
    for(let i=0;i<6;i++){const a=i/6*Math.PI*2;box(.16,3.4,.16,M.panel,Math.cos(a)*1.4,2.2,Math.sin(a)*1.4,g)}
    const l=new THREE.PointLight(0x5ee8ff,5,11,2);l.position.set(0,2.4,0);g.add(l);
    k.sperre(g,-2.7,-2.7,2.7,2.7,.1);
    return{tick:t=>{core.material.emissiveIntensity=1.25+Math.sin(t*2.2)*.35;l.intensity=4+Math.sin(t*2.2)*1.5;rings.forEach((r,i)=>r.position.y=.7+((i*1.1+t*.5)%3.2))}};
  },
  liege(k,o){
    const {box,std,M}=k;const g=k.gruppe(o);
    box(2.3,.58,.95,M.dunkel,0,.3,0,g);box(2.15,.1,.85,M.panel,.04,.64,0,g);
    box(.48,.1,.65,std({color:0xe8eef4,roughness:.85}),-.9,.74,0,g);
    box(2.2,.025,.04,M.leucht,0,.7,.44,g,false);
    k.sperre(g,-1.2,-.55,1.2,.55,.12);
    const p=k.punkt(g,.15,0,Math.PI/2),a=k.punkt(g,0,1.1,0);
    return{liege:{x:p.x,y:.79,z:p.z,ry:p.ry,ap:{x:a.x,z:a.z}}};
  },
};

(function(){
'use strict';

const {FLOOR,LANES,BASES,TOWERS,CORES,OFFICE_ROOMS}=Arena;
const palette=[0x59d9ff,0xff655b];
const faction=['碧蓝','赤焰'];
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

function create(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(1);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.19;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.BasicShadowMap;
  renderer.shadowMap.autoUpdate=false;
  renderer.shadowMap.needsUpdate=true;
  const world=new THREE.Scene();
  world.background=new THREE.Color(0x202b31);
  world.fog=new THREE.FogExp2(0x42565a,.007);
  const camera=new THREE.OrthographicCamera(-25,25,14,-14,.1,130);
  const center=new THREE.Vector3(FLOOR.w/2,0,FLOOR.h/2);
  const cursor=new THREE.Vector2(), raycaster=new THREE.Raycaster();
  const floorPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  const vector=new THREE.Vector3();
  let zoom=1,width=0,height=0,didCenter=false,entered=false;
  const selected=new THREE.Vector3(center.x,0,center.z);

  world.add(new THREE.HemisphereLight(0xd7f6e5,0x3b3426,2.0));
  const sun=new THREE.DirectionalLight(0xffe6bb,2.7);
  sun.position.set(13,36,3);
  sun.target.position.copy(center);
  sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-32,right:32,top:25,bottom:-25,near:1,far:85});
  sun.shadow.normalBias=.055;
  sun.shadow.bias=-.00016;
  world.add(sun,sun.target);

  let seed=401;
  function random(){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    return seed/4294967296;
  }

  function groundTexture(){
    const art=document.createElement('canvas');
    art.width=576;
    art.height=363;
    const c=art.getContext('2d');
    c.scale(art.width/FLOOR.w,art.height/FLOOR.h);
    c.fillStyle='#527475';
    c.fillRect(0,0,FLOOR.w,FLOOR.h);
    for(let i=0;i<5700;i++){
      const x=random()*46,y=random()*29,r=random()*.46+.045;
      c.fillStyle=['#577b7a90','#39555d72','#849b8749','#3154515c','#83a19a52'][i%5];
      c.fillRect(Math.round(x*12)/12,Math.round(y*12)/12,r,r*.55);
    }
    function trace(points){
      c.beginPath();
      points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));
    }
    c.strokeStyle='#334f546d';
    c.lineWidth=.025;
    for(let x=0;x<FLOOR.w;x+=1.2){c.beginPath();c.moveTo(x,0);c.lineTo(x,FLOOR.h);c.stroke();}
    for(let y=0;y<FLOOR.h;y+=1.2){c.beginPath();c.moveTo(0,y);c.lineTo(FLOOR.w,y);c.stroke();}
    for(const lane of LANES){
      for(const [color,w] of [['#363f31',4.4],['#797253',4],['#aa9570',3.5],['#9b8b6c',3.03]]){
        trace(lane); c.lineWidth=w;c.lineCap='round';c.strokeStyle=color;c.stroke();
      }
      for(let j=1;j<lane.length;j++){
        const a=lane[j-1],b=lane[j],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
        c.save();c.translate(a.x,a.y);c.rotate(Math.atan2(dy,dx));
        for(let x=.08;x<len-.14;x+=.72+random()*.39){
          for(let y=-1.42;y<1.37;y+=.63){
            const sx=x+random()*.31,sy=y+random()*.17,w=.4+random()*.49,h=.29+random()*.22;
            c.fillStyle=['#786d59','#90846d','#b3a080','#a59173','#8e826b'][Math.floor(random()*5)];
            c.beginPath();
            c.moveTo(sx+.08,sy); c.lineTo(sx+w-.08,sy+.018); c.lineTo(sx+w,sy+h-.09);
            c.lineTo(sx+w-.09,sy+h); c.lineTo(sx,sy+h-.045); c.closePath();c.fill();
            c.strokeStyle='#494b3b80';c.lineWidth=.036;c.stroke();
            c.fillStyle='#e2cb9949';c.fillRect(sx+.1,sy+.04,w-.22,.038);
          }
        }
        c.restore();
      }
    }
    for(const room of OFFICE_ROOMS){
      c.fillStyle=room.color;
      c.fillRect(room.x,room.y,room.w,room.d);
      c.strokeStyle='#243e4a7a';
      c.lineWidth=.043;
      for(let y=room.y+.55;y<room.y+room.d;y+=.55){c.beginPath();c.moveTo(room.x,y);c.lineTo(room.x+room.w,y);c.stroke();}
      if(room.name==='厕所'){
        for(let x=room.x+.55;x<room.x+room.w;x+=.55){c.beginPath();c.moveTo(x,room.y);c.lineTo(x,room.y+room.d);c.stroke();}
      }
      c.fillStyle='#d5c47e';
      c.fillRect(room.x+room.w/2-.83,room.y+room.d-.1,1.66,.16);
    }
    c.fillStyle='#425765';
    c.fillRect(9.1,17.1,28,5.5);
    c.strokeStyle='#7b9093';
    c.lineWidth=.10;
    c.strokeRect(9.2,17.2,27.8,5.3);
    for(const [i,b] of BASES.entries()){
      for(const [r,color] of [[3.25,'#4e5348'],[2.94,'#9a9780'],[2.72,'#666f68'],[2.47,'#7d8577']]){
        c.fillStyle=color;c.beginPath();c.arc(b.x,b.y,r,0,6.29);c.fill();
      }
      for(let j=0;j<16;j++){
        c.save();c.translate(b.x,b.y);c.rotate(j*Math.PI/8);
        c.fillStyle=i?'#d1745c':'#6eabb2';c.fillRect(2.39,-.055,.39,.11);
        c.fillStyle='#b0ad8a';c.fillRect(2.83,-.19,.12,.38);c.restore();
      }
    }
    const texture=new THREE.CanvasTexture(art);
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.magFilter=THREE.NearestFilter;
    texture.minFilter=THREE.NearestMipmapNearestFilter;
    return {texture,art};
  }

  const {texture,art}=groundTexture();
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(FLOOR.w,FLOOR.h),
    new THREE.MeshStandardMaterial({map:texture,roughness:.94}));
  floor.rotation.x=-Math.PI/2;
  floor.position.copy(center);
  floor.receiveShadow=true;
  world.add(floor);
  const border=new THREE.Mesh(new THREE.BoxGeometry(68,.3,53),new THREE.MeshStandardMaterial({color:0x263740,roughness:1}));
  border.position.set(center.x,-.2,center.z);border.receiveShadow=true;world.add(border);

  const material=(color,metalness=0,roughness=.75)=>new THREE.MeshStandardMaterial({color,metalness,roughness,flatShading:true});
  const stone=material(0x63716a), darkStone=material(0x35463f), bronze=material(0xa5874f,.5,.44);
  const charcoal=material(0x273036,.32,.66), silver=material(0xa6b3a9,.48,.45);
  const boxGeometry=new THREE.BoxGeometry(1,1,1);
  const sphere=new THREE.SphereGeometry(1,8,6);
  const crystalGeo=new THREE.OctahedronGeometry(1,0);
  const cylinder=new THREE.CylinderGeometry(1,1,1,10);
  const cone=new THREE.ConeGeometry(1,1,6);
  function mesh(geometry,mat,parent,x,y,z,sx=1,sy=1,sz=1,shadow=true){
    const obj=new THREE.Mesh(geometry,mat);
    obj.position.set(x,y,z);obj.scale.set(sx,sy,sz);
    obj.castShadow=shadow;obj.receiveShadow=true;parent.add(obj);
    return obj;
  }
  function batch(geo,mat,list,shadow=true){
    if(!list.length) return;
    const set=new THREE.InstancedMesh(geo,mat,list.length);
    const dummy=new THREE.Object3D();
    list.forEach(([x,y,z,sx,sy,sz,rotation,tint],i)=>{
      dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,rotation,0);
      dummy.updateMatrix();
      set.setMatrixAt(i,dummy.matrix);
      if(tint!==undefined) set.setColorAt(i,new THREE.Color(tint));
    });
    set.castShadow=shadow;set.receiveShadow=true;
    world.add(set);
  }

  const wallBlocks=[],furniture=[],trim=[],accents=[];
  const add=(list,x,y,z,w,h,d,color,angle=0)=>list.push([x,y,z,w,h,d,angle,color]);
  const deskTop=0xcba879, deskSide=0x876548, metal=0x405862, monitor=0x26373d;
  const wall=0xadc7c3;
  for(const [x,z,w,d] of Arena.OFFICE_WALLS){
    add(wallBlocks,x+w/2,.64,z+d/2,w,1.28,d,wall);
    add(trim,x+w/2,1.31,z+d/2,w+.045,.075,d+.045,0xd9ded1);
    add(trim,x+w/2,.07,z+d/2,w+.045,.14,d+.045,0x577778);
  }
  function table(x,z,w,d){
    add(furniture,x,.78,z,w,.16,d,deskTop);
    for(const side of [-1,1]){
      add(furniture,x+side*(w/2-.13),.36,z,.14,.72,d*.78,deskSide);
    }
  }
  function chair(x,z,color){
    add(furniture,x,.19,z,.28,.38,.28,metal);
    add(furniture,x,.43,z,.54,.16,.51,color);
    add(furniture,x,.64,z+.22,.54,.46,.12,color);
  }
  function workstation(x,z){
    table(x,z,1.50,.77);
    add(furniture,x,.96,z-.18,.28,.20,.19,metal);
    add(furniture,x,1.17,z-.22,.61,.40,.13,monitor);
    add(accents,x,1.17,z-.144,.5,.29,.026,0x7fd1bd);
    add(furniture,x-.10,.875,z+.18,.43,.036,.19,0xb2bfc0);
    add(furniture,x+.53,.93,z+.04,.15,.19,.15,0xe28d54);
    chair(x,z+.67,0x4b7280);
  }
  function sofa(x,z){
    add(furniture,x,.26,z,2.42,.51,.95,0x6b8460);
    add(furniture,x,.67,z-.36,2.42,.68,.25,0x52684e);
    for(const side of [-1,1]){
      add(furniture,x+side*1.12,.58,z,.21,.47,.99,0x52684e);
      add(furniture,x+side*.49,.54,z+.07,.92,.18,.65,0xa4ad76);
    }
    add(furniture,x-.65,.72,z-.18,.39,.34,.17,0xe6ad68);
  }
  function plant(x,z){
    add(furniture,x,.25,z,.4,.5,.4,0x9a684e);
    add(furniture,x,.62,z,.12,.55,.12,0x6d573f);
    for(let i=0;i<5;i++){
      const t=i*Math.PI*2/5;
      add(accents,x+Math.sin(t)*.24,.88+i*.035,z+Math.cos(t)*.22,.44,.22,.25,i%2?0x6a9a58:0x477e57,t);
    }
  }
  for(const desk of Arena.OFFICE_DESKS) workstation(desk.x,desk.y);
  const [meeting,toilet,lounge]=Arena.OFFICE_ROOMS;
  table(meeting.x+4,meeting.y+2.52,2.9,1.25);
  for(const i of [-.88,0,.88]){
    chair(meeting.x+4+i,meeting.y+3.51,0x52766c);
    add(furniture,meeting.x+4+i,.875,meeting.y+2.52,.35,.043,.24,0xf0e9cc);
  }
  add(furniture,meeting.x+4,1.0,meeting.y+.28,2.73,.92,.12,metal);
  add(accents,meeting.x+4,1.05,meeting.y+.35,2.45,.72,.04,0x9dbdb6);
  for(const i of [-.63,0,.63]) add(trim,meeting.x+4+i,1.03,meeting.y+.382,.38,.037,.025,0x466b71);
  for(const i of [1.23,3.27,5.31]){
    const x=toilet.x+i,z=toilet.y+1.33;
    add(furniture,x,.40,z-.22,.69,.79,.46,0xe7e9dd);
    add(furniture,x,.27,z+.21,.65,.51,.61,0xf7f2d9);
    add(furniture,x,.53,z+.18,.55,.047,.46,0x587a84);
    add(furniture,x-.55,.61,z-.05,.08,1.21,1.63,0x749b9c);
  }
  table(toilet.x+6.82,toilet.y+3.62,1.45,.69);
  add(furniture,toilet.x+6.82,.88,toilet.y+3.62,.55,.10,.46,0xe5ebdc);
  add(accents,toilet.x+6.82,1.15,toilet.y+3.39,.13,.32,.09,0xb1c6c2);
  sofa(lounge.x+2.6,lounge.y+1.42);
  table(lounge.x+2.6,lounge.y+3.32,1.45,.78);
  add(furniture,lounge.x+6.35,.62,lounge.y+1.10,1.45,1.22,.74,deskSide);
  add(furniture,lounge.x+6.35,1.43,lounge.y+1.10,.65,.46,.54,monitor);
  add(accents,lounge.x+6.35,1.52,lounge.y+1.38,.19,.10,.04,0x8af2d3);
  for(const [x,z] of [[8.25,8],[17.6,8],[27.4,8],[37,8],[9.2,21.7],[36.7,21.7],[2,17.4],[44,11.5]]) plant(x,z);
  batch(boxGeometry,material(0xffffff),wallBlocks);
  batch(boxGeometry,material(0xffffff),furniture);
  batch(boxGeometry,material(0xffffff),trim);
  batch(boxGeometry,material(0xffffff),accents);

  const rings=palette.map(color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:.82,side:THREE.DoubleSide}));
  const energy=palette.map(color=>new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.66,metalness:.27,roughness:.3,flatShading:true}));
  const cloth=palette.map(color=>material(color,.05,.86));
  const cursorMat=new THREE.MeshBasicMaterial({color:0x96ffa4,transparent:true,opacity:.88,side:THREE.DoubleSide});
  const ringGeo=new THREE.RingGeometry(.48,.54,32).rotateX(-Math.PI/2);
  const targetRing=mesh(ringGeo,cursorMat,world,0,.058,0,1,1,1,false);
  targetRing.visible=false;
  const buildings=new Map();
  function monument(data){
    const group=new THREE.Group();
    group.position.set(data.x,0,data.y);world.add(group);
    const core=data.kind==='core',scale=core?1.65:1;
    group.scale.setScalar(scale);
    mesh(cylinder,darkStone,group,0,.10,0,.94,.20,.94);
    mesh(cylinder,stone,group,0,.29,0,.79,.19,.79);
    mesh(cylinder,bronze,group,0,.41,0,.63,.08,.63);
    const cap=new THREE.Group();group.add(cap);
    mesh(cylinder,darkStone,cap,0,.95,0,.39,1.14,.39);
    mesh(cylinder,stone,cap,0,1.42,0,.61,.24,.61);
    for(let i=0;i<4;i++){
      const angle=i*Math.PI/2+Math.PI/4;
      const x=Math.cos(angle)*.52,z=Math.sin(angle)*.52;
      const pillar=mesh(boxGeometry,stone,cap,x,.98,z,.24,1.05,.32);
      pillar.rotation.y=-angle;
      mesh(crystalGeo,energy[data.team],cap,x,1.65,z,.12,.27,.12);
    }
    const gem=mesh(crystalGeo,energy[data.team],cap,0,core?2.27:2.01,0,core?.5:.36,core?.79:.55,core?.5:.36);
    mesh(ringGeo,rings[data.team],group,0,.036,0,1.48,1,1.48,false);
    buildings.set(data.id,{group,cap,gem});
  }
  for(const data of [...TOWERS,...CORES]) monument(data);

  const heroBody=new THREE.CylinderGeometry(.255,.155,.46,12,3);
  const leather=material(0x453831,.08,.8);
  const steelEdge=material(0xc8c5ac,.58,.37);
  const faceColors=[0xb5805c,0xcc9a78,0x996748].map(color=>material(color,0,.78));
  const hair=material(0x332827,0,.94);
  const bladeGeo=new THREE.BoxGeometry(1,1,1);
  const capeGeo=new THREE.PlaneGeometry(.66,.75,2,4);
  const capeMaterials=palette.map(color=>new THREE.MeshStandardMaterial({color,roughness:.88,flatShading:true,side:THREE.DoubleSide}));
  const limbGeo=new THREE.CapsuleGeometry(.5,1.1,2,6);

  function joint(parent,x,y,z){
    const object=new THREE.Group();
    object.position.set(x,y,z);
    parent.add(object);
    return object;
  }

  const blobGeo=new THREE.CircleGeometry(.49,12).rotateX(-Math.PI/2);
  const blobMat=new THREE.MeshBasicMaterial({color:0x101b23,transparent:true,opacity:.44,depthWrite:false});
  function createHero(team,color){
    const group=new THREE.Group(),rig=joint(group,0,0,0);
    const shadow=mesh(blobGeo,blobMat,group,0,.026,0,1.2,1,.74,false);
    const pelvis=joint(rig,0,.74,0), chest=joint(pelvis,0,.1,0);
    world.add(group);
    const armor=[silver,bronze,stone][color%3];
    const skin=faceColors[color%faceColors.length];
    mesh(ringGeo,rings[team],group,0,.045,0,1.19,1,1.19,false);
    mesh(sphere,charcoal,pelvis,0,.015,0,.22,.14,.152);
    mesh(heroBody,leather,chest,0,.24,0,1,1,.69);
    mesh(sphere,armor,chest,0,.315,.04,.254,.251,.141);
    mesh(sphere,steelEdge,chest,0,.36,.146,.168,.116,.049);
    mesh(crystalGeo,energy[team],chest,0,.31,.19,.047,.088,.03);
    for(let i=0;i<3;i++) mesh(sphere,armor,chest,0,.10+i*.056,.11,.18+i*.014,.036,.079);
    mesh(cylinder,leather,pelvis,0,.088,0,.225,.085,.157);
    mesh(boxGeometry,bronze,pelvis,0,.083,.165,.1,.075,.045);
    mesh(cylinder,skin,chest,0,.532,0,.075,.12,.076);
    const head=joint(chest,0,.62,.018);
    mesh(sphere,skin,head,0,.058,.025,.106,.14,.107);
    mesh(sphere,skin,head,0,.012,.053,.075,.065,.079);
    mesh(sphere,hair,head,0,.125,-.01,.117,.11,.112);
    mesh(sphere,skin,head,0,.055,.126,.024,.039,.037);
    for(const side of [-1,1]){
      mesh(sphere,skin,head,side*.1,.045,.013,.025,.045,.02);
      mesh(sphere,charcoal,head,side*.043,.088,.115,.019,.011,.008);
      mesh(sphere,hair,head,side*.039,.105,.109,.032,.009,.01);
      mesh(sphere,armor,head,side*.095,.041,-.017,.035,.103,.073);
    }
    const crest=mesh(crystalGeo,bronze,head,0,.187,-.024,.067,.11,.035);
    crest.rotation.x=.24;
    const cape=mesh(capeGeo.clone(),capeMaterials[team],chest,0,.46,-.152,1,1,1,false);
    const arms=[],forearms=[],legs=[],shins=[],feet=[];
    for(const side of [-1,1]){
      const arm=joint(chest,side*.26,.415,0);
      const elbow=joint(arm,0,-.264,0);
      arms.push(arm);forearms.push(elbow);
      mesh(limbGeo,leather,arm,0,-.119,0,.143,.142,.145);
      mesh(sphere,armor,arm,side*.035,-.004,-.006,.178,.111,.162);
      mesh(sphere,steelEdge,arm,side*.059,.031,.041,.127,.055,.127);
      mesh(sphere,armor,elbow,0,0,.018,.085,.087,.085);
      mesh(limbGeo,armor,elbow,0,-.127,0,.133,.14,.139);
      mesh(cylinder,bronze,elbow,0,-.204,0,.067,.055,.071);
      mesh(sphere,leather,elbow,0,-.255,.025,.066,.075,.053);
      const leg=joint(pelvis,side*.115,-.035,0),knee=joint(leg,0,-.335,0);
      const foot=joint(knee,0,-.278,0);
      legs.push(leg);shins.push(knee);feet.push(foot);
      mesh(limbGeo,charcoal,leg,0,-.15,0,.17,.16,.171);
      mesh(sphere,armor,leg,side*.045,-.10,.05,.092,.179,.092);
      mesh(sphere,steelEdge,knee,0,.018,.065,.086,.083,.075);
      mesh(limbGeo,armor,knee,0,-.126,0,.134,.144,.141);
      mesh(sphere,leather,foot,0,-.035,.073,.092,.067,.154);
      mesh(sphere,armor,foot,0,-.026,.138,.078,.047,.077);
    }
    const sword=joint(forearms[1],0,-.248,.057);
    const blade=mesh(bladeGeo,steelEdge,sword,0,-.33,0,.072,.52,.026);
    const tip=mesh(crystalGeo,steelEdge,sword,0,-.596,0,.037,.09,.018);
    tip.rotation.y=Math.PI/4;
    mesh(boxGeometry,bronze,sword,0,-.075,0,.22,.05,.057);
    mesh(boxGeometry,energy[team],blade,0,0,.5,.22,.86,.09);
    const ward=mesh(sphere,new THREE.MeshBasicMaterial({color:palette[team],transparent:true,opacity:0,wireframe:true}),
      group,0,.92,0,.88,1.12,.88,false);
    group.traverse(part=>{if(part.isMesh) part.castShadow=false;});
    return {group,shadow,rig,pelvis,chest,arms,forearms,legs,shins,feet,head,cape,sword,ward,heading:null,stride:0,gait:0};
  }

  function createMinion(unit){
    const group=new THREE.Group();
    world.add(group);
    mesh(cone,cloth[unit.team],group,0,.29,0,.245,.53,.245);
    mesh(sphere,darkStone,group,0,.63,.035,.17,.19,.16);
    mesh(boxGeometry,energy[unit.team],group,0,.65,.18,.19,.065,.05);
    const tool=mesh(unit.ranged?cylinder:boxGeometry,bronze,group,.22,.36,.1,.05,.55,.065);
    tool.rotation.z=.25;
    if(unit.ranged) mesh(crystalGeo,energy[unit.team],group,.15,.63,.1,.09,.17,.09);
    group.traverse(part=>{if(part.isMesh) part.castShadow=false;});
    return {group};
  }

  const actors=new Map(), effects=Array.from({length:38},()=>{
    const obj=mesh(crystalGeo,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true}),world,0,0,0,1,1,1,false);
    obj.visible=false;
    return obj;
  });

  const bursts=Array.from({length:8},()=>{
    const burst=mesh(ringGeo,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,depthWrite:false,side:THREE.DoubleSide}),
      world,0,.075,0,1,1,1,false);
    burst.visible=false;
    return burst;
  });
  const eclipse=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({
    color:0x8a4dcc,transparent:true,depthTest:false,depthWrite:false
  }));
  eclipse.frustumCulled=false;
  eclipse.renderOrder=50;
  eclipse.visible=false;
  camera.add(eclipse);
  world.add(camera);

  function fit(){
    if(canvas.clientWidth===width && canvas.clientHeight===height) return;
    width=canvas.clientWidth;
    height=canvas.clientHeight;
    if(width && height){
      const ratio=Math.min(.61,512/width,320/height);
      renderer.setSize(Math.max(1,Math.round(width*ratio)),Math.max(1,Math.round(height*ratio)),false);
    }
  }

  function cameraAt(self,dt,events,time){
    if(self && !entered){
      zoom=1.3;
      selected.set(clamp(self.x,12.8,33.2),0,clamp(self.y,5,24));
      didCenter=true;
      entered=true;
    }
    const aspect=width/Math.max(height,1);
    const view=Math.max(29,50/aspect)/zoom;
    camera.left=-view*aspect/2;camera.right=view*aspect/2;
    camera.top=view/2;camera.bottom=-view/2;
    if(!didCenter || zoom===1){
      selected.copy(center);
      didCenter=true;
    }
    if(zoom>1 && self){
      vector.set(clamp(self.x,12.8,33.2),0,clamp(self.y,5,24));
      selected.lerp(vector,1-Math.exp(-dt*9));
    }
    let shake=0;
    if(self){
      for(const event of events){
        const age=time-event.t;
        if(age<0 || age>330 || (event.id!==self.id && event.kind!=='eclipse')) continue;
        const strength=event.kind==='eclipse'?.31:event.kind==='ultimate'?.21:event.kind==='landing'?.16:event.kind==='punch'?.08:0;
        shake=Math.max(shake,strength*(1-age/330)**2);
      }
    }
    const swayX=Math.sin(time*.091)*shake,swayZ=Math.cos(time*.112)*shake;
    camera.position.set(selected.x-2.8+swayX,35,selected.z+25+swayZ);
    camera.lookAt(selected.x+swayX,.18,selected.z+swayZ);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  const smooth=t=>{const x=clamp(t,0,1);return x*x*(3-2*x);};
  const blend=(joint,x,y,z,weight)=>{
    joint.rotation.x=THREE.MathUtils.lerp(joint.rotation.x,x,weight);
    joint.rotation.y=THREE.MathUtils.lerp(joint.rotation.y,y,weight);
    joint.rotation.z=THREE.MathUtils.lerp(joint.rotation.z,z,weight);
  };
  function orient(model,f,time,dt){
    const {group,shadow,rig,pelvis,chest,arms,forearms,legs,shins,feet,head,cape,sword,ward}=model;
    const heading=Math.atan2(f.dx,f.dy);
    const distance=Math.hypot(f.x-group.position.x,f.y-group.position.z);
    if(model.heading===null || distance>3){
      model.heading=heading;
      model.gait=0;
    }
    group.position.set(f.x,0,f.y);
    model.heading+=Math.atan2(Math.sin(heading-model.heading),Math.cos(heading-model.heading))*(1-Math.exp(-dt*16));
    group.rotation.y=model.heading;
    group.scale.setScalar(1.21);
    model.gait=THREE.MathUtils.lerp(model.gait,f.moving?1:0,1-Math.exp(-dt*13));
    if(distance<3) model.stride+=distance*5.25;
    const gait=model.gait, phase=model.stride, wave=Math.sin(phase), breath=Math.sin(time/455+f.color);
    const airborne=Arena.heightAt(f,time);
    shadow.scale.set(1.2+airborne*.25,1,.74+airborne*.18);
    rig.position.set(0,airborne,0);
    rig.rotation.set(0,0,0);
    pelvis.position.y=.74+.024*Math.cos(phase*2)*gait+.009*breath;
    pelvis.rotation.set(0,.105*wave*gait,.048*wave*gait);
    chest.rotation.set(.14*gait+.028*breath,-.22*wave*gait,-.045*wave*gait);
    head.rotation.set(-.08*gait,.09*wave*gait,.012*breath);
    sword.rotation.set(-.36,0,-.18);
    for(let i=0;i<2;i++){
      const side=i===0?-1:1;
      const swing=wave*gait*side;
      arms[i].rotation.set(-.18+swing*.74,0,side*-.21);
      forearms[i].rotation.set(-.34-Math.max(swing,0)*.49,0,0);
      legs[i].rotation.set(-swing*.76,0,side*.055);
      shins[i].rotation.x=.1+Math.max(swing,0)*1.15;
      feet[i].rotation.x=-shins[i].rotation.x*.55;
    }
    const elapsed=Math.max(0,time-f.actionAt);
    const move=Arena.ACTIONS[f.action];
    const windup=move?.strike ? move.strike*(f.action==='kick'?.47:.62) : 0;
    const prepare=windup && elapsed<move.strike ?
      smooth(elapsed/windup)*smooth((move.strike-elapsed)/(move.strike-windup)) : 0;
    const follow=move?.strike ? (elapsed<=move.strike ?
      smooth((elapsed-windup)/(move.strike-windup)) :
      1-smooth((elapsed-move.strike)/(move.duration-move.strike))) : 0;
    switch(f.action){
      case 'punch':
        pelvis.rotation.y+=-.42*prepare+.55*follow;
        pelvis.position.y-=.11*(prepare+follow*.5);
        blend(chest,.34*follow,.65*follow-.88*prepare,-.22*follow,1);
        blend(arms[1],.62*prepare-1.64*follow,.34*prepare-.14*follow,-.24-.25*prepare,Math.max(prepare,follow));
        blend(forearms[1],-.42-1.33*prepare+.34*follow,0,0,Math.max(prepare,follow));
        blend(arms[0],-1.15,0,.5,follow);
        blend(legs[0],-.48,0,-.13,prepare+follow*.6);
        blend(shins[0],.64,0,0,prepare+follow*.6);
        sword.rotation.x=-.36-.75*follow;
        break;
      case 'kick':{
        const land=smooth((elapsed-570)/84)*smooth((move.duration-elapsed)/120);
        pelvis.rotation.y+=.98*follow-.59*prepare;
        pelvis.position.y-=.22*prepare+.23*land;
        blend(chest,-.53*follow+.4*prepare+.45*land,-.35*follow,.35*follow,Math.min(1,prepare+follow+land));
        blend(legs[1],-1.31*prepare-1.88*follow-.4*land,.29*follow,.49*follow,Math.min(1,prepare+follow+land));
        blend(shins[1],.1+1.55*prepare+.76*land,0,0,Math.min(1,prepare+follow+land));
        blend(legs[0],-.82,0,-.2,Math.max(follow,land));
        blend(shins[0],1.62,0,0,follow+.39*land);
        blend(arms[0],-1.34,0,1.1,follow);
        blend(arms[1],.55,0,-1.03,follow);
        break;
      }
      case 'voice':
        blend(chest,.39*follow-.36*prepare,-.56*follow,.09,Math.max(prepare,follow));
        blend(head,.22*follow-.42*prepare,0,0,Math.max(prepare,follow));
        blend(arms[0],.47*prepare-1.46*follow,.29,.37+.55*follow,Math.max(prepare,follow));
        blend(forearms[0],-.4-1.45*prepare-.34*follow,0,0,Math.max(prepare,follow));
        break;
      case 'ultimate':
        pelvis.position.y-=.2*prepare+.065*follow;
        blend(chest,.55*prepare-.36*follow,-.29*prepare,.14*prepare,Math.max(prepare,follow));
        for(let i=0;i<2;i++){
          const side=i===0?1:-1;
          blend(arms[i],-.82*prepare-2.62*follow,0,side*(.43+1.02*follow),Math.max(prepare,follow));
          blend(forearms[i],-1.55*prepare-.24*follow,0,0,Math.max(prepare,follow));
          blend(legs[i],-.46,0,side*-.19,prepare);
          blend(shins[i],.76,0,0,prepare);
        }
        break;
      case 'hurt':{
        const recoil=Math.sin(clamp(elapsed/210,0,1)*Math.PI);
        chest.rotation.x-=recoil*.63;
        pelvis.position.y-=recoil*.13;
        blend(arms[0],.51,0,.7,recoil);
        blend(arms[1],.28,0,-.64,recoil);
        break;
      }
      case 'ko':{
        const falling=clamp(elapsed/465,0,1);
        const fallen=falling*falling;
        rig.rotation.x=-1.56*fallen;
        rig.position.y=.14*fallen;
        pelvis.position.y-=.29*Math.sin(falling*Math.PI);
        blend(arms[0],-.28,0,.92,fallen);
        blend(arms[1],-.18,0,-.77,fallen);
        break;
      }
    }
    ward.visible=f.shield>0;
    ward.material.opacity=ward.visible?.14+.035*Math.sin(time/110):0;
    const fabric=cape.geometry.attributes.position,rest=capeGeo.attributes.position;
    for(let i=0;i<fabric.count;i++){
      const x=rest.getX(i),y=rest.getY(i)-.36, edge=clamp(-y/.74,0,1);
      fabric.setXYZ(i,x*(.89+edge*.17),y,-edge*(.11+.28*gait)+edge*edge*Math.sin(time/138+x*9+edge*3+f.color)*.065);
    }
    fabric.needsUpdate=true;

  }

  const sparkCount=448;
  const sparks=new THREE.InstancedMesh(boxGeometry,new THREE.MeshBasicMaterial({color:0xffffff}),sparkCount);
  sparks.frustumCulled=false;
  sparks.count=0;
  world.add(sparks);
  const spark=new THREE.Object3D(),sparkTint=new THREE.Color();
  let sparkIndex=0;
  function pixel(x,y,z,sx,sy,sz,yaw,color){
    if(sparkIndex>=sparkCount) return;
    spark.position.set(x,y,z);
    spark.scale.set(sx,sy,sz);
    spark.rotation.set(0,yaw,0);
    spark.updateMatrix();
    sparks.setMatrixAt(sparkIndex,spark.matrix);
    sparks.setColorAt(sparkIndex++,sparkTint.setHex(color));
  }

  function slash(event,t){
    const heading=Math.atan2(event.dx,event.dy);
    for(let i=0;i<18;i++){
      const angle=heading-.98+i*.115+(t-.25)*.65;
      const radius=.88+i*.067+t*.42;
      const size=(1-t)*(.09+i*.014);
      const x=event.x+Math.sin(angle)*radius,z=event.y+Math.cos(angle)*radius;
      const y=.78+Math.sin(i/17*Math.PI)*.92;
      pixel(x,y,z,size*.73,size,.20+size,angle,i>12?0xfff7b8:i%2?0xffaa4d:0xffe071);
      pixel(x,y-.23,z,size*.7,size*.6,size*.7,angle,0xff762c);
    }
  }

  function resonance(event,t){
    const heading=Math.atan2(event.dx,event.dy);
    for(let wave=0;wave<3;wave++){
      const stage=t*1.55-wave*.22;
      if(stage<=0 || stage>=1) continue;
      const reach=.57+stage*3.8;
      for(let i=0;i<11;i++){
        const angle=heading-.69+i*.138;
        const x=event.x+Math.sin(angle)*reach,z=event.y+Math.cos(angle)*reach;
        const y=.95+Math.cos((i-5)*.31)*.49;
        pixel(x,y,z,.16,.14+(1-stage)*.36,.17,angle,i%3===0?0xf9d7ff:wave%2?0x8d91ff:0xd56cff);
      }
    }
  }

  function comet(event,t){
    for(let i=0;i<23;i++){
      const along=(i-10)*.12+(t*1.75);
      const across=Math.sin(i*2.72)*(.17+t*.54);
      const x=event.x+event.dx*along+event.dy*across,z=event.y+event.dy*along-event.dx*across;
      const y=.10+(i%5)*.235+Math.sin(t*Math.PI)*.52;
      const size=(1-t)*(.09+i%4*.05);
      pixel(x,y,z,size,.09+size*.4,.54+size,Math.atan2(event.dx,event.dy),i%5===0?0xf6fcff:i%2?0x54fff1:0x37a5ff);
    }
  }

  function eruption(event,t){
    const global=event.kind==='eclipse';
    const radius=event.radius || 24;
    const count=global?32:24;
    for(let i=0;i<count;i++){
      const angle=i/count*Math.PI*2+t*.19;
      const reach=radius*(.25+Math.sqrt(t)*.78)*(i%2?.82:1);
      const x=event.x+Math.sin(angle)*reach,z=event.y+Math.cos(angle)*reach;
      const height=(1-t)*(i%3===0?1.55:.59)*(global?1.9:1);
      pixel(x,height*.52+.07,z,.20+height*.09,height,.20,angle,global?(i%2?0xca65ff:0xffbbff):(i%2?palette[event.team]:0xffe2a0));
      if(i%3===0) pixel(x,height+.34+t*.46,z,.21,.24,.21,angle+t*2,global?0xffe3ff:0xffffff);
    }
  }

  function landing(event,t){
    for(let i=0;i<13;i++){
      const angle=i/13*Math.PI*2;
      const radius=.20+t*1.8;
      const x=event.x+Math.sin(angle)*radius,z=event.y+Math.cos(angle)*radius;
      const size=.13+(1-t)*.15;
      pixel(x,.06+Math.sin(t*Math.PI)*.68,z,size,size*.69,size,angle+t*3,i%3?0xb9a078:0xecd7ae);
    }
  }

  const skillEffects={punch:slash,voice:resonance,kick:comet,landing,ultimate:eruption,eclipse:eruption};
  function animatePixels(events,time){
    sparkIndex=0;
    for(const event of events){
      if(!Object.hasOwn(skillEffects,event.kind)) continue;
      const elapsed=time-event.t;
      const duration=event.kind==='eclipse'?680:event.kind==='voice'?540:490;
      if(elapsed<0 || elapsed>=duration) continue;
      skillEffects[event.kind](event,elapsed/duration);
    }
    sparks.count=sparkIndex;
    sparks.instanceMatrix.needsUpdate=true;
    if(sparks.instanceColor) sparks.instanceColor.needsUpdate=true;
  }

  function render(state,time,hero,dt){
    fit();
    if(!width || !height) return;
    cameraAt(hero,dt,state.events,time);
    const living=new Set();
    for(const f of [...state.players,...state.units]){
      living.add(f.id);
      let model=actors.get(f.id);
      if(!model){
        model=f.kind==='hero'?createHero(f.team,f.color):createMinion(f);
        actors.set(f.id,model);
      }
      if(f.kind==='hero') orient(model,f,time,dt);
      else {
        model.group.position.set(f.x,f.moving?Math.abs(Math.sin(time/96))*.065:0,f.y);
        const yaw=Math.atan2(f.dx,f.dy);
        const old=model.group.rotation.y;
        model.group.rotation.y+=Math.atan2(Math.sin(yaw-old),Math.cos(yaw-old))*(1-Math.exp(-dt*15));
      }
    }
    for(const [id,model] of actors){
      if(living.has(id)) continue;
      if(model.ward){
        model.ward.material.dispose();
        model.cape.geometry.dispose();
      }
      model.group.removeFromParent();
      actors.delete(id);
    }
    for(const f of state.structures){
      const model=buildings.get(f.id);
      model.cap.visible=f.hp>0;
      model.gem.rotation.y=time/1250;
      model.gem.position.y=(f.kind==='core'?2.27:2.01)+Math.sin(time/260)*.09;
    }
    targetRing.visible=Boolean(hero?.target);
    if(hero?.target){
      targetRing.position.set(hero.target.x,.058,hero.target.y);
      targetRing.scale.setScalar(.76+Math.sin(time/110)*.18);
    }
    bursts.forEach(burst=>{burst.visible=false;});
    const ultimates=state.events.filter(e=>e.kind==='ultimate' || e.kind==='eclipse').slice(-bursts.length);
    eclipse.visible=false;
    eclipse.material.opacity=0;
    for(const [i,event] of ultimates.entries()){
      const elapsed=time-event.t;
      if(elapsed<0 || elapsed>680) continue;
      const progress=elapsed/680;
      if(event.kind==='eclipse'){
        eclipse.visible=true;
        eclipse.position.set(0,0,-1);
        eclipse.scale.set((camera.right-camera.left)/2,(camera.top-camera.bottom)/2,1);
        eclipse.material.opacity=Math.max(eclipse.material.opacity,.54*(1-progress));
      }
      const burst=bursts[i];
      burst.visible=true;
      burst.position.set(event.x,.075,event.y);
      burst.scale.setScalar((.28+.72*Math.sqrt(progress))*(event.radius || 25)/.53);
      burst.material.opacity=(1-progress)*.84;
      burst.material.color.setHex(event.kind==='eclipse'?0xcf8cff:palette[event.team]);
    }
    effects.forEach(obj=>{obj.visible=false;});
    state.events.filter(e=>!Object.hasOwn(skillEffects,e.kind)).slice(-effects.length).forEach((event,i)=>{
      const age=time-event.t;
      if(age<0 || age>540) return;
      const obj=effects[i],bolt=event.kind==='bolt';
      const t=Math.min(1,age/260);
      obj.visible=true;
      obj.material.color.setHex(event.kind==='guard'||event.kind==='shield'?0xa5eeff:palette[event.team]);
      obj.material.opacity=1-age/570;
      obj.position.set(bolt?THREE.MathUtils.lerp(event.fromX,event.x,t):event.x,
        bolt?THREE.MathUtils.lerp(1.65,.58,t):.67+age/500,
        bolt?THREE.MathUtils.lerp(event.fromY,event.y,t):event.y);
      const size=bolt?.16:.19+age/1650;
      obj.scale.set(size,size*(bolt?1.3:1.8),size);
      obj.rotation.y=age/100;
    });
    animatePixels(state.events,time);
    renderer.render(world,camera);
  }

  function project(x,y,z=0){
    vector.set(x,z,y).project(camera);
    return [(vector.x+1)*width/2,(1-vector.y)*height/2];
  }

  function point(clientX,clientY){
    const rect=canvas.getBoundingClientRect();
    cursor.set((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1);
    raycaster.setFromCamera(cursor,camera);
    const result=raycaster.ray.intersectPlane(floorPlane,vector);
    return result ? {x:result.x,y:result.z} : null;
  }

  const minimap=document.getElementById('minimap');
  const mini=minimap.getContext('2d');
  function drawMap(state,self){
    const w=minimap.width,h=minimap.height;
    mini.drawImage(art,0,0,w,h);
    mini.fillStyle='#05101348';mini.fillRect(0,0,w,h);
    for(const u of [...state.units,...state.structures,...state.players]){
      if(!u.hp) continue;
      const x=u.x/FLOOR.w*w,y=u.y/FLOOR.h*h;
      mini.fillStyle=u.id===self?'#fff2a8':u.team?'#ff6358':'#65d5ff';
      const size=u.kind==='core'?7:u.kind==='tower'?5:u.kind==='hero'?4:2;
      mini.fillRect(x-size/2,y-size/2,size,size);
    }
  }

  return {render,project,point,drawMap,zoom(delta){zoom=clamp(zoom+delta,1,2.1);},faction};
}

window.Rift={create};
})();

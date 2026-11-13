(function(){
'use strict';

const {FLOOR,LANES,CLIFFS,BASES,TOWERS,CORES}=Arena;
const palette=[0x59d9ff,0xff655b];
const faction=['碧蓝','赤焰'];
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

function create(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1,1.6));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.38;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const world=new THREE.Scene();
  world.background=new THREE.Color(0x102724);
  world.fog=new THREE.FogExp2(0x254744,.0105);
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
  sun.shadow.mapSize.set(2048,2048);
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
    art.width=1536;
    art.height=968;
    const c=art.getContext('2d');
    c.scale(art.width/FLOOR.w,art.height/FLOOR.h);
    c.fillStyle='#45583a';
    c.fillRect(0,0,FLOOR.w,FLOOR.h);
    for(let i=0;i<7400;i++){
      const x=random()*46,y=random()*29,r=random()*.46+.045;
      c.fillStyle=['#52613e8e','#343f2d72','#7b784b49','#3148375c','#6e8d5352'][i%5];
      c.beginPath(); c.ellipse(x,y,r,r*.48,random()*6.28,0,6.29); c.fill();
    }
    function trace(points){
      c.beginPath();
      points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));
    }
    const river=[{x:22,y:-2},{x:22.8,y:5},{x:21.8,y:9},{x:23.2,y:14.5},{x:24,y:20},{x:22.9,y:25},{x:24,y:31}];
    c.lineJoin='round';
    for(const [color,width] of [['#4a5a4b',5.4],['#65816b',4.6],['#3b6666',3.9],['#285762',3.35],['#356c73',2.75]]){
      trace(river); c.lineWidth=width;c.strokeStyle=color;c.stroke();
    }
    for(let i=0;i<240;i++){
      const y=random()*29,x=22.4+y*.045+(random()-.5)*2.9;
      c.strokeStyle=i%3===0?'#b0ddd455':'#65a6a655'; c.lineWidth=.032;
      c.beginPath(); c.moveTo(x,y); c.quadraticCurveTo(x+.3,y+.1,x+.52,y-.012);c.stroke();
    }
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
    texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    return {texture,art};
  }

  const {texture,art}=groundTexture();
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(FLOOR.w,FLOOR.h),
    new THREE.MeshStandardMaterial({map:texture,roughness:.94}));
  floor.rotation.x=-Math.PI/2;
  floor.position.copy(center);
  floor.receiveShadow=true;
  world.add(floor);
  const border=new THREE.Mesh(new THREE.BoxGeometry(68,.3,53),new THREE.MeshStandardMaterial({color:0x344b39,roughness:1}));
  border.position.set(center.x,-.2,center.z);border.receiveShadow=true;world.add(border);

  const material=(color,metalness=0,roughness=.75)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
  const stone=material(0x63716a), darkStone=material(0x35463f), bronze=material(0xa5874f,.5,.44);
  const charcoal=material(0x273036,.32,.66), silver=material(0xa6b3a9,.48,.45), wood=material(0x503e2c);
  const rockGeometry=new THREE.DodecahedronGeometry(1,0);
  const boxGeometry=new THREE.BoxGeometry(1,1,1);
  const sphere=new THREE.SphereGeometry(1,12,8);
  const crystalGeo=new THREE.OctahedronGeometry(1,0);
  const cylinder=new THREE.CylinderGeometry(1,1,1,10);
  const cone=new THREE.ConeGeometry(1,1,8);
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

  const rocks=[], grass=[], trunks=[], crowns=[], tufts=[], flowers=[];
  for(const [x,y,w,d] of CLIFFS){
    for(let i=0;i<16;i++){
      const top=i>7;
      const px=x+.42+random()*(w-.84),pz=y+.33+random()*(d-.66);
      const size=.6+random()*.78;
      rocks.push([px,top?1.25:.56,pz,size*(1.4+random()*.3),size*(top?.83:1.3),size*1.08,
        random()*Math.PI,[0x52635a,0x69776a,0x748279,0x475951][i%4]]);
    }
    for(let i=0;i<10;i++){
      const px=x+random()*w,pz=y+random()*d;
      grass.push([px,1.36+random()*.26,pz,.45,.3,.51,random()*6,0x607c48]);
    }
  }
  const terrainClear=(x,z)=>LANES.every(lane=>lane.slice(1).every((p,i)=>{
    const a=lane[i],vx=p.x-a.x,vz=p.y-a.y;
    const t=clamp(((x-a.x)*vx+(z-a.y)*vz)/(vx*vx+vz*vz),0,1);
    return Math.hypot(x-a.x-vx*t,z-a.y-vz*t)>2.05;
  }));
  for(let i=0;i<300;i++){
    const x=-1+random()*48,z=-1+random()*31;
    if(!terrainClear(x,z) || Math.abs(x-23)<2.15 || BASES.some(b=>Math.hypot(x-b.x,z-b.y)<3.5)) continue;
    const h=1.1+random()*1.95,w=.52+random()*.72;
    const hue=[0x395844,0x45664a,0x566f47,0x2c5145,0x688153][i%5];
    trunks.push([x,h*.37,z,.15,h*.76,.15,0]);
    crowns.push([x,h*.79,z,w,h*.94,w,random()*6,hue],
      [x+.22,h*1.14,z-.12,w*.68,h*.7,w*.69,random()*6,hue]);
  }
  for(let i=0;i<540;i++){
    const x=random()*46,z=random()*29;
    if(!terrainClear(x,z) || Math.abs(x-23)<1.75) continue;
    const size=.12+random()*.25;
    tufts.push([x,size*.37,z,size*.35,size,size*.29,random()*6,[0x719053,0x748c4d,0x426c4a][i%3]]);
    if(i%13===0) flowers.push([x,size*.85,z,.09,.08,.09,0,i%2?0xdcb97d:0x9eb2de]);
  }
  batch(rockGeometry,material(0xffffff),rocks);
  batch(rockGeometry,material(0xffffff),grass);
  batch(cylinder,wood,trunks);
  batch(cone,material(0xffffff),crowns);
  batch(cone,material(0xffffff),tufts,false);
  batch(crystalGeo,material(0xffffff),flowers,false);

  const ripples=[];
  for(let i=0;i<28;i++){
    const z=random()*29,x=22.9+(random()-.5)*2.55;
    if(!terrainClear(x,z)) continue;
    ripples.push({x,z,phase:random()*Math.PI*2});
  }
  const foamMaterial=new THREE.MeshBasicMaterial({color:0xa4ded7,transparent:true,opacity:.36,depthWrite:false});
  const rippleGeometry=new THREE.PlaneGeometry(.63,.045).rotateX(-Math.PI/2);
  const waterDetail=new THREE.InstancedMesh(rippleGeometry,foamMaterial,ripples.length);
  world.add(waterDetail);
  const waveTransform=new THREE.Object3D();
  waterDetail.frustumCulled=false;

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

  function createHero(team,color){
    const group=new THREE.Group(), rig=new THREE.Group();group.add(rig);world.add(group);
    const armor=[silver,bronze,stone][color%3];
    mesh(ringGeo,rings[team],group,0,.045,0,1.19,1,1.19,false);
    const torso=mesh(new THREE.CylinderGeometry(.33,.23,.64,7),charcoal,rig,0,1.12,0);
    torso.rotation.y=Math.PI/7;
    mesh(boxGeometry,armor,rig,0,1.24,.17,.50,.37,.18);
    mesh(boxGeometry,bronze,rig,0,.8,.09,.46,.125,.37);
    const cape=mesh(boxGeometry,cloth[team],rig,0,1.01,-.25,.62,.88,.074);
    const head=mesh(sphere,armor,rig,0,1.68,.055,.245,.25,.23);
    mesh(boxGeometry,charcoal,rig,0,1.69,.247,.36,.105,.09);
    mesh(boxGeometry,energy[team],rig,0,1.695,.297,.24,.043,.018);
    const arms=[],legs=[];
    for(const side of [-1,1]){
      const arm=new THREE.Group();arm.position.set(side*.34,1.34,0);rig.add(arm);arms.push(arm);
      mesh(sphere,armor,arm,0,0,0,.24,.17,.24);
      mesh(boxGeometry,charcoal,arm,0,-.24,0,.19,.34,.2);
      mesh(boxGeometry,armor,arm,0,-.39,.01,.23,.22,.24);
      const leg=new THREE.Group();leg.position.set(side*.16,.77,0);rig.add(leg);legs.push(leg);
      mesh(boxGeometry,charcoal,leg,0,-.25,0,.245,.53,.26);
      mesh(boxGeometry,armor,leg,0,-.47,.055,.22,.27,.27);
      mesh(boxGeometry,charcoal,leg,0,-.66,.08,.25,.18,.41);
    }
    const blade=mesh(crystalGeo,silver,arms[1],.02,-.69,.13,.10,.59,.05);
    blade.rotation.x=-.2;
    mesh(boxGeometry,bronze,arms[1],.02,-.44,.13,.34,.07,.12);
    const ward=mesh(sphere,new THREE.MeshBasicMaterial({color:palette[team],transparent:true,opacity:.19,wireframe:true}),
      group,0,.92,0,.88,1.12,.88,false);
    return {group,rig,arms,legs,cape,head,ward};
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
    return {group};
  }

  const actors=new Map(), effects=Array.from({length:38},()=>{
    const obj=mesh(crystalGeo,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true}),world,0,0,0,1,1,1,false);
    obj.visible=false;
    return obj;
  });

  function fit(){
    if(canvas.clientWidth===width && canvas.clientHeight===height) return;
    width=canvas.clientWidth;
    height=canvas.clientHeight;
    if(width && height) renderer.setSize(width,height,false);
  }

  function cameraAt(self){
    if(self && !entered){
      zoom=1.5;
      selected.set(clamp(self.x,7,39),0,clamp(self.y,5,24));
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
      vector.set(clamp(self.x,7,39),0,clamp(self.y,5,24));
      selected.lerp(vector,.12);
    }
    camera.position.set(selected.x-2.8,35,selected.z+25);
    camera.lookAt(selected.x,.18,selected.z);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  function orient(model,f,time){
    const {group,rig,arms,legs,cape,ward}=model;
    group.position.set(f.x,0,f.y);
    group.rotation.y=Math.atan2(f.dx,f.dy);
    group.scale.setScalar(1.12);
    const elapsed=Math.max(0,time-f.actionAt);
    const move=Arena.ACTIONS[f.action];
    const phase=move ? clamp(elapsed/move.duration,0,1) : 0;
    const attack=move?.strike ? Math.sin(Math.PI*clamp(elapsed/Math.min(move.duration,move.strike*2.3),0,1)) : 0;
    const walk=f.moving ? Math.sin(time/81+f.color) : 0;
    rig.position.set(0,Arena.heightAt(f,time),0);
    rig.rotation.set(0,0,0);
    arms[0].rotation.set(-walk*.49,0,.17);
    arms[1].rotation.set(walk*.49-.2,0,-.17);
    legs[0].rotation.x=walk*.62;legs[1].rotation.x=-walk*.62;
    cape.rotation.x=.17+Math.sin(time/170+f.color)*.06+Math.abs(walk)*.2;
    ward.visible=f.action==='guard';
    if(f.action==='slap'){ arms[1].rotation.x=-1.22*attack; arms[1].rotation.z=-.2-1.25*attack; rig.rotation.y=-.8*attack; }
    if(f.action==='punch'){ arms[1].rotation.x=-1.94*attack;rig.rotation.x=.21*attack; }
    if(f.action==='kick'){ legs[1].rotation.x=-1.83*attack;rig.rotation.x=-.24*attack; }
    if(f.action==='voice'){ arms[0].rotation.x=-1.62*attack; rig.rotation.x=.16*attack; }
    if(f.action==='jump'){ arms[0].rotation.x=-1.08; arms[1].rotation.x=-1.1; legs[0].rotation.x=-.85;legs[1].rotation.x=.52; }
    if(f.action==='guard'){ arms[0].rotation.x=-1.7;arms[1].rotation.x=-1.8; }
    if(f.action==='bow'){
      const bow=Math.sin(Math.PI*phase);
      rig.position.y=-.54*bow;rig.rotation.x=.8*bow;
      legs[0].rotation.x=-.96*bow;legs[1].rotation.x=-.96*bow;
    }
    if(f.action==='hurt') rig.rotation.x=-.24;
    if(f.action==='ko'){ rig.rotation.x=-Math.PI/2;rig.position.y=.14; }
  }

  function render(state,time,hero){
    fit();
    if(!width || !height) return;
    cameraAt(hero);
    const living=new Set();
    for(const f of [...state.players,...state.units]){
      living.add(f.id);
      let model=actors.get(f.id);
      if(!model){
        model=f.kind==='hero'?createHero(f.team,f.color):createMinion(f);
        actors.set(f.id,model);
      }
      if(f.kind==='hero') orient(model,f,time);
      else {
        model.group.position.set(f.x,f.moving?Math.abs(Math.sin(time/96))*.065:0,f.y);
        model.group.rotation.y=Math.atan2(f.dx,f.dy);
      }
    }
    for(const [id,model] of actors){
      if(living.has(id)) continue;
      if(model.ward) model.ward.material.dispose();
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
    effects.forEach(obj=>{obj.visible=false;});
    state.events.slice(-effects.length).forEach((event,i)=>{
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
    ripples.forEach(({x,z,phase},i)=>{
      const drift=time/1500+phase;
      waveTransform.position.set(x+Math.sin(drift)*.26,.019,z+Math.cos(drift)*.27);
      waveTransform.scale.set(.66+(Math.sin(drift)*.5+.5)*.7,1,1);
      waveTransform.rotation.y=Math.sin(phase)*.23;
      waveTransform.updateMatrix();
      waterDetail.setMatrixAt(i,waveTransform.matrix);
    });
    waterDetail.instanceMatrix.needsUpdate=true;
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

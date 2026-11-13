(function(){
'use strict';

const {FLOOR,OFFICE_ROOMS}=Arena;
const palette=[0x59d9ff,0xff655b];
const faction=['蓝队','红队'];
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

function create(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(1);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.03;
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

  world.add(new THREE.HemisphereLight(0xe3edf2,0x514641,1.53));
  const sun=new THREE.DirectionalLight(0xffead3,2.21);
  sun.position.set(13,36,3);
  sun.target.position.copy(center);
  sun.castShadow=true;
  sun.shadow.mapSize.set(1536,1536);
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
    art.width=1840;
    art.height=1160;
    const c=art.getContext('2d');
    c.scale(art.width/FLOOR.w,art.height/FLOOR.h);
    c.fillStyle='#c0b8a7';
    c.fillRect(0,0,FLOOR.w,FLOOR.h);
    for(let y=0;y<FLOOR.h;y+=.84){
      for(let x=0;x<FLOOR.w;x+=1.04){
        c.fillStyle=['#c4baaa','#beb6a7','#c8bfaf','#b7b0a2'][Math.floor(random()*4)];
        c.fillRect(x+.017,y+.014,1.005,.811);
        c.fillStyle='#eee2c643';
        c.fillRect(x+.045,y+.032,.95,.018);
      }
    }
    const carpet=(x,y,w,d,color)=>{
      c.fillStyle=color;
      c.fillRect(x,y,w,d);
      for(let gy=y;gy<y+d;gy+=.45){
        for(let gx=x;gx<x+w;gx+=.47){
          c.fillStyle=random()>.5?'#9aa3a42c':'#142b3826';
          c.fillRect(gx,gy,Math.min(.455,x+w-gx),Math.min(.432,y+d-gy));
        }
      }
    };
    carpet(7.8,17,31,7.6,'#607581');
    c.strokeStyle='#d5cdb0';
    c.lineWidth=.10;
    c.strokeRect(7.87,17.07,30.86,7.46);
    c.fillStyle='#879499';
    c.fillRect(1.5,13.25,5.6,3.8);
    c.fillStyle='#ac8e88';
    c.fillRect(38.9,13.25,5.6,3.8);
    for(const room of OFFICE_ROOMS){
      if(room.name==='会议室'){
        carpet(room.x,room.y,room.w,room.d,room.color);
        continue;
      }
      c.fillStyle=room.color;
      c.fillRect(room.x,room.y,room.w,room.d);
      for(let y=0;y<room.d;y+=.52){
        const tiles=room.name==='厕所';
        const step=tiles?.54:1.28;
        for(let x=tiles?0:-y%1.28;x<room.w;x+=step){
          const left=Math.max(0,x),right=Math.min(room.w,x+step);
          c.fillStyle=(tiles?['#aebcb9','#bac7c3','#c0c7b9']:['#a88e72','#b39a7e','#ad9275'])[Math.floor(random()*3)];
          c.fillRect(room.x+left+.016,room.y+y+.013,Math.max(0,right-left-.033),Math.min(.49,room.d-y));
          if(!tiles){
            c.fillStyle='#ecd3a63b';
            c.fillRect(room.x+left+.04,room.y+y+.13,Math.max(0,(right-left)*.73),.016);
          }
        }
      }
    }
    for(let i=0;i<8500;i++){
      const x=random()*FLOOR.w,y=random()*FLOOR.h;
      c.fillStyle=i%3?'#fff2d513':'#26344117';
      c.fillRect(x,y,.018+random()*.034,.017);
    }
    const texture=new THREE.CanvasTexture(art);
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.magFilter=THREE.NearestFilter;
    texture.minFilter=THREE.LinearMipmapLinearFilter;
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
  const bronze=material(0xa5874f,.25,.57);
  const charcoal=material(0x27323e,0,.81);
  const boxGeometry=new THREE.BoxGeometry(1,1,1);
  const sphere=new THREE.SphereGeometry(1,8,6);
  const crystalGeo=new THREE.OctahedronGeometry(1,0);
  const cylinder=new THREE.CylinderGeometry(1,1,1,10);
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
  const glass=[];
  for(let x=2.4;x<44;x+=3.6){
    add(wallBlocks,x,.55,.6,3.59,1.1,.21,0xb2b8b0);
    add(glass,x,1.57,.61,3.30,.86,.09,0x7ca7b0);
    add(trim,x,1.11,.66,3.52,.11,.20,0xd5dcd5);
    add(trim,x,2.05,.62,3.58,.16,.21,0xc3c9bd);
    add(trim,x+1.73,1.57,.65,.10,.87,.12,0xd6dcd4);
    add(trim,x-.94,1.80,.67,.88,.036,.05,0x9fc4c7);
    add(trim,x-.68,1.67,.67,.79,.033,.05,0x9fc4c7);
  }
  for(const side of [0.73,45.27]){
    add(wallBlocks,side,.43,14.7,.21,.86,28.1,0xa7b5b5);
    add(trim,side,.87,14.7,.25,.07,28.12,0xe1ddcb);
  }
  for(const [x,z] of [[3,8.6],[6.25,9.3],[42.1,7.65],[40.1,10.2],[4,20.6],[42.1,21.7],[4,24.4],[41.2,24.6]]){
    add(furniture,x,.46,z,1.53,.91,.65,0x737f7c);
    add(trim,x,.92,z,1.56,.056,.68,0xb4b4a0);
    for(let i=0;i<3;i++){
      add(furniture,x,.20+i*.243,z+.337,1.37,.21,.045,0x9daca7);
      add(trim,x,.21+i*.243,z+.37,.36,.028,.029,0x4b6062);
    }
  }
  for(const [x,z] of [[8,4.2],[38.4,4.2],[6.2,26.1],[39.6,26.1]]){
    table(x,z,1.44,.85);
    add(furniture,x,.89,z,.85,.07,.51,0xdee0cb);
    add(furniture,x,.99,z,.71,.16,.44,0xb7c4b9);
    add(trim,x,.974,z+.24,.48,.037,.034,0x53646a);
    add(accents,x+.24,1.079,z-.105,.07,.023,.09,0x82bc97);
  }
  batch(boxGeometry,material(0xffffff),glass);
  batch(boxGeometry,material(0xffffff),wallBlocks);
  batch(boxGeometry,material(0xffffff),furniture);
  batch(boxGeometry,material(0xffffff),trim);
  batch(boxGeometry,material(0xffffff),accents);

  const rings=palette.map(color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:.82,side:THREE.DoubleSide}));
  const cursorMat=new THREE.MeshBasicMaterial({color:0x96ffa4,transparent:true,opacity:.88,side:THREE.DoubleSide});
  const ringGeo=new THREE.RingGeometry(.48,.54,32).rotateX(-Math.PI/2);
  const targetRing=mesh(ringGeo,cursorMat,world,0,.058,0,1,1,1,false);
  targetRing.visible=false;
  const heroBody=new THREE.CylinderGeometry(.255,.155,.46,12,3);
  const leather=material(0x453831,.08,.8);
  const shirt=material(0xe4d7c4,0,.82);
  const jackets=[0x476a80,0x9d5d5b,0x638487,0x90734e,0x5d638c,0x60735f,0x855f78,0x807f6a,0x576578,0x745b55]
    .map(color=>material(color,0,.83));
  const ties=palette.map(color=>material(color,0,.84));
  const faceColors=[0xb5805c,0xcc9a78,0x996748].map(color=>material(color,0,.78));
  const hair=material(0x332827,0,.94);
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
    const jacket=jackets[color%jackets.length];
    const skin=faceColors[color%faceColors.length];
    mesh(ringGeo,rings[team],group,0,.045,0,1.19,1,1.19,false);
    mesh(sphere,charcoal,pelvis,0,.015,0,.22,.14,.152);
    mesh(heroBody,jacket,chest,0,.24,0,1,1,.69);
    mesh(boxGeometry,shirt,chest,0,.33,.129,.132,.34,.043);
    const tie=mesh(boxGeometry,ties[team],chest,0,.29,.159,.044,.235,.019);
    tie.rotation.z=-.065;
    mesh(boxGeometry,shirt,chest,.148,.339,.153,.072,.053,.022);
    mesh(boxGeometry,leather,pelvis,0,.09,.01,.395,.055,.274);
    mesh(boxGeometry,bronze,pelvis,0,.083,.154,.074,.054,.028);
    mesh(cylinder,skin,chest,0,.532,0,.075,.12,.076);
    const head=joint(chest,0,.62,.018);
    mesh(sphere,skin,head,0,.058,.025,.106,.14,.107);
    mesh(sphere,skin,head,0,.012,.053,.075,.065,.079);
    mesh(sphere,hair,head,0,.126,-.018,.120,.107,.111);
    const jaw=mesh(boxGeometry,charcoal,head,0,.012,.127,.055,.012,.012);
    mesh(sphere,skin,head,0,.055,.126,.024,.039,.037);
    for(const side of [-1,1]){
      mesh(sphere,skin,head,side*.1,.045,.013,.025,.045,.02);
      mesh(sphere,charcoal,head,side*.043,.088,.115,.019,.011,.008);
      mesh(sphere,hair,head,side*.039,.105,.109,.032,.009,.01);
    }
    const arms=[],forearms=[],legs=[],shins=[],feet=[];
    for(const side of [-1,1]){
      const arm=joint(chest,side*.26,.415,0);
      const elbow=joint(arm,0,-.264,0);
      arms.push(arm);forearms.push(elbow);
      mesh(limbGeo,jacket,arm,0,-.112,0,.145,.145,.145);
      mesh(limbGeo,jacket,elbow,0,-.112,0,.133,.129,.133);
      mesh(boxGeometry,shirt,elbow,0,-.204,0,.123,.050,.113);
      mesh(boxGeometry,skin,elbow,0,-.252,.012,.108,.103,.093);
      const leg=joint(pelvis,side*.115,-.035,0),knee=joint(leg,0,-.335,0);
      const foot=joint(knee,0,-.278,0);
      legs.push(leg);shins.push(knee);feet.push(foot);
      mesh(limbGeo,charcoal,leg,0,-.15,0,.17,.16,.171);
      mesh(limbGeo,charcoal,knee,0,-.126,0,.134,.144,.141);
      mesh(boxGeometry,leather,foot,0,-.043,.064,.165,.093,.255);
      mesh(boxGeometry,charcoal,foot,0,-.086,.063,.171,.019,.259);
    }
    const ward=mesh(sphere,new THREE.MeshBasicMaterial({color:palette[team],transparent:true,opacity:0,wireframe:true}),
      group,0,.92,0,.66,.96,.66,false);
    group.traverse(part=>{if(part.isMesh) part.castShadow=false;});
    return {group,shadow,rig,pelvis,chest,arms,forearms,legs,shins,feet,head,jaw,ward,heading:null,stride:0,gait:0};
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
  function fit(){
    if(canvas.clientWidth===width && canvas.clientHeight===height) return;
    width=canvas.clientWidth;
    height=canvas.clientHeight;
    if(width && height){
      const ratio=Math.min(1.3,1600/width,960/height);
      renderer.setSize(Math.max(1,Math.round(width*ratio)),Math.max(1,Math.round(height*ratio)),false);
    }
  }

  function cameraAt(self,dt){
    if(self && !entered){
      zoom=1;
      selected.copy(center);
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
      const marginX=Math.min(center.x,view*aspect*.40);
      const marginY=Math.min(center.z,view*.43);
      vector.set(clamp(self.x,marginX,FLOOR.w-marginX),0,clamp(self.y,marginY,FLOOR.h-marginY));
      selected.lerp(vector,1-Math.exp(-dt*9));
    }
    camera.position.set(selected.x-2.8,35,selected.z+25);
    camera.lookAt(selected.x,.18,selected.z);
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
    const {group,shadow,rig,pelvis,chest,arms,forearms,legs,shins,feet,head,jaw,ward}=model;
    const heading=Math.atan2(f.dx,f.dy);
    const distance=Math.hypot(f.x-group.position.x,f.y-group.position.z);
    if(model.heading===null || distance>3){
      model.heading=heading;
      model.gait=0;
    }
    group.position.set(f.x,0,f.y);
    model.heading+=Math.atan2(Math.sin(heading-model.heading),Math.cos(heading-model.heading))*(1-Math.exp(-dt*16));
    group.rotation.y=model.heading;
    group.scale.setScalar(1.33);
    model.gait=THREE.MathUtils.lerp(model.gait,f.moving?1:0,1-Math.exp(-dt*13));
    if(distance<3) model.stride+=distance*5.25;
    const gait=model.gait, phase=model.stride, wave=Math.sin(phase), breath=Math.sin(time/455+f.color);
    const airborne=Arena.heightAt(f,time);
    jaw.scale.y=.012;
    shadow.scale.set(1.2+airborne*.25,1,.74+airborne*.18);
    rig.position.set(0,airborne,0);
    rig.rotation.set(0,0,0);
    pelvis.position.y=.74+.024*Math.cos(phase*2)*gait+.009*breath;
    pelvis.rotation.set(0,.105*wave*gait,.048*wave*gait);
    chest.rotation.set(.14*gait+.028*breath,-.22*wave*gait,-.045*wave*gait);
    head.rotation.set(-.08*gait,.09*wave*gait,.012*breath);
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
        jaw.scale.y=.012+follow*.042;
        break;
      case 'ultimate':{
        const skill=Arena.ultimateFor(f);
        const heavy=skill.global || skill.stun;
        const support=skill.heal || skill.shield;
        const weight=Math.max(prepare,follow);
        pelvis.position.y-=.23*prepare+.15*follow;
        blend(chest,.43*prepare+(heavy?.59:support?-.25:.42)*follow,-.37*prepare,.19*prepare,weight);
        for(let i=0;i<2;i++){
          const side=i===0?1:-1;
          const reach=heavy ? .72*prepare-1.21*follow : support ? -2.15*follow : .43*prepare-1.75*follow;
          blend(arms[i],reach,side*.17,side*(.35+follow*.9),weight);
          blend(forearms[i],-1.22*prepare-.30*follow,0,0,weight);
          blend(legs[i],-.54,0,side*-.23,weight);
          blend(shins[i],.80,0,0,prepare+follow*.40);
        }
        break;
      }
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
  }

  function render(state,time,hero,dt){
    fit();
    if(!width || !height) return;
    cameraAt(hero,dt);
    const living=new Set();
    for(const f of state.players){
      living.add(f.id);
      let model=actors.get(f.id);
      if(!model){
        model=createHero(f.team,f.color);
        actors.set(f.id,model);
      }
      orient(model,f,time,dt);
    }
    for(const [id,model] of actors){
      if(living.has(id)) continue;
      model.ward.material.dispose();
      model.group.removeFromParent();
      actors.delete(id);
    }
    targetRing.visible=Boolean(hero?.target);
    if(hero?.target){
      targetRing.position.set(hero.target.x,.058,hero.target.y);
      targetRing.scale.setScalar(.76+Math.sin(time/110)*.18);
    }
    bursts.forEach(burst=>{burst.visible=false;});
    const ultimates=state.events.filter(e=>e.kind==='ultimate' || e.kind==='eclipse').slice(-bursts.length);
    for(const [i,event] of ultimates.entries()){
      const elapsed=time-event.t;
      if(elapsed<0 || elapsed>360) continue;
      const progress=elapsed/360;
      const burst=bursts[i];
      burst.visible=true;
      burst.position.set(event.x,.071,event.y);
      burst.scale.setScalar((.52+progress*.45)*Math.min(event.radius || 2,2.5)/.53);
      burst.material.opacity=(1-progress)*.27;
      burst.material.color.setHex(event.kind==='eclipse'?0xc5a9d6:palette[event.team]);
    }
    effects.forEach(obj=>{obj.visible=false;});
    state.events.filter(e=>e.kind==='hit' || e.kind==='magic' || e.kind==='shield').slice(-effects.length).forEach((event,i)=>{
      const age=time-event.t;
      if(age<0 || age>160) return;
      const obj=effects[i], progress=age/160;
      const size=.13*(1-progress);
      obj.visible=true;
      obj.material.color.setHex(event.kind==='shield'?0xa5ddf5:0xffdd95);
      obj.material.opacity=.65*(1-progress);
      obj.position.set(event.x,1.08+progress*.27,event.y);
      obj.scale.set(size,size*1.5,size);
    });
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
    for(const u of state.players){
      if(!u.hp) continue;
      const x=u.x/FLOOR.w*w,y=u.y/FLOOR.h*h;
      mini.fillStyle=u.id===self?'#fff2a8':u.team?'#ff6358':'#65d5ff';
      const size=4;
      mini.fillRect(x-size/2,y-size/2,size,size);
    }
  }

  return {render,project,point,drawMap,zoom(delta){zoom=clamp(zoom+delta,1,2.5);},faction};
}

window.Rift={create};
})();

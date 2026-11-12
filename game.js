(function(){
'use strict';

const { FLOOR,ROOMS,CAPACITY,ACTIONS,ROLES } = Arena;
const canvas=document.getElementById('gameCanvas');
const PIXEL_SCALE=2;
const W=canvas.width/PIXEL_SCALE, H=canvas.height/PIXEL_SCALE;
let ctx=canvas.getContext('2d');
ctx.scale(PIXEL_SCALE,PIXEL_SCALE);

var BACK = ['#829d97','#607f7e','#496361'];
var WOOD = ['#c99c68','#a77450','#75513c'];
var STEEL = ['#a9bdbc','#768f91','#536b70'];
var DARK = ['#536465','#344749','#28383d'];
var GREEN = ['#84ae81','#5c906f','#456d5b'];
var WALL = ['#a9bfb0','#779189','#536c65'];
var sceneOverlay = document.getElementById('sceneOverlay');
var backdrop = document.createElement('canvas');
backdrop.width = canvas.width;
backdrop.height = canvas.height;
var furniture = [];

function project(x, y, z){
  return [148 + x*15.6 - y*8, 52 + x*4.2 + y*9.2 - (z || 0)*12];
}

function unproject(x, y){
  var px = x - 148, py = y - 52;
  var worldX = (9.2*px + 8*py) / 177.12;
  return { x: worldX, y: (py - 4.2*worldX)/9.2 };
}

function polygon(points, fill, stroke){
  ctx.beginPath();
  points.forEach(function(p, i){
    if (i) ctx.lineTo(Math.round(p[0]), Math.round(p[1]));
    else ctx.moveTo(Math.round(p[0]), Math.round(p[1]));
  });
  ctx.closePath();
  if (fill){ ctx.fillStyle = fill; ctx.fill(); }
  if (stroke){ ctx.strokeStyle = stroke; ctx.stroke(); }
}

function quad(x,y,w,d,z,fill,stroke){
  polygon([project(x,y,z),project(x+w,y,z),project(x+w,y+d,z),project(x,y+d,z)],fill,stroke);
}

function box(x,y,w,d,z,h,colors){
  var top = z+h;
  var right = x+w, front = y+d;
  polygon([project(right,y,top),project(right,front,top),project(right,front,z),project(right,y,z)],colors[2]);
  polygon([project(x,front,top),project(right,front,top),project(right,front,z),project(x,front,z)],colors[1]);
  quad(x,y,w,d,top,colors[0]);
}

function wallPanel(x,y,w,z,h,color){
  polygon([project(x,y,z),project(x+w,y,z),project(x+w,y,z+h),project(x,y,z+h)],color);
}

function depth(x,y){ return x*4.2+y*9.2; }

function plant(x,y,size){
  box(x,y,.38*size,.38*size,0,.37*size,['#ce9670','#a96751','#7e4e42']);
  box(x+.13*size,y+.13*size,.12*size,.12*size,.34*size,.47*size,GREEN);
  box(x-.12*size,y+.08*size,.4*size,.31*size,.61*size,.24*size,GREEN);
  box(x+.18*size,y-.09*size,.36*size,.3*size,.78*size,.24*size,GREEN);
  box(x+.07*size,y+.08*size,.31*size,.28*size,.96*size,.2*size,GREEN);
}

function paintFloor(){
  ctx.fillStyle = '#142223';
  ctx.fillRect(0,0,W,H);
  for (var x=1;x<W;x+=9){
    for (var y=4;y<H;y+=9){
      ctx.fillStyle = '#253534';
      ctx.fillRect(x,y,1,1);
    }
  }
  quad(.12,.22,FLOOR.w+.44,FLOOR.h+.45,-.52,'#0e191b');
  box(0,0,FLOOR.w,FLOOR.h,-.48,.48,['#8d9b85','#4b6059','#394d48']);
  for (var col=0;col<FLOOR.w;col++){
    for (var row=0;row<FLOOR.h;row++){
      var room = row < 4 && ROOMS.find(function(area){ return col+.5 >= area.x && col+.5 < area.x+area.width; });
      var shades = row === 8 || row === 13 ? ['#8c9b85','#81927e'] : ['#a8ad99','#9ea694'];
      var d = Math.min(.96,FLOOR.h-row-.025);
      var seed = (col*29+row*67)%101;
      quad(col+.02,row+.025,.96,d,0,room ? room.floor : shades[(col+row)%2]);
      quad(col+.04,row+.04,.92,.045,0,'#f7f3df28');
      if (room && room.activity==='sofa'){
        for (var strip=1;strip<4;strip++){
          quad(col+.02,row+strip*.24,.96,.018,0,'#614c382b');
          quad(col+(seed%5)*.14+.06,row+strip*.24+.10,.2+(seed%3)*.08,.02,0,'#f8d4a745');
        }
      } else {
        if (room && room.activity==='toilet'){
          quad(col+.50,row+.035,.022,d-.03,0,'#45667348');
          quad(col+.04,row+.51,.91,.024,0,'#45667348');
        }
        quad(col+.13+(seed%4)*.17,row+.21+(seed%3)*.16,.08,.06,0,'#4e63552c');
        quad(col+.23+(seed%3)*.12,row+.13+(seed%4)*.1,.13,.04,0,'#d4d7bc40');
      }
    }
  }
  for (var windowX of [1,8.45,15.7]){
    polygon([project(windowX,.1),project(windowX+3.5,.1),project(windowX+5.1,5.2),project(windowX+1.7,5.2)],'#fff0b62d');
    polygon([project(windowX+1.5,.1),project(windowX+1.66,.1),project(windowX+3.28,5.2),project(windowX+3.12,5.2)],'#64735b36');
  }
  quad(.7,.62,5.89,2.65,.012,'#50766873');
  quad(.79,.69,5.72,.045,.015,'#bad0a14f');
  quad(.79,3.16,5.72,.045,.015,'#bac8a24a');
  quad(16.65,1.43,3.95,1.76,.013,'#e4c09854');
  quad(16.76,1.54,3.73,1.54,.014,'#80654e38');
  for (var i=0;i<3;i++){
    quad(1.55+i*6,8.33,2.4,.21,.02,'#b6ba9e');
    quad(1.55+i*6,13.65,2.4,.21,.02,'#b6ba9e');
  }
  box(0,0,FLOOR.w,.17,0,2.65,BACK);
  box(0,0,.17,4.05,0,2.65,BACK);
  box(0,.17,FLOOR.w,.06,0,.14,DARK);
  for (var windowX of [1,8.45,15.7]){
    wallPanel(windowX,.19,4.5,.8,1.53,'#486b70');
    wallPanel(windowX+.13,.20,4.24,.91,1.31,'#c2ded9');
    wallPanel(windowX+.13,.21,4.24,.92,.35,'#80a6a6');
    wallPanel(windowX+.32,.22,.65,.91,.62,'#99bcb4');
    wallPanel(windowX+2.68,.22,1.5,.91,.55,'#a2bfb3');
    wallPanel(windowX+1.68,.22,1.42,.91,.36,'#71999c');
    wallPanel(windowX+.13,.23,4.24,1.77,.08,'#e5ead5');
    wallPanel(windowX+.42,.23,.32,.92,.75,'#739594');
    wallPanel(windowX+1.25,.23,.32,.92,.41,'#8ca8a0');
    wallPanel(windowX+3.46,.23,.32,.92,.67,'#839e99');
    for (var pane=0;pane<4;pane++){
      wallPanel(windowX+.17,.235,4.15,2.1-pane*.11,.02,'#f0f1de8a');
    }
    wallPanel(windowX+.22,.242,4.11,1.01,.025,'#d7e6d5');
    wallPanel(windowX+2.18,.25,.14,.87,1.45,'#6d8983');
    box(windowX-.06,.17,4.62,.21,.72,.10,STEEL);
  }
}

function table(x,y,w,d){
  quad(x+.13,y+.18,w+.11,d+.13,.01,'#3343412c');
  quad(x+.11,y+.13,w-.08,d-.025,.012,'#33434138');
  quad(x+.09,y+.11,.26,d+.1,.014,'#263b3c4a');
  quad(x+w-.35,y+.11,.31,d+.1,.014,'#263b3c4a');
  box(x+.13,y+.07,.17,d-.14,0,.79,WOOD);
  box(x+w-.3,y+.07,.17,d-.14,0,.79,WOOD);
  box(x,y,w,d,.79,.13,WOOD);
  quad(x+.05,y+.07,w-.1,.065,.925,'#e5be8c');
  for (var i=1;i<5;i++){
    var start = .15+(i*7)%4*.19;
    quad(x+start,y+d*i/5,w-start-.15,.024,.925,i%2 ? '#79553a50' : '#f0c99790');
  }
  wallPanel(x+.05,y+d+.004,w-.10,.876,.024,'#e1ae7855');
}

function chair(x,y,front){
  quad(x+.06,y+.08,.66,.51,.01,'#2636364a');
  box(x+.04,y+.19,.57,.14,0,.075,DARK);
  box(x+.25,y+.035,.15,.46,0,.075,DARK);
  box(x+.26,y+.17,.12,.15,.07,.22,STEEL);
  box(x,y,.64,.53,.23,.20,STEEL);
  var back = front ? y+.41 : y;
  box(x,back,.64,.12,.41,.34,DARK);
  wallPanel(x+.07,back+.123,.49,.57,.055,'#738784');
}

function desk(x,y){
  table(x,y,2.84,1.07);
  box(x+.97,y+.14,.78,.33,.92,.09,DARK);
  box(x+1.28,y+.15,.17,.16,1,.22,DARK);
  box(x+.8,y+.12,1.15,.2,1.16,.69,DARK);
  wallPanel(x+.9,y+.333,.96,1.27,.48,'#3f5154');
  quad(x+.93,y+.63,.83,.25,.93,'#596561');
  quad(x+.99,y+.67,.65,.045,.94,'#bac2ad');
  quad(x+.99,y+.77,.65,.035,.94,'#bac2ad');
  box(x+1.95,y+.66,.23,.28,.924,.065,DARK);
  box(x+2.38,y+.24,.24,.24,.92,.23,['#d29877','#b4785d','#8d594b']);
  quad(x+.23,y+.53,.42,.29,.94,'#e3dbbf');
  quad(x+.3,y+.59,.26,.025,.945,'#939487');
  quad(x+.3,y+.68,.22,.025,.945,'#939487');
}

function paintRing(){
  const x=6.36,y=5.14,w=9.22,d=8.53;
  quad(x,y,w,d,.01,'#38575039');
  quad(x+.16,y+.16,w-.32,d-.32,.02,'#34474327');
  for (let i=0;i<9;i++){
    quad(x+.12+i,y+.07,.55,.085,.025,'#f5d28aa5');
    quad(x+.12+i,y+d-.16,.55,.085,.025,'#f5d28aa5');
  }
  for (let i=0;i<8;i++){
    quad(x+.07,y+.18+i,.085,.58,.025,'#f5d28a92');
    quad(x+w-.16,y+.18+i,.085,.58,.025,'#f5d28a92');
  }
  const corners=[[x,y,1,1],[x+w,y,-1,1],[x,y+d,1,-1],[x+w,y+d,-1,-1]];
  for (const [cx,cy,dx,dy] of corners){
    quad(dx>0?cx:cx-1.12,dy>0?cy:cy-.13,1.12,.13,.03,'#e2a85b');
    quad(dx>0?cx:cx-.13,dy>0?cy:cy-1.05,.13,1.05,.03,'#e2a85b');
  }
  quad(10.59,8.90,.64,1.01,.025,'#d1ccac4c');
  quad(10.39,9.12,1.04,.57,.03,'#d1ccac4c');
  quad(10.70,9.19,.42,.42,.032,'#5c7365');
}

function positionOverlay(el,p){
  el.style.left=p[0]/W*100+'%';
  el.style.top=p[1]/H*100+'%';
}

function buildScene(){
  const screen=ctx;
  ctx=backdrop.getContext('2d');
  ctx.scale(PIXEL_SCALE,PIXEL_SCALE);
  paintFloor();
  paintRing();
  ctx=screen;
  Arena.layout({
    box,table,chair,plant,quad,desk,WALL,DARK,STEEL,WOOD,
    fixture(x,y,w,d,draw){ furniture.push({depth:depth(x+w/2,y+d),draw}); }
  });
  for (const room of ROOMS){
    const label=document.createElement('span');
    label.className='nameplate room';
    label.textContent=room.name;
    sceneOverlay.append(label);
    positionOverlay(label,project(room.x+.16+room.width*.74,.14,2.8));
  }
}

const PALETTES=[
  ['#372c2a','#e5b489','#cc705e','#8f443e'],
  ['#222a30','#e5bb95','#659da8','#3c6777'],
  ['#3d303b','#d49476','#b298c3','#6b5c86'],
  ['#4b3530','#e8b483','#d6a566','#936f45'],
  ['#29292e','#bb856c','#83a880','#50765b'],
  ['#422f26','#edbb92','#7494c0','#4a5d89'],
  ['#303332','#dfae86','#ce91a3','#975c76'],
  ['#442b25','#c79274','#79ae9c','#42796f'],
  ['#323038','#e4ae91','#c6bd79','#8d7e4e'],
  ['#44342f','#dca886','#c5856e','#945c51']
];
const READY={
  hip:[0,-9], chest:[0,-17], head:[0,-23],
  arms:[[[1,-16],[4,-12],[7,-14]],[[0,-17],[-3,-13],[4,-12]]],
  legs:[[[0,-9],[3,-5],[4,0]],[[-1,-9],[-3,-5],[-4,0]]]
};
const POSES={
  slap:{
    wind:{hip:[-1,-9],chest:[-2,-17],head:[-2,-23],arms:[[[0,-16],[-4,-14],[-9,-15]],[[-2,-16],[0,-11],[4,-12]]],legs:READY.legs},
    hit:{hip:[1,-9],chest:[4,-17],head:[4,-23],arms:[[[4,-16],[10,-15],[16,-13]],[[2,-16],[0,-11],[6,-11]]],legs:[[[1,-9],[4,-5],[7,0]],[[0,-9],[-3,-4],[-5,0]]]}
  },
  voice:{
    wind:{hip:[-1,-9],chest:[-2,-17],head:[-1,-23],arms:[[[0,-16],[3,-13],[6,-16]],[[-2,-17],[-4,-14],[-3,-11]]],legs:READY.legs},
    hit:{hip:[0,-9],chest:[2,-17],head:[4,-22],arms:[[[2,-17],[4,-13],[8,-15]],[[3,-17],[8,-19],[14,-20]]],legs:READY.legs}
  },
  punch:{
    wind:{hip:[-1,-9],chest:[-2,-17],head:[-2,-23],arms:[[[0,-16],[1,-11],[5,-15]],[[-2,-16],[-6,-13],[-5,-12]]],legs:READY.legs},
    hit:{hip:[2,-9],chest:[5,-17],head:[5,-22],arms:[[[3,-16],[1,-12],[6,-13]],[[5,-16],[12,-16],[20,-17]]],legs:[[[1,-9],[4,-5],[7,0]],[[0,-9],[-2,-4],[-5,0]]]}
  },
  kick:{
    wind:{hip:[-1,-10],chest:[-3,-18],head:[-3,-24],arms:[[[0,-17],[4,-15],[5,-19]],[[-3,-17],[-6,-12],[-3,-10]]],legs:[[[0,-10],[-2,-5],[-3,0]],[[-1,-10],[5,-13],[6,-7]]]},
    hit:{hip:[1,-11],chest:[-3,-18],head:[-4,-24],arms:[[[-2,-17],[2,-14],[6,-16]],[[-4,-17],[-8,-13],[-10,-11]]],legs:[[[0,-10],[-2,-5],[-3,0]],[[1,-11],[10,-12],[20,-13]]]}
  },
  jump:{hip:[0,-11],chest:[0,-18],head:[1,-24],arms:[[[1,-17],[7,-18],[8,-23]],[[-1,-17],[-6,-17],[-8,-21]]],legs:[[[1,-11],[6,-9],[8,-4]],[[0,-11],[-4,-7],[-1,-5]]]},
  guard:{hip:[0,-8],chest:[1,-15],head:[1,-21],arms:[[[2,-15],[7,-13],[7,-21]],[[-1,-15],[5,-13],[4,-20]]],legs:[[[1,-8],[4,-5],[5,0]],[[0,-8],[-4,-4],[-5,0]]]},
  bow:{hip:[-1,-6],chest:[5,-7],head:[10,-6],arms:[[[4,-7],[8,-3],[13,-1]],[[3,-8],[8,-4],[11,-1]]],legs:[[[0,-6],[4,-1],[-2,0]],[[-1,-6],[1,-1],[-6,0]]]},
  hurt:{hip:[-1,-9],chest:[-4,-16],head:[-6,-22],arms:[[[-4,-16],[0,-13],[4,-10]],[[-4,-16],[-8,-14],[-10,-11]]],legs:[[[0,-9],[3,-4],[4,0]],[[-1,-9],[-5,-5],[-6,0]]]},
  ko:{hip:[0,-3],chest:[-7,-4],head:[-13,-4],arms:[[[-7,-4],[-5,-2],[-2,0]],[[-7,-4],[-10,-2],[-13,-1]]],legs:[[[0,-3],[5,-2],[10,-1]],[[0,-3],[5,-4],[9,-4]]]}
};

function lerp(a,b,t){ return a+(b-a)*t; }
function blendPose(a,b,t){
  const point=(p,q)=>[lerp(p[0],q[0],t),lerp(p[1],q[1],t)];
  return {
    hip:point(a.hip,b.hip),chest:point(a.chest,b.chest),head:point(a.head,b.head),
    arms:a.arms.map((arm,i)=>arm.map((p,j)=>point(p,b.arms[i][j]))),
    legs:a.legs.map((leg,i)=>leg.map((p,j)=>point(p,b.legs[i][j])))
  };
}

function poseAt(f,time){
  const elapsed=Math.max(0,time-f.actionAt);
  const move=ACTIONS[f.action];
  const pose=POSES[f.action];
  if (move?.strike){
    if (elapsed<move.strike*.62) return blendPose(READY,pose.wind,elapsed/(move.strike*.62));
    if (elapsed<move.strike) return blendPose(pose.wind,pose.hit,(elapsed-move.strike*.62)/(move.strike*.38));
    const hold=f.action==='voice' ? 430 : 105;
    if (elapsed<move.strike+hold) return pose.hit;
    return blendPose(pose.hit,READY,Math.min(1,(elapsed-move.strike-hold)/(move.duration-move.strike-hold)));
  }
  if (pose && move){
    const ease=Math.min(1,elapsed/115,Math.max(0,(move.duration-elapsed)/135));
    return blendPose(READY,pose,ease);
  }
  if (pose) return pose;
  if (!f.moving) return READY;
  const stride=Math.sin(time/76)*4;
  return {
    ...READY,
    legs:[[[0,-9],[stride*.5,-5],[stride,Math.min(0,stride*.42)]],
          [[0,-9],[-stride*.5,-5],[-stride,Math.min(0,-stride*.42)]]]
  };
}

function segment(a,b,width,color){
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1;
  const ux=-dy/length*width*.5,uy=dx/length*width*.5;
  polygon([[a[0]+ux,a[1]+uy],[b[0]+ux,b[1]+uy],[b[0]-ux,b[1]-uy],[a[0]-ux,a[1]-uy]],color);
}

function drawBody(x,y,f,time){
  const pose=poseAt(f,time);
  const c=PALETTES[f.color];
  const facing=f.dx*15.6-f.dy*8>=0 ? 1 : -1;
  const point=p=>[x+p[0]*facing,y+p[1]];
  function pixel(p,dx,dy,w,h,color){
    const [px,py]=point(p);
    ctx.fillStyle=color;
    ctx.fillRect(Math.round(px+dx),Math.round(py+dy),w,h);
  }
  function drawLimb(limb,width,first,second,end,isFoot){
    const [a,b,c]=limb.map(point);
    segment(a,b,width,first);
    segment(b,c,width-.4,second);
    pixel(limb[2],isFoot && facing<0 ? -4 : -2,isFoot ? -2 : -1,isFoot ? 6 : 4,isFoot ? 3 : 4,end);
  }
  drawLimb(pose.legs[0],4,'#485558','#303b3d','#263233',true);
  drawLimb(pose.arms[0],3.4,c[3],c[3],c[1],false);
  segment(point(pose.hip),point(pose.chest),10,c[2]);
  segment(point([pose.hip[0]+2,pose.hip[1]]),point([pose.chest[0]+2,pose.chest[1]]),2.3,c[3]);
  pixel(pose.chest,-3,1,5,2,'#ffffff2b');
  drawLimb(pose.legs[1],4,'#546163','#3b494c','#2b3536',true);
  drawLimb(pose.arms[1],3.5,c[2],c[3],c[1],false);
  pixel(pose.head,-4,-4,9,8,c[1]);
  pixel(pose.head,-5,-5,11,4,c[0]);
  pixel(pose.head,facing===1 ? -4 : 2,-2,3,3,c[0]);
  pixel(pose.head,facing===1 ? 2 : -2,0,1,2,'#332d2d');
  pixel(pose.head,facing===1 ? 2 : -3,3,2,1,'#905b4a');
  if (f.action==='voice' && time-f.actionAt<690){
    const [px,py]=point(pose.head);
    segment([px+7*facing,py+1],[px+12*facing,py-2],1.3,'#f9d089');
    segment([px+8*facing,py+4],[px+14*facing,py+4],1.3,'#f9d089');
    segment([px+7*facing,py+7],[px+12*facing,py+9],1.3,'#f9d089');
  }
}

const $=id=>document.getElementById(id);
const labels=new Map();
const buttons=new Map();
const practice=document.documentElement.dataset.mode!=='online';
let selectedRole=null, ideaOpen=false;
let self=practice?'local':null;
let current=null, previous=null, receivedAt=0, connected=false;
let session=null, source=null, retry=0;
let activePage=true, connecting=false;
let leaderSignature='';
const pressed=new Set();
const directionKeys=new Map([
  ['ArrowUp',[0,-1]],['ArrowDown',[0,1]],['ArrowLeft',[-1,0]],['ArrowRight',[1,0]]
]);
const actionKeys=new Map(Object.entries(ACTIONS).map(([name,action])=>[action.key,name]));

function setText(id,text){
  const element=$(id);
  if (element.textContent!==text) element.textContent=text;
}

function fighterSelf(){ return current?.players.find(p=>p.id===self); }

function updateHud(){
  const player=fighterSelf();
  const position=current?.position || 0;
  setText('connectionText',!selectedRole ? '等待选职业' : practice ? '单机练习' : !connected ? '正在连接' : position ? '观战排队' : '在线联机');
  $('connection').className='connection '+(practice ? 'practice' : connected ? 'online' : '');
  $('queueNotice').hidden=!position || !connected;
  if (position) setText('queuePosition','排队第 '+position+' 位');
  setText('playerName',player ? player.name+' · 体力' : '我的体力');
  setText('healthText',player ? player.hp+' / 100' : '—');
  $('healthBar').value=player?.hp || 0;
  $('healthBar').classList.toggle('low',Boolean(player && player.hp<35));
  setText('score',player ? String(player.score) : '—');
  setText('occupancy',current ? practice ? current.players.length+' 人' : current.players.length+' / '+CAPACITY : '— / '+CAPACITY);
  for (const [name,button] of buttons){
    button.disabled=!player?.hp || !connected;
    button.classList.toggle('active',player?.action===name);
  }
  const ordered=current?.players.slice().sort((a,b)=>b.score-a.score || Number(a.id)-Number(b.id)).slice(0,4) || [];
  const signature=ordered.map(p=>p.id+':'+p.score).join('|');
  if (signature!==leaderSignature){
    leaderSignature=signature;
    $('leaders').replaceChildren(...ordered.map(player=>{
      const item=document.createElement('li');
      const points=document.createElement('b');
      points.textContent=player.score;
      item.append(player.name,points);
      return item;
    }));
  }
}

function drawFighter(f,time){
  const z=Arena.heightAt(f,time), ground=project(f.x,f.y);
  quad(f.x-.34,f.y-.25,.72,.52,.014,z>.3 ? '#182a2a39' : '#19292880');
  if (f.id===self){
    quad(f.x-.39,f.y-.29,.78,.58,.025,null,'#ffdb87');
  }
  if (f.action==='guard'){
    const [x,y]=project(f.x,f.y,1.32);
    const forward=f.dx*15.6-f.dy*8>=0 ? 1 : -1;
    polygon([[x+forward*9,y-8],[x+forward*13,y-5],[x+forward*13,y+3],[x+forward*9,y+7]],
      '#9ce1d93a','#b5fff29b');
  }
  ctx.globalAlpha=f.safeUntil>time && Math.floor(time/100)%2 ? .56 : 1;
  drawBody(ground[0],ground[1]-z*12,f,time);
  ctx.globalAlpha=1;

  const maxWidth=18, x=Math.round(ground[0]-maxWidth/2), y=Math.round(ground[1]+1);
  ctx.fillStyle='#253131';
  ctx.fillRect(x-1,y-1,maxWidth+2,4);
  ctx.fillStyle=f.hp<35 ? '#ec927b' : f.id===self ? '#f9ce82' : '#a0c9ac';
  ctx.fillRect(x,y,Math.round(maxWidth*f.hp/100),2);
  const {badge,speech}=labels.get(f.id);
  positionOverlay(badge,[ground[0],ground[1]+5]);
  badge.classList.toggle('ko',f.hp===0);
  speech.hidden=!f.line;
  if (f.line){
    if (speech.textContent!==f.line) speech.textContent=f.line;
    positionOverlay(speech,project(f.x,f.y,z+2.8));
  }
}

function drawImpact(event,time){
  const elapsed=time-event.t;
  if (elapsed<0 || elapsed>=620) return;
  const [x,y]=project(event.x,event.y,1.75);
  const progress=elapsed/620;
  ctx.globalAlpha=1-progress;
  const color=event.kind==='guard' ? '#c0f6ec' : '#ffd17f';
  if (elapsed<260){
    const size=3+elapsed*.029;
    polygon([[x-size,y],[x-2,y-2],[x,y-size],[x+2,y-2],[x+size,y],
      [x+2,y+2],[x,y+size],[x-2,y+2]],color);
  }
  ctx.font='bold 10px ui-monospace,monospace';
  ctx.textAlign='center';
  ctx.fillStyle='#263132';
  const text=event.kind==='ko' ? 'KO' : event.kind==='guard' ? '格挡' : '-'+event.damage;
  ctx.fillText(text,x+1,y-8-progress*13+1);
  ctx.fillStyle=color;
  ctx.fillText(text,x,y-8-progress*13);
  ctx.globalAlpha=1;
}

function refreshLabels(players){
  const ids=new Set(players.map(p=>p.id));
  for (const [id,view] of labels){
    if (ids.has(id)) continue;
    view.badge.remove();
    view.speech.remove();
    labels.delete(id);
  }
  for (const fighter of players){
    if (labels.has(fighter.id)) continue;
    const badge=document.createElement('span');
    badge.className='nameplate'+(fighter.id===self ? ' self' : '');
    badge.textContent=fighter.name;
    const speech=document.createElement('span');
    speech.className='nameplate speech';
    speech.hidden=true;
    sceneOverlay.append(badge,speech);
    labels.set(fighter.id,{badge,speech});
  }
}

function render(now){
  if (ideaOpen){
    requestAnimationFrame(render);
    return;
  }
  ctx.drawImage(backdrop,0,0,W,H);
  const objects=furniture.slice();
  if (current){
    const span=previous ? current.time-previous.time : 0;
    const mix=span>0 ? Math.min(1,(now-receivedAt)/span) : 1;
    const time=span>0 ? lerp(previous.time,current.time,mix) : current.time;
    const player=fighterSelf();
    if (player?.target){
      const {x,y}=player.target;
      quad(x-.22,y-.22,.44,.44,.02,'#f4cf894e','#ffe3a7');
      quad(x-.07,y-.07,.14,.14,.025,'#ffebbe');
    }
    for (const latest of current.players){
      const prior=previous?.players.find(p=>p.id===latest.id);
      const old=prior && Math.hypot(prior.x-latest.x,prior.y-latest.y)<2 ? prior : latest;
      const f={ ...latest,x:lerp(old.x,latest.x,mix),y:lerp(old.y,latest.y,mix) };
      objects.push({depth:depth(f.x,f.y),draw:()=>drawFighter(f,time)});
    }
    objects.sort((a,b)=>a.depth-b.depth);
    for (const item of objects) item.draw();
    for (const event of current.events) drawImpact(event,time);
  } else {
    objects.sort((a,b)=>a.depth-b.depth);
    for (const item of objects) item.draw();
  }
  requestAnimationFrame(render);
}

function accept(state){
  if (!current || state.time<current.time || state.self!==current.self) previous=null;
  else previous=current;
  self=state.self;
  current=state;
  receivedAt=performance.now();
  connected=true;
  refreshLabels(state.players);
  updateHud();
}

function buildControls(){
  for (const [name,action] of Object.entries(ACTIONS)){
    const button=document.createElement('button');
    button.type='button';
    button.className='action';
    button.dataset.action=name;
    button.disabled=true;
    const preview=document.createElement('canvas');
    preview.width=46;
    preview.height=43;
    preview.setAttribute('aria-hidden','true');
    const label=document.createElement('span');
    label.textContent=action.label;
    const key=document.createElement('kbd');
    key.textContent=action.hint;
    button.append(preview,label,key);
    button.addEventListener('click',event=>{
      if (event.detail) button.blur();
      send({type:'action',action:name});
    });
    $('actions').append(button);
    buttons.set(name,button);
    const main=ctx;
    ctx=preview.getContext('2d');
    drawBody(19,name==='jump' ? 32 : 35,{color:3,dx:1,dy:0,action:name,actionAt:0},action.strike || 310);
    ctx=main;
  }
}

const local=practice ? Arena.createMatch() : null;

function send(command){
  if (!connected || !fighterSelf()?.hp) return;
  if (practice){
    local.input(self,command);
    return;
  }
  if (source?.readyState===WebSocket.OPEN) source.send(JSON.stringify(command));
}

function post(url,body,keepalive=false){
  return fetch(url,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body),keepalive
  });
}

function disconnect(){
  connected=false;
  pressed.clear();
  updateHud();
}

function reconnect(){
  disconnect();
  source?.close();
  source=null;
  if (activePage){
    clearTimeout(retry);
    retry=setTimeout(connect,850);
  }
}

async function connect(){
  if (connecting || !activePage || !selectedRole) return;
  connecting=true;
  try{
    const response=await post('/join',{token:session,role:selectedRole});
    if (!response.ok) throw Error('join');
    const {token}=await response.json();
    if (!activePage){
      post('/leave',{token},true).catch(()=>{});
      return;
    }
    session=token;
    const url=new URL('/socket',location.href);
    url.protocol=location.protocol==='https:' ? 'wss:' : 'ws:';
    url.searchParams.set('token',token);
    const stream=new WebSocket(url);
    source=stream;
    stream.addEventListener('message',event=>{
      if (source===stream) accept(JSON.parse(event.data));
    });
    stream.onclose=()=>{
      if (source===stream) reconnect();
    };
  } catch {
    reconnect();
  } finally {
    connecting=false;
  }
}

function startPractice(){
  local.add(self,selectedRole+' · 你',0,selectedRole);
  const bots=['运营','测试','组长'].map((role,i)=>local.add('bot'+i,role+' · 陪练',[2,5,7][i],role));
  $('practiceHelp').hidden=false;
  const nextTurn=new Map(bots.map((bot,i)=>[bot.id,1100+i*350]));
  function tick(){
    const state=local.snapshot();
    for (const bot of bots){
      if (state.time<(nextTurn.get(bot.id) || 0) || !bot.hp) continue;
      nextTurn.set(bot.id,state.time+480+Math.random()*450);
      const others=state.players.filter(p=>p.id!==bot.id && p.hp);
      const target=others.sort((a,b)=>Math.hypot(a.x-bot.x,a.y-bot.y)-Math.hypot(b.x-bot.x,b.y-bot.y))[0];
      if (!target) continue;
      const dx=target.x-bot.x, dy=target.y-bot.y, distance=Math.hypot(dx,dy);
      if (distance>1.38){
        local.input(bot.id,{type:'target',x:target.x,y:target.y});
      } else {
        const picks=['slap','punch','kick','guard','jump'];
        local.input(bot.id,{type:'move',x:dx,y:dy});
        local.input(bot.id,{type:'action',action:picks[Math.floor(Math.random()*picks.length)]});
        local.input(bot.id,{type:'move',x:0,y:0});
      }
    }
    local.tick(50);
    accept({...local.snapshot(),self,position:0});
  }
  tick();
  setInterval(tick,50);
}

function sendDirection(){
  let x=0,y=0;
  for (const key of pressed){
    const vector=directionKeys.get(key);
    x+=vector[0];
    y+=vector[1];
  }
  const target=unproject(148+x,52+y);
  const norm=Math.hypot(target.x,target.y) || 1;
  send({type:'move',x:target.x/norm,y:target.y/norm});
}

const arenaTitle=document.title;
function setIdeaOpen(open){
  if (open===ideaOpen) return;
  ideaOpen=open;
  if (open){
    pressed.clear();
    sendDirection();
    if ($('roleDialog').open) $('roleDialog').close();
    $('arenaView').hidden=true;
    IDEPreview.open();
    $('returnArena').focus();
    return;
  }
  IDEPreview.close();
  $('arenaView').hidden=false;
  document.title=arenaTitle;
  if (!selectedRole) $('roleDialog').showModal();
  else $('showIdea').focus();
}

function buildRolePicker(){
  const form=$('roleForm');
  const tones=['#9ed0b8','#e1b37e','#c3a8cd','#90bbce'];
  for (const [i,role] of ROLES.entries()){
    const option=document.createElement('label');
    option.className='role-option';
    option.style.setProperty('--role-tone',tones[i%tones.length]);
    const radio=document.createElement('input');
    radio.className='visually-hidden';
    radio.type='radio';
    radio.name='profession';
    radio.value=role;
    radio.required=true;
    const label=document.createElement('span');
    label.textContent=role;
    option.append(radio,label);
    $('roleChoices').append(option);
  }
  form.addEventListener('change',()=>{
    $('enterFight').disabled=!ROLES.includes(new FormData(form).get('profession'));
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const role=new FormData(form).get('profession');
    if (selectedRole || !ROLES.includes(role)) return;
    selectedRole=role;
    $('roleDialog').close();
    updateHud();
    if (practice) startPractice();
    else connect();
  });
  $('roleDialog').addEventListener('cancel',event=>event.preventDefault());
  $('roleDialog').showModal();
}

$('showIdea').addEventListener('click',()=>setIdeaOpen(true));
$('roleIdea').addEventListener('click',()=>setIdeaOpen(true));
$('returnArena').addEventListener('click',()=>setIdeaOpen(false));

window.addEventListener('keydown',event=>{
  const typing=event.target instanceof HTMLTextAreaElement ||
    (event.target instanceof HTMLInputElement && event.target.type!=='radio');
  const toggle=event.code==='KeyF' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey && !event.isComposing;
  if (toggle || (ideaOpen && event.code==='Escape')){
    event.preventDefault();
    if (!event.repeat) setIdeaOpen(!ideaOpen);
    return;
  }
  if (ideaOpen || !selectedRole || typing) return;
  const action=actionKeys.get(event.code);
  if (event.code==='Space' && event.target instanceof HTMLButtonElement) return;
  if (!action && !directionKeys.has(event.code)) return;
  event.preventDefault();
  if (event.repeat) return;
  if (action) send({type:'action',action});
  else {
    pressed.add(event.code);
    sendDirection();
  }
});
window.addEventListener('keyup',event=>{
  if (pressed.delete(event.code)) sendDirection();
});
window.addEventListener('blur',()=>{
  if (!pressed.size) return;
  pressed.clear();
  sendDirection();
});
window.addEventListener('pagehide',()=>{
  if (practice) return;
  activePage=false;
  clearTimeout(retry);
  const token=session;
  source?.close();
  source=null;
  session=null;
  if (token) post('/leave',{token},true).catch(()=>{});
});
window.addEventListener('pageshow',event=>{
  if (practice || !event.persisted) return;
  activePage=true;
  reconnect();
});

let pointer=null;
function pointTarget(event){
  const rect=canvas.getBoundingClientRect();
  const point=unproject((event.clientX-rect.left)*W/rect.width,(event.clientY-rect.top)*H/rect.height);
  if (point.x>=0 && point.x<=FLOOR.w && point.y>=0 && point.y<=FLOOR.h){
    pressed.clear();
    send({type:'target',x:point.x,y:point.y});
  }
}
canvas.addEventListener('pointerdown',event=>{
  if (event.button!==0 || !event.isPrimary) return;
  pointer={id:event.pointerId,x:event.clientX,y:event.clientY,last:0};
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove',event=>{
  if (!pointer || event.pointerId!==pointer.id || event.pointerType==='touch' ||
      event.timeStamp-pointer.last<110 ||
      Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)<4) return;
  canvas.classList.add('dragging');
  pointer.last=event.timeStamp;
  pointTarget(event);
});
function finishPointer(event){
  if (!pointer || event.pointerId!==pointer.id) return;
  if (event.type==='pointerup') pointTarget(event);
  pointer=null;
  canvas.classList.remove('dragging');
}
canvas.addEventListener('pointerup',finishPointer);
canvas.addEventListener('pointercancel',finishPointer);
canvas.addEventListener('lostpointercapture',finishPointer);

buildScene();
buildControls();
updateHud();
buildRolePicker();
requestAnimationFrame(render);
})();

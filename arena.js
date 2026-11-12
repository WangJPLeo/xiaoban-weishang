(function(root){
'use strict';

const FLOOR = { w:22, h:14.7 };
const ROOMS = [
  { activity:'meeting', name:'会议室', x:0, width:7.4, floor:'#778e80' },
  { activity:'toilet', name:'卫生间', x:7.4, width:6.7, floor:'#889ca6' },
  { activity:'sofa', name:'休息区', x:14.1, width:7.9, floor:'#ae9272' }
];
const CAPACITY = 10;
const ROLES = ['运营','前台','HR','后端开发','前端开发','测试','运维','UI','销售','老板','主管','组长','行政','实习生'];
const VOICE_LINES = ['你的底层逻辑有问题','大煞笔','雷霆打菜','起飞'];
const ACTIONS = {
  slap: { label:'扇巴掌', key:'KeyQ', hint:'Q', duration:480, strike:140, range:1.5, damage:8, arc:.20 },
  voice: { label:'语言攻击', key:'KeyW', hint:'W', duration:1360, strike:230, range:3.2, damage:7, arc:.37 },
  kick: { label:'踢腿', key:'KeyE', hint:'E', duration:780, strike:330, range:2.12, damage:19, arc:.55 },
  guard: { label:'防御', key:'KeyR', hint:'R', duration:1050 },
  bow: { label:'跪拜', key:'KeyD', hint:'D', duration:1120 },
  punch: { label:'出拳', key:'KeyK', hint:'K', duration:560, strike:190, range:1.72, damage:13, arc:.48 },
  jump: { label:'跳跃', key:'Space', hint:'空格', duration:660 }
};
const DESKS = [
  { x:3.15,y:5.37 }, { x:16.15,y:5.37 },
  { x:3.15,y:10.16 }, { x:16.15,y:10.16 }
];

function layout(art={}){
  const { box,table,chair,plant,quad,WALL,DARK,STEEL,WOOD } = art;
  const obstacles = [];
  function fixture(x,y,w,d,draw){
    obstacles.push({x,y,w,d});
    if (art.fixture) art.fixture(x,y,w,d,draw);
  }
  function partition(x,y,w,d,h){
    fixture(x,y,w,d,()=>box(x,y,w,d,0,h,WALL));
  }
  [7.3,14].forEach(function(x){
    partition(x,.18,.2,3.85,1.72);
  });
  ROOMS.forEach(function(room){
    var x = room.x+.16, y = 4, gap = room.width/2;
    partition(x,y,gap-.7,.17,.54);
    partition(x+gap+.6,y,room.width-gap-.76,.17,.54);
  });

  fixture(1.8,1.3,3.55,1.14,function(){
    table(1.8,1.3,3.55,1.14);
    var paper = ['#dedccb','#b0bbae','#89988d'];
    box(2.2,1.53,.55,.3,.92,.035,paper);
    quad(2.28,1.59,.28,.035,.96,'#87948e');
    quad(2.28,1.68,.36,.035,.96,'#9ba69b');
    box(3.16,1.76,.5,.32,.92,.02,paper);
    box(3.9,1.59,.62,.32,.92,.045,DARK);
    box(4.67,1.76,.22,.18,.92,.16,STEEL);
  });
  [[2.25,.6],[3.9,.6],[.99,1.63],[2.36,2.61],[4.04,2.61]].forEach(function(p){
    fixture(p[0],p[1],.64,.53,function(){ chair(p[0],p[1],p[1]>2); });
  });
  fixture(6.49,.42,.54,.55,function(){ plant(6.52,.48,1.13); });

  fixture(7.75,.33,1.44,.84,function(){
    box(7.75,.33,1.44,.84,0,.75,STEEL);
    box(7.72,.32,1.5,.91,.74,.13,['#e2e8d6','#b4c7bc','#819d9a']);
    box(8.04,.54,.72,.46,.86,.02,['#95aeaa','#738f8d','#536e72']);
    box(8.36,.45,.11,.12,.86,.23,STEEL);
  });
  [9.65,11.65].forEach(function(x){
    var ceramic = ['#eff0e7','#c9d3cc','#9baead'];
    partition(x,.38,1.53,.12,1.53);
    partition(x+1.43,.5,.12,1.49,1.52);
    fixture(x+.28,.55,.75,.97,function(){
      box(x+.39,.84,.51,.5,0,.39,STEEL);
      box(x+.28,.54,.75,.34,.37,.46,ceramic);
      box(x+.34,.61,.56,.16,.83,.035,ceramic);
      quad(x+.83,.65,.12,.07,.87,'#718e94');
      box(x+.27,.85,.74,.68,.35,.22,ceramic);
      quad(x+.38,.96,.53,.47,.575,'#738b90');
      quad(x+.47,1.02,.37,.29,.58,'#90b6b9');
      quad(x+.32,1.44,.63,.047,.581,'#ffffff80');
    });
  });
  fixture(13.04,2.54,.47,.46,function(){ box(13.04,2.54,.47,.46,0,.51,DARK); });

  fixture(14.6,.43,2.65,.67,function(){
    box(14.6,.43,2.65,.67,0,.78,WOOD);
    box(15.26,.51,.65,.48,.78,.48,DARK);
    box(15.39,.89,.35,.12,1,.09,STEEL);
    box(16.22,.65,.24,.21,.78,.17,STEEL);
    box(16.55,.62,.2,.21,.78,.13,STEEL);
  });
  fixture(18.25,.46,2.82,1.12,function(){
    var frame = ['#86956e','#637553','#495e48'];
    var cushion = ['#a4b086','#7d8d69','#617654'];
    box(18.33,.65,2.63,.85,0,.18,DARK);
    box(18.25,.46,2.82,1.12,.12,.32,frame);
    box(18.25,.46,2.82,.26,.4,.66,frame);
    box(18.50,.53,1.11,.16,.57,.40,cushion);
    box(19.66,.53,1.15,.16,.57,.40,cushion);
    box(18.51,.74,1.11,.74,.41,.10,cushion);
    box(19.66,.74,1.15,.74,.41,.10,cushion);
    box(18.25,.72,.25,.86,.43,.28,frame);
    box(20.82,.72,.25,.86,.43,.28,frame);
    box(18.56,.83,.43,.44,.51,.13,['#dac195','#a88762','#80654b']);
    quad(18.61,.87,.33,.03,.65,'#eed6a2');
  });
  fixture(20.83,2.6,.62,.54,function(){ plant(20.94,2.65,1.15); });
  fixture(16.88,1.9,1.36,.68,function(){
    box(16.88,1.9,1.36,.68,0,.4,WOOD);
    box(17.14,2.11,.5,.23,.4,.06,['#a7b9bb','#769495','#527077']);
  });
  fixture(.61,6.15,.75,.76,function(){
    box(.61,6.15,.75,.76,0,.77,STEEL);
    box(.61,6.15,.75,.76,.77,.27,DARK);
    box(.74,6.3,.47,.35,1.04,.045,['#e6e4cc','#b9c9bd','#93a49b']);
  });
  fixture(.6,11.6,.68,.63,function(){ plant(.76,11.72,1.28); });
  fixture(20.56,9.54,.62,.61,function(){ plant(20.65,9.65,1.28); });
  fixture(20.61,5.27,.59,.65,function(){
    box(20.61,5.27,.59,.65,0,.8,STEEL);
    box(20.71,5.36,.38,.44,.8,.55,['#8fc5c5','#68a1aa','#4f7b87']);
  });
  DESKS.forEach(({x,y})=>{
    fixture(x,y,2.84,1.07,()=>art.desk(x,y));
    fixture(x+1.02,y+1.83,.64,.53,()=>chair(x+1.02,y+1.83,true));
  });
  return obstacles;
}

const obstacles = layout();
const spawns = [
  [7,6],[9.4,6],[12.1,6],[14.6,6],[7,9.4],
  [14.6,9.4],[7,12.6],[9.4,12.6],[12.1,12.6],[14.6,12.6]
];
const STEP = .48;
const COLS = Math.floor(FLOOR.w/STEP);
const ROWS = Math.floor(FLOOR.h/STEP);
const grid = [];

function canStand(x,y){
  const pad=.21;
  return x>=.29 && y>=.29 && x<=FLOOR.w-.29 && y<=FLOOR.h-.29 &&
    !obstacles.some(o=>x>o.x-pad && x<o.x+o.w+pad && y>o.y-pad && y<o.y+o.d+pad);
}

function clearWalk(a,b){
  const steps = Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/.18);
  for (let i=1;i<=steps;i++){
    if (!canStand(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps)) return false;
  }
  return true;
}

for (let row=0;row<ROWS;row++){
  for (let col=0;col<COLS;col++){
    const x=(col+.5)*STEP, y=(row+.5)*STEP;
    grid.push({ x,y,row,col,open:canStand(x,y),links:[] });
  }
}
for (const node of grid){
  if (!node.open) continue;
  for (let dx=-1;dx<=1;dx++){
    for (let dy=-1;dy<=1;dy++){
      if ((!dx && !dy) || node.col+dx<0 || node.col+dx>=COLS) continue;
      const next=grid[(node.row+dy)*COLS+node.col+dx];
      if (next?.open && clearWalk(node,next)) node.links.push(next);
    }
  }
}

function nearestNode(point, connected){
  let best=null, bestDistance=Infinity;
  for (const node of grid){
    if (!node.open) continue;
    const distance=(point.x-node.x)**2+(point.y-node.y)**2;
    if (distance<bestDistance && (!connected || clearWalk(point,node))){
      best=node;
      bestDistance=distance;
    }
  }
  return best;
}

function findPath(start,target){
  const legal = canStand(target.x,target.y);
  if (legal && clearWalk(start,target)) return [target];
  const source=nearestNode(start,true), goal=nearestNode(target,legal);
  if (!source || !goal) return [];
  const open=[source], cameFrom=new Map(), costs=new Map([[source,0]]);
  const estimates=new Map([[source,Math.hypot(goal.x-source.x,goal.y-source.y)]]);
  while (open.length){
    let best=0;
    for (let i=1;i<open.length;i++){
      if (estimates.get(open[i])<estimates.get(open[best])) best=i;
    }
    let node=open.splice(best,1)[0];
    if (node===goal){
      const path=[node];
      while(cameFrom.has(node)){
        node=cameFrom.get(node);
        path.push(node);
      }
      path.reverse();
      if (legal) path.push(target);
      const route=[];
      let anchor=start;
      while(path.length){
        let index=path.length-1;
        while(index>0 && !clearWalk(anchor,path[index])) index--;
        anchor=path[index];
        route.push(anchor);
        path.splice(0,index+1);
      }
      return route;
    }
    for (const next of node.links){
      const cost=costs.get(node)+Math.hypot(next.x-node.x,next.y-node.y);
      if (costs.has(next) && costs.get(next)<=cost) continue;
      costs.set(next,cost);
      cameFrom.set(next,node);
      estimates.set(next,cost+Math.hypot(goal.x-next.x,goal.y-next.y));
      if (!open.includes(next)) open.push(next);
    }
  }
  return [];
}

function heightAt(fighter,time){
  if (fighter.action!=='jump') return 0;
  const progress=Math.min(1,Math.max(0,(time-fighter.actionAt)/ACTIONS.jump.duration));
  return Math.sin(progress*Math.PI)*1.45;
}

function createMatch(){
  const players = new Map();
  let time=0;
  let events=[];

  function spawn(fighter){
    const candidates=[spawns[fighter.color],...spawns];
    const safe=candidates.find(([x,y])=>[...players.values()].every(other=>
      other===fighter || !other.hp || Math.hypot(x-other.x,y-other.y)>1.25)) || candidates[0];
    [fighter.x,fighter.y]=safe;
    Object.assign(fighter,{ hp:100,dx:1,dy:0,action:'idle',actionAt:time,
      vx:0,vy:0,path:[],target:null,moving:false,safeUntil:time+1000,struck:false });
  }

  function add(id,name,color,role){
    const fighter={ id,name,color,role,score:0,voiceIndex:0,line:null };
    spawn(fighter);
    players.set(id,fighter);
    return fighter;
  }

  function canMoveTo(fighter,x,y){
    if (!canStand(x,y)) return false;
    for (const other of players.values()){
      if (other===fighter || !other.hp) continue;
      const gap=(x-other.x)**2+(y-other.y)**2;
      if (gap<.51**2 && gap<(fighter.x-other.x)**2+(fighter.y-other.y)**2) return false;
    }
    return true;
  }

  function move(fighter,dt){
    fighter.moving=false;
    if (!fighter.hp || ['slap','punch','kick','bow','voice','hurt'].includes(fighter.action)) return;
    let x=fighter.vx, y=fighter.vy, distance=Infinity;
    while (!x && !y && fighter.path.length){
      const next=fighter.path[0];
      distance=Math.hypot(next.x-fighter.x,next.y-fighter.y);
      if (distance>.045){
        x=(next.x-fighter.x)/distance;
        y=(next.y-fighter.y)/distance;
        break;
      }
      fighter.path.shift();
    }
    if (!x && !y){
      fighter.target=null;
      return;
    }
    const n=Math.hypot(x,y);
    fighter.dx=x/n;
    fighter.dy=y/n;
    const speed=fighter.action==='guard' ? 1.85 : fighter.action==='jump' ? 4.55 : 4.05;
    const step=Math.min(distance,dt*speed);
    const tx=fighter.x+fighter.dx*step, ty=fighter.y+fighter.dy*step;
    if (canMoveTo(fighter,tx,ty)){
      fighter.x=tx;
      fighter.y=ty;
      fighter.moving=true;
    } else if (tx!==fighter.x && canMoveTo(fighter,tx,fighter.y)){
      fighter.x=tx;
      fighter.moving=true;
    } else if (ty!==fighter.y && canMoveTo(fighter,fighter.x,ty)){
      fighter.y=ty;
      fighter.moving=true;
    }
  }

  function input(id,command){
    const fighter=players.get(id);
    if (!fighter?.hp || !command || typeof command!=='object') return;
    if (command.type==='move' && Number.isFinite(command.x) && Number.isFinite(command.y)){
      fighter.vx=Math.min(1,Math.max(-1,command.x));
      fighter.vy=Math.min(1,Math.max(-1,command.y));
      fighter.path=[];
      fighter.target=null;
    } else if (command.type==='target' && Number.isFinite(command.x) && Number.isFinite(command.y) &&
      command.x>=0 && command.x<=FLOOR.w && command.y>=0 && command.y<=FLOOR.h){
      const target={x:command.x,y:command.y};
      fighter.vx=0;
      fighter.vy=0;
      fighter.path=findPath(fighter,target);
      fighter.target=fighter.path.at(-1) || null;
    } else if (command.type==='action' && typeof command.action==='string' && Object.hasOwn(ACTIONS,command.action) && fighter.action==='idle'){
      const next=fighter.path[0];
      const x=fighter.vx || (next && next.x-fighter.x) || 0;
      const y=fighter.vy || (next && next.y-fighter.y) || 0;
      if (x || y){
        const length=Math.hypot(x,y);
        fighter.dx=x/length;
        fighter.dy=y/length;
      }
      fighter.action=command.action;
      if (command.action==='voice') fighter.line=VOICE_LINES[fighter.voiceIndex++%VOICE_LINES.length];
      fighter.actionAt=time;
      fighter.struck=false;
    }
  }

  function strike(fighter,move){
    let target=null, closest=move.range;
    for (const other of players.values()){
      if (other===fighter || !other.hp || other.safeUntil>time || (move!==ACTIONS.voice && heightAt(other,time)>.48)) continue;
      const dx=other.x-fighter.x, dy=other.y-fighter.y, distance=Math.hypot(dx,dy);
      if (distance>closest || (distance>.25 && dx*fighter.dx+dy*fighter.dy<distance*move.arc)) continue;
      if (!clearWalk(fighter,other)) continue;
      target=other;
      closest=distance;
    }
    if (!target) return;
    const front=(fighter.x-target.x)*target.dx+(fighter.y-target.y)*target.dy>=-.1;
    const blocked=target.action==='guard' && front;
    const damage=blocked ? Math.ceil(move.damage*.22) : move.damage;
    target.hp=Math.max(0,target.hp-damage);
    const kind=!target.hp ? 'ko' : blocked ? 'guard' : 'hit';
    events.push({ x:target.x,y:target.y,kind,damage,t:time });
    if (!target.hp){
      fighter.score++;
      Object.assign(target,{ action:'ko',actionAt:time,spawnAt:time+2300,moving:false,path:[],target:null });
    } else if (!blocked){
      Object.assign(target,{ action:'hurt',actionAt:time,moving:false });
      const x=target.x+fighter.dx*.25,y=target.y+fighter.dy*.25;
      if (canStand(x,y)){
        target.x=x;
        target.y=y;
      }
    }
  }

  function tick(ms){
    time+=ms;
    events=events.filter(event=>time-event.t<620);
    for (const fighter of players.values()){
      if (!fighter.hp){
        if (time>=fighter.spawnAt) spawn(fighter);
        continue;
      }
      const moveDef=ACTIONS[fighter.action];
      const elapsed=time-fighter.actionAt;
      if ((moveDef && elapsed>=moveDef.duration) || (fighter.action==='hurt' && elapsed>=210)){
        fighter.action='idle';
        fighter.actionAt=time;
      }
      move(fighter,ms/1000);
    }
    for (const fighter of players.values()){
      const moveDef=ACTIONS[fighter.action];
      if (!fighter.hp || !moveDef?.strike || fighter.struck || time-fighter.actionAt<moveDef.strike) continue;
      fighter.struck=true;
      strike(fighter,moveDef);
    }
  }

  function snapshot(){
    return { time,events,players:[...players.values()].map(p=>({
      id:p.id,name:p.name,color:p.color,role:p.role,x:p.x,y:p.y,dx:p.dx,dy:p.dy,hp:p.hp,score:p.score,
      action:p.action,actionAt:p.actionAt,moving:p.moving,target:p.target,safeUntil:p.safeUntil,
      line:p.action==='voice' ? p.line : null
    })) };
  }

  return { players, add, input, tick, snapshot, remove:id=>players.delete(id) };
}

const api={ FLOOR,ROOMS,CAPACITY,ACTIONS,ROLES,VOICE_LINES,layout,canStand,heightAt,createMatch };
if (typeof module!=='undefined' && module.exports) module.exports=api;
else root.Arena=api;
})(globalThis);

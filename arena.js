(function(root){
'use strict';

const FLOOR={w:46,h:29};
const BASES=[{x:3.55,y:14.5},{x:42.45,y:14.5}];
const LANES=[
  [[3.55,14.5],[6,10],[9,4.7],[15,3.8],[23,3.8],[31,3.8],[37,4.7],[40,10],[42.45,14.5]],
  [[3.55,14.5],[9,14.5],[17,14.5],[23,14.5],[29,14.5],[37,14.5],[42.45,14.5]],
  [[3.55,14.5],[6,19],[9,24.3],[15,25.2],[23,25.2],[31,25.2],[37,24.3],[40,19],[42.45,14.5]]
].map(lane=>lane.map(([x,y])=>({x,y})));
const CLIFFS=[
  [10.5,8.3,5.2,3.1],[17,7,2.7,3.7],[25.7,7.7,3.5,3.3],[31,8.2,4.7,3.1],
  [10.5,18,5.2,3],[17,18.8,2.7,3.7],[25.7,18,3.5,3.3],[31,18,4.7,3.1]
];
const TOWERS=LANES.flatMap((_,lane)=>[0,1].map(team=>({
  id:'tower-'+lane+'-'+team,team,lane,kind:'tower',x:team===0 ? 14 : 32,
  y:[4.25,14.5,24.75][lane],hp:140,maxHp:140
})));
const CORES=BASES.map((base,team)=>({...base,id:'core-'+team,team,kind:'core',hp:220,maxHp:220}));
const createStructures=()=>[...TOWERS,...CORES].map(s=>({...s,nextAttack:0}));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

const CAPACITY = 10;
const ROLES = ['运营','前台','HR','后端开发','前端开发','测试','运维','UI','销售','老板','主管','组长','行政','实习生'];
const NICKNAME_LIMIT = 16;
const VOICE_LINES = [
  '你的底层逻辑有问题','大煞笔','雷霆打菜','起飞',
  '菜成这样还敢来开会？','你这操作，狗看了都摇头',
  '别甩锅了，锅都嫌你菜','你他妈是来给对面冲业绩的吧？',
  '你打的是擂台还是退休申请？','你这走位，闭眼打都能中',
  '这水平还敢带队？散会！','你这拳是走审批了吗？',
  '你这操作，回收站都拒收','别复盘了，直接删录像',
  '你这战绩，PPT都救不回来','你这输出，绩效都不好意思给分',
  '你这方案唯一的亮点是撤回键','你打半天，伤害全在自己人身上',
  '你这破走位，打印机卡纸都比你流畅','我防你干嘛？你自己都打不中'
];

function parseNickname(value){
  if (typeof value!=='string') return null;
  const name=value.trim();
  if ([...name].length>NICKNAME_LIMIT || !/[\p{L}\p{N}\p{P}\p{S}]/u.test(name) ||
      /[\p{Cc}\p{Bidi_Control}\p{Zl}\p{Zp}]/u.test(name)) return null;
  return name;
}
const ACTIONS = {
  punch: { label:'迅击', key:'KeyQ', hint:'Q', duration:560, strike:190, range:1.72, damage:13, arc:.48 },
  voice: { label:'语言攻击', key:'KeyW', hint:'W', duration:1360, strike:230, range:3.2, damage:7, arc:.37 },
  kick: { label:'腾空踢', key:'KeyE', hint:'E', duration:780, strike:330, range:2.36, damage:19, arc:.55 },
  ultimate: { label:'职业大招', key:'KeyR', hint:'R', duration:1150, strike:460 }
};
const ULTIMATES={
  '运营':{label:'全域投放',radius:4.4,damage:20,slow:1800,cooldown:32000},
  '前台':{label:'来客止步',radius:3.7,damage:14,stun:1450,cooldown:33000},
  'HR':{label:'绩效面谈',radius:4.8,damage:42,single:true,cooldown:30000},
  '后端开发':{label:'线程风暴',radius:4.3,damage:33,cooldown:34000},
  '前端开发':{label:'界面重绘',radius:3.5,damage:28,dash:2.8,cooldown:31000},
  '测试':{label:'回归锁定',radius:5.1,damage:12,stun:1950,cooldown:37000},
  '运维':{label:'紧急回滚',radius:5,heal:33,cooldown:36000},
  'UI':{label:'视觉结界',radius:4.2,shield:34,cooldown:34000},
  '销售':{label:'强势成交',radius:4.6,damage:27,pull:1.2,cooldown:33000},
  '老板':{label:'拍板定案',radius:5.8,damage:28,stun:750,cooldown:41000},
  '主管':{label:'全员集结',radius:5.6,heal:15,haste:3500,cooldown:35000},
  '组长':{label:'破阵带队',radius:3.6,damage:22,shield:22,dash:1.8,cooldown:36000},
  '行政':{label:'后勤补给',radius:5.2,heal:20,shield:15,cooldown:38000},
  '实习生':{label:'超频冲刺',radius:2.9,damage:37,dash:3.7,cooldown:30000}
};
const ECLIPSE={label:'全场清空',global:true,cooldown:60000};
function ultimateFor(hero){
  if(hero?.name?.includes('柴') && hero.name.includes('杰')) return ECLIPSE;
  return Object.hasOwn(ULTIMATES,hero?.role) ? ULTIMATES[hero.role] : ULTIMATES['运营'];
}
const obstacles=CLIFFS.map(([x,y,w,d])=>({x,y,w,d}));
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
  if (fighter.action!=='kick') return 0;
  const progress=Math.min(1,Math.max(0,(time-fighter.actionAt)/ACTIONS.kick.duration));
  return Math.sin(progress*Math.PI)*.62;
}

function createMatch(){
  const players=new Map();
  const units=new Map();
  let structures=createStructures();
  let time=0, nextWave=1200, unitId=0, winner=null, restartAt=0, events=[];

  function spawn(fighter){
    const side=fighter.team===0 ? 1 : -1;
    const base=BASES[fighter.team];
    const positions=Array.from({length:5},(_,i)=>{
      const slot=(fighter.color+i)%5;
      return {x:base.x+side*(1.64+slot%2*.7),y:base.y+(slot-2)*.89};
    });
    const spawnPoint=positions.find(p=>[...players.values()].every(other=>other===fighter || !other.hp || distance(other,p)>.6)) || positions[0];
    Object.assign(fighter,{...spawnPoint,
      hp:100,maxHp:100,dx:side,dy:0,action:'idle',actionAt:time,vx:0,vy:0,path:[],target:null,
      focus:null,moving:false,shield:0,shieldUntil:0,slowUntil:0,stunUntil:0,hasteUntil:0,safeUntil:time+1500,struck:false,nextAuto:time,nextAI:time,nextChase:time});
  }

  function add(id,name,color,role,bot=false){
    const fighter={id,name,color,role,team:color%2,bot,kind:'hero',score:0,voiceIndex:0,line:null,nextAI:0,ultimateReadyAt:0};
    spawn(fighter);
    players.set(id,fighter);
    return fighter;
  }

  function addHuman(id,name,role){
    const humans=[...players.values()].filter(hero=>!hero.bot);
    if(humans.length>=CAPACITY) return null;
    const blue=humans.filter(hero=>hero.team===0).length;
    const team=blue<=humans.length-blue ? 0 : 1;
    const taken=new Set(humans.map(hero=>hero.color));
    let color=team;
    while(taken.has(color)) color+=2;
    const bot=[...players.values()].find(hero=>hero.bot && hero.color===color);
    if(bot) players.delete(bot.id);
    return add(id,name,color,role);
  }

  function fillTeams(){
    const heroes=[...players.values()];
    if(!heroes.some(hero=>!hero.bot)){
      if(heroes.length){
        players.clear();
        reset();
      }
      return;
    }
    const used=new Set(heroes.map(hero=>hero.color));
    const roles=['运营','测试','组长','运维','前台'];
    for(let color=0;color<CAPACITY;color++){
      if(used.has(color)) continue;
      const role=roles[color%roles.length];
      add('bot-'+color,'电脑 '+role,color,role,true);
    }
  }

  function setTarget(fighter,target){
    fighter.vx=0;
    fighter.vy=0;
    fighter.path=findPath(fighter,target);
    fighter.target=fighter.path.at(-1) || null;
  }

  function face(fighter,target){
    const dx=target.x-fighter.x,dy=target.y-fighter.y,distance=Math.hypot(dx,dy);
    if (distance>.001){ fighter.dx=dx/distance; fighter.dy=dy/distance; }
    return distance;
  }

  function action(fighter,name){
    fighter.action=name;
    fighter.actionAt=time;
    fighter.struck=false;
    if (name==='voice') fighter.line=VOICE_LINES[fighter.voiceIndex++%VOICE_LINES.length];
  }

  function input(id,command){
    const f=players.get(id);
    if (winner!==null || !f?.hp || !command || typeof command!=='object') return;
    if (command.type==='move' && Number.isFinite(command.x) && Number.isFinite(command.y)){
      f.vx=Math.max(-1,Math.min(1,command.x));
      f.vy=Math.max(-1,Math.min(1,command.y));
      f.path=[];
      f.target=null;
      f.focus=null;
    } else if (command.type==='target' && Number.isFinite(command.x) && Number.isFinite(command.y) &&
      command.x>=0 && command.x<=FLOOR.w && command.y>=0 && command.y<=FLOOR.h){
      f.focus=null;
      setTarget(f,{x:command.x,y:command.y});
    } else if (command.type==='focus' && typeof command.id==='string'){
      const target=enemyById(f,command.id);
      if (target){
        f.focus=target.id;
        f.nextChase=0;
      }
    } else if (command.type==='action' && typeof command.action==='string' && Object.hasOwn(ACTIONS,command.action) && f.action==='idle' && !(f.stunUntil>time)){
      if(command.action==='ultimate'){
        if(f.ultimateReadyAt>time) return;
        f.ultimateReadyAt=time+ultimateFor(f).cooldown;
      }
      const target=enemyById(f,f.focus) || f.path[0];
      if (target) face(f,target);
      else if (f.vx || f.vy) face(f,{x:f.x+f.vx,y:f.y+f.vy});
      action(f,command.action);
    }
  }

  function enemyById(f,id){
    const target=players.get(id) || units.get(id) || structures.find(s=>s.id===id);
    return target && target.team!==f.team && target.hp>0 ? target : null;
  }

  function move(f,dt){
    f.moving=false;
    if (f.action!=='idle' || f.stunUntil>time) return;
    let target=f.path[0];
    while (target && distance(f,target)<.09){
      f.path.shift();
      target=f.path[0];
    }
    if (f.vx || f.vy) target={x:f.x+f.vx,y:f.y+f.vy};
    if (!target){ f.target=null; return; }
    const remaining=face(f,target);
    const step=Math.min(remaining,dt*(f.slowUntil>time ? 2.65 : f.hasteUntil>time ? 6.25 : 4.85));
    const x=f.x+f.dx*step,y=f.y+f.dy*step;
    if (canStand(x,y)){ f.x=x; f.y=y; f.moving=true; }
    else if (canStand(x,f.y) && x!==f.x){ f.x=x; f.moving=true; }
    else if (canStand(f.x,y) && y!==f.y){ f.y=y; f.moving=true; }
  }

  function protectedCore(target){
    return target.kind==='core' && structures.some(s=>s.team===target.team && s.kind==='tower' && s.hp>0);
  }

  function defeat(source,target,credit=true){
    target.hp=0;
    if(target.kind==='core'){
      winner=source.team;
      restartAt=time+10000;
    }else if(target.kind==='hero'){
      if(credit && source.kind==='hero' && source.team!==target.team) source.score++;
      Object.assign(target,{action:'ko',actionAt:time,spawnAt:time+5300,moving:false,path:[],target:null});
    }else if(target.kind==='minion') units.delete(target.id);
  }

  function damage(source,target,amount,kind){
    if(!target.hp || target.safeUntil>time || winner!==null) return;
    const immune=protectedCore(target);
    const absorbed=target.shieldUntil>time ? Math.min(amount,target.shield) : 0;
    if(absorbed) target.shield-=absorbed;
    const actual=immune ? 0 : Math.min(target.hp,amount-absorbed);
    target.hp-=actual;
    events.push({x:target.x,y:target.y,fromX:source.x,fromY:source.y,team:source.team,
      kind:immune || !actual ? 'shield' : !target.hp ? 'ko' : kind,damage:actual,t:time});
    if(!target.hp) defeat(source,target);
    else if(target.kind==='hero' && actual && kind!=='bolt' && target.action!=='ultimate'){
      target.action='hurt';
      target.actionAt=time;
    }
  }

  function displace(actor,dx,dy){
    const length=Math.hypot(dx,dy);
    const steps=Math.ceil(length/.2);
    for(let i=0;i<steps;i++){
      const x=actor.x+dx/steps,y=actor.y+dy/steps;
      if(!canStand(x,y)) break;
      actor.x=x;
      actor.y=y;
    }
  }

  function unleash(f){
    const skill=ultimateFor(f);
    events.push({x:f.x,y:f.y,team:f.team,kind:skill.global?'eclipse':'ultimate',label:skill.label,radius:skill.radius,t:time});
    if(skill.global){
      for(const hero of players.values()) if(hero.hp) defeat(f,hero,false);
      return;
    }
    if(skill.dash) displace(f,f.dx*skill.dash,f.dy*skill.dash);
    const allies=[...players.values()].filter(hero=>hero.hp && hero.team===f.team && distance(f,hero)<=skill.radius);
    for(const ally of allies){
      if(skill.heal) ally.hp=Math.min(ally.maxHp,ally.hp+skill.heal);
      if(skill.shield){
        ally.shield=Math.max(ally.shieldUntil>time?ally.shield:0,skill.shield);
        ally.shieldUntil=time+4600;
      }
      if(skill.haste) ally.hasteUntil=time+skill.haste;
    }
    if(!skill.damage) return;
    const enemies=[...players.values(),...units.values()].filter(hero=>hero.hp && hero.team!==f.team &&
      !(hero.safeUntil>time) && distance(f,hero)<=skill.radius && clearWalk(f,hero));
    enemies.sort((a,b)=>Number(b.kind==='hero')-Number(a.kind==='hero') || distance(f,a)-distance(f,b));
    for(const enemy of skill.single?enemies.slice(0,1):enemies){
      damage(f,enemy,skill.damage,'magic');
      if(!enemy.hp || enemy.kind!=='hero') continue;
      if(skill.stun) enemy.stunUntil=Math.max(enemy.stunUntil,time+skill.stun);
      if(skill.slow) enemy.slowUntil=Math.max(enemy.slowUntil,time+skill.slow);
      if(skill.pull){
        const d=distance(f,enemy) || 1;
        const ratio=Math.min(skill.pull,Math.max(0,d-.55))/d;
        displace(enemy,(f.x-enemy.x)*ratio,(f.y-enemy.y)*ratio);
      }
    }
  }

  function strike(f,move){
    let target=null, closest=Infinity;
    const focused=enemyById(f,f.focus);
    for (const other of focused ? [focused,...players.values(),...units.values(),...structures] : [...players.values(),...units.values(),...structures]){
      if (other.team===f.team || !other.hp || other.safeUntil>time ||
        (move!==ACTIONS.voice && heightAt(other,time)>.48)) continue;
      const d=distance(f,other),reach=move.range+(other.kind==='core' ? .9 : other.kind==='tower' ? .48 : 0);
      if (d>reach || d>=closest || (d>.25 && (other.x-f.x)*f.dx+(other.y-f.y)*f.dy<d*move.arc)) continue;
      if (!clearWalk(f,other)) continue;
      target=other;
      closest=d;
      if (other===focused) break;
    }
    if (target) damage(f,target,move.damage,f.action==='voice' ? 'magic' : 'hit');
  }

  function wave(){
    for (let lane=0;lane<LANES.length;lane++){
      for (const team of [0,1]){
        const path=team===0 ? LANES[lane] : LANES[lane].slice().reverse();
        for (let i=0;i<3;i++){
          const id='minion-'+(++unitId);
          const offset=(i-1)*.52;
          const route=path.map(p=>({x:p.x,y:p.y+offset}));
          units.set(id,{ id,team,lane,kind:'minion',ranged:i===2,x:route[0].x,y:route[0].y,
            dx:team===0?1:-1,dy:0,route,step:1,hp:27,maxHp:27,nextAttack:time+i*120,moving:true });
        }
      }
    }
  }

  function nearest(f,targets,range){
    let best=null;
    for (const target of targets){
      if (target.team===f.team || !target.hp || target.safeUntil>time) continue;
      const d=distance(f,target);
      if (d<=range && clearWalk(f,target)){ range=d; best=target; }
    }
    return best;
  }

  function minions(dt){
    const living=[...units.values()];
    for (const unit of living){
      if (!unit.hp) continue;
      const reach=unit.ranged ? 2.6 : 1.12;
      const enemies=[...living.filter(u=>u.lane===unit.lane),...players.values(),...structures.filter(s=>s.lane===unit.lane || s.kind==='core')];
      const target=nearest(unit,enemies,reach) || nearest(unit,enemies,reach+1.35);
      unit.moving=false;
      if (target && face(unit,target)<=reach){
        if (time>=unit.nextAttack){
          damage(unit,target,unit.ranged ? 4 : 5,unit.ranged ? 'bolt' : 'hit');
          unit.nextAttack=time+960;
        }
        continue;
      }
      const point=target || unit.route[unit.step];
      if (!point) continue;
      const remaining=face(unit,point);
      if (!target && remaining<.16){ unit.step++; continue; }
      const step=Math.min(dt*2.55,remaining);
      const x=unit.x+unit.dx*step,y=unit.y+unit.dy*step;
      if (canStand(x,y)){ unit.x=x; unit.y=y; unit.moving=true; }
      else if (!target) unit.step++;
    }
  }

  function controlBot(f){
    if (!f.bot || time<f.nextAI || f.action!=='idle' || f.stunUntil>time) return;
    f.nextAI=time+350+Math.random()*300;
    const targets=[...units.values(),...players.values()];
    const local=nearest(f,targets,5.2);
    const lane=f.color%3;
    const objective=structures.find(s=>s.team!==f.team && s.kind==='tower' && s.lane===lane && s.hp) ||
      structures.find(s=>s.team!==f.team && s.kind==='tower' && s.hp) ||
      structures.find(s=>s.team!==f.team && s.kind==='core');
    const skill=ultimateFor(f);
    const hasTarget=local && distance(f,local)<=skill.radius;
    const needsSupport=(skill.heal || skill.shield || skill.haste) && [...players.values()].some(hero=>
      hero.team===f.team && hero.hp>0 && hero.hp<=70 && distance(f,hero)<=skill.radius);
    if(f.ultimateReadyAt<=time && ((skill.damage && hasTarget) || needsSupport)){
      if(hasTarget) f.focus=local.id;
      input(f.id,{type:'action',action:'ultimate'});
      return;
    }
    f.focus=(local || objective)?.id;
    f.nextChase=0;
  }

  function chase(f){
    if (!f.focus || f.action!=='idle') return;
    const target=enemyById(f,f.focus);
    if (!target){
      f.focus=null;
      f.path=[];
      f.target=null;
      return;
    }
    const reach=target.kind==='core' ? 2.3 : target.kind==='tower' ? 1.95 : 1.5;
    if (distance(f,target)<=reach && clearWalk(f,target)){
      f.path=[];
      f.target=null;
      f.vx=0;
      f.vy=0;
      face(f,target);
      if (time>=f.nextAuto && !(f.stunUntil>time)){ action(f,'punch'); f.nextAuto=time+720; }
    } else if (time>=(f.nextChase || 0)){
      setTarget(f,target);
      f.nextChase=time+380;
    }
  }

  function reset(){
    structures=createStructures();
    units.clear();
    winner=null;
    nextWave=time+1200;
    for (const f of players.values()){ f.score=0; spawn(f); }
  }

  function tick(ms){
    time+=ms;
    events=events.filter(e=>time-e.t<700);
    if (!players.size) return;
    if (winner!==null){
      if (time>=restartAt) reset();
      return;
    }
    if (time>=nextWave){
      if (units.size<=72) wave();
      nextWave=time+13500;
    }
    for (const f of players.values()){
      if (!f.hp){ if (time>=f.spawnAt) spawn(f); continue; }
      const moveDef=ACTIONS[f.action], elapsed=time-f.actionAt;
      if ((moveDef && elapsed>=moveDef.duration) || (f.action==='hurt' && elapsed>=210)) action(f,'idle');
      if (distance(f,BASES[f.team])<3.15) f.hp=Math.min(f.maxHp,f.hp+ms*.015);
      controlBot(f);
      chase(f);
      move(f,ms/1000);
      const attack=ACTIONS[f.action];
      if (attack?.strike && !f.struck && time-f.actionAt>=attack.strike){
        f.struck=true;
        if(f.action==='ultimate') unleash(f);
        else strike(f,attack);
      }
    }
    if (winner!==null) return;
    minions(ms/1000);
    for (const tower of structures){
      if (tower.kind!=='tower' || !tower.hp || time<tower.nextAttack) continue;
      const target=nearest(tower,units.values(),4.6) || nearest(tower,players.values(),4.6);
      if (!target) continue;
      damage(tower,target,13,'bolt');
      tower.nextAttack=time+1070;
    }
  }

  function snapshot(){
    return {time,events,winner,restartAt,units:[...units.values()].map(({route,step,nextAttack,...u})=>u),
      structures:structures.map(({nextAttack,...s})=>s),
      players:[...players.values()].map(p=>({
        id:p.id,name:p.name,color:p.color,role:p.role,team:p.team,bot:p.bot,kind:p.kind,x:p.x,y:p.y,dx:p.dx,dy:p.dy,
        hp:p.hp,maxHp:p.maxHp,score:p.score,action:p.action,actionAt:p.actionAt,moving:p.moving,target:p.target,
        safeUntil:p.safeUntil,spawnAt:p.spawnAt,ultimateReadyAt:p.ultimateReadyAt,shield:p.shieldUntil>time?p.shield:0,line:p.action==='voice' ? p.line : null
      })) };
  }

  return {players,add,addHuman,fillTeams,input,tick,snapshot,remove(id){
    players.delete(id);
    if (!players.size) reset();
  }};
}

const api={ FLOOR,BASES,LANES,CLIFFS,TOWERS,CORES,CAPACITY,ACTIONS,ROLES,NICKNAME_LIMIT,VOICE_LINES,parseNickname,ultimateFor,canStand,heightAt,createMatch };
if (typeof module!=='undefined' && module.exports) module.exports=api;
else root.Arena=api;
})(globalThis);

(function(root){
'use strict';

const FLOOR={w:46,h:29};
const TEAM_STARTS=[{x:4.6,y:15.3},{x:41.4,y:15.3}];
const SCORE_LIMIT=15;
const OFFICE_ROOMS=[
  {name:'会议室',x:9.25,y:6.65,w:8,d:5.45,color:'#718e83'},
  {name:'厕所',x:19,y:6.65,w:8,d:5.45,color:'#8eacaf'},
  {name:'休息室',x:28.75,y:6.65,w:8,d:5.45,color:'#a58567'}
];
const OFFICE_WALLS=OFFICE_ROOMS.flatMap(({x,y,w,d})=>[
  [x,y,w,.17],[x,y+.17,.16,d-.17],[x+w-.16,y+.17,.16,d-.17],
  [x,y+d,w/2-.86,.17],[x+w/2+.86,y+d,w/2-.86,.17]
]);
const OFFICE_DESKS=[9.5,13,16.5,21.2,24.7,29.4,32.9,36.4].flatMap(x=>[18.4,22.1].map(y=>({x,y})));
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
const obstacles=OFFICE_WALLS.map(([x,y,w,d])=>({x,y,w,d})).concat(OFFICE_DESKS.map(({x,y})=>({x:x-.75,y:y-.385,w:1.5,d:1.36})));
const [meeting,toilet,lounge]=OFFICE_ROOMS;
obstacles.push(
  {x:meeting.x+2.55,y:meeting.y+1.89,w:2.9,d:1.25},
  {x:lounge.x+1.39,y:lounge.y+.94,w:2.42,d:.95},
  {x:lounge.x+1.87,y:lounge.y+2.93,w:1.45,d:.78},
  {x:lounge.x+5.62,y:lounge.y+.73,w:1.45,d:.74},
  ...[1.23,3.27,5.31].map(x=>({x:toilet.x+x-.35,y:toilet.y+.91,w:.7,d:.9}))
);
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
  const airTime=(time-fighter.actionAt-145)/1000;
  const flight=.475;
  if(airTime<=0 || airTime>=flight) return 0;
  return 2.15*airTime*(flight-airTime)/flight;
}

function createMatch(){
  const players=new Map();
  let time=0,winner=null,restartAt=0,events=[];
  const teamScores=[0,0];

  function spawn(fighter){
    const side=fighter.team===0 ? 1 : -1;
    const base=TEAM_STARTS[fighter.team];
    const positions=Array.from({length:5},(_,i)=>{
      const slot=(fighter.color+i)%5;
      return {x:base.x+side*(1.64+slot%2*.7),y:base.y+(slot-2)*.89};
    });
    const spawnPoint=positions.find(p=>[...players.values()].every(other=>other===fighter || !other.hp || distance(other,p)>.6)) || positions[0];
    Object.assign(fighter,{...spawnPoint,
      hp:100,maxHp:100,dx:side,dy:0,action:'idle',actionAt:time,vx:0,vy:0,path:[],target:null,
      focus:null,moving:false,shield:0,shieldUntil:0,impulseX:0,impulseY:0,slowUntil:0,stunUntil:0,hasteUntil:0,safeUntil:time+1500,struck:false,nextAuto:time,nextAI:time,nextChase:time});
  }

  function add(id,name,color,role,bot=false){
    const fighter={id,name,color,role,team:color%2,bot,score:0,voiceIndex:0,line:null,nextAI:0,ultimateReadyAt:0};
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
    const end=fighter.path.at(-1);
    fighter.target=end ? {x:end.x,y:end.y} : null;
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
    fighter.actionTravel=0;
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
        f.target=null;
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
    const target=players.get(id);
    return target && target.team!==f.team && target.hp>0 ? target : null;
  }

  function move(f,dt){
    f.moving=false;
    if(f.impulseX || f.impulseY){
      const distance=(1-Math.exp(-dt*10))/10;
      const travel=displace(f,f.impulseX*distance,f.impulseY*distance);
      const decay=travel>.0001?Math.exp(-dt*10):0;
      f.impulseX*=decay;
      f.impulseY*=decay;
      if(Math.hypot(f.impulseX,f.impulseY)<.09) f.impulseX=f.impulseY=0;
      return;
    }
    if(f.stunUntil>time) return;
    if(f.action==='kick' || f.action==='punch'){
      const from=f.action==='kick'?145:90;
      const duration=f.action==='kick'?475:180;
      const fraction=Math.max(0,Math.min(1,(time-f.actionAt-from)/duration));
      const traveled=(f.action==='kick'?1.06:.43)*(1-(1-fraction)**2);
      let advance=traveled-(f.actionTravel || 0);
      for(const other of players.values()){
        if(other===f || !other.hp) continue;
        const dx=other.x-f.x,dy=other.y-f.y;
        const front=dx*f.dx+dy*f.dy;
        if(front>=0 && Math.abs(dx*f.dy-dy*f.dx)<.49) advance=Math.min(advance,front-.5);
      }
      if(advance>0) displace(f,f.dx*advance,f.dy*advance);
      f.actionTravel=traveled;
      return;
    }
    if(f.action!=='idle') return;
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

  function defeat(source,target,credit=true){
    target.hp=0;
    if(credit && source.team!==target.team){
      source.score++;
      if(++teamScores[source.team]>=SCORE_LIMIT){
        winner=source.team;
        restartAt=time+10000;
      }
    }
    Object.assign(target,{action:'ko',actionAt:time,spawnAt:time+5300,moving:false,path:[],target:null});
  }

  function damage(source,target,amount,kind){
    if(!target.hp || target.safeUntil>time || winner!==null) return;
    const absorbed=target.shieldUntil>time ? Math.min(amount,target.shield) : 0;
    if(absorbed) target.shield-=absorbed;
    const actual=Math.min(target.hp,amount-absorbed);
    target.hp-=actual;
    events.push({x:target.x,y:target.y,
      kind:!actual ? 'shield' : !target.hp ? 'ko' : kind,damage:actual,t:time});
    if(!target.hp) defeat(source,target);
    else if(actual && target.action!=='ultimate'){
      target.action='hurt';
      target.actionAt=time;
    }
  }

  function displace(actor,dx,dy){
    const length=Math.hypot(dx,dy);
    const steps=Math.ceil(length/.14);
    let traveled=0;
    for(let i=0;i<steps;i++){
      const x=actor.x+dx/steps,y=actor.y+dy/steps;
      if(!canStand(x,y)) break;
      actor.x=x;
      actor.y=y;
      traveled+=length/steps;
    }
    return traveled;
  }

  function unleash(f){
    const skill=ultimateFor(f);
    events.push({x:f.x,y:f.y,team:f.team,kind:skill.global?'eclipse':'ultimate',id:f.id,label:skill.label,radius:skill.radius,t:time});
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
    const enemies=[...players.values()].filter(hero=>hero.hp && hero.team!==f.team &&
      !(hero.safeUntil>time) && distance(f,hero)<=skill.radius && clearWalk(f,hero));
    enemies.sort((a,b)=>distance(f,a)-distance(f,b));
    for(const enemy of skill.single?enemies.slice(0,1):enemies){
      damage(f,enemy,skill.damage,'magic');
      if(!enemy.hp) continue;
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
    for (const other of focused ? [focused,...players.values()] : players.values()){
      if (other.team===f.team || !other.hp || other.safeUntil>time ||
        (move!==ACTIONS.voice && heightAt(other,time)>.48)) continue;
      const d=distance(f,other),reach=move.range;
      if (d>reach || d>=closest || (d>.25 && (other.x-f.x)*f.dx+(other.y-f.y)*f.dy<d*move.arc)) continue;
      if (!clearWalk(f,other)) continue;
      target=other;
      closest=d;
      if (other===focused) break;
    }
    if(!target) return;
    const hp=target.hp;
    damage(f,target,move.damage,f.action==='voice'?'magic':'hit');
    if(target.hp<hp && target.hp>0 && move!==ACTIONS.voice){
      const force=move===ACTIONS.kick?6:3.2;
      const gap=distance(f,target);
      target.impulseX+=(gap>.05?(target.x-f.x)/gap:f.dx)*force;
      target.impulseY+=(gap>.05?(target.y-f.y)/gap:f.dy)*force;
      const speed=Math.hypot(target.impulseX,target.impulseY);
      if(speed>8){
        target.impulseX*=8/speed;
        target.impulseY*=8/speed;
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

  function controlBot(f){
    if (!f.bot || time<f.nextAI || f.action!=='idle' || f.stunUntil>time) return;
    f.nextAI=time+350+Math.random()*300;
    const local=nearest(f,players.values(),5.2);
    const opponent=local || [...players.values()].filter(hero=>hero.hp && hero.team!==f.team)
      .sort((a,b)=>distance(f,a)-distance(f,b))[0];
    const skill=ultimateFor(f);
    const hasTarget=local && distance(f,local)<=skill.radius;
    const needsSupport=(skill.heal || skill.shield || skill.haste) && [...players.values()].some(hero=>
      hero.team===f.team && hero.hp>0 && hero.hp<=70 && distance(f,hero)<=skill.radius);
    if(f.ultimateReadyAt<=time && ((skill.damage && hasTarget) || needsSupport)){
      if(hasTarget) f.focus=local.id;
      input(f.id,{type:'action',action:'ultimate'});
      return;
    }
    const focus=opponent?.id;
    if(f.focus!==focus){
      f.focus=focus;
      f.target=null;
      f.nextChase=0;
    }
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
    const reach=1.5;
    if (distance(f,target)<=reach && clearWalk(f,target)){
      f.path=[];
      f.target=null;
      f.vx=0;
      f.vy=0;
      face(f,target);
      if (time>=f.nextAuto && !(f.stunUntil>time)){ action(f,'punch'); f.nextAuto=time+720; }
    } else if (time>=(f.nextChase || 0)){
      if(!f.path.length || !f.target || distance(f.target,target)>.75) setTarget(f,target);
      f.nextChase=time+(f.bot?650:380);
    }
  }

  function reset(){
    winner=null;
    teamScores.fill(0);
    events=[];
    for (const f of players.values()){ f.score=0; f.ultimateReadyAt=0; spawn(f); }
  }

  function tick(ms){
    time+=ms;
    events=events.filter(e=>time-e.t<700);
    if (!players.size) return;
    if (winner!==null){
      if (time>=restartAt) reset();
      return;
    }
    for (const f of players.values()){
      if(winner!==null) break;
      if (!f.hp){ if (time>=f.spawnAt) spawn(f); continue; }
      const moveDef=ACTIONS[f.action], elapsed=time-f.actionAt;
      if ((moveDef && elapsed>=moveDef.duration) || (f.action==='hurt' && elapsed>=210)) action(f,'idle');
      if (distance(f,TEAM_STARTS[f.team])<2.15) f.hp=Math.min(f.maxHp,f.hp+ms*.015);
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
  }

  function snapshot(){
    return {time,events,winner,restartAt,teamScores:teamScores.slice(),
      players:[...players.values()].map(p=>({
        id:p.id,name:p.name,color:p.color,role:p.role,team:p.team,bot:p.bot,x:p.x,y:p.y,dx:p.dx,dy:p.dy,
        hp:p.hp,maxHp:p.maxHp,score:p.score,action:p.action,actionAt:p.actionAt,moving:p.moving,target:p.target,
        safeUntil:p.safeUntil,spawnAt:p.spawnAt,ultimateReadyAt:p.ultimateReadyAt,shield:p.shieldUntil>time?p.shield:0,line:p.action==='voice' ? p.line : null
      })) };
  }

  return {players,add,addHuman,fillTeams,input,tick,snapshot,remove(id){
    players.delete(id);
    if (!players.size) reset();
  }};
}

const api={ FLOOR,TEAM_STARTS,SCORE_LIMIT,OFFICE_ROOMS,OFFICE_WALLS,OFFICE_DESKS,CAPACITY,ACTIONS,ROLES,NICKNAME_LIMIT,VOICE_LINES,parseNickname,ultimateFor,canStand,heightAt,createMatch };
if (typeof module!=='undefined' && module.exports) module.exports=api;
else root.Arena=api;
})(globalThis);

(function(){
'use strict';

const {FLOOR,CAPACITY,ACTIONS,ROLES,parseNickname}=Arena;
const canvas=document.getElementById('gameCanvas');
const sceneOverlay=document.getElementById('sceneOverlay');
const lerp=(a,b,t)=>a+(b-a)*t;
let view;

const $=id=>document.getElementById(id);
const labels=new Map();
const buttons=new Map();
const practice=document.documentElement.dataset.mode!=='online';
let selectedRole=null, nickname=null, ideaOpen=false;
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
  setText('connectionText',!selectedRole ? '等待入场' : practice ? '单机练习' : !connected ? '正在连接' : position ? '观战排队' : '在线联机');
  $('connection').className='connection '+(practice ? 'practice' : connected ? 'online' : '');
  $('queueNotice').hidden=!position || !connected;
  if (position) setText('queuePosition','排队第 '+position+' 位');
  setText('playerName',player?.name || '—');
  setText('score',player ? String(player.score) : '—');
  setText('occupancy',current ? practice ? current.players.length+' 人' : current.players.length+' / '+CAPACITY : '— / '+CAPACITY);
  for (const [name,button] of buttons){
    button.disabled=!player?.hp || !connected || current?.winner!=null;
    button.classList.toggle('active',player?.action===name);
  }
  const structures=current?.structures || Arena.TOWERS;
  setText('blueTowers',structures.filter(s=>s.team===0 && s.kind==='tower' && s.hp>0).length+' / 3');
  setText('redTowers',structures.filter(s=>s.team===1 && s.kind==='tower' && s.hp>0).length+' / 3');
  const result=$('matchResult');
  const winner=current?.winner;
  const down=player && !player.hp;
  result.hidden=winner==null && !down;
  if(winner!=null){
    setText('resultTitle',view.faction[winner]+'胜利');
    setText('resultDetail',Math.max(0,Math.ceil((current.restartAt-current.time)/1000))+' 秒后开启下一局');
  }else if(down){
    setText('resultTitle','英雄已倒下');
    setText('resultDetail',Math.max(0,Math.ceil((player.spawnAt-current.time)/1000))+' 秒后复活');
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

function place(el,x,y,z){
  const [left,top]=view.project(x,y,z);
  el.style.left=left+'px';
  el.style.top=top+'px';
}

function drawLabels(state){
  for(const fighter of [...state.players,...state.structures]){
    const {badge,segments,speech}=labels.get(fighter.id);
    badge.hidden=fighter.hp<=0;
    if(badge.hidden){
      speech.hidden=true;
      continue;
    }
    const hero=fighter.kind==='hero';
    const z=hero ? 2.3+Arena.heightAt(fighter,state.time)*1.12 : fighter.kind==='core'?5.35:2.95;
    place(badge,fighter.x,fighter.y,z);
    const ratio=fighter.hp/fighter.maxHp*5;
    segments.forEach((segment,index)=>segment.style.width=(Math.max(0,Math.min(1,ratio-index))*100)+'%');
    speech.hidden=!fighter.line;
    if(fighter.line){
      speech.textContent=fighter.line;
      place(speech,fighter.x,fighter.y,z+.96);
    }
  }
}

function refreshLabels(entities){
  const ids=new Set(entities.map(p=>p.id));
  for(const [id,label] of labels){
    if(ids.has(id)) continue;
    label.badge.remove();
    label.speech.remove();
    labels.delete(id);
  }
  for(const f of entities){
    if(labels.has(f.id)) continue;
    const badge=document.createElement('div');
    badge.className='unit-label '+(f.team?'red':'blue')+(f.id===self?' self':'')+(f.kind==='hero'?' hero':' structure');
    const name=document.createElement('span');
    name.className='unit-name';
    name.textContent=f.kind==='hero'?f.name:f.kind==='core'?'基地水晶':'防御塔';
    const health=document.createElement('div');
    health.className='unit-health';
    const segments=Array.from({length:5},()=>{
      const cell=document.createElement('i');
      const fill=document.createElement('b');
      cell.append(fill);
      health.append(cell);
      return fill;
    });
    badge.append(name,health);
    const speech=document.createElement('span');
    speech.className='nameplate speech';
    speech.hidden=true;
    sceneOverlay.append(badge,speech);
    labels.set(f.id,{badge,segments,speech});
  }
}

const attract={time:0,players:[],units:[],structures:[...Arena.TOWERS,...Arena.CORES],events:[]};
function render(now){
  if(!ideaOpen && view){
    const state=current || attract;
    const span=previous ? state.time-previous.time : 0;
    const mix=span>0?Math.min(1,(now-receivedAt)/span):1;
    const time=span>0?lerp(previous.time,state.time,mix):current?state.time:now;
    const interpolate=(next,old)=>{
      const oldById=new Map((old || []).map(actor=>[actor.id,actor]));
      return next.map(actor=>{
        const p=oldById.get(actor.id);
        if(!p || Math.hypot(actor.x-p.x,actor.y-p.y)>3) return actor;
        return {...actor,x:lerp(p.x,actor.x,mix),y:lerp(p.y,actor.y,mix)};
      });
    };
    const frame={...state,time,players:interpolate(state.players,previous?.players),units:interpolate(state.units,previous?.units)};
    view.render(frame,time,frame.players.find(f=>f.id===self));
    drawLabels(frame);
  }
  requestAnimationFrame(render);
}

function accept(state){
  previous=!current || state.time<current.time || state.self!==current.self?null:current;
  self=state.self;
  current=state;
  receivedAt=performance.now();
  connected=true;
  refreshLabels([...state.players,...state.structures]);
  view?.drawMap(state,self);
  updateHud();
}

function buildControls(){
  for(const [name,action] of Object.entries(ACTIONS)){
    const button=document.createElement('button');
    button.type='button';
    button.className='action';
    button.dataset.action=name;
    button.disabled=true;
    const icon=document.createElement('span');
    icon.className='skill-key';
    icon.textContent=action.hint;
    const label=document.createElement('span');
    label.textContent=action.label;
    button.append(icon,label);
    button.addEventListener('click',event=>{
      if(event.detail) button.blur();
      send({type:'action',action:name});
    });
    $('actions').append(button);
    buttons.set(name,button);
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
    const response=await post('/join',{token:session,role:selectedRole,nickname});
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
  local.add(self,nickname+' · '+selectedRole,0,selectedRole);
  const professions=['运营','测试','组长','运维','前台'];
  for(let i=1;i<CAPACITY;i++){
    const role=professions[(i-1)%professions.length];
    local.add('bot'+i,role+' · 陪练 '+i,i,role,true);
  }
  $('practiceHelp').hidden=false;
  function tick(){
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
  const norm=Math.hypot(x,y) || 1;
  send({type:'move',x:x/norm,y:y/norm});
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
  const nameInput=$('nickname');
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
  function updateEntry(){
    const role=new FormData(form).get('profession');
    const name=parseNickname(nameInput.value);
    const invalid=Boolean(nameInput.value && !name);
    $('nicknameError').hidden=!invalid;
    nameInput.setAttribute('aria-invalid',String(invalid));
    $('enterFight').disabled=!name || !ROLES.includes(role);
  }
  form.addEventListener('input',updateEntry);
  form.addEventListener('change',updateEntry);
  updateEntry();
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const role=new FormData(form).get('profession');
    const name=parseNickname(nameInput.value);
    if (selectedRole || !name || !ROLES.includes(role)) return;
    selectedRole=role;
    nickname=name;
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
  const point=view?.point(event.clientX,event.clientY);
  const hero=fighterSelf();
  if(!point || !hero || point.x<0 || point.x>FLOOR.w || point.y<0 || point.y>FLOOR.h) return;
  pressed.clear();
  const rect=canvas.getBoundingClientRect();
  const x=event.clientX-rect.left,y=event.clientY-rect.top;
  let focus=null, closest=Infinity;
  for(const target of [...current.players,...current.units,...current.structures]){
    if(!target.hp || target.team===hero.team) continue;
    const height=target.kind==='core'?2.5:target.kind==='tower'?1.15:target.kind==='hero'?.97:.4;
    const [tx,ty]=view.project(target.x,target.y,height);
    const distance=Math.hypot(tx-x,ty-y);
    const radius=target.kind==='core'?25:target.kind==='minion'?9:16;
    if(distance<radius && distance<closest){focus=target;closest=distance;}
  }
  send(focus?{type:'focus',id:focus.id}:{type:'target',x:point.x,y:point.y});
}
canvas.addEventListener('contextmenu',event=>event.preventDefault());
canvas.addEventListener('wheel',event=>{
  if(!view) return;
  event.preventDefault();
  view.zoom(event.deltaY<0?.16:-.16);
},{passive:false});
canvas.addEventListener('pointerdown',event=>{
  if (![0,2].includes(event.button) || !event.isPrimary) return;
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

try{
  view=Rift.create(canvas);
  refreshLabels(attract.structures);
  view.drawMap(attract,self);
}catch(error){
  console.error(error);
  $('graphicsError').hidden=false;
}
buildControls();
updateHud();
if(view) buildRolePicker();
requestAnimationFrame(render);
})();

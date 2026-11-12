'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const { WebSocketServer,WebSocket } = require('ws');
const { createMatch,CAPACITY,ROLES } = require('./arena');

const port=Number(process.env.PORT || 8899);
const host=process.env.HOST || '0.0.0.0';
const tickMs=50;
const reconnectMs=3500;
const match=createMatch();
const members=new Map();
const queue=[];
let nextName=1;
const sockets=new WebSocketServer({noServer:true,maxPayload:4096});

const assets = new Map([
  ['/', ['index.html','text/html']],
  ['/index.html', ['index.html','text/html']],
  ['/arena.js', ['arena.js','text/javascript']],
  ['/game.js', ['game.js','text/javascript']],
  ['/idea.js', ['idea.js','text/javascript']],
  ['/idea.css', ['idea.css','text/css']],
  ['/style.css', ['style.css','text/css']]
].map(([url,[file,type]])=>[url,{ type:type+'; charset=utf-8',file:path.join(__dirname,file) }]));

function sendJSON(res,status,data){
  res.writeHead(status,{ 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store' });
  res.end(JSON.stringify(data));
}

async function readJSON(req){
  if (req.headers['content-type']?.split(';')[0]!=='application/json') throw Error('content-type');
  let bytes=0;
  const chunks=[];
  for await (const chunk of req){
    bytes+=chunk.length;
    if (bytes>4096) throw Error('body');
    chunks.push(chunk);
  }
  const body=JSON.parse(Buffer.concat(chunks));
  if (!body || typeof body!=='object' || Array.isArray(body)) throw Error('body');
  return body;
}

function promote(){
  while (queue.length && match.players.size<CAPACITY){
    const member=queue.shift();
    const used=new Set([...match.players.values()].map(player=>player.color));
    let color=0;
    while (used.has(color)) color++;
    match.add(member.id,member.name,color,member.role);
  }
}

function leave(member){
  members.delete(member.token);
  match.remove(member.id);
  const position=queue.indexOf(member);
  if (position>=0) queue.splice(position,1);
  if (member.socket){
    const socket=member.socket;
    member.socket=null;
    socket.close(1000);
  }
}

function writeState(member,state){
  const socket=member.socket;
  if (!socket || socket.readyState!==WebSocket.OPEN || socket.bufferedAmount>64*1024) return;
  socket.send(JSON.stringify({
    ...state,self:member.id,capacity:CAPACITY,position:queue.indexOf(member)+1,waiting:queue.length
  }));
}

function subscribe(socket,member){
  const oldSocket=member.socket;
  member.socket=socket;
  member.expires=Infinity;
  member.responding=true;
  if (oldSocket) oldSocket.close(1000);
  socket.on('error',()=>socket.terminate());
  socket.on('pong',()=>{ if (member.socket===socket) member.responding=true; });
  socket.on('message',(payload,binary)=>{
    if (binary || member.socket!==socket || !match.players.has(member.id)) return;
    let command;
    try{ command=JSON.parse(payload); } catch { return; }
    if (command?.type==='target'){
      // Only the last pointer position received in a simulation step needs a route.
      member.target=command;
    } else {
      if (member.target) match.input(member.id,member.target);
      member.target=null;
      match.input(member.id,command);
    }
  });
  socket.on('close',()=>{
    if (member.socket!==socket) return;
    member.socket=null;
    member.target=null;
    member.expires=Date.now()+reconnectMs;
    match.input(member.id,{type:'move',x:0,y:0});
  });
  if (!match.players.has(member.id) && !queue.includes(member)){
    queue.push(member);
    promote();
  }
  writeState(member,match.snapshot());
}

async function handle(req,res){
  const url=new URL(req.url,'http://localhost');
  const asset=assets.get(url.pathname);
  if ((req.method==='GET' || req.method==='HEAD') && asset){
    const file=await fs.promises.readFile(asset.file);
    const content=asset.type.startsWith('text/html')
      ? Buffer.from(file.toString('utf8').replace('data-mode="practice"','data-mode="online"'))
      : file;
    res.writeHead(200,{
      'Content-Type':asset.type,'Content-Length':content.length,'Cache-Control':'no-cache',
      'X-Content-Type-Options':'nosniff'
    });
    res.end(req.method==='HEAD' ? undefined : content);
    return;
  }
  if (req.method!=='POST' || !['/join','/leave'].includes(url.pathname)){
    sendJSON(res,404,{error:'not found'});
    return;
  }
  const body=await readJSON(req).catch(()=>null);
  if (!body){
    sendJSON(res,400,{error:'invalid request'});
    return;
  }
  let member=members.get(body.token);
  if (url.pathname==='/join'){
    if (!member){
      if (!ROLES.includes(body.role)){
        sendJSON(res,400,{ error:'select a profession' });
        return;
      }
      const number=nextName++;
      member={
        token:randomUUID(),id:String(number),role:body.role,name:body.role+' '+String(number).padStart(2,'0'),
        socket:null,expires:Date.now()+10000,target:null
      };
      members.set(member.token,member);
    }
    sendJSON(res,200,{ token:member.token });
    return;
  }
  if (!member){
    sendJSON(res,410,{error:'session expired'});
    return;
  }
  leave(member);
  promote();
  sendJSON(res,200,{ ok:true });
}

const server=http.createServer((req,res)=>{
  handle(req,res).catch(error=>{
    console.error(error);
    if (!res.headersSent) sendJSON(res,500,{error:'server error'});
    else res.end();
  });
});
server.requestTimeout=10000;
server.on('upgrade',(req,socket,head)=>{
  let url;
  try{ url=new URL(req.url,'http://localhost'); } catch {
    socket.destroy();
    return;
  }
  const member=url.pathname==='/socket' && members.get(url.searchParams.get('token'));
  if (!member){
    socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
    return;
  }
  sockets.handleUpgrade(req,socket,head,websocket=>subscribe(websocket,member));
});

setInterval(()=>{
  for (const member of members.values()){
    const socket=member.socket;
    if (!socket || socket.readyState!==WebSocket.OPEN) continue;
    if (!member.responding){
      socket.terminate();
      continue;
    }
    member.responding=false;
    socket.ping();
  }
},15000).unref();


setInterval(()=>{
  const now=Date.now();
  for (const member of members.values()){
    if (member.expires<=now){
      leave(member);
    } else if (member.target){
      match.input(member.id,member.target);
      member.target=null;
    }
  }
  promote();
  match.tick(tickMs);
  if (!members.size) return;
  const state=match.snapshot();
  for (const member of members.values()) writeState(member,state);
},tickMs).unref();

server.listen(port,host,()=>{
  const listeningPort=server.address().port;
  console.log('小班微上 · http://localhost:'+listeningPort);
  if (host==='0.0.0.0'){
    for (const address of Object.values(os.networkInterfaces()).flat()){
      if (address.family==='IPv4' && !address.internal) console.log('局域网 · http://'+address.address+':'+listeningPort);
    }
  }
});

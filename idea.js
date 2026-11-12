(function(){
'use strict';

const files={
  'OfficeApplication.java':{
    path:'src/main/java/com/office/scheduler/OfficeApplication.java',
    content:`package com.office.scheduler;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class OfficeApplication {

    public static void main(String[] args) {
        SpringApplication.run(OfficeApplication.class, args);
    }
}
`
  },
  'ShiftService.java':{
    path:'src/main/java/com/office/scheduler/ShiftService.java',
    content:`package com.office.scheduler;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ShiftService {
    private static final LocalTime OPENING = LocalTime.of(9, 0);
    private static final LocalTime CLOSING = LocalTime.of(18, 0);

    public List<Shift> findShifts(LocalDate date) {
        return List.of(new Shift(date, OPENING, CLOSING));
    }

    public record Shift(LocalDate date, LocalTime start, LocalTime end) {
        public boolean includes(LocalTime time) {
            return !time.isBefore(start) && time.isBefore(end);
        }
    }
}
`
  },
  'application.properties':{
    path:'src/main/resources/application.properties',
    content:`spring.application.name=office-scheduler
server.port=8080
spring.jackson.time-zone=Asia/Shanghai
logging.level.com.office.scheduler=INFO
`
  },
  'pom.xml':{
    path:'pom.xml',
    content:`<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.office</groupId>
    <artifactId>office-scheduler</artifactId>
    <version>1.0.0</version>
    <properties>
        <java.version>21</java.version>
    </properties>
</project>
`
  }
};

const $=id=>document.getElementById(id);
const editor=$('javaEditor');
const preview=$('codePreview');
const highlight=$('codeHighlight');
const numbers=$('lineNumbers');
const terminal=$('terminalOutput');
const names=Object.keys(files);
const tabs=new Set(['OfficeApplication.java','ShiftService.java','pom.xml']);
const keywords=new Set('package import public private static final class record return new void boolean int long if else extends implements'.split(' '));
const tokenPattern=/\/\/[^\n]*|"(?:[^"\\\n]|\\.)*"|@[A-Za-z_]\w*|[A-Za-z_]\w*|\b\d+(?:\.\d+)?\b/g;
let active='ShiftService.java';
let timer=null;
let scanIndex=0;
let pendingFile=null;
let warnings=0;

function renderCode(){
  const text=editor.value;
  const out=document.createDocumentFragment();
  let index=0;
  for (const match of text.matchAll(tokenPattern)){
    out.append(text.slice(index,match.index));
    const token=match[0];
    const type=token.startsWith('//') ? 'comment' : token.startsWith('"') ? 'string' :
      keywords.has(token) ? 'keyword' : /^\d/.test(token) ? 'number' :
      /^[@A-Z]/.test(token) ? 'type' : null;
    if (type){
      const span=document.createElement('span');
      span.className='syntax-'+type;
      span.textContent=token;
      out.append(span);
    } else {
      out.append(token);
    }
    index=match.index+token.length;
  }
  out.append(text.slice(index),'\n');
  preview.replaceChildren(out);
  numbers.textContent=text.split('\n').map((_,i)=>i+1).join('\n');
  syncScroll();
  updateCursor();
}

function syncScroll(){
  highlight.scrollTop=editor.scrollTop;
  highlight.scrollLeft=editor.scrollLeft;
  numbers.parentElement.scrollTop=editor.scrollTop;
}

function updateCursor(){
  const before=editor.value.slice(0,editor.selectionStart);
  const row=before.split('\n').length;
  $('ideCursor').textContent=row+':'+(before.length-before.lastIndexOf('\n'));
}

function openFile(name){
  if (!Object.hasOwn(files,name)) return;
  active=name;
  tabs.add(name);
  const buttons=[...tabs].map(file=>{
    const button=document.createElement('button');
    button.type='button';
    button.className='ide-tab'+(file===name?' active':'');
    button.setAttribute('aria-current',file===name?'true':'false');
    const icon=document.createElement('b');
    icon.textContent=file.endsWith('.java')?'J':file==='pom.xml'?'m':'⚙';
    button.append(icon,file);
    button.addEventListener('click',()=>openFile(file));
    return button;
  });
  $('ideTabs').replaceChildren(...buttons);
  document.querySelectorAll('[data-file]').forEach(button=>{
    button.classList.toggle('active',button.dataset.file===name);
  });
  editor.value=files[name].content;
  editor.setSelectionRange(0,0);
  editor.scrollTop=0;
  editor.scrollLeft=0;
  $('ideBreadcrumb').textContent=files[name].path.split('/').join('  ›  ');
  $('ideFileStatus').textContent=name.endsWith('.java')?'Java':name.endsWith('.xml')?'XML':'Properties';
  if (!$('ideaView').hidden) document.title=name+' — office-scheduler — IntelliJ IDEA';
  renderCode();
}

function print(text,kind){
  const follow=terminal.scrollHeight-terminal.scrollTop-terminal.clientHeight<28;
  const row=document.createElement('div');
  if (kind) row.className=kind;
  row.textContent=text;
  terminal.append(row);
  if (terminal.childElementCount>110) terminal.firstElementChild.remove();
  if (follow) terminal.scrollTop=terminal.scrollHeight;
}

function inspect(){
  if (pendingFile){
    const lines=pendingFile.content.split('\n');
    const issues=lines.flatMap((line,i)=>/[ \t]+$/.test(line)?[i+1]:[]);
    if (issues.length){
      warnings+=issues.length;
      print('WARN  Trailing whitespace on '+issues.map(line=>'L'+line).join(', '),'warn');
    } else {
      print(' OK   '+lines.length+' lines checked · UTF-8','pass');
    }
    pendingFile=null;
    return;
  }
  if (scanIndex===names.length){
    print('Scan complete · '+names.length+' files · '+warnings+' warning(s)','info');
    print('Watching project files…','info');
    scanIndex=0;
    warnings=0;
    return;
  }
  pendingFile=files[names[scanIndex++]];
  print('CHECK '+pendingFile.path);
}

editor.addEventListener('input',()=>{
  files[active].content=editor.value;
  renderCode();
});
editor.addEventListener('scroll',syncScroll);
editor.addEventListener('select',updateCursor);
editor.addEventListener('keyup',updateCursor);
editor.addEventListener('click',updateCursor);
editor.addEventListener('keydown',event=>{
  if (event.key!=='Tab' || event.shiftKey) return;
  event.preventDefault();
  editor.setRangeText('    ',editor.selectionStart,editor.selectionEnd,'end');
  files[active].content=editor.value;
  renderCode();
});
document.querySelectorAll('[data-file]').forEach(button=>{
  button.addEventListener('click',()=>openFile(button.dataset.file));
});
$('terminalCommand').addEventListener('submit',event=>{
  event.preventDefault();
  const input=$('terminalInput');
  const command=input.value.trim();
  input.value='';
  if (!command) return;
  if (command==='clear'){
    terminal.replaceChildren();
    return;
  }
  print('❯ '+command,'prompt');
  if (command==='check'){
    scanIndex=0;
    warnings=0;
    pendingFile=null;
    inspect();
  } else {
    print('Available commands: check, clear','warn');
  }
});

openFile(active);

window.IDEPreview={
  open(){
    $('ideaView').hidden=false;
    document.title=active+' — office-scheduler — IntelliJ IDEA';
    syncScroll();
    if (!terminal.childElementCount){
      print('office-scheduler  git:(main)  ❯ project-inspect --watch','prompt');
      print('Index ready · src/main/java · src/main/resources','info');
      const historyLength=Math.ceil(terminal.clientHeight/19)+5;
      for (let i=0;i<historyLength;i++) inspect();
      terminal.scrollTop=terminal.scrollHeight;
    }
    if (timer===null) timer=setInterval(inspect,475);
  },
  close(){
    clearInterval(timer);
    timer=null;
    $('ideaView').hidden=true;
  }
};
})();

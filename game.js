{
const $=id=>document.getElementById(id);
const stage=$('stage'),cv=$('cv'),ctx=cv.getContext('2d');
const LH=640,GY=572,PW=64,GR=18,HR=12,GRAV=1350,FLAP=-400,MAXV=620,PI=Math.PI;
const store={get(k,d){try{const v=localStorage.getItem('booflap.'+k);return v===null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('booflap.'+k,JSON.stringify(v))}catch(e){}}};
let best=store.get('best',0),sfxOn=store.get('sfx',true),musOn=store.get('music',true);
let W=400,S=1,dpr=1,gx=100,sky;
let state='title',paused=false,deadAt=0,t=0,last=0,newBest=false;
let g,pipes,items,parts,score,speed,groundOff=0,bgOff=0,shakeT=0,sinceItem=0,trailT=0;

/* ---------- audio ---------- */
let ac=null,master,sfxG,musG,dly,nextT=0,step=0,musTimer=null;
const mtof=m=>440*2**((m-69)/12);
function ensureAudio(){
  if(ac){if(ac.state==='suspended')ac.resume().catch(()=>{});return}
  try{
    ac=new(window.AudioContext||window.webkitAudioContext)();
    master=ac.createGain();master.gain.value=.9;master.connect(ac.destination);
    sfxG=ac.createGain();musG=ac.createGain();sfxG.connect(master);musG.connect(master);
    dly=ac.createDelay();dly.delayTime.value=.42;const fb=ac.createGain();fb.gain.value=.38;
    dly.connect(fb).connect(dly);dly.connect(musG);
    applyAudio();nextT=ac.currentTime+.1;musTimer=setInterval(sched,90);
  }catch(e){ac=null}
}
function applyAudio(){if(!ac)return;sfxG.gain.value=sfxOn?1:0;musG.gain.setTargetAtTime(musOn?.9:0,ac.currentTime,.1)}
function env(node,t0,a,peak,dur){const gn=ac.createGain();gn.gain.setValueAtTime(.0001,t0);gn.gain.exponentialRampToValueAtTime(peak,t0+a);gn.gain.exponentialRampToValueAtTime(.0001,t0+dur);node.connect(gn);return gn}
function tone(f1,f2,dur,type,vol,delay){if(!ac||!sfxOn)return;const t0=ac.currentTime+(delay||0),o=ac.createOscillator();o.type=type||'sine';o.frequency.setValueAtTime(f1,t0);o.frequency.exponentialRampToValueAtTime(f2,t0+dur);env(o,t0,.01,vol,dur).connect(sfxG);o.start(t0);o.stop(t0+dur+.05)}
function noise(dur,vol,freq){if(!ac||!sfxOn)return;const t0=ac.currentTime,b=ac.createBuffer(1,ac.sampleRate*dur,ac.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const s=ac.createBufferSource();s.buffer=b;const f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;f.Q.value=.8;s.connect(f);env(f,t0,.005,vol,dur).connect(sfxG);s.start(t0)}
const SFX={
  flap(){tone(330,660,.13,'triangle',.16)},
  score(){tone(988,988,.07,'square',.05);tone(1480,1480,.14,'square',.05,.07)},
  power(){[523,659,784,1047].forEach((f,i)=>tone(f,f*1.01,.16,'triangle',.13,i*.06))},
  shield(){noise(.35,.35,2200);tone(700,140,.35,'sawtooth',.08)},
  fade(){tone(660,330,.3,'sine',.12)},
  die(){tone(420,55,.7,'sawtooth',.14);noise(.55,.3,700)}
};
const prog=[[57,60,64],[53,57,60],[50,53,57],[52,56,59]];
function voice(f,t0,dur,type,vol,a,dest,cut){const o=ac.createOscillator();o.type=type;o.frequency.value=f;let n=o;if(cut){const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=cut;o.connect(lp);n=lp}env(n,t0,a,vol,dur).connect(dest);o.start(t0);o.stop(t0+dur+.1)}
function sched(){
  if(!ac)return;
  if(!musOn||ac.state!=='running'){nextT=ac.currentTime+.1;return}
  const spb=60/74/2;
  while(nextT<ac.currentTime+.3){
    const bar=Math.floor(step/8)%4,ch=prog[bar],s=step%8;
    if(s===0){ch.forEach(m=>{voice(mtof(m),nextT,spb*8.5,'triangle',.035,1.2,musG,1100);voice(mtof(m)*1.006,nextT,spb*8.5,'sawtooth',.012,1.5,musG,700)});voice(mtof(ch[0]-12),nextT,spb*7,'sine',.09,.08,musG)}
    if(s%2===0||Math.random()<.35)voice(mtof(ch[(s*2+bar)%3]+12+(s===6?12:0)),nextT,.9,'sine',.045,.005,dly);
    nextT+=spb;step++;
  }
}

/* ---------- scenery ---------- */
const stars=Array.from({length:70},()=>({x:Math.random(),y:Math.random(),s:Math.random()*1.4+.6,p:Math.random()*6.3,v:.6+Math.random()*1.8}));
const fog=[0,1,2].map(i=>({x:Math.random(),y:430+i*45,r:150+i*40,v:.01+i*.008}));
function mkTree(){const segs=[];(function br(x,y,a,l,w,d){const x2=x+Math.cos(a)*l,y2=y+Math.sin(a)*l;segs.push([x,y,x2,y2,w]);if(d>0){br(x2,y2,a-.35-Math.random()*.45,l*.72,w*.62,d-1);br(x2,y2,a+.3+Math.random()*.45,l*.68,w*.62,d-1)}})(0,0,-PI/2+(Math.random()-.5)*.25,40+Math.random()*26,7,4);return segs}
const trees=[0,1,2,3].map(i=>({x:i*280+Math.random()*120,segs:mkTree(),s:.7+Math.random()*.45}));

function resize(){
  const r=stage.getBoundingClientRect();
  S=r.height/LH;W=Math.min(r.width/S,1000);dpr=Math.min(window.devicePixelRatio||1,2);
  cv.style.width=W*S+'px';cv.style.height=r.height+'px';
  cv.width=Math.round(W*S*dpr);cv.height=Math.round(r.height*dpr);
  gx=Math.max(90,Math.min(W*.28,220));
  sky=ctx.createLinearGradient(0,0,0,GY);sky.addColorStop(0,'#03050f');sky.addColorStop(.6,'#0a1433');sky.addColorStop(1,'#122046');
}

/* ---------- game ---------- */
const diff=()=>({sp:Math.min(170+score*4,300),gap:Math.max(200-score*2.4,138),spc:Math.max(260-score*1.6,215)});
function reset(){
  g={y:LH*.42,vy:0,rot:0,shield:false,phase:0,grace:0,alpha:1,sq:0};
  pipes=[];items=[];parts=[];score=0;sinceItem=0;shakeT=0;newBest=false;speed=170;
  $('score').textContent='0';pills();
}
function spawn(){
  const d=diff(),lastP=pipes[pipes.length-1],x=lastP?lastP.x+d.spc:W+40;
  const m=d.gap/2+46;let gy=m+Math.random()*(GY-2*m);
  if(lastP)gy=Math.max(lastP.gy-170,Math.min(lastP.gy+170,gy));
  pipes.push({x,gy,gap:d.gap,passed:false});
  if(++sinceItem>=5&&score+pipes.length>4&&Math.random()<.42){sinceItem=0;items.push({x:x+PW/2,y:gy,type:Math.random()<.5?'shield':'phase',ph:Math.random()*6})}
}
function hitRect(cx,cy,r,rx,ry,rw,rh){const nx=Math.max(rx,Math.min(cx,rx+rw)),ny=Math.max(ry,Math.min(cy,ry+rh));return(cx-nx)**2+(cy-ny)**2<r*r}
function burst(x,y,col,n,sp){for(let i=0;i<n;i++){const a=Math.random()*PI*2,v=(sp||220)*(.3+Math.random());parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:0,max:.5+Math.random()*.5,s:2+Math.random()*3,c:col})}}
function flap(){g.vy=FLAP;g.sq=1;SFX.flap();for(let i=0;i<5;i++)parts.push({x:gx-6+Math.random()*12,y:g.y+GR,vx:(Math.random()-.5)*60,vy:60+Math.random()*60,life:0,max:.4,s:2.5,c:'#7ff7ff'})}
function breakShield(){g.shield=false;g.grace=1.2;burst(gx,g.y,'#c6ff5c',26);shakeT=.25;SFX.shield();pills()}
function hurt(){if(g.phase>0||g.grace>0)return;if(g.shield){breakShield();return}die()}
function die(){
  state='dead';deadAt=performance.now();burst(gx,g.y,'#7ff7ff',44,280);shakeT=.45;SFX.die();
  if(score>best){best=score;store.set('best',best);newBest=score>0}
  $('pauseBtn').style.visibility='hidden';
  setTimeout(()=>{if(state!=='dead')return;$('oScore').textContent=score;$('oBest').textContent=best;$('newBest').classList.toggle('on',newBest);show('over')},700);
}
function pills(){$('pShield').classList.toggle('on',!!(g&&g.shield));$('pPhase').classList.toggle('on',!!(g&&g.phase>0))}

function update(dt){
  t+=dt;
  if(state==='title'||state==='ready'){g.y=LH*.42+Math.sin(t*3)*10;g.rot=0;bgOff+=40*dt;groundOff+=70*dt}
  else if(state==='play'){
    speed=diff().sp;bgOff+=speed*dt;groundOff+=speed*dt;
    g.vy=Math.min(g.vy+GRAV*dt,MAXV);g.y+=g.vy*dt;
    g.rot+=(Math.max(-.4,Math.min(1,g.vy/650))-g.rot)*Math.min(1,dt*9);
    if(g.y<GR){g.y=GR;g.vy=Math.max(0,g.vy)}
    if(g.phase>0){g.phase-=dt;$('phaseBar').style.width=Math.max(0,g.phase/5*100)+'%';if(g.phase<=0){g.phase=0;g.grace=.7;SFX.fade();pills()}}
    if(g.grace>0)g.grace-=dt;
    for(const p of pipes){p.x-=speed*dt;if(!p.passed&&p.x+PW<gx-HR){p.passed=true;score++;$('score').textContent=score;SFX.score()}}
    while(pipes.length&&pipes[0].x<-PW-30)pipes.shift();
    while(!pipes.length||pipes[pipes.length-1].x<W+40)spawn();
    for(const it of items){it.x-=speed*dt;if(!it.got&&(it.x-gx)**2+(it.y-g.y)**2<30*30){it.got=true;SFX.power();burst(it.x,it.y,it.type==='shield'?'#c6ff5c':'#b48cff',22);if(it.type==='shield')g.shield=true;else g.phase=5;pills()}}
    items=items.filter(it=>!it.got&&it.x>-40);
    for(const p of pipes){if(p.x>gx+HR||p.x+PW<gx-HR)continue;const top=p.gy-p.gap/2,bot=p.gy+p.gap/2;if(hitRect(gx,g.y,HR,p.x,-200,PW,top+200)||hitRect(gx,g.y,HR,p.x,bot,PW,GY-bot)){hurt();break}}
    if(state==='play'&&g.y+HR>GY){if(g.phase>0||g.grace>0||g.shield){if(g.shield&&g.phase<=0&&g.grace<=0)breakShield();g.y=GY-HR;g.vy=-460}else die()}
    trailT-=dt;if(trailT<0){trailT=.03;parts.push({x:gx-10,y:g.y+8+Math.random()*8,vx:-speed*.35,vy:-10+Math.random()*20,life:0,max:.5,s:3,c:g.phase>0?'#b48cff':'#7ff7ff'})}
  }else{g.alpha=Math.max(0,g.alpha-dt*3)}
  g.sq=Math.max(0,g.sq-dt*5);
  for(const p of parts){p.life+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy*=.97}
  parts=parts.filter(p=>p.life<p.max);
  if(shakeT>0)shakeT=Math.max(0,shakeT-dt);
}

/* ---------- drawing ---------- */
function glow(c,b){ctx.shadowColor=c;ctx.shadowBlur=b}
function drawBg(){
  ctx.fillStyle=sky;ctx.fillRect(-30,-30,W+60,LH+60);
  ctx.fillStyle='#fff';
  for(const s of stars){ctx.globalAlpha=.35+.65*Math.abs(Math.sin(t*s.v+s.p));ctx.fillRect(s.x*W,s.y*(GY-170),s.s,s.s)}
  ctx.globalAlpha=1;
  const mx=W*.72,my=118;glow('#d4ff6a',46);ctx.fillStyle='#ecffb8';ctx.beginPath();ctx.arc(mx,my,34,0,PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle='#cfe89055';[[-10,-8,7],[9,6,9],[-6,14,4]].forEach(c=>{ctx.beginPath();ctx.arc(mx+c[0],my+c[1],c[2],0,PI*2);ctx.fill()});
  const o=bgOff*.15;ctx.beginPath();ctx.moveTo(-10,GY);
  for(let x=-10;x<=W+16;x+=16)ctx.lineTo(x,GY-78+Math.sin((x+o)*.011)*22+Math.sin((x+o)*.027)*10);
  ctx.lineTo(W+20,GY);ctx.closePath();ctx.fillStyle='#0c1736';ctx.fill();ctx.strokeStyle='#7ff7ff22';ctx.lineWidth=1.5;ctx.stroke();
  const TL=Math.max(W+220,1120);ctx.strokeStyle='#060c1f';ctx.lineCap='round';
  for(const tr of trees){const x=((tr.x-bgOff*.35)%TL+TL)%TL-110;ctx.save();ctx.translate(x,GY+4);ctx.scale(tr.s,tr.s);for(const sg of tr.segs){ctx.lineWidth=sg[4];ctx.beginPath();ctx.moveTo(sg[0],sg[1]);ctx.lineTo(sg[2],sg[3]);ctx.stroke()}ctx.restore()}
  for(const f of fog){const x=((f.x*W-bgOff*f.v*10)%(W+400)+W+400)%(W+400)-200,gr=ctx.createRadialGradient(x,f.y,0,x,f.y,f.r);gr.addColorStop(0,'rgba(127,247,255,.07)');gr.addColorStop(1,'rgba(127,247,255,0)');ctx.fillStyle=gr;ctx.fillRect(x-f.r,f.y-f.r,f.r*2,f.r*2)}
}
function drawPipe(p){
  const x=p.x,w=PW,r=w/2,top=p.gy-p.gap/2,bot=p.gy+p.gap/2;
  ctx.beginPath();ctx.moveTo(x,-20);ctx.lineTo(x,top-r);ctx.arc(x+r,top-r,r,PI,0,true);ctx.lineTo(x+w,-20);
  ctx.moveTo(x,GY+20);ctx.lineTo(x,bot+r);ctx.arc(x+r,bot+r,r,PI,0,false);ctx.lineTo(x+w,GY+20);
  ctx.fillStyle='#160b27';ctx.fill();glow('#ff4fd8',14);ctx.strokeStyle='#ff4fd8';ctx.lineWidth=3;ctx.stroke();ctx.shadowBlur=0;
  ctx.strokeStyle='#ff4fd833';ctx.lineWidth=1.5;ctx.beginPath();
  for(let y=top-r-40;y>0;y-=46){ctx.moveTo(x+6,y);ctx.lineTo(x+w-6,y)}
  for(let y=bot+r+60;y<GY;y+=46){ctx.moveTo(x+6,y);ctx.lineTo(x+w-6,y)}ctx.stroke();
  ctx.strokeStyle='#ff4fd8aa';ctx.lineWidth=2.5;ctx.beginPath();const cx=x+r,cy=bot+r+6;
  ctx.moveTo(cx,cy-12);ctx.lineTo(cx,cy+14);ctx.moveTo(cx-8,cy-4);ctx.lineTo(cx+8,cy-4);
  ctx.moveTo(cx,top-r-14);ctx.lineTo(cx,top-r+12);ctx.moveTo(cx-8,top-r+4);ctx.lineTo(cx+8,top-r+4);ctx.stroke();
}
function drawItem(it){
  const y=it.y+Math.sin(t*4+it.ph)*6,sh=it.type==='shield',c=sh?'#c6ff5c':'#b48cff';
  ctx.save();ctx.translate(it.x,y);glow(c,20);ctx.fillStyle=sh?'#c6ff5c22':'#b48cff22';ctx.strokeStyle=c;ctx.lineWidth=2.5;
  if(!sh){ctx.setLineDash([5,4]);ctx.rotate(t*1.5)}
  ctx.beginPath();ctx.arc(0,0,15,0,PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([]);ctx.shadowBlur=0;ctx.lineWidth=2;ctx.beginPath();
  if(sh){ctx.moveTo(0,-8);ctx.lineTo(6,-5.5);ctx.lineTo(6,-1);ctx.quadraticCurveTo(6,5,0,8);ctx.quadraticCurveTo(-6,5,-6,-1);ctx.lineTo(-6,-5.5);ctx.closePath()}
  else{ctx.arc(-3,0,5,0,PI*2);ctx.moveTo(8,0);ctx.arc(3,0,5,0,PI*2)}
  ctx.stroke();ctx.restore();
}
function drawGround(){
  ctx.fillStyle='#050c10';ctx.fillRect(-30,GY,W+60,LH-GY+40);
  glow('#2dffc4',12);ctx.strokeStyle='#2dffc4';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-30,GY);ctx.lineTo(W+30,GY);ctx.stroke();ctx.shadowBlur=0;
  ctx.strokeStyle='#2dffc488';ctx.lineWidth=2;ctx.beginPath();const off=groundOff%14;
  for(let x=-off-14,i=Math.floor(groundOff/14);x<W+14;x+=14,i++){const h=5+(i*7%5);ctx.moveTo(x,GY);ctx.lineTo(x+3,GY-h);ctx.lineTo(x+6,GY)}
  ctx.stroke();ctx.strokeStyle='#2dffc41f';ctx.lineWidth=2;ctx.beginPath();const o2=groundOff%40;
  for(let x=-o2-40;x<W+40;x+=40){ctx.moveTo(x,GY+22);ctx.lineTo(x+18,GY+22);ctx.moveTo(x+20,GY+44);ctx.lineTo(x+34,GY+44)}ctx.stroke();
}
function drawGhost(){
  if(g.alpha<=0)return;
  const ph=g.phase>0,flick=g.grace>0&&Math.floor(t*14)%2===0;
  ctx.save();ctx.translate(gx,g.y);ctx.rotate(g.rot*.6);ctx.scale(1+g.sq*.12,1-g.sq*.12);
  ctx.globalAlpha=g.alpha*(ph?.55+.15*Math.sin(t*12):1)*(flick?.35:1);
  const R=GR,c=ph?'#b48cff':'#7ff7ff';
  ctx.beginPath();ctx.moveTo(-R,2);ctx.arc(0,2,R,PI,0);ctx.lineTo(R,R+2);
  for(let i=0;i<3;i++){const x0=R-i*(2*R/3),x1=x0-2*R/3,wob=Math.sin(t*10+i)*3;ctx.quadraticCurveTo((x0+x1)/2,R+12+wob,x1,R+2)}
  ctx.closePath();
  const gr=ctx.createRadialGradient(-4,-4,2,0,4,R*1.4);gr.addColorStop(0,'#ffffffee');gr.addColorStop(.55,ph?'#d9c8ffcc':'#c9fdffcc');gr.addColorStop(1,ph?'#b48cff55':'#7ff7ff55');
  ctx.fillStyle=gr;ctx.fill();glow(c,18);ctx.strokeStyle=c;ctx.lineWidth=2.5;ctx.stroke();ctx.shadowBlur=0;
  ctx.fillStyle='#08142a';ctx.beginPath();ctx.ellipse(-6,-1,3.4,4.6,0,0,PI*2);ctx.ellipse(7,-1,3.4,4.6,0,0,PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-5,-3,1.3,0,PI*2);ctx.arc(8,-3,1.3,0,PI*2);ctx.fill();
  ctx.fillStyle='#ff4fd866';ctx.beginPath();ctx.arc(-11,6,3,0,PI*2);ctx.arc(12,6,3,0,PI*2);ctx.fill();
  ctx.fillStyle='#08142a';ctx.beginPath();ctx.ellipse(1,8,2.4,g.vy<-100?3.4:2,0,0,PI*2);ctx.fill();
  ctx.restore();
  if(g.shield){ctx.save();ctx.translate(gx,g.y+4);ctx.rotate(t*2);glow('#c6ff5c',16);ctx.strokeStyle='#c6ff5c';ctx.lineWidth=2.5;ctx.setLineDash([14,8]);ctx.beginPath();ctx.arc(0,0,GR+12,0,PI*2);ctx.stroke();ctx.restore()}
}
function draw(){
  ctx.setTransform(S*dpr,0,0,S*dpr,0,0);
  if(shakeT>0)ctx.translate((Math.random()-.5)*shakeT*28,(Math.random()-.5)*shakeT*28);
  drawBg();for(const p of pipes)drawPipe(p);for(const it of items)drawItem(it);drawGround();
  ctx.globalCompositeOperation='lighter';
  for(const p of parts){ctx.globalAlpha=1-p.life/p.max;ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.s*(1-p.life/p.max*.5),0,PI*2);ctx.fill()}
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.shadowBlur=0;
  drawGhost();
}
function frame(now){const dt=Math.min((now-last)/1000||0,1/30);last=now;if(!paused)update(dt);draw();requestAnimationFrame(frame)}

/* ---------- UI & input ---------- */
function show(id){for(const o of ['title','over','pause','hint'])$(o).classList.toggle('on',o===id)}
function setPause(v){if(state!=='play')v=false;paused=v;show(v?'pause':null);if(ac){v?ac.suspend().catch(()=>{}):ac.resume().catch(()=>{})}}
function start(){state='play';show(null);$('score').classList.add('on');$('pauseBtn').style.visibility='visible'}
function action(){
  ensureAudio();
  if(paused){setPause(false);return}
  if(state==='title'||state==='ready'){start();flap();return}
  if(state==='play'){flap();return}
  if(state==='dead'&&performance.now()-deadAt>800)restart();
}
function restart(){reset();state='ready';$('score').classList.add('on');show('hint')}
stage.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;e.preventDefault();action()});
stage.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
document.addEventListener('dblclick',e=>e.preventDefault());
$('again').addEventListener('click',()=>{ensureAudio();restart()});
$('pauseBtn').addEventListener('click',()=>{ensureAudio();setPause(!paused)});
function syncBtns(){$('sfxBtn').classList.toggle('off',!sfxOn);$('musBtn').classList.toggle('off',!musOn);$('sfxBtn').setAttribute('aria-pressed',sfxOn);$('musBtn').setAttribute('aria-pressed',musOn)}
$('sfxBtn').addEventListener('click',()=>{sfxOn=!sfxOn;store.set('sfx',sfxOn);ensureAudio();applyAudio();syncBtns()});
$('musBtn').addEventListener('click',()=>{musOn=!musOn;store.set('music',musOn);ensureAudio();applyAudio();syncBtns()});
document.addEventListener('keydown',e=>{
  if(e.repeat)return;
  if(e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW'){e.preventDefault();if(document.activeElement&&document.activeElement.tagName==='BUTTON')document.activeElement.blur();action()}
  else if(e.code==='KeyP'||e.code==='Escape'){if(state==='play')setPause(!paused)}
  else if(e.code==='KeyM'){const on=!(sfxOn||musOn);sfxOn=musOn=on;store.set('sfx',on);store.set('music',on);ensureAudio();applyAudio();syncBtns()}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(state==='play'&&!paused)setPause(true);if(ac)ac.suspend().catch(()=>{})}else if(ac&&!paused)ac.resume().catch(()=>{})});
new ResizeObserver(resize).observe(stage);
window.addEventListener('orientationchange',()=>setTimeout(resize,200));

$('tBest').textContent=best;syncBtns();resize();reset();requestAnimationFrame(frame);
}

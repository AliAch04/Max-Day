const SLOT=18,START=300,END=1380,LANE=58,N=(END-START)/15,KEY='allday.prio';
const DAYS=['LUN.','MAR.','MER.','JEU.','VEN.','SAM.','DIM.'];
const m=s=>{const[a,b]=s.split(':');return +a*60+ +b};
const f=n=>String(n/60|0).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
const $=s=>document.querySelector(s);
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
let D,order,hidden=new Set();

fetch('data.json').then(r=>r.json()).then(j=>{D=j;order=load();render()})
 .catch(()=>{$('#tt').textContent='Impossible de charger data.json. Ouvre l’application via un serveur (voir README), pas en double-clic.'});

function load(){
  try{const o=JSON.parse(localStorage.getItem(KEY));
    if(Array.isArray(o)&&o.length===D.priority.length&&D.priority.every(c=>o.includes(c)))return o}catch(e){}
  return D.priority.slice();
}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(order))}catch(e){}};
const rank=c=>{const i=order.indexOf(c);return i<0?9:i};

function week(){
  const t=new Date();t.setHours(12,0,0,0);
  const mon=new Date(t);mon.setDate(t.getDate()-((t.getDay()+6)%7));
  return [...Array(7)].map((_,i)=>{const x=new Date(mon);x.setDate(mon.getDate()+i);return x});
}
function prayerTimes(date){
  const k=iso(date);if(D.prayers[k])return D.prayers[k];
  const best=Object.keys(D.prayers).sort((a,b)=>Math.abs(new Date(a)-date)-Math.abs(new Date(b)-date))[0];
  return D.prayers[best];
}
function dayEvents(i,date){
  const out=D.events.filter(e=>e.d.includes(i)).map(e=>({a:m(e.a),b:m(e.b),c:e.c,l:e.l,t:e.t,red:e.red}));
  const pt=prayerTimes(date);
  D.prayerNames.forEach((p,k)=>{
    let a=m(pt[k]),dur=p.dur,l=p.l;
    const o=D.overrides.find(o=>o.p===p.id&&o.d.includes(i));
    if(o){a=m(o.at);dur=o.dur;l=o.l||l}
    out.push({a,b:a+dur,c:'priere',l});
  });
  return out;
}
function layout(evs){
  const v=evs.filter(e=>!hidden.has(e.c)).map(e=>({...e,a:Math.max(e.a,START),b:Math.min(e.b,END)})).filter(e=>e.a<e.b);
  const lanes=[];
  v.sort((x,y)=>rank(x.c)-rank(y.c)||x.a-y.a).forEach(e=>{
    let i=lanes.findIndex(L=>L.every(o=>o.b<=e.a||o.a>=e.b));
    if(i<0){lanes.push([]);i=lanes.length-1}
    lanes[i].push(e);e.lane=i;
  });
  return {v,n:Math.max(1,lanes.length)};
}
function render(){
  const dates=week(),today=(new Date().getDay()+6)%7,W=N*SLOT,hours={};
  let h='<div class="row hd"><div class="day"></div><div class="hr" style="width:'+W+'px">';
  for(let t=START;t<END;t+=60)h+=`<span style="width:${4*SLOT}px">${f(t)}</span>`;
  h+='</div></div>';
  dates.forEach((dt,i)=>{
    const all=dayEvents(i,dt);
    all.forEach(e=>hours[e.c]=(hours[e.c]||0)+(Math.min(e.b,END)-Math.max(e.a,START))/60);
    const {v,n}=layout(all);
    h+=`<div class="row${i===today?' today':''}"><div class="day">${DAYS[i]}<small>${dt.getDate()}/${dt.getMonth()+1}</small></div>`+
      `<div class="track" style="width:${W}px;height:${n*LANE}px;--hour:${4*SLOT}px">`;
    v.forEach(e=>{
      const w=(e.b-e.a)/15*SLOT;
      const tip=`${e.l}${e.t?' ('+e.t+')':''} · ${f(e.a)}–${f(e.b)}`;
      h+=`<div class="ev c-${e.c}${e.red?' red':''}${w<64?' v':''}" data-tip="${tip}" title="${tip}" style="left:${(e.a-START)/15*SLOT}px;width:${w-1}px;top:${e.lane*LANE+2}px;height:${LANE-4}px">${e.l}${w>=64&&e.t?'<i>'+e.t+'</i>':''}${w>=130?'<small>'+f(e.a)+'–'+f(e.b)+'</small>':''}</div>`;
    });
    if(i===today){const t=new Date(),n2=t.getHours()*60+t.getMinutes();
      if(n2>=START&&n2<=END)h+=`<div class="now" style="left:${(n2-START)/15*SLOT}px"></div>`}
    h+='</div></div>';
  });
  const keep=$('#tt').scrollLeft;
  $('#tt').innerHTML=h;
  $('#tt').scrollLeft=keep;
  $('#prio').innerHTML=order.map((c,i)=>`<li class="c-${c}">${i+1}. ${D.categories[c]} (${Math.round(hours[c]||0)} h)<button data-c="${c}" data-m="-1" aria-label="Monter" ${i===0?'disabled':''}>▲</button><button data-c="${c}" data-m="1" aria-label="Descendre" ${i===order.length-1?'disabled':''}>▼</button></li>`).join('');
  $('#leg').innerHTML=[...order,'autre'].map(c=>`<button class="tg c-${c}" data-t="${c}" aria-pressed="${!hidden.has(c)}">${D.categories[c]}</button>`).join('');
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button'),ev=e.target.closest('.ev');
  if(ev){$('#info').textContent=ev.dataset.tip;return}
  if(!b||!D)return;
  if(b.dataset.m){const i=order.indexOf(b.dataset.c),j=i+ +b.dataset.m;
    if(j>=0&&j<order.length){[order[i],order[j]]=[order[j],order[i]];save();render()}}
  else if(b.dataset.t){hidden.has(b.dataset.t)?hidden.delete(b.dataset.t):hidden.add(b.dataset.t);render()}
  else if(b.id==='reset'){order=D.priority.slice();save();render()}
});
setInterval(()=>D&&render(),60000);

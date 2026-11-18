const SLOT=18,START=300,END=1380,LANE=58,N=(END-START)/15,KEY='allday.prio',XKEY='allday.extra';
const DAYS=['LUN.','MAR.','MER.','JEU.','VEN.','SAM.','DIM.'];
const m=s=>{const[a,b]=s.split(':');return +a*60+ +b};
const f=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(Math.round(n%60)).padStart(2,'0');
const $=s=>document.querySelector(s);
const p2=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());
const loc=d=>iso(d)+'T'+p2(d.getHours())+':'+p2(d.getMinutes());
const dt=s=>s.slice(8,10)+'/'+s.slice(5,7)+' '+s.slice(11,16);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let D,order,extra=[],wk=0,hidden=new Set();
try{extra=JSON.parse(localStorage.getItem(XKEY))||[]}catch(e){extra=[]}
if(!Array.isArray(extra))extra=[];
const saveX=()=>{try{localStorage.setItem(XKEY,JSON.stringify(extra))}catch(e){}};

fetch('data.json').then(r=>r.json()).then(j=>{D=j;order=load();render()})
 .catch(()=>{$('#tt').textContent='Impossible de charger data.json. Ouvre l’application via un serveur (voir README), pas en double-clic.'});

function load(){
  try{const o=JSON.parse(localStorage.getItem(KEY));
    if(Array.isArray(o)&&o.length===D.priority.length&&D.priority.every(c=>o.includes(c)))return o}catch(e){}
  return D.priority.slice();
}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(order))}catch(e){}};
const rank=c=>{const i=order.indexOf(c);return i<0?9:i};

function monday(d){const t=new Date(d);t.setHours(12,0,0,0);t.setDate(t.getDate()-((t.getDay()+6)%7));return t}
function week(){
  const mon=monday(new Date());mon.setDate(mon.getDate()+7*wk);
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
  const d0=new Date(date.getFullYear(),date.getMonth(),date.getDate()),d1=new Date(d0.getTime()+864e5);
  extra.forEach(x=>{
    const s=new Date(x.s),e=new Date(x.e);
    if(s<d1&&e>d0)out.push({a:Math.round((Math.max(s,d0)-d0)/6e4),b:Math.round((Math.min(e,d1)-d0)/6e4),c:x.c,l:x.l,id:x.id,x:1,s:x.s,e:x.e});
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
  const dates=week(),today=wk===0?(new Date().getDay()+6)%7:-1,W=N*SLOT,hours={};
  $('#wl').textContent=`${dates[0].getDate()}/${dates[0].getMonth()+1} – ${dates[6].getDate()}/${dates[6].getMonth()+1}`;
  let h='<div class="row hd"><div class="day"></div><div class="hr" style="width:'+W+'px">';
  for(let t=START;t<END;t+=60)h+=`<span style="width:${4*SLOT}px">${f(t)}</span>`;
  h+='</div></div>';
  dates.forEach((d,i)=>{
    const all=dayEvents(i,d);
    all.forEach(e=>hours[e.c]=(hours[e.c]||0)+(Math.min(e.b,END)-Math.max(e.a,START))/60);
    const {v,n}=layout(all);
    h+=`<div class="row${i===today?' today':''}"><div class="day">${DAYS[i]}<small>${d.getDate()}/${d.getMonth()+1}</small></div>`+
      `<div class="track" style="width:${W}px;height:${n*LANE}px;--hour:${4*SLOT}px">`;
    v.forEach(e=>{
      const w=(e.b-e.a)/15*SLOT;
      const tip=e.x?`★ ${e.l} · ${dt(e.s)} → ${dt(e.e)}`:`${e.l}${e.t?' ('+e.t+')':''} · ${f(e.a)}–${f(e.b)}`;
      h+=`<div class="ev c-${e.c}${e.red?' red':''}${e.x?' extra':''}${w<64?' v':''}" data-tip="${esc(tip)}"${e.x?` data-id="${e.id}"`:''} title="${esc(tip)}" style="left:${(e.a-START)/15*SLOT}px;width:${w-1}px;top:${e.lane*LANE+2}px;height:${LANE-4}px">${e.x?'★ ':''}${esc(e.l)}${w>=64&&e.t?'<i>'+esc(e.t)+'</i>':''}${w>=130?'<small>'+f(e.a)+'–'+f(e.b)+'</small>':''}</div>`;
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
function setInfo(t,id){
  const i=$('#info');i.textContent=t;
  if(id){const b=document.createElement('button');b.className='del';b.textContent='Supprimer';b.dataset.del=id;i.append(b)}
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button'),ev=e.target.closest('.ev');
  if(ev){setInfo(ev.dataset.tip,ev.dataset.id);return}
  if(!b||!D)return;
  if(b.dataset.del){extra=extra.filter(x=>x.id!==b.dataset.del);saveX();render();$('#info').textContent='Séance supprimée.'}
  else if(b.dataset.m){const i=order.indexOf(b.dataset.c),j=i+ +b.dataset.m;
    if(j>=0&&j<order.length){[order[i],order[j]]=[order[j],order[i]];save();render()}}
  else if(b.dataset.t){hidden.has(b.dataset.t)?hidden.delete(b.dataset.t):hidden.add(b.dataset.t);render()}
  else if(b.id==='reset'){order=D.priority.slice();save();render()}
  else if(b.id==='prev'){wk--;render()}
  else if(b.id==='next'){wk++;render()}
  else if(b.id==='now'){wk=0;render()}
});
$('#add').onclick=()=>{
  if(!D)return;
  $('#fc').innerHTML=[...order,'autre'].map((c,i)=>`<option value="${c}">${D.categories[c]} — ${c==='autre'?'priorité la plus basse':'priorité '+(i+1)}</option>`).join('');
  const n=new Date();n.setMinutes(0,0,0);n.setHours(n.getHours()+1);
  $('#fs').value=loc(n);$('#fe').value=loc(new Date(n.getTime()+36e5));
  $('#fn').value='';$('#err').textContent='';
  $('#dlg').showModal();
};
$('#cancel').onclick=()=>$('#dlg').close();
$('#f').addEventListener('submit',ev=>{
  ev.preventDefault();
  const l=$('#fn').value.trim(),s=$('#fs').value,e=$('#fe').value;
  if(!l||!s||!e){$('#err').textContent='Remplis tous les champs.';return}
  if(new Date(e)<=new Date(s)){$('#err').textContent='La fin doit être après le début.';return}
  extra.push({id:Date.now().toString(36),l,s,e,c:$('#fc').value});saveX();
  wk=Math.round((monday(new Date(s))-monday(new Date()))/(7*864e5));
  $('#dlg').close();render();$('#info').textContent='Séance ajoutée : touche-la pour la supprimer.';
});
setInterval(()=>D&&render(),60000);

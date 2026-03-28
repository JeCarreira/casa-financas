// ===================== API & STATE =====================
const API = '/api';
let USER_KEY = '';
let entradas=[], despesas=[], diario=[], objetivos=[], desejos=[], templates=[], desafios=[], notas=[];

const CAT_COLORS = {
  'Habitação':'#1B4F72','Alimentação':'#1E6348','Transportes':'#7A4A0A','Filhos':'#3D2580',
  'Saúde':'#8B1F1F','Lazer':'#0E5E5E','Serviços':'#4A3A6B','Vestuário':'#5C3D1E',
  'Café / Bar':'#6B4226','Gasolina':'#4A3A0A','Compras':'#1A4A1A','Criança':'#3D2580',
  'Farmácia':'#8B1F1F','Outro':'#5C5C5C'
};

function catDot(cat,size=10){
  const c=CAT_COLORS[cat]||'#888';
  return `<span style="display:inline-block;width:${size}px;height:${size}px;border-radius:50%;background:${c};flex-shrink:0;"></span>`;
}
function catBadge(cat){
  const c=CAT_COLORS[cat]||'#888';
  return `<span class="cat-badge" style="background:${c};">${catDot(9)} ${cat}</span>`;
}

// ===================== SYNC =====================
function setSS(s){
  const dot=g('sync-dot'),lbl=g('sync-lbl');
  if(!dot)return;
  dot.className='dot'+(s==='syncing'?' syncing':s==='error'?' error':'');
  lbl.textContent=s==='syncing'?'a guardar...':s==='error'?'erro':'guardado';
}

async function saveAll(){
  if(!USER_KEY)return;
  setSS('syncing');
  try{
    await apiFetch('/save',{key:USER_KEY,data:{entradas,despesas,diario,objetivos,desejos,templates,desafios,notas}});
    setSS('saved');
  }catch{setSS('error');}
}

async function loadAll(){
  const res=await apiFetch('/load',{key:USER_KEY});
  if(res&&res.data){
    const d=res.data;
    entradas=d.entradas||[];despesas=d.despesas||[];diario=d.diario||[];
    objetivos=d.objetivos||[];desejos=d.desejos||[];desafios=d.desafios||[];notas=d.notas||[];
    templates=d.templates||defaultTemplates();
  } else {
    templates=defaultTemplates();
  }
}

async function apiFetch(path,body){
  const r=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok)throw new Error('api err');
  return r.json();
}

function defaultTemplates(){
  return [
    {id:1,nome:'Renda / Crédito habitação',valor:700,cat:'Habitação',ativo:true},
    {id:2,nome:'Electricidade + água + gás',valor:120,cat:'Serviços',ativo:true},
    {id:3,nome:'Internet + telemóvel',valor:60,cat:'Serviços',ativo:true},
    {id:4,nome:'Supermercado semanal',valor:400,cat:'Alimentação',ativo:true},
    {id:5,nome:'Gasolina',valor:150,cat:'Transportes',ativo:true},
    {id:6,nome:'Escola / actividades filhos',valor:200,cat:'Filhos',ativo:true},
  ];
}

// ===================== LOGIN =====================
async function doLogin(){
  const code=g('login-code').value.trim().toLowerCase().replace(/\s+/g,'-');
  if(code.length<4){g('login-err').textContent='Código demasiado curto.';return;}
  g('login-err').textContent='A carregar...';
  USER_KEY=code;
  try{
    await loadAll();
    g('login-screen').style.display='none';
    g('app').style.display='block';
    localStorage.setItem('cf_code',code);
    populateSels();renderResumo();renderTpl();renderDesafiosSugeridos();renderDicas();
    setTimeout(checkReminder,1500);
    g('login-err').textContent='';
  }catch(e){
    g('login-err').textContent='Erro ao carregar dados. Verifica a ligação.';
    USER_KEY='';
  }
}

window.addEventListener('load',async()=>{
  const last=localStorage.getItem('cf_code');
  if(last){g('login-code').value=last;await doLogin();}
});

// ===================== UTILS =====================
const fmt=n=>(Math.round(n*100)/100).toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
const today=()=>new Date().toISOString().split('T')[0];
const mk=d=>d?d.slice(0,7):'';
const cur=()=>{const n=new Date();return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;};
const mlbl=k=>{if(!k)return '';const[y,m]=k.split('-');return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][+m-1]+' '+y;};
const uid=()=>Date.now()+Math.random();
const g=id=>document.getElementById(id);
function setTd(id){const e=g(id);if(e&&!e.value)e.value=today();}

function allMonths(){
  const s=new Set(),n=new Date();
  for(let i=5;i>=0;i--){const d=new Date(n.getFullYear(),n.getMonth()-i,1);s.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);}
  [...entradas,...despesas,...diario].forEach(x=>{if(x.data)s.add(mk(x.data));});
  return [...s].sort();
}

function populateSels(){
  const months=allMonths(),c=cur();
  ['r-month','e-month','d-month'].forEach(id=>{
    const el=g(id);if(!el)return;
    const prev=el.value||c;
    el.innerHTML=months.map(m=>`<option value="${m}"${m===prev?' selected':''}>${mlbl(m)}</option>`).join('');
  });
}

function openM(id){g(id).classList.add('on');}
function closeM(id){g(id).classList.remove('on');}
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal-overlay.on').forEach(m=>m.classList.remove('on'));});

// ===================== NAV =====================
function go(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  g('page-'+page).classList.add('on');
  const tabs=document.querySelectorAll('.tab');
  tabs.forEach(t=>{
    const map={resumo:'Resumo',entradas:'Entradas',despesas:'Despesas',diario:'Diário',objetivos:'Objetivos',desafios:'Desafios',desejos:'Desejos',dicas:'Dicas'};
    if(t.textContent===map[page])t.classList.add('on');
  });
  if(page==='resumo')renderResumo();
  if(page==='entradas'){setTd('sl-dt');setTd('caf-dt');setTd('pv-dt');renderEntradas();}
  if(page==='despesas'){setTd('da-dt');renderDesp();}
  if(page==='diario'){setTd('dr-dt');renderDiar();}
  if(page==='objetivos')renderObjs();
  if(page==='desafios')renderDesafios();
  if(page==='desejos'){renderDesejos();analisarDesejos();}
  if(page==='dicas')renderDicas();
}

function reRender(){
  populateSels();
  const active=document.querySelector('.page.on');
  if(!active)return;
  const id=active.id.replace('page-','');
  go(id);
}

// ===================== ENTRADAS =====================
async function addEnt(tipo){
  const map={salario:['sl-d','sl-v','sl-dt'],caf:['caf-d','caf-v','caf-dt'],prevista:['pv-d','pv-v','pv-dt']};
  const[di,vi,dti]=map[tipo];
  const desc=g(di).value.trim(),val=parseFloat(g(vi).value),data=g(dti).value||today();
  if(!desc||!val||val<=0){alert('Preenche descrição e valor.');return;}
  const nota=tipo==='prevista'?g('pv-n').value.trim():'';
  entradas.push({id:uid(),tipo,desc,valor:val,data,nota});
  g(vi).value='';if(tipo==='prevista')g('pv-n').value='';
  await saveAll();reRender();
  if(tipo==='prevista')analisarPrev();
}
async function delEnt(id){entradas=entradas.filter(e=>e.id!==id);await saveAll();reRender();}

function renderEntradas(){
  const m=g('e-month').value;
  ['salario','caf','prevista'].forEach(tipo=>{
    const f=entradas.filter(e=>e.tipo===tipo&&mk(e.data)===m).sort((a,b)=>b.data.localeCompare(a.data));
    const el=g('lst-'+tipo);if(!el)return;
    el.innerHTML=f.length?f.map(e=>`<div class="li"><div class="ll"><div class="ln">${e.desc}</div><div class="ls">${e.data}${e.nota?' · '+e.nota:''}</div></div><div class="lr"><span class="am ${tipo==='prevista'?'apv':'ai'}">${tipo==='prevista'?'~':'+'}${fmt(e.valor)}</span><button class="btn bd bxs" onclick="delEnt(${e.id})">×</button></div></div>`).join(''):'<div style="font-size:13px;color:var(--t3);padding:.4rem 0;">Sem registos.</div>';
  });
  if(m===cur())analisarPrev();
}

async function analisarPrev(){
  const m=cur(),prevs=entradas.filter(e=>e.tipo==='prevista'&&mk(e.data)===m);
  const el=g('pv-sugestao');if(!el)return;
  if(!prevs.length){el.innerHTML='';return;}
  const total=prevs.reduce((s,e)=>s+e.valor,0);
  el.innerHTML='<div class="loading-box"><div class="spinner"></div>A analisar entradas previstas...</div>';
  const objs=objetivos.filter(o=>o.ativo!==false);
  const prompt=`Especialista finanças pessoais Portugal. Entradas previstas de ${fmt(total)} (${prevs.map(p=>p.desc+': '+fmt(p.valor)).join(', ')}). Objetivos: ${objs.map(o=>`${o.nome} meta ${fmt(o.meta)} poupado ${fmt(o.atual||0)}`).join('; ')||'nenhum'}. Dá 3 sugestões práticas do que fazer com este dinheiro extra, português de Portugal, max 90 palavras, prosa fluida.`;
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,messages:[{role:'user',content:prompt}]})});
    const d=await r.json();
    const txt=d.content?.map(b=>b.text||'').join('')||'';
    el.innerHTML=txt?`<div class="ai-box"><div class="ai-title">O que fazer com as previstas?</div><div class="ai-text">${txt}</div></div>`:'';
  }catch{el.innerHTML='';}
}

// ===================== TEMPLATE =====================
function renderTpl(){
  const el=g('tpl-list');if(!el)return;
  if(!templates.length){el.innerHTML='<div style="font-size:13px;color:var(--t3);">Sem rubricas. Adiciona com o botão acima.</div>';return;}
  el.innerHTML=templates.map(t=>{
    const c=CAT_COLORS[t.cat]||'#888';
    return `<div class="tpl-item" style="background:${t.ativo!==false?'var(--surface)':'var(--surface2)'};">
      <input type="checkbox" ${t.ativo!==false?'checked':''} onchange="tplChk(${t.id},this.checked)" style="width:16px;flex-shrink:0;cursor:pointer;accent-color:var(--accent);">
      ${catDot(t.cat,10)}
      <span style="flex:1;font-size:13px;${t.ativo===false?'color:var(--t3);':''}">${t.nome}</span>
      <input type="number" value="${t.valor}" onchange="tplVal(${t.id},this.value)" style="width:72px;background:transparent;border:none;border-bottom:1px dashed var(--border2);border-radius:0;padding:2px 4px;font-size:13px;text-align:right;color:var(--t);"> €
      <button class="btn bd bxs" onclick="delTpl(${t.id})">×</button>
    </div>`;
  }).join('');
}
function tplChk(id,v){const t=templates.find(x=>x.id===id);if(t)t.ativo=v;renderTpl();saveAll();}
function tplVal(id,v){const t=templates.find(x=>x.id===id);if(t)t.valor=parseFloat(v)||0;saveAll();}
async function delTpl(id){templates=templates.filter(t=>t.id!==id);await saveAll();renderTpl();}
async function addTpl(){
  const n=g('tpl-n').value.trim(),v=parseFloat(g('tpl-v').value)||0,c=g('tpl-c').value;
  if(!n)return alert('Escreve um nome.');
  templates.push({id:uid(),nome:n,valor:v,cat:c,ativo:true});
  await saveAll();renderTpl();closeM('m-addtpl');
  g('tpl-n').value='';g('tpl-v').value='';
}
async function aplicarTpl(){
  const m=g('d-month').value,ativos=templates.filter(t=>t.ativo!==false&&t.valor>0);
  if(!ativos.length){alert('Nenhuma rubrica activa.');return;}
  let n=0;
  ativos.forEach(t=>{
    if(!despesas.some(d=>d.tplId===t.id&&mk(d.data)===m)){
      despesas.push({id:uid(),tplId:t.id,desc:t.nome,valor:t.valor,cat:t.cat,data:m+'-05',tipo:'fixa',pago:false});n++;
    }
  });
  await saveAll();renderDesp();
  if(n===0)alert('Rubricas já aplicadas a este mês.');
  else{alert(n+' despesas fixas adicionadas!');renderResumo();}
}

// ===================== DESPESAS =====================
async function addDesp(){
  const desc=g('da-d').value.trim(),val=parseFloat(g('da-v').value),cat=g('da-c').value,data=g('da-dt').value||today();
  if(!desc||!val||val<=0){alert('Preenche descrição e valor.');return;}
  despesas.push({id:uid(),desc,valor:val,cat,data,tipo:'pontual',pago:false});
  g('da-d').value='';g('da-v').value='';
  await saveAll();reRender();
}
async function delDesp(id){despesas=despesas.filter(d=>d.id!==id);await saveAll();reRender();}
async function togglePago(id){
  const d=despesas.find(x=>x.id===id);
  if(d){d.pago=!d.pago;await saveAll();renderDesp();renderResumo();}
}

function renderDesp(){
  renderTpl();
  const m=g('d-month').value;
  const f=despesas.filter(d=>mk(d.data)===m).sort((a,b)=>b.data.localeCompare(a.data));
  const total=f.reduce((s,d)=>s+d.valor,0);
  const pago=f.filter(d=>d.pago).reduce((s,d)=>s+d.valor,0);
  g('d-total-pill').textContent=`Total: ${fmt(total)} · Pago: ${fmt(pago)}`;
  const el=g('lst-despesas');
  if(!f.length){el.innerHTML='<div style="font-size:13px;color:var(--t3);padding:.4rem 0;">Sem despesas. Usa as despesas fixas mensais acima.</div>';return;}
  const byCat={};
  f.forEach(d=>{byCat[d.cat]=byCat[d.cat]||[];byCat[d.cat].push(d);});
  let html='';
  Object.entries(byCat).forEach(([cat,items])=>{
    const catTotal=items.reduce((s,d)=>s+d.valor,0);
    html+=`<div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--t3);padding:9px 0 5px;border-top:.5px solid var(--border);margin-top:3px;">${catDot(cat,9)}<span>${cat}</span><span style="margin-left:auto;font-weight:400;">${fmt(catTotal)}</span></div>`;
    html+=items.map(d=>`<div class="li" style="${d.pago?'opacity:.55;':''}" >
      <div class="ll">
        <div class="ln" style="${d.pago?'text-decoration:line-through;':''}">${d.desc}</div>
        <div class="ls">${d.data}${d.tipo==='fixa'?' · fixa':' · pontual'}</div>
      </div>
      <div class="lr">
        <span class="am ao">-${fmt(d.valor)}</span>
        <button class="btn-check ${d.pago?'checked':''}" onclick="togglePago(${d.id})" title="${d.pago?'Marcar como não pago':'Marcar como pago'}">${d.pago?'✓ Pago':'Pagar'}</button>
        <button class="btn bd bxs" onclick="delDesp(${d.id})">×</button>
      </div>
    </div>`).join('');
  });
  el.innerHTML=html;
}

// ===================== DIÁRIO =====================
async function addDiar(){
  const desc=g('dr-d').value.trim(),val=parseFloat(g('dr-v').value),cat=g('dr-c').value,data=g('dr-dt').value||today();
  if(!desc||!val||val<=0){alert('Preenche descrição e valor.');return;}
  diario.push({id:uid(),desc,valor:val,cat,data});
  g('dr-d').value='';g('dr-v').value='';
  await saveAll();reRender();
}
async function delDiar(id){diario=diario.filter(d=>d.id!==id);await saveAll();reRender();}

function renderDiar(){
  const m=cur();
  const f=diario.filter(d=>mk(d.data)===m).sort((a,b)=>b.data.localeCompare(a.data));
  const total=f.reduce((s,d)=>s+d.valor,0);
  g('dr-total-pill').textContent='Este mês: '+fmt(total);
  const entIn=entradas.filter(e=>e.tipo!=='prevista'&&mk(e.data)===m).reduce((s,e)=>s+e.valor,0);
  const despIn=despesas.filter(d=>mk(d.data)===m).reduce((s,d)=>s+d.valor,0);
  const disp=Math.max(entIn-despIn,0);
  const lim=Math.round(disp*0.2);
  const{daysLeft}=cycleInfo();
  let alts='';
  if(daysLeft<=5&&daysLeft>0)alts+=`<div class="alert alr"><strong>Faltam ${daysLeft} dias</strong> para o dia 5 — fim do ciclo. Cuidado com os gastos!</div>`;
  else if(daysLeft<=10)alts+=`<div class="alert ala"><strong>Faltam ${daysLeft} dias</strong> para o dia 5.</div>`;
  if(lim>0&&total>lim)alts+=`<div class="alert alr">Os gastos diários (${fmt(total)}) ultrapassaram o recomendado (${fmt(lim)}).</div>`;
  g('diar-alerts').innerHTML=alts;
  const el=g('lst-diario');
  if(!f.length){el.innerHTML='<div style="font-size:13px;color:var(--t3);padding:.4rem 0;">Sem registos este mês.</div>';return;}
  const byDate={};
  f.forEach(d=>{byDate[d.data]=byDate[d.data]||[];byDate[d.data].push(d);});
  let html='';
  Object.entries(byDate).sort((a,b)=>b[0].localeCompare(a[0])).forEach(([date,items])=>{
    const dt=items.reduce((s,d)=>s+d.valor,0);
    html+=`<div class="day-lbl">${date}<span>${fmt(dt)}</span></div>`;
    html+=items.map(d=>`<div class="li"><div class="ll"><div class="ln">${d.desc}</div><div class="ls" style="display:flex;align-items:center;gap:4px;">${catDot(d.cat,8)} ${d.cat}</div></div><div class="lr"><span class="am ao">-${fmt(d.valor)}</span><button class="btn bd bxs" onclick="delDiar(${d.id})">×</button></div></div>`).join('');
  });
  el.innerHTML=html;
}

// ===================== OBJETIVOS =====================
async function addObj(){
  const nome=g('o-nome').value.trim(),meta=parseFloat(g('o-meta').value)||0;
  if(!nome||!meta)return alert('Preenche nome e meta.');
  objetivos.push({id:uid(),nome,meta,prazo:g('o-prazo').value,atual:parseFloat(g('o-atual').value)||0,mensal:parseFloat(g('o-mensal').value)||0,notas:g('o-notas').value.trim(),historico:[]});
  ['o-nome','o-meta','o-prazo','o-atual','o-mensal','o-notas'].forEach(id=>g(id).value='');
  await saveAll();renderObjs();
}
async function delObj(id){objetivos=objetivos.filter(o=>o.id!==id);await saveAll();renderObjs();}

function openObjEdit(id){
  const obj=objetivos.find(o=>o.id===id);if(!obj)return;
  g('me-title').textContent=obj.nome;
  g('me-body').innerHTML=`
    <div class="alert alb" style="margin-bottom:.9rem;">Actualiza o que mudou — podes alterar qualquer campo.</div>
    <div class="fr"><div class="fg"><label>Poupado actualmente (€)</label><input id="oe-a" type="number" value="${obj.atual||0}" step="0.01"></div></div>
    <div class="fr"><div class="fg"><label>Meta total (€)</label><input id="oe-m" type="number" value="${obj.meta}"></div><div class="fg"><label>Mensal (€)</label><input id="oe-mn" type="number" value="${obj.mensal||0}"></div></div>
    <div class="fr"><div class="fg"><label>Prazo</label><input id="oe-p" type="date" value="${obj.prazo||''}"></div></div>
    <div class="fr"><div class="fg"><label>Notas</label><input id="oe-n" value="${obj.notas||''}"></div></div>
    <button class="btn ba" style="width:100%;margin-top:.4rem;" onclick="saveObjEdit(${id})">Guardar alterações</button>
    <hr>
    <p style="font-size:13px;font-weight:500;margin-bottom:.5rem;">Registar contribuição pontual</p>
    <div style="display:flex;gap:6px;align-items:center;">
      <input id="oe-c" type="number" placeholder="ex: 50" style="flex:1;">
      <select id="oe-ct" style="width:auto;"><option value="add">+ Adicionar</option><option value="sub">− Retirar</option></select>
      <button class="btn ba bsm" onclick="addContrib(${id})">Registar</button>
    </div>
    ${obj.historico&&obj.historico.length?`<div style="margin-top:.7rem;font-size:12px;color:var(--t2);">Recentes: ${obj.historico.slice(-4).map(h=>`${h.data}: ${h.delta>0?'+':''}${fmt(h.delta)}`).join(' · ')}</div>`:''}
  `;
  openM('m-obj-edit');
}
async function saveObjEdit(id){
  const obj=objetivos.find(o=>o.id===id);if(!obj)return;
  obj.atual=parseFloat(g('oe-a').value)||0;obj.meta=parseFloat(g('oe-m').value)||obj.meta;
  obj.mensal=parseFloat(g('oe-mn').value)||0;obj.prazo=g('oe-p').value||obj.prazo;
  obj.notas=g('oe-n').value||obj.notas;
  await saveAll();renderObjs();closeM('m-obj-edit');
}
async function addContrib(id){
  const obj=objetivos.find(o=>o.id===id);if(!obj)return;
  const val=parseFloat(g('oe-c').value)||0,tipo=g('oe-ct').value;
  const delta=tipo==='add'?val:-val;
  obj.atual=Math.max(0,(obj.atual||0)+delta);
  obj.historico=obj.historico||[];
  obj.historico.push({data:today(),delta});
  await saveAll();openObjEdit(id);renderObjs();
}
function renderObjs(){
  const el=g('lst-objetivos');if(!el)return;
  if(!objetivos.length){el.innerHTML='<div class="card"><div style="font-size:13px;color:var(--t3);">Sem objetivos. Adiciona o primeiro!</div></div>';return;}
  el.innerHTML=objetivos.map(obj=>{
    const pct=obj.meta>0?Math.min(Math.round(((obj.atual||0)/obj.meta)*100),100):0;
    const rest=Math.max(obj.meta-(obj.atual||0),0);
    const mr=obj.prazo?Math.max(0,Math.round((new Date(obj.prazo)-new Date())/(1000*60*60*24*30))):null;
    const mn=mr&&mr>0?Math.ceil(rest/mr):null;
    const ok=obj.mensal&&mn&&obj.mensal>=mn;
    return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--rlg);padding:1.1rem 1.3rem;margin-bottom:9px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px;"><div style="font-size:15px;font-weight:500;">${obj.nome}</div><span class="pill ${pct>=100?'pg':pct>=50?'pb':'pa'}">${pct}%</span></div>
      <div style="font-size:12px;color:var(--t2);margin-bottom:7px;">${fmt(obj.atual||0)} de ${fmt(obj.meta)} · Faltam ${fmt(rest)}${obj.prazo?' · '+obj.prazo:''}</div>
      ${mr!==null?`<div class="alert ${ok?'alg':'ala'}" style="margin-bottom:6px;font-size:12px;padding:6px 10px;">${ok?'Poupança mensal suficiente para atingir o prazo.':'Precisas de '+fmt(mn||0)+'/mês para atingir o prazo (tens '+fmt(obj.mensal||0)+'/mês).'}</div>`:''}
      <div class="pbar" style="margin-bottom:9px;"><div class="pfill" style="width:${pct}%;background:${pct>=100?'var(--green)':pct>=50?'#1A3F6F':'var(--accent)'};"></div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button class="btn bg bsm" onclick="openObjEdit(${obj.id})">Actualizar</button>
        <button class="btn ba bsm" onclick="analisarObj(${obj.id})">Análise IA</button>
        <button class="btn bd bsm" onclick="delObj(${obj.id})">Eliminar</button>
      </div>
    </div>`;
  }).join('');
}
async function analisarObj(id){
  const obj=objetivos.find(o=>o.id===id);if(!obj)return;
  g('mai-title').textContent=obj.nome;
  g('mai-body').innerHTML='<div class="loading-box"><div class="spinner"></div>A analisar...</div>';
  openM('m-ai');
  const rest=Math.max(obj.meta-(obj.atual||0),0);
  const mr=obj.prazo?Math.max(0,Math.round((new Date(obj.prazo)-new Date())/(1000*60*60*24*30))):null;
  const mn=mr&&mr>0?Math.ceil(rest/mr):null;
  const prompt=`Especialista finanças pessoais Portugal. Objetivo: ${obj.nome}, meta ${fmt(obj.meta)}, poupado ${fmt(obj.atual||0)}, mensal ${fmt(obj.mensal||0)}, prazo ${obj.prazo||'não def.'}, meses restantes ${mr??'?'}, mensal necessário ${mn?fmt(mn):'?'}. ${obj.notas?'Notas: '+obj.notas:''} Resp. português Portugal, max 110 palavras, prosa fluida.`;
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,messages:[{role:'user',content:prompt}]})});
    const d=await r.json();
    const txt=d.content?.map(b=>b.text||'').join('')||'';
    g('mai-body').innerHTML=`<div class="ai-box"><div class="ai-title">Análise IA</div><div class="ai-text">${txt}</div></div>`;
  }catch{g('mai-body').innerHTML='<p style="font-size:13px;color:var(--t2);">Erro ao ligar à IA.</p>';}
}

// ===================== DESAFIOS =====================
const DESAFIOS_SUGERIDOS=[
  {nome:'4 semanas sem compras supérfluas',desc:'Nada de roupa, calçado, decoração ou gadgets durante 4 semanas. Só o essencial.',meta:0,dur:4,tipo:'semanas'},
  {nome:'Poupar 500 € em 3 meses',desc:'Reservar 167 € por mês durante 3 meses para a reserva de emergência.',meta:500,dur:12,tipo:'poupanca'},
  {nome:'Regra dos 30 dias',desc:'Quando quiseres comprar algo não essencial, espera 30 dias. Se ainda quiseres depois, compra.',meta:0,dur:4,tipo:'livre'},
  {nome:'Semana sem restaurante',desc:'Comer em casa toda a semana — sem take-away, sem cafetaria. Conta o que poupas!',meta:0,dur:1,tipo:'semanas'},
  {nome:'Desafio 52 semanas',desc:'Semana 1 poupa 1€, semana 2 poupa 2€... semana 52 poupa 52€. Total: 1378€ no final do ano.',meta:1378,dur:52,tipo:'diario'},
  {nome:'Janeiro sem álcool e café fora',desc:'Não gastar em bebidas alcoólicas nem café fora de casa durante um mês.',meta:0,dur:4,tipo:'semanas'},
];

function renderDesafiosSugeridos(){
  const el=g('desafios-sugeridos');if(!el)return;
  el.innerHTML=DESAFIOS_SUGERIDOS.map((ds,i)=>`
    <div class="desafio-sugerido">
      <div><div style="font-size:13px;font-weight:500;">${ds.nome}</div><div style="font-size:12px;color:var(--t2);">${ds.desc}</div></div>
      <button class="btn ba bsm" onclick="adoptDesafio(${i})" style="flex-shrink:0;">Adoptar</button>
    </div>`).join('');
}
async function adoptDesafio(i){
  const ds=DESAFIOS_SUGERIDOS[i];
  desafios.push({id:uid(),nome:ds.nome,desc:ds.desc,meta:ds.meta,dur:ds.dur,tipo:ds.tipo,inicio:today(),progresso:0,concluido:false});
  await saveAll();renderDesafios();
  alert('Desafio adoptado! Vai ao separador Desafios para acompanhar o progresso.');
}
async function addDesafio(){
  const nome=g('ch-nome').value.trim(),meta=parseFloat(g('ch-meta').value)||0,tipo=g('ch-tipo').value,dur=parseInt(g('ch-dur').value)||4,inicio=g('ch-ini').value||today(),desc=g('ch-desc').value.trim();
  if(!nome)return alert('Preenche o nome do desafio.');
  desafios.push({id:uid(),nome,desc,meta,dur,tipo,inicio,progresso:0,concluido:false});
  ['ch-nome','ch-meta','ch-dur','ch-ini','ch-desc'].forEach(id=>g(id).value='');
  await saveAll();renderDesafios();
}
async function delDesafio(id){desafios=desafios.filter(d=>d.id!==id);await saveAll();renderDesafios();}
async function updateDesafioProgresso(id,v){
  const d=desafios.find(x=>x.id===id);
  if(!d)return;
  d.progresso=parseFloat(v)||0;
  d.concluido=d.meta>0&&d.progresso>=d.meta;
  await saveAll();renderDesafios();
}
async function toggleDesafioConcluido(id){
  const d=desafios.find(x=>x.id===id);
  if(!d)return;
  d.concluido=!d.concluido;
  await saveAll();renderDesafios();
}

function renderDesafios(){
  const el=g('lst-desafios');if(!el)return;
  if(!desafios.length){el.innerHTML='<div class="card"><div style="font-size:13px;color:var(--t3);">Sem desafios activos. Adopta um sugerido ou cria o teu!</div></div>';return;}
  el.innerHTML=desafios.map(d=>{
    const pct=d.meta>0?Math.min(Math.round((d.progresso/d.meta)*100),100):d.concluido?100:0;
    const bar=d.meta>0;
    return `<div class="desafio-card" style="${d.concluido?'border-color:var(--green);background:var(--green-bg);':''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px;">
        <div style="font-size:15px;font-weight:500;${d.concluido?'color:var(--green-t);':''}">${d.nome}${d.concluido?' ✓':''}</div>
        <span class="pill ${d.concluido?'pg':'pa'}">${d.concluido?'Concluído!':d.dur+' sem.'}</span>
      </div>
      ${d.desc?`<div style="font-size:12px;color:var(--t2);margin-bottom:7px;">${d.desc}</div>`:''}
      <div style="font-size:12px;color:var(--t3);margin-bottom:8px;">Iniciado: ${d.inicio}</div>
      ${bar?`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <div style="flex:1;"><div class="pbar"><div class="pfill" style="width:${pct}%;background:${d.concluido?'var(--green)':'var(--accent)'};"></div></div></div>
        <span style="font-size:12px;font-weight:500;">${fmt(d.progresso)} / ${fmt(d.meta)}</span>
      </div>
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;">
        <input type="number" placeholder="Actualizar valor poupado (€)" style="flex:1;font-size:13px;" onchange="updateDesafioProgresso(${d.id},this.value)" value="${d.progresso||''}">
      </div>`:
      `<div style="margin-bottom:8px;"><button class="btn ${d.concluido?'bd':'ba'} bsm" onclick="toggleDesafioConcluido(${d.id})">${d.concluido?'Desfazer':'Marcar como concluído'}</button></div>`}
      <button class="btn bd bxs" onclick="delDesafio(${d.id})">Eliminar</button>
    </div>`;
  }).join('');
}

// ===================== NOTAS PRÓXIMO MÊS =====================
async function saveNota(){
  const txt=g('nota-txt').value.trim();
  if(!txt)return;
  notas.push({id:uid(),texto:txt,data:today(),feita:false});
  g('nota-txt').value='';
  await saveAll();closeM('m-nota');renderResumo();
}
async function toggleNota(id){
  const n=notas.find(x=>x.id===id);if(!n)return;
  n.feita=!n.feita;await saveAll();renderResumo();
}
async function delNota(id){notas=notas.filter(n=>n.id!==id);await saveAll();renderResumo();}

function renderNotas(){
  const el=g('r-notas-wrap');if(!el)return;
  const activas=notas.filter(n=>!n.feita);
  const feitas=notas.filter(n=>n.feita);
  let html='<button class="btn bg bsm" onclick="openM(\'m-nota\')" style="margin-bottom:.7rem;">+ Adicionar nota</button>';
  if(!notas.length)html+='<div style="font-size:13px;color:var(--t3);">Sem notas. Adiciona lembretes para o próximo mês!</div>';
  else{
    html+=activas.map(n=>`<div class="nota-item"><span>${n.texto}</span><div style="display:flex;gap:5px;"><button class="btn-check" onclick="toggleNota(${n.id})">Feito</button><button class="btn bd bxs" onclick="delNota(${n.id})">×</button></div></div>`).join('');
    if(feitas.length)html+=`<div style="font-size:11px;color:var(--t3);padding:6px 0 3px;">Concluídas:</div>`+feitas.map(n=>`<div class="nota-item" style="opacity:.5;"><span style="text-decoration:line-through;">${n.texto}</span><button class="btn bd bxs" onclick="delNota(${n.id})">×</button></div>`).join('');
  }
  el.innerHTML=html;
}

// ===================== DESEJOS =====================
async function addWish(){
  const nome=g('w-nome').value.trim(),preco=parseFloat(g('w-preco').value)||0;
  if(!nome||!preco)return alert('Preenche nome e preço.');
  desejos.push({id:uid(),nome,preco,prio:g('w-prio').value,notas:g('w-notas').value.trim(),comprado:false});
  g('w-nome').value='';g('w-preco').value='';g('w-notas').value='';
  await saveAll();renderDesejos();analisarDesejos();
}
async function delWish(id){desejos=desejos.filter(d=>d.id!==id);await saveAll();renderDesejos();analisarDesejos();}
async function markWish(id){const w=desejos.find(d=>d.id===id);if(w)w.comprado=!w.comprado;await saveAll();renderDesejos();}

function renderDesejos(){
  const el=g('lst-desejos');if(!el)return;
  if(!desejos.length){el.innerHTML='<div class="card"><div style="font-size:13px;color:var(--t3);">Sem itens. Adiciona o que gostavas de ter!</div></div>';return;}
  const order={alta:0,media:1,baixa:2};
  const sorted=[...desejos].sort((a,b)=>order[a.prio]-order[b.prio]);
  el.innerHTML=sorted.map(w=>`<div class="wish-item" style="${w.comprado?'opacity:.5;':''}">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px;">
      <div><div style="font-size:15px;font-weight:500;${w.comprado?'text-decoration:line-through;':''}">${w.nome}</div>
      <div style="font-size:12px;color:var(--t3);">${{alta:'Alta prioridade',media:'Média prioridade',baixa:'Baixa prioridade'}[w.prio]}${w.notas?' · '+w.notas:''}</div></div>
      <div style="font-size:18px;font-weight:400;color:var(--accent);">${fmt(w.preco)}</div>
    </div>
    <div style="display:flex;gap:6px;">
      <button class="btn bg bsm" onclick="markWish(${w.id})">${w.comprado?'Desfazer':'✓ Comprado'}</button>
      <button class="btn bd bsm" onclick="delWish(${w.id})">Remover</button>
    </div>
  </div>`).join('');
}

async function analisarDesejos(){
  const el=g('wishes-ai');if(!el)return;
  const pendentes=desejos.filter(d=>!d.comprado);
  if(!pendentes.length){el.innerHTML='';return;}
  const m=cur();
  const entIn=entradas.filter(e=>e.tipo!=='prevista'&&mk(e.data)===m).reduce((s,e)=>s+e.valor,0);
  const despIn=despesas.filter(d=>mk(d.data)===m).reduce((s,d)=>s+d.valor,0);
  const diIn=diario.filter(d=>mk(d.data)===m).reduce((s,d)=>s+d.valor,0);
  const disp=Math.max(entIn-despIn-diIn,0);
  el.innerHTML='<div class="loading-box"><div class="spinner"></div>A analisar...</div>';
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,messages:[{role:'user',content:`Esp. finanças Portugal. Saldo disponível: ${fmt(disp)}. Lista desejos: ${pendentes.map(w=>`${w.nome} ${fmt(w.preco)} prio ${w.prio}`).join(', ')}. O que pode comprar este mês e o que deve esperar? Português Portugal, max 70 palavras, prosa fluida.`}]})});
    const d=await r.json();
    const txt=d.content?.map(b=>b.text||'').join('')||'';
    el.innerHTML=txt?`<div class="ai-box" style="margin-bottom:.9rem;"><div class="ai-title">O que podes comprar este mês?</div><div class="ai-text">${txt}</div></div>`:'';
  }catch{el.innerHTML='';}
}

// ===================== DICAS =====================
const DICAS=[
  {tag:'Orçamento',tagColor:'#1E6348',titulo:'A regra 50/30/20',corpo:'Divide o teu rendimento líquido em três partes: 50% para necessidades (renda, comida, transportes), 30% para desejos (lazer, restaurantes, compras), e 20% para poupar e pagar dívidas. É uma regra simples mas que funciona para a maioria das famílias. Se o teu 50% estiver acima de 60%, é sinal de que as despesas fixas estão demasiado altas para o rendimento.'},
  {tag:'Poupança',tagColor:'#1B4F72',titulo:'Paga-te primeiro',corpo:'Quando o salário chega, a primeira "despesa" que pagas és tu própria. Transfere logo um valor fixo para poupança antes de pagar qualquer outra coisa. Mesmo que seja só 50€ por mês, o hábito é o que conta. Com o tempo aumenta o valor. Quem espera que sobre para poupar, raramente consegue poupar.'},
  {tag:'Emergência',tagColor:'#7A4A0A',titulo:'Reserva de emergência — a prioridade número 1',corpo:'Antes de qualquer outro objetivo financeiro, constrói uma almofada de 3 a 6 meses de despesas fixas. Esta reserva é o que separa uma avaria do carro de uma crise financeira. Guarda-a numa conta separada, à qual não acedes facilmente, para não ser tentada a usar.'},
  {tag:'Gastos diários',tagColor:'#8B1F1F',titulo:'O latte effect — os pequenos gastos que somam muito',corpo:'Um café por dia (1,20€) são 438€ por ano. Um almoço fora em vez de marmita (5€ extra) são 1.250€ por ano. Não se trata de viver sem prazer, mas de estar consciente. Usa o separador Diário desta app para registar tudo — só quando vês os números a somar é que percebes onde vai o dinheiro.'},
  {tag:'Dívidas',tagColor:'#3D2580',titulo:'Método bola de neve para pagar dívidas',corpo:'Lista todas as dívidas do mais pequeno para o maior valor em dívida. Paga o mínimo em todas, e mete todo o dinheiro extra na mais pequena. Quando a eliminas, usa esse valor todo na próxima. A sensação de eliminar uma dívida dá energia para continuar. Funciona melhor do que atacar todas ao mesmo tempo.'},
  {tag:'Compras',tagColor:'#5C3D1E',titulo:'A lista de 72 horas',corpo:'Quando quiseres comprar algo não planeado acima de 30€, espera 72 horas. A maioria das vezes o desejo passa. Se ao fim de 72 horas ainda quiseres, avalia se cabe no orçamento. Esta regra simples elimina a maior parte das compras por impulso, que são o maior inimigo das finanças pessoais.'},
  {tag:'Alimentação',tagColor:'#1E6348',titulo:'Planear as refeições da semana',corpo:'Antes de ir ao supermercado, planeia as refeições dos próximos 5-7 dias e faz uma lista. Compra só o que está na lista. Esta prática reduz o desperdício alimentar em até 40% e baixa a conta do supermercado significativamente. Comprar com fome ou sem lista é a receita para gastar o dobro.'},
  {tag:'Investimento',tagColor:'#0E5E5E',titulo:'Quando começar a investir',corpo:'Só investe quando: tens a reserva de emergência constituída, não tens dívidas a taxas altas (acima de 5%), e consegues poupar regularmente. Para começar em Portugal, os PPR (Planos Poupança Reforma) têm vantagens fiscais. Fundos de índice de baixo custo são para médio e longo prazo. Nunca invistas dinheiro de que precisas nos próximos 3-5 anos.'},
  {tag:'Família',tagColor:'#3D2580',titulo:'Falar de dinheiro em casal',corpo:'O dinheiro é a principal causa de conflito nos casais. A solução é ter uma conversa mensal sobre as finanças — não para discutir, mas para fazer o ponto de situação juntos. Definem objetivos em comum, revêm o que correu bem e mal, e ajustam o plano. Usar uma ferramenta como esta app, onde ambos vêem os números, ajuda muito.'},
  {tag:'Hábitos',tagColor:'#4A3A0A',titulo:'O envelope de lazer',corpo:'Retira em dinheiro um valor fixo para lazer e gastos pessoais no início do mês. Quando o envelope acabar, acabou. Este método concreto impede que os gastos de lazer se estendam pelo cartão sem controlo. Funciona especialmente bem para compras impulsivas e saídas frequentes.'},
];

function renderDicas(){
  const el=g('dicas-content');if(!el)return;
  el.innerHTML=DICAS.map(d=>`
    <div class="dica-card">
      <span class="dica-tag" style="background:${d.tagColor}20;color:${d.tagColor};">${d.tag}</span>
      <div class="dica-title">${d.titulo}</div>
      <div class="dica-body">${d.corpo}</div>
    </div>`).join('');
}

// ===================== CICLO & RESUMO =====================
function cycleInfo(){
  const n=new Date();
  let start,end;
  if(n.getDate()>=5){start=new Date(n.getFullYear(),n.getMonth(),5);end=new Date(n.getFullYear(),n.getMonth()+1,4);}
  else{start=new Date(n.getFullYear(),n.getMonth()-1,5);end=new Date(n.getFullYear(),n.getMonth(),4);}
  return{start,end,daysLeft:Math.max(Math.ceil((end-n)/(1000*60*60*24)),0)};
}

function renderResumo(){
  const m=g('r-month')?g('r-month').value:cur();
  const isCur=m===cur();
  const entIn=entradas.filter(e=>e.tipo!=='prevista'&&mk(e.data)===m);
  const entPrev=entradas.filter(e=>e.tipo==='prevista'&&mk(e.data)===m);
  const despIn=despesas.filter(d=>mk(d.data)===m);
  const diIn=diario.filter(d=>mk(d.data)===m);
  const totalIn=entIn.reduce((s,e)=>s+e.valor,0);
  const totalPrev=entPrev.reduce((s,e)=>s+e.valor,0);
  const totalDesp=despIn.reduce((s,d)=>s+d.valor,0);
  const totalDiar=diIn.reduce((s,d)=>s+d.valor,0);
  const totalOut=totalDesp+totalDiar;
  const saldo=totalIn-totalOut;
  const taxa=totalIn>0?Math.round((Math.max(saldo,0)/totalIn)*100):0;

  // COUNTDOWN
  if(isCur&&g('r-countdown')){
    const{daysLeft,end}=cycleInfo();
    const danger=daysLeft<=5,warn=daysLeft<=10&&!danger;
    g('r-countdown').innerHTML=`<div class="countdown" style="background:${danger?'var(--red)':warn?'var(--amber)':'var(--t)'};"><div class="cd-big">${daysLeft} dias para o dia 5</div><div class="cd-sub">Ciclo termina ${end.toLocaleDateString('pt-PT')}<br>${danger?'Atenção — fim de ciclo!':warn?'No fim do ciclo':'Bom controlo'}${totalIn>0&&saldo<0?' · CONTA EM VERMELHO!':''}</div></div>`;
  } else if(g('r-countdown'))g('r-countdown').innerHTML='';

  // ALERTS
  let alts='';
  if(totalIn===0)alts+=`<div class="alert ala">Sem entradas registadas para ${mlbl(m)}.</div>`;
  if(saldo<0&&totalIn>0)alts+=`<div class="alert alr">A conta está em <strong>VERMELHO</strong>: gastas mais ${fmt(Math.abs(saldo))} do que recebes!</div>`;
  else if(taxa<10&&totalIn>0)alts+=`<div class="alert ala">Taxa de poupança muito baixa (${taxa}%). Revê as despesas.</div>`;
  else if(taxa>=20&&totalIn>0)alts+=`<div class="alert alg">Óptimo! ${taxa}% de poupança — estás no bom caminho.</div>`;
  if(totalPrev>0)alts+=`<div class="alert alp">Tens ${fmt(totalPrev)} em entradas previstas (não contam no saldo).</div>`;
  const depsPorPagar=despIn.filter(d=>!d.pago);
  if(depsPorPagar.length>0){const val=depsPorPagar.reduce((s,d)=>s+d.valor,0);alts+=`<div class="alert ala">${depsPorPagar.length} despesa(s) ainda por pagar: ${fmt(val)}.</div>`;}
  if(g('r-alerts'))g('r-alerts').innerHTML=alts;

  // METRICS
  if(g('r-metrics'))g('r-metrics').innerHTML=`
    <div class="metric"><div class="ml">Entradas reais</div><div class="mv g">${fmt(totalIn)}</div></div>
    <div class="metric"><div class="ml">Despesas fixas</div><div class="mv r">${fmt(totalDesp)}</div></div>
    <div class="metric"><div class="ml">Diário / extra</div><div class="mv r">${fmt(totalDiar)}</div></div>
    <div class="metric"><div class="ml">Saldo disponível</div><div class="mv ${saldo>=0?'g':'r'}">${fmt(saldo)}</div></div>
    <div class="metric"><div class="ml">Taxa poupança</div><div class="mv ${taxa>=20?'g':taxa>=10?'a':'r'}">${taxa}%</div></div>
    ${totalPrev>0?`<div class="metric"><div class="ml">Previstas</div><div class="mv" style="color:var(--purple);">${fmt(totalPrev)}</div></div>`:''}
  `;

  // SPEND BAR
  const pD=totalIn>0?Math.min(Math.round((totalDesp/totalIn)*100),100):0;
  const pDi=totalIn>0?Math.min(Math.round((totalDiar/totalIn)*100),100):0;
  const pT=pD+pDi;
  if(g('r-spendbar'))g('r-spendbar').innerHTML=`
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;"><span>Gasto: <strong>${fmt(totalOut)}</strong></span><span style="color:${pT>90?'var(--red)':'var(--t2)'};">${pT}% do rendimento</span></div>
    <div class="pbar" style="height:13px;"><div style="display:flex;height:100%;">
      <div style="width:${pD}%;background:var(--red);opacity:.75;transition:width .4s;"></div>
      <div style="width:${pDi}%;background:var(--amber);opacity:.85;transition:width .4s;"></div>
    </div></div>
    <div style="display:flex;gap:1rem;margin-top:5px;font-size:12px;color:var(--t2);">
      <span>${catDot('Habitação',10)} Fixas ${pD}%</span>
      <span><span style="display:inline-block;width:10px;height:10px;background:var(--amber);opacity:.85;border-radius:50%;vertical-align:middle;"></span> Diário ${pDi}%</span>
      ${saldo>=0?`<span style="color:var(--green);">Sobra ${fmt(saldo)}</span>`:`<span style="color:var(--red);">Défice ${fmt(Math.abs(saldo))}</span>`}
    </div>`;

  // ENTRADAS
  let eHtml='';
  const sal=entIn.filter(e=>e.tipo==='salario'),caf=entIn.filter(e=>e.tipo==='caf');
  if(sal.length)eHtml+=`<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--green-t);padding:5px 0 3px;">Salário Luis</div>`+sal.map(e=>`<div class="li"><div class="ll"><div class="ln">${e.desc}</div><div class="ls">${e.data}</div></div><div class="lr"><span class="am ai">+${fmt(e.valor)}</span></div></div>`).join('');
  if(caf.length)eHtml+=`<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--blue-t);padding:5px 0 3px;">CAF</div>`+caf.map(e=>`<div class="li"><div class="ll"><div class="ln">${e.desc}</div><div class="ls">${e.data}</div></div><div class="lr"><span class="am ai">+${fmt(e.valor)}</span></div></div>`).join('');
  if(entPrev.length)eHtml+=`<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--purple-t);padding:5px 0 3px;">Previstas</div>`+entPrev.map(e=>`<div class="li"><div class="ll"><div class="ln">${e.desc}</div><div class="ls">${e.nota||e.data}</div></div><div class="lr"><span class="am apv">~${fmt(e.valor)}</span></div></div>`).join('');
  if(g('r-entradas'))g('r-entradas').innerHTML=eHtml||'<div style="font-size:13px;color:var(--t3);">Sem entradas.</div>';

  // CATS
  const byCat={};
  [...despIn,...diIn].forEach(d=>{byCat[d.cat]=(byCat[d.cat]||0)+d.valor;});
  let cHtml='';
  Object.entries(byCat).sort((a,b)=>b[1]-a[1]).forEach(([cat,val])=>{
    const p=totalIn>0?Math.min(Math.round((val/totalIn)*100),100):0;
    const c=CAT_COLORS[cat]||'#888';
    cHtml+=`<div style="margin-bottom:9px;"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;align-items:center;"><span style="display:flex;align-items:center;gap:5px;">${catDot(cat,9)}<span>${cat}</span></span><span style="color:var(--t2);">${fmt(val)} <span style="color:var(--t3);">(${p}%)</span></span></div><div class="pbar"><div class="pfill" style="width:${p}%;background:${c};"></div></div></div>`;
  });
  if(g('r-cats'))g('r-cats').innerHTML=cHtml||'<div style="font-size:13px;color:var(--t3);">Sem despesas.</div>';

  // DAILY RECENT
  const rec=[...diIn].sort((a,b)=>b.data.localeCompare(a.data)).slice(0,5);
  if(g('r-daily'))g('r-daily').innerHTML=rec.length?rec.map(d=>`<div class="li"><div class="ll"><div class="ln">${d.desc}</div><div class="ls" style="display:flex;align-items:center;gap:4px;">${catDot(d.cat,8)} ${d.cat} · ${d.data}</div></div><div class="lr"><span class="am ao">-${fmt(d.valor)}</span></div></div>`).join('')+'<div style="font-size:12px;color:var(--t3);padding:.4rem 0;cursor:pointer;" onclick="go(\'diario\')">Ver tudo no Diário →</div>':'<div style="font-size:13px;color:var(--t3);">Sem registos diários.</div>';

  // OBJS
  const oHtml=objetivos.length?objetivos.map(obj=>{
    const pct=obj.meta>0?Math.min(Math.round(((obj.atual||0)/obj.meta)*100),100):0;
    return `<div style="margin-bottom:11px;"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;"><span>${obj.nome}</span><span class="pill ${pct>=100?'pg':pct>=50?'pb':'pa'}">${pct}%</span></div><div class="pbar"><div class="pfill" style="width:${pct}%;background:${pct>=100?'var(--green)':pct>=50?'#1A3F6F':'var(--accent)'};"></div></div><div style="font-size:12px;color:var(--t3);margin-top:2px;">${fmt(obj.atual||0)} de ${fmt(obj.meta)}${obj.prazo?' · '+obj.prazo:''}</div></div>`;
  }).join(''):'<div style="font-size:13px;color:var(--t3);">Sem objetivos.</div>';
  if(g('r-objs'))g('r-objs').innerHTML=oHtml;

  // NOTAS
  renderNotas();

  // WISHES
  const disp=Math.max(saldo,0);
  const pend=desejos.filter(d=>!d.comprado);
  const posso=pend.filter(w=>w.preco<=disp);
  let wHtml='';
  if(!pend.length)wHtml='<div style="font-size:13px;color:var(--t3);">Sem itens na lista.</div>';
  else if(!posso.length)wHtml=`<div class="alert ala">Com ${fmt(disp)} disponíveis ainda não há nada que caiba. Continua!</div>`;
  else wHtml=`<div class="alert alg" style="margin-bottom:.6rem;">Com ${fmt(disp)} podes considerar: ${posso.map(w=>`<strong>${w.nome}</strong> (${fmt(w.preco)})`).join(', ')}.</div>`+posso.map(w=>`<div class="li"><div class="ll"><div class="ln">${w.nome}</div><div class="ls">${{alta:'Alta prioridade',media:'Média',baixa:'Baixa'}[w.prio]}</div></div><div class="lr"><span class="am" style="color:var(--accent);">${fmt(w.preco)}</span></div></div>`).join('');
  if(g('r-wishes'))g('r-wishes').innerHTML=wHtml;
}

// ===================== REMINDER =====================
function checkReminder(){
  const last=localStorage.getItem('cf_last_reg');
  const tod=today();
  if(last===tod)return;
  const b=document.createElement('div');
  b.style.cssText='position:fixed;bottom:1rem;right:1rem;left:1rem;max-width:400px;margin:0 auto;background:var(--t);color:#fff;border-radius:var(--rlg);padding:.9rem 1.2rem;z-index:999;display:flex;justify-content:space-between;align-items:center;gap:1rem;box-shadow:0 4px 20px rgba(0,0,0,.3);';
  b.innerHTML=`<div><div style="font-weight:600;margin-bottom:1px;">Já registaste os gastos de hoje?</div><div style="font-size:12px;opacity:.65;">Abre o Diário e regista!</div></div><button onclick="go('diario');this.closest('[style]').remove();localStorage.setItem('cf_last_reg','${tod}');" style="background:var(--accent);color:#fff;border:none;border-radius:5px;padding:7px 12px;font-weight:600;cursor:pointer;font-size:13px;flex-shrink:0;">Registar</button>`;
  document.body.appendChild(b);
  setTimeout(()=>{if(b.parentElement)b.remove();},10000);
}

document.addEventListener('visibilitychange',()=>{if(!document.hidden&&USER_KEY)checkReminder();});

// ===================== STATE & API =====================
const API = '/api';
let USER_KEY = '';
let entradas=[], despesas=[], diario=[], objetivos=[], desejos=[], templates=[], desafios=[], notas=[];

const CAT_COLORS = {
  'Habitação':'#1B4F72','Alimentação':'#1E6348','Transportes':'#7A4A0A','Filhos':'#3D2580',
  'Saúde':'#8B1F1F','Lazer':'#0E5E5E','Serviços':'#4A3A6B','Vestuário':'#5C3D1E',
  'Café / Bar':'#6B4226','Gasolina':'#4A3A0A','Compras':'#1A4A1A','Criança':'#3D2580',
  'Farmácia':'#8B1F1F','Outro':'#5C5C5C'
};
const g = id => document.getElementById(id);
const fmt = n => (Math.round(n*100)/100).toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
const today = () => new Date().toISOString().split('T')[0];
const mk = d => d ? d.slice(0,7) : '';
const cur = () => { const n=new Date(); return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0'); };
const mlbl = k => { if(!k)return ''; const[y,m]=k.split('-'); return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][+m-1]+' '+y; };
const uid = () => Date.now() + Math.random();
function setTd(id){ const e=g(id); if(e&&!e.value) e.value=today(); }
function catDot(cat,size){ size=size||10; const c=CAT_COLORS[cat]||'#888'; return '<span style="display:inline-block;width:'+size+'px;height:'+size+'px;border-radius:50%;background:'+c+';flex-shrink:0;"></span>'; }

// ===================== SYNC =====================
function lsSave(){ try{ localStorage.setItem('cf_local_'+USER_KEY, JSON.stringify({entradas,despesas,diario,objetivos,desejos,templates,desafios,notas})); }catch(e){} }
function lsLoad(){ try{ const r=localStorage.getItem('cf_local_'+USER_KEY); return r?JSON.parse(r):null; }catch(e){ return null; } }

function setSS(s){
  const dot=g('sync-dot'),lbl=g('sync-lbl');
  if(!dot)return;
  dot.className='dot'+(s==='syncing'?' syncing':s==='error'?' error':'');
  lbl.textContent=s==='syncing'?'a guardar...':s==='error'?'local':'guardado';
}

async function saveAll(){
  if(!USER_KEY)return;
  setSS('syncing');
  lsSave();
  try{
    const r=await fetch(API+'/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:USER_KEY,data:{entradas,despesas,diario,objetivos,desejos,templates,desafios,notas}})});
    setSS(r.ok?'saved':'error');
  }catch(e){ setSS('error'); }
}

async function loadAll(){
  try{
    const r=await fetch(API+'/load',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:USER_KEY})});
    if(r.ok){
      const res=await r.json();
      if(res.data){ applyData(res.data); lsSave(); return; }
    }
  }catch(e){}
  const local=lsLoad();
  if(local) applyData(local);
  else templates=defaultTemplates();
}

function applyData(d){
  entradas=d.entradas||[]; despesas=d.despesas||[]; diario=d.diario||[];
  objetivos=d.objetivos||[]; desejos=d.desejos||[]; desafios=d.desafios||[];
  notas=d.notas||[]; templates=d.templates||defaultTemplates();
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
    localStorage.setItem('cf_last_code',code);
    populateSels(); renderResumo(); renderTpl(); renderDesafiosSugeridos(); renderDicas();
    setTimeout(checkReminder,1500);
    g('login-err').textContent='';
  }catch(e){ g('login-err').textContent='Erro ao carregar.'; USER_KEY=''; }
}

window.addEventListener('load',async()=>{
  const last=localStorage.getItem('cf_last_code');
  if(last){g('login-code').value=last; await doLogin();}
});

// ===================== UTILS =====================
function allMonths(){
  const s=new Set(),n=new Date();
  for(let i=5;i>=0;i--){const d=new Date(n.getFullYear(),n.getMonth()-i,1);s.add(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));}
  [...entradas,...despesas,...diario].forEach(x=>{if(x.data)s.add(mk(x.data));});
  return [...s].sort();
}
function populateSels(){
  const months=allMonths(),c=cur();
  ['r-month','e-month','d-month'].forEach(id=>{
    const el=g(id);if(!el)return;
    const prev=el.value||c;
    el.innerHTML=months.map(m=>'<option value="'+m+'"'+(m===prev?' selected':'')+'>'+mlbl(m)+'</option>').join('');
  });
}
function openM(id){g(id).classList.add('on');}
function closeM(id){g(id).classList.remove('on');}
document.addEventListener('keydown',function(e){if(e.key==='Escape')document.querySelectorAll('.modal-overlay.on').forEach(function(m){m.classList.remove('on');});});

// ===================== NAV =====================
function go(page){
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('on');});
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('on');});
  g('page-'+page).classList.add('on');
  var map={resumo:'Resumo',entradas:'Entradas',despesas:'Despesas',diario:'Diário',objetivos:'Objetivos',desafios:'Desafios',desejos:'Desejos',dicas:'Dicas'};
  document.querySelectorAll('.tab').forEach(function(t){if(t.textContent===map[page])t.classList.add('on');});
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
  var active=document.querySelector('.page.on');
  if(!active)return;
  go(active.id.replace('page-',''));
}

// ===================== ENTRADAS =====================
async function addEnt(tipo){
  var map={salario:['sl-d','sl-v','sl-dt'],caf:['caf-d','caf-v','caf-dt'],prevista:['pv-d','pv-v','pv-dt']};
  var ids=map[tipo];
  var desc=g(ids[0]).value.trim(),val=parseFloat(g(ids[1]).value),data=g(ids[2]).value||today();
  if(!desc||!val||val<=0){alert('Preenche descrição e valor.');return;}
  var nota=tipo==='prevista'?g('pv-n').value.trim():'';
  entradas.push({id:uid(),tipo:tipo,desc:desc,valor:val,data:data,nota:nota});
  g(ids[1]).value='';if(tipo==='prevista')g('pv-n').value='';
  await saveAll();reRender();
  if(tipo==='prevista')analisarPrev();
}
async function delEnt(id){entradas=entradas.filter(function(e){return e.id!==id;});await saveAll();reRender();}

function renderEntradas(){
  var m=g('e-month').value;
  ['salario','caf','prevista'].forEach(function(tipo){
    var f=entradas.filter(function(e){return e.tipo===tipo&&mk(e.data)===m;}).sort(function(a,b){return b.data.localeCompare(a.data);});
    var el=g('lst-'+tipo);if(!el)return;
    el.innerHTML=f.length?f.map(function(e){return '<div class="li"><div class="ll"><div class="ln">'+e.desc+'</div><div class="ls">'+e.data+(e.nota?' · '+e.nota:'')+'</div></div><div class="lr"><span class="am '+(tipo==='prevista'?'apv':'ai')+'">'+(tipo==='prevista'?'~':'+')+fmt(e.valor)+'</span><button class="btn bd bxs" onclick="delEnt('+e.id+')">×</button></div></div>';}).join('')
      :'<div style="font-size:13px;color:var(--t3);padding:.4rem 0;">Sem registos.</div>';
  });
  if(m===cur())analisarPrev();
}

function analisarPrev(){
  var m=cur(),prevs=entradas.filter(function(e){return e.tipo==='prevista'&&mk(e.data)===m;});
  var el=g('pv-sugestao');if(!el)return;
  if(!prevs.length){el.innerHTML='';return;}
  var total=prevs.reduce(function(s,e){return s+e.valor;},0);
  var entIn=entradas.filter(function(e){return e.tipo!=='prevista'&&mk(e.data)===m;}).reduce(function(s,e){return s+e.valor;},0);
  var despIn=despesas.filter(function(d){return mk(d.data)===m;}).reduce(function(s,d){return s+d.valor;},0);
  var diIn=diario.filter(function(d){return mk(d.data)===m;}).reduce(function(s,d){return s+d.valor;},0);
  var saldoAtual=entIn-despIn-diIn;
  var ci=cycleInfo();
  var objsPend=objetivos.filter(function(o){return Math.max(o.meta-(o.atual||0),0)>0;});
  var desejosOk=desejos.filter(function(d){return !d.comprado&&d.preco<=(total*0.3);});
  var sugestoes=[];
  sugestoes.push('Guarda <strong>'+fmt(Math.round(total*0.3))+'</strong> para a próxima entrada (faltam '+ci.daysLeft+' dias para o dia 5).');
  objsPend.slice(0,2).forEach(function(o){
    var c=Math.min(Math.round(total*0.25),Math.max(o.meta-(o.atual||0),0));
    if(c>0)sugestoes.push('Mete <strong>'+fmt(c)+'</strong> no objetivo "<em>'+o.nome+'</em>".');
  });
  desejosOk.slice(0,1).forEach(function(w){sugestoes.push('Podes comprar "<em>'+w.nome+'</em>" da tua lista de desejos ('+fmt(w.preco)+').');});
  if(saldoAtual<0)sugestoes.push('O saldo está negativo ('+fmt(saldoAtual)+'). Usa <strong>'+fmt(Math.min(Math.abs(saldoAtual),total))+'</strong> para cobrir o défice.');
  sugestoes.push('Reserva <strong>'+fmt(Math.round(total*0.15))+'</strong> para alimentação e gastos essenciais.');
  sugestoes.push('Guarda <strong>'+fmt(Math.round(total*0.3))+'</strong> para imprevistos — não toques neste valor.');
  var notaExist=notas.find(function(n){return n.tipo==='prevista'&&n.mes===m;});
  el.innerHTML='<div class="ai-box" style="margin-top:.7rem;"><div class="ai-title">O que fazer com '+fmt(total)+' de entradas previstas?</div>'
    +'<div class="ai-text"><ul style="padding-left:1.2rem;line-height:2;">'+sugestoes.map(function(s){return '<li>'+s+'</li>';}).join('')+'</ul></div>'
    +'<div style="margin-top:.7rem;"><label style="font-size:12px;color:var(--amber-t);font-weight:500;">Nota pessoal sobre este dinheiro</label>'
    +'<textarea id="pv-nota-pessoal" placeholder="Escreve aqui o que queres fazer com este dinheiro..." style="margin-top:4px;font-size:13px;">'+(notaExist?notaExist.texto:'')+'</textarea>'
    +'<button class="btn ba bsm" style="margin-top:5px;" onclick="saveNotaPrevista()">Guardar nota</button></div></div>';
}

async function saveNotaPrevista(){
  var m=cur(),txt=g('pv-nota-pessoal')?g('pv-nota-pessoal').value.trim():'';
  notas=notas.filter(function(n){return !(n.tipo==='prevista'&&n.mes===m);});
  if(txt)notas.push({id:uid(),tipo:'prevista',mes:m,texto:txt,data:today()});
  await saveAll();
}

// ===================== TEMPLATE =====================
function renderTpl(){
  var el=g('tpl-list');if(!el)return;
  if(!templates.length){el.innerHTML='<div style="font-size:13px;color:var(--t3);">Sem rubricas.</div>';return;}
  el.innerHTML=templates.map(function(t){return '<div class="tpl-item" style="background:'+(t.ativo!==false?'var(--surface)':'var(--surface2)')+';">'
    +'<input type="checkbox" '+(t.ativo!==false?'checked':'')+' onchange="tplChk('+t.id+',this.checked)" style="width:16px;flex-shrink:0;cursor:pointer;accent-color:var(--accent);">'
    +catDot(t.cat,10)
    +'<span style="flex:1;font-size:13px;'+(t.ativo===false?'color:var(--t3);':'')+'">'+t.nome+'</span>'
    +'<input type="number" value="'+t.valor+'" onchange="tplVal('+t.id+',this.value)" style="width:72px;background:transparent;border:none;border-bottom:1px dashed var(--border2);border-radius:0;padding:2px 4px;font-size:13px;text-align:right;color:var(--t);"> €'
    +'<button class="btn bd bxs" onclick="delTpl('+t.id+')">×</button></div>';}).join('');
}
function tplChk(id,v){var t=templates.find(function(x){return x.id===id;});if(t)t.ativo=v;renderTpl();saveAll();}
function tplVal(id,v){var t=templates.find(function(x){return x.id===id;});if(t)t.valor=parseFloat(v)||0;saveAll();}
async function delTpl(id){templates=templates.filter(function(t){return t.id!==id;});await saveAll();renderTpl();}
async function addTpl(){
  var n=g('tpl-n').value.trim(),v=parseFloat(g('tpl-v').value)||0,c=g('tpl-c').value;
  if(!n)return alert('Escreve um nome.');
  templates.push({id:uid(),nome:n,valor:v,cat:c,ativo:true});
  await saveAll();renderTpl();closeM('m-addtpl');
  g('tpl-n').value='';g('tpl-v').value='';
}
async function aplicarTpl(){
  var m=g('d-month').value,ativos=templates.filter(function(t){return t.ativo!==false&&t.valor>0;});
  if(!ativos.length){alert('Nenhuma rubrica activa.');return;}
  var n=0;
  ativos.forEach(function(t){if(!despesas.some(function(d){return d.tplId===t.id&&mk(d.data)===m;})){despesas.push({id:uid(),tplId:t.id,desc:t.nome,valor:t.valor,cat:t.cat,data:m+'-05',tipo:'fixa',pago:false});n++;}});
  await saveAll();renderDesp();
  if(n===0)alert('Rubricas já aplicadas.');else alert(n+' despesas fixas adicionadas!');
}

// ===================== DESPESAS =====================
async function addDesp(){
  var desc=g('da-d').value.trim(),val=parseFloat(g('da-v').value),cat=g('da-c').value,data=g('da-dt').value||today();
  if(!desc||!val||val<=0){alert('Preenche descrição e valor.');return;}
  despesas.push({id:uid(),desc:desc,valor:val,cat:cat,data:data,tipo:'pontual',pago:false});
  g('da-d').value='';g('da-v').value='';
  await saveAll();reRender();
}
async function delDesp(id){despesas=despesas.filter(function(d){return d.id!==id;});await saveAll();reRender();}
async function togglePago(id){var d=despesas.find(function(x){return x.id===id;});if(d){d.pago=!d.pago;await saveAll();renderDesp();renderResumo();}}

function renderDesp(){
  renderTpl();
  var m=g('d-month').value;
  var f=despesas.filter(function(d){return mk(d.data)===m;}).sort(function(a,b){return b.data.localeCompare(a.data);});
  var total=f.reduce(function(s,d){return s+d.valor;},0),pago=f.filter(function(d){return d.pago;}).reduce(function(s,d){return s+d.valor;},0);
  g('d-total-pill').textContent='Total: '+fmt(total)+' · Pago: '+fmt(pago);
  var el=g('lst-despesas');
  if(!f.length){el.innerHTML='<div style="font-size:13px;color:var(--t3);padding:.4rem 0;">Sem despesas.</div>';return;}
  var byCat={};
  f.forEach(function(d){byCat[d.cat]=byCat[d.cat]||[];byCat[d.cat].push(d);});
  var html='';
  Object.entries(byCat).forEach(function(entry){
    var cat=entry[0],items=entry[1];
    var catTotal=items.reduce(function(s,d){return s+d.valor;},0);
    html+='<div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--t3);padding:9px 0 5px;border-top:.5px solid var(--border);margin-top:3px;">'+catDot(cat,9)+'<span>'+cat+'</span><span style="margin-left:auto;font-weight:400;">'+fmt(catTotal)+'</span></div>';
    html+=items.map(function(d){return '<div class="li" style="'+(d.pago?'opacity:.55;':'')+'">'
      +'<div class="ll"><div class="ln" style="'+(d.pago?'text-decoration:line-through;':'')+'">'+d.desc+'</div><div class="ls">'+d.data+(d.tipo==='fixa'?' · fixa':' · pontual')+'</div></div>'
      +'<div class="lr"><span class="am ao">-'+fmt(d.valor)+'</span>'
      +'<button class="btn-check '+(d.pago?'checked':'')+'" onclick="togglePago('+d.id+')">'+(d.pago?'✓ Pago':'Pagar')+'</button>'
      +'<button class="btn bd bxs" onclick="delDesp('+d.id+')">×</button></div></div>';}).join('');
  });
  el.innerHTML=html;
}

// ===================== DIÁRIO =====================
async function addDiar(){
  var desc=g('dr-d').value.trim(),val=parseFloat(g('dr-v').value),cat=g('dr-c').value,data=g('dr-dt').value||today();
  if(!desc||!val||val<=0){alert('Preenche descrição e valor.');return;}
  diario.push({id:uid(),desc:desc,valor:val,cat:cat,data:data});
  g('dr-d').value='';g('dr-v').value='';
  await saveAll();reRender();
}
async function delDiar(id){diario=diario.filter(function(d){return d.id!==id;});await saveAll();reRender();}

function getWeekSpend(){
  var now=new Date(),day=now.getDay();
  var start=new Date(now);start.setDate(now.getDate()-(day===0?6:day-1));
  var startStr=start.toISOString().split('T')[0];
  return diario.filter(function(d){return d.data>=startStr;}).reduce(function(s,d){return s+d.valor;},0);
}

function renderDiar(){
  var m=cur();
  var f=diario.filter(function(d){return mk(d.data)===m;}).sort(function(a,b){return b.data.localeCompare(a.data);});
  var total=f.reduce(function(s,d){return s+d.valor;},0);
  g('dr-total-pill').textContent='Este mês: '+fmt(total);
  var entIn=entradas.filter(function(e){return e.tipo!=='prevista'&&mk(e.data)===m;}).reduce(function(s,e){return s+e.valor;},0);
  var despIn=despesas.filter(function(d){return mk(d.data)===m;}).reduce(function(s,d){return s+d.valor;},0);
  var disp=Math.max(entIn-despIn,0),lim=Math.round(disp*0.2);
  var ci=cycleInfo();
  var weekSpend=getWeekSpend();
  var weekBudget=disp>0?Math.round(disp/Math.max(Math.ceil(ci.daysLeft/7),1)):0;
  var alts='';
  if(ci.daysLeft<=5&&ci.daysLeft>0)alts+='<div class="alert alr"><strong>Faltam '+ci.daysLeft+' dias</strong> para o dia 5!</div>';
  else if(ci.daysLeft<=10)alts+='<div class="alert ala"><strong>Faltam '+ci.daysLeft+' dias</strong> para o dia 5.</div>';
  if(weekBudget>0&&weekSpend>weekBudget)alts+='<div class="alert alr">Esta semana gastaste '+fmt(weekSpend)+' — acima do limite semanal de '+fmt(weekBudget)+'!</div>';
  else if(weekBudget>0)alts+='<div class="alert alg">Esta semana: '+fmt(weekSpend)+' de '+fmt(weekBudget)+' — podes gastar mais '+fmt(weekBudget-weekSpend)+'.</div>';
  if(lim>0&&total>lim)alts+='<div class="alert alr">Gastos diários ('+fmt(total)+') acima do limite ('+fmt(lim)+').</div>';
  g('diar-alerts').innerHTML=alts;
  var el=g('lst-diario');
  if(!f.length){el.innerHTML='<div style="font-size:13px;color:var(--t3);padding:.4rem 0;">Sem registos este mês.</div>';return;}
  var byDate={};
  f.forEach(function(d){byDate[d.data]=byDate[d.data]||[];byDate[d.data].push(d);});
  var html='';
  Object.entries(byDate).sort(function(a,b){return b[0].localeCompare(a[0]);}).forEach(function(entry){
    var date=entry[0],items=entry[1];
    var dt=items.reduce(function(s,d){return s+d.valor;},0);
    html+='<div class="day-lbl">'+date+'<span>'+fmt(dt)+'</span></div>';
    html+=items.map(function(d){return '<div class="li"><div class="ll"><div class="ln">'+d.desc+'</div><div class="ls" style="display:flex;align-items:center;gap:4px;">'+catDot(d.cat,8)+' '+d.cat+'</div></div><div class="lr"><span class="am ao">-'+fmt(d.valor)+'</span><button class="btn bd bxs" onclick="delDiar('+d.id+')">×</button></div></div>';}).join('');
  });
  el.innerHTML=html;
}

// ===================== OBJETIVOS =====================
async function addObj(){
  var nome=g('o-nome').value.trim(),meta=parseFloat(g('o-meta').value)||0;
  if(!nome||!meta)return alert('Preenche nome e meta.');
  objetivos.push({id:uid(),nome:nome,meta:meta,prazo:g('o-prazo').value,atual:parseFloat(g('o-atual').value)||0,mensal:parseFloat(g('o-mensal').value)||0,notas:g('o-notas').value.trim(),historico:[]});
  ['o-nome','o-meta','o-prazo','o-atual','o-mensal','o-notas'].forEach(function(id){g(id).value='';});
  await saveAll();renderObjs();
}
async function delObj(id){objetivos=objetivos.filter(function(o){return o.id!==id;});await saveAll();renderObjs();}

function openObjEdit(id){
  var obj=objetivos.find(function(o){return o.id===id;});if(!obj)return;
  g('me-title').textContent=obj.nome;
  g('me-body').innerHTML='<div class="alert alb" style="margin-bottom:.9rem;">Actualiza o que mudou.</div>'
    +'<div class="fr"><div class="fg"><label>Poupado (€)</label><input id="oe-a" type="number" value="'+(obj.atual||0)+'" step="0.01"></div></div>'
    +'<div class="fr"><div class="fg"><label>Meta (€)</label><input id="oe-m" type="number" value="'+obj.meta+'"></div><div class="fg"><label>Mensal (€)</label><input id="oe-mn" type="number" value="'+(obj.mensal||0)+'"></div></div>'
    +'<div class="fr"><div class="fg"><label>Prazo</label><input id="oe-p" type="date" value="'+(obj.prazo||'')+'"></div></div>'
    +'<div class="fr"><div class="fg"><label>Notas</label><input id="oe-n" value="'+(obj.notas||'')+'"></div></div>'
    +'<button class="btn ba" style="width:100%;margin-top:.4rem;" onclick="saveObjEdit('+id+')">Guardar</button>'
    +'<hr><p style="font-size:13px;font-weight:500;margin-bottom:.5rem;">Contribuição pontual</p>'
    +'<div style="display:flex;gap:6px;align-items:center;"><input id="oe-c" type="number" placeholder="ex: 50" style="flex:1;"><select id="oe-ct" style="width:auto;"><option value="add">+ Adicionar</option><option value="sub">− Retirar</option></select><button class="btn ba bsm" onclick="addContrib('+id+')">Registar</button></div>'
    +(obj.historico&&obj.historico.length?'<div style="margin-top:.7rem;font-size:12px;color:var(--t2);">Recentes: '+obj.historico.slice(-4).map(function(h){return h.data+': '+(h.delta>0?'+':'')+fmt(h.delta);}).join(' · ')+'</div>':'');
  openM('m-obj-edit');
}
async function saveObjEdit(id){
  var obj=objetivos.find(function(o){return o.id===id;});if(!obj)return;
  obj.atual=parseFloat(g('oe-a').value)||0;obj.meta=parseFloat(g('oe-m').value)||obj.meta;
  obj.mensal=parseFloat(g('oe-mn').value)||0;obj.prazo=g('oe-p').value||obj.prazo;obj.notas=g('oe-n').value||obj.notas;
  await saveAll();renderObjs();closeM('m-obj-edit');
}
async function addContrib(id){
  var obj=objetivos.find(function(o){return o.id===id;});if(!obj)return;
  var val=parseFloat(g('oe-c').value)||0,tipo=g('oe-ct').value,delta=tipo==='add'?val:-val;
  obj.atual=Math.max(0,(obj.atual||0)+delta);obj.historico=obj.historico||[];obj.historico.push({data:today(),delta:delta});
  await saveAll();openObjEdit(id);renderObjs();
}
function renderObjs(){
  var el=g('lst-objetivos');if(!el)return;
  if(!objetivos.length){el.innerHTML='<div class="card"><div style="font-size:13px;color:var(--t3);">Sem objetivos.</div></div>';return;}
  el.innerHTML=objetivos.map(function(obj){
    var pct=obj.meta>0?Math.min(Math.round(((obj.atual||0)/obj.meta)*100),100):0;
    var rest=Math.max(obj.meta-(obj.atual||0),0);
    var mr=obj.prazo?Math.max(0,Math.round((new Date(obj.prazo)-new Date())/(1000*60*60*24*30))):null;
    var mn=mr&&mr>0?Math.ceil(rest/mr):null;
    var ok=obj.mensal&&mn&&obj.mensal>=mn;
    return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--rlg);padding:1.1rem 1.3rem;margin-bottom:9px;">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px;"><div style="font-size:15px;font-weight:500;">'+obj.nome+'</div><span class="pill '+(pct>=100?'pg':pct>=50?'pb':'pa')+'">'+pct+'%</span></div>'
      +'<div style="font-size:12px;color:var(--t2);margin-bottom:7px;">'+fmt(obj.atual||0)+' de '+fmt(obj.meta)+' · Faltam '+fmt(rest)+(obj.prazo?' · '+obj.prazo:'')+'</div>'
      +(mr!==null?'<div class="alert '+(ok?'alg':'ala')+'" style="margin-bottom:6px;font-size:12px;padding:6px 10px;">'+(ok?'Poupança mensal suficiente.':'Precisas de '+fmt(mn||0)+'/mês (tens '+fmt(obj.mensal||0)+'/mês).')+'</div>':'')
      +'<div class="pbar" style="margin-bottom:9px;"><div class="pfill" style="width:'+pct+'%;background:'+(pct>=100?'var(--green)':pct>=50?'#1A3F6F':'var(--accent)')+'"></div></div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap;"><button class="btn bg bsm" onclick="openObjEdit('+obj.id+')">Actualizar</button><button class="btn bd bsm" onclick="delObj('+obj.id+')">Eliminar</button></div></div>';
  }).join('');
}

// ===================== DESAFIOS =====================
var DESAFIOS_SUGERIDOS=[
  {nivel:'Iniciante',nome:'Registo diário durante 7 dias',desc:'Durante 7 dias regista TODOS os teus gastos. O objetivo é ganhar consciência.',meta:0,dur:1,passos:['Dia 1: Instala a app e regista o primeiro gasto do dia','Dia 2: Regista tudo — cafés, pequenas compras','Dia 3: Compara com o dia anterior — surpreendeu-te algo?','Dia 4: Tenta prever quanto vais gastar antes de o fazer','Dia 5: Identifica a categoria onde gastas mais','Dia 6: Tenta reduzir esse gasto em 20%','Dia 7: Faz o balanço total da semana']},
  {nivel:'Iniciante',nome:'Semana sem compras impulsivas',desc:'7 dias sem comprar nada que não estava planeado. Só o que está na lista.',meta:0,dur:1,passos:['Antes de sair: escreve a lista do que vais comprar','Só compras o que está na lista — nada mais','Se sentires vontade de comprar extra, anota-o','No fim do dia: vê o que anotaste e decide amanhã','Ao fim de 7 dias: soma o que não compraste']},
  {nivel:'Iniciante',nome:'Poupar 50€ este mês',desc:'Prova a ti própria que consegues poupar. 50€ é o primeiro passo.',meta:50,dur:4,passos:['Semana 1: Identifica onde podes cortar 12,50€','Semana 2: Transfere 12,50€ para poupança','Semana 3: Repete','Semana 4: Completa os 50€ e celebra!']},
  {nivel:'Iniciante',nome:'3 semanas sem restaurante',desc:'Come em casa durante 3 semanas. Conta o que poupas.',meta:0,dur:3,passos:['Semana 1: Planeia as refeições da semana toda ao domingo','Semana 2: Prepara marmitas para o trabalho','Semana 3: Calcula quanto poupaste no total']},
  {nivel:'Intermédio',nome:'30 dias sem compras supérfluas',desc:'Um mês sem roupa, gadgets, decoração ou qualquer compra não essencial.',meta:0,dur:4,passos:['Semana 1: Define o que é supérfluo e escreve a regra','Semana 2: Quando sentires vontade, espera 48h','Semana 3: Substitui o shopping por actividades gratuitas','Semana 4: Soma o que poupaste']},
  {nivel:'Intermédio',nome:'Construir reserva de 500€',desc:'500€ de reserva de emergência. Intocável — só para emergências reais.',meta:500,dur:8,passos:['Semana 1-2: Analisa despesas e identifica onde cortar','Semana 3-4: Poupa os primeiros 125€','Semana 5-6: Poupa mais 125€ (total: 250€)','Semana 7-8: Conclui os 500€ — NÃO TOQUES NESTE VALOR']},
  {nivel:'Intermédio',nome:'Auditoria das subscrições',desc:'Cancela todas as subscrições que não usas activamente.',meta:0,dur:1,passos:['Dia 1: Lista TODAS as subscrições (Netflix, Spotify, apps, ginásio...)','Dia 2: Marca as que usaste pelo menos 3x na última semana','Dia 3: Cancela todas as que não marcaste','Dia 4-7: Transfere o valor poupado para poupança']},
  {nivel:'Avançado',nome:'Desafio 52 semanas',desc:'Semana 1 poupa 1€, semana 52 poupa 52€. Total: 1.378€.',meta:1378,dur:52,passos:['Semanas 1-10: 1€ a 10€ por semana (acum: 55€)','Semanas 11-20: 11€ a 20€ por semana (acum: 210€)','Semanas 21-30: 21€ a 30€ por semana (acum: 465€)','Semanas 31-40: 31€ a 40€ por semana (acum: 820€)','Semanas 41-52: 41€ a 52€ por semana (total: 1.378€)']},
  {nivel:'Avançado',nome:'Mês de poupança máxima',desc:'Durante 1 mês, reduz todas as despesas variáveis ao mínimo absoluto.',meta:0,dur:4,passos:['Semana 1: Corta lazer, restaurantes e compras a zero','Semana 2: Optimiza alimentação — planeia ao máximo','Semana 3: Usa só transportes públicos ou a pé','Semana 4: Soma o total poupado e investe metade']},
  {nivel:'Avançado',nome:'Organiza as finanças do zero',desc:'Um plano completo para estruturar as tuas finanças em 4 semanas.',meta:0,dur:4,passos:['Semana 1 — Diagnóstico: Lista rendimentos, despesas fixas e dívidas. Calcula o teu saldo real.','Semana 2 — Orçamento: Cria um orçamento mensal com a regra 50/30/20.','Semana 3 — Poupança: Abre conta separada e configura transferência automática no dia do salário.','Semana 4 — Objetivos: Define 3 objetivos (curto, médio e longo prazo) com valores e prazos concretos.']},
];

function renderDesafiosSugeridos(){
  var el=g('desafios-sugeridos');if(!el)return;
  var niveis=['Iniciante','Intermédio','Avançado'];
  var corNivel={Iniciante:'var(--green)',Intermédio:'var(--amber)',Avançado:'var(--red)'};
  var html='';
  niveis.forEach(function(nivel){
    var ds=DESAFIOS_SUGERIDOS.filter(function(d){return d.nivel===nivel;});
    html+='<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:'+corNivel[nivel]+';padding:8px 0 5px;border-bottom:.5px solid var(--border);margin-bottom:6px;">'+nivel+'</div>';
    html+=ds.map(function(ds){return '<div class="desafio-sugerido"><div style="flex:1;"><div style="font-size:13px;font-weight:500;">'+ds.nome+'</div><div style="font-size:12px;color:var(--t2);">'+ds.desc.slice(0,70)+'...</div></div><button class="btn ba bsm" onclick="adoptDesafio('+DESAFIOS_SUGERIDOS.indexOf(ds)+')" style="flex-shrink:0;">Adoptar</button></div>';}).join('');
  });
  el.innerHTML=html;
}

async function adoptDesafio(i){
  var ds=DESAFIOS_SUGERIDOS[i];
  desafios.push({id:uid(),nome:ds.nome,desc:ds.desc,meta:ds.meta,dur:ds.dur,nivel:ds.nivel,inicio:today(),passos:ds.passos,checks:[],progresso:0,concluido:false});
  await saveAll();renderDesafios();go('desafios');
}

async function addDesafio(){
  var nome=g('ch-nome').value.trim(),meta=parseFloat(g('ch-meta').value)||0;
  var tipo=g('ch-tipo').value,dur=parseInt(g('ch-dur').value)||4;
  var inicio=g('ch-ini').value||today(),desc=g('ch-desc').value.trim();
  if(!nome)return alert('Preenche o nome do desafio.');
  desafios.push({id:uid(),nome:nome,desc:desc,meta:meta,dur:dur,nivel:'Personalizado',inicio:inicio,passos:[],checks:[],progresso:0,concluido:false});
  ['ch-nome','ch-meta','ch-dur','ch-ini','ch-desc'].forEach(function(id){g(id).value='';});
  await saveAll();renderDesafios();
}
async function delDesafio(id){desafios=desafios.filter(function(d){return d.id!==id;});await saveAll();renderDesafios();}

async function toggleDesafioCheck(desafioId,stepIdx){
  var d=desafios.find(function(x){return x.id===desafioId;});if(!d)return;
  d.checks=d.checks||[];
  var key=''+stepIdx;
  if(d.checks.includes(key))d.checks=d.checks.filter(function(c){return c!==key;});
  else d.checks.push(key);
  d.concluido=d.passos.length>0&&d.checks.length>=d.passos.length;
  await saveAll();renderDesafios();
}
async function updateDesafioVal(id,v){
  var d=desafios.find(function(x){return x.id===id;});if(!d)return;
  d.progresso=parseFloat(v)||0;d.concluido=d.meta>0&&d.progresso>=d.meta;
  await saveAll();renderDesafios();
}

function renderDesafios(){
  var el=g('lst-desafios');if(!el)return;
  if(!desafios.length){el.innerHTML='<div class="card"><div style="font-size:13px;color:var(--t3);">Sem desafios. Adopta um sugerido ou cria o teu!</div></div>';return;}
  var corNivel={Iniciante:'var(--green)',Intermédio:'var(--amber)',Avançado:'var(--red)',Personalizado:'var(--blue)'};
  el.innerHTML=desafios.map(function(d){
    var pct=d.passos&&d.passos.length>0?Math.round(((d.checks||[]).length/d.passos.length)*100):d.meta>0?Math.min(Math.round((d.progresso/d.meta)*100),100):d.concluido?100:0;
    var cor=corNivel[d.nivel]||'var(--accent)';
    var passosHTML=d.passos&&d.passos.length?'<div style="margin:10px 0;"><div style="font-size:12px;font-weight:500;color:var(--t2);margin-bottom:5px;">Passos do desafio:</div>'
      +d.passos.map(function(p,i){
        var checked=(d.checks||[]).includes(''+i);
        return '<div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:.5px solid var(--border);cursor:pointer;" onclick="toggleDesafioCheck('+d.id+','+i+')">'
          +'<div style="width:18px;height:18px;border-radius:4px;border:2px solid '+(checked?'var(--green)':'var(--border2)')+';background:'+(checked?'var(--green)':'transparent')+';flex-shrink:0;display:flex;align-items:center;justify-content:center;margin-top:1px;">'
          +(checked?'<span style="color:#fff;font-size:11px;">✓</span>':'')+'</div>'
          +'<span style="font-size:13px;'+(checked?'text-decoration:line-through;color:var(--t3);':'')+'">'+p+'</span></div>';
      }).join('')+'</div>':'';
    var valorHTML=d.meta>0?'<div style="display:flex;gap:6px;align-items:center;margin:8px 0;"><input type="number" placeholder="Valor poupado (€)" value="'+(d.progresso||'')+'" onchange="updateDesafioVal('+d.id+',this.value)" style="flex:1;font-size:13px;"><span style="font-size:13px;color:var(--t3);">/ '+fmt(d.meta)+'</span></div>':'';
    return '<div class="desafio-card" style="'+(d.concluido?'border-color:var(--green);':'border-left:3px solid '+cor+';')+'">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">'
      +'<div><span style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:'+cor+';">'+(d.nivel||'Personalizado')+'</span>'
      +'<div style="font-size:15px;font-weight:500;'+(d.concluido?'color:var(--green-t);':'')+'">'+d.nome+(d.concluido?' ✓':'')+'</div></div>'
      +'<span class="pill '+(d.concluido?'pg':'pa')+'">'+pct+'%</span></div>'
      +(d.desc?'<div style="font-size:12px;color:var(--t2);margin-bottom:7px;">'+d.desc+'</div>':'')
      +'<div style="font-size:12px;color:var(--t3);margin-bottom:8px;">Início: '+d.inicio+' · '+d.dur+' semana'+(d.dur>1?'s':'')+'</div>'
      +'<div class="pbar" style="margin-bottom:8px;"><div class="pfill" style="width:'+pct+'%;background:'+(d.concluido?'var(--green)':cor)+';"></div></div>'
      +passosHTML+valorHTML
      +'<button class="btn bd bxs" onclick="delDesafio('+d.id+')" style="margin-top:6px;">Eliminar</button></div>';
  }).join('');
}

// ===================== NOTAS =====================
async function saveNotasArea(){
  var txt=g('notas-area')?g('notas-area').value:'';
  notas=notas.filter(function(n){return n.tipo==='prevista';});
  txt.split('\n').filter(function(l){return l.trim();}).forEach(function(linha){
    notas.push({id:uid(),texto:linha.trim(),data:today(),feita:false,tipo:'mes'});
  });
  await saveAll();renderResumo();alert('Notas guardadas!');
}

function renderNotas(){
  var el=g('r-notas-wrap');if(!el)return;
  var mesNotas=notas.filter(function(n){return n.tipo==='mes'||!n.tipo;});
  var txt=mesNotas.filter(function(n){return !n.feita;}).map(function(n){return n.texto;}).join('\n');
  el.innerHTML='<textarea id="notas-area" placeholder="Escreve aqui notas e lembretes para o próximo mês...\nEx: Não esquecer o seguro do carro\nEx: Mês que vem vai ser mais apertado" style="width:100%;min-height:130px;font-size:13px;margin-bottom:.7rem;">'+txt+'</textarea>'
    +'<button class="btn ba bsm" onclick="saveNotasArea()">Guardar notas</button>';
}

// ===================== DESEJOS =====================
async function addWish(){
  var nome=g('w-nome').value.trim(),preco=parseFloat(g('w-preco').value)||0;
  if(!nome||!preco)return alert('Preenche nome e preço.');
  desejos.push({id:uid(),nome:nome,preco:preco,prio:g('w-prio').value,notas:g('w-notas').value.trim(),comprado:false});
  g('w-nome').value='';g('w-preco').value='';g('w-notas').value='';
  await saveAll();renderDesejos();analisarDesejos();
}
async function delWish(id){desejos=desejos.filter(function(d){return d.id!==id;});await saveAll();renderDesejos();analisarDesejos();}
async function markWish(id){var w=desejos.find(function(d){return d.id===id;});if(w)w.comprado=!w.comprado;await saveAll();renderDesejos();}

function renderDesejos(){
  var el=g('lst-desejos');if(!el)return;
  if(!desejos.length){el.innerHTML='<div class="card"><div style="font-size:13px;color:var(--t3);">Sem itens.</div></div>';return;}
  var order={alta:0,media:1,baixa:2};
  var sorted=[...desejos].sort(function(a,b){return order[a.prio]-order[b.prio];});
  el.innerHTML=sorted.map(function(w){return '<div class="wish-item" style="'+(w.comprado?'opacity:.5;':'')+'">'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px;">'
    +'<div><div style="font-size:15px;font-weight:500;'+(w.comprado?'text-decoration:line-through;':'')+'">'+w.nome+'</div>'
    +'<div style="font-size:12px;color:var(--t3);">'+(w.prio==='alta'?'Alta prioridade':w.prio==='media'?'Média':'Baixa')+(w.notas?' · '+w.notas:'')+'</div></div>'
    +'<div style="font-size:18px;font-weight:400;color:var(--accent);">'+fmt(w.preco)+'</div></div>'
    +'<div style="display:flex;gap:6px;"><button class="btn bg bsm" onclick="markWish('+w.id+')">'+(w.comprado?'Desfazer':'✓ Comprado')+'</button><button class="btn bd bsm" onclick="delWish('+w.id+')">Remover</button></div></div>';}).join('');
}

function analisarDesejos(){
  var el=g('wishes-ai');if(!el)return;
  var pend=desejos.filter(function(d){return !d.comprado;});
  if(!pend.length){el.innerHTML='';return;}
  var m=cur();
  var entIn=entradas.filter(function(e){return e.tipo!=='prevista'&&mk(e.data)===m;}).reduce(function(s,e){return s+e.valor;},0);
  var despIn=despesas.filter(function(d){return mk(d.data)===m;}).reduce(function(s,d){return s+d.valor;},0);
  var diIn=diario.filter(function(d){return mk(d.data)===m;}).reduce(function(s,d){return s+d.valor;},0);
  var disp=Math.max(entIn-despIn-diIn,0);
  var posso=pend.filter(function(w){return w.preco<=disp;});
  el.innerHTML=posso.length
    ?'<div class="ai-box" style="margin-bottom:.9rem;"><div class="ai-title">Podes comprar este mês</div><div class="ai-text">Com '+fmt(disp)+' disponíveis: '+posso.map(function(w){return '<strong>'+w.nome+'</strong> ('+fmt(w.preco)+')';}).join(', ')+'.</div></div>'
    :'<div class="alert ala" style="margin-bottom:.9rem;">Com '+fmt(disp)+' disponíveis ainda não há nada que caiba. Continua a poupar!</div>';
}

// ===================== DICAS =====================
var DICAS=[
  {nivel:'Básico',tag:'Primeiro passo',cor:'#1E6348',titulo:'Como funciona o dinheiro',corpo:'O dinheiro tem três destinos: gastas-o, poupas-o ou investes-o. O segredo das finanças pessoais não é ganhar mais — é controlar melhor o que já entra. Começa por saber exactamente quanto recebes e quanto gastas em cada mês.'},
  {nivel:'Básico',tag:'Orçamento',cor:'#1B4F72',titulo:'A regra 50/30/20',corpo:'Divide o rendimento líquido em três: 50% para necessidades (renda, comida, transportes), 30% para desejos (lazer, restaurantes, roupa), e 20% para poupar e pagar dívidas. Se o teu 50% está acima de 60%, as despesas fixas estão demasiado pesadas para o teu rendimento.'},
  {nivel:'Básico',tag:'Poupança',cor:'#7A4A0A',titulo:'Paga-te primeiro',corpo:'Quando o salário chega, antes de pagar qualquer conta, transfere logo um valor fixo para poupança. Mesmo que sejam 20€. Quem espera que sobre para poupar nunca poupa. O hábito constrói-se com consistência, não com valores grandes.'},
  {nivel:'Básico',tag:'Emergência',cor:'#8B1F1F',titulo:'A reserva de emergência',corpo:'Antes de qualquer outro objetivo, constrói um fundo de 3 a 6 meses de despesas fixas. Esta reserva separa uma avaria do carro de uma crise financeira. Guarda-a numa conta separada que não tocas — só para emergências reais.'},
  {nivel:'Básico',tag:'Gastos diários',cor:'#6B4226',titulo:'O perigo dos gastos invisíveis',corpo:'Um café por dia são 438€ por ano. Um almoço fora (5€ extra) são 1.250€ por ano. Não se trata de viver sem prazer — é ter consciência. Regista tudo no separador Diário durante um mês. Os números vão surpreender-te.'},
  {nivel:'Básico',tag:'Dívidas',cor:'#3D2580',titulo:'Como sair das dívidas',corpo:'Lista todas as dívidas do menor para o maior valor. Paga o mínimo em todas e mete todo o dinheiro extra na mais pequena. Quando a liquidas, usa todo esse valor na próxima. A sensação de eliminar uma dívida dá energia para continuar.'},
  {nivel:'Intermédio',tag:'Compras',cor:'#5C3D1E',titulo:'A regra das 72 horas',corpo:'Quando sentires vontade de comprar algo não planeado acima de 30€, espera 72 horas. Se ao fim desse tempo ainda quiseres e caber no orçamento, compra. Esta regra elimina a maioria das compras por impulso.'},
  {nivel:'Intermédio',tag:'Alimentação',cor:'#1E6348',titulo:'Planear as refeições poupa muito',corpo:'Antes do supermercado, planeia refeições de 5-7 dias e faz lista. Compra só o que está na lista. Esta prática reduz o desperdício em até 40% e baixa a conta significativamente. Comprar sem lista ou com fome é a receita para gastar o dobro.'},
  {nivel:'Intermédio',tag:'Subscrições',cor:'#4A3A6B',titulo:'A armadilha das subscrições',corpo:'Faz uma auditoria: lista todas as subscrições mensais. Marca as que usaste pelo menos 3 vezes na última semana. Cancela todas as restantes. A maioria das pessoas descobre 30-80€ por mês em subscrições esquecidas.'},
  {nivel:'Intermédio',tag:'Casais',cor:'#3D2580',titulo:'Falar de dinheiro em casal',corpo:'O dinheiro é a principal causa de conflito nos casais. A solução é uma conversa mensal — não para discutir, mas para fazer o ponto de situação juntos. Definir objetivos em comum e usar uma app partilhada como esta ajuda muito.'},
  {nivel:'Intermédio',tag:'Negociação',cor:'#0E5E5E',titulo:'Podes negociar as tuas contas',corpo:'A maioria das pessoas não sabe que pode negociar o ginásio, o seguro, o internet e até a renda. Basta ligar e dizer que estás a pensar cancelar ou mudar. Na maioria dos casos consegues um desconto imediato.'},
  {nivel:'Avançado',tag:'Investimento',cor:'#1A3F6F',titulo:'Quando e como começar a investir',corpo:'Só investe quando: tens reserva de emergência, não tens dívidas a taxas altas, e poupas regularmente. Em Portugal, os PPR têm vantagens fiscais. Fundos de índice (ETFs) são para médio/longo prazo. Nunca invistas dinheiro de que precisas nos próximos 3-5 anos.'},
  {nivel:'Avançado',tag:'Impostos',cor:'#4A3A6B',titulo:'Deduzir tudo o que podes no IRS',corpo:'Muitas famílias pagam mais IRS do que deviam. Despesas de saúde, educação, habitação, ginásio — tudo conta. Guarda todos os recibos e certifica-te que estão no e-fatura antes de declarares.'},
  {nivel:'Avançado',tag:'Mentalidade',cor:'#7A4A0A',titulo:'Preço vs custo — a diferença que importa',corpo:'O preço é o que pagas agora. O custo é o impacto total ao longo do tempo. Um carro caro tem manutenção cara e seguro caro. Um ginásio barato que não usas custa mais do que um caro que usas 4 vezes por semana.'},
  {nivel:'Avançado',tag:'Automação',cor:'#1E6348',titulo:'Automatiza as tuas finanças',corpo:'No dia do salário, configura transferências automáticas para poupança e objetivos. O que não vês não gastas. A automação remove a tentação e a procrastinação — as duas maiores inimigas das finanças pessoais.'},
];

function renderDicas(){
  var el=g('dicas-content');if(!el)return;
  var niveis=['Básico','Intermédio','Avançado'];
  var corNivel={Básico:'var(--green)',Intermédio:'var(--amber)',Avançado:'var(--red)'};
  var html='';
  niveis.forEach(function(nivel){
    var ds=DICAS.filter(function(d){return d.nivel===nivel;});
    html+='<div style="font-size:13px;font-weight:600;color:'+corNivel[nivel]+';margin:1.2rem 0 .5rem;text-transform:uppercase;letter-spacing:.06em;">— '+nivel+' —</div>';
    html+=ds.map(function(d){return '<div class="dica-card"><span class="dica-tag" style="background:'+d.cor+'20;color:'+d.cor+';">'+d.tag+'</span><div class="dica-title">'+d.titulo+'</div><div class="dica-body">'+d.corpo+'</div></div>';}).join('');
  });
  el.innerHTML=html;
}

// ===================== CICLO =====================
function cycleInfo(){
  var n=new Date();
  var start,end;
  if(n.getDate()>=5){start=new Date(n.getFullYear(),n.getMonth(),5);end=new Date(n.getFullYear(),n.getMonth()+1,4);}
  else{start=new Date(n.getFullYear(),n.getMonth()-1,5);end=new Date(n.getFullYear(),n.getMonth(),4);}
  var daysLeft=Math.max(Math.ceil((end-n)/(1000*60*60*24)),0);
  var totalDays=Math.round((end-start)/(1000*60*60*24));
  var weekNum=Math.ceil((totalDays-daysLeft)/7);
  return {start:start,end:end,daysLeft:daysLeft,weekNum:weekNum};
}

// ===================== RESUMO =====================
function renderResumo(){
  var m=g('r-month')?g('r-month').value:cur();
  var isCur=m===cur();
  var entIn=entradas.filter(function(e){return e.tipo!=='prevista'&&mk(e.data)===m;});
  var entPrev=entradas.filter(function(e){return e.tipo==='prevista'&&mk(e.data)===m;});
  var despIn=despesas.filter(function(d){return mk(d.data)===m;});
  var diIn=diario.filter(function(d){return mk(d.data)===m;});
  var totalIn=entIn.reduce(function(s,e){return s+e.valor;},0);
  var totalPrev=entPrev.reduce(function(s,e){return s+e.valor;},0);
  var totalDesp=despIn.reduce(function(s,d){return s+d.valor;},0);
  var totalDiar=diIn.reduce(function(s,d){return s+d.valor;},0);
  var totalOut=totalDesp+totalDiar;
  var saldo=totalIn-totalOut;
  var taxa=totalIn>0?Math.round((Math.max(saldo,0)/totalIn)*100):0;

  if(isCur&&g('r-countdown')){
    var ci=cycleInfo();
    var weekSpend=getWeekSpend();
    var weekBudget=saldo>0?Math.round(saldo/Math.max(Math.ceil(ci.daysLeft/7),1)):0;
    var wc=ci.daysLeft<=5?'var(--red)':ci.daysLeft<=10?'var(--amber)':'var(--t)';
    g('r-countdown').innerHTML='<div class="countdown" style="background:'+wc+';">'
      +'<div><div class="cd-big">'+ci.daysLeft+' dias para o dia 5</div><div style="font-size:12px;opacity:.7;">Semana '+ci.weekNum+' do ciclo</div></div>'
      +'<div style="text-align:right;"><div style="font-size:13px;font-weight:500;">Esta semana: '+fmt(weekSpend)+'</div>'
      +'<div style="font-size:12px;opacity:.7;">'+(weekBudget>0?'Limite semanal: '+fmt(weekBudget):'Regista entradas para ver limite')+'</div>'
      +(saldo<0?'<div style="font-size:12px;margin-top:2px;font-weight:600;">⚠ CONTA EM VERMELHO!</div>':'')
      +'</div></div>';
  } else if(!isCur&&g('r-countdown')) g('r-countdown').innerHTML='';

  var alts='';
  if(totalIn===0)alts+='<div class="alert ala">Sem entradas para '+mlbl(m)+'.</div>';
  if(saldo<0&&totalIn>0)alts+='<div class="alert alr">Conta em <strong>VERMELHO</strong>: gastas mais '+fmt(Math.abs(saldo))+' do que recebes!</div>';
  else if(taxa<10&&totalIn>0)alts+='<div class="alert ala">Taxa de poupança muito baixa ('+taxa+'%). Revê as despesas.</div>';
  else if(taxa>=20&&totalIn>0)alts+='<div class="alert alg">Óptimo! '+taxa+'% de poupança.</div>';
  if(totalPrev>0)alts+='<div class="alert alp">Tens '+fmt(totalPrev)+' em entradas previstas. Ver sugestões em Entradas.</div>';
  var depsPP=despIn.filter(function(d){return !d.pago;});
  if(depsPP.length>0){var vpp=depsPP.reduce(function(s,d){return s+d.valor;},0);alts+='<div class="alert ala">'+depsPP.length+' despesa(s) por pagar: '+fmt(vpp)+'.</div>';}
  if(g('r-alerts'))g('r-alerts').innerHTML=alts;

  if(g('r-metrics'))g('r-metrics').innerHTML=
    '<div class="metric"><div class="ml">Entradas reais</div><div class="mv g">'+fmt(totalIn)+'</div></div>'
    +'<div class="metric"><div class="ml">Despesas fixas</div><div class="mv r">'+fmt(totalDesp)+'</div></div>'
    +'<div class="metric"><div class="ml">Diário / extra</div><div class="mv r">'+fmt(totalDiar)+'</div></div>'
    +'<div class="metric"><div class="ml">Saldo</div><div class="mv '+(saldo>=0?'g':'r')+'">'+fmt(saldo)+'</div></div>'
    +'<div class="metric"><div class="ml">Taxa poupança</div><div class="mv '+(taxa>=20?'g':taxa>=10?'a':'r')+'">'+taxa+'%</div></div>'
    +(totalPrev>0?'<div class="metric"><div class="ml">Previstas</div><div class="mv" style="color:var(--purple);">'+fmt(totalPrev)+'</div></div>':'');

  var pD=totalIn>0?Math.min(Math.round((totalDesp/totalIn)*100),100):0;
  var pDi=totalIn>0?Math.min(Math.round((totalDiar/totalIn)*100),100):0;
  var pT=pD+pDi;
  if(g('r-spendbar'))g('r-spendbar').innerHTML=
    '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;"><span>Gasto: <strong>'+fmt(totalOut)+'</strong></span><span style="color:'+(pT>90?'var(--red)':'var(--t2)')+';">'+pT+'% do rendimento</span></div>'
    +'<div class="pbar" style="height:13px;"><div style="display:flex;height:100%;"><div style="width:'+pD+'%;background:var(--red);opacity:.75;"></div><div style="width:'+pDi+'%;background:var(--amber);opacity:.85;"></div></div></div>'
    +'<div style="display:flex;gap:1rem;margin-top:5px;font-size:12px;color:var(--t2);">'
    +'<span>'+catDot('Habitação',9)+' Fixas '+pD+'%</span>'
    +'<span><span style="display:inline-block;width:9px;height:9px;background:var(--amber);border-radius:50%;vertical-align:middle;margin-right:3px;"></span>Diário '+pDi+'%</span>'
    +(saldo>=0?'<span style="color:var(--green);">Sobra '+fmt(saldo)+'</span>':'<span style="color:var(--red);">Défice '+fmt(Math.abs(saldo))+'</span>')
    +'</div>';

  var eHtml='';
  var sal=entIn.filter(function(e){return e.tipo==='salario';}),caf=entIn.filter(function(e){return e.tipo==='caf';});
  if(sal.length)eHtml+='<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--green-t);padding:5px 0 3px;">Salário Luis</div>'+sal.map(function(e){return '<div class="li"><div class="ll"><div class="ln">'+e.desc+'</div><div class="ls">'+e.data+'</div></div><div class="lr"><span class="am ai">+'+fmt(e.valor)+'</span></div></div>';}).join('');
  if(caf.length)eHtml+='<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--blue-t);padding:5px 0 3px;">CAF</div>'+caf.map(function(e){return '<div class="li"><div class="ll"><div class="ln">'+e.desc+'</div><div class="ls">'+e.data+'</div></div><div class="lr"><span class="am ai">+'+fmt(e.valor)+'</span></div></div>';}).join('');
  if(entPrev.length)eHtml+='<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--purple-t);padding:5px 0 3px;">Previstas</div>'+entPrev.map(function(e){return '<div class="li"><div class="ll"><div class="ln">'+e.desc+'</div><div class="ls">'+(e.nota||e.data)+'</div></div><div class="lr"><span class="am apv">~'+fmt(e.valor)+'</span></div></div>';}).join('');
  if(g('r-entradas'))g('r-entradas').innerHTML=eHtml||'<div style="font-size:13px;color:var(--t3);">Sem entradas.</div>';

  var byCat={};
  [...despIn,...diIn].forEach(function(d){byCat[d.cat]=(byCat[d.cat]||0)+d.valor;});
  var cHtml='';
  Object.entries(byCat).sort(function(a,b){return b[1]-a[1];}).forEach(function(entry){
    var cat=entry[0],val=entry[1];
    var p=totalIn>0?Math.min(Math.round((val/totalIn)*100),100):0;
    var c=CAT_COLORS[cat]||'#888';
    cHtml+='<div style="margin-bottom:9px;"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;align-items:center;"><span style="display:flex;align-items:center;gap:5px;">'+catDot(cat,9)+'<span>'+cat+'</span></span><span style="color:var(--t2);">'+fmt(val)+' <span style="color:var(--t3);">('+p+'%)</span></span></div><div class="pbar"><div class="pfill" style="width:'+p+'%;background:'+c+';"></div></div></div>';
  });
  if(g('r-cats'))g('r-cats').innerHTML=cHtml||'<div style="font-size:13px;color:var(--t3);">Sem despesas.</div>';

  var rec=[...diIn].sort(function(a,b){return b.data.localeCompare(a.data);}).slice(0,5);
  if(g('r-daily'))g('r-daily').innerHTML=rec.length?rec.map(function(d){return '<div class="li"><div class="ll"><div class="ln">'+d.desc+'</div><div class="ls" style="display:flex;align-items:center;gap:4px;">'+catDot(d.cat,8)+' '+d.cat+' · '+d.data+'</div></div><div class="lr"><span class="am ao">-'+fmt(d.valor)+'</span></div></div>';}).join('')+'<div style="font-size:12px;color:var(--t3);padding:.4rem 0;cursor:pointer;" onclick="go(\'diario\')">Ver tudo no Diário →</div>':'<div style="font-size:13px;color:var(--t3);">Sem registos diários.</div>';

  var oHtml=objetivos.length?objetivos.map(function(obj){
    var pct=obj.meta>0?Math.min(Math.round(((obj.atual||0)/obj.meta)*100),100):0;
    return '<div style="margin-bottom:11px;"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;"><span>'+obj.nome+'</span><span class="pill '+(pct>=100?'pg':pct>=50?'pb':'pa')+'">'+pct+'%</span></div><div class="pbar"><div class="pfill" style="width:'+pct+'%;background:'+(pct>=100?'var(--green)':pct>=50?'#1A3F6F':'var(--accent)')+';"></div></div><div style="font-size:12px;color:var(--t3);margin-top:2px;">'+fmt(obj.atual||0)+' de '+fmt(obj.meta)+(obj.prazo?' · '+obj.prazo:'')+'</div></div>';
  }).join(''):'<div style="font-size:13px;color:var(--t3);">Sem objetivos.</div>';
  if(g('r-objs'))g('r-objs').innerHTML=oHtml;

  var disp=Math.max(saldo,0);
  var pend=desejos.filter(function(d){return !d.comprado;});
  var posso=pend.filter(function(w){return w.preco<=disp;});
  var wHtml='';
  if(!pend.length)wHtml='<div style="font-size:13px;color:var(--t3);">Sem itens na lista.</div>';
  else if(!posso.length)wHtml='<div class="alert ala">Com '+fmt(disp)+' ainda não há nada que caiba.</div>';
  else wHtml='<div class="alert alg" style="margin-bottom:.6rem;">Com '+fmt(disp)+' podes considerar: '+posso.map(function(w){return '<strong>'+w.nome+'</strong> ('+fmt(w.preco)+')';}).join(', ')+'.</div>'+posso.map(function(w){return '<div class="li"><div class="ll"><div class="ln">'+w.nome+'</div><div class="ls">'+(w.prio==='alta'?'Alta':w.prio==='media'?'Média':'Baixa')+'</div></div><div class="lr"><span class="am" style="color:var(--accent);">'+fmt(w.preco)+'</span></div></div>';}).join('');
  if(g('r-wishes'))g('r-wishes').innerHTML=wHtml;

  renderNotas();
}

// ===================== REMINDER =====================
function checkReminder(){
  var last=localStorage.getItem('cf_last_reg'),tod=today();
  if(last===tod)return;
  var b=document.createElement('div');
  b.style.cssText='position:fixed;bottom:1rem;right:1rem;left:1rem;max-width:400px;margin:0 auto;background:var(--t);color:#fff;border-radius:var(--rlg);padding:.9rem 1.2rem;z-index:999;display:flex;justify-content:space-between;align-items:center;gap:1rem;box-shadow:0 4px 20px rgba(0,0,0,.3);';
  b.innerHTML='<div><div style="font-weight:600;margin-bottom:1px;">Já registaste os gastos de hoje?</div><div style="font-size:12px;opacity:.65;">Abre o Diário e regista!</div></div><button onclick="go(\'diario\');this.closest(\'[style]\').remove();localStorage.setItem(\'cf_last_reg\',\''+tod+'\');" style="background:var(--accent);color:#fff;border:none;border-radius:5px;padding:7px 12px;font-weight:600;cursor:pointer;font-size:13px;flex-shrink:0;">Registar</button>';
  document.body.appendChild(b);
  setTimeout(function(){if(b.parentElement)b.remove();},12000);
}
document.addEventListener('visibilitychange',function(){if(!document.hidden&&USER_KEY)checkReminder();});

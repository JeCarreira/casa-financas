'use strict';
var API='/api',USER_KEY='',LS_KEY='';
var entradas=[],despesas=[],diario=[],objetivos=[],desejos=[],templates=[],desafios=[],notas=[];
var CAT_COLORS={'Habitação':'#1B4F72','Alimentação':'#1E6348','Transportes':'#7A4A0A','Filhos':'#3D2580','Saúde':'#8B1F1F','Lazer':'#0E5E5E','Serviços':'#4A3A6B','Vestuário':'#5C3D1E','Café / Bar':'#6B4226','Gasolina':'#4A3A0A','Compras':'#1A4A1A','Criança':'#3D2580','Farmácia':'#8B1F1F','Outro':'#5C5C5C'};
function g(id){return document.getElementById(id);}
function fmt(n){return (Math.round(n*100)/100).toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';}
function today(){return new Date().toISOString().split('T')[0];}
function mk(d){return d?d.slice(0,7):'';}
function cur(){var n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0');}
function mlbl(k){if(!k)return '';var p=k.split('-');return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][+p[1]-1]+' '+p[0];}
function uid(){return 'id'+Date.now()+'x'+Math.floor(Math.random()*1e9);}
function setTd(id){var e=g(id);if(e&&!e.value)e.value=today();}
function catDot(cat,sz){sz=sz||10;var c=CAT_COLORS[cat]||'#888';return '<span style="display:inline-block;width:'+sz+'px;height:'+sz+'px;border-radius:50%;background:'+c+';flex-shrink:0;vertical-align:middle;"></span>';}
function getData(){return {entradas:entradas,despesas:despesas,diario:diario,objetivos:objetivos,desejos:desejos,templates:templates,desafios:desafios,notas:notas,_ts:Date.now()};}
function applyData(d){if(!d)return;entradas=d.entradas||[];despesas=d.despesas||[];diario=d.diario||[];objetivos=d.objetivos||[];desejos=d.desejos||[];desafios=d.desafios||[];notas=d.notas||[];templates=(d.templates&&d.templates.length)?d.templates:defaultTpl();}
function defaultTpl(){return [{id:'t1',nome:'Renda / Crédito habitação',valor:700,cat:'Habitação',ativo:true},{id:'t2',nome:'Electricidade + água + gás',valor:120,cat:'Serviços',ativo:true},{id:'t3',nome:'Internet + telemóvel',valor:60,cat:'Serviços',ativo:true},{id:'t4',nome:'Supermercado semanal',valor:400,cat:'Alimentação',ativo:true},{id:'t5',nome:'Gasolina',valor:150,cat:'Transportes',ativo:true},{id:'t6',nome:'Escola / actividades filhos',valor:200,cat:'Filhos',ativo:true}];}

// ===== STORAGE =====
function lsSave(){
  if(!LS_KEY)return;
  try{localStorage.setItem(LS_KEY,JSON.stringify(getData()));}catch(e){}
  try{sessionStorage.setItem(LS_KEY,JSON.stringify(getData()));}catch(e){}
}
function lsLoad(){
  if(!LS_KEY)return null;
  try{var r=localStorage.getItem(LS_KEY)||sessionStorage.getItem(LS_KEY);if(r)return JSON.parse(r);}catch(e){}
  return null;
}
function setSS(s){var dot=g('sync-dot'),lbl=g('sync-lbl');if(!dot)return;dot.className='dot'+(s==='syncing'?' syncing':s==='error'?' error':'');lbl.textContent=s==='syncing'?'a guardar...':s==='error'?'local':'guardado';}

function saveAll(){
  if(!USER_KEY)return;
  lsSave(); // local imediato
  setSS('syncing');
  var d=getData();
  fetch(API+'/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:USER_KEY,data:d})})
    .then(function(r){setSS(r.ok?'saved':'error');if(r.ok)localStorage.setItem(LS_KEY+'_cloud_ts',''+d._ts);})
    .catch(function(){setSS('error');});
}

function loadAndStart(){
  // 1. Load local immediately
  var local=lsLoad();
  if(local){applyData(local);}else{templates=defaultTpl();}
  populateSels();renderResumo();renderTpl();renderDesafiosSugeridos();renderDicas();
  setTimeout(checkReminder,2000);
  // 2. Try cloud in background, update if newer
  fetch(API+'/load',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:USER_KEY})})
    .then(function(r){return r.ok?r.json():null;})
    .then(function(res){
      if(!res||!res.data)return;
      var localTs=local?local._ts||0:0;
      var cloudTs=res.data._ts||0;
      if(cloudTs>localTs){
        applyData(res.data);lsSave();
        populateSels();reRender();
      }
    })
    .catch(function(){});
}

// ===== LOGIN =====
function doLogin(){
  var code=g('login-code').value.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'');
  if(code.length<3){g('login-err').textContent='Código demasiado curto.';return;}
  USER_KEY=code;
  LS_KEY='financas_v3_'+code.replace(/[^a-z0-9]/g,'');
  g('login-err').textContent='A carregar...';
  g('login-screen').style.display='none';
  g('app').style.display='block';
  localStorage.setItem('cf_last_code',code);
  loadAndStart();
  g('login-err').textContent='';
}
window.addEventListener('load',function(){var last=localStorage.getItem('cf_last_code');if(last){g('login-code').value=last;doLogin();}});

// ===== UTILS =====
function allMonths(){var s=new Set(),n=new Date();for(var i=5;i>=0;i--){var d=new Date(n.getFullYear(),n.getMonth()-i,1);s.add(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));}[...entradas,...despesas,...diario].forEach(function(x){if(x.data)s.add(mk(x.data));});return [...s].sort();}
function populateSels(){var months=allMonths(),c=cur();['r-month','e-month','d-month'].forEach(function(id){var el=g(id);if(!el)return;var prev=el.value||c;el.innerHTML=months.map(function(m){return '<option value="'+m+'"'+(m===prev?' selected':'')+'>'+mlbl(m)+'</option>';}).join('');});}
function openM(id){g(id).classList.add('on');}
function closeM(id){g(id).classList.remove('on');}
document.addEventListener('keydown',function(e){if(e.key==='Escape')document.querySelectorAll('.modal-overlay.on').forEach(function(m){m.classList.remove('on');});});
function go(page){
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('on');});
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('on');});
  var el=g('page-'+page);if(el)el.classList.add('on');
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
function reRender(){populateSels();var a=document.querySelector('.page.on');if(!a)return;go(a.id.replace('page-',''));}

// ===== CICLO =====
function cycleInfo(){
  var n=new Date(),start,end;
  if(n.getDate()>=5){start=new Date(n.getFullYear(),n.getMonth(),5);end=new Date(n.getFullYear(),n.getMonth()+1,4);}
  else{start=new Date(n.getFullYear(),n.getMonth()-1,5);end=new Date(n.getFullYear(),n.getMonth(),4);}
  var dl=Math.max(Math.ceil((end-n)/(1000*60*60*24)),0);
  var td=Math.round((end-start)/(1000*60*60*24));
  return {daysLeft:dl,weekNum:Math.max(1,Math.ceil((td-dl)/7)),end:end,totalDays:td};
}
function getWeekSpend(){var n=new Date(),day=n.getDay(),s=new Date(n);s.setDate(n.getDate()-(day===0?6:day-1));var sk=s.toISOString().split('T')[0];return diario.filter(function(d){return d.data>=sk;}).reduce(function(s,d){return s+d.valor;},0);}

// ===== ENTRADAS =====
function addEnt(tipo){var map={salario:['sl-d','sl-v','sl-dt'],caf:['caf-d','caf-v','caf-dt'],prevista:['pv-d','pv-v','pv-dt']};var ids=map[tipo],desc=g(ids[0]).value.trim(),val=parseFloat(g(ids[1]).value),data=g(ids[2]).value||today();if(!desc||!val||val<=0){alert('Preenche descrição e valor.');return;}entradas.push({id:uid(),tipo:tipo,desc:desc,valor:val,data:data,nota:tipo==='prevista'?g('pv-n').value.trim():''});g(ids[1]).value='';if(tipo==='prevista')g('pv-n').value='';saveAll();reRender();if(tipo==='prevista')renderSugestoesPrevistas();}
function delEnt(id){entradas=entradas.filter(function(e){return e.id!==id;});saveAll();reRender();}
function renderEntradas(){
  var m=g('e-month').value;
  ['salario','caf','prevista'].forEach(function(tipo){
    var f=entradas.filter(function(e){return e.tipo===tipo&&mk(e.data)===m;}).sort(function(a,b){return b.data.localeCompare(a.data);});
    var el=g('lst-'+tipo);if(!el)return;
    el.innerHTML=f.length?f.map(function(e){return '<div class="li"><div class="ll"><div class="ln">'+e.desc+'</div><div class="ls">'+e.data+(e.nota?' · '+e.nota:'')+'</div></div><div class="lr"><span class="am '+(tipo==='prevista'?'apv':'ai')+'">'+(tipo==='prevista'?'~':'+')+fmt(e.valor)+'</span><button class="btn bd bxs" onclick="delEnt(\''+e.id+'\')">×</button></div></div>';}).join(''):'<div style="font-size:13px;color:var(--t3);padding:.4rem 0;">Sem registos.</div>';
  });
  renderSugestoesPrevistas();
}

function renderSugestoesPrevistas(){
  var m=cur(),prevs=entradas.filter(function(e){return e.tipo==='prevista'&&mk(e.data)===m;});
  var el=g('pv-sugestao');if(!el)return;
  if(!prevs.length){el.innerHTML='';return;}
  var total=prevs.reduce(function(s,e){return s+e.valor;},0);
  var ci=cycleInfo();
  var m2=cur();
  var tIn=entradas.filter(function(e){return e.tipo!=='prevista'&&mk(e.data)===m2;}).reduce(function(s,e){return s+e.valor;},0);
  var tD=despesas.filter(function(d){return mk(d.data)===m2;}).reduce(function(s,d){return s+d.valor;},0);
  var tDi=diario.filter(function(d){return mk(d.data)===m2;}).reduce(function(s,d){return s+d.valor;},0);
  var saldoAtual=tIn-tD-tDi;
  var gastoDiario=ci.daysLeft>0?(tD+tDi)/Math.max(ci.totalDays-ci.daysLeft,1):0;
  var necessarioAteD5=gastoDiario*ci.daysLeft;

  // Build smart suggestions
  var sug=[];

  // Priority 1: Will they make it to day 5?
  if(saldoAtual<0){
    sug.push({icon:'⚠',cor:'var(--red-t)',bg:'var(--red-bg)',txt:'O saldo está negativo ('+fmt(saldoAtual)+'). Usa <strong>'+fmt(Math.min(Math.abs(saldoAtual),total))+'</strong> para cobrir o défice primeiro.'});
  } else if(necessarioAteD5>saldoAtual+total){
    sug.push({icon:'⚠',cor:'var(--red-t)',bg:'var(--red-bg)',txt:'Atenção: ao ritmo actual vais precisar de <strong>'+fmt(necessarioAteD5)+'</strong> até ao dia 5, mas só tens '+fmt(saldoAtual+total)+' disponíveis. Corta os gastos.'});
  } else {
    var guardaD5=Math.round(necessarioAteD5*1.2);
    sug.push({icon:'📅',cor:'var(--amber-t)',bg:'var(--amber-bg)',txt:'Faltam <strong>'+ci.daysLeft+' dias</strong> para o dia 5. Guarda <strong>'+fmt(guardaD5)+'</strong> para cobrir os gastos até lá ('+fmt(Math.round(gastoDiario))+'€/dia de média).'});
  }

  // Priority 2: Objectives
  var objsPend=objetivos.filter(function(o){return Math.max(o.meta-(o.atual||0),0)>0;});
  objsPend.slice(0,2).forEach(function(o){
    var rest=Math.max(o.meta-(o.atual||0),0);
    var contrib=Math.min(Math.round(total*0.2),rest);
    if(contrib>0)sug.push({icon:'🎯',cor:'var(--blue-t)',bg:'var(--blue-bg)',txt:'Mete <strong>'+fmt(contrib)+'</strong> no objetivo "<em>'+o.nome+'</em>" — faltam '+fmt(rest)+' para a meta.'});
  });

  // Priority 3: Despesas por pagar
  var depsPP=despesas.filter(function(d){return !d.pago&&mk(d.data)===m2;});
  if(depsPP.length>0){var vpp=depsPP.reduce(function(s,d){return s+d.valor;},0);sug.push({icon:'💳',cor:'var(--purple-t)',bg:'var(--purple-bg)',txt:'Tens <strong>'+fmt(vpp)+'</strong> em despesas por pagar ('+depsPP.length+' item(s)). Trata disso primeiro.'});}

  // Priority 4: Wishes (only if comfortable)
  if(saldoAtual>0&&ci.daysLeft>10){
    var desejosOk=desejos.filter(function(d){return !d.comprado;}).sort(function(a,b){var o={alta:0,media:1,baixa:2};return o[a.prio]-o[b.prio];});
    var melhor=desejosOk.find(function(w){return w.preco<=(total*0.15);});
    if(melhor)sug.push({icon:'🛍',cor:'var(--green-t)',bg:'var(--green-bg)',txt:'Se estiveres confortável, podes comprar "<em>'+melhor.nome+'</em>" ('+fmt(melhor.preco)+') da lista de desejos.'});
  }

  // Priority 5: Emergency reserve
  sug.push({icon:'🏦',cor:'var(--t2)',bg:'var(--surface2)',txt:'Guarda pelo menos <strong>'+fmt(Math.round(total*0.25))+'</strong> como almofada de segurança para imprevistos.'});

  // Build HTML
  var notaExist=notas.find(function(n){return n.tipo==='prevista'&&n.mes===m;});
  var html='<div class="ai-box" style="margin-top:.7rem;">'
    +'<div class="ai-title">O que fazer com '+fmt(total)+' de entradas previstas</div>'
    +'<div style="display:flex;flex-direction:column;gap:8px;margin:.5rem 0;">'
    +sug.map(function(s){return '<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border-radius:6px;background:'+s.bg+';font-size:13px;color:'+s.cor+';"><span style="flex-shrink:0;font-size:15px;">'+s.icon+'</span><span>'+s.txt+'</span></div>';}).join('')
    +'</div>'
    +'<div style="margin-top:.7rem;border-top:.5px solid var(--border);padding-top:.7rem;">'
    +'<label style="font-size:12px;color:var(--amber-t);font-weight:600;">A tua nota sobre este dinheiro</label>'
    +'<textarea id="pv-nota-pessoal" placeholder="Escreve aqui o que queres fazer com este dinheiro previsto..." style="margin-top:5px;font-size:13px;min-height:70px;">'+(notaExist?notaExist.texto:'')+'</textarea>'
    +'<button class="btn ba bsm" style="margin-top:5px;" onclick="saveNotaPrevista()">Guardar nota</button>'
    +'</div></div>';
  el.innerHTML=html;
}
function saveNotaPrevista(){var m=cur(),txt=g('pv-nota-pessoal')?g('pv-nota-pessoal').value.trim():'';notas=notas.filter(function(n){return !(n.tipo==='prevista'&&n.mes===m);});if(txt)notas.push({id:uid(),tipo:'prevista',mes:m,texto:txt,data:today()});saveAll();}

// ===== TEMPLATE =====
function renderTpl(){var el=g('tpl-list');if(!el)return;if(!templates.length){el.innerHTML='<div style="font-size:13px;color:var(--t3);">Sem rubricas.</div>';return;}el.innerHTML=templates.map(function(t){return '<div class="tpl-item" style="background:'+(t.ativo!==false?'var(--surface)':'var(--surface2)')+';">'+
  '<input type="checkbox" '+(t.ativo!==false?'checked':'')+' onchange="tplChk(\''+t.id+'\',this.checked)" style="width:16px;flex-shrink:0;cursor:pointer;accent-color:var(--accent);">'+
  catDot(t.cat,10)+
  '<span style="flex:1;font-size:13px;'+(t.ativo===false?'color:var(--t3);':'')+'">'+t.nome+'</span>'+
  '<input type="number" value="'+t.valor+'" onchange="tplVal(\''+t.id+'\',this.value)" style="width:72px;background:transparent;border:none;border-bottom:1px dashed var(--border2);border-radius:0;padding:2px 4px;font-size:13px;text-align:right;color:var(--t);"> €'+
  '<button class="btn bd bxs" onclick="delTpl(\''+t.id+'\')">×</button></div>';}).join('');}
function tplChk(id,v){var t=templates.find(function(x){return x.id===id;});if(t)t.ativo=v;renderTpl();saveAll();}
function tplVal(id,v){var t=templates.find(function(x){return x.id===id;});if(t)t.valor=parseFloat(v)||0;saveAll();}
function delTpl(id){templates=templates.filter(function(t){return t.id!==id;});saveAll();renderTpl();}
function addTpl(){var n=g('tpl-n').value.trim(),v=parseFloat(g('tpl-v').value)||0,c=g('tpl-c').value;if(!n)return alert('Escreve um nome.');templates.push({id:uid(),nome:n,valor:v,cat:c,ativo:true});saveAll();renderTpl();closeM('m-addtpl');g('tpl-n').value='';g('tpl-v').value='';}
function aplicarTpl(){var m=g('d-month').value,ativos=templates.filter(function(t){return t.ativo!==false&&t.valor>0;});if(!ativos.length){alert('Nenhuma rubrica activa.');return;}var n=0;ativos.forEach(function(t){if(!despesas.some(function(d){return d.tplId===t.id&&mk(d.data)===m;})){despesas.push({id:uid(),tplId:t.id,desc:t.nome,valor:t.valor,cat:t.cat,data:m+'-05',tipo:'fixa',pago:false});n++;}});saveAll();renderDesp();if(n===0)alert('Já aplicadas.');else alert(n+' despesas fixas adicionadas!');}

// ===== DESPESAS =====
function addDesp(){var desc=g('da-d').value.trim(),val=parseFloat(g('da-v').value),cat=g('da-c').value,data=g('da-dt').value||today();if(!desc||!val||val<=0){alert('Preenche descrição e valor.');return;}despesas.push({id:uid(),desc:desc,valor:val,cat:cat,data:data,tipo:'pontual',pago:false});g('da-d').value='';g('da-v').value='';saveAll();reRender();}
function delDesp(id){despesas=despesas.filter(function(d){return d.id!==id;});saveAll();reRender();}
function togglePago(id){var d=despesas.find(function(x){return x.id===id;});if(d){d.pago=!d.pago;saveAll();renderDesp();renderResumo();}}
function renderDesp(){
  renderTpl();
  var m=g('d-month').value,f=despesas.filter(function(d){return mk(d.data)===m;}).sort(function(a,b){return b.data.localeCompare(a.data);});
  var total=f.reduce(function(s,d){return s+d.valor;},0),pago=f.filter(function(d){return d.pago;}).reduce(function(s,d){return s+d.valor;},0);
  g('d-total-pill').textContent='Total: '+fmt(total)+' · Pago: '+fmt(pago);
  var el=g('lst-despesas');if(!f.length){el.innerHTML='<div style="font-size:13px;color:var(--t3);padding:.4rem 0;">Sem despesas.</div>';return;}
  var byCat={};f.forEach(function(d){byCat[d.cat]=byCat[d.cat]||[];byCat[d.cat].push(d);});
  var html='';
  Object.entries(byCat).forEach(function(e){
    var cat=e[0],items=e[1],ct=items.reduce(function(s,d){return s+d.valor;},0);
    html+='<div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--t3);padding:9px 0 5px;border-top:.5px solid var(--border);margin-top:3px;">'+catDot(cat,9)+'<span>'+cat+'</span><span style="margin-left:auto;font-weight:400;">'+fmt(ct)+'</span></div>';
    html+=items.map(function(d){return '<div class="li" style="'+(d.pago?'opacity:.55;':'')+'"><div class="ll"><div class="ln" style="'+(d.pago?'text-decoration:line-through;':'')+'">'+d.desc+'</div><div class="ls">'+d.data+(d.tipo==='fixa'?' · fixa':' · pontual')+'</div></div><div class="lr"><span class="am ao">-'+fmt(d.valor)+'</span><button class="btn-check '+(d.pago?'checked':'')+'" onclick="togglePago(\''+d.id+'\')">'+(d.pago?'✓ Pago':'Pagar')+'</button><button class="btn bd bxs" onclick="delDesp(\''+d.id+'\')">×</button></div></div>';}).join('');
  });
  el.innerHTML=html;
}

// ===== DIÁRIO =====
function addDiar(){var desc=g('dr-d').value.trim(),val=parseFloat(g('dr-v').value),cat=g('dr-c').value,data=g('dr-dt').value||today();if(!desc||!val||val<=0){alert('Preenche descrição e valor.');return;}diario.push({id:uid(),desc:desc,valor:val,cat:cat,data:data});g('dr-d').value='';g('dr-v').value='';saveAll();reRender();}
function delDiar(id){diario=diario.filter(function(d){return d.id!==id;});saveAll();reRender();}
function renderDiar(){
  var m=cur(),f=diario.filter(function(d){return mk(d.data)===m;}).sort(function(a,b){return b.data.localeCompare(a.data);});
  var total=f.reduce(function(s,d){return s+d.valor;},0);
  g('dr-total-pill').textContent='Este mês: '+fmt(total);
  var ci=cycleInfo(),ws=getWeekSpend();
  var tIn=entradas.filter(function(e){return e.tipo!=='prevista'&&mk(e.data)===m;}).reduce(function(s,e){return s+e.valor;},0);
  var tD=despesas.filter(function(d){return mk(d.data)===m;}).reduce(function(s,d){return s+d.valor;},0);
  var saldo=tIn-tD-total;
  var maxDiario=ci.daysLeft>0?Math.max(0,Math.floor(saldo/ci.daysLeft)):0;
  var alts='';
  if(ci.daysLeft<=5&&ci.daysLeft>0)alts+='<div class="alert alr"><strong>Faltam '+ci.daysLeft+' dias</strong> para o dia 5 — fim do ciclo! Sem gastos desnecessários.</div>';
  else if(ci.daysLeft<=10)alts+='<div class="alert ala"><strong>Faltam '+ci.daysLeft+' dias</strong> para o dia 5. Começa a controlar.</div>';
  if(maxDiario>0)alts+='<div class="alert '+(saldo>0?'alg':'alr')+'">'+(saldo>0?'Podes gastar até <strong>'+fmt(maxDiario)+'</strong> por dia':'Atenção: saldo negativo!')+' para chegares ao dia 5 com saldo positivo.</div>';
  if(ws>maxDiario*7&&maxDiario>0)alts+='<div class="alert alr">Esta semana já gastaste '+fmt(ws)+' — acima do ritmo recomendado!</div>';
  g('diar-alerts').innerHTML=alts;
  var el=g('lst-diario');if(!f.length){el.innerHTML='<div style="font-size:13px;color:var(--t3);padding:.4rem 0;">Sem registos.</div>';return;}
  var byDate={};f.forEach(function(d){byDate[d.data]=byDate[d.data]||[];byDate[d.data].push(d);});
  var html='';
  Object.entries(byDate).sort(function(a,b){return b[0].localeCompare(a[0]);}).forEach(function(e){
    var date=e[0],items=e[1],dt=items.reduce(function(s,d){return s+d.valor;},0);
    var over=maxDiario>0&&dt>maxDiario;
    html+='<div class="day-lbl" style="'+(over?'color:var(--red-t);':'')+'">'+date+'<span>'+fmt(dt)+(over?' ⚠':'')+'</span></div>';
    html+=items.map(function(d){return '<div class="li"><div class="ll"><div class="ln">'+d.desc+'</div><div class="ls" style="display:flex;align-items:center;gap:4px;">'+catDot(d.cat,8)+' '+d.cat+'</div></div><div class="lr"><span class="am ao">-'+fmt(d.valor)+'</span><button class="btn bd bxs" onclick="delDiar(\''+d.id+'\')">×</button></div></div>';}).join('');
  });
  el.innerHTML=html;
}

// ===== OBJETIVOS =====
function addObj(){var nome=g('o-nome').value.trim(),meta=parseFloat(g('o-meta').value)||0;if(!nome||!meta)return alert('Preenche nome e meta.');objetivos.push({id:uid(),nome:nome,meta:meta,prazo:g('o-prazo').value,atual:parseFloat(g('o-atual').value)||0,mensal:parseFloat(g('o-mensal').value)||0,notas:g('o-notas').value.trim(),historico:[]});['o-nome','o-meta','o-prazo','o-atual','o-mensal','o-notas'].forEach(function(id){g(id).value='';});saveAll();renderObjs();}
function delObj(id){objetivos=objetivos.filter(function(o){return o.id!==id;});saveAll();renderObjs();}
function openObjEdit(id){var obj=objetivos.find(function(o){return o.id===id;});if(!obj)return;g('me-title').textContent=obj.nome;g('me-body').innerHTML='<div class="fr"><div class="fg"><label>Poupado (€)</label><input id="oe-a" type="number" value="'+(obj.atual||0)+'" step="0.01"></div></div><div class="fr"><div class="fg"><label>Meta (€)</label><input id="oe-m" type="number" value="'+obj.meta+'"></div><div class="fg"><label>Mensal (€)</label><input id="oe-mn" type="number" value="'+(obj.mensal||0)+'"></div></div><div class="fr"><div class="fg"><label>Prazo</label><input id="oe-p" type="date" value="'+(obj.prazo||'')+'"></div></div><div class="fr"><div class="fg"><label>Notas</label><input id="oe-n" value="'+(obj.notas||'')+'"></div></div><button class="btn ba" style="width:100%;margin-top:.4rem;" onclick="saveObjEdit(\''+id+'\')">Guardar</button><hr><p style="font-size:13px;font-weight:500;margin-bottom:.5rem;">Contribuição pontual</p><div style="display:flex;gap:6px;align-items:center;"><input id="oe-c" type="number" placeholder="ex: 50" style="flex:1;"><select id="oe-ct" style="width:auto;"><option value="add">+ Adicionar</option><option value="sub">− Retirar</option></select><button class="btn ba bsm" onclick="addContrib(\''+id+'\')">Registar</button></div>'+(obj.historico&&obj.historico.length?'<div style="margin-top:.7rem;font-size:12px;color:var(--t2);">Recentes: '+obj.historico.slice(-4).map(function(h){return h.data+': '+(h.delta>0?'+':'')+fmt(h.delta);}).join(' · ')+'</div>':'');openM('m-obj-edit');}
function saveObjEdit(id){var obj=objetivos.find(function(o){return o.id===id;});if(!obj)return;obj.atual=parseFloat(g('oe-a').value)||0;obj.meta=parseFloat(g('oe-m').value)||obj.meta;obj.mensal=parseFloat(g('oe-mn').value)||0;obj.prazo=g('oe-p').value||obj.prazo;obj.notas=g('oe-n').value||obj.notas;saveAll();renderObjs();closeM('m-obj-edit');}
function addContrib(id){var obj=objetivos.find(function(o){return o.id===id;});if(!obj)return;var val=parseFloat(g('oe-c').value)||0,tipo=g('oe-ct').value,delta=tipo==='add'?val:-val;obj.atual=Math.max(0,(obj.atual||0)+delta);obj.historico=obj.historico||[];obj.historico.push({data:today(),delta:delta});saveAll();openObjEdit(id);renderObjs();}
function renderObjs(){var el=g('lst-objetivos');if(!el)return;if(!objetivos.length){el.innerHTML='<div class="card"><div style="font-size:13px;color:var(--t3);">Sem objetivos.</div></div>';return;}el.innerHTML=objetivos.map(function(obj){var pct=obj.meta>0?Math.min(Math.round(((obj.atual||0)/obj.meta)*100),100):0,rest=Math.max(obj.meta-(obj.atual||0),0),mr=obj.prazo?Math.max(0,Math.round((new Date(obj.prazo)-new Date())/(1000*60*60*24*30))):null,mn=mr&&mr>0?Math.ceil(rest/mr):null,ok=obj.mensal&&mn&&obj.mensal>=mn;return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--rlg);padding:1.1rem 1.3rem;margin-bottom:9px;"><div style="display:flex;justify-content:space-between;margin-bottom:5px;"><div style="font-size:15px;font-weight:500;">'+obj.nome+'</div><span class="pill '+(pct>=100?'pg':pct>=50?'pb':'pa')+'">'+pct+'%</span></div><div style="font-size:12px;color:var(--t2);margin-bottom:7px;">'+fmt(obj.atual||0)+' de '+fmt(obj.meta)+' · Faltam '+fmt(rest)+(obj.prazo?' · '+obj.prazo:'')+'</div>'+(mr!==null?'<div class="alert '+(ok?'alg':'ala')+'" style="margin-bottom:6px;font-size:12px;padding:6px 10px;">'+(ok?'Poupança suficiente.':'Precisas de '+fmt(mn||0)+'/mês.')+'</div>':'')+'<div class="pbar" style="margin-bottom:9px;"><div class="pfill" style="width:'+pct+'%;background:'+(pct>=100?'var(--green)':pct>=50?'#1A3F6F':'var(--accent)')+'"></div></div><div style="display:flex;gap:6px;flex-wrap:wrap;"><button class="btn bg bsm" onclick="openObjEdit(\''+obj.id+'\')">Actualizar</button><button class="btn bd bsm" onclick="delObj(\''+obj.id+'\')">Eliminar</button></div></div>';}).join('');}

// ===== DESAFIOS =====
var DS=[{nivel:'Iniciante',nome:'Registo diário 7 dias',desc:'7 dias a registar TODOS os gastos. Só para ganhar consciência.',meta:0,dur:1,passos:['Dia 1: Regista o primeiro gasto','Dia 2: Regista tudo incluindo cafés','Dia 3: Compara com o dia anterior','Dia 4: Tenta prever quanto vais gastar','Dia 5: Identifica onde gastas mais','Dia 6: Reduz esse gasto em 20%','Dia 7: Balanço total da semana']},{nivel:'Iniciante',nome:'Semana sem compras impulsivas',desc:'7 dias sem comprar nada fora da lista.',meta:0,dur:1,passos:['Faz a lista antes de sair','Só compras o que está na lista','Anota o que quiseste comprar mas não compraste','Soma o que poupaste ao fim de 7 dias']},{nivel:'Iniciante',nome:'Poupar 50€ este mês',desc:'O primeiro passo para o hábito de poupar.',meta:50,dur:4,passos:['Semana 1: Identifica onde cortar 12,50€','Semana 2: Transfere 12,50€ para poupança','Semana 3: Repete','Semana 4: Completa os 50€']},{nivel:'Intermédio',nome:'30 dias sem compras supérfluas',desc:'Um mês sem roupa, gadgets ou decoração.',meta:0,dur:4,passos:['Semana 1: Define regras claras do que é supérfluo','Semana 2: Quando quiseres comprar, espera 48h','Semana 3: Substitui shopping por actividades gratuitas','Semana 4: Soma o que poupaste']},{nivel:'Intermédio',nome:'Reserva de emergência 500€',desc:'500€ intocáveis para emergências reais.',meta:500,dur:8,passos:['Semana 1-2: Identifica onde cortar despesas','Semana 3-4: Poupa os primeiros 125€','Semana 5-6: Mais 125€ (total: 250€)','Semana 7-8: Conclui os 500€ — NÃO TOQUES']},{nivel:'Avançado',nome:'Desafio 52 semanas',desc:'Semana 1: 1€... semana 52: 52€. Total: 1.378€.',meta:1378,dur:52,passos:['Semanas 1-10: 1€ a 10€/semana','Semanas 11-20: 11€ a 20€/semana','Semanas 21-30: 21€ a 30€/semana','Semanas 31-40: 31€ a 40€/semana','Semanas 41-52: 41€ a 52€/semana']},{nivel:'Avançado',nome:'Organiza as finanças do zero',desc:'Plano completo em 4 semanas.',meta:0,dur:4,passos:['Semana 1: Lista rendimentos, despesas e dívidas. Calcula o saldo real.','Semana 2: Cria orçamento com a regra 50/30/20.','Semana 3: Abre conta poupança separada. Transferência automática.','Semana 4: Define 3 objetivos com valores e prazos concretos.']}];
function renderDesafiosSugeridos(){var el=g('desafios-sugeridos');if(!el)return;var niveis=['Iniciante','Intermédio','Avançado'],corN={Iniciante:'var(--green)',Intermédio:'var(--amber)',Avançado:'var(--red)'},html='';niveis.forEach(function(n){html+='<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:'+corN[n]+';padding:8px 0 5px;border-bottom:.5px solid var(--border);margin-bottom:6px;">'+n+'</div>';DS.filter(function(d){return d.nivel===n;}).forEach(function(ds,i){html+='<div class="desafio-sugerido"><div style="flex:1;"><div style="font-size:13px;font-weight:500;">'+ds.nome+'</div><div style="font-size:12px;color:var(--t2);">'+ds.desc+'</div></div><button class="btn ba bsm" onclick="adoptDesafio('+DS.indexOf(ds)+')" style="flex-shrink:0;">Adoptar</button></div>';});});el.innerHTML=html;}
function adoptDesafio(i){var ds=DS[i];desafios.push({id:uid(),nome:ds.nome,desc:ds.desc,meta:ds.meta,dur:ds.dur,nivel:ds.nivel,inicio:today(),passos:ds.passos,checks:[],progresso:0,concluido:false});saveAll();renderDesafios();go('desafios');}
function addDesafio(){var nome=g('ch-nome').value.trim();if(!nome)return alert('Preenche o nome.');desafios.push({id:uid(),nome:nome,desc:g('ch-desc').value.trim(),meta:parseFloat(g('ch-meta').value)||0,dur:parseInt(g('ch-dur').value)||4,nivel:'Personalizado',inicio:g('ch-ini').value||today(),passos:[],checks:[],progresso:0,concluido:false});['ch-nome','ch-meta','ch-dur','ch-ini','ch-desc'].forEach(function(id){g(id).value='';});saveAll();renderDesafios();}
function delDesafio(id){desafios=desafios.filter(function(d){return d.id!==id;});saveAll();renderDesafios();}
function toggleDesafioCheck(did,si){var d=desafios.find(function(x){return x.id===did;});if(!d)return;d.checks=d.checks||[];var k=''+si;if(d.checks.includes(k))d.checks=d.checks.filter(function(c){return c!==k;});else d.checks.push(k);d.concluido=d.passos.length>0&&d.checks.length>=d.passos.length;saveAll();renderDesafios();}
function updateDesafioVal(id,v){var d=desafios.find(function(x){return x.id===id;});if(!d)return;d.progresso=parseFloat(v)||0;d.concluido=d.meta>0&&d.progresso>=d.meta;saveAll();renderDesafios();}
function renderDesafios(){var el=g('lst-desafios');if(!el)return;if(!desafios.length){el.innerHTML='<div class="card"><div style="font-size:13px;color:var(--t3);">Sem desafios. Adopta um sugerido!</div></div>';return;}var corN={Iniciante:'var(--green)',Intermédio:'var(--amber)',Avançado:'var(--red)',Personalizado:'var(--blue)'};el.innerHTML=desafios.map(function(d){var pct=d.passos&&d.passos.length>0?Math.round(((d.checks||[]).length/d.passos.length)*100):d.meta>0?Math.min(Math.round((d.progresso/d.meta)*100),100):d.concluido?100:0,cor=corN[d.nivel]||'var(--accent)';var pH=d.passos&&d.passos.length?'<div style="margin:10px 0;">'+d.passos.map(function(p,i){var ch=(d.checks||[]).includes(''+i);return '<div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:.5px solid var(--border);cursor:pointer;" onclick="toggleDesafioCheck(\''+d.id+'\','+i+')">'+'<div style="width:18px;height:18px;border-radius:4px;border:2px solid '+(ch?'var(--green)':'var(--border2)')+';background:'+(ch?'var(--green)':'transparent')+';flex-shrink:0;display:flex;align-items:center;justify-content:center;">'+(ch?'<span style="color:#fff;font-size:11px;">✓</span>':'')+'</div><span style="font-size:13px;'+(ch?'text-decoration:line-through;color:var(--t3);':'')+'">'+p+'</span></div>';}).join('')+'</div>':'';var vH=d.meta>0?'<div style="display:flex;gap:6px;align-items:center;margin:8px 0;"><input type="number" value="'+(d.progresso||'')+'" onchange="updateDesafioVal(\''+d.id+'\',this.value)" style="flex:1;font-size:13px;"><span style="font-size:13px;color:var(--t3);">/ '+fmt(d.meta)+'</span></div>':'';return '<div class="desafio-card" style="'+(d.concluido?'border-color:var(--green);':'border-left:3px solid '+cor+';')+'">'+'<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><div><span style="font-size:10px;font-weight:600;text-transform:uppercase;color:'+cor+';">'+(d.nivel||'Personalizado')+'</span><div style="font-size:15px;font-weight:500;">'+(d.nome+(d.concluido?' ✓':''))+'</div></div><span class="pill '+(d.concluido?'pg':'pa')+'">'+pct+'%</span></div>'+(d.desc?'<div style="font-size:12px;color:var(--t2);margin-bottom:6px;">'+d.desc+'</div>':'')+'<div style="font-size:12px;color:var(--t3);margin-bottom:7px;">Início: '+d.inicio+' · '+d.dur+' sem.</div><div class="pbar" style="margin-bottom:8px;"><div class="pfill" style="width:'+pct+'%;background:'+(d.concluido?'var(--green)':cor)+';"></div></div>'+pH+vH+'<button class="btn bd bxs" onclick="delDesafio(\''+d.id+'\')" style="margin-top:6px;">Eliminar</button></div>';}).join('');}

// ===== NOTAS =====
function saveNotasArea(){var txt=g('notas-area')?g('notas-area').value:'';notas=notas.filter(function(n){return n.tipo==='prevista';});txt.split('\n').filter(function(l){return l.trim();}).forEach(function(l){notas.push({id:uid(),texto:l.trim(),data:today(),feita:false,tipo:'mes'});});saveAll();renderResumo();alert('Notas guardadas!');}
function renderNotas(){var el=g('r-notas-wrap');if(!el)return;var mn=notas.filter(function(n){return n.tipo==='mes'||!n.tipo;});var txt=mn.filter(function(n){return !n.feita;}).map(function(n){return n.texto;}).join('\n');el.innerHTML='<textarea id="notas-area" placeholder="Escreve aqui notas e lembretes para o próximo mês...\nEx: Não esquecer o seguro do carro\nEx: Mês que vem vai ser mais apertado" style="width:100%;min-height:130px;font-size:13px;margin-bottom:.7rem;">'+txt+'</textarea><button class="btn ba bsm" onclick="saveNotasArea()">Guardar notas</button>';}

// ===== DESEJOS =====
function addWish(){var nome=g('w-nome').value.trim(),preco=parseFloat(g('w-preco').value)||0;if(!nome||!preco)return alert('Preenche nome e preço.');desejos.push({id:uid(),nome:nome,preco:preco,prio:g('w-prio').value,notas:g('w-notas').value.trim(),comprado:false});g('w-nome').value='';g('w-preco').value='';g('w-notas').value='';saveAll();renderDesejos();analisarDesejos();}
function delWish(id){desejos=desejos.filter(function(d){return d.id!==id;});saveAll();renderDesejos();analisarDesejos();}
function markWish(id){var w=desejos.find(function(d){return d.id===id;});if(w)w.comprado=!w.comprado;saveAll();renderDesejos();}
function renderDesejos(){var el=g('lst-desejos');if(!el)return;if(!desejos.length){el.innerHTML='<div class="card"><div style="font-size:13px;color:var(--t3);">Sem itens na lista.</div></div>';return;}var order={alta:0,media:1,baixa:2};el.innerHTML=[...desejos].sort(function(a,b){return order[a.prio]-order[b.prio];}).map(function(w){return '<div class="wish-item" style="'+(w.comprado?'opacity:.5;':'')+'"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px;"><div><div style="font-size:15px;font-weight:500;'+(w.comprado?'text-decoration:line-through;':'')+'">'+w.nome+'</div><div style="font-size:12px;color:var(--t3);">'+(w.prio==='alta'?'Alta prioridade':w.prio==='media'?'Média':'Baixa')+(w.notas?' · '+w.notas:'')+'</div></div><div style="font-size:18px;font-weight:400;color:var(--accent);">'+fmt(w.preco)+'</div></div><div style="display:flex;gap:6px;"><button class="btn bg bsm" onclick="markWish(\''+w.id+'\')">'+(w.comprado?'Desfazer':'✓ Comprado')+'</button><button class="btn bd bsm" onclick="delWish(\''+w.id+'\')">Remover</button></div></div>';}).join('');}
function analisarDesejos(){var el=g('wishes-ai');if(!el)return;var pend=desejos.filter(function(d){return !d.comprado;});if(!pend.length){el.innerHTML='';return;}var m=cur(),ci=cycleInfo();var tIn=entradas.filter(function(e){return e.tipo!=='prevista'&&mk(e.data)===m;}).reduce(function(s,e){return s+e.valor;},0);var tD=despesas.filter(function(d){return mk(d.data)===m;}).reduce(function(s,d){return s+d.valor;},0);var tDi=diario.filter(function(d){return mk(d.data)===m;}).reduce(function(s,d){return s+d.valor;},0);var saldo=tIn-tD-tDi;var order={alta:0,media:1,baixa:2};var sorted=pend.sort(function(a,b){return order[a.prio]-order[b.prio];});
// Cautious logic: only suggest if comfortable
if(ci.daysLeft<=10){el.innerHTML='<div class="alert ala" style="margin-bottom:.9rem;">Faltam apenas '+ci.daysLeft+' dias para o dia 5. Não é altura de compras — foca em chegar ao fim do ciclo com saldo positivo.</div>';return;}
var gastoDiario=tDi>0?(tD+tDi)/Math.max(ci.totalDays-ci.daysLeft,1):0;var necessarioAteD5=gastoDiario*ci.daysLeft*1.2;var disponivel=saldo-necessarioAteD5;
if(disponivel<=0){el.innerHTML='<div class="alert ala" style="margin-bottom:.9rem;">Com o ritmo actual de gastos, precisas de guardar o máximo para chegar ao dia 5 com saldo. Adia as compras.</div>';return;}
var melhor=sorted.find(function(w){return w.preco<=disponivel*0.5;});
if(melhor)el.innerHTML='<div class="ai-box" style="margin-bottom:.9rem;"><div class="ai-title">Se quiseres comprar algo</div><div class="ai-text">Com '+fmt(disponivel)+' de margem segura, podes considerar <strong>'+melhor.nome+'</strong> ('+fmt(melhor.preco)+') — é a prioridade mais alta que cabe. Os restantes itens ficam para um mês com mais folga.</div></div>';
else el.innerHTML='<div class="alert ala" style="margin-bottom:.9rem;">Nenhum item da lista cabe na margem segura disponível ('+fmt(disponivel)+'). Continua a poupar!</div>';}

// ===== DICAS =====
var DICAS=[{n:'Básico',tag:'Primeiro passo',cor:'#1E6348',t:'Como funciona o dinheiro',c:'O dinheiro tem três destinos: gastas-o, poupas-o ou investes-o. O segredo das finanças pessoais não é ganhar mais — é controlar melhor o que já entra. Começa por saber exactamente quanto recebes e quanto gastas em cada mês.'},{n:'Básico',tag:'Orçamento',cor:'#1B4F72',t:'A regra 50/30/20',c:'50% necessidades (renda, comida, transportes), 30% desejos (lazer, restaurantes, roupa), 20% poupança. Se o teu 50% está acima de 60%, as despesas fixas estão pesadas demais para o teu rendimento.'},{n:'Básico',tag:'Poupança',cor:'#7A4A0A',t:'Paga-te primeiro',c:'Quando o salário chega, antes de pagar qualquer conta, transfere logo um valor fixo para poupança. Mesmo que sejam 20€. Quem espera que sobre para poupar nunca poupa.'},{n:'Básico',tag:'Emergência',cor:'#8B1F1F',t:'A reserva de emergência',c:'3 a 6 meses de despesas fixas numa conta separada, intocável. Esta reserva separa uma avaria do carro de uma crise financeira.'},{n:'Básico',tag:'Gastos diários',cor:'#6B4226',t:'O perigo dos gastos invisíveis',c:'Um café por dia são 438€ por ano. Regista tudo no Diário durante um mês. Os números vão surpreender-te.'},{n:'Básico',tag:'Dívidas',cor:'#3D2580',t:'Como sair das dívidas',c:'Lista do menor para o maior valor. Paga o mínimo em todas e mete tudo na mais pequena. Quando a liquidas, usa esse valor na próxima.'},{n:'Intermédio',tag:'Ciclo financeiro',cor:'#8B1F1F',t:'O segredo para não ficar a zero',c:'O grande problema não é o início do mês — é a segunda semana. As despesas fixas comem tudo e de repente não há margem. A solução: calcula quanto podes gastar POR DIA e usa o alerta diário desta app. O objectivo é chegar ao dia 5 com pelo menos 50-100€ de almofada.'},{n:'Intermédio',tag:'Compras',cor:'#5C3D1E',t:'A regra das 72 horas',c:'Quando quiseres comprar algo não planeado acima de 30€, espera 72 horas. Esta regra elimina a maioria das compras por impulso.'},{n:'Intermédio',tag:'Alimentação',cor:'#1E6348',t:'Planear refeições poupa muito',c:'Planeia refeições de 5-7 dias e faz lista. Compra só o que está na lista. Reduz desperdício em 40% e baixa a conta significativamente.'},{n:'Intermédio',tag:'Subscrições',cor:'#4A3A6B',t:'A armadilha das subscrições',c:'Lista todas as subscrições. Cancela as que não usaste 3x na última semana. A maioria das pessoas descobre 30-80€/mês em subscrições esquecidas.'},{n:'Intermédio',tag:'Negociação',cor:'#0E5E5E',t:'Podes negociar as tuas contas',c:'Ginásio, seguro, internet, renda — tudo é negociável. Liga e diz que estás a pensar cancelar. Na maioria dos casos consegues um desconto imediato.'},{n:'Avançado',tag:'Investimento',cor:'#1A3F6F',t:'Quando começar a investir',c:'Só investe quando: tens reserva de emergência, não tens dívidas caras, e poupas regularmente. Em Portugal, os PPR têm vantagens fiscais. ETFs são para médio/longo prazo.'},{n:'Avançado',tag:'Impostos',cor:'#4A3A6B',t:'Deduzir tudo no IRS',c:'Saúde, educação, habitação — tudo conta. Guarda recibos e verifica que estão no e-fatura antes de declarares.'},{n:'Avançado',tag:'Automação',cor:'#1E6348',t:'Automatiza as finanças',c:'No dia do salário: transferências automáticas para poupança e objetivos. O que não vês não gastas. A automação remove a tentação.'}];
function renderDicas(){var el=g('dicas-content');if(!el)return;var niv=['Básico','Intermédio','Avançado'],cor={Básico:'var(--green)',Intermédio:'var(--amber)',Avançado:'var(--red)'},html='';niv.forEach(function(n){html+='<div style="font-size:13px;font-weight:600;color:'+cor[n]+';margin:1.2rem 0 .5rem;text-transform:uppercase;letter-spacing:.06em;">— '+n+' —</div>';DICAS.filter(function(d){return d.n===n;}).forEach(function(d){html+='<div class="dica-card"><span class="dica-tag" style="background:'+d.cor+'20;color:'+d.cor+';">'+d.tag+'</span><div class="dica-title">'+d.t+'</div><div class="dica-body">'+d.c+'</div></div>';});});el.innerHTML=html;}

// ===== RESUMO =====
function renderResumo(){
  var m=g('r-month')?g('r-month').value:cur(),isCur=m===cur();
  var entIn=entradas.filter(function(e){return e.tipo!=='prevista'&&mk(e.data)===m;}),entPrev=entradas.filter(function(e){return e.tipo==='prevista'&&mk(e.data)===m;});
  var despIn=despesas.filter(function(d){return mk(d.data)===m;}),diIn=diario.filter(function(d){return mk(d.data)===m;});
  var tIn=entIn.reduce(function(s,e){return s+e.valor;},0),tPrev=entPrev.reduce(function(s,e){return s+e.valor;},0);
  var tD=despIn.reduce(function(s,d){return s+d.valor;},0),tDi=diIn.reduce(function(s,d){return s+d.valor;},0);
  var tOut=tD+tDi,saldo=tIn-tOut,taxa=tIn>0?Math.round((Math.max(saldo,0)/tIn)*100):0;

  // COUNTDOWN BANNER com alerta inteligente
  if(isCur&&g('r-countdown')){
    var ci=cycleInfo(),ws=getWeekSpend();
    var maxDiario=ci.daysLeft>0?Math.max(0,Math.floor(saldo/ci.daysLeft)):0;
    var wc=ci.daysLeft<=5?'var(--red)':ci.daysLeft<=10?'var(--amber)':'var(--t)';
    var alerta='';
    if(saldo<0)alerta='⚠ CONTA EM VERMELHO — corta gastos já!';
    else if(ci.daysLeft<=5)alerta='Fim do ciclo! Máximo '+fmt(maxDiario)+'/dia.';
    else if(ci.daysLeft<=10)alerta='Controla! Máx. '+fmt(maxDiario)+'/dia para chegar ao dia 5.';
    else alerta='Podes gastar até '+fmt(maxDiario)+'/dia e chegar ao dia 5 com saldo.';
    g('r-countdown').innerHTML='<div class="countdown" style="background:'+wc+';">'
      +'<div><div class="cd-big">'+ci.daysLeft+' dias para o dia 5</div><div style="font-size:12px;opacity:.7;">'+alerta+'</div></div>'
      +'<div style="text-align:right;"><div style="font-size:13px;font-weight:500;">Saldo: '+fmt(saldo)+'</div>'
      +'<div style="font-size:12px;opacity:.7;">Esta semana: '+fmt(ws)+'</div></div></div>';
  } else if(g('r-countdown')&&!isCur)g('r-countdown').innerHTML='';

  // ALERTS
  var alts='';
  if(tIn===0)alts+='<div class="alert ala">Sem entradas para '+mlbl(m)+'. Regista em Entradas.</div>';
  if(saldo<0&&tIn>0)alts+='<div class="alert alr">Conta em <strong>VERMELHO</strong>: gastas mais '+fmt(Math.abs(saldo))+' do que recebes!</div>';
  else if(taxa<10&&tIn>0)alts+='<div class="alert ala">Taxa de poupança muito baixa ('+taxa+'%). Revê as despesas.</div>';
  else if(taxa>=20&&tIn>0)alts+='<div class="alert alg">Óptimo! '+taxa+'% de poupança.</div>';
  if(tPrev>0)alts+='<div class="alert alp">'+fmt(tPrev)+' em entradas previstas. Ver sugestões em Entradas.</div>';
  var dpp=despIn.filter(function(d){return !d.pago;});
  if(dpp.length>0){var vpp=dpp.reduce(function(s,d){return s+d.valor;},0);alts+='<div class="alert ala">'+dpp.length+' despesa(s) por pagar: <strong>'+fmt(vpp)+'</strong>.</div>';}
  if(g('r-alerts'))g('r-alerts').innerHTML=alts;

  if(g('r-metrics'))g('r-metrics').innerHTML='<div class="metric"><div class="ml">Entradas reais</div><div class="mv g">'+fmt(tIn)+'</div></div><div class="metric"><div class="ml">Despesas fixas</div><div class="mv r">'+fmt(tD)+'</div></div><div class="metric"><div class="ml">Diário / extra</div><div class="mv r">'+fmt(tDi)+'</div></div><div class="metric"><div class="ml">Saldo</div><div class="mv '+(saldo>=0?'g':'r')+'">'+fmt(saldo)+'</div></div><div class="metric"><div class="ml">Taxa poupança</div><div class="mv '+(taxa>=20?'g':taxa>=10?'a':'r')+'">'+taxa+'%</div></div>'+(tPrev>0?'<div class="metric"><div class="ml">Previstas</div><div class="mv" style="color:var(--purple);">'+fmt(tPrev)+'</div></div>':'');

  var pD=tIn>0?Math.min(Math.round((tD/tIn)*100),100):0,pDi=tIn>0?Math.min(Math.round((tDi/tIn)*100),100):0,pT=pD+pDi;
  if(g('r-spendbar'))g('r-spendbar').innerHTML='<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;"><span>Gasto: <strong>'+fmt(tOut)+'</strong></span><span style="color:'+(pT>90?'var(--red)':'var(--t2)')+';">'+pT+'%</span></div><div class="pbar" style="height:13px;"><div style="display:flex;height:100%;"><div style="width:'+pD+'%;background:var(--red);opacity:.75;"></div><div style="width:'+pDi+'%;background:var(--amber);opacity:.85;"></div></div></div><div style="display:flex;gap:1rem;margin-top:5px;font-size:12px;color:var(--t2);">'+catDot('Habitação',9)+' Fixas '+pD+'% · Diário '+pDi+'%'+(saldo>=0?' · <span style="color:var(--green);">Sobra '+fmt(saldo)+'</span>':' · <span style="color:var(--red);">Défice '+fmt(Math.abs(saldo))+'</span>')+'</div>';

  var eHtml='',sal=entIn.filter(function(e){return e.tipo==='salario';}),caf=entIn.filter(function(e){return e.tipo==='caf';});
  if(sal.length)eHtml+='<div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--green-t);padding:5px 0 3px;">Salário Luis</div>'+sal.map(function(e){return '<div class="li"><div class="ll"><div class="ln">'+e.desc+'</div><div class="ls">'+e.data+'</div></div><div class="lr"><span class="am ai">+'+fmt(e.valor)+'</span></div></div>';}).join('');
  if(caf.length)eHtml+='<div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--blue-t);padding:5px 0 3px;">CAF</div>'+caf.map(function(e){return '<div class="li"><div class="ll"><div class="ln">'+e.desc+'</div><div class="ls">'+e.data+'</div></div><div class="lr"><span class="am ai">+'+fmt(e.valor)+'</span></div></div>';}).join('');
  if(entPrev.length)eHtml+='<div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--purple-t);padding:5px 0 3px;">Previstas (não contam no saldo)</div>'+entPrev.map(function(e){return '<div class="li"><div class="ll"><div class="ln">'+e.desc+'</div><div class="ls">'+(e.nota||e.data)+'</div></div><div class="lr"><span class="am apv">~'+fmt(e.valor)+'</span></div></div>';}).join('');
  if(g('r-entradas'))g('r-entradas').innerHTML=eHtml||'<div style="font-size:13px;color:var(--t3);">Sem entradas.</div>';

  var byCat={};[...despIn,...diIn].forEach(function(d){byCat[d.cat]=(byCat[d.cat]||0)+d.valor;});
  var cHtml='';Object.entries(byCat).sort(function(a,b){return b[1]-a[1];}).forEach(function(e){var cat=e[0],val=e[1],p=tIn>0?Math.min(Math.round((val/tIn)*100),100):0,c=CAT_COLORS[cat]||'#888';cHtml+='<div style="margin-bottom:9px;"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;align-items:center;"><span style="display:flex;align-items:center;gap:5px;">'+catDot(cat,9)+'<span>'+cat+'</span></span><span style="color:var(--t2);">'+fmt(val)+' ('+p+'%)</span></div><div class="pbar"><div class="pfill" style="width:'+p+'%;background:'+c+';"></div></div></div>';});
  if(g('r-cats'))g('r-cats').innerHTML=cHtml||'<div style="font-size:13px;color:var(--t3);">Sem despesas.</div>';

  var rec=[...diIn].sort(function(a,b){return b.data.localeCompare(a.data);}).slice(0,5);
  if(g('r-daily'))g('r-daily').innerHTML=rec.length?rec.map(function(d){return '<div class="li"><div class="ll"><div class="ln">'+d.desc+'</div><div class="ls" style="display:flex;align-items:center;gap:4px;">'+catDot(d.cat,8)+' '+d.cat+' · '+d.data+'</div></div><div class="lr"><span class="am ao">-'+fmt(d.valor)+'</span></div></div>';}).join('')+'<div style="font-size:12px;color:var(--t3);padding:.4rem 0;cursor:pointer;" onclick="go(\'diario\')">Ver tudo no Diário →</div>':'<div style="font-size:13px;color:var(--t3);">Sem registos diários.</div>';

  var oH=objetivos.length?objetivos.map(function(obj){var pct=obj.meta>0?Math.min(Math.round(((obj.atual||0)/obj.meta)*100),100):0;return '<div style="margin-bottom:11px;"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;"><span>'+obj.nome+'</span><span class="pill '+(pct>=100?'pg':pct>=50?'pb':'pa')+'">'+pct+'%</span></div><div class="pbar"><div class="pfill" style="width:'+pct+'%;background:'+(pct>=100?'var(--green)':pct>=50?'#1A3F6F':'var(--accent)')+';"></div></div><div style="font-size:12px;color:var(--t3);margin-top:2px;">'+fmt(obj.atual||0)+' de '+fmt(obj.meta)+(obj.prazo?' · '+obj.prazo:'')+'</div></div>';}).join(''):'<div style="font-size:13px;color:var(--t3);">Sem objetivos.</div>';
  if(g('r-objs'))g('r-objs').innerHTML=oH;

  // Desejos no resumo: só aparece se houver margem segura
  var ci2=cycleInfo(),maxD2=ci2.daysLeft>0?Math.max(0,Math.floor(saldo/ci2.daysLeft)):0,margem=maxD2*ci2.daysLeft*0.3;
  var pend=desejos.filter(function(d){return !d.comprado;});
  var wH='';
  if(!pend.length)wH='<div style="font-size:13px;color:var(--t3);">Sem itens na lista.</div>';
  else if(ci2.daysLeft<=10||margem<=0)wH='<div class="alert ala">Faltam '+ci2.daysLeft+' dias para o dia 5. Adia as compras e foca em chegar ao fim do ciclo.</div>';
  else{var order2={alta:0,media:1,baixa:2},melhor2=[...pend].sort(function(a,b){return order2[a.prio]-order2[b.prio];}).find(function(w){return w.preco<=margem;});if(melhor2)wH='<div class="alert alg" style="margin-bottom:.6rem;">Com '+fmt(margem)+' de margem segura, podes considerar: <strong>'+melhor2.nome+'</strong> ('+fmt(melhor2.preco)+').</div>';else wH='<div class="alert ala">Nenhum item cabe na margem segura ('+fmt(margem)+'). Continua a poupar!</div>';}
  if(g('r-wishes'))g('r-wishes').innerHTML=wH;

  renderNotas();
}

// ===== REMINDER =====
function checkReminder(){var last=localStorage.getItem('cf_last_reg'),tod=today();if(last===tod)return;var b=document.createElement('div');b.style.cssText='position:fixed;bottom:1rem;right:1rem;left:1rem;max-width:400px;margin:0 auto;background:var(--t);color:#fff;border-radius:var(--rlg);padding:.9rem 1.2rem;z-index:999;display:flex;justify-content:space-between;align-items:center;gap:1rem;box-shadow:0 4px 20px rgba(0,0,0,.3);';b.innerHTML='<div><div style="font-weight:600;">Já registaste os gastos de hoje?</div><div style="font-size:12px;opacity:.65;">Abre o Diário!</div></div><button onclick="go(\'diario\');this.closest(\'[style]\').remove();localStorage.setItem(\'cf_last_reg\',\''+tod+'\');" style="background:var(--accent);color:#fff;border:none;border-radius:5px;padding:7px 12px;font-weight:600;cursor:pointer;font-size:13px;">Registar</button>';document.body.appendChild(b);setTimeout(function(){if(b.parentElement)b.remove();},12000);}
document.addEventListener('visibilitychange',function(){if(!document.hidden&&USER_KEY)checkReminder();});

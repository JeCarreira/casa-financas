'use strict';
var API='/api',USER_KEY='',LS_KEY='';
var entradas=[],despesas=[],diario=[],objetivos=[],desejos=[],templates=[],desafios=[],notas=[];
var CAT={
  'Habitação':'#1B4F72','Alimentação':'#1E6348','Transportes':'#7A4A0A','Filhos':'#3D2580',
  'Saúde':'#8B1F1F','Lazer':'#0E5E5E','Serviços':'#4A3A6B','Vestuário':'#5C3D1E',
  'Café / Bar':'#6B4226','Gasolina':'#4A3A0A','Compras':'#1A4A1A','Criança':'#3D2580',
  'Farmácia':'#8B1F1F','Outro':'#5C5C5C'
};
function g(id){return document.getElementById(id);}
function fmt(n){return(Math.round(n*100)/100).toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';}
function today(){return new Date().toISOString().split('T')[0];}
function mk(d){return d?d.slice(0,7):'';}
function cur(){var n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0');}
function mlbl(k){if(!k)return '';var p=k.split('-');return['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][+p[1]-1]+' '+p[0];}
function uid(){return 'id'+Date.now()+'x'+Math.floor(Math.random()*1e8);}
function setTd(id){var e=g(id);if(e&&!e.value)e.value=today();}
function dot(cat,sz){sz=sz||10;var c=CAT[cat]||'#888';return'<span style="display:inline-block;width:'+sz+'px;height:'+sz+'px;border-radius:50%;background:'+c+';flex-shrink:0;vertical-align:middle;"></span>';}
function getData(){return{entradas:entradas,despesas:despesas,diario:diario,objetivos:objetivos,desejos:desejos,templates:templates,desafios:desafios,notas:notas,_ts:Date.now()};}
function applyData(d){if(!d)return;entradas=d.entradas||[];despesas=d.despesas||[];diario=d.diario||[];objetivos=d.objetivos||[];desejos=d.desejos||[];desafios=d.desafios||[];notas=d.notas||[];templates=(d.templates&&d.templates.length)?d.templates:defaultTpl();}
function defaultTpl(){return[{id:'t1',nome:'Renda / Crédito habitação',valor:700,cat:'Habitação',ativo:true,dia:1},{id:'t2',nome:'Electricidade + água + gás',valor:120,cat:'Serviços',ativo:true,dia:15},{id:'t3',nome:'Internet + telemóvel',valor:60,cat:'Serviços',ativo:true,dia:10},{id:'t4',nome:'Supermercado semanal',valor:400,cat:'Alimentação',ativo:true,dia:5},{id:'t5',nome:'Gasolina',valor:150,cat:'Transportes',ativo:true,dia:5},{id:'t6',nome:'Escola / actividades filhos',valor:200,cat:'Filhos',ativo:true,dia:1}];}

// ===== STORAGE =====
function lsSave(){if(!LS_KEY)return;var s=JSON.stringify(getData());try{localStorage.setItem(LS_KEY,s);}catch(e){}try{sessionStorage.setItem(LS_KEY,s);}catch(e){}}
function lsLoad(){if(!LS_KEY)return null;try{var r=localStorage.getItem(LS_KEY)||sessionStorage.getItem(LS_KEY);if(r)return JSON.parse(r);}catch(e){}return null;}
function setSS(s){var dot2=g('sync-dot'),lbl=g('sync-lbl');if(!dot2)return;dot2.className='dot'+(s==='syncing'?' syncing':s==='error'?' error':'');lbl.textContent=s==='syncing'?'a guardar...':s==='error'?'local':'guardado';}
function saveAll(){if(!USER_KEY)return;lsSave();setSS('syncing');var d=getData();fetch(API+'/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:USER_KEY,data:d})}).then(function(r){setSS(r.ok?'saved':'error');}).catch(function(){setSS('error');});}
function loadAndStart(){var local=lsLoad();if(local)applyData(local);else templates=defaultTpl();populateSels();renderResumo();renderTpl();renderDesafiosSugeridos();renderInvestir();renderDicas();renderMentorSugs();setTimeout(checkReminder,2000);fetch(API+'/load',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:USER_KEY})}).then(function(r){return r.ok?r.json():null;}).then(function(res){if(!res||!res.data)return;var lt=local?local._ts||0:0,ct=res.data._ts||0;if(ct>lt){applyData(res.data);lsSave();populateSels();reRender();}}).catch(function(){});}

// ===== LOGIN =====
function doLogin(){var code=g('login-code').value.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'');if(code.length<3){g('login-err').textContent='Código demasiado curto.';return;}USER_KEY=code;LS_KEY='financas_v3_'+code.replace(/[^a-z0-9]/g,'');g('login-screen').style.display='none';g('app').style.display='block';localStorage.setItem('cf_last_code',code);loadAndStart();}
window.addEventListener('load',function(){var last=localStorage.getItem('cf_last_code');if(last){g('login-code').value=last;doLogin();}});


// ===== MOBILE NAV =====
var NAV_OPEN=false;
function toggleNav(){
  NAV_OPEN=!NAV_OPEN;
  var menu=g('mobile-menu');
  var btn=document.querySelector('.hamburger-btn');
  if(!menu)return;
  menu.className=NAV_OPEN?'mobile-menu-open':'mobile-menu-closed';
  if(btn)btn.className='hamburger-btn'+(NAV_OPEN?' open':'');
}
// Close menu on outside click
document.addEventListener('click',function(e){
  if(NAV_OPEN&&!e.target.closest('.hamburger-btn')&&!e.target.closest('.mobile-menu-grid')){
    NAV_OPEN=false;
    var menu=g('mobile-menu');if(menu)menu.className='mobile-menu-closed';
    var btn=document.querySelector('.hamburger-btn');if(btn)btn.className='hamburger-btn';
  }
});

// ===== NAV =====
var MORE_OPEN=false;
function toggleMore(){MORE_OPEN=!MORE_OPEN;var m=g('more-menu');if(m)m.className='more-menu'+(MORE_OPEN?' open':'');}
function go(page){
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('on');});
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('on');});
  var labels={resumo:'Resumo',entradas:'Entradas',despesas:'Despesas',diario:'Diário',objetivos:'Objetivos',desafios:'Desafios',desejos:'Desejos',mentor:'Mentor IA',investir:'Investir',dicas:'Dicas',boca:'Casa Portugal',renda:'Renda Portugal'};
  var nc=g('nav-current');if(nc)nc.textContent=labels[page]||page;
  document.querySelectorAll('.mobile-menu-grid button').forEach(function(b){b.classList.remove('active-page');});
  document.querySelectorAll('.mobile-menu-grid button').forEach(function(b){if(b.getAttribute('data-page')===page)b.classList.add('active-page');});
  var el=g('page-'+page);if(el)el.classList.add('on');
  document.querySelectorAll('.tab').forEach(function(t){if(t.textContent===(labels[page]||page))t.classList.add('on');});
  if(page==='resumo')renderResumo();
  else if(page==='entradas'){setTd('sl-dt');setTd('caf-dt');setTd('pv-dt');renderEntradas();}
  else if(page==='despesas'){setTd('da-dt');renderDesp();}
  else if(page==='diario'){setTd('dr-dt');renderDiar();}
  else if(page==='objetivos')renderObjs();
  else if(page==='desafios')renderDesafios();
  else if(page==='desejos'){renderDesejos();analisarDesejos();}
  else if(page==='investir')renderInvestir();
  else if(page==='dicas')renderDicas();
  else if(page==='mentor')renderMentorSugs();
  else if(page==='boca'){bocaLoadAll();setMobileMonth('boca-mes');renderBoca();}
  else if(page==='renda'){rendaLoadAll();setMobileMonth('renda-mes');renderRenda();}
}
function reRender(){populateSels();var a=document.querySelector('.page.on');if(!a)return;go(a.id.replace('page-',''));}

// ===== UTILS =====
function allMonths(){var s=new Set(),n=new Date();for(var i=5;i>=0;i--){var d=new Date(n.getFullYear(),n.getMonth()-i,1);s.add(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));}[...entradas,...despesas,...diario].forEach(function(x){if(x.data)s.add(mk(x.data));});return[...s].sort();}
function populateSels(){var months=allMonths(),c=cur();['r-month','e-month','d-month'].forEach(function(id){var el=g(id);if(!el)return;var prev=el.value||c;el.innerHTML=months.map(function(m){return'<option value="'+m+'"'+(m===prev?' selected':'')+'>'+mlbl(m)+'</option>';}).join('');});}
function openM(id){g(id).classList.add('on');}
function closeM(id){g(id).classList.remove('on');}
document.addEventListener('keydown',function(e){if(e.key==='Escape'){document.querySelectorAll('.modal-overlay.on').forEach(function(m){m.classList.remove('on');});var me=g('mobile-menu');if(me&&NAV_OPEN){NAV_OPEN=false;me.className='mobile-menu-closed';var btn=document.querySelector('.hamburger-btn');if(btn)btn.className='hamburger-btn';}}});

// ===== CICLO =====
function cycleInfo(){var n=new Date(),start,end;if(n.getDate()>=5){start=new Date(n.getFullYear(),n.getMonth(),5);end=new Date(n.getFullYear(),n.getMonth()+1,4);}else{start=new Date(n.getFullYear(),n.getMonth()-1,5);end=new Date(n.getFullYear(),n.getMonth(),4);}var dl=Math.max(Math.ceil((end-n)/(1000*60*60*24)),0),td=Math.round((end-start)/(1000*60*60*24));return{daysLeft:dl,totalDays:td,end:end};}
function getWeekSpend(){var n=new Date(),day=n.getDay(),s=new Date(n);s.setDate(n.getDate()-(day===0?6:day-1));var sk=s.toISOString().split('T')[0];return diario.filter(function(d){return d.data>=sk;}).reduce(function(s,d){return s+d.valor;},0);}

// ===== SALDO SEMAPHORE =====
// >150 verde, 100-150 laranja, <100 vermelho
function saldoClass(v){return v>=150?'saldo-verde':v>=100?'saldo-laranja':'saldo-vermelho';}
function saldoEmoji(v){return v>=150?'🟢':v>=100?'🟠':'🔴';}

// ===== ENTRADAS =====
function addEnt(tipo){var map={salario:['sl-d','sl-v','sl-dt'],caf:['caf-d','caf-v','caf-dt'],prevista:['pv-d','pv-v','pv-dt']};var ids=map[tipo],desc=g(ids[0]).value.trim(),val=parseFloat(g(ids[1]).value),data=g(ids[2]).value||today();if(!desc||!val||val<=0){alert('Preenche descrição e valor.');return;}entradas.push({id:uid(),tipo:tipo,desc:desc,valor:val,data:data,nota:tipo==='prevista'?g('pv-n').value.trim():''});g(ids[1]).value='';if(tipo==='prevista')g('pv-n').value='';saveAll();reRender();if(tipo==='prevista')renderPrevSugestoes();}
function delEnt(id){entradas=entradas.filter(function(e){return e.id!==id;});saveAll();reRender();}
function renderEntradas(){
  var m=g('e-month').value;
  ['salario','caf','prevista'].forEach(function(tipo){
    var f=entradas.filter(function(e){return e.tipo===tipo&&mk(e.data)===m;}).sort(function(a,b){return b.data.localeCompare(a.data);});
    var el=g('lst-'+tipo);if(!el)return;
    el.innerHTML=f.length?f.map(function(e){return'<div class="li"><div class="ll"><div class="ln">'+e.desc+'</div><div class="ls">'+e.data+(e.nota?' · '+e.nota:'')+'</div></div><div class="lr"><span class="am '+(tipo==='prevista'?'apv':'ai')+'">'+(tipo==='prevista'?'~':'+')+fmt(e.valor)+'</span><button class="btn bd bxs" onclick="delEnt(\''+e.id+'\')">×</button></div></div>';}).join(''):'<div style="font-size:13px;color:var(--t3);padding:.4rem 0;">Sem registos.</div>';
  });
  renderPrevSugestoes();
}

function renderPrevSugestoes(){
  var m=cur(),prevs=entradas.filter(function(e){return e.tipo==='prevista'&&mk(e.data)===m;});
  var el=g('pv-sugestao');if(!el)return;
  if(!prevs.length){el.innerHTML='';return;}
  var total=prevs.reduce(function(s,e){return s+e.valor;},0);
  var ci=cycleInfo();
  var tIn=entradas.filter(function(e){return e.tipo!=='prevista'&&mk(e.data)===m;}).reduce(function(s,e){return s+e.valor;},0);
  var tD=despesas.filter(function(d){return mk(d.data)===m;}).reduce(function(s,d){return s+d.valor;},0);
  var tDi=diario.filter(function(d){return mk(d.data)===m;}).reduce(function(s,d){return s+d.valor;},0);
  var saldoAtual=tIn-tD-tDi;
  var diasPassados=Math.max(ci.totalDays-ci.daysLeft,1);
  var gastoDiario=(tD+tDi)/diasPassados;
  var estimativaAteD5=gastoDiario*ci.daysLeft;
  var margemSegura=Math.max(saldoAtual-estimativaAteD5,0);
  // Read notas para próximo mês
  var notasMes=notas.filter(function(n){return n.tipo==='mes'||!n.tipo;}).map(function(n){return n.texto;}).join('; ');
  var sug=[];
  // 1. Situation assessment
  if(saldoAtual<0){sug.push({icon:'🚨',cor:'var(--red-t)',bg:'var(--red-bg)',txt:'O saldo actual está negativo ('+fmt(saldoAtual)+'). Usa <strong>'+fmt(Math.min(Math.abs(saldoAtual),total))+'</strong> para cobrir primeiro.'});}
  else if(estimativaAteD5>saldoAtual){sug.push({icon:'⚠️',cor:'var(--amber-t)',bg:'var(--amber-bg)',txt:'Ao ritmo actual precisas de <strong>'+fmt(estimativaAteD5)+'</strong> para chegar ao dia 5, mas só tens '+fmt(saldoAtual)+'. Guarda <strong>'+fmt(Math.min(total,estimativaAteD5-saldoAtual))+'</strong> das previstas para cobrir a diferença.'});}
  else{sug.push({icon:'📅',cor:'var(--blue-t)',bg:'var(--blue-bg)',txt:'Faltam <strong>'+ci.daysLeft+' dias</strong> para o dia 5. Gastas em média '+fmt(Math.round(gastoDiario))+'€/dia. Guarda <strong>'+fmt(Math.round(estimativaAteD5*1.2))+'</strong> para chegar com folga.'});}
  // 2. Objetivos
  var objsPend=objetivos.filter(function(o){return Math.max(o.meta-(o.atual||0),0)>0;});
  objsPend.slice(0,2).forEach(function(o){var c=Math.min(Math.round(total*0.2),Math.max(o.meta-(o.atual||0),0));if(c>0)sug.push({icon:'🎯',cor:'var(--green-t)',bg:'var(--green-bg)',txt:'Mete <strong>'+fmt(c)+'</strong> no objetivo "<em>'+o.nome+'</em>" — faltam '+fmt(Math.max(o.meta-(o.atual||0),0))+'.'});});
  // 3. Despesas por pagar
  var dpp=despesas.filter(function(d){return !d.pago&&mk(d.data)===m;});if(dpp.length){var vpp=dpp.reduce(function(s,d){return s+d.valor;},0);sug.push({icon:'💳',cor:'var(--purple-t)',bg:'var(--purple-bg)',txt:'Tens <strong>'+fmt(vpp)+'</strong> em '+dpp.length+' despesa(s) por pagar. Trata disso com parte das previstas.'});}
  // 4. Notas do próximo mês
  if(notasMes){sug.push({icon:'📌',cor:'var(--t2)',bg:'var(--surface2)',txt:'Nas notas para o próximo mês tens: <em>'+notasMes.slice(0,120)+'</em>. Considera guardar parte das previstas para cobrir isso.'});}
  // 5. Desejos (só se confortável)
  if(margemSegura>100&&ci.daysLeft>10){var order={alta:0,media:1,baixa:2};var melhor=[...desejos].filter(function(w){return !w.comprado;}).sort(function(a,b){return order[a.prio]-order[b.prio];}).find(function(w){return w.preco<=margemSegura*0.4;});if(melhor)sug.push({icon:'🛍',cor:'var(--t2)',bg:'var(--surface2)',txt:'Se ficares confortável com as outras sugestões, podes comprar "<em>'+melhor.nome+'</em>" ('+fmt(melhor.preco)+') da lista de desejos.'});}
  // 6. Reserva
  sug.push({icon:'🏦',cor:'var(--t2)',bg:'var(--surface2)',txt:'Guarda pelo menos <strong>'+fmt(Math.round(total*0.2))+'</strong> como almofada para imprevistos do próximo ciclo.'});
  var notaExist=notas.find(function(n){return n.tipo==='prevista'&&n.mes===m;});
  var html='<div class="ai-box" style="margin-top:.7rem;">'
    +'<div class="ai-title">O que fazer com '+fmt(total)+' de entradas previstas</div>'
    +'<div style="display:flex;flex-direction:column;gap:7px;margin:.5rem 0;">'
    +sug.map(function(s){return'<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border-radius:6px;background:'+s.bg+';font-size:13px;color:'+s.cor+';line-height:1.5;"><span style="flex-shrink:0;">'+s.icon+'</span><span>'+s.txt+'</span></div>';}).join('')
    +'</div><hr style="margin:.5rem 0;"><label style="font-size:12px;color:var(--amber-t);font-weight:600;">A tua nota sobre este dinheiro</label>'
    +'<textarea id="pv-nota-pessoal" placeholder="Escreve o que queres fazer com este dinheiro previsto..." style="margin-top:5px;font-size:13px;min-height:60px;">'+(notaExist?notaExist.texto:'')+'</textarea>'
    +'<button class="btn ba bsm" style="margin-top:5px;" onclick="saveNotaPrevista()">Guardar nota</button></div>';
  el.innerHTML=html;
}
function saveNotaPrevista(){var m=cur(),txt=g('pv-nota-pessoal')?g('pv-nota-pessoal').value.trim():'';notas=notas.filter(function(n){return!(n.tipo==='prevista'&&n.mes===m);});if(txt)notas.push({id:uid(),tipo:'prevista',mes:m,texto:txt,data:today()});saveAll();}

// ===== TEMPLATE (com dia de vencimento) =====
function renderTpl(){
  var el=g('tpl-list');if(!el)return;
  if(!templates.length){el.innerHTML='<div style="font-size:13px;color:var(--t3);">Sem rubricas.</div>';return;}
  el.innerHTML=templates.map(function(t){return'<div class="tpl-item" style="background:'+(t.ativo!==false?'var(--surface)':'var(--surface2)')+';">'
    +'<input type="checkbox" '+(t.ativo!==false?'checked':'')+' onchange="tplChk(\''+t.id+'\',this.checked)" style="width:16px;flex-shrink:0;cursor:pointer;accent-color:var(--accent);">'
    +dot(t.cat,10)
    +'<span style="flex:1;font-size:13px;'+(t.ativo===false?'color:var(--t3);':'')+'">'+t.nome+'</span>'
    +'<span style="font-size:11px;color:var(--t3);margin-right:4px;">dia</span><input type="number" value="'+(t.dia||1)+'" min="1" max="31" onchange="tplDia(\''+t.id+'\',this.value)" style="width:38px;background:transparent;border:none;border-bottom:1px dashed var(--border2);border-radius:0;padding:2px 2px;font-size:12px;text-align:center;color:var(--t);">'
    +'<input type="number" value="'+t.valor+'" onchange="tplVal(\''+t.id+'\',this.value)" style="width:68px;background:transparent;border:none;border-bottom:1px dashed var(--border2);border-radius:0;padding:2px 4px;font-size:13px;text-align:right;color:var(--t);margin-left:4px;"> €'
    +'<button class="btn bd bxs" onclick="delTpl(\''+t.id+'\')">×</button></div>';}).join('');
}
function tplChk(id,v){var t=templates.find(function(x){return x.id===id;});if(t)t.ativo=v;renderTpl();saveAll();}
function tplVal(id,v){var t=templates.find(function(x){return x.id===id;});if(t)t.valor=parseFloat(v)||0;saveAll();}
function tplDia(id,v){var t=templates.find(function(x){return x.id===id;});if(t)t.dia=parseInt(v)||1;saveAll();}
function delTpl(id){templates=templates.filter(function(t){return t.id!==id;});saveAll();renderTpl();}
function addTpl(){var n=g('tpl-n').value.trim(),v=parseFloat(g('tpl-v').value)||0,c=g('tpl-c').value;if(!n)return alert('Escreve um nome.');templates.push({id:uid(),nome:n,valor:v,cat:c,ativo:true,dia:1});saveAll();renderTpl();closeM('m-addtpl');g('tpl-n').value='';g('tpl-v').value='';}
function aplicarTpl(){
  var m=g('d-month').value,ativos=templates.filter(function(t){return t.ativo!==false&&t.valor>0;});
  if(!ativos.length){alert('Nenhuma rubrica activa.');return;}
  var n=0;
  ativos.forEach(function(t){
    if(!despesas.some(function(d){return d.tplId===t.id&&mk(d.data)===m;})){
      var dia=String(t.dia||1).padStart(2,'0');
      despesas.push({id:uid(),tplId:t.id,desc:t.nome,valor:t.valor,cat:t.cat,data:m+'-'+dia,tipo:'fixa',pago:false});
      n++;
    }
  });
  saveAll();renderDesp();
  if(n===0)alert('Já aplicadas a este mês.');else alert(n+' despesas fixas adicionadas com as datas de vencimento!');
}

// ===== DESPESAS (com check no resumo também) =====
function addDesp(){var desc=g('da-d').value.trim(),val=parseFloat(g('da-v').value),cat=g('da-c').value,data=g('da-dt').value||today();if(!desc||!val||val<=0){alert('Preenche descrição e valor.');return;}despesas.push({id:uid(),desc:desc,valor:val,cat:cat,data:data,tipo:'pontual',pago:false});g('da-d').value='';g('da-v').value='';saveAll();reRender();}
function delDesp(id){despesas=despesas.filter(function(d){return d.id!==id;});saveAll();reRender();}
function togglePago(id){var d=despesas.find(function(x){return x.id===id;});if(d){d.pago=!d.pago;saveAll();renderDesp();renderResumo();}}
function renderDesp(){
  renderTpl();
  var m=g('d-month').value,f=despesas.filter(function(d){return mk(d.data)===m;}).sort(function(a,b){return a.data.localeCompare(b.data);});
  var total=f.reduce(function(s,d){return s+d.valor;},0),pago=f.filter(function(d){return d.pago;}).reduce(function(s,d){return s+d.valor;},0);
  g('d-total-pill').textContent='Total: '+fmt(total)+' · Pago: '+fmt(pago);
  var el=g('lst-despesas');if(!f.length){el.innerHTML='<div style="font-size:13px;color:var(--t3);padding:.4rem 0;">Sem despesas. Usa as despesas fixas acima.</div>';return;}
  var byCat={};f.forEach(function(d){byCat[d.cat]=byCat[d.cat]||[];byCat[d.cat].push(d);});
  var html='';
  Object.entries(byCat).forEach(function(e){
    var cat=e[0],items=e[1],ct=items.reduce(function(s,d){return s+d.valor;},0);
    html+='<div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--t3);padding:9px 0 5px;border-top:.5px solid var(--border);margin-top:3px;">'+dot(cat,9)+'<span>'+cat+'</span><span style="margin-left:auto;font-weight:400;">'+fmt(ct)+'</span></div>';
    html+=items.map(function(d){return'<div class="li" style="'+(d.pago?'opacity:.5;':'')+'"><div class="ll"><div class="ln" style="'+(d.pago?'text-decoration:line-through;':'')+'">'+d.desc+'</div><div class="ls">'+d.data+(d.tipo==='fixa'?' · fixa':' · pontual')+'</div></div><div class="lr"><span class="am ao">-'+fmt(d.valor)+'</span><button class="btn-check '+(d.pago?'checked':'')+'" onclick="togglePago(\''+d.id+'\')">'+(d.pago?'✓':'Pagar')+'</button><button class="btn bd bxs" onclick="delDesp(\''+d.id+'\')">×</button></div></div>';}).join('');
  });
  el.innerHTML=html;
}

// ===== DIÁRIO (com check e limite diário visual) =====
function addDiar(){var desc=g('dr-d').value.trim(),val=parseFloat(g('dr-v').value),cat=g('dr-c').value,data=g('dr-dt').value||today();if(!desc||!val||val<=0){alert('Preenche descrição e valor.');return;}diario.push({id:uid(),desc:desc,valor:val,cat:cat,data:data,pago:false});g('dr-d').value='';g('dr-v').value='';saveAll();reRender();}
function delDiar(id){diario=diario.filter(function(d){return d.id!==id;});saveAll();reRender();}
function togglePagoDiar(id){var d=diario.find(function(x){return x.id===id;});if(d){d.pago=!d.pago;saveAll();renderDiar();}}
function renderDiar(){
  var m=cur(),f=diario.filter(function(d){return mk(d.data)===m;}).sort(function(a,b){return b.data.localeCompare(a.data);});
  var total=f.reduce(function(s,d){return s+d.valor;},0);
  g('dr-total-pill').textContent='Este mês: '+fmt(total);
  var ci=cycleInfo();
  var tIn=entradas.filter(function(e){return e.tipo!=='prevista'&&mk(e.data)===m;}).reduce(function(s,e){return s+e.valor;},0);
  var tD=despesas.filter(function(d){return mk(d.data)===m;}).reduce(function(s,d){return s+d.valor;},0);
  var saldo=tIn-tD-total;
  var maxDiario=ci.daysLeft>0?Math.max(0,Math.floor(saldo/ci.daysLeft)):0;
  var ws=getWeekSpend();
  var sc=saldoClass(saldo);
  var alts='';
  alts+='<div class="alert '+(saldo>=150?'alg':saldo>=100?'ala':'alr')+'">'+saldoEmoji(saldo)+' Saldo actual: <strong class="'+sc+'">'+fmt(saldo)+'</strong> · '+(maxDiario>0?'Podes gastar até <strong>'+fmt(maxDiario)+'</strong>/dia para chegar ao dia 5 com saldo.':'Sem margem para gastos extras.')+'</div>';
  if(ci.daysLeft<=5)alts+='<div class="alert alr">🚨 Faltam só <strong>'+ci.daysLeft+' dias</strong> para o dia 5 — evita qualquer gasto não essencial!</div>';
  else if(ci.daysLeft<=10)alts+='<div class="alert ala">⚠️ Faltam <strong>'+ci.daysLeft+' dias</strong> para o dia 5. Começa a controlar os gastos.</div>';
  if(ws>maxDiario*7&&maxDiario>0)alts+='<div class="alert alr">Esta semana gastaste '+fmt(ws)+' — acima do ritmo recomendado de '+fmt(maxDiario*7)+'!</div>';
  g('diar-alerts').innerHTML=alts;
  var el=g('lst-diario');if(!f.length){el.innerHTML='<div style="font-size:13px;color:var(--t3);padding:.4rem 0;">Sem registos.</div>';return;}
  var byDate={};f.forEach(function(d){byDate[d.data]=byDate[d.data]||[];byDate[d.data].push(d);});
  var html='';
  Object.entries(byDate).sort(function(a,b){return b[0].localeCompare(a[0]);}).forEach(function(e){
    var date=e[0],items=e[1],dt=items.reduce(function(s,d){return s+d.valor;},0),over=maxDiario>0&&dt>maxDiario;
    html+='<div class="day-lbl" style="'+(over?'color:var(--red-t);':'')+'">'+date+'<span>'+fmt(dt)+(over?' ⚠':'')+'</span></div>';
    html+=items.map(function(d){return'<div class="li" style="'+(d.pago?'opacity:.5;':'')+'"><div class="ll"><div class="ln" style="'+(d.pago?'text-decoration:line-through;':'')+'">'+d.desc+'</div><div class="ls" style="display:flex;align-items:center;gap:4px;">'+dot(d.cat,8)+' '+d.cat+'</div></div><div class="lr"><span class="am ao">-'+fmt(d.valor)+'</span><button class="btn-check '+(d.pago?'checked':'')+'" onclick="togglePagoDiar(\''+d.id+'\')" title="Marcar como saiu da conta">'+(d.pago?'✓ Saiu':'Saiu?')+'</button><button class="btn bd bxs" onclick="delDiar(\''+d.id+'\')">×</button></div></div>';}).join('');
  });
  el.innerHTML=html;
}

// ===== OBJETIVOS =====
function addObj(){var nome=g('o-nome').value.trim(),meta=parseFloat(g('o-meta').value)||0;if(!nome||!meta)return alert('Preenche nome e meta.');objetivos.push({id:uid(),nome:nome,meta:meta,prazo:g('o-prazo').value,atual:parseFloat(g('o-atual').value)||0,mensal:parseFloat(g('o-mensal').value)||0,notas:g('o-notas').value.trim(),historico:[]});['o-nome','o-meta','o-prazo','o-atual','o-mensal','o-notas'].forEach(function(id){g(id).value='';});saveAll();renderObjs();}
function delObj(id){objetivos=objetivos.filter(function(o){return o.id!==id;});saveAll();renderObjs();}
function openObjEdit(id){var obj=objetivos.find(function(o){return o.id===id;});if(!obj)return;g('me-title').textContent=obj.nome;g('me-body').innerHTML='<div class="fr"><div class="fg"><label>Poupado (€)</label><input id="oe-a" type="number" value="'+(obj.atual||0)+'" step="0.01"></div></div><div class="fr"><div class="fg"><label>Meta (€)</label><input id="oe-m" type="number" value="'+obj.meta+'"></div><div class="fg"><label>Mensal (€)</label><input id="oe-mn" type="number" value="'+(obj.mensal||0)+'"></div></div><div class="fr"><div class="fg"><label>Prazo</label><input id="oe-p" type="date" value="'+(obj.prazo||'')+'"></div></div><div class="fr"><div class="fg"><label>Notas</label><input id="oe-n" value="'+(obj.notas||'')+'"></div></div><button class="btn ba" style="width:100%;margin-top:.4rem;" onclick="saveObjEdit(\''+id+'\')">Guardar</button><hr><p style="font-size:13px;font-weight:500;margin-bottom:.5rem;">Contribuição pontual</p><div style="display:flex;gap:6px;align-items:center;"><input id="oe-c" type="number" placeholder="ex: 50" style="flex:1;"><select id="oe-ct" style="width:auto;"><option value="add">+ Adicionar</option><option value="sub">− Retirar</option></select><button class="btn ba bsm" onclick="addContrib(\''+id+'\')">Registar</button></div>'+(obj.historico&&obj.historico.length?'<div style="margin-top:.7rem;font-size:12px;color:var(--t2);">Recentes: '+obj.historico.slice(-4).map(function(h){return h.data+': '+(h.delta>0?'+':'')+fmt(h.delta);}).join(' · ')+'</div>':'');openM('m-obj-edit');}
function saveObjEdit(id){var obj=objetivos.find(function(o){return o.id===id;});if(!obj)return;obj.atual=parseFloat(g('oe-a').value)||0;obj.meta=parseFloat(g('oe-m').value)||obj.meta;obj.mensal=parseFloat(g('oe-mn').value)||0;obj.prazo=g('oe-p').value||obj.prazo;obj.notas=g('oe-n').value||obj.notas;saveAll();renderObjs();closeM('m-obj-edit');}
function addContrib(id){var obj=objetivos.find(function(o){return o.id===id;});if(!obj)return;var val=parseFloat(g('oe-c').value)||0,tipo=g('oe-ct').value,delta=tipo==='add'?val:-val;obj.atual=Math.max(0,(obj.atual||0)+delta);obj.historico=obj.historico||[];obj.historico.push({data:today(),delta:delta});saveAll();openObjEdit(id);renderObjs();}
function renderObjs(){var el=g('lst-objetivos');if(!el)return;if(!objetivos.length){el.innerHTML='<div class="card"><div style="font-size:13px;color:var(--t3);">Sem objetivos. Adiciona o primeiro!</div></div>';return;}el.innerHTML=objetivos.map(function(obj){var pct=obj.meta>0?Math.min(Math.round(((obj.atual||0)/obj.meta)*100),100):0,rest=Math.max(obj.meta-(obj.atual||0),0),mr=obj.prazo?Math.max(0,Math.round((new Date(obj.prazo)-new Date())/(1000*60*60*24*30))):null,mn=mr&&mr>0?Math.ceil(rest/mr):null,ok=obj.mensal&&mn&&obj.mensal>=mn;return'<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--rlg);padding:1.1rem 1.3rem;margin-bottom:9px;"><div style="display:flex;justify-content:space-between;margin-bottom:5px;"><div style="font-size:15px;font-weight:500;">'+obj.nome+'</div><span class="pill '+(pct>=100?'pg':pct>=50?'pb':'pa')+'">'+pct+'%</span></div><div style="font-size:12px;color:var(--t2);margin-bottom:7px;">'+fmt(obj.atual||0)+' de '+fmt(obj.meta)+' · Faltam '+fmt(rest)+(obj.prazo?' · '+obj.prazo:'')+'</div>'+(mr!==null?'<div class="alert '+(ok?'alg':'ala')+'" style="margin-bottom:6px;font-size:12px;padding:6px 10px;">'+(ok?'Poupança suficiente para atingir o prazo.':'Precisas de '+fmt(mn||0)+'/mês — tens '+fmt(obj.mensal||0)+'/mês.')+'</div>':'')+'<div class="pbar" style="margin-bottom:9px;"><div class="pfill" style="width:'+pct+'%;background:'+(pct>=100?'var(--green)':pct>=50?'#1A3F6F':'var(--accent)')+'"></div></div><div style="display:flex;gap:6px;flex-wrap:wrap;"><button class="btn bg bsm" onclick="openObjEdit(\''+obj.id+'\')">Actualizar</button><button class="btn bd bsm" onclick="delObj(\''+obj.id+'\')">Eliminar</button></div></div>';}).join('');}

// ===== DESAFIOS =====
var DS=[
  {nivel:'Iniciante',nome:'Registo diário 7 dias',desc:'Regista TODOS os gastos durante 7 dias. Só para ganhar consciência.',meta:0,dur:1,passos:['Dia 1: Regista o primeiro gasto do dia','Dia 2: Regista tudo incluindo cafés e pequenas compras','Dia 3: Compara com o dia anterior','Dia 4: Tenta prever quanto vais gastar antes de o fazer','Dia 5: Identifica onde gastas mais','Dia 6: Reduz esse gasto em 20%','Dia 7: Faz o balanço total da semana']},
  {nivel:'Iniciante',nome:'Semana sem compras impulsivas',desc:'7 dias sem comprar nada que não estava planeado.',meta:0,dur:1,passos:['Faz a lista antes de sair de casa','Compra APENAS o que está na lista','Quando quiseres comprar algo extra, anota-o','Ao fim de 7 dias: soma o que não compraste']},
  {nivel:'Iniciante',nome:'Poupar 50€ este mês',desc:'O primeiro passo para o hábito de poupar.',meta:50,dur:4,passos:['Semana 1: Identifica onde cortar 12,50€','Semana 2: Transfere 12,50€ para poupança','Semana 3: Repete a semana 2','Semana 4: Completa os 50€ e celebra!']},
  {nivel:'Intermédio',nome:'30 dias sem compras supérfluas',desc:'Um mês sem roupa, gadgets ou decoração.',meta:0,dur:4,passos:['Semana 1: Define por escrito o que é supérfluo para ti','Semana 2: Quando quiseres comprar algo, espera 48h','Semana 3: Substitui o shopping por actividades gratuitas','Semana 4: Soma o que poupaste']},
  {nivel:'Intermédio',nome:'Reserva de emergência 500€',desc:'500€ intocáveis — só para emergências reais.',meta:500,dur:8,passos:['Semana 1-2: Identifica onde cortar despesas variáveis','Semana 3-4: Poupa os primeiros 125€','Semana 5-6: Mais 125€ (total: 250€)','Semana 7-8: Conclui os 500€ — NÃO TOQUES']},
  {nivel:'Avançado',nome:'Desafio 52 semanas',desc:'Semana 1: poupa 1€. Semana 52: poupa 52€. Total: 1.378€.',meta:1378,dur:52,passos:['Semanas 1-10: 1€ a 10€/semana (acumulado: 55€)','Semanas 11-20: 11€ a 20€/semana (acumulado: 210€)','Semanas 21-30: 21€ a 30€/semana (acumulado: 465€)','Semanas 31-40: 31€ a 40€/semana (acumulado: 820€)','Semanas 41-52: 41€ a 52€/semana (total: 1.378€)']},
  {nivel:'Avançado',nome:'Organiza as finanças do zero',desc:'Plano completo para estruturar tudo em 4 semanas.',meta:0,dur:4,passos:['Semana 1: Lista rendimentos, despesas fixas e dívidas. Calcula o saldo real.','Semana 2: Cria orçamento com a regra 50/30/20. Define limites por categoria.','Semana 3: Abre conta poupança separada. Configura transferência automática no dia do salário.','Semana 4: Define 3 objetivos financeiros (curto, médio, longo prazo) com valores e prazos.']}
];
function renderDesafiosSugeridos(){var el=g('desafios-sugeridos');if(!el)return;var niveis=['Iniciante','Intermédio','Avançado'],corN={Iniciante:'var(--green)',Intermédio:'var(--amber)',Avançado:'var(--red)'},html='';niveis.forEach(function(n){html+='<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:'+corN[n]+';padding:8px 0 5px;border-bottom:.5px solid var(--border);margin-bottom:6px;">'+n+'</div>';DS.filter(function(d){return d.nivel===n;}).forEach(function(ds){html+='<div class="desafio-sug"><div><div style="font-size:13px;font-weight:500;">'+ds.nome+'</div><div style="font-size:12px;color:var(--t2);">'+ds.desc+'</div></div><button class="btn ba bsm" onclick="adoptDesafio('+DS.indexOf(ds)+')" style="flex-shrink:0;margin-top:4px;">Adoptar</button></div>';});});el.innerHTML=html;}
function adoptDesafio(i){var ds=DS[i];desafios.push({id:uid(),nome:ds.nome,desc:ds.desc,meta:ds.meta,dur:ds.dur,nivel:ds.nivel,inicio:today(),passos:ds.passos,checks:[],progresso:0,concluido:false});saveAll();renderDesafios();go('desafios');}
function addDesafio(){var nome=g('ch-nome').value.trim();if(!nome)return alert('Preenche o nome.');desafios.push({id:uid(),nome:nome,desc:g('ch-desc').value.trim(),meta:parseFloat(g('ch-meta').value)||0,dur:parseInt(g('ch-dur').value)||4,nivel:'Personalizado',inicio:g('ch-ini').value||today(),passos:[],checks:[],progresso:0,concluido:false});['ch-nome','ch-meta','ch-dur','ch-ini','ch-desc'].forEach(function(id){g(id).value='';});saveAll();renderDesafios();}
function delDesafio(id){desafios=desafios.filter(function(d){return d.id!==id;});saveAll();renderDesafios();}
function toggleDesafioCheck(did,si){var d=desafios.find(function(x){return x.id===did;});if(!d)return;d.checks=d.checks||[];var k=''+si;if(d.checks.includes(k))d.checks=d.checks.filter(function(c){return c!==k;});else d.checks.push(k);d.concluido=d.passos.length>0&&d.checks.length>=d.passos.length;saveAll();renderDesafios();}
function updateDesafioVal(id,v){var d=desafios.find(function(x){return x.id===id;});if(!d)return;d.progresso=parseFloat(v)||0;d.concluido=d.meta>0&&d.progresso>=d.meta;saveAll();renderDesafios();}
function renderDesafios(){var el=g('lst-desafios');if(!el)return;if(!desafios.length){el.innerHTML='<div class="card"><div style="font-size:13px;color:var(--t3);">Sem desafios activos. Adopta um sugerido!</div></div>';return;}var corN={Iniciante:'var(--green)',Intermédio:'var(--amber)',Avançado:'var(--red)',Personalizado:'var(--blue)'};el.innerHTML=desafios.map(function(d){var pct=d.passos&&d.passos.length>0?Math.round(((d.checks||[]).length/d.passos.length)*100):d.meta>0?Math.min(Math.round((d.progresso/d.meta)*100),100):d.concluido?100:0,cor=corN[d.nivel]||'var(--accent)';var pH=d.passos&&d.passos.length?'<div style="margin:10px 0;">'+d.passos.map(function(p,i){var ch=(d.checks||[]).includes(''+i);return'<div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:.5px solid var(--border);cursor:pointer;" onclick="toggleDesafioCheck(\''+d.id+'\','+i+')">'+'<div style="width:18px;height:18px;border-radius:4px;border:2px solid '+(ch?'var(--green)':'var(--border2)')+';background:'+(ch?'var(--green)':'transparent')+';flex-shrink:0;display:flex;align-items:center;justify-content:center;">'+(ch?'<span style="color:#fff;font-size:11px;font-weight:600;">✓</span>':'')+'</div><span style="font-size:13px;'+(ch?'text-decoration:line-through;color:var(--t3);':'')+'">'+p+'</span></div>';}).join('')+'</div>':'';var vH=d.meta>0?'<div style="display:flex;gap:6px;align-items:center;margin:8px 0;"><input type="number" value="'+(d.progresso||'')+'" onchange="updateDesafioVal(\''+d.id+'\',this.value)" style="flex:1;font-size:13px;" placeholder="Valor poupado (€)"><span style="font-size:13px;color:var(--t3);">/ '+fmt(d.meta)+'</span></div>':'';return'<div class="desafio-card" style="'+(d.concluido?'border-color:var(--green);':'border-left:3px solid '+cor+';')+'">'+'<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><div><span style="font-size:10px;font-weight:600;text-transform:uppercase;color:'+cor+';">'+(d.nivel||'Personalizado')+'</span><div style="font-size:15px;font-weight:500;">'+(d.nome+(d.concluido?' ✓':''))+'</div></div><span class="pill '+(d.concluido?'pg':'pa')+'">'+pct+'%</span></div>'+(d.desc?'<div style="font-size:12px;color:var(--t2);margin-bottom:6px;">'+d.desc+'</div>':'')+'<div style="font-size:12px;color:var(--t3);margin-bottom:7px;">Início: '+d.inicio+' · '+d.dur+' sem.</div><div class="pbar" style="margin-bottom:8px;"><div class="pfill" style="width:'+pct+'%;background:'+(d.concluido?'var(--green)':cor)+';"></div></div>'+pH+vH+'<button class="btn bd bxs" onclick="delDesafio(\''+d.id+'\')" style="margin-top:6px;">Eliminar</button></div>';}).join('');}

// ===== NOTAS =====
function saveNotasArea(){var txt=g('notas-area')?g('notas-area').value:'';notas=notas.filter(function(n){return n.tipo==='prevista';});txt.split('\n').filter(function(l){return l.trim();}).forEach(function(l){notas.push({id:uid(),texto:l.trim(),data:today(),feita:false,tipo:'mes'});});saveAll();renderResumo();alert('Notas guardadas!');}
function renderNotas(){var el=g('r-notas-wrap');if(!el)return;var mn=notas.filter(function(n){return n.tipo==='mes'||!n.tipo;});var txt=mn.filter(function(n){return!n.feita;}).map(function(n){return n.texto;}).join('\n');el.innerHTML='<textarea id="notas-area" placeholder="Escreve aqui notas e lembretes para o próximo mês...\nEx: Não esquecer seguro carro\nEx: Próximo mês vai ser mais apertado" style="width:100%;min-height:110px;font-size:13px;margin-bottom:.7rem;">'+txt+'</textarea><button class="btn ba bsm" onclick="saveNotasArea()">Guardar notas</button>';}

// ===== DESEJOS =====
function addWish(){var nome=g('w-nome').value.trim(),preco=parseFloat(g('w-preco').value)||0;if(!nome||!preco)return alert('Preenche nome e preço.');desejos.push({id:uid(),nome:nome,preco:preco,prio:g('w-prio').value,notas:g('w-notas').value.trim(),comprado:false});g('w-nome').value='';g('w-preco').value='';g('w-notas').value='';saveAll();renderDesejos();analisarDesejos();}
function delWish(id){desejos=desejos.filter(function(d){return d.id!==id;});saveAll();renderDesejos();analisarDesejos();}
function markWish(id){var w=desejos.find(function(d){return d.id===id;});if(w)w.comprado=!w.comprado;saveAll();renderDesejos();}
function renderDesejos(){var el=g('lst-desejos');if(!el)return;if(!desejos.length){el.innerHTML='<div class="card"><div style="font-size:13px;color:var(--t3);">Sem itens na lista.</div></div>';return;}var order={alta:0,media:1,baixa:2};el.innerHTML=[...desejos].sort(function(a,b){return order[a.prio]-order[b.prio];}).map(function(w){return'<div class="wish-item" style="'+(w.comprado?'opacity:.5;':'')+'"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px;"><div><div style="font-size:15px;font-weight:500;'+(w.comprado?'text-decoration:line-through;':'')+'">'+w.nome+'</div><div style="font-size:12px;color:var(--t3);">'+(w.prio==='alta'?'Alta prioridade':w.prio==='media'?'Média':'Baixa')+(w.notas?' · '+w.notas:'')+'</div></div><div style="font-size:18px;font-weight:400;color:var(--accent);">'+fmt(w.preco)+'</div></div><div style="display:flex;gap:6px;"><button class="btn bg bsm" onclick="markWish(\''+w.id+'\')">'+(w.comprado?'Desfazer':'✓ Comprado')+'</button><button class="btn bd bsm" onclick="delWish(\''+w.id+'\')">Remover</button></div></div>';}).join('');}
function analisarDesejos(){
  var el=g('wishes-ai');if(!el)return;
  var pend=desejos.filter(function(d){return!d.comprado;});if(!pend.length){el.innerHTML='';return;}
  var m=cur(),ci=cycleInfo();
  var tIn=entradas.filter(function(e){return e.tipo!=='prevista'&&mk(e.data)===m;}).reduce(function(s,e){return s+e.valor;},0);
  var tD=despesas.filter(function(d){return mk(d.data)===m;}).reduce(function(s,d){return s+d.valor;},0);
  var tDi=diario.filter(function(d){return mk(d.data)===m;}).reduce(function(s,d){return s+d.valor;},0);
  var saldo=tIn-tD-tDi;
  if(ci.daysLeft<=10||saldo<200){el.innerHTML='<div class="alert ala" style="margin-bottom:.9rem;">Faltam '+ci.daysLeft+' dias para o dia 5 e o saldo é '+fmt(saldo)+'. Adia as compras e foca em chegar ao dia 5 com verde.</div>';return;}
  var margemSegura=Math.max(saldo-200,0)*0.3;
  var order={alta:0,media:1,baixa:2};
  var melhor=[...pend].sort(function(a,b){return order[a.prio]-order[b.prio];}).find(function(w){return w.preco<=margemSegura;});
  if(melhor)el.innerHTML='<div class="ai-box" style="margin-bottom:.9rem;"><div class="ai-title">O que podes comprar</div><div class="ai-text">Com saldo de '+fmt(saldo)+' e guardando 200€ de almofada, tens '+fmt(margemSegura)+' de margem segura. Podes considerar <strong>'+melhor.nome+'</strong> ('+fmt(melhor.preco)+') — a prioridade mais alta que cabe. Os restantes ficam para outro mês.</div></div>';
  else el.innerHTML='<div class="alert ala" style="margin-bottom:.9rem;">Nenhum item da lista cabe na margem segura ('+fmt(margemSegura)+'). Continua a poupar!</div>';
}

// ===== INVESTIR =====
function renderInvestir(){
  var el=g('investir-content');if(!el)return;
  el.innerHTML=[
    {t:'Porquê investir? O poder do tempo',cor:'#1E6348',
     c:'Investir não é para ricos — é para quem quer deixar de ser pobre. Quando guardas dinheiro debaixo do colchão, ele perde valor todos os anos por causa da inflação. Quando investes, o dinheiro trabalha por ti enquanto dormes. Com 32 anos e a começar agora, tens 30+ anos de crescimento à frente. Um investimento de 200€/mês a 7% de retorno anual vale 227.000€ aos 62 anos. Começar 10 anos mais tarde vale apenas 113.000€ — metade, por esperar 10 anos.'},
    {t:'O que é o risco real — e o que não é',cor:'#1B4F72',
     c:'O risco que mais assusta (perder tudo de um dia para o outro) só acontece em investimentos especulativos como criptomoedas ou acções individuais. Para o perfil que descreveste — não querer perder nada — há produtos que crescem de forma estável e nunca chegam a zero. O que vais aprender aqui é exactamente isso: onde guardar dinheiro que cresce sem te fazer perder o sono.'},
    {t:'Passo 1 — A reserva de emergência vem primeiro',cor:'#8B1F1F',
     c:'Antes de investir qualquer cêntimo, precisas de ter 3 a 6 meses de despesas fixas numa conta separada. Porquê? Porque se investires e de repente precisares do dinheiro, vais ter de vender na pior altura. A reserva é o que te permite investir com calma. Para vocês, com despesas fixas de ~1.500€/mês, a reserva ideal é entre 4.500€ e 9.000€.'},
    {t:'Passo 2 — O PPR: o investimento para começar em Portugal',cor:'#7A4A0A',
     c:'O PPR (Plano Poupança Reforma) é o produto mais adequado para o teu perfil em Portugal. Porquê? Tem benefício fiscal no IRS (podes deduzir até 400€/ano se tiveres menos de 35 anos), o capital está protegido em muitos produtos (não perdes o que metes), e cresce entre 2% a 5% ao ano dependendo do produto. Onde abrir: Bankinter, BPI, Caixa, ou plataformas como a Pension (mais moderna). Investe entre 50€ e 200€/mês de forma automática.'},
    {t:'Passo 3 — Fundos de índice (ETFs): para crescer a longo prazo',cor:'#3D2580',
     c:'Quando tiveres a reserva de emergência e um PPR a funcionar, o próximo nível são os ETFs (fundos de índice). Um ETF como o MSCI World compra automaticamente as 1.500 maiores empresas do mundo (Apple, Microsoft, Nestlé...). Nunca vai a zero porque seria preciso o mundo todo falir. Nos últimos 30 anos, este índice cresceu em média 10% ao ano. Podes investir através da Trading 212 ou DEGIRO (grátis, sem comissões altas). Começa com 50€/mês.'},
    {t:'Passo 4 — Casa própria: o objectivo dos 40 anos',cor:'#0E5E5E',
     c:'Com 32 anos e objectivo de ter casa própria aos 40, tens 8 anos. Para uma casa de 150.000€ em Portugal precisas de entrada de ~30.000€ (20%) mais custos de ~5.000€. Total: ~35.000€. Em 8 anos isso são ~365€/mês poupados. É exequível com o rendimento que tens se controlares as despesas variáveis. A estratégia: abre uma conta poupança separada só para a casa, transfere 365€ no dia do salário automaticamente, e não toques nessa conta. Coloca como objetivo nesta app e acompanha o progresso.'},
    {t:'O plano concreto para a Família Costa',cor:'#B5652A',
     c:'Com base no vosso perfil: Passo 1 agora — criar reserva de emergência de 4.500€ (poupando 200€/mês leva ~23 meses). Passo 2 em paralelo — abrir PPR com 50€/mês automaticamente. Passo 3 quando a reserva estiver feita — abrir conta na Trading 212 e investir 50€/mês em ETF MSCI World. Passo 4 sempre — poupança para casa de 200€/mês numa conta separada. Total mensal de investimento: 500€. Parece muito, mas é exactamente a diferença entre chegar aos 40 com e sem património.'}
  ].map(function(d){return'<div class="dica-card"><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;padding:2px 9px;border-radius:99px;display:inline-block;margin-bottom:.7rem;background:'+d.cor+'20;color:'+d.cor+';">Investir</div><div class="dica-title">'+d.t+'</div><div class="dica-body">'+d.c+'</div></div>';}).join('');
}

// ===== DICAS =====
var DICAS=[
  {n:'Básico',tag:'Primeiro passo',cor:'#1E6348',t:'Como funciona o dinheiro',c:'O dinheiro tem três destinos: gastas-o, poupas-o ou investes-o. O segredo não é ganhar mais — é controlar melhor o que já entra. Começa por saber exactamente quanto recebes e quanto gastas.'},
  {n:'Básico',tag:'Orçamento',cor:'#1B4F72',t:'A regra 50/30/20',c:'50% necessidades (renda, comida, transportes), 30% desejos (lazer, restaurantes, roupa), 20% poupança e investimento. Se o teu 50% está acima de 60%, as despesas fixas estão demasiado pesadas.'},
  {n:'Básico',tag:'Poupança',cor:'#7A4A0A',t:'Paga-te primeiro',c:'Quando o salário chega, antes de pagar qualquer conta, transfere logo um valor fixo para poupança. Mesmo que sejam 20€. Quem espera que sobre para poupar nunca poupa.'},
  {n:'Básico',tag:'Emergência',cor:'#8B1F1F',t:'A reserva de emergência',c:'3 a 6 meses de despesas fixas numa conta separada, intocável. Esta reserva separa uma avaria do carro de uma crise financeira. É a prioridade número 1 antes de qualquer outro objetivo.'},
  {n:'Básico',tag:'Compras impulsivas',cor:'#6B4226',t:'Como parar de comprar por impulso',c:'O impulso de comprar dura em média 20 minutos. A regra: quando quiseres comprar algo não planeado acima de 20€, espera 48 horas. Se ao fim desse tempo ainda quiseres e caber no orçamento, compra. 90% das vezes a vontade passa.'},
  {n:'Básico',tag:'Gastos invisíveis',cor:'#4A3A0A',t:'Os gastos que não sentes',c:'Um café por dia são 438€/ano. Um almoço fora em vez de marmita são 1.250€/ano. Não se trata de não ter prazer — é ter consciência do custo real. Regista tudo no Diário durante 30 dias e vai surpreender-te.'},
  {n:'Intermédio',tag:'Ciclo financeiro',cor:'#8B1F1F',t:'Como não ficar a zero a meio do mês',c:'O grande problema não é o início do mês — é a segunda semana. A solução: quando o salário chega, separa logo o dinheiro em envelopes mentais (renda, comida, transportes, poupança). O que fica é o que podes gastar. O alerta diário desta app diz-te exactamente quanto podes gastar por dia para chegar ao dia 5 com saldo verde.'},
  {n:'Intermédio',tag:'Dispersão',cor:'#3D2580',t:'O erro de querer tudo ao mesmo tempo',c:'Querer tudo de uma vez — casa, férias, carro novo, roupa, reserva — é o maior inimigo das finanças. O dinheiro dispersado não chega a lado nenhum. A solução: um objetivo de cada vez, com prazo e valor concreto. Quando o atingires, passa para o próximo. Um objetivo por trimestre transforma-se em 4 vitórias por ano.'},
  {n:'Intermédio',tag:'Alimentação',cor:'#1E6348',t:'Planear refeições poupa muito',c:'Planeia refeições de 5-7 dias antes do supermercado. Compra só o que está na lista. Esta prática reduz o desperdício em 40% e baixa significativamente a conta mensal.'},
  {n:'Intermédio',tag:'Subscrições',cor:'#4A3A6B',t:'A armadilha das subscrições',c:'Lista todas as subscrições mensais. Cancela as que não usaste pelo menos 3 vezes na última semana. A maioria das famílias descobre 30-80€/mês em subscrições esquecidas.'},
  {n:'Avançado',tag:'Casa própria',cor:'#0E5E5E',t:'Estratégia para comprar casa até aos 40',c:'Para uma casa de 150.000€ precisas de ~35.000€ entre entrada e custos. Em 8 anos isso é 365€/mês numa conta separada. Cria já o objetivo "Casa Própria" nesta app com meta 35.000€ e prazo 2032. Cada mês que passa sem poupar é um mês mais distante da casa.'},
  {n:'Avançado',tag:'Património',cor:'#1A3F6F',t:'Como construir património aos 32 anos',c:'Com 32 anos e família de 4, o caminho é: 1) Reserva emergência (4.500€) 2) PPR automático (50€/mês) 3) Poupança casa (200-365€/mês) 4) ETF MSCI World quando a reserva estiver feita (50€/mês). Em 10 anos com consistência, terás casa própria, reserva sólida e investimentos a crescer.'}
];
function renderDicas(){var el=g('dicas-content');if(!el)return;var niv=['Básico','Intermédio','Avançado'],cor={Básico:'var(--green)',Intermédio:'var(--amber)',Avançado:'var(--red)'},html='';niv.forEach(function(n){html+='<div style="font-size:13px;font-weight:600;color:'+cor[n]+';margin:1.2rem 0 .5rem;text-transform:uppercase;letter-spacing:.06em;">— '+n+' —</div>';DICAS.filter(function(d){return d.n===n;}).forEach(function(d){html+='<div class="dica-card"><span class="dica-tag" style="background:'+d.cor+'20;color:'+d.cor+';">'+d.tag+'</span><div class="dica-title">'+d.t+'</div><div class="dica-body">'+d.c+'</div></div>';});});el.innerHTML=html;}

// ===== MENTOR IA =====
var MENTOR_HISTORY=[];
var MENTOR_SUGS=['Como posso parar de comprar por impulso?','Quanto devo poupar por mês para ter casa até aos 40?','Como começar a investir sem risco?','Estou a gastar demasiado — o que faço?','Como organizar o orçamento da família?','O meu saldo está sempre a zero — porquê?'];
function renderMentorSugs(){
  var el=g('mentor-sugs');if(!el)return;
  el.innerHTML=MENTOR_SUGS.map(function(s){return'<button class="btn bg bsm" onclick="mentorSug(\''+s.replace(/'/g,"\\'")+'\')" style="font-size:12px;">'+s+'</button>';}).join('');
}
function mentorSug(txt){var inp=g('mentor-input');if(inp)inp.value=txt;sendMentor();}

function sendMentor(){
  var inp=g('mentor-input');if(!inp||!inp.value.trim())return;
  var userMsg=inp.value.trim();inp.value='';
  var msgs=g('mentor-msgs');if(!msgs)return;
  msgs.innerHTML+='<div style="background:var(--surface2);border-radius:10px 10px 2px 10px;padding:10px 14px;font-size:13px;margin-bottom:8px;align-self:flex-end;max-width:85%;margin-left:auto;">'+userMsg+'</div>';
  msgs.innerHTML+='<div id="mentor-thinking" style="font-size:13px;color:var(--t3);padding:8px 0;">A pensar...</div>';
  var wrap=g('mentor-chat-wrap');if(wrap)wrap.scrollTop=wrap.scrollHeight;
  // Build context from user data
  var m=cur();
  var tIn=entradas.filter(function(e){return e.tipo!=='prevista'&&mk(e.data)===m;}).reduce(function(s,e){return s+e.valor;},0);
  var tD=despesas.filter(function(d){return mk(d.data)===m;}).reduce(function(s,d){return s+d.valor;},0);
  var tDi=diario.filter(function(d){return mk(d.data)===m;}).reduce(function(s,d){return s+d.valor;},0);
  var saldo=tIn-tD-tDi;
  var ci=cycleInfo();
  var objsStr=objetivos.map(function(o){return o.nome+' (meta:'+fmt(o.meta)+', poupado:'+fmt(o.atual||0)+')';}).join(', ')||'nenhum';
  var notasStr=notas.filter(function(n){return n.tipo==='mes';}).map(function(n){return n.texto;}).join('; ')||'nenhuma';
  var systemPrompt='És um mentor financeiro pessoal e de confiança para uma família portuguesa de 4 pessoas (2 adultos, 2 crianças). A pessoa tem 32 anos, objectivo de ter casa própria e criar património até aos 40 anos. Problema principal: compras impulsivas e não conseguir poupar. Perfil de risco: muito baixo, não quer perder dinheiro.\n\nDados actuais deste mês:\n- Entradas: '+fmt(tIn)+'\n- Despesas fixas: '+fmt(tD)+'\n- Gastos diários: '+fmt(tDi)+'\n- Saldo actual: '+fmt(saldo)+'\n- Dias para o dia 5: '+ci.daysLeft+'\n- Objetivos: '+objsStr+'\n- Notas próximo mês: '+notasStr+'\n\nResponde em português de Portugal. Sê directo, caloroso e prático. Não uses bullet points em excesso. Máximo 150 palavras. Faz UMA pergunta de acompanhamento no final para manter o diálogo e ajudar a pessoa a progredir.';
  MENTOR_HISTORY.push({role:'user',content:userMsg});
  var messages=MENTOR_HISTORY.slice(-8);// keep last 8 exchanges
  fetch(API+'/mentor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:messages,systemPrompt:systemPrompt})})
    .then(function(r){return r.json();})
    .then(function(data){
      var txt=data.text||'Não consegui responder. Tenta novamente.';
      MENTOR_HISTORY.push({role:'assistant',content:txt});
      var thinking=g('mentor-thinking');if(thinking)thinking.remove();
      msgs.innerHTML+='<div style="background:var(--amber-bg);border:1px solid #e8c08a;border-radius:2px 10px 10px 10px;padding:10px 14px;font-size:13px;margin-bottom:8px;max-width:90%;line-height:1.6;">'+txt.replace(/\n/g,'<br>')+'</div>';
      if(wrap)wrap.scrollTop=wrap.scrollHeight;
    })
    .catch(function(){
      var thinking=g('mentor-thinking');if(thinking)thinking.remove();
      msgs.innerHTML+='<div style="color:var(--red-t);font-size:13px;padding:8px 0;">Erro ao ligar ao mentor. Tenta novamente.</div>';
    });
}
// Enter to send in mentor
document.addEventListener('DOMContentLoaded',function(){var inp=g('mentor-input');if(inp)inp.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMentor();}});});

// ===== RESUMO =====
function renderResumo(){
  var m=g('r-month')?g('r-month').value:cur(),isCur=m===cur();
  var entIn=entradas.filter(function(e){return e.tipo!=='prevista'&&mk(e.data)===m;}),entPrev=entradas.filter(function(e){return e.tipo==='prevista'&&mk(e.data)===m;});
  var despIn=despesas.filter(function(d){return mk(d.data)===m;}),diIn=diario.filter(function(d){return mk(d.data)===m;});
  var tIn=entIn.reduce(function(s,e){return s+e.valor;},0),tPrev=entPrev.reduce(function(s,e){return s+e.valor;},0);
  var tD=despIn.reduce(function(s,d){return s+d.valor;},0),tDi=diIn.reduce(function(s,d){return s+d.valor;},0);
  var tOut=tD+tDi,saldo=tIn-tOut,taxa=tIn>0?Math.round((Math.max(saldo,0)/tIn)*100):0;
  var sc=saldoClass(saldo);

  // MENTOR PROACTIVE MESSAGE
  if(isCur&&g('r-mentor-msg')){
    var ci=cycleInfo();
    var maxD=ci.daysLeft>0?Math.max(0,Math.floor(saldo/ci.daysLeft)):0;
    var msg='';
    if(saldo<0)msg='<div class="alert alr">🚨 <strong>Mentor:</strong> A conta está em vermelho. Não faças mais nenhuma despesa não essencial até ao dia 5. Fala comigo no separador Mentor para encontrar onde cortar.</div>';
    else if(saldo<100)msg='<div class="alert alr">🔴 <strong>Mentor:</strong> Saldo de '+fmt(saldo)+' — estás em zona de perigo. Só '+fmt(maxD)+'/dia até ao dia 5. Nada de compras esta semana.</div>';
    else if(saldo<150)msg='<div class="alert ala">🟠 <strong>Mentor:</strong> Saldo de '+fmt(saldo)+' — zona de atenção. Podes gastar até '+fmt(maxD)+'/dia. Evita qualquer compra não planeada.</div>';
    else if(taxa>=20)msg='<div class="alert alg">🟢 <strong>Mentor:</strong> Excelente! '+taxa+'% de poupança este mês. Considera mover parte do saldo para um objetivo ou poupança antes de o gastar.</div>';
    else if(taxa>0)msg='<div class="alert ala">🟠 <strong>Mentor:</strong> Taxa de poupança de '+taxa+'% — podes melhorar. Tenta identificar uma despesa para cortar este mês.</div>';
    g('r-mentor-msg').innerHTML=msg;
  }

  // COUNTDOWN
  if(isCur&&g('r-countdown')){
    var ci2=cycleInfo(),maxD2=ci2.daysLeft>0?Math.max(0,Math.floor(saldo/ci2.daysLeft)):0,ws=getWeekSpend();
    var wc=saldo<100?'var(--red)':saldo<150?'var(--amber)':'var(--t)';
    g('r-countdown').innerHTML='<div class="countdown" style="background:'+wc+';">'
      +'<div><div class="cd-big">'+ci2.daysLeft+' dias para o dia 5</div><div class="cd-sub">'+saldoEmoji(saldo)+' Saldo: <strong>'+fmt(saldo)+'</strong></div></div>'
      +'<div style="text-align:right;"><div style="font-size:14px;font-weight:500;">Máx. '+fmt(maxD2)+'/dia</div><div style="font-size:12px;opacity:.7;">Esta semana: '+fmt(ws)+'</div></div></div>';
  } else if(g('r-countdown')&&!isCur)g('r-countdown').innerHTML='';

  // ALERTS
  var alts='';
  if(tIn===0)alts+='<div class="alert ala">Sem entradas para '+mlbl(m)+'. Regista no separador Entradas.</div>';
  if(saldo<0&&tIn>0)alts+='<div class="alert alr">Conta em <strong>VERMELHO</strong>: gastas mais '+fmt(Math.abs(saldo))+' do que recebes!</div>';
  else if(saldo<100&&tIn>0)alts+='<div class="alert alr">🔴 Saldo abaixo de 100€ — zona de perigo!</div>';
  else if(saldo<150&&tIn>0)alts+='<div class="alert ala">🟠 Saldo entre 100-150€ — atenção!</div>';
  else if(taxa>=20&&tIn>0)alts+='<div class="alert alg">🟢 Óptimo! '+taxa+'% de poupança.</div>';
  if(tPrev>0)alts+='<div class="alert alp">'+fmt(tPrev)+' em entradas previstas — ver sugestões em Entradas.</div>';
  var dpp=despIn.filter(function(d){return!d.pago;});if(dpp.length>0){var vpp=dpp.reduce(function(s,d){return s+d.valor;},0);alts+='<div class="alert ala">'+dpp.length+' despesa(s) por pagar: <strong>'+fmt(vpp)+'</strong>.</div>';}
  if(g('r-alerts'))g('r-alerts').innerHTML=alts;

  // METRICS
  if(g('r-metrics'))g('r-metrics').innerHTML=
    '<div class="metric"><div class="ml">Entradas</div><div class="mv g">'+fmt(tIn)+'</div></div>'
    +'<div class="metric"><div class="ml">Despesas</div><div class="mv r">'+fmt(tD)+'</div></div>'
    +'<div class="metric"><div class="ml">Diário</div><div class="mv r">'+fmt(tDi)+'</div></div>'
    +'<div class="metric"><div class="ml">Saldo</div><div class="mv '+sc+'">'+fmt(saldo)+'</div></div>'
    +'<div class="metric"><div class="ml">Poupança</div><div class="mv '+(taxa>=20?'g':taxa>=10?'a':'r')+'">'+taxa+'%</div></div>'
    +(tPrev>0?'<div class="metric"><div class="ml">Previstas</div><div class="mv" style="color:var(--purple);">'+fmt(tPrev)+'</div></div>':'');

  var pD=tIn>0?Math.min(Math.round((tD/tIn)*100),100):0,pDi=tIn>0?Math.min(Math.round((tDi/tIn)*100),100):0,pT=pD+pDi;
  if(g('r-spendbar'))g('r-spendbar').innerHTML='<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;"><span>Gasto: <strong>'+fmt(tOut)+'</strong></span><span style="color:'+(pT>90?'var(--red)':'var(--t2)')+';">'+pT+'%</span></div><div class="pbar" style="height:12px;"><div style="display:flex;height:100%;"><div style="width:'+pD+'%;background:var(--red);opacity:.75;"></div><div style="width:'+pDi+'%;background:var(--amber);opacity:.85;"></div></div></div><div style="display:flex;gap:1rem;margin-top:5px;font-size:12px;color:var(--t2);">'+dot('Habitação',9)+' Fixas '+pD+'% · Diário '+pDi+'%'+(saldo>=0?' · <span style="color:'+CAT['Alimentação']+'">Sobra '+fmt(saldo)+'</span>':' · <span style="color:var(--red)">Défice '+fmt(Math.abs(saldo))+'</span>')+'</div>';

  var eHtml='';
  entIn.filter(function(e){return e.tipo==='salario';}).forEach(function(e){eHtml+='<div class="li"><div class="ll"><div class="ln">'+e.desc+'</div><div class="ls">'+e.data+'</div></div><div class="lr"><span class="am ai">+'+fmt(e.valor)+'</span></div></div>';});
  entIn.filter(function(e){return e.tipo==='caf';}).forEach(function(e){eHtml+='<div class="li"><div class="ll"><div class="ln">'+e.desc+'</div><div class="ls">'+e.data+'</div></div><div class="lr"><span class="am ai">+'+fmt(e.valor)+'</span></div></div>';});
  entPrev.forEach(function(e){eHtml+='<div class="li"><div class="ll"><div class="ln">'+e.desc+' <span style="font-size:11px;color:var(--purple-t);">(prevista)</span></div><div class="ls">'+(e.nota||e.data)+'</div></div><div class="lr"><span class="am apv">~'+fmt(e.valor)+'</span></div></div>';});
  if(g('r-entradas'))g('r-entradas').innerHTML=eHtml||'<div style="font-size:13px;color:var(--t3);">Sem entradas.</div>';

  var byCat={};[...despIn,...diIn].forEach(function(d){byCat[d.cat]=(byCat[d.cat]||0)+d.valor;});
  var cHtml='';Object.entries(byCat).sort(function(a,b){return b[1]-a[1];}).forEach(function(e){var cat=e[0],val=e[1],p=tIn>0?Math.min(Math.round((val/tIn)*100),100):0,c=CAT[cat]||'#888';cHtml+='<div style="margin-bottom:9px;"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;align-items:center;"><span style="display:flex;align-items:center;gap:5px;">'+dot(cat,9)+'<span>'+cat+'</span></span><span style="color:var(--t2);">'+fmt(val)+' ('+p+'%)</span></div><div class="pbar"><div class="pfill" style="width:'+p+'%;background:'+c+';"></div></div></div>';});
  if(g('r-cats'))g('r-cats').innerHTML=cHtml||'<div style="font-size:13px;color:var(--t3);">Sem despesas.</div>';

  // DAILY with check
  var rec=[...diIn].sort(function(a,b){return b.data.localeCompare(a.data);}).slice(0,6);
  if(g('r-daily'))g('r-daily').innerHTML=rec.length?rec.map(function(d){return'<div class="li" style="'+(d.pago?'opacity:.5;':'')+'"><div class="ll"><div class="ln" style="'+(d.pago?'text-decoration:line-through;':'')+'">'+d.desc+'</div><div class="ls" style="display:flex;align-items:center;gap:4px;">'+dot(d.cat,8)+' '+d.cat+' · '+d.data+'</div></div><div class="lr"><span class="am ao">-'+fmt(d.valor)+'</span><button class="btn-check '+(d.pago?'checked':'')+'" onclick="togglePagoDiar(\''+d.id+'\')" style="font-size:10px;">'+(d.pago?'✓':'Saiu?')+'</button></div></div>';}).join('')+'<div style="font-size:12px;color:var(--t3);padding:.4rem 0;cursor:pointer;" onclick="go(\'diario\')">Ver tudo →</div>':'<div style="font-size:13px;color:var(--t3);">Sem registos diários.</div>';

  var oH=objetivos.length?objetivos.map(function(obj){var pct=obj.meta>0?Math.min(Math.round(((obj.atual||0)/obj.meta)*100),100):0;return'<div style="margin-bottom:11px;"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;"><span>'+obj.nome+'</span><span class="pill '+(pct>=100?'pg':pct>=50?'pb':'pa')+'">'+pct+'%</span></div><div class="pbar"><div class="pfill" style="width:'+pct+'%;background:'+(pct>=100?'var(--green)':pct>=50?'#1A3F6F':'var(--accent)')+';"></div></div><div style="font-size:12px;color:var(--t3);margin-top:2px;">'+fmt(obj.atual||0)+' de '+fmt(obj.meta)+(obj.prazo?' · '+obj.prazo:'')+'</div></div>';}).join(''):'<div style="font-size:13px;color:var(--t3);">Sem objetivos.</div>';
  if(g('r-objs'))g('r-objs').innerHTML=oH;

  // Desejos no resumo com semáforo
  var ci3=cycleInfo(),maxD3=ci3.daysLeft>0?Math.max(0,Math.floor(saldo/ci3.daysLeft)):0;
  var pend=desejos.filter(function(d){return!d.comprado;});
  var wH='';
  if(!pend.length)wH='<div style="font-size:13px;color:var(--t3);">Sem itens na lista.</div>';
  else if(saldo<200||ci3.daysLeft<=10)wH='<div class="alert ala">Faltam '+ci3.daysLeft+' dias para o dia 5 e saldo é '+fmt(saldo)+'. Adia as compras.</div>';
  else{var mg=Math.max(saldo-200,0)*0.3,order2={alta:0,media:1,baixa:2},m2=[...pend].sort(function(a,b){return order2[a.prio]-order2[b.prio];}).find(function(w){return w.preco<=mg;});if(m2)wH='<div class="alert alg" style="margin-bottom:.5rem;">Com margem de '+fmt(mg)+'€ podes considerar: <strong>'+m2.nome+'</strong> ('+fmt(m2.preco)+'). Só este — os outros ficam para quando tiveres mais folga.</div>';else wH='<div class="alert ala">Nenhum item cabe na margem segura de '+fmt(mg)+'.</div>';}
  if(g('r-wishes'))g('r-wishes').innerHTML=wH;

  renderNotas();
}

// ===== REMINDER =====
function checkReminder(){var last=localStorage.getItem('cf_last_reg'),tod=today();if(last===tod)return;var b=document.createElement('div');b.style.cssText='position:fixed;bottom:70px;right:1rem;left:1rem;max-width:400px;margin:0 auto;background:var(--t);color:#fff;border-radius:var(--rlg);padding:.9rem 1.2rem;z-index:999;display:flex;justify-content:space-between;align-items:center;gap:1rem;box-shadow:0 4px 20px rgba(0,0,0,.3);';b.innerHTML='<div><div style="font-weight:600;">Já registaste os gastos de hoje?</div><div style="font-size:12px;opacity:.65;">Abre o Diário!</div></div><button onclick="go(\'diario\');this.closest(\'[style]\').remove();localStorage.setItem(\'cf_last_reg\',\''+tod+'\');" style="background:var(--accent);color:#fff;border:none;border-radius:5px;padding:7px 12px;font-weight:600;cursor:pointer;font-size:13px;">Registar</button>';document.body.appendChild(b);setTimeout(function(){if(b.parentElement)b.remove();},12000);}
document.addEventListener('visibilitychange',function(){if(!document.hidden&&USER_KEY)checkReminder();});
function openM(id){g(id).classList.add('on');}
function closeM(id){g(id).classList.remove('on');}
function allMonths(){var s=new Set(),n=new Date();for(var i=5;i>=0;i--){var d=new Date(n.getFullYear(),n.getMonth()-i,1);s.add(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));}[...entradas,...despesas,...diario].forEach(function(x){if(x.data)s.add(mk(x.data));});return[...s].sort();}



// ===== MOBILE MONTH INPUT =====
function setMobileMonth(id){var e=g(id);if(e&&!e.value){var n=new Date();e.value=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0');}}

// ===== CASA PORTUGAL =====
var bocaData=[],bocaConfig={total:0};

function bocaSaveAll(){
  lsSave();
  try{localStorage.setItem(LS_KEY+'_boca',JSON.stringify({data:bocaData,config:bocaConfig}));}catch(e){}
  fetch(API+'/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:USER_KEY+'_boca',data:{data:bocaData,config:bocaConfig}})}).catch(function(){});
}
function bocaLoadAll(){
  try{
    var r=localStorage.getItem(LS_KEY+'_boca');
    if(r){var p=JSON.parse(r);bocaData=p.data||[];bocaConfig=p.config||{total:0};}
  }catch(e){}
  fetch(API+'/load',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:USER_KEY+'_boca'})})
    .then(function(r){return r.ok?r.json():null;})
    .then(function(res){if(res&&res.data){bocaData=res.data.data||bocaData;bocaConfig=res.data.config||bocaConfig;renderBoca();}})
    .catch(function(){});
}

function saveBocaConfig(){
  var val=parseFloat(g('boca-total').value)||0;
  if(val<=0){alert('Insere o valor total da casa.');return;}
  bocaConfig.total=val;
  bocaSaveAll();renderBoca();
  alert('Valor total da casa guardado: '+fmt(val));
}

function addBoca(){
  var mes=g('boca-mes').value,val=parseFloat(g('boca-val').value)||0,pago=g('boca-pago').value,nota=g('boca-nota').value.trim();
  if(!mes){alert('Selecciona o mês.');return;}
  bocaData=bocaData.filter(function(b){return b.mes!==mes;});
  bocaData.push({id:uid(),mes:mes,valor:val,pago:pago,nota:nota});
  bocaData.sort(function(a,b){return a.mes.localeCompare(b.mes);});
  g('boca-val').value='';g('boca-nota').value='';
  bocaSaveAll();renderBoca();
}
function delBoca(id){bocaData=bocaData.filter(function(b){return b.id!==id;});bocaSaveAll();renderBoca();}

function renderBoca(){
  var el=g('lst-boca');if(!el)return;
  // Set config input if value exists
  if(bocaConfig.total>0){var ti=g('boca-total');if(ti&&!ti.value)ti.value=bocaConfig.total;}
  var totalPago=bocaData.reduce(function(s,b){return s+(b.pago!=='nao'?b.valor:0);},0);
  var totalCasa=bocaConfig.total||0;
  var falta=Math.max(totalCasa-totalPago,0);
  var pct=totalCasa>0?Math.min(Math.round((totalPago/totalCasa)*100),100):0;
  var rc=g('boca-resumo-card');
  if(rc){
    rc.innerHTML='<div class="ct">Progresso — Casa Portugal</div>'
      +(totalCasa>0?
        '<div class="metrics" style="margin-bottom:.7rem;">'
        +'<div class="metric"><div class="ml">Valor total</div><div class="mv">'+fmt(totalCasa)+'</div></div>'
        +'<div class="metric"><div class="ml">Já paguei</div><div class="mv g">'+fmt(totalPago)+'</div></div>'
        +'<div class="metric"><div class="ml">Ainda falta</div><div class="mv '+(falta>0?'r':'g')+'">'+fmt(falta)+'</div></div>'
        +'<div class="metric"><div class="ml">Pago</div><div class="mv '+(pct>=100?'g':'a')+'">'+pct+'%</div></div>'
        +'</div>'
        +'<div class="pbar" style="margin-bottom:.5rem;height:12px;"><div class="pfill" style="width:'+pct+'%;background:var(--green);"></div></div>'
        +'<div style="font-size:12px;color:var(--t2);">'+bocaData.length+' meses registados'+(bocaData.filter(function(b){return b.pago==='nao';}).length>0?' · <span style="color:var(--red);">'+bocaData.filter(function(b){return b.pago==='nao';}).length+' não pagos</span>':'')+'</div>'
        :'<div class="alert ala">Define primeiro o valor total da casa no campo acima.</div>');
  }
  if(!bocaData.length){el.innerHTML='<div style="font-size:13px;color:var(--t3);">Sem registos. Adiciona os pagamentos desde 2023, mês a mês.</div>';return;}
  var sorted=[...bocaData].sort(function(a,b){return b.mes.localeCompare(a.mes);});
  var html='';
  sorted.forEach(function(b){
    var cor=b.pago==='sim'?'var(--green)':b.pago==='parcial'?'var(--amber)':'var(--red)';
    var emoji=b.pago==='sim'?'✓':b.pago==='parcial'?'~':'✗';
    html+='<div class="li"><div class="ll"><div class="ln" style="display:flex;align-items:center;gap:6px;"><span style="color:'+cor+';font-weight:700;font-size:15px;">'+emoji+'</span>'+b.mes+'</div>'+(b.nota?'<div class="ls">'+b.nota+'</div>':'')+'</div><div class="lr"><span class="am" style="color:'+cor+';">'+fmt(b.valor)+'</span><button class="btn bd bxs" onclick="delBoca(''+b.id+'')">×</button></div></div>';
  });
  el.innerHTML=html;
}

// ===== RENDA PORTUGAL =====
var rendaData=[],rendaConfig={esperadoMensal:0};

function rendaSaveAll(){
  lsSave();
  try{localStorage.setItem(LS_KEY+'_renda',JSON.stringify({data:rendaData,config:rendaConfig}));}catch(e){}
  fetch(API+'/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:USER_KEY+'_renda',data:{data:rendaData,config:rendaConfig}})}).catch(function(){});
}
function rendaLoadAll(){
  try{
    var r=localStorage.getItem(LS_KEY+'_renda');
    if(r){var p=JSON.parse(r);rendaData=p.data||[];rendaConfig=p.config||{esperadoMensal:0};}
  }catch(e){}
  fetch(API+'/load',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:USER_KEY+'_renda'})})
    .then(function(r){return r.ok?r.json():null;})
    .then(function(res){if(res&&res.data){rendaData=res.data.data||rendaData;rendaConfig=res.data.config||rendaConfig;renderRenda();}})
    .catch(function(){});
}

function addRenda(){
  var mes=g('renda-mes').value,esp=parseFloat(g('renda-esp').value)||0,rec=parseFloat(g('renda-rec').value)||0,pago=g('renda-pago').value,nota=g('renda-nota').value.trim();
  if(!mes){alert('Selecciona o mês.');return;}
  rendaData=rendaData.filter(function(r){return r.mes!==mes;});
  rendaData.push({id:uid(),mes:mes,esperado:esp,recebido:rec,pago:pago,nota:nota});
  rendaData.sort(function(a,b){return a.mes.localeCompare(b.mes);});
  g('renda-esp').value='';g('renda-rec').value='';g('renda-nota').value='';
  rendaSaveAll();renderRenda();
}
function delRenda(id){rendaData=rendaData.filter(function(r){return r.id!==id;});rendaSaveAll();renderRenda();}

function renderRenda(){
  var el=g('lst-renda');if(!el)return;
  var totalEsp=rendaData.reduce(function(s,r){return s+r.esperado;},0);
  var totalRec=rendaData.reduce(function(s,r){return s+r.recebido;},0);
  var emFalta=totalEsp-totalRec;
  var naoPagos=rendaData.filter(function(r){return r.pago==='nao';});
  var rc=g('renda-resumo-card');
  if(rc&&rendaData.length){
    rc.innerHTML='<div class="ct">Resumo — Renda Portugal</div>'
      +'<div class="metrics" style="margin-bottom:0;">'
      +'<div class="metric"><div class="ml">Total esperado</div><div class="mv">'+fmt(totalEsp)+'</div></div>'
      +'<div class="metric"><div class="ml">Total recebido</div><div class="mv g">'+fmt(totalRec)+'</div></div>'
      +'<div class="metric"><div class="ml">Em falta</div><div class="mv '+(emFalta>0?'r':'g')+'">'+fmt(emFalta)+'</div></div>'
      +'<div class="metric"><div class="ml">Não pagos</div><div class="mv '+(naoPagos.length>0?'r':'g')+'">'+naoPagos.length+'</div></div>'
      +'</div>'
      +(naoPagos.length>0?'<div class="alert alr" style="margin-top:.7rem;">Meses não pagos: '+naoPagos.map(function(r){return r.mes;}).join(', ')+'</div>':'');
  }
  if(!rendaData.length){el.innerHTML='<div style="font-size:13px;color:var(--t3);">Sem registos. Adiciona as rendas mês a mês.</div>';return;}
  var sorted=[...rendaData].sort(function(a,b){return b.mes.localeCompare(a.mes);});
  var html='';
  sorted.forEach(function(r){
    var cor=r.pago==='sim'?'var(--green)':r.pago==='parcial'?'var(--amber)':'var(--red)';
    var emoji=r.pago==='sim'?'✓':r.pago==='parcial'?'~':'✗';
    var diff=r.recebido-r.esperado;
    html+='<div class="li"><div class="ll"><div class="ln" style="display:flex;align-items:center;gap:6px;"><span style="color:'+cor+';font-weight:700;font-size:15px;">'+emoji+'</span>'+r.mes+'</div>'
      +'<div class="ls">Esperado: '+fmt(r.esperado)+' · Recebido: '+fmt(r.recebido)+(diff<0?' · <span style="color:var(--red);">Falta '+fmt(Math.abs(diff))+'</span>':'')+(r.nota?' · <em>'+r.nota+'</em>':'')+'</div></div>'
      +'<div class="lr"><span class="am" style="color:'+cor+';">'+fmt(r.recebido)+'</span><button class="btn bd bxs" onclick="delRenda(''+r.id+'')">×</button></div></div>';
  });
  el.innerHTML=html;
}


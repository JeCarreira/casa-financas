'use strict';
var API='/api',USER_KEY='',LS_KEY='';
var entradas=[],despesas=[],diario=[],objetivos=[],desejos=[],templates=[],desafios=[],notas=[];
var bocaData=[],bocaConfig={total:0},rendaData=[];
var NAV_OPEN=false,MENTOR_HISTORY=[];
var CAT={'Habitação':'#1B4F72','Alimentação':'#1E6348','Transportes':'#7A4A0A','Filhos':'#3D2580','Saúde':'#8B1F1F','Lazer':'#0E5E5E','Serviços':'#4A3A6B','Vestuário':'#5C3D1E','Café / Bar':'#6B4226','Gasolina':'#4A3A0A','Compras':'#1A4A1A','Criança':'#3D2580','Farmácia':'#8B1F1F','Outro':'#5C5C5C'};
function g(id){return document.getElementById(id);}
function fmt(n){return(Math.round((n||0)*100)/100).toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';}
function today(){return new Date().toISOString().split('T')[0];}
function mk(d){return d?d.slice(0,7):'';}
function cur(){var n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0');}
function mlbl(k){if(!k)return '';var p=k.split('-');return['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][+p[1]-1]+' '+p[0];}
function uid(){return 'id'+Date.now()+'x'+Math.floor(Math.random()*1e8);}
function setTd(id){var e=g(id);if(e&&!e.value)e.value=today();}
function setMI(id){var e=g(id);if(e&&!e.value){var n=new Date();e.value=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0');}}
function dot(cat,sz){sz=sz||10;var c=CAT[cat]||'#888';return'<span style="display:inline-block;width:'+sz+'px;height:'+sz+'px;border-radius:50%;background:'+c+';flex-shrink:0;vertical-align:middle;margin-right:3px;"></span>';}
function saldoCls(v){return v>=150?'saldo-verde':v>=100?'saldo-laranja':'saldo-vermelho';}
function saldoEmoji(v){return v>=150?'🟢':v>=100?'🟠':'🔴';}


// Helper: returns true for any real (non-prevista) entry - supports old and new data
function isEntradaReal(e){ return e.tipo==='entrada'||e.tipo==='salario'||e.tipo==='caf'; }

function getData(){return{entradas:entradas,despesas:despesas,diario:diario,objetivos:objetivos,desejos:desejos,templates:templates,desafios:desafios,notas:notas,_ts:Date.now()};}
function applyData(d){if(!d)return;entradas=d.entradas||[];despesas=d.despesas||[];diario=d.diario||[];objetivos=d.objetivos||[];desejos=d.desejos||[];desafios=d.desafios||[];notas=d.notas||[];templates=(d.templates&&d.templates.length)?d.templates:defaultTpl();}
function defaultTpl(){return[{id:'t1',nome:'Renda',valor:700,cat:'Habitação',ativo:true,dia:1,recorrente:true},{id:'t2',nome:'Electricidade + água + gás',valor:120,cat:'Serviços',ativo:true,dia:15,recorrente:true},{id:'t3',nome:'Internet + telemóvel',valor:60,cat:'Serviços',ativo:true,dia:10,recorrente:true},{id:'t4',nome:'Supermercado',valor:400,cat:'Alimentação',ativo:true,dia:5,recorrente:true},{id:'t5',nome:'Gasolina',valor:150,cat:'Transportes',ativo:true,dia:5,recorrente:true},{id:'t6',nome:'Escola / filhos',valor:200,cat:'Filhos',ativo:true,dia:1,recorrente:true}];}

function lsSave(){if(!LS_KEY)return;var s=JSON.stringify(getData());try{localStorage.setItem(LS_KEY,s);}catch(e){}try{sessionStorage.setItem(LS_KEY,s);}catch(e){}try{localStorage.setItem(LS_KEY+'_boca',JSON.stringify({data:bocaData,config:bocaConfig}));}catch(e){}try{localStorage.setItem(LS_KEY+'_renda',JSON.stringify(rendaData));}catch(e){}}
function lsLoad(){if(!LS_KEY)return null;try{var r=localStorage.getItem(LS_KEY)||sessionStorage.getItem(LS_KEY);if(r)return JSON.parse(r);}catch(e){}return null;}
function loadBocaRenda(){try{var b=localStorage.getItem(LS_KEY+'_boca');if(b){var p=JSON.parse(b);bocaData=p.data||[];bocaConfig=p.config||{total:0};}}catch(e){}try{var r=localStorage.getItem(LS_KEY+'_renda');if(r){var rd=JSON.parse(r);rendaData=Array.isArray(rd)?rd:(rd.data||[]);}}catch(e){}}
function setSS(s){var d=g('sync-dot'),l=g('sync-lbl');if(!d)return;d.className='dot'+(s==='syncing'?' syncing':s==='error'?' error':'');if(l)l.textContent=s==='syncing'?'a guardar...':s==='error'?'local':'guardado';}
function saveAll(){
  if(!USER_KEY)return;
  lsSave();setSS('syncing');
  fetch(API+'/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:USER_KEY,data:getData()})}).then(function(r){setSS(r.ok?'saved':'error');}).catch(function(){setSS('error');});
  fetch(API+'/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:USER_KEY+'boca',data:{data:bocaData,config:bocaConfig}})}).catch(function(){});
  fetch(API+'/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:USER_KEY+'renda',data:rendaData})}).catch(function(){});
}
function loadAndStart(){
  var local=lsLoad();
  if(local)applyData(local);else templates=defaultTpl();
  loadBocaRenda();
  populateSels();renderResumo();renderTpl();renderDesafiosSugeridos();renderInvestir();renderDicas();renderMentorSugs();
  setTimeout(checkReminder,2500);
  fetch(API+'/load',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:USER_KEY})}).then(function(r){return r.ok?r.json():null;}).then(function(res){if(!res||!res.data)return;var lt=local?local._ts||0:0,ct=res.data._ts||0;if(ct>lt){applyData(res.data);lsSave();populateSels();reRender();}}).catch(function(){});
  var bocaKeys=[USER_KEY+'boca', USER_KEY+'_boca'];
  (function tryNextBocaKey(keys,i){
    if(i>=keys.length)return;
    fetch(API+'/load',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:keys[i]})})
      .then(function(r){return r.ok?r.json():null;})
      .then(function(res){
        if(res&&res.data){
          var d=res.data.data||res.data||[];
          if(Array.isArray(d)&&d.length>bocaData.length){bocaData=d;bocaConfig=res.data.config||bocaConfig;lsSave();var el=document.querySelector('.page.on');if(el&&el.id==='page-boca')renderBoca();}
          else if(!Array.isArray(d)){bocaData=res.data.data||bocaData;bocaConfig=res.data.config||bocaConfig;lsSave();}
        } else { tryNextBocaKey(keys,i+1); }
      }).catch(function(){tryNextBocaKey(keys,i+1);});
  })(bocaKeys,0);
  // Try multiple key variants to recover renda data
  var rendaKeys=[USER_KEY+'renda', USER_KEY+'_renda'];
  (function tryNextRendaKey(keys,i){
    if(i>=keys.length)return;
    fetch(API+'/load',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:keys[i]})})
      .then(function(r){return r.ok?r.json():null;})
      .then(function(res){
        if(res&&res.data&&((Array.isArray(res.data)&&res.data.length>0)||(res.data.data&&res.data.data.length>0))){
          var rd=Array.isArray(res.data)?res.data:(res.data.data||[]);
          if(rd.length>rendaData.length){rendaData=rd;lsSave();var el=document.querySelector('.page.on');if(el&&el.id==='page-renda')renderRenda();}
        } else { tryNextRendaKey(keys,i+1); }
      }).catch(function(){tryNextRendaKey(keys,i+1);});
  })(rendaKeys,0);
}

function doLogin(){
  var code=g('login-code').value.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'');
  if(code.length<3){g('login-err').textContent='Código demasiado curto.';return;}
  USER_KEY=code;LS_KEY='financas_v3_'+code.replace(/[^a-z0-9]/g,'');
  g('login-screen').style.display='none';
  g('app').style.display='block';
  localStorage.setItem('cf_last_code',code);
  loadAndStart();
}
window.addEventListener('load',function(){var last=localStorage.getItem('cf_last_code');if(last){g('login-code').value=last;doLogin();}});

function toggleNav(){
  NAV_OPEN=!NAV_OPEN;
  var menu=g('mobile-menu'),btn=document.querySelector('.hamburger-btn');
  if(menu)menu.className=NAV_OPEN?'mobile-menu-open':'mobile-menu-closed';
  if(btn)btn.className='hamburger-btn'+(NAV_OPEN?' open':'');
}
document.addEventListener('click',function(e){if(!NAV_OPEN)return;if(!e.target.closest('.hamburger-btn')&&!e.target.closest('.mobile-menu-grid')){NAV_OPEN=false;var m=g('mobile-menu');if(m)m.className='mobile-menu-closed';var b=document.querySelector('.hamburger-btn');if(b)b.className='hamburger-btn';}});

var PL={resumo:'Resumo',entradas:'Entradas',despesas:'Despesas',diario:'Diário',objetivos:'Objetivos',desafios:'Desafios',desejos:'Desejos',mentor:'Mentor IA',investir:'Investir',dicas:'Dicas',boca:'Casa Portugal',renda:'Renda Portugal'};
function go(page){
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('on');});
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('on');});
  var el=g('page-'+page);if(el)el.classList.add('on');
  var nc=g('nav-current');if(nc)nc.textContent=PL[page]||page;
  document.querySelectorAll('.tab').forEach(function(t){if(t.textContent===(PL[page]||page))t.classList.add('on');});
  document.querySelectorAll('.mobile-menu-grid button').forEach(function(b){b.classList.remove('active-page');if(b.getAttribute('data-page')===page)b.classList.add('active-page');});
  if(page==='resumo')renderResumo();
  else if(page==='entradas'){setTd('sl-dt');setTd('pv-dt');renderEntradas();}
  else if(page==='despesas'){setTd('da-dt');renderDesp();}
  else if(page==='diario'){setTd('dr-dt');renderDiar();}
  else if(page==='objetivos')renderObjs();
  else if(page==='desafios')renderDesafios();
  else if(page==='desejos'){renderDesejos();analisarDesejos();}
  else if(page==='investir')renderInvestir();
  else if(page==='dicas')renderDicas();
  else if(page==='mentor')renderMentorSugs();
  else if(page==='boca'){setMI('boca-mes');renderBoca();}
  else if(page==='renda'){setMI('renda-mes');renderRenda();}
}
function reRender(){populateSels();var a=document.querySelector('.page.on');if(!a)return;go(a.id.replace('page-',''));}
function openM(id){g(id).classList.add('on');}
function closeM(id){g(id).classList.remove('on');}
document.addEventListener('keydown',function(e){if(e.key==='Escape')document.querySelectorAll('.modal-overlay.on').forEach(function(m){m.classList.remove('on');});});

function cycleInfo(){var n=new Date(),start,end;if(n.getDate()>=5){start=new Date(n.getFullYear(),n.getMonth(),5);end=new Date(n.getFullYear(),n.getMonth()+1,4);}else{start=new Date(n.getFullYear(),n.getMonth()-1,5);end=new Date(n.getFullYear(),n.getMonth(),4);}var dl=Math.max(Math.ceil((end-n)/(1000*60*60*24)),0),td=Math.round((end-start)/(1000*60*60*24));return{daysLeft:dl,totalDays:td};}
function getWeekSpend(){var n=new Date(),day=n.getDay(),s=new Date(n);s.setDate(n.getDate()-(day===0?6:day-1));var sk=s.toISOString().split('T')[0];return diario.filter(function(d){return d.data>=sk;}).reduce(function(s,d){return s+d.valor;},0);}
function allMonths(){var s=new Set(),n=new Date();for(var i=5;i>=0;i--){var d=new Date(n.getFullYear(),n.getMonth()-i,1);s.add(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));}[...entradas,...despesas,...diario].forEach(function(x){if(x.data)s.add(mk(x.data));});return[...s].sort();}
function populateSels(){var months=allMonths(),c=cur();['r-month','e-month','d-month'].forEach(function(id){var el=g(id);if(!el)return;var prev=el.value||c;el.innerHTML=months.map(function(m){return'<option value="'+m+'"'+(m===prev?' selected':'')+'>'+mlbl(m)+'</option>';}).join('');});}

// ENTRADAS
function addEnt(tipo){
  var dId=tipo==='prevista'?'pv-d':'ent-d',vId=tipo==='prevista'?'pv-v':'ent-v',dtId=tipo==='prevista'?'pv-dt':'ent-dt';
  var desc=g(dId).value.trim(),val=parseFloat(g(vId).value),data=g(dtId).value||today();
  if(!desc||!val||val<=0){alert('Preenche descrição e valor.');return;}
  var rec=tipo==='entrada'&&g('ent-rec')&&g('ent-rec').checked;
  entradas.push({id:uid(),tipo:tipo,desc:desc,valor:val,data:data,recorrente:rec});
  if(rec){
    var bM=mk(data),bD=data.slice(8,10);
    for(var i=1;i<=5;i++){var nd=new Date(parseInt(bM.slice(0,4)),parseInt(bM.slice(5,7))-1+i,parseInt(bD));var fM=nd.getFullYear()+'-'+String(nd.getMonth()+1).padStart(2,'0');if(!entradas.some(function(e){return e.desc===desc&&mk(e.data)===fM&&e.tipo==='entrada';})){entradas.push({id:uid(),tipo:'entrada',desc:desc,valor:val,data:fM+'-'+bD,recorrente:true,projetada:true});}}
  }
  g(vId).value='';if(tipo==='prevista'&&g('pv-n'))g('pv-n').value='';
  saveAll();reRender();if(tipo==='prevista')renderPrevSugestoes();
}
function delEnt(id){entradas=entradas.filter(function(e){return e.id!==id;});saveAll();reRender();}
function renderEntradas(){
  var m=g('e-month').value;
  var reais=entradas.filter(function(e){return isEntradaReal(e)&&mk(e.data)===m;}).sort(function(a,b){return b.data.localeCompare(a.data);});
  var elr=g('lst-entradas');
  if(elr)elr.innerHTML=reais.length?reais.map(function(e){return'<div class="li"><div class="ll"><div class="ln">'+e.desc+(e.recorrente?'<span style="font-size:10px;color:var(--green-t);margin-left:5px;">↻</span>':'')+(e.projetada?'<span style="font-size:10px;color:var(--t3);margin-left:4px;">proj.</span>':'')+'</div><div class="ls">'+e.data+'</div></div><div class="lr"><span class="am ai">+'+fmt(e.valor)+'</span><button class="btn bd bxs" onclick="delEnt(\''+e.id+'\')">×</button></div></div>';}).join(''):'<div style="font-size:13px;color:var(--t3);padding:.4rem 0;">Sem entradas. Adiciona abaixo.</div>';
  var prevs=entradas.filter(function(e){return e.tipo==='prevista'&&mk(e.data)===m;});
  var elp=g('lst-prevista');
  if(elp)elp.innerHTML=prevs.length?prevs.map(function(e){return'<div class="li"><div class="ll"><div class="ln">'+e.desc+'</div><div class="ls">'+e.data+'</div></div><div class="lr"><span class="am apv">~'+fmt(e.valor)+'</span><button class="btn bd bxs" onclick="delEnt(\''+e.id+'\')">×</button></div></div>';}).join(''):'<div style="font-size:13px;color:var(--t3);padding:.4rem 0;">Sem entradas previstas.</div>';
  if(m===cur())renderPrevSugestoes();
}
function renderPrevSugestoes(){
  var m=cur(),prevs=entradas.filter(function(e){return e.tipo==='prevista'&&mk(e.data)===m;});
  var el=g('pv-sugestao');if(!el)return;
  if(!prevs.length){el.innerHTML='';return;}
  var total=prevs.reduce(function(s,e){return s+e.valor;},0);
  var ci=cycleInfo();
  var tIn=entradas.filter(function(e){return isEntradaReal(e)&&mk(e.data)===m;}).reduce(function(s,e){return s+e.valor;},0);
  var tD=despesas.filter(function(d){return mk(d.data)===m&&!d.projetada;}).reduce(function(s,d){return s+d.valor;},0);
  var tDi=diario.filter(function(d){return mk(d.data)===m;}).reduce(function(s,d){return s+d.valor;},0);
  var saldoAtual=tIn-tD-tDi;
  var diasPassados=Math.max(ci.totalDays-ci.daysLeft,1);
  var gastoDiario=tDi/diasPassados;
  var estimDiarios=gastoDiario*ci.daysLeft;
  var sug=[];
  if(ci.daysLeft>0){sug.push({icon:'📅',bg:'var(--blue-bg)',cor:'var(--blue-t)',txt:'Faltam <strong>'+ci.daysLeft+' dias</strong> para o dia 5. O teu saldo actual é <strong>'+fmt(saldoAtual)+'</strong>.'+(gastoDiario>0?' Gastas em média '+fmt(Math.round(gastoDiario))+'€/dia em gastos variáveis.':'')});}
  var objsPend=objetivos.filter(function(o){return Math.max(o.meta-(o.atual||0),0)>0;}).sort(function(a,b){return(a.meta-(a.atual||0))-(b.meta-(b.atual||0));});
  if(objsPend.length>0){var obj=objsPend[0],rest=Math.max(obj.meta-(obj.atual||0),0),contrib=Math.min(total*0.35,rest);if(rest<=total){sug.push({icon:'🏆',bg:'var(--green-bg)',cor:'var(--green-t)',txt:'Podes <strong>terminar já</strong> o objetivo "'+obj.nome+'" com <strong>'+fmt(rest)+'</strong>!'});}else if(contrib>0){sug.push({icon:'🎯',bg:'var(--green-bg)',cor:'var(--green-t)',txt:'Mete <strong>'+fmt(Math.round(contrib))+'</strong> no objetivo "'+obj.nome+'" — faltam '+fmt(rest)+'.'});}}
  sug.push({icon:'🏦',bg:'var(--surface2)',cor:'var(--t2)',txt:'Guarda pelo menos <strong>'+fmt(Math.round(total*0.15))+'</strong> como almofada para imprevistos.'});
  var notasMes=notas.filter(function(n){return n.tipo==='mes';}).map(function(n){return n.texto;}).join('; ');
  if(notasMes)sug.push({icon:'📌',bg:'var(--surface2)',cor:'var(--t2)',txt:'Notas próximo mês: <em>'+notasMes.slice(0,90)+'...</em>'});
  var notaExist=notas.find(function(n){return n.tipo==='prevista'&&n.mes===m;});
  el.innerHTML='<div class="ai-box" style="margin-top:.7rem;"><div class="ai-title">Como distribuir os '+fmt(total)+' previstos</div>'
    +'<div style="display:flex;flex-direction:column;gap:7px;margin:.5rem 0;">'
    +sug.map(function(s){return'<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border-radius:6px;background:'+s.bg+';font-size:13px;color:'+s.cor+';line-height:1.5;"><span style="flex-shrink:0;">'+s.icon+'</span><span>'+s.txt+'</span></div>';}).join('')
    +'</div><hr style="margin:.5rem 0;border:none;border-top:.5px solid var(--border);">'
    +'<label style="font-size:12px;color:var(--amber-t);font-weight:600;">A tua nota sobre este dinheiro</label>'
    +'<textarea id="pv-nota-pessoal" placeholder="Escreve o que queres fazer com este dinheiro..." style="margin-top:5px;font-size:13px;min-height:55px;">'+(notaExist?notaExist.texto:'')+'</textarea>'
    +'<button class="btn ba bsm" style="margin-top:5px;" onclick="saveNotaPrevista()">Guardar nota</button></div>';
}
function saveNotaPrevista(){var m=cur(),txt=g('pv-nota-pessoal')?g('pv-nota-pessoal').value.trim():'';notas=notas.filter(function(n){return!(n.tipo==='prevista'&&n.mes===m);});if(txt)notas.push({id:uid(),tipo:'prevista',mes:m,texto:txt,data:today()});saveAll();}

// TEMPLATE
function renderTpl(){
  var el=g('tpl-list');if(!el)return;
  if(!templates.length){el.innerHTML='<div style="font-size:13px;color:var(--t3);">Sem rubricas.</div>';return;}
  el.innerHTML=templates.map(function(t){return'<div class="tpl-item" style="background:'+(t.ativo!==false?'var(--surface)':'var(--surface2)')+';">'
    +'<input type="checkbox" '+(t.ativo!==false?'checked':'')+' onchange="tplChk(\''+t.id+'\',this.checked)" style="width:16px;flex-shrink:0;cursor:pointer;accent-color:var(--accent);">'
    +dot(t.cat,10)+'<span style="flex:1;font-size:13px;'+(t.ativo===false?'color:var(--t3);':'')+'">'+t.nome+(t.recorrente?'<span style="font-size:10px;color:var(--green-t);margin-left:5px;">↻</span>':'')+'</span>'
    +'<span style="font-size:10px;color:var(--t3);margin-right:3px;">dia</span><input type="number" value="'+(t.dia||1)+'" min="1" max="28" onchange="tplDia(\''+t.id+'\',this.value)" style="width:34px;background:transparent;border:none;border-bottom:1px dashed var(--border2);border-radius:0;padding:2px;font-size:12px;text-align:center;color:var(--t);">'
    +'<input type="number" value="'+t.valor+'" onchange="tplVal(\''+t.id+'\',this.value)" style="width:68px;background:transparent;border:none;border-bottom:1px dashed var(--border2);border-radius:0;padding:2px 4px;font-size:13px;text-align:right;color:var(--t);margin-left:4px;"> €'
    +'<button class="btn bd bxs" onclick="delTpl(\''+t.id+'\')">×</button></div>';}).join('');
}
function tplChk(id,v){var t=templates.find(function(x){return x.id===id;});if(t)t.ativo=v;renderTpl();saveAll();}
function tplVal(id,v){var t=templates.find(function(x){return x.id===id;});if(t)t.valor=parseFloat(v)||0;saveAll();}
function tplDia(id,v){var t=templates.find(function(x){return x.id===id;});if(t)t.dia=parseInt(v)||1;saveAll();}
function delTpl(id){templates=templates.filter(function(t){return t.id!==id;});saveAll();renderTpl();}
function addTpl(){var n=g('tpl-n').value.trim(),v=parseFloat(g('tpl-v').value)||0,c=g('tpl-c').value,dia=parseInt(g('tpl-dia').value)||1,rec=g('tpl-rec')&&g('tpl-rec').checked;if(!n)return alert('Escreve um nome.');templates.push({id:uid(),nome:n,valor:v,cat:c,ativo:true,dia:dia,recorrente:rec});saveAll();renderTpl();closeM('m-addtpl');g('tpl-n').value='';g('tpl-v').value='';}
function aplicarTpl(){
  var m=g('d-month').value,ativos=templates.filter(function(t){return t.ativo!==false&&t.valor>0;});
  if(!ativos.length){alert('Nenhuma rubrica activa.');return;}
  var n=0;
  ativos.forEach(function(t){if(!despesas.some(function(d){return d.tplId===t.id&&mk(d.data)===m;})){var dia=String(t.dia||1).padStart(2,'0');despesas.push({id:uid(),tplId:t.id,desc:t.nome,valor:t.valor,cat:t.cat,data:m+'-'+dia,tipo:'fixa',pago:false});n++;}});
  // Project recorrentes for next 3 months
  var nd=new Date(),meses=[];
  for(var i=1;i<=3;i++){var nd2=new Date(nd.getFullYear(),nd.getMonth()+i,1);meses.push(nd2.getFullYear()+'-'+String(nd2.getMonth()+1).padStart(2,'0'));}
  meses.forEach(function(futM){ativos.filter(function(t){return t.recorrente;}).forEach(function(t){if(!despesas.some(function(d){return d.tplId===t.id&&mk(d.data)===futM;})){var dia=String(t.dia||1).padStart(2,'0');despesas.push({id:uid(),tplId:t.id,desc:t.nome,valor:t.valor,cat:t.cat,data:futM+'-'+dia,tipo:'fixa',pago:false,projetada:true});}});});
  saveAll();renderDesp();
  if(n===0)alert('Já aplicadas a este mês.');else alert(n+' despesas adicionadas! Despesas recorrentes projetadas para os próximos 3 meses.');
}

// DESPESAS
function addDesp(){
  var desc=g('da-d').value.trim(),val=parseFloat(g('da-v').value),cat=g('da-c').value,data=g('da-dt').value||today();
  if(!desc||!val||val<=0){alert('Preenche descrição e valor.');return;}
  var rec=g('da-rec')&&g('da-rec').checked;
  despesas.push({id:uid(),desc:desc,valor:val,cat:cat,data:data,tipo:rec?'fixa':'pontual',pago:false,recorrente:rec});
  if(rec){
    var bM=mk(data),bD=data.slice(8,10);
    for(var i=1;i<=5;i++){
      var nd=new Date(parseInt(bM.slice(0,4)),parseInt(bM.slice(5,7))-1+i,parseInt(bD));
      var fM=nd.getFullYear()+'-'+String(nd.getMonth()+1).padStart(2,'0');
      if(!despesas.some(function(d){return d.desc===desc&&mk(d.data)===fM&&d.recorrente;})){
        despesas.push({id:uid(),desc:desc,valor:val,cat:cat,data:fM+'-'+bD,tipo:'fixa',pago:false,recorrente:true,projetada:true});
      }
    }
  }
  g('da-d').value='';g('da-v').value='';
  saveAll();reRender();
}
function delDesp(id){despesas=despesas.filter(function(d){return d.id!==id;});saveAll();reRender();}
function togglePago(id){var d=despesas.find(function(x){return x.id===id;});if(d){d.pago=!d.pago;saveAll();renderDesp();renderResumo();}}
function renderDesp(){
  renderTpl();
  var m=g('d-month').value,f=despesas.filter(function(d){return mk(d.data)===m;}).sort(function(a,b){return a.data.localeCompare(b.data);});
  var total=f.reduce(function(s,d){return s+d.valor;},0),pago=f.filter(function(d){return d.pago;}).reduce(function(s,d){return s+d.valor;},0);
  g('d-total-pill').textContent='Total: '+fmt(total)+' · Pago: '+fmt(pago);
  var el=g('lst-despesas');if(!f.length){el.innerHTML='<div style="font-size:13px;color:var(--t3);padding:.4rem 0;">Sem despesas. Usa as fixas acima ou adiciona uma pontual.</div>';return;}
  var byCat={};f.forEach(function(d){byCat[d.cat]=byCat[d.cat]||[];byCat[d.cat].push(d);});
  var html='';
  Object.entries(byCat).forEach(function(e){var cat=e[0],items=e[1],ct=items.reduce(function(s,d){return s+d.valor;},0);
    html+='<div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--t3);padding:9px 0 5px;border-top:.5px solid var(--border);margin-top:3px;">'+dot(cat,9)+'<span>'+cat+'</span><span style="margin-left:auto;font-weight:400;">'+fmt(ct)+'</span></div>';
    html+=items.map(function(d){return'<div class="li" style="'+(d.pago?'opacity:.5;':'')+'">'
      +'<div class="ll"><div class="ln" style="'+(d.pago?'text-decoration:line-through;':'')+'">'+d.desc+(d.projetada?'<span style="font-size:10px;color:var(--t3);margin-left:4px;">proj.</span>':'')+'</div><div class="ls">'+d.data+(d.tipo==='fixa'?' · fixa':' · pontual')+'</div></div>'
      +'<div class="lr"><span class="am ao">-'+fmt(d.valor)+'</span><button class="btn-check '+(d.pago?'checked':'')+'" onclick="togglePago(\''+d.id+'\')">'+(d.pago?'✓ Pago':'Pagar')+'</button><button class="btn bd bxs" onclick="delDesp(\''+d.id+'\')">×</button></div></div>';}).join('');});
  el.innerHTML=html;
}

// DIÁRIO
function addDiar(){var desc=g('dr-d').value.trim(),val=parseFloat(g('dr-v').value),cat=g('dr-c').value,data=g('dr-dt').value||today();if(!desc||!val||val<=0){alert('Preenche descrição e valor.');return;}diario.push({id:uid(),desc:desc,valor:val,cat:cat,data:data,pago:false});g('dr-d').value='';g('dr-v').value='';saveAll();reRender();}
function delDiar(id){diario=diario.filter(function(d){return d.id!==id;});saveAll();reRender();}
function togglePagoDiar(id){var d=diario.find(function(x){return x.id===id;});if(d){d.pago=!d.pago;saveAll();renderDiar();}}
function renderDiar(){
  var m=cur(),f=diario.filter(function(d){return mk(d.data)===m;}).sort(function(a,b){return b.data.localeCompare(a.data);});
  var total=f.reduce(function(s,d){return s+d.valor;},0);g('dr-total-pill').textContent='Este mês: '+fmt(total);
  var ci=cycleInfo(),tIn=entradas.filter(function(e){return isEntradaReal(e)&&mk(e.data)===m;}).reduce(function(s,e){return s+e.valor;},0);
  var tD=despesas.filter(function(d){return mk(d.data)===m&&!d.projetada;}).reduce(function(s,d){return s+d.valor;},0);
  var saldo=tIn-tD-total,maxD=ci.daysLeft>0?Math.max(0,Math.floor(saldo/ci.daysLeft)):0,ws=getWeekSpend();
  var alts='<div class="alert '+(saldo>=150?'alg':saldo>=100?'ala':'alr')+'">'+saldoEmoji(saldo)+' Saldo: <strong>'+fmt(saldo)+'</strong>'+(maxD>0?' · Máx. <strong>'+fmt(maxD)+'</strong>/dia':'')+'</div>';
  if(ci.daysLeft<=5&&ci.daysLeft>0)alts+='<div class="alert alr">🚨 Faltam só <strong>'+ci.daysLeft+' dias</strong> para o dia 5!</div>';
  if(ws>maxD*7&&maxD>0)alts+='<div class="alert alr">Esta semana gastaste '+fmt(ws)+' — acima do ritmo!</div>';
  g('diar-alerts').innerHTML=alts;
  var el=g('lst-diario');if(!f.length){el.innerHTML='<div style="font-size:13px;color:var(--t3);padding:.4rem 0;">Sem registos.</div>';return;}
  var byDate={};f.forEach(function(d){byDate[d.data]=byDate[d.data]||[];byDate[d.data].push(d);});
  var html='';
  Object.entries(byDate).sort(function(a,b){return b[0].localeCompare(a[0]);}).forEach(function(e){
    var date=e[0],items=e[1],dt=items.reduce(function(s,d){return s+d.valor;},0),over=maxD>0&&dt>maxD;
    html+='<div class="day-lbl" style="'+(over?'color:var(--red-t);':'')+'">'+date+'<span>'+fmt(dt)+(over?' ⚠':'')+'</span></div>';
    html+=items.map(function(d){return'<div class="li" style="'+(d.pago?'opacity:.5;':'')+'">'
      +'<div class="ll"><div class="ln" style="'+(d.pago?'text-decoration:line-through;':'')+'">'+d.desc+'</div><div class="ls" style="display:flex;align-items:center;">'+dot(d.cat,8)+d.cat+'</div></div>'
      +'<div class="lr"><span class="am ao">-'+fmt(d.valor)+'</span><button class="btn-check '+(d.pago?'checked':'')+'" onclick="togglePagoDiar(\''+d.id+'\')" style="font-size:10px;">'+(d.pago?'✓ Saiu':'Saiu?')+'</button><button class="btn bd bxs" onclick="delDiar(\''+d.id+'\')">×</button></div></div>';}).join('');});
  el.innerHTML=html;
}

// OBJETIVOS
function addObj(){var nome=g('o-nome').value.trim(),meta=parseFloat(g('o-meta').value)||0;if(!nome||!meta)return alert('Preenche nome e meta.');objetivos.push({id:uid(),nome:nome,meta:meta,prazo:g('o-prazo').value,atual:parseFloat(g('o-atual').value)||0,mensal:parseFloat(g('o-mensal').value)||0,notas:g('o-notas').value.trim(),historico:[]});['o-nome','o-meta','o-prazo','o-atual','o-mensal','o-notas'].forEach(function(id){g(id).value='';});saveAll();renderObjs();}
function delObj(id){objetivos=objetivos.filter(function(o){return o.id!==id;});saveAll();renderObjs();}
function openObjEdit(id){var obj=objetivos.find(function(o){return o.id===id;});if(!obj)return;g('me-title').textContent=obj.nome;g('me-body').innerHTML='<div class="fr"><div class="fg"><label>Poupado (€)</label><input id="oe-a" type="number" value="'+(obj.atual||0)+'" step="0.01"></div></div><div class="fr"><div class="fg"><label>Meta (€)</label><input id="oe-m" type="number" value="'+obj.meta+'"></div><div class="fg"><label>Mensal (€)</label><input id="oe-mn" type="number" value="'+(obj.mensal||0)+'"></div></div><div class="fr"><div class="fg"><label>Prazo</label><input id="oe-p" type="date" value="'+(obj.prazo||'')+'"></div></div><div class="fr"><div class="fg"><label>Notas</label><input id="oe-n" value="'+(obj.notas||'')+'"></div></div><button class="btn ba" style="width:100%;margin-top:.4rem;" onclick="saveObjEdit(\''+id+'\')">Guardar</button><hr style="margin:.7rem 0;"><p style="font-size:13px;font-weight:500;margin-bottom:.5rem;">Contribuição pontual</p><div style="display:flex;gap:6px;align-items:center;"><input id="oe-c" type="number" placeholder="ex: 50" style="flex:1;"><select id="oe-ct" style="width:auto;"><option value="add">+ Adicionar</option><option value="sub">− Retirar</option></select><button class="btn ba bsm" onclick="addContrib(\''+id+'\')">Registar</button></div>'+(obj.historico&&obj.historico.length?'<div style="margin-top:.7rem;font-size:12px;color:var(--t2);">Recentes: '+obj.historico.slice(-4).map(function(h){return h.data+': '+(h.delta>0?'+':'')+fmt(h.delta);}).join(' · ')+'</div>':'');openM('m-obj-edit');}
function saveObjEdit(id){var obj=objetivos.find(function(o){return o.id===id;});if(!obj)return;obj.atual=parseFloat(g('oe-a').value)||0;obj.meta=parseFloat(g('oe-m').value)||obj.meta;obj.mensal=parseFloat(g('oe-mn').value)||0;obj.prazo=g('oe-p').value||obj.prazo;obj.notas=g('oe-n').value||obj.notas;saveAll();renderObjs();closeM('m-obj-edit');}
function addContrib(id){var obj=objetivos.find(function(o){return o.id===id;});if(!obj)return;var val=parseFloat(g('oe-c').value)||0,tipo=g('oe-ct').value,delta=tipo==='add'?val:-val;obj.atual=Math.max(0,(obj.atual||0)+delta);obj.historico=obj.historico||[];obj.historico.push({data:today(),delta:delta});saveAll();openObjEdit(id);renderObjs();}
function renderObjs(){var el=g('lst-objetivos');if(!el)return;if(!objetivos.length){el.innerHTML='<div class="card"><div style="font-size:13px;color:var(--t3);">Sem objetivos.</div></div>';return;}el.innerHTML=objetivos.map(function(obj){var pct=obj.meta>0?Math.min(Math.round(((obj.atual||0)/obj.meta)*100),100):0,rest=Math.max(obj.meta-(obj.atual||0),0),mr=obj.prazo?Math.max(0,Math.round((new Date(obj.prazo)-new Date())/(1000*60*60*24*30))):null,mn=mr&&mr>0?Math.ceil(rest/mr):null,ok=obj.mensal&&mn&&obj.mensal>=mn;return'<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--rlg);padding:1.1rem 1.3rem;margin-bottom:9px;"><div style="display:flex;justify-content:space-between;margin-bottom:5px;"><div style="font-size:15px;font-weight:500;">'+obj.nome+'</div><span class="pill '+(pct>=100?'pg':pct>=50?'pb':'pa')+'">'+pct+'%</span></div><div style="font-size:12px;color:var(--t2);margin-bottom:7px;">'+fmt(obj.atual||0)+' de '+fmt(obj.meta)+' · Faltam '+fmt(rest)+(obj.prazo?' · '+obj.prazo:'')+'</div>'+(mr!==null?'<div class="alert '+(ok?'alg':'ala')+'" style="margin-bottom:6px;font-size:12px;padding:6px 10px;">'+(ok?'Poupança suficiente.':'Precisas de '+fmt(mn||0)+'/mês.')+'</div>':'')+'<div class="pbar" style="margin-bottom:9px;"><div class="pfill" style="width:'+pct+'%;background:'+(pct>=100?'var(--green)':pct>=50?'#1A3F6F':'var(--accent)')+'"></div></div><div style="display:flex;gap:6px;flex-wrap:wrap;"><button class="btn bg bsm" onclick="openObjEdit(\''+obj.id+'\')">Actualizar</button><button class="btn bd bsm" onclick="delObj(\''+obj.id+'\')">Eliminar</button></div></div>';}).join('');}

// DESAFIOS
var DS=[{nivel:'Iniciante',nome:'Registo diário 7 dias',desc:'Regista TODOS os gastos durante 7 dias.',meta:0,dur:1,passos:['Dia 1: Regista o primeiro gasto','Dia 2: Regista tudo incluindo cafés','Dia 3: Compara com o dia anterior','Dia 4: Tenta prever quanto vais gastar','Dia 5: Identifica onde gastas mais','Dia 6: Reduz esse gasto em 20%','Dia 7: Balanço da semana']},{nivel:'Iniciante',nome:'Semana sem compras impulsivas',desc:'7 dias sem comprar nada fora da lista.',meta:0,dur:1,passos:['Faz a lista antes de sair','Compra só o que está na lista','Anota o que quiseste comprar mas não compraste','Soma o que poupaste']},{nivel:'Iniciante',nome:'Poupar 50€ este mês',desc:'O primeiro passo para o hábito de poupar.',meta:50,dur:4,passos:['Semana 1: Identifica onde cortar 12,50€','Semana 2: Transfere 12,50€','Semana 3: Repete','Semana 4: Completa os 50€!']},{nivel:'Intermédio',nome:'30 dias sem compras supérfluas',desc:'Um mês sem roupa, gadgets ou decoração.',meta:0,dur:4,passos:['Semana 1: Define por escrito o que é supérfluo','Semana 2: Quando quiseres comprar algo, espera 48h','Semana 3: Substitui shopping por actividades gratuitas','Semana 4: Soma o que poupaste']},{nivel:'Intermédio',nome:'Reserva de emergência 500€',desc:'500€ intocáveis.',meta:500,dur:8,passos:['Semana 1-2: Identifica onde cortar','Semana 3-4: Poupa os primeiros 125€','Semana 5-6: Mais 125€','Semana 7-8: Conclui os 500€']},{nivel:'Avançado',nome:'Desafio 52 semanas',desc:'Semana 1: 1€. Semana 52: 52€. Total: 1.378€.',meta:1378,dur:52,passos:['Semanas 1-10: 1€ a 10€/sem.','Semanas 11-20: 11€ a 20€/sem.','Semanas 21-30: 21€ a 30€/sem.','Semanas 31-40: 31€ a 40€/sem.','Semanas 41-52: 41€ a 52€/sem.']},{nivel:'Avançado',nome:'Organiza as finanças do zero',desc:'Plano completo em 4 semanas.',meta:0,dur:4,passos:['Semana 1: Lista rendimentos, despesas e dívidas.','Semana 2: Cria orçamento 50/30/20.','Semana 3: Conta poupança + transferência automática.','Semana 4: Define 3 objetivos com valores e prazos.']}];
function renderDesafiosSugeridos(){var el=g('desafios-sugeridos');if(!el)return;var niveis=['Iniciante','Intermédio','Avançado'],corN={Iniciante:'var(--green)',Intermédio:'var(--amber)',Avançado:'var(--red)'},html='';niveis.forEach(function(n){html+='<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:'+corN[n]+';padding:8px 0 5px;border-bottom:.5px solid var(--border);margin-bottom:6px;">'+n+'</div>';DS.filter(function(d){return d.nivel===n;}).forEach(function(ds){html+='<div class="desafio-sug"><div><div style="font-size:13px;font-weight:500;">'+ds.nome+'</div><div style="font-size:12px;color:var(--t2);">'+ds.desc+'</div></div><button class="btn ba bsm" onclick="adoptDesafio('+DS.indexOf(ds)+')" style="flex-shrink:0;">Adoptar</button></div>';});});el.innerHTML=html;}
function adoptDesafio(i){var ds=DS[i];desafios.push({id:uid(),nome:ds.nome,desc:ds.desc,meta:ds.meta,dur:ds.dur,nivel:ds.nivel,inicio:today(),passos:ds.passos,checks:[],progresso:0,concluido:false});saveAll();renderDesafios();go('desafios');}
function addDesafio(){var nome=g('ch-nome').value.trim();if(!nome)return alert('Preenche o nome.');desafios.push({id:uid(),nome:nome,desc:g('ch-desc').value.trim(),meta:parseFloat(g('ch-meta').value)||0,dur:parseInt(g('ch-dur').value)||4,nivel:'Personalizado',inicio:g('ch-ini').value||today(),passos:[],checks:[],progresso:0,concluido:false});['ch-nome','ch-meta','ch-dur','ch-ini','ch-desc'].forEach(function(id){g(id).value='';});saveAll();renderDesafios();}
function delDesafio(id){desafios=desafios.filter(function(d){return d.id!==id;});saveAll();renderDesafios();}
function toggleDesafioCheck(did,si){var d=desafios.find(function(x){return x.id===did;});if(!d)return;d.checks=d.checks||[];var k=''+si;if(d.checks.includes(k))d.checks=d.checks.filter(function(c){return c!==k;});else d.checks.push(k);d.concluido=d.passos.length>0&&d.checks.length>=d.passos.length;saveAll();renderDesafios();}
function updateDesafioVal(id,v){var d=desafios.find(function(x){return x.id===id;});if(!d)return;d.progresso=parseFloat(v)||0;d.concluido=d.meta>0&&d.progresso>=d.meta;saveAll();renderDesafios();}
function renderDesafios(){var el=g('lst-desafios');if(!el)return;if(!desafios.length){el.innerHTML='<div class="card"><div style="font-size:13px;color:var(--t3);">Sem desafios. Adopta um sugerido!</div></div>';return;}var corN={Iniciante:'var(--green)',Intermédio:'var(--amber)',Avançado:'var(--red)',Personalizado:'var(--blue)'};el.innerHTML=desafios.map(function(d){var pct=d.passos&&d.passos.length>0?Math.round(((d.checks||[]).length/d.passos.length)*100):d.meta>0?Math.min(Math.round((d.progresso/d.meta)*100),100):d.concluido?100:0,cor=corN[d.nivel]||'var(--accent)';var pH=d.passos&&d.passos.length?'<div style="margin:10px 0;">'+d.passos.map(function(p,i){var ch=(d.checks||[]).includes(''+i);return'<div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:.5px solid var(--border);cursor:pointer;" onclick="toggleDesafioCheck(\''+d.id+'\','+i+')">'+'<div style="width:18px;height:18px;border-radius:4px;border:2px solid '+(ch?'var(--green)':'var(--border2)')+';background:'+(ch?'var(--green)':'transparent')+';flex-shrink:0;display:flex;align-items:center;justify-content:center;">'+(ch?'<span style="color:#fff;font-size:11px;font-weight:600;">✓</span>':'')+'</div><span style="font-size:13px;'+(ch?'text-decoration:line-through;color:var(--t3);':'')+'">'+p+'</span></div>';}).join('')+'</div>':'';var vH=d.meta>0?'<div style="display:flex;gap:6px;align-items:center;margin:8px 0;"><input type="number" value="'+(d.progresso||'')+'" onchange="updateDesafioVal(\''+d.id+'\',this.value)" style="flex:1;font-size:13px;" placeholder="Valor poupado (€)"><span style="font-size:13px;color:var(--t3);">/ '+fmt(d.meta)+'</span></div>':'';return'<div class="desafio-card" style="'+(d.concluido?'border-color:var(--green);':'border-left:3px solid '+cor+';')+'">'+'<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><div><span style="font-size:10px;font-weight:600;text-transform:uppercase;color:'+cor+';">'+(d.nivel||'Personalizado')+'</span><div style="font-size:15px;font-weight:500;">'+(d.nome+(d.concluido?' ✓':''))+'</div></div><span class="pill '+(d.concluido?'pg':'pa')+'">'+pct+'%</span></div>'+(d.desc?'<div style="font-size:12px;color:var(--t2);margin-bottom:6px;">'+d.desc+'</div>':'')+'<div style="font-size:12px;color:var(--t3);margin-bottom:7px;">Início: '+d.inicio+' · '+d.dur+' sem.</div><div class="pbar" style="margin-bottom:8px;"><div class="pfill" style="width:'+pct+'%;background:'+(d.concluido?'var(--green)':cor)+';"></div></div>'+pH+vH+'<button class="btn bd bxs" onclick="delDesafio(\''+d.id+'\')" style="margin-top:6px;">Eliminar</button></div>';}).join('');}

// NOTAS
function saveNotasArea(){var txt=g('notas-area')?g('notas-area').value:'';notas=notas.filter(function(n){return n.tipo==='prevista';});txt.split('\n').filter(function(l){return l.trim();}).forEach(function(l){notas.push({id:uid(),texto:l.trim(),data:today(),feita:false,tipo:'mes'});});saveAll();renderResumo();alert('Notas guardadas!');}
function renderNotas(){var el=g('r-notas-wrap');if(!el)return;var mn=notas.filter(function(n){return n.tipo==='mes'||!n.tipo;});var txt=mn.filter(function(n){return!n.feita;}).map(function(n){return n.texto;}).join('\n');el.innerHTML='<textarea id="notas-area" placeholder="Notas e lembretes para o próximo mês..." style="width:100%;min-height:100px;font-size:13px;margin-bottom:.7rem;">'+txt+'</textarea><button class="btn ba bsm" onclick="saveNotasArea()">Guardar notas</button>';}

// DESEJOS
function addWish(){var nome=g('w-nome').value.trim(),preco=parseFloat(g('w-preco').value)||0;if(!nome||!preco)return alert('Preenche nome e preço.');desejos.push({id:uid(),nome:nome,preco:preco,prio:g('w-prio').value,notas:g('w-notas').value.trim(),comprado:false});g('w-nome').value='';g('w-preco').value='';g('w-notas').value='';saveAll();renderDesejos();analisarDesejos();}
function delWish(id){desejos=desejos.filter(function(d){return d.id!==id;});saveAll();renderDesejos();analisarDesejos();}
function markWish(id){var w=desejos.find(function(d){return d.id===id;});if(w)w.comprado=!w.comprado;saveAll();renderDesejos();}
function renderDesejos(){var el=g('lst-desejos');if(!el)return;if(!desejos.length){el.innerHTML='<div class="card"><div style="font-size:13px;color:var(--t3);">Sem itens.</div></div>';return;}var order={alta:0,media:1,baixa:2};el.innerHTML=[...desejos].sort(function(a,b){return order[a.prio]-order[b.prio];}).map(function(w){return'<div class="wish-item" style="'+(w.comprado?'opacity:.5;':'')+'"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px;"><div><div style="font-size:15px;font-weight:500;'+(w.comprado?'text-decoration:line-through;':'')+'">'+w.nome+'</div><div style="font-size:12px;color:var(--t3);">'+(w.prio==='alta'?'Alta':w.prio==='media'?'Média':'Baixa')+(w.notas?' · '+w.notas:'')+'</div></div><div style="font-size:18px;color:var(--accent);">'+fmt(w.preco)+'</div></div><div style="display:flex;gap:6px;"><button class="btn bg bsm" onclick="markWish(\''+w.id+'\')">'+(w.comprado?'Desfazer':'✓ Comprado')+'</button><button class="btn bd bxs" onclick="delWish(\''+w.id+'\')">Remover</button></div></div>';}).join('');}
function analisarDesejos(){var el=g('wishes-ai');if(!el)return;var pend=desejos.filter(function(d){return!d.comprado;});if(!pend.length){el.innerHTML='';return;}var m=cur(),ci=cycleInfo(),tIn=entradas.filter(function(e){return isEntradaReal(e)&&mk(e.data)===m;}).reduce(function(s,e){return s+e.valor;},0),tD=despesas.filter(function(d){return mk(d.data)===m&&!d.projetada;}).reduce(function(s,d){return s+d.valor;},0),tDi=diario.filter(function(d){return mk(d.data)===m;}).reduce(function(s,d){return s+d.valor;},0),saldo=tIn-tD-tDi;if(ci.daysLeft<=10||saldo<200){el.innerHTML='<div class="alert ala" style="margin-bottom:.9rem;">Faltam '+ci.daysLeft+' dias para o dia 5 e saldo é '+fmt(saldo)+'. Adia as compras.</div>';return;}var mg=Math.max(saldo-200,0)*0.3,order={alta:0,media:1,baixa:2},melhor=[...pend].sort(function(a,b){return order[a.prio]-order[b.prio];}).find(function(w){return w.preco<=mg;});el.innerHTML=melhor?'<div class="ai-box" style="margin-bottom:.9rem;"><div class="ai-title">O que podes comprar</div><div class="ai-text">Com margem de '+fmt(mg)+': <strong>'+melhor.nome+'</strong> ('+fmt(melhor.preco)+') — a maior prioridade que cabe.</div></div>':'<div class="alert ala" style="margin-bottom:.9rem;">Nenhum item cabe na margem segura ('+fmt(mg)+').</div>';}

// INVESTIR
function renderInvestir(){var el=g('investir-content');if(!el)return;var cards=[{cor:'#1E6348',tag:'Porquê investir',t:'O poder do tempo',c:'200€/mês a 7%/ano valem 227.000€ aos 62 anos. Esperar 10 anos reduz para metade. O tempo é o teu maior activo.'},{cor:'#8B1F1F',tag:'Passo 1',t:'Reserva de emergência primeiro',c:'4.500€ a 9.000€ numa conta separada e intocável. Sem isto, não invistas — podes precisar do dinheiro no pior momento.'},{cor:'#7A4A0A',tag:'Passo 2',t:'PPR — o investimento para começar',c:'Benefício fiscal no IRS, capital protegido, cresce 2-5%/ano. Bankinter, BPI ou Pension. 50-100€/mês automaticamente.'},{cor:'#3D2580',tag:'Passo 3',t:'ETFs — para crescer a longo prazo',c:'MSCI World: 1.500 maiores empresas mundiais. Média 10%/ano nos últimos 30 anos. Trading 212 ou DEGIRO. 50€/mês.'},{cor:'#0E5E5E',tag:'Casa aos 40',t:'Casa própria até 2032',c:'35.000€ em 8 anos = 365€/mês numa conta separada só para a casa. Abre já e não toques.'},{cor:'#B5652A',tag:'Plano família',t:'O plano concreto para a Família Costa',c:'Agora: reserva emergência 200€/mês. Em paralelo: PPR 50€/mês. Poupança casa 200€/mês. Quando reserva feita: ETF 50€/mês.'}];el.innerHTML=cards.map(function(d){return'<div class="dica-card"><span class="dica-tag" style="background:'+d.cor+'20;color:'+d.cor+';">'+d.tag+'</span><div class="dica-title">'+d.t+'</div><div class="dica-body">'+d.c+'</div></div>';}).join('');}

// DICAS
var DICAS=[{n:'Básico',tag:'Primeiro passo',cor:'#1E6348',t:'Como funciona o dinheiro',c:'O dinheiro tem três destinos: gastas-o, poupas-o ou investes-o. O segredo não é ganhar mais — é controlar melhor o que já entra.'},{n:'Básico',tag:'Orçamento',cor:'#1B4F72',t:'A regra 50/30/20',c:'50% necessidades, 30% desejos, 20% poupança. Se o teu 50% está acima de 60%, as despesas fixas estão demasiado pesadas.'},{n:'Básico',tag:'Poupança',cor:'#7A4A0A',t:'Paga-te primeiro',c:'Quando o salário chega, transfere logo um valor para poupança antes de pagar qualquer conta.'},{n:'Básico',tag:'Emergência',cor:'#8B1F1F',t:'A reserva de emergência',c:'3-6 meses de despesas fixas numa conta separada intocável. É a prioridade número 1.'},{n:'Básico',tag:'Compras impulsivas',cor:'#6B4226',t:'Como parar as compras por impulso',c:'Espera 48h antes de comprar qualquer coisa não planeada acima de 20€. 90% das vezes a vontade passa.'},{n:'Intermédio',tag:'Ciclo financeiro',cor:'#8B1F1F',t:'Como não ficar a zero a meio do mês',c:'O alerta diário desta app diz-te quanto podes gastar por dia para chegar ao dia 5 com saldo verde. Respeita esse número.'},{n:'Intermédio',tag:'Dispersão',cor:'#3D2580',t:'O erro de querer tudo ao mesmo tempo',c:'Um objetivo de cada vez, do mais pequeno para o maior. A sensação de terminar um objetivo dá energia para o próximo.'},{n:'Intermédio',tag:'Alimentação',cor:'#1E6348',t:'Planear refeições poupa muito',c:'Planeia 5-7 dias antes do supermercado. Compra só o que está na lista. Reduz desperdício em 40%.'},{n:'Avançado',tag:'Casa própria',cor:'#0E5E5E',t:'Casa até aos 40',c:'35.000€ em 8 anos = 365€/mês numa conta separada só para a casa. Começa hoje.'},{n:'Avançado',tag:'Património',cor:'#1A3F6F',t:'Construir riqueza aos 32',c:'1) Reserva emergência 2) PPR automático 3) Poupança casa 4) ETF. Por esta ordem. Com consistência, em 10 anos terás casa, reserva e investimentos.'}];
function renderDicas(){var el=g('dicas-content');if(!el)return;var niv=['Básico','Intermédio','Avançado'],cor={Básico:'var(--green)',Intermédio:'var(--amber)',Avançado:'var(--red)'},html='';niv.forEach(function(n){html+='<div style="font-size:13px;font-weight:600;color:'+cor[n]+';margin:1.2rem 0 .5rem;text-transform:uppercase;letter-spacing:.06em;">— '+n+' —</div>';DICAS.filter(function(d){return d.n===n;}).forEach(function(d){html+='<div class="dica-card"><span class="dica-tag" style="background:'+d.cor+'20;color:'+d.cor+';">'+d.tag+'</span><div class="dica-title">'+d.t+'</div><div class="dica-body">'+d.c+'</div></div>';});});el.innerHTML=html;}

// MENTOR
var MENTOR_SUGS=['Como posso parar de comprar por impulso?','Quanto devo poupar para ter casa até aos 40?','Como começar a investir sem risco?','Estou a gastar demasiado — o que faço?','O meu saldo está sempre a zero — porquê?'];
function renderMentorSugs(){var el=g('mentor-sugs');if(!el)return;el.innerHTML=MENTOR_SUGS.map(function(s){return'<button class="btn bg bsm" onclick="mentorSug(\''+s.replace(/'/g,"\\'")+'\')">'+s+'</button>';}).join('');}
function mentorSug(txt){var inp=g('mentor-input');if(inp){inp.value=txt;sendMentor();}}
function sendMentor(){
  var inp=g('mentor-input');if(!inp||!inp.value.trim())return;
  var userMsg=inp.value.trim();inp.value='';
  var msgs=g('mentor-msgs');if(!msgs)return;
  msgs.innerHTML+='<div style="background:var(--surface2);border-radius:10px 10px 2px 10px;padding:10px 14px;font-size:13px;margin-bottom:8px;margin-left:auto;max-width:85%;">'+userMsg+'</div>';
  msgs.innerHTML+='<div id="mentor-thinking" style="font-size:13px;color:var(--t3);padding:8px 0;">A pensar...</div>';
  var wrap=g('mentor-chat-wrap');if(wrap)wrap.scrollTop=wrap.scrollHeight;
  MENTOR_HISTORY.push({role:'user',content:userMsg});
  var m=cur(),tIn=entradas.filter(function(e){return isEntradaReal(e)&&mk(e.data)===m;}).reduce(function(s,e){return s+e.valor;},0),tD=despesas.filter(function(d){return mk(d.data)===m&&!d.projetada;}).reduce(function(s,d){return s+d.valor;},0),tDi=diario.filter(function(d){return mk(d.data)===m;}).reduce(function(s,d){return s+d.valor;},0),saldo=tIn-tD-tDi,ci=cycleInfo();
  var objsStr=objetivos.map(function(o){return o.nome+' ('+fmt(o.atual||0)+'/'+fmt(o.meta)+')';}).join(', ')||'nenhum';
  var sys='És um mentor financeiro pessoal da Família Costa — 2 adultos (32 anos), 2 crianças. Objectivo: casa própria e construir património até aos 40. Problema principal: compras impulsivas. Perfil de risco: muito baixo.\n\nDados actuais:\nEntradas: '+fmt(tIn)+' | Despesas: '+fmt(tD)+' | Diário: '+fmt(tDi)+' | Saldo: '+fmt(saldo)+' | Dias para dia 5: '+ci.daysLeft+'\nObjetivos: '+objsStr+'\n\nResponde em português de Portugal. Sê directo, caloroso, prático. Máximo 120 palavras. Faz UMA pergunta estratégica no final.';
  fetch(API+'/mentor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:MENTOR_HISTORY.slice(-8),systemPrompt:sys})})
    .then(function(r){return r.json();})
    .then(function(data){
      var txt=data.text||'Não consegui responder. Verifica se ANTHROPIC_API_KEY está no Vercel → Settings → Environment Variables.';
      MENTOR_HISTORY.push({role:'assistant',content:txt});
      var t=g('mentor-thinking');if(t)t.remove();
      msgs.innerHTML+='<div style="background:var(--amber-bg);border:1px solid #e8c08a;border-radius:2px 10px 10px 10px;padding:10px 14px;font-size:13px;margin-bottom:8px;max-width:90%;line-height:1.6;">'+txt.replace(/\n/g,'<br>')+'</div>';
      if(wrap)wrap.scrollTop=wrap.scrollHeight;
    })
    .catch(function(){var t=g('mentor-thinking');if(t)t.remove();msgs.innerHTML+='<div style="color:var(--red-t);font-size:13px;padding:8px 0;">Erro ao ligar ao mentor. Verifica ANTHROPIC_API_KEY no Vercel → Settings → Environment Variables.</div>';});
}
document.addEventListener('DOMContentLoaded',function(){var inp=g('mentor-input');if(inp)inp.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMentor();}});});

// RESUMO
function renderResumo(){
  var m=g('r-month')?g('r-month').value:cur(),isCur=m===cur();
  var entIn=entradas.filter(function(e){return isEntradaReal(e)&&mk(e.data)===m;}),entPrev=entradas.filter(function(e){return e.tipo==='prevista'&&mk(e.data)===m;});
  var despIn=despesas.filter(function(d){return mk(d.data)===m&&!d.projetada;}),diIn=diario.filter(function(d){return mk(d.data)===m;});
  var tIn=entIn.reduce(function(s,e){return s+e.valor;},0),tPrev=entPrev.reduce(function(s,e){return s+e.valor;},0);
  var tD=despIn.reduce(function(s,d){return s+d.valor;},0),tDi=diIn.reduce(function(s,d){return s+d.valor;},0);
  var tOut=tD+tDi,saldo=tIn-tOut,taxa=tIn>0?Math.round((Math.max(saldo,0)/tIn)*100):0,sc=saldoCls(saldo);
  if(isCur&&g('r-mentor-msg')){var ci0=cycleInfo(),maxD0=ci0.daysLeft>0?Math.max(0,Math.floor(saldo/ci0.daysLeft)):0,msg='';if(saldo<0)msg='<div class="alert alr">🚨 <strong>Mentor:</strong> Conta em vermelho. Nenhuma despesa não essencial até ao dia 5.</div>';else if(saldo<100)msg='<div class="alert alr">🔴 <strong>Mentor:</strong> Saldo de '+fmt(saldo)+' — zona de perigo. Máx. '+fmt(maxD0)+'/dia.</div>';else if(saldo<150)msg='<div class="alert ala">🟠 <strong>Mentor:</strong> Saldo de '+fmt(saldo)+' — atenção. Máx. '+fmt(maxD0)+'/dia.</div>';else if(taxa>=20)msg='<div class="alert alg">🟢 <strong>Mentor:</strong> Excelente! '+taxa+'% de poupança. Move parte para um objetivo.</div>';g('r-mentor-msg').innerHTML=msg;}
  if(isCur&&g('r-countdown')){var ci2=cycleInfo(),maxD2=ci2.daysLeft>0?Math.max(0,Math.floor(saldo/ci2.daysLeft)):0,ws=getWeekSpend(),wc=saldo<100?'var(--red)':saldo<150?'var(--amber)':'var(--t)';g('r-countdown').innerHTML='<div class="countdown" style="background:'+wc+';">'+'<div><div class="cd-big">'+ci2.daysLeft+' dias para o dia 5</div><div class="cd-sub">'+saldoEmoji(saldo)+' Saldo: <strong>'+fmt(saldo)+'</strong></div></div>'+'<div style="text-align:right;"><div style="font-size:14px;font-weight:500;">Máx. '+fmt(maxD2)+'/dia</div><div style="font-size:12px;opacity:.7;">Esta semana: '+fmt(ws)+'</div></div></div>';}else if(g('r-countdown')&&!isCur)g('r-countdown').innerHTML='';
  var alts='';if(tIn===0)alts+='<div class="alert ala">Sem entradas para '+mlbl(m)+'. Regista em Entradas.</div>';if(saldo<0&&tIn>0)alts+='<div class="alert alr">Conta em <strong>VERMELHO</strong>!</div>';else if(saldo<100&&tIn>0)alts+='<div class="alert alr">🔴 Saldo abaixo de 100€ — zona de perigo!</div>';else if(saldo<150&&tIn>0)alts+='<div class="alert ala">🟠 Saldo entre 100-150€ — atenção!</div>';else if(taxa>=20&&tIn>0)alts+='<div class="alert alg">🟢 Óptimo! '+taxa+'% de poupança.</div>';if(tPrev>0)alts+='<div class="alert alp">'+fmt(tPrev)+' em entradas previstas — ver sugestões em Entradas.</div>';var dpp=despIn.filter(function(d){return!d.pago;});if(dpp.length>0)alts+='<div class="alert ala">'+dpp.length+' despesa(s) por pagar: <strong>'+fmt(dpp.reduce(function(s,d){return s+d.valor;},0))+'</strong>.</div>';if(g('r-alerts'))g('r-alerts').innerHTML=alts;
  if(g('r-metrics'))g('r-metrics').innerHTML='<div class="metric"><div class="ml">Entradas</div><div class="mv g">'+fmt(tIn)+'</div></div>'+'<div class="metric"><div class="ml">Despesas</div><div class="mv r">'+fmt(tD)+'</div></div>'+'<div class="metric"><div class="ml">Diário</div><div class="mv r">'+fmt(tDi)+'</div></div>'+'<div class="metric"><div class="ml">Saldo</div><div class="mv '+sc+'">'+fmt(saldo)+'</div></div>'+'<div class="metric"><div class="ml">Poupança</div><div class="mv '+(taxa>=20?'g':taxa>=10?'a':'r')+'">'+taxa+'%</div></div>'+(tPrev>0?'<div class="metric"><div class="ml">Previstas</div><div class="mv" style="color:var(--purple);">'+fmt(tPrev)+'</div></div>':'');
  var pD=tIn>0?Math.min(Math.round((tD/tIn)*100),100):0,pDi=tIn>0?Math.min(Math.round((tDi/tIn)*100),100):0,pT=pD+pDi;
  if(g('r-spendbar'))g('r-spendbar').innerHTML='<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;"><span>Gasto: <strong>'+fmt(tOut)+'</strong></span><span style="color:'+(pT>90?'var(--red)':'var(--t2)')+';">'+pT+'%</span></div><div class="pbar" style="height:12px;"><div style="display:flex;height:100%;"><div style="width:'+pD+'%;background:var(--red);opacity:.75;"></div><div style="width:'+pDi+'%;background:var(--amber);opacity:.85;"></div></div></div><div style="display:flex;gap:1rem;margin-top:5px;font-size:12px;color:var(--t2);">Fixas '+pD+'% · Diário '+pDi+'%'+(saldo>=0?' · <span style="color:var(--green);">Sobra '+fmt(saldo)+'</span>':' · <span style="color:var(--red);">Défice '+fmt(Math.abs(saldo))+'</span>')+'</div>';
  var eHtml='';entIn.forEach(function(e){eHtml+='<div class="li"><div class="ll"><div class="ln">'+e.desc+(e.recorrente?'<span style="font-size:10px;color:var(--green-t);margin-left:5px;">↻</span>':'')+'</div><div class="ls">'+e.data+'</div></div><div class="lr"><span class="am ai">+'+fmt(e.valor)+'</span></div></div>';});entPrev.forEach(function(e){eHtml+='<div class="li"><div class="ll"><div class="ln">'+e.desc+' <span style="font-size:11px;color:var(--purple-t);">(prevista)</span></div></div><div class="lr"><span class="am apv">~'+fmt(e.valor)+'</span></div></div>';});if(g('r-entradas'))g('r-entradas').innerHTML=eHtml||'<div style="font-size:13px;color:var(--t3);">Sem entradas.</div>';
  var byCat={};[...despIn,...diIn].forEach(function(d){byCat[d.cat]=(byCat[d.cat]||0)+d.valor;});var cHtml='';Object.entries(byCat).sort(function(a,b){return b[1]-a[1];}).forEach(function(e){var cat=e[0],val=e[1],p=tIn>0?Math.min(Math.round((val/tIn)*100),100):0,c=CAT[cat]||'#888';cHtml+='<div style="margin-bottom:9px;"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;align-items:center;"><span style="display:flex;align-items:center;">'+dot(cat,9)+cat+'</span><span style="color:var(--t2);">'+fmt(val)+' ('+p+'%)</span></div><div class="pbar"><div class="pfill" style="width:'+p+'%;background:'+c+';"></div></div></div>';});if(g('r-cats'))g('r-cats').innerHTML=cHtml||'<div style="font-size:13px;color:var(--t3);">Sem despesas.</div>';
  var rec=[...diIn].sort(function(a,b){return b.data.localeCompare(a.data);}).slice(0,5);if(g('r-daily'))g('r-daily').innerHTML=rec.length?rec.map(function(d){return'<div class="li"><div class="ll"><div class="ln">'+d.desc+'</div><div class="ls" style="display:flex;align-items:center;">'+dot(d.cat,8)+d.cat+' · '+d.data+'</div></div><div class="lr"><span class="am ao">-'+fmt(d.valor)+'</span></div></div>';}).join('')+'<div style="font-size:12px;color:var(--t3);padding:.3rem 0;cursor:pointer;" onclick="go(\'diario\')">Ver tudo →</div>':'<div style="font-size:13px;color:var(--t3);">Sem registos diários.</div>';
  var oH=objetivos.length?objetivos.map(function(obj){var pct=obj.meta>0?Math.min(Math.round(((obj.atual||0)/obj.meta)*100),100):0;return'<div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;"><span>'+obj.nome+'</span><span class="pill '+(pct>=100?'pg':pct>=50?'pb':'pa')+'">'+pct+'%</span></div><div class="pbar"><div class="pfill" style="width:'+pct+'%;background:'+(pct>=100?'var(--green)':pct>=50?'#1A3F6F':'var(--accent)')+';"></div></div><div style="font-size:12px;color:var(--t3);margin-top:2px;">'+fmt(obj.atual||0)+' de '+fmt(obj.meta)+(obj.prazo?' · '+obj.prazo:'')+'</div></div>';}).join(''):'<div style="font-size:13px;color:var(--t3);">Sem objetivos.</div>';if(g('r-objs'))g('r-objs').innerHTML=oH;
  var ci3=cycleInfo(),mg3=saldo>=200&&ci3.daysLeft>10?Math.max(saldo-200,0)*0.3:0,pend=desejos.filter(function(d){return!d.comprado;}),wH='';if(!pend.length)wH='<div style="font-size:13px;color:var(--t3);">Sem itens.</div>';else if(mg3<=0)wH='<div class="alert ala">Faltam '+ci3.daysLeft+' dias e saldo é '+fmt(saldo)+'. Adia as compras.</div>';else{var order3={alta:0,media:1,baixa:2},m3=[...pend].sort(function(a,b){return order3[a.prio]-order3[b.prio];}).find(function(w){return w.preco<=mg3;});wH=m3?'<div class="alert alg">Com margem de '+fmt(mg3)+' podes considerar: <strong>'+m3.nome+'</strong> ('+fmt(m3.preco)+').</div>':'<div class="alert ala">Nenhum item cabe na margem segura ('+fmt(mg3)+').</div>';}if(g('r-wishes'))g('r-wishes').innerHTML=wH;
  renderNotas();
}

// CASA PORTUGAL
function saveBocaConfig(){var val=parseFloat(g('boca-total').value)||0;if(val<=0){alert('Insere o valor total da casa.');return;}bocaConfig.total=val;saveAll();renderBoca();alert('Guardado: '+fmt(val));}
function addBoca(){var mes=g('boca-mes').value,val=parseFloat(g('boca-val').value)||0,pago=g('boca-pago').value,nota=g('boca-nota').value.trim();if(!mes){alert('Selecciona o mês.');return;}bocaData=bocaData.filter(function(b){return b.mes!==mes;});bocaData.push({id:uid(),mes:mes,valor:val,pago:pago,nota:nota});bocaData.sort(function(a,b){return a.mes.localeCompare(b.mes);});g('boca-val').value='';g('boca-nota').value='';saveAll();renderBoca();}
function delBoca(id){bocaData=bocaData.filter(function(b){return b.id!==id;});saveAll();renderBoca();}
function renderBoca(){
  var el=g('lst-boca');if(!el)return;
  if(bocaConfig.total>0){var ti=g('boca-total');if(ti&&!ti.value)ti.value=bocaConfig.total;}
  var totalPago=bocaData.reduce(function(s,b){return s+(b.pago!=='nao'?b.valor:0);},0),totalCasa=bocaConfig.total||0,falta=Math.max(totalCasa-totalPago,0),pct=totalCasa>0?Math.min(Math.round((totalPago/totalCasa)*100),100):0;
  var rc=g('boca-resumo-card');if(rc)rc.innerHTML='<div class="ct">Progresso — Casa Portugal</div>'+(totalCasa>0?'<div class="metrics" style="margin-bottom:.7rem;"><div class="metric"><div class="ml">Valor total</div><div class="mv">'+fmt(totalCasa)+'</div></div><div class="metric"><div class="ml">Já paguei</div><div class="mv g">'+fmt(totalPago)+'</div></div><div class="metric"><div class="ml">Ainda falta</div><div class="mv '+(falta>0?'r':'g')+'">'+fmt(falta)+'</div></div><div class="metric"><div class="ml">Pago</div><div class="mv '+(pct>=100?'g':'a')+'">'+pct+'%</div></div></div><div class="pbar" style="margin-bottom:.5rem;height:12px;"><div class="pfill" style="width:'+pct+'%;background:var(--green);"></div></div><div style="font-size:12px;color:var(--t2);">'+bocaData.length+' meses registados'+(bocaData.filter(function(b){return b.pago==='nao';}).length>0?' · <span style="color:var(--red);">'+bocaData.filter(function(b){return b.pago==='nao';}).length+' não pagos</span>':'')+'</div>':'<div class="alert ala">Define primeiro o valor total da casa acima.</div>');
  if(!bocaData.length){el.innerHTML='<div style="font-size:13px;color:var(--t3);">Sem registos. Adiciona os pagamentos desde 2023.</div>';return;}
  var html='';[...bocaData].sort(function(a,b){return b.mes.localeCompare(a.mes);}).forEach(function(b){var cor=b.pago==='sim'?'var(--green)':b.pago==='parcial'?'var(--amber)':'var(--red)',emoji=b.pago==='sim'?'✓':b.pago==='parcial'?'~':'✗';html+='<div class="li"><div class="ll"><div class="ln" style="display:flex;align-items:center;gap:6px;"><span style="color:'+cor+';font-weight:700;font-size:15px;">'+emoji+'</span>'+b.mes+'</div>'+(b.nota?'<div class="ls">'+b.nota+'</div>':'')+'</div><div class="lr"><span class="am" style="color:'+cor+';">'+fmt(b.valor)+'</span><button class="btn bd bxs" onclick="delBoca(\''+b.id+'\')">×</button></div></div>';});
  el.innerHTML=html;
}

// RENDA PORTUGAL
function addRenda(){var mes=g('renda-mes').value,esp=parseFloat(g('renda-esp').value)||0,rec=parseFloat(g('renda-rec').value)||0,pago=g('renda-pago').value,nota=g('renda-nota').value.trim();if(!mes){alert('Selecciona o mês.');return;}rendaData=rendaData.filter(function(r){return r.mes!==mes;});rendaData.push({id:uid(),mes:mes,esperado:esp,recebido:rec,pago:pago,nota:nota});rendaData.sort(function(a,b){return a.mes.localeCompare(b.mes);});g('renda-esp').value='';g('renda-rec').value='';g('renda-nota').value='';saveAll();renderRenda();}
function delRenda(id){rendaData=rendaData.filter(function(r){return r.id!==id;});saveAll();renderRenda();}
function renderRenda(){
  var el=g('lst-renda');if(!el)return;
  var tEsp=rendaData.reduce(function(s,r){return s+r.esperado;},0),tRec=rendaData.reduce(function(s,r){return s+r.recebido;},0),emFalta=tEsp-tRec,naoPagos=rendaData.filter(function(r){return r.pago==='nao';});
  var rc=g('renda-resumo-card');if(rc&&rendaData.length)rc.innerHTML='<div class="ct">Resumo — Renda Portugal</div><div class="metrics" style="margin-bottom:0;"><div class="metric"><div class="ml">Total esperado</div><div class="mv">'+fmt(tEsp)+'</div></div><div class="metric"><div class="ml">Total recebido</div><div class="mv g">'+fmt(tRec)+'</div></div><div class="metric"><div class="ml">Em falta</div><div class="mv '+(emFalta>0?'r':'g')+'">'+fmt(emFalta)+'</div></div><div class="metric"><div class="ml">Não pagos</div><div class="mv '+(naoPagos.length>0?'r':'g')+'">'+naoPagos.length+'</div></div></div>'+(naoPagos.length>0?'<div class="alert alr" style="margin-top:.7rem;">Meses não pagos: '+naoPagos.map(function(r){return r.mes;}).join(', ')+'</div>':'');
  if(!rendaData.length){el.innerHTML='<div style="font-size:13px;color:var(--t3);">Sem registos. Adiciona as rendas mês a mês.</div>';return;}
  var html='';[...rendaData].sort(function(a,b){return b.mes.localeCompare(a.mes);}).forEach(function(r){var cor=r.pago==='sim'?'var(--green)':r.pago==='parcial'?'var(--amber)':'var(--red)',emoji=r.pago==='sim'?'✓':r.pago==='parcial'?'~':'✗',diff=r.recebido-r.esperado;html+='<div class="li"><div class="ll"><div class="ln" style="display:flex;align-items:center;gap:6px;"><span style="color:'+cor+';font-weight:700;font-size:15px;">'+emoji+'</span>'+r.mes+'</div><div class="ls">Esperado: '+fmt(r.esperado)+' · Recebido: '+fmt(r.recebido)+(diff<0?' · <span style="color:var(--red);">Falta '+fmt(Math.abs(diff))+'</span>':'')+(r.nota?' · <em>'+r.nota+'</em>':'')+'</div></div><div class="lr"><span class="am" style="color:'+cor+';">'+fmt(r.recebido)+'</span><button class="btn bd bxs" onclick="delRenda(\''+r.id+'\')">×</button></div></div>';});
  el.innerHTML=html;
}

// REMINDER
function checkReminder(){var last=localStorage.getItem('cf_last_reg'),tod=today();if(last===tod)return;var b=document.createElement('div');b.style.cssText='position:fixed;bottom:1.2rem;right:1rem;left:1rem;max-width:400px;margin:0 auto;background:var(--t);color:#fff;border-radius:var(--rlg);padding:.9rem 1.2rem;z-index:999;display:flex;justify-content:space-between;align-items:center;gap:1rem;box-shadow:0 4px 20px rgba(0,0,0,.3);';b.innerHTML='<div><div style="font-weight:600;">Já registaste os gastos de hoje?</div><div style="font-size:12px;opacity:.65;">Abre o Diário!</div></div><button onclick="go(\'diario\');this.closest(\'[style]\').remove();localStorage.setItem(\'cf_last_reg\',\''+tod+'\');" style="background:var(--accent);color:#fff;border:none;border-radius:5px;padding:7px 12px;font-weight:600;cursor:pointer;font-size:13px;">Registar</button>';document.body.appendChild(b);setTimeout(function(){if(b.parentElement)b.remove();},12000);}
document.addEventListener('visibilitychange',function(){if(!document.hidden&&USER_KEY)checkReminder();});

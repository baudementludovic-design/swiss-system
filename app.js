(()=>{
'use strict';
const $=id=>document.getElementById(id), content=$('content');
const liveId=new URLSearchParams(location.search).get('id');
const cfg=window.PETANQUE_LIVE_CONFIG||{};
let snapshot=null, activeTab='suisses', roundIndex=0, groupIndex=0, finalIndex=0, detailId=null, lastUpdated=null, working=false, focusTeamId=null;
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;};
const add=(p,tag,cls,text)=>{const e=el(tag,cls,text);p.append(e);return e;};
const fmt=v=>v==null||v===''?'—':String(v);
const key=v=>v==null?'':String(v);
const normalizeSearch=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr');
const teams=()=>Array.isArray(snapshot?.teams)?snapshot.teams:[];
const teamInfo=id=>teams().find(t=>key(t.id)===key(id));
const teamName=id=>{if(id==null)return 'À déterminer';const t=teamInfo(id);if(!t)return 'Équipe '+String(id);return 'N° '+fmt(t.number)+(Array.isArray(t.players)&&t.players.length?' · '+t.players.join(' / '):'');};
const btn=(text,click,cls)=>{const b=el('button',cls,text);b.type='button';b.addEventListener('click',click);return b;};
const empty=(p,text)=>add(p,'div','empty',text);
const tabs=(parent,values,selected,onChange)=>{const wrap=add(parent,'div','tabs');values.forEach((v,i)=>{const b=btn(v.label,()=>onChange(i),i===selected?'selected':'');b.setAttribute('aria-pressed',String(i===selected));wrap.append(b);});return wrap;};
function openTeam(id){if(id==null||!teamInfo(id))return;detailId=id;$('search').value='';$('searchResults').classList.add('hide');render();window.scrollTo({top:0,behavior:'smooth'});}
function goToTeam(id){
 if(id==null||!teamInfo(id))return;
 const groups=snapshot?.finals?.groups||[];
 let latest=null;
 groups.forEach((group,g)=>{(group.rounds||[]).forEach((round,r)=>{
  if((round.matches||[]).some(m=>key(m.teamA)===key(id)||key(m.teamB)===key(id))){
   const stage={g,r};if(!latest||r>latest.r)latest=stage;
  }
 });});
 if(latest){activeTab='finales';groupIndex=latest.g;finalIndex=latest.r;}
 else{
  const rounds=snapshot?.rounds||[];
  let last=-1;rounds.forEach((round,r)=>{if((round.matches||[]).some(m=>key(m.teamA)===key(id)||key(m.teamB)===key(id)))last=r;});
  if(last>=0){activeTab='suisses';roundIndex=last;}
  else{activeTab='equipes';}
 }
 focusTeamId=id;detailId=null;$('search').value='';$('searchResults').classList.add('hide');
 render();
 const target=content.querySelector('.focus-match')||content;
 if(target.scrollIntoView)target.scrollIntoView({behavior:'smooth',block:'center'});
}
function teamActions(parent,id){const actions=add(parent,'div','team-entry-actions');actions.append(btn('Voir la fiche',()=>openTeam(id),'search-action'));actions.append(btn('Y aller →',()=>goToTeam(id),'search-action go'));}
function renderTeams(){
 add(content,'h2',null,'Équipes inscrites');
 const all=teams().slice().sort((a,b)=>Number(a.number)-Number(b.number));
 if(!all.length)return empty(content,'Aucune équipe publiée.');
 add(content,'p','muted',all.length+' équipes · Touchez « Voir la fiche » pour le parcours, ou « Y aller » pour accéder à leur phase la plus avancée.');
 const list=add(content,'div','team-directory');
 all.forEach(t=>{const entry=add(list,'article','team-entry');const header=add(entry,'div','team-entry-header');add(header,'strong',null,'Équipe n° '+fmt(t.number));if(t.present===false)add(header,'span','badge absent','Absente');else if(t.present===true)add(header,'span','badge done','Présente');add(entry,'p',null,Array.isArray(t.players)&&t.players.length?t.players.join(' · '):'Composition non publiée');if(t.club)add(entry,'p','muted','Club : '+t.club);teamActions(entry,t.id);});
}
function teamButton(parent,id){const b=btn(teamName(id),()=>openTeam(id),'team-link');if(id==null||!teamInfo(id))b.disabled=true;parent.append(b);return b;}
function cardMatch(parent,m,context){const finished=context==='swiss'?m.status==='VALIDÉ':m.winner!=null;const hasTeams=m.teamA!=null&&m.teamB!=null;const terrainRaw=fmt(m.terrain).trim();const normalizedTerrain=terrainRaw.toLocaleLowerCase('fr');const hasAssignedTerrain=!!terrainRaw&&terrainRaw!=='—'&&!['en attente','en attente de terrain','attente','a definir','à définir','a définir','a definir / en attente','à definir / en attente'].includes(normalizedTerrain);const terrainLabel=hasAssignedTerrain?'⌖  Terrain '+terrainRaw:'⌖  Terrain En attente';let badgeClass='wait';let badgeText='À jouer';if(finished){badgeClass='done';badgeText='Terminé';}else if(hasAssignedTerrain){badgeClass='wait';badgeText='En cours';}else if(hasTeams){badgeClass='ready';badgeText='À jouer';}const box=add(parent,'article','match');if(focusTeamId!=null&&(key(m.teamA)===key(focusTeamId)||key(m.teamB)===key(focusTeamId)))box.classList.add('focus-match');const head=add(box,'div','match-top');add(head,'span','terrain',terrainLabel);add(head,'span','badge '+badgeClass,badgeText);
 const line=(id,score,win)=>{const r=add(box,'div','teamline');if(id==null&&m.bye) add(r,'span','team-link','Exempt');else teamButton(r,id);add(r,'span','score'+(win?' winner':''),finished?fmt(score):'—');};
 line(m.teamA,m.scoreA,finished&&(context==='final'?key(m.winner)===key(m.teamA):Number(m.scoreA)>Number(m.scoreB)));
 add(box,'hr','teamsep');line(m.teamB,m.scoreB,finished&&(context==='final'?key(m.winner)===key(m.teamB):Number(m.scoreB)>Number(m.scoreA)));
 return box;}
function renderSwiss(){const rounds=snapshot.rounds||[];add(content,'h2',null,'Tours suisses');if(!rounds.length)return empty(content,'Aucun tour suisse publié pour le moment.');roundIndex=Math.min(roundIndex,rounds.length-1);tabs(content,rounds.map(r=>({label:'Tour '+r.number})),roundIndex,i=>{roundIndex=i;render();});const round=rounds[roundIndex];const header=add(content,'div','section-header');add(header,'h3',null,'Rencontres · Tour '+round.number);add(header,'span','muted',(round.matches||[]).length+' matchs');const list=add(content,'div','list matches');(round.matches||[]).forEach(m=>cardMatch(list,m,'swiss'));if(!round.matches?.length)empty(list,'Aucune rencontre dans ce tour.');}
function renderFinals(){add(content,'h2',null,'Phases finales');const groups=snapshot.finals?.groups||[];if(!groups.length)return empty(content,'Les phases finales ne sont pas encore publiées.');groupIndex=Math.min(groupIndex,groups.length-1);tabs(content,groups.map(g=>({label:'Concours '+g.name})),groupIndex,i=>{groupIndex=i;finalIndex=0;render();});const group=groups[groupIndex];const rounds=group.rounds||[];if(!rounds.length)return empty(content,'Aucune rencontre publiée pour ce concours.');finalIndex=Math.min(finalIndex,rounds.length-1);tabs(content,rounds.map(r=>({label:r.name})),finalIndex,i=>{finalIndex=i;render();});const round=rounds[finalIndex];const header=add(content,'div','section-header');add(header,'h3',null,round.name);add(header,'span','muted',(round.matches||[]).length+' matchs');const list=add(content,'div','list matches');(round.matches||[]).forEach(m=>cardMatch(list,m,'final'));if(!round.matches?.length)empty(list,'Aucune rencontre disponible.');if(group.winner!=null){const box=add(content,'div','msg');box.style.marginTop='15px';add(box,'strong',null,'Vainqueur du concours : ');teamButton(box,group.winner);}}
function composition(t){return Array.isArray(t?.players)&&t.players.length?t.players.join(' · '):'Composition non publiée';}
function signed(v){if(v==null||v==='')return '—';const n=Number(v);return Number.isFinite(n)?(n>0?'+':'')+n:fmt(v);}
function renderRanking(){
 add(content,'h2',null,'Classement général');
 const rows=snapshot.ranking||[];if(!rows.length)return empty(content,'Le classement n’est pas encore disponible.');
 const outer=add(content,'div','ranking-scroll');outer.setAttribute('role','region');outer.setAttribute('aria-label','Classement général, défilement horizontal sur mobile');outer.tabIndex=0;
 const table=add(outer,'table','ranking-table');const thead=add(table,'thead');const h=add(thead,'tr');
 ['Rang','Équipe','Club','J','V','Buchholz','Buchholz fin','Diff.','Tir de départage'].forEach(label=>add(h,'th',null,label));
 const body=add(table,'tbody');
 rows.forEach(r=>{const tr=add(body,'tr');const team=teamInfo(r.teamId);
  const rank=add(tr,'td','ranking-rank');add(rank,'span','rank-medal',fmt(r.rank));
  const name=add(tr,'td','ranking-team');const button=btn('',()=>openTeam(r.teamId),'ranking-team-button');
  add(button,'strong',null,'N° '+fmt(team?.number));add(button,'span',null,composition(team));name.append(button);
  add(tr,'td','ranking-club',team?.club||'—');
  [r.played,r.wins,r.buchholz,r.fineBuchholz].forEach((val,i)=>add(tr,'td','ranking-number'+(i===1?' ranking-wins':''),fmt(val)));
  add(tr,'td','ranking-number',signed(r.diff));add(tr,'td','ranking-number',fmt(r.shootout));
 });
 const note=add(content,'p','ranking-note','Touchez une équipe pour consulter sa composition et l’ensemble de ses rencontres. Faites glisser le classement horizontalement pour afficher tous les critères.');
}

function renderDetail(){const t=teamInfo(detailId);if(!t){detailId=null;render();return;}content.append(btn('← Retour',()=>{detailId=null;render();},'detail-back'));const hero=add(content,'div','detail-hero');add(hero,'span','overline','Équipe N° '+fmt(t.number));add(hero,'h2',null,'Équipe n° '+fmt(t.number));const members=add(hero,'div','detail-composition');add(members,'strong',null,'Composition de l’équipe');if(t.players?.length){const ul=add(members,'ul');t.players.forEach(player=>add(ul,'li',null,player));}else add(members,'p',null,'Les noms des joueurs ne sont pas publiés pour cette compétition.');if(t.club)add(hero,'p',null,'Club : '+t.club);
 const rank=(snapshot.ranking||[]).find(r=>key(r.teamId)===key(detailId));const stats=add(content,'div','detail-stats');[[rank?.rank?'#'+rank.rank:'—','Classement'],[rank?.wins??'—','Victoires'],[rank?.played??'—','Matchs joués']].forEach(([n,l])=>{const b=add(stats,'div');add(b,'strong',null,n);add(b,'small',null,l);});
 add(content,'h3','detail-section','Parcours en tours suisses');let seen=0;const swiss=add(content,'div','list');(snapshot.rounds||[]).forEach(r=>(r.matches||[]).forEach(m=>{if(key(m.teamA)===key(detailId)||key(m.teamB)===key(detailId)){seen++;const box=add(swiss,'div','match');const h=add(box,'div','match-top');add(h,'strong','terrain','Tour '+r.number+' · Terrain '+fmt(m.terrain));const finished=m.status==='VALIDÉ';add(h,'span','badge '+(finished?'done':'wait'),finished?'Terminé':'À jouer');const opp=key(m.teamA)===key(detailId)?m.teamB:m.teamA;const score=key(m.teamA)===key(detailId)?[m.scoreA,m.scoreB]:[m.scoreB,m.scoreA];const line=add(box,'div','teamline');if(m.bye)add(line,'span','team-link','Exempt');else teamButton(line,opp);add(line,'span','score',finished?fmt(score[0])+' – '+fmt(score[1]):'—');}}));if(!seen)empty(swiss,'Pas de rencontre suisse disponible.');
 const finalMatches=[];(snapshot.finals?.groups||[]).forEach(g=>(g.rounds||[]).forEach(r=>(r.matches||[]).forEach(m=>{if(key(m.teamA)===key(detailId)||key(m.teamB)===key(detailId))finalMatches.push({m,group:g.name,round:r.name});})));if(finalMatches.length){add(content,'h3','detail-section','Parcours en phases finales');const fl=add(content,'div','list');finalMatches.forEach(({m,group,round})=>{const b=add(fl,'div','match');add(b,'div','terrain','Concours '+group+' · '+round+' · Terrain '+fmt(m.terrain));const r=add(b,'div','teamline');teamButton(r,key(m.teamA)===key(detailId)?m.teamB:m.teamA);add(r,'span','score',m.winner!=null?fmt(m.scoreA)+' – '+fmt(m.scoreB):'—');});}}
function render(){if(!snapshot)return;content.replaceChildren();document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===activeTab);b.setAttribute('aria-current',b.dataset.tab===activeTab?'page':'false');});if(detailId!==null)return renderDetail();if(activeTab==='finales')renderFinals();else if(activeTab==='classement')renderRanking();else if(activeTab==='equipes')renderTeams();else renderSwiss();}
function findTeams(){
 const query=normalizeSearch($('search').value.trim());
 const out=$('searchResults');out.replaceChildren();
 if(!query){out.classList.add('hide');return;}
 out.classList.remove('hide');
 const found=teams().filter(t=>normalizeSearch(t.number).includes(query)||normalizeSearch((t.players||[]).join(' ')).includes(query)||normalizeSearch(t.club||'').includes(query)).slice(0,15);
 if(!found.length)return empty(out,'Aucune équipe ni joueur trouvé.');
 found.forEach(t=>{const row=add(out,'div','search-hit');const name=add(row,'span','search-hit-info');add(name,'strong',null,'Équipe n° '+fmt(t.number));add(name,'small',null,(t.players||[]).join(' / ')||'Composition non publiée');const actions=add(row,'div','search-hit-actions');actions.append(btn('Fiche',()=>openTeam(t.id),'search-action'));actions.append(btn('Y aller →',()=>goToTeam(t.id),'search-action go'));});
}
function apply(data,updated){snapshot=data;lastUpdated=updated;$('title').textContent=data.competition?.name||'Compétition';$('metadata').textContent=[data.competition?.date,data.competition?.location,data.competition?.format].filter(Boolean).join(' · ')||'Suivi public de la compétition';$('statTeams').textContent=teams().length;const rounds=data.rounds||[];$('statRound').textContent=rounds.length+'/'+(data.competition?.plannedRounds||rounds.length);$('statMatches').textContent=rounds.reduce((n,r)=>n+(r.matches||[]).filter(m=>m.status==='VALIDÉ').length,0);$('status').textContent='Dernière publication : '+(updated?new Date(updated).toLocaleString('fr-FR'):'inconnue');render();if($('search').value.trim())findTeams();}
async function load(){if(working)return;working=true;try{if(!/^[a-f0-9-]{36}$/i.test(liveId||''))throw Error('Lien incomplet : identifiant Live manquant ou invalide.');if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.supabaseUrl||'')||!cfg.anonKey)throw Error('Site non configuré : vérifiez config.js.');const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);let resp;try{resp=await fetch(cfg.supabaseUrl+'/rest/v1/live_competitions?select=payload,updated_at&published=eq.true&public_id=eq.'+encodeURIComponent(liveId),{headers:{apikey:cfg.anonKey},cache:'no-store',signal:controller.signal});}finally{clearTimeout(timeout);}if(!resp.ok)throw Error('Impossible de récupérer les résultats (HTTP '+resp.status+').');const rows=await resp.json();if(!rows.length)throw Error('Compétition non publiée ou retirée du public.');apply(rows[0].payload,rows[0].updated_at);}catch(e){$('status').textContent='Mise à jour impossible : '+String(e.message||e);if(!snapshot){content.replaceChildren();empty(content,String(e.message||e));}}finally{working=false;}}
 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{activeTab=b.dataset.tab;detailId=null;focusTeamId=null;render();}));$('search').addEventListener('input',findTeams);$('refresh').addEventListener('click',load);load();setInterval(load,15000);
})();

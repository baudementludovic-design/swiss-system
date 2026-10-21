(()=>{
'use strict';
const $=id=>document.getElementById(id),content=$('content');
const id=new URLSearchParams(location.search).get('id');
const cfg=window.PETANQUE_LIVE_CONFIG||{};
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(cls)e.className=cls;return e;};
const card=(heading)=>{const a=make('section',undefined,'card');a.append(make('h2',heading));content.append(a);return a;};
function table(parent,headers,rows){const outer=make('div',undefined,'scroll'),t=make('table'),head=make('thead'),tr=make('tr');headers.forEach(h=>tr.append(make('th',h)));head.append(tr);t.append(head);const body=make('tbody');rows.forEach(row=>{const tr=make('tr');row.forEach(v=>tr.append(make('td',v==null?'—':v)));body.append(tr)});t.append(body);outer.append(t);parent.append(outer);}
function render(s,updated){content.replaceChildren();$('title').textContent=s.competition?.name||'Compétition';$('metadata').textContent=[s.competition?.date,s.competition?.location,s.competition?.format].filter(Boolean).join(' · ');$('status').textContent='Dernière publication : '+(updated?new Date(updated).toLocaleString('fr-FR'):'inconnue');
const names=new Map((s.teams||[]).map(t=>[String(t.id),`Équipe n° ${t.number}`+(t.players?.length?` — ${t.players.join(' / ')}`:'')]));const team=id=>id==null?'À déterminer':names.get(String(id))||'Équipe n° '+String(id);
for(const r of s.rounds||[]){const box=card('Tour suisse '+r.number);table(box,['Terrain','Équipe A','Score','Équipe B','État'],(r.matches||[]).map(m=>[m.terrain??'—',team(m.teamA),m.status==='VALIDÉ'?`${m.scoreA??'—'} – ${m.scoreB??'—'}`:'—',m.bye?'Exempt':team(m.teamB),m.status]));}
const rank=card('Classement');table(rank,['Rang','Équipe','Joués','Victoires','Buchholz'],(s.ranking||[]).map(r=>[r.rank,team(r.teamId),r.played,r.wins,r.buchholz]));
for(const g of s.finals?.groups||[]){const c=card('Phases finales — '+g.name);for(const r of g.rounds||[]){c.append(make('h3',r.name));table(c,['Terrain','Équipe A','Résultat','Équipe B'],(r.matches||[]).map(m=>[m.terrain??'—',team(m.teamA),m.winner?`${m.scoreA??'—'} – ${m.scoreB??'—'}`:'—',team(m.teamB)]));}}
}
let working=false;
async function load(){if(working)return;working=true;try{if(!/^[a-f0-9-]{36}$/i.test(id||''))throw Error('Lien incomplet : identifiant Live manquant ou invalide.');if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.supabaseUrl||'')||!cfg.anonKey)throw Error('Site non configuré : renseignez config.js.');const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);let resp;try{resp=await fetch(cfg.supabaseUrl+'/rest/v1/live_competitions?select=payload,updated_at&published=eq.true&public_id=eq.'+encodeURIComponent(id),{headers:{apikey:cfg.anonKey},signal:controller.signal,cache:'no-store'});}finally{clearTimeout(timer);}if(!resp.ok)throw Error('Serveur indisponible (HTTP '+resp.status+').');const rows=await resp.json();if(!rows.length)throw Error('Compétition non publiée ou retirée du public.');render(rows[0].payload,rows[0].updated_at);}catch(e){$('status').textContent=String(e.message||e);}finally{working=false;}}
$('refresh').onclick=load;load();setInterval(load,15000);
})();

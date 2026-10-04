"use strict";
const LOGS_STORAGE_KEY="bernamanews_internship_logs",SETTINGS_STORAGE_KEY="bernamanews_internship_settings",
TASK_REFERENCE_KEY="bernamanews_task_reference",DRAFT_STORAGE_KEY="bernamanews_log_draft";
let DB,logs=[],settings,refs=[],view="dashboard",refQ="",refCat="ALL",calMonth=new Date(2026,9,1);
const $=s=>document.querySelector(s),esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const jget=(k,d)=>{try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)}catch(e){return d}};
const jset=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2800)}
/* IndexedDB */
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open("bernamanewsInternshipDB",1);
r.onupgradeneeded=()=>{["images","attachments"].forEach(n=>r.result.createObjectStore(n,{keyPath:"id"}))};
r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
const tx=(s,m,f)=>new Promise((res,rej)=>{const t=DB.transaction(s,m),st=t.objectStore(s),q=f(st);t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error)});
const imgPut=o=>tx("images","readwrite",s=>s.put(o)),imgDel=id=>tx("images","readwrite",s=>s.delete(id)),imgAll=()=>tx("images","readonly",s=>s.getAll());
const imgGet=id=>tx("images","readonly",s=>s.get(id));
function compress(file){return new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>{const i=new Image();i.onload=()=>{
const k=Math.min(1,1600/Math.max(i.width,i.height)),c=document.createElement("canvas");c.width=Math.round(i.width*k);c.height=Math.round(i.height*k);
c.getContext("2d").drawImage(i,0,0,c.width,c.height);res(c.toDataURL("image/jpeg",.8))};i.onerror=rej;i.src=fr.result};fr.onerror=rej;fr.readAsDataURL(file)})}
/* Seed data (only if keys absent) */
const D1=["Attended internship briefing.","Reported for duty.","Explored the workplace and familiarised myself with the working environment.","Registered fingerprint access for entering the office."];
const D2=["Learned the schedule for going downstairs to adjust the background for live news broadcasts.","Practiced creating the Daily Newspaper slide.","Learned about the files required when receiving a task.","Learned how to use existing templates.","Learned how to insert required data into templates.","Used Adobe Photoshop.","Worked with AKM poster.","Worked with weather graphics."];
const D3=["Created news poster graphics.","Created caller graphics.","Prepared background graphics for news.","Worked with weather graphics.","Worked with Ponmozhi Tamil.","Prepared BERNAMA World poster.","Prepared BERNAMA World lobby.","Prepared BERNAMA World caller.","Prepared BERNAMA World POV.","Worked with MPI.","Prepared BERNAMA World POV.","Prepared BERNAMA World lobby.","Prepared BERNAMA World caller.","Prepared Palestine news poster.","Prepared Palestine lobby.","Prepared Palestine POV.","Prepared Palestine caller."];
const D4=["Prepared VC Siraj slide for 9:00 AM.","Prepared Phone Call slide for 11:00 AM.","Worked on Daily Newspaper.","Prepared MPI Caller.","Prepared The Nation lobby.","Prepared The Nation poster."];
const D5=["Prepared Daily Newspaper.","Prepared Daily Weather.","Prepared FB PMX Popup in BM.","Prepared PMX Mugshot slide in BM."];
const mk=(d,date,t,p,l)=>({id:uid(),date,start:"",end:"",dept:"BERNAMA TV – Graphics",tasks:t.map(x=>"- "+x).join("\n"),process:"",tools:"",problems:p||"",solution:"",learning:l||"",output:"",remarks:"",status:"Pending",notes:"",photos:[],day:d,updated:Date.now()});
const seedLogs=()=>[mk(1,"2026-09-28",D1,"Was unfamiliar with the workplace environment, procedures and access system.","Learned about the workplace procedures, office environment and basic access requirements."),
mk(2,"2026-09-29",D2,"Had to familiarise myself with different file types, templates and workflow requirements.","Learned how broadcast graphics are prepared according to specific schedules and templates."),
mk(3,"2026-09-30",D3),mk(4,"2026-10-01",D4),mk(5,"2026-10-02",D5,"","","")];
const R=(title,category,o)=>Object.assign({id:uid(),title,category,path:"",file:"",ext:"",folder:"",template:"",version:"",start:"",end:"",fps:"",duration:"",format:"",codec:"",purpose:"",notes:"",steps:[],updated:Date.now()},o);
const seedRefs=()=>[
R("INTERN – News Time / File","OTHER",{notes:"NEWS TIME\n11:00\n2:00\n3:00\n4:00\n\nFILE\nweather tamil\nmandarin tamil -\nend 650"}),
R("MET / WEATHER","WEATHER",{file:"weather_2026",template:"Weather 2022",format:"MOV / MPEG-4",end:"860",start:"0",notes:"FILE\nDate: 02 OCT 2026\nLocation: Labuan daerah; Kuching",steps:["Open template","Weather","Weather 2022","UDT","Data Entry","Enter MET data into weather data","Location: Labuan daerah, Kuching","After data entry is complete: Press Design","860","Date: 02 OCT 2026","Output: MOV / MPEG-4"]}),
R("SUKAN","SPORTS",{template:"Version 6",notes:"Reference: Popup KBS\nSUKAN PLUS\nFF Statement: 250\nGrafik File: Taufiq\nWeather: 2026"}),
R("MPI CALLER","CALLER",{format:"MP4",codec:"H.264",notes:"wave\ncaller"}),
R("MUGSHOT","MUGSHOT",{purpose:"Use when there is a person's image with text.",notes:"Value: 250"}),
R("MEDIA SOSIAL","SOCIAL MEDIA",{notes:"FB POPUP\nValue: 250\n\nSLIDE POPUP\nstatement\nTamil"}),
R("BURSA","BURSA",{steps:["UDT","Open","Search Bursa Mandarin","CNP Data","UP","UP Rate"]}),
R("NEWSPAPER","NEWSPAPER",{steps:["Newspaper","Newspaper Daily","WASP","Newspaper","Newspaper4Digital","1200"]}),
R("PMX Popup","POPUP",{start:"0",format:"MP4",codec:"H.264",purpose:"Popup graphic reference (PMX). Related: FB PMX Popup in BM, PMX Mugshot slide in BM."})];
const persist=()=>{jset(LOGS_STORAGE_KEY,logs);settings.lastSaved=Date.now();jset(SETTINGS_STORAGE_KEY,settings)};
const saveRefs=()=>jset(TASK_REFERENCE_KEY,refs);
/* Init */
async function init(){
try{DB=await openDB()}catch(e){console.error(e)}
settings=jget(SETTINGS_STORAGE_KEY,null);
let l=jget(LOGS_STORAGE_KEY,null);
if(!settings)settings={name:"",matric:"",university:"",supervisor:"",seeded:false,lastSaved:null};
if(!settings.seeded&&l===null){l=seedLogs();jset(LOGS_STORAGE_KEY,l);settings.seeded=true;settings.lastSaved=Date.now();jset(SETTINGS_STORAGE_KEY,settings)}
else if(!settings.seeded){settings.seeded=true;jset(SETTINGS_STORAGE_KEY,settings)}
logs=l||[];
refs=jget(TASK_REFERENCE_KEY,null);if(refs===null){refs=seedRefs();saveRefs()}
buildNav();render();
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();
if("serviceWorker" in navigator)navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
if(jget(DRAFT_STORAGE_KEY,null))setTimeout(()=>{if(view==="dashboard")render()},0);
}
const VIEWS=[["dashboard","🏠","Dashboard"],["logbook","📖","Logbook"],["reference","🗂","Reference"],["calendar","📅","Calendar"],["stats","📊","Stats"],["settings","⚙","Settings"]];
function buildNav(){$("#nav").innerHTML=VIEWS.map(v=>`<button data-v="${v[0]}"><div>${v[1]}</div>${v[2]}</button>`).join("");
$("#nav").onclick=e=>{const b=e.target.closest("button");if(b){view=b.dataset.v;render()}};$("#addLog").onclick=()=>logForm()}
function render(){document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("on",b.dataset.v===view));
const f={dashboard:rDash,logbook:rLogbook,reference:rRef,calendar:rCal,stats:rStats,settings:rSet}[view];$("#app").innerHTML=f();wire()}
const fmtD=d=>d?new Date(d+"T00:00").toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}):"";
const sorted=()=>[...logs].sort((a,b)=>(a.date||"").localeCompare(b.date||""));
async function photoHTML(l){const a=[];for(const id of l.photos||[]){const o=await imgGet(id);if(o)a.push(`<figure style="margin:0"><img src="${o.data}" alt=""><figcaption class="meta">${esc(o.caption||"")}</figcaption></figure>`)}return a.join("")}
function logCard(l){return `<article class="card"><h3>${l.day?"Day "+l.day+" – ":""}${fmtD(l.date)}</h3><div class="meta">${esc(l.dept)} · ${esc(l.status)}</div>
<ul class="s">${esc(l.tasks).split("\n").filter(Boolean).map(x=>`<li>${x.replace(/^- /,"")}</li>`).join("")}</ul>
${l.problems?`<p><b>Challenges:</b> ${esc(l.problems)}</p>`:""}${l.learning?`<p><b>Learning:</b> ${esc(l.learning)}</p>`:""}${l.notes?`<p><b>Notes:</b> ${esc(l.notes)}</p>`:""}
<div class="ph" data-ph="${l.id}"></div>
<div class="acts"><button class="btn" data-a="edit" data-id="${l.id}">✏ Edit</button><button class="btn" data-a="dup" data-id="${l.id}">⧉ Duplicate</button><button class="btn" data-a="photo" data-id="${l.id}">📷 Add Photo</button><button class="btn" data-a="note" data-id="${l.id}">📝 Add Notes</button><button class="btn danger" data-a="del" data-id="${l.id}">🗑 Delete</button></div></article>`}
function rDash(){const d=jget(DRAFT_STORAGE_KEY,null),s=sorted(),n=logs.length;
return `${d?`<div class="card banner"><b>You have an unfinished log.</b><div class="acts"><button class="btn primary" data-a="draft">Continue Draft</button><button class="btn outline" data-a="nodraft">Discard</button></div></div>`:""}
<div class="grid"><div class="card stat"><b>${n}</b>Log entries</div><div class="card stat"><b>${new Set(logs.map(l=>l.date)).size}</b>Days logged</div><div class="card stat"><b>${refs.length}</b>References</div></div>
<h2>Latest logs</h2>${s.slice(-3).reverse().map(logCard).join("")||"<p>No logs yet. Tap Add Today's Log.</p>"}`}
function rLogbook(){return `<div class="card"><h3>Print options</h3>
<label><input type="radio" name="pm" value="all" checked style="width:auto;min-height:0"> All logs</label>
<label><input type="radio" name="pm" value="date" style="width:auto;min-height:0"> Selected date <input type="date" id="pd"></label>
<label><input type="radio" name="pm" value="range" style="width:auto;min-height:0"> Date range <span class="row2"><input type="date" id="pf"><input type="date" id="pt"></span></label>
<label><input type="radio" name="pm" value="month" style="width:auto;min-height:0"> Current month</label>
<label><input type="checkbox" id="pp" checked style="width:auto;min-height:0"> Include photos</label>
<div class="acts"><button class="btn primary" data-a="print">🖨 Print Logbook</button></div></div>
${sorted().map(logCard).join("")||"<p>No logs yet.</p>"}`}
function rRef(){const q=refQ.toLowerCase(),cats=["ALL","WEATHER","NEWS","SPORTS","NEWSPAPER","CALLER","POPUP","MUGSHOT","SOCIAL MEDIA","BURSA","OTHER"];
const list=refs.filter(r=>(refCat==="ALL"||r.category===refCat)&&(!q||JSON.stringify(r).toLowerCase().includes(q)));
return `<input id="rq" placeholder="🔍 Search workflow, file, template..." value="${esc(refQ)}"><div class="chips">${cats.map(c=>`<button class="chip ${c===refCat?"on":""}" data-cat="${c}">${c}</button>`).join("")}</div>
<button class="btn primary" data-a="rnew">＋ New Reference</button><div style="height:12px"></div>
${list.map(r=>`<article class="card"><h3>${esc(r.title)}</h3><div class="meta">${esc(r.category)}${r.template?" · Template: "+esc(r.template):""}${r.format?" · "+esc(r.format):""}${r.codec?" / "+esc(r.codec):""}</div>
${r.purpose?`<p>${esc(r.purpose)}</p>`:""}
${r.steps.length?`<ol class="s">${r.steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol>`:""}
<p class="meta">${[r.file&&"File: "+r.file+(r.ext?"."+r.ext:""),r.version&&"Version: "+r.version,r.start!==""&&"Start frame: "+r.start,r.end!==""&&"End frame: "+r.end,r.fps&&"FPS: "+r.fps,r.duration&&"Duration: "+r.duration,r.path&&"Path: "+r.path].filter(Boolean).map(esc).join(" · ")}</p>
${r.notes?`<p style="white-space:pre-wrap">${esc(r.notes)}</p>`:""}
<div class="acts"><button class="btn" data-a="redit" data-id="${r.id}">✏ Edit</button><button class="btn" data-a="rdup" data-id="${r.id}">⧉ Duplicate</button><button class="btn" data-a="rcopy" data-id="${r.id}">📋 Copy Path</button><button class="btn danger" data-a="rdel" data-id="${r.id}">🗑 Delete</button></div></article>`).join("")||"<p>No matching references.</p>"}`}
function rCal(){const y=calMonth.getFullYear(),m=calMonth.getMonth(),n=new Date(y,m+1,0).getDate(),off=new Date(y,m,1).getDay();
const has=new Set(logs.map(l=>l.date));let c="";for(let i=0;i<off;i++)c+="<span></span>";
for(let d=1;d<=n;d++){const k=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;c+=`<div class="${has.has(k)?"has":""}">${d}</div>`}
return `<div class="card"><div class="acts" style="justify-content:space-between;margin:0 0 10px"><button class="btn" data-a="pm">‹</button><b>${calMonth.toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</b><button class="btn" data-a="nm">›</button></div><div class="cal">${c}</div></div>`}
function rStats(){const by={};logs.forEach(l=>{const k=(l.date||"").slice(0,7);by[k]=(by[k]||0)+1});
const tasks=logs.reduce((a,l)=>a+l.tasks.split("\n").filter(Boolean).length,0);
return `<div class="grid"><div class="card stat"><b>${logs.length}</b>Logs</div><div class="card stat"><b>${tasks}</b>Tasks recorded</div><div class="card stat"><b>${logs.filter(l=>l.status==="Verified").length}</b>Verified</div></div>
<div class="card"><h3>Logs per month</h3>${Object.keys(by).sort().map(k=>`<p>${k}: ${by[k]}</p>`).join("")||"No data"}</div>`}
function rSet(){return `<div class="card"><h3>DATA STATUS</h3><p class="ok">● Local data storage active</p><p>Log Entries: <b>${logs.length}</b><br>Photos: <b id="pc">…</b><br>Last Saved: <b>${settings.lastSaved?new Date(settings.lastSaved).toLocaleString("en-GB",{day:"numeric",month:"long",year:"numeric",hour:"numeric",minute:"2-digit"}):"Never"}</b></p>
<div class="acts"><button class="btn primary" data-a="export">⬇ Export Backup</button><button class="btn" data-a="import">⬆ Import Backup</button></div><input type="file" id="imp" accept=".json" hidden></div>
<div class="card"><h3>Student details</h3>${["name:Student name","matric:Matric / ID","university:University","supervisor:Supervisor"].map(x=>{const[k,l]=x.split(":");return `<label>${l}</label><input data-s="${k}" value="${esc(settings[k])}">`}).join("")}
<p class="meta">Internship: BERNAMA – BERNAMA TV Graphics, 28 September 2026 – 12 March 2027</p></div>`}
/* Forms */
const LF=[["date","Date","date"],["start","Start Time","time"],["end","End Time","time"],["dept","Department"],["tasks","Tasks / Activities","ta"],["process","Work Process","ta"],["tools","Software / Tools"],["problems","Problems / Challenges","ta"],["solution","Solution / Action Taken","ta"],["learning","Learning / Reflection","ta"],["output","Output / Result","ta"],["remarks","Supervisor Remarks","ta"],["notes","Notes","ta"]];
function field(k,l,t,v,pre){return `<label>${l}</label>`+(t==="ta"?`<textarea data-f="${k}" rows="3">${esc(v)}</textarea>`:`<input data-f="${k}" type="${t||"text"}" value="${esc(v)}">`)}
function modal(h){const m=$("#modal");m.innerHTML=`<div class="card">${h}</div>`;m.hidden=false}
const closeM=()=>{$("#modal").hidden=true};
function logForm(id){const l=id?logs.find(x=>x.id===id):Object.assign({date:new Date().toISOString().slice(0,10),dept:"BERNAMA TV – Graphics",status:"Pending"},jget(DRAFT_STORAGE_KEY,{}),{});
window._pending=[];
modal(`<h3>${id?"Edit":"New"} log</h3>${LF.map(f=>field(f[0],f[1],f[2],l[f[0]]||"")).join("")}
<label>Verification Status</label><select data-f="status">${["Pending","Verified","Rejected"].map(s=>`<option ${l.status===s?"selected":""}>${s}</option>`).join("")}</select>
<label>Photos (camera or gallery, multiple)</label><input type="file" id="pf2" accept="image/jpeg,image/png,image/webp" multiple><label>Caption</label><input id="cap"><div class="acts"><button class="btn primary" data-a="save" data-id="${id||""}">✓ Save</button><button class="btn outline" data-a="cancel">Cancel</button></div>`);
if(!id)$("#modal").oninput=()=>{const o={};$("#modal").querySelectorAll("[data-f]").forEach(e=>o[e.dataset.f]=e.value);jset(DRAFT_STORAGE_KEY,o)}}
function readForm(){const o={};$("#modal").querySelectorAll("[data-f]").forEach(e=>o[e.dataset.f]=e.value);return o}
async function addPhotos(logId,files,cap){const ids=[];for(const f of files){const data=await compress(f),id=uid();await imgPut({id,logId,data,caption:cap||"",created:Date.now()});ids.push(id)}return ids}
async function saveLog(id){try{const o=readForm();if(!o.date||!o.tasks.trim()){toast("⚠ Date and Tasks are required.");return}
let l=id?logs.find(x=>x.id===id):null;if(!l){l={id:uid(),photos:[]};logs.push(l)}Object.assign(l,o,{updated:Date.now()});
persist();if(!jget(LOGS_STORAGE_KEY,[]).some(x=>x.id===l.id))throw new Error("verify");
const files=$("#pf2").files;if(files.length){l.photos=(l.photos||[]).concat(await addPhotos(l.id,files,$("#cap").value));persist()}
if(!id)localStorage.removeItem(DRAFT_STORAGE_KEY);closeM();render();toast("✓ Logbook saved successfully")}catch(e){console.error(e);toast("⚠ Unable to save logbook. Please export a backup and try again.")}}
function refForm(id){const r=id?refs.find(x=>x.id===id):R("","OTHER",{start:"0"});
const F=[["title","Title"],["category","Category","sel"],["path","File Location / Path"],["file","File Name"],["ext","File Extension"],["folder","Folder"],["template","Template"],["version","Version"],["purpose","Purpose","ta"],["start","Start Frame"],["end","End Frame"],["fps","FPS"],["duration","Duration"],["format","Format"],["codec","Codec"],["steps","Workflow steps (one per line)","ta"],["notes","Notes","ta"]];
modal(`<h3>${id?"Edit":"New"} reference</h3>${F.map(f=>f[2]==="sel"?`<label>Category</label><select data-f="category">${["WEATHER","NEWS","SPORTS","NEWSPAPER","CALLER","POPUP","MUGSHOT","SOCIAL MEDIA","BURSA","OTHER"].map(c=>`<option ${r.category===c?"selected":""}>${c}</option>`).join("")}</select>`:field(f[0],f[1],f[2],f[0]==="steps"?r.steps.join("\n"):r[f[0]])).join("")}
<div class="acts"><button class="btn primary" data-a="rsave" data-id="${id||""}">✓ Save</button><button class="btn outline" data-a="cancel">Cancel</button></div>`)}
/* Print */
async function doPrint(){const m=document.querySelector("input[name=pm]:checked").value,inc=$("#pp").checked,now=new Date(),ym=now.toISOString().slice(0,7);
let s=sorted().filter(l=>m==="all"||(m==="date"&&l.date===$("#pd").value)||(m==="range"&&l.date>=$("#pf").value&&l.date<=($("#pt").value||"9999"))||(m==="month"&&l.date.startsWith(ym)));
let h=`<h1>Internship Logbook</h1><p>Student: ${esc(settings.name)} ${esc(settings.matric)}<br>${esc(settings.university)}<br>Organisation: BERNAMA · BERNAMA TV – Graphics<br>Internship: 28 September 2026 – 12 March 2027<br>Supervisor: ${esc(settings.supervisor)}</p>`;
for(const l of s){h+=`<div class="pl"><h2>${l.day?"Day "+l.day+" – ":""}${fmtD(l.date)}</h2><p>${esc(l.start)} ${l.end?"– "+esc(l.end):""} · ${esc(l.dept)}</p>`;
[["tasks","Tasks"],["process","Work process"],["tools","Software / tools"],["problems","Problems"],["solution","Solutions"],["learning","Learning"],["output","Output"],["remarks","Supervisor remarks"],["notes","Notes"]].forEach(([k,t])=>{if(l[k])h+=`<p style="white-space:pre-wrap"><b>${t}:</b> ${esc(l[k])}</p>`});
h+=`<p><b>Verification:</b> ${esc(l.status)}</p>${inc?await photoHTML(l):""}</div>`}
$("#printArea").innerHTML=h;setTimeout(()=>window.print(),150)}
/* Backup */
async function exportB(){const b={version:1,exported:Date.now(),logs,refs,settings,images:await imgAll()};
const u=URL.createObjectURL(new Blob([JSON.stringify(b)],{type:"application/json"})),a=document.createElement("a");a.href=u;a.download="bernama-logbook-backup-"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);toast("✓ Backup exported")}
async function importB(f){try{const b=JSON.parse(await f.text());if(!Array.isArray(b.logs))throw 0;if(!confirm("Replace current data with this backup?"))return;
logs=b.logs;refs=b.refs||[];settings=Object.assign({},b.settings,{seeded:true});persist();saveRefs();
await tx("images","readwrite",s=>s.clear());for(const i of b.images||[])await imgPut(i);render();toast("✓ Backup restored")}catch(e){toast("⚠ Invalid backup file.")}}
/* Events */
document.addEventListener("click",async e=>{const b=e.target.closest("[data-a],[data-cat]");if(!b)return;
if(b.dataset.cat){refCat=b.dataset.cat;return render()}
const a=b.dataset.a,id=b.dataset.id;
if(a==="edit")logForm(id);else if(a==="cancel")closeM();else if(a==="save")saveLog(id||null);
else if(a==="del"){if(confirm("Delete this log?")){const l=logs.find(x=>x.id===id);for(const p of l.photos||[])await imgDel(p);logs=logs.filter(x=>x.id!==id);persist();render()}}
else if(a==="dup"){const l=logs.find(x=>x.id===id);logs.push(Object.assign({},l,{id:uid(),day:undefined,photos:[],updated:Date.now()}));persist();render()}
else if(a==="note"||a==="photo")logForm(id);
else if(a==="draft")logForm();else if(a==="nodraft"){localStorage.removeItem(DRAFT_STORAGE_KEY);render()}
else if(a==="print")doPrint();else if(a==="export")exportB();else if(a==="import")$("#imp").click();
else if(a==="pm"){calMonth=new Date(calMonth.getFullYear(),calMonth.getMonth()-1,1);render()}
else if(a==="nm"){calMonth=new Date(calMonth.getFullYear(),calMonth.getMonth()+1,1);render()}
else if(a==="rnew")refForm();else if(a==="redit")refForm(id);
else if(a==="rsave"){const o=readForm();o.steps=o.steps.split("\n").map(x=>x.trim()).filter(Boolean);if(!o.title.trim())return toast("⚠ Title is required.");
let r=id&&refs.find(x=>x.id===id);if(!r){r=R("","OTHER",{});refs.push(r)}Object.assign(r,o,{updated:Date.now()});saveRefs();closeM();render();toast("✓ Reference saved")}
else if(a==="rdup"){const r=refs.find(x=>x.id===id);refs.push(Object.assign({},r,{id:uid(),title:r.title+" (copy)",steps:[...r.steps]}));saveRefs();render()}
else if(a==="rdel"){if(confirm("Delete this reference?")){refs=refs.filter(x=>x.id!==id);saveRefs();render()}}
else if(a==="rcopy"){const r=refs.find(x=>x.id===id);if(!r.path)return toast("No path recorded yet.");try{await navigator.clipboard.writeText(r.path);toast("✓ Path copied")}catch(x){toast("⚠ Copy failed")}}});
function wire(){const q=$("#rq");if(q)q.oninput=()=>{refQ=q.value;const p=q.selectionStart;render();const n=$("#rq");n.focus();n.setSelectionRange(p,p)};
const i=$("#imp");if(i)i.onchange=()=>i.files[0]&&importB(i.files[0]);
document.querySelectorAll("[data-s]").forEach(e=>e.oninput=()=>{settings[e.dataset.s]=e.value;jset(SETTINGS_STORAGE_KEY,settings)});
document.querySelectorAll("[data-ph]").forEach(async d=>{const l=logs.find(x=>x.id===d.dataset.ph);d.innerHTML=await photoHTML(l)});
const pc=$("#pc");if(pc)imgAll().then(a=>pc.textContent=a.length)}
init();

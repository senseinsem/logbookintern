'use strict';
/* Internship Logbook – vanilla JS. localStorage = text data, IndexedDB = images. */
const K = { s: 'ilb_settings', l: 'ilb_logs', d: 'ilb_draft' };
const TOOLS = ['Adobe After Effects','Adobe Photoshop','Adobe Illustrator','Adobe Premiere Pro','Blender','Unreal Engine','Microsoft Office','Other'];
const FIELDS = { date:'fDate', startTime:'fStart', endTime:'fEnd', department:'fDept', tasks:'fTasks', workProcess:'fProcess', problems:'fProblems', solution:'fSolution', learning:'fLearning', output:'fOutput', supervisorRemarks:'fRemarks', verification:'fVerif' };
const DEFAULTS = { name:'Alex', studentId:'', university:'', programme:'', org:'BERNAMA', dept:'BERNAMA TV – Graphics Department', start:'2026-09-28', end:'2027-03-12', theme:'system', customTools:[], seeded:false };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const ls = {
  get(k, f) { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { showToast('Storage is full or unavailable. Data was not saved.', true); return false; } },
  del(k) { try { localStorage.removeItem(k); } catch {} }
};
const parseD = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) return null; const d = new Date(+m[1], m[2] - 1, +m[3]); return isNaN(d) ? null : d; };
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today = () => iso(new Date());
const dayDiff = (a, b) => Math.round((a - b) / 864e5); // both are local-midnight dates
const fmtD = (s, o) => { const d = parseD(s); return d ? d.toLocaleDateString('en-GB', o || { day:'2-digit', month:'short', year:'numeric' }).toUpperCase() : '—'; };
const fmtT = t => { if (!t) return ''; const [h, m] = t.split(':'); return `${(+h % 12) || 12}:${m} ${+h < 12 ? 'AM' : 'PM'}`; };
const hours = l => l.startTime && l.endTime ? `${fmtT(l.startTime)} – ${fmtT(l.endTime)}` : '—';

let settings, logs, view = 'dashboard', filter = 'all';
let form = { editId: null, imgs: [], removed: [], tools: new Set() };
let cal = { y: new Date().getFullYear(), m: new Date().getMonth(), sel: today() };
let modalUrls = [], viewerState = { items: [], i: 0 };

/* ---------- Toast & confirm ---------- */
let toastTimer;
function showToast(msg, isErr) {
  const t = $('#toast'); t.textContent = (isErr ? '⚠ ' : '✓ ') + msg; t.className = 'toast show' + (isErr ? ' err' : '');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}
function confirmDialog(title, msg, ok = 'Delete', cancel = 'Cancel', danger = true) {
  return new Promise(res => {
    openSheet(`<h3>${esc(title)}</h3><p>${esc(msg)}</p><div class="actions"><button class="btn ghost" id="cNo">${esc(cancel)}</button><button class="btn ${danger ? 'danger' : ''}" id="cYes">${esc(ok)}</button></div>`);
    $('#cNo').onclick = () => { closeSheet(); res(false); }; $('#cYes').onclick = () => { closeSheet(); res(true); };
  });
}
function openSheet(html) { revokeModalUrls(); $('#sheet').innerHTML = html; $('#modal').hidden = false; $('#sheet').scrollTop = 0; }
function closeSheet() { $('#modal').hidden = true; revokeModalUrls(); }
function revokeModalUrls() { modalUrls.forEach(u => URL.revokeObjectURL(u)); modalUrls = []; }

/* ---------- IndexedDB ---------- */
let dbPromise;
const openDB = () => dbPromise || (dbPromise = new Promise((res, rej) => {
  if (!window.indexedDB) return rej(new Error('IndexedDB unsupported'));
  const r = indexedDB.open('internshipLogbookDB', 1);
  r.onupgradeneeded = () => { r.result.createObjectStore('images', { keyPath: 'id' }).createIndex('logId', 'logId'); };
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
}));
async function idb(mode, fn) {
  const d = await openDB();
  return new Promise((res, rej) => { const t = d.transaction('images', mode); const o = fn(t.objectStore('images')); t.oncomplete = () => res(o && o.result); t.onerror = t.onabort = () => rej(t.error); });
}
const saveImageToIndexedDB = rec => idb('readwrite', s => s.put(rec));
const getImage = id => idb('readonly', s => s.get(id));
const deleteImage = id => idb('readwrite', s => s.delete(id));
const getAllImages = () => idb('readonly', s => s.getAll());
const clearImages = () => idb('readwrite', s => s.clear());
async function getImagesForLog(log) {
  const found = await Promise.all((log.imageIds || []).map(id => getImage(id).catch(() => null)));
  return found.filter(Boolean); // missing images are skipped gracefully
}

/* ---------- Image handling ---------- */
function compressImage(file) { // resize to max 1600px, JPEG 0.8
  return new Promise((res, rej) => {
    if (!file.type || !file.type.startsWith('image/')) return rej(new Error('Not an image'));
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      try {
        const r = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * r); c.height = Math.round(img.naturalHeight * r);
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(b => b ? res(b) : rej(new Error('Compression failed')), 'image/jpeg', 0.8);
      } catch (e) { rej(e); } finally { URL.revokeObjectURL(url); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Unsupported image')); };
    img.src = url;
  });
}
async function handleImageUpload(files) {
  let ok = 0;
  for (const f of files) {
    try {
      const blob = await compressImage(f);
      form.imgs.push({ id: uid(), blob, filename: f.name || 'photo.jpg', caption: '', createdAt: new Date().toISOString(), url: URL.createObjectURL(blob) });
      ok++;
    } catch { showToast(`Could not use "${f.name || 'file'}". Choose a valid image (JPG, PNG, WebP).`, true); }
  }
  if (ok) { renderEvidence(); showToast(`${ok} photo${ok > 1 ? 's' : ''} added.`); }
}
function renderEvidence() {
  const g = $('#evidence');
  if (!form.imgs.length) { g.className = ''; g.innerHTML = '<div class="empty"><strong>No work evidence added yet.</strong><p>Add screenshots or photos of your work.</p></div>'; return; }
  g.className = 'grid';
  g.innerHTML = form.imgs.map((im, i) => `<figure><img src="${im.url}" alt="${esc(im.filename)}" data-view="${i}" loading="lazy"><figcaption class="muted">${esc(im.filename)}</figcaption>
    <label class="sr" for="cap${i}">Caption</label><input id="cap${i}" type="text" data-cap="${i}" value="${esc(im.caption)}" placeholder="Add caption">
    <button type="button" class="btn ghost" data-rm="${i}">Remove</button></figure>`).join('');
}

/* ---------- Data ---------- */
function loadSettings() {
  settings = { ...DEFAULTS, ...ls.get(K.s, {}) }; logs = ls.get(K.l, []);
  if (!Array.isArray(logs)) logs = [];
  applyTheme();
}
const saveSettings = () => ls.set(K.s, settings);
const saveLogs = () => ls.set(K.l, logs);
function applyTheme() { document.documentElement.dataset.theme = settings.theme || 'system'; }
function internship() {
  const s = parseD(settings.start), e = parseD(settings.end), n = new Date(), t = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  if (!s || !e || e < s) return { valid: false, total: 0, cur: 0, left: 0, pct: 0 };
  const total = dayDiff(e, s) + 1; // calendar days, inclusive (weekends NOT excluded)
  const cur = Math.min(Math.max(dayDiff(t, s) + 1, 0), total);
  return { valid: true, total, cur, left: Math.max(total - cur, 0), pct: Math.round(cur / total * 100) };
}
const sorted = () => [...logs].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));
const verBadge = v => `<span class="st ${v}">${v === 'verified' ? 'Verified' : 'Pending Verification'}</span>`;

/* ---------- Navigation ---------- */
function go(v) {
  if (v === 'add' && view !== 'add') startForm();
  view = v; $$('.view').forEach(s => s.hidden = s.id !== 'v-' + v);
  $$('#nav button').forEach(b => b.setAttribute('aria-current', b.dataset.go === v ? 'page' : 'false'));
  if (v === 'dashboard') updateDashboard(); if (v === 'logbook') renderLogs(); if (v === 'calendar') renderCalendar();
  if (v === 'stats') renderStatistics(); if (v === 'settings') fillSettings();
  window.scrollTo(0, 0);
}

/* ---------- Dashboard ---------- */
function updateDashboard() {
  const p = internship(), h = new Date().getHours(), greet = h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
  const ver = logs.filter(l => l.verification === 'verified').length, latest = sorted().slice(0, 3);
  $('#dashBody').innerHTML = `<div class="card hero"><h2>${greet}, ${esc(settings.name)} 👋</h2><p><strong>${esc(settings.org)}</strong><br>${esc(settings.dept)}</p>
    <p class="muted">${fmtD(settings.start)} – ${fmtD(settings.end)}</p></div>
    <div class="card"><h3>Internship Progress</h3>${p.valid ? `<div class="big">Day ${p.cur} / ${p.total}</div><div class="bar" role="progressbar" aria-valuenow="${p.pct}" aria-valuemin="0" aria-valuemax="100"><b style="width:${p.pct}%"></b></div>
    <p>${p.pct}% complete · ${p.left} calendar days remaining</p>` : '<p>Set valid internship dates in Settings.</p>'}
    <button class="btn full" data-go="add" style="margin-top:10px">+ Add Today's Log</button></div>
    <div class="stats"><div class="card"><b>${logs.length}</b>Entries</div><div class="card"><b>${ver}</b>Verified</div><div class="card"><b>${logs.length - ver}</b>Pending</div></div>
    <h3 style="margin-top:18px">Recent Activity</h3>${latest.length ? latest.map(entryCard).join('') : emptyLogs()}
    <button class="btn ghost full" data-go="stats">View statistics</button>`;
}
const emptyLogs = () => '<div class="card empty"><strong>No logbook entries yet.</strong><p>Start documenting your internship journey today.</p><button class="btn" data-go="add">+ Add First Log</button></div>';
function entryCard(l) {
  const n = (l.imageIds || []).length;
  return `<button class="card entry" data-open="${l.id}"><div class="date">${fmtD(l.date)} <small>${fmtD(l.date, { weekday: 'long' })}</small>${l.sample ? '<span class="sample">Sample</span>' : ''}</div>
  <small>${hours(l)}</small><h4>${esc(l.department)}</h4><h4>TASKS</h4><p>${esc(l.tasks) || '—'}</p>
  ${(l.tools || []).length ? `<h4>TOOLS</h4>${l.tools.map(t => `<span class="tag">${esc(t)}</span>`).join('')}` : ''}
  <h4>EVIDENCE</h4><div>📷 ${n} Photo${n === 1 ? '' : 's'}</div>${l.learning ? `<h4>LEARNING</h4><p>${esc(l.learning)}</p>` : ''}<div style="margin-top:8px">${verBadge(l.verification)}</div></button>`;
}

/* ---------- Logbook ---------- */
function renderFilters() {
  const f = [['all','All'],['week','This Week'],['month','This Month'],['verified','Verified'],['pending','Pending'],['photos','Has Photos'],['nophotos','No Photos']];
  $('#filters').innerHTML = f.map(([k, n]) => `<button class="chip ${filter === k ? 'on' : ''}" data-filter="${k}" aria-pressed="${filter === k}">${n}</button>`).join('');
}
function matches(l, q) {
  const now = new Date(), d = parseD(l.date), n = (l.imageIds || []).length;
  if (filter === 'week') { const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7)); if (!d || d < s || d > new Date(s.getTime() + 6 * 864e5)) return false; }
  if (filter === 'month' && (!d || d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return false;
  if (filter === 'verified' && l.verification !== 'verified') return false;
  if (filter === 'pending' && l.verification === 'verified') return false;
  if (filter === 'photos' && !n) return false; if (filter === 'nophotos' && n) return false;
  if (!q) return true;
  const hay = [l.date, fmtD(l.date), l.tasks, l.workProcess, (l.tools || []).join(' '), l.problems, l.solution, l.learning, l.output, (l.captions || []).join(' ')].join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).every(w => hay.includes(w));
}
function renderLogs() {
  renderFilters();
  const q = $('#search').value.trim(), list = sorted().filter(l => matches(l, q));
  $('#logList').innerHTML = !logs.length ? emptyLogs() : list.length ? list.map(entryCard).join('') : '<div class="card empty"><strong>No matching entries found.</strong><p>Try another keyword or filter.</p></div>';
}

/* ---------- Detail view ---------- */
async function showDetail(id) {
  const l = logs.find(x => x.id === id); if (!l) return;
  const imgs = await getImagesForLog(l);
  const urls = imgs.map(i => URL.createObjectURL(i.blob));
  const row = (t, v) => v ? `<h4>${t}</h4><div class="pre">${esc(v)}</div>` : '';
  openSheet(`<h3>${fmtD(l.date)} ${l.sample ? '<span class="sample">Sample</span>' : ''}</h3><p>${fmtD(l.date, { weekday: 'long' })} · ${hours(l)}</p>${row('DEPARTMENT', l.department)}${row('TASKS', l.tasks)}${row('WORK PROCESS', l.workProcess)}
  ${(l.tools || []).length ? `<h4>TOOLS</h4>${l.tools.map(t => `<span class="tag">${esc(t)}</span>`).join('')}` : ''}${row('PROBLEMS', l.problems)}${row('SOLUTION', l.solution)}${row('LEARNING', l.learning)}${row('OUTPUT', l.output)}${row('SUPERVISOR REMARKS', l.supervisorRemarks)}
  <h4>STATUS</h4>${verBadge(l.verification)}<h4>WORK EVIDENCE</h4>${imgs.length ? `<div class="grid">${imgs.map((im, i) => `<figure><img src="${urls[i]}" alt="${esc(im.filename)}" data-dview="${i}" loading="lazy"><figcaption>${esc(im.caption)}</figcaption></figure>`).join('')}</div>` : '<p>No work evidence added yet.</p>'}
  <div class="stack" style="margin-top:16px"><button class="btn" id="dEdit">Edit</button><button class="btn ghost" id="dDup">Duplicate</button><button class="btn ghost" id="dVer">${l.verification === 'verified' ? 'Mark as Pending' : 'Mark as Verified'}</button><button class="btn danger" id="dDel">Delete</button><button class="btn ghost" id="dClose">Close</button></div>`);
  modalUrls = urls;
  viewerState = { items: imgs.map((im, i) => ({ url: urls[i], caption: im.caption })), i: 0 };
  $('#dClose').onclick = closeSheet;
  $('#dEdit').onclick = () => { closeSheet(); startForm(l); view = 'add'; go('add'); };
  $('#dDup').onclick = () => { closeSheet(); duplicateLog(l); };
  $('#dVer').onclick = () => { l.verification = l.verification === 'verified' ? 'pending' : 'verified'; l.updatedAt = new Date().toISOString(); saveLogs(); showToast('Verification status updated.'); closeSheet(); refreshView(); };
  $('#dDel').onclick = async () => { if (await confirmDialog('Delete this entry?', 'This entry and its photos will be permanently removed.')) { await deleteLog(l); } };
}
async function deleteLog(l) {
  for (const id of l.imageIds || []) await deleteImage(id).catch(() => {});
  logs = logs.filter(x => x.id !== l.id); saveLogs(); showToast('Logbook entry deleted.'); refreshView();
}
function refreshView() { go(view); }

/* ---------- Form ---------- */
function renderTools() {
  const all = [...TOOLS.filter(t => t !== 'Other'), ...settings.customTools, 'Other'];
  [...form.tools].forEach(t => { if (!all.includes(t)) all.splice(all.length - 1, 0, t); });
  $('#toolChips').innerHTML = all.map(t => `<button type="button" class="chip ${form.tools.has(t) ? 'on' : ''}" data-tool="${esc(t)}" aria-pressed="${form.tools.has(t)}">${esc(t)}</button>`).join('');
}
function startForm(log) {
  form.imgs.forEach(i => URL.revokeObjectURL(i.url));
  form = { editId: log && !log.isDup ? log.id : null, imgs: [], removed: [], tools: new Set(log ? log.tools : []) };
  const data = log || { date: today(), startTime: '', endTime: '', department: settings.dept, verification: 'pending' };
  Object.entries(FIELDS).forEach(([k, id]) => $('#' + id).value = data[k] || (k === 'verification' ? 'pending' : ''));
  $('#h-add').textContent = form.editId ? 'Edit Daily Log' : 'Add Daily Log';
  renderTools(); renderEvidence();
  if (log && log.imageIds && form.editId) getImagesForLog(log).then(imgs => { form.imgs = imgs.map(i => ({ ...i, url: URL.createObjectURL(i.blob) })); renderEvidence(); });
  if (!log) { const d = ls.get(K.d, null); if (d) offerDraft(d); }
}
async function offerDraft(d) {
  const cont = await confirmDialog('Unfinished log found', `You have an unfinished log from ${fmtD(d.fields.date)}. Photos are not kept in drafts.`, 'Continue Draft', 'Discard', false);
  if (cont) { Object.entries(FIELDS).forEach(([k, id]) => $('#' + id).value = d.fields[k] || ''); form.tools = new Set(d.tools || []); renderTools(); } else ls.del(K.d);
}
function collectForm() {
  const f = {}; Object.entries(FIELDS).forEach(([k, id]) => f[k] = $('#' + id).value.trim()); return f;
}
async function saveLog(e) {
  e.preventDefault();
  const f = collectForm();
  if (!parseD(f.date)) return showToast('Please choose a valid date.', true);
  if (!f.tasks && !f.workProcess) return showToast('Describe your tasks or work process before saving.', true);
  if (f.startTime && f.endTime && f.endTime <= f.startTime) return showToast('End time must be after start time.', true);
  $('#saveBtn').disabled = true;
  try {
    const old = form.editId ? logs.find(l => l.id === form.editId) : null;
    let id = old ? old.id : uid(); while (!old && logs.some(l => l.id === id)) id = uid();
    for (const im of form.imgs) await saveImageToIndexedDB({ id: im.id, logId: id, blob: im.blob, filename: im.filename, caption: im.caption, createdAt: im.createdAt });
    for (const rid of form.removed) await deleteImage(rid).catch(() => {});
    const now = new Date().toISOString();
    const entry = { ...(old || {}), ...f, id, tools: [...form.tools], imageIds: form.imgs.map(i => i.id), captions: form.imgs.map(i => i.caption).filter(Boolean), sample: false, createdAt: old ? old.createdAt : now, updatedAt: now };
    logs = old ? logs.map(l => l.id === id ? entry : l) : [...logs, entry];
    if (!saveLogs()) return;
    ls.del(K.d); showToast('Logbook saved successfully.');
    form.imgs.forEach(i => URL.revokeObjectURL(i.url)); form.imgs = []; go('logbook');
  } catch { showToast('Could not save photos. Storage may be full or blocked.', true); }
  finally { $('#saveBtn').disabled = false; }
}
function duplicateLog(l) {
  const copy = { ...l, id: null, isDup: true, date: today(), imageIds: [], verification: 'pending', supervisorRemarks: '', sample: false };
  startForm(copy); form.editId = null; view = 'add'; go('add');
  showToast('Entry duplicated. Edit and save. Photos are not copied.');
}

/* ---------- Viewer ---------- */
function openViewer(items, i) { viewerState = { items, i }; $('#viewer').hidden = false; showViewer(); }
function showViewer() {
  const { items, i } = viewerState, it = items[i]; if (!it) return;
  $('#vImg').src = it.url; $('#vImg').alt = it.caption || 'Work evidence'; $('#vCount').textContent = `${i + 1} / ${items.length}`; $('#vCap').textContent = it.caption || '';
  $('#vPrev').hidden = $('#vNext').hidden = items.length < 2;
}
const stepViewer = d => { const n = viewerState.items.length; viewerState.i = (viewerState.i + d + n) % n; showViewer(); };

/* ---------- Calendar ---------- */
function renderCalendar() {
  const first = new Date(cal.y, cal.m, 1), days = new Date(cal.y, cal.m + 1, 0).getDate();
  $('#calTitle').textContent = first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  let h = ['S','M','T','W','T','F','S'].map(d => `<span>${d}</span>`).join('') + '<i></i>'.repeat(first.getDay());
  for (let d = 1; d <= days; d++) {
    const ds = iso(new Date(cal.y, cal.m, d)), day = logs.filter(l => l.date === ds), ph = day.some(l => (l.imageIds || []).length);
    h += `<button data-day="${ds}" class="${day.length ? 'has' : ''} ${ph ? 'ph' : ''} ${ds === today() ? 'today' : ''} ${ds === cal.sel ? 'sel' : ''}" aria-label="${fmtD(ds)}${day.length ? ', has log' : ''}">${d}</button>`;
  }
  $('#calGrid').innerHTML = h;
  const sel = logs.filter(l => l.date === cal.sel);
  $('#calDayTitle').textContent = fmtD(cal.sel, { day: 'numeric', month: 'long', year: 'numeric' });
  $('#calDay').innerHTML = sel.length ? sel.map(entryCard).join('') : '<div class="card empty"><p>No log for this date.</p><button class="btn" id="calAdd">+ Add log for this date</button></div>';
}

/* ---------- Statistics ---------- */
function renderStatistics() {
  const p = internship(), ver = logs.filter(l => l.verification === 'verified').length, withPh = logs.filter(l => (l.imageIds || []).length).length;
  const photos = logs.reduce((n, l) => n + (l.imageIds || []).length, 0), freq = {};
  logs.forEach(l => (l.tools || []).forEach(t => freq[t] = (freq[t] || 0) + 1));
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1]), max = top.length ? top[0][1] : 1;
  const box = (n, l) => `<div class="card"><b>${n}</b>${l}</div>`;
  $('#statBody').innerHTML = `<div class="card"><h3>Internship progress</h3><div class="bar"><b style="width:${p.pct}%"></b></div><p>${p.pct}% · Day ${p.cur} of ${p.total} (calendar days, weekends included)</p></div>
  <div class="stats">${box(logs.length, 'Total entries')}${box(p.cur, 'Days completed')}${box(p.left, 'Days remaining')}${box(ver, 'Verified')}${box(logs.length - ver, 'Pending')}${box(withPh, 'Entries with photos')}${box(photos, 'Total photos')}</div>
  <div class="card" style="margin-top:14px"><h3>Most used software</h3>${top.length ? top.slice(0, 8).map(([t, n]) => `<div class="hbar"><span>${esc(t)}</span><div class="bar"><b style="width:${n / max * 100}%"></b></div><span>${n}</span></div>`).join('') : '<p>No tools recorded yet.</p>'}</div>`;
}

/* ---------- Settings ---------- */
function fillSettings() {
  const m = { sName:'name', sId:'studentId', sUni:'university', sProg:'programme', sOrg:'org', sDept:'dept', sStart:'start', sEnd:'end', sTheme:'theme' };
  Object.entries(m).forEach(([id, k]) => $('#' + id).value = settings[k] || '');
}
function saveProfile(e) {
  e.preventDefault();
  const s = $('#sStart').value, en = $('#sEnd').value;
  if (!parseD(s) || !parseD(en) || parseD(en) < parseD(s)) return showToast('Enter valid internship dates (end after start).', true);
  Object.assign(settings, { name: $('#sName').value.trim() || 'Student', studentId: $('#sId').value.trim(), university: $('#sUni').value.trim(), programme: $('#sProg').value.trim(), org: $('#sOrg').value.trim(), dept: $('#sDept').value.trim(), start: s, end: en });
  saveSettings(); showToast('Profile saved.');
}

/* ---------- Backup ---------- */
const blobToDataURL = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
async function exportBackup() {
  try {
    const imgs = await getAllImages(), out = [];
    for (const i of imgs) out.push({ id: i.id, logId: i.logId, filename: i.filename, caption: i.caption, createdAt: i.createdAt, data: await blobToDataURL(i.blob) });
    const json = JSON.stringify({ app: 'internship-logbook', version: 1, exportedAt: new Date().toISOString(), settings, logs, images: out });
    download(`internship-logbook-${today()}.json`, new Blob([json], { type: 'application/json' })); showToast('Backup exported successfully.');
  } catch { showToast('Backup failed. Please try again.', true); }
}
async function importBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'internship-logbook' || !Array.isArray(data.logs) || !Array.isArray(data.images || [])) throw new Error('invalid');
    if (!data.logs.every(l => l && l.id && parseD(l.date))) throw new Error('invalid');
    if (!await confirmDialog('Restore backup?', 'This replaces your current logbook and photos.', 'Restore', 'Cancel', false)) return;
    const recs = [];
    for (const i of data.images || []) { if (!i.id || !i.data) continue; recs.push({ id: i.id, logId: i.logId, filename: i.filename, caption: i.caption || '', createdAt: i.createdAt, blob: await (await fetch(i.data)).blob() }); }
    await clearImages(); for (const r of recs) await saveImageToIndexedDB(r);
    const have = new Set(recs.map(r => r.id));
    logs = data.logs.map(l => ({ ...l, imageIds: (l.imageIds || []).filter(id => have.has(id)) }));
    settings = { ...DEFAULTS, ...(data.settings || {}) };
    saveLogs(); saveSettings(); applyTheme(); fillSettings();
    showToast(`Backup restored successfully. ${logs.length} log entries, ${recs.length} photos.`);
  } catch { showToast('This file is not a valid or complete logbook backup.', true); }
}
function exportCsv() {
  const cols = ['date','startTime','endTime','department','tasks','workProcess','tools','problems','solution','learning','output','supervisorRemarks','verification','photoCount'];
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = sorted().reverse().map(l => cols.map(c => q(c === 'tools' ? (l.tools || []).join('; ') : c === 'photoCount' ? (l.imageIds || []).length : l[c])).join(','));
  download(`internship-logbook-${today()}.csv`, new Blob(['\ufeff' + [cols.join(','), ...rows].join('\n')], { type: 'text/csv' })); showToast('CSV exported successfully.');
}

/* ---------- Print ---------- */
async function printLogbook() {
  const urls = [], row = (t, v) => v ? `<h4>${t}</h4><div class="pre">${esc(v)}</div>` : '';
  let h = `<h1>Internship Logbook</h1><div>${esc(settings.name)} ${settings.studentId ? '(' + esc(settings.studentId) + ')' : ''}<br>${esc(settings.programme)} ${esc(settings.university)}<br>${esc(settings.org)} – ${esc(settings.dept)}<br>${fmtD(settings.start)} – ${fmtD(settings.end)}</div>`;
  for (const l of [...logs].sort((a, b) => a.date.localeCompare(b.date))) {
    const imgs = await getImagesForLog(l);
    h += `<div class="pl"><h2>${fmtD(l.date)} (${fmtD(l.date, { weekday: 'long' })}) · ${hours(l)}</h2>${row('Tasks', l.tasks)}${row('Work Process', l.workProcess)}${row('Tools', (l.tools || []).join(', '))}${row('Problems', l.problems)}${row('Solution', l.solution)}${row('Learning', l.learning)}${row('Output', l.output)}${row('Supervisor Remarks', l.supervisorRemarks)}${row('Verification', l.verification === 'verified' ? 'Verified' : 'Pending')}
    ${imgs.map((im, i) => { const u = URL.createObjectURL(im.blob); urls.push(u); return `<figure><img src="${u}" alt=""><figcaption>${esc(im.caption || 'Figure ' + (i + 1))}</figcaption></figure>`; }).join('')}</div>`;
  }
  $('#printArea').innerHTML = h;
  window.addEventListener('afterprint', () => { urls.forEach(u => URL.revokeObjectURL(u)); $('#printArea').innerHTML = ''; }, { once: true });
  setTimeout(() => window.print(), 300);
}

/* ---------- Sample data ---------- */
function makeSampleImage() {
  return new Promise(res => {
    const c = document.createElement('canvas'); c.width = 800; c.height = 450; const x = c.getContext('2d');
    x.fillStyle = '#536878'; x.fillRect(0, 0, 800, 450); x.fillStyle = '#fff'; x.fillRect(40, 300, 720, 90);
    x.fillStyle = '#0A0A0A'; x.font = 'bold 34px sans-serif'; x.fillText('SAMPLE LOWER-THIRD', 70, 355); c.toBlob(res, 'image/jpeg', 0.8);
  });
}
async function seedSamples() {
  const id = 'sample-1', imgId = 'sample-img-1', now = new Date().toISOString();
  try { await saveImageToIndexedDB({ id: imgId, logId: id, blob: await makeSampleImage(), filename: 'sample.jpg', caption: 'Figure 1: Editing broadcast graphics using Adobe After Effects.', createdAt: now }); } catch {}
  const base = { department: settings.dept, verification: 'pending', sample: true, createdAt: now, updatedAt: now, startTime: '07:25', endTime: '17:00', problems: '', solution: '', output: '', supervisorRemarks: '', workProcess: '' };
  logs = [{ ...base, id, date: '2026-10-01', tasks: 'Assisted in preparing broadcast graphics for a news segment.', workProcess: 'Adjusted typography, positioning and animation timing for the lower-third graphic using Adobe After Effects.', tools: ['Adobe After Effects', 'Adobe Photoshop'], learning: 'Learned how broadcast graphics require consistency, readability and accurate timing for television broadcasting.', imageIds: [imgId], captions: ['Figure 1: Editing broadcast graphics using Adobe After Effects.'] },
    { ...base, id: 'sample-2', date: '2026-09-30', tasks: 'Prepared visual assets for a graphic design project.', tools: ['Adobe Illustrator'], learning: 'Practised organising layers and naming files for team handover.', imageIds: [], verification: 'verified' }];
  saveLogs(); settings.seeded = true; saveSettings();
}
async function clearSamples() {
  for (const l of logs.filter(x => x.sample)) for (const id of l.imageIds || []) await deleteImage(id).catch(() => {});
  logs = logs.filter(l => !l.sample); saveLogs(); showToast('Sample data cleared.'); refreshView();
}

/* ---------- Events ---------- */
function bindEvents() {
  document.addEventListener('click', async e => {
    const t = e.target.closest('button, img, [data-open]'); if (!t) return;
    if (t.dataset.go) return go(t.dataset.go);
    if (t.dataset.open) return showDetail(t.dataset.open);
    if (t.dataset.filter) { filter = t.dataset.filter; return renderLogs(); }
    if (t.dataset.day) { cal.sel = t.dataset.day; return renderCalendar(); }
    if (t.dataset.tool) { const n = t.dataset.tool; form.tools.has(n) ? form.tools.delete(n) : form.tools.add(n); renderTools(); return saveDraft(); }
    if (t.dataset.view !== undefined) return openViewer(form.imgs.map(i => ({ url: i.url, caption: i.caption })), +t.dataset.view);
    if (t.dataset.dview !== undefined) return openViewer(viewerState.items, +t.dataset.dview);
    if (t.dataset.rm !== undefined) {
      const i = +t.dataset.rm;
      if (await confirmDialog('Delete this image?', 'This image will be permanently removed from this log entry.')) { const [im] = form.imgs.splice(i, 1); URL.revokeObjectURL(im.url); if (form.editId) form.removed.push(im.id); renderEvidence(); }
    }
  });
  $('#search').oninput = renderLogs;
  $('#logForm').onsubmit = saveLog;
  $('#logForm').addEventListener('input', e => { if (e.target.dataset.cap !== undefined) form.imgs[+e.target.dataset.cap].caption = e.target.value; saveDraft(); });
  $('#addTool').onclick = () => { const v = $('#customTool').value.trim(); if (!v) return; if (!TOOLS.includes(v) && !settings.customTools.includes(v)) { settings.customTools.push(v); saveSettings(); } form.tools.add(v); $('#customTool').value = ''; renderTools(); };
  $('#cancelForm').onclick = () => go('logbook');
  $('#btnCam').onclick = () => $('#inCam').click(); $('#btnGal').onclick = () => $('#inGal').click();
  ['inCam', 'inGal'].forEach(id => $('#' + id).onchange = e => { handleImageUpload([...e.target.files]); e.target.value = ''; });
  $('#calPrev').onclick = () => { cal.m--; if (cal.m < 0) { cal.m = 11; cal.y--; } renderCalendar(); };
  $('#calNext').onclick = () => { cal.m++; if (cal.m > 11) { cal.m = 0; cal.y++; } renderCalendar(); };
  $('#calDay').onclick = e => { if (e.target.id === 'calAdd') { go('add'); $('#fDate').value = cal.sel; } };
  $('#profileForm').onsubmit = saveProfile;
  $('#sTheme').onchange = e => { settings.theme = e.target.value; saveSettings(); applyTheme(); };
  $('#expJson').onclick = exportBackup; $('#expCsv').onclick = exportCsv; $('#printAll').onclick = printLogbook;
  $('#impJson').onclick = () => $('#inImp').click(); $('#inImp').onchange = e => { if (e.target.files[0]) importBackup(e.target.files[0]); e.target.value = ''; };
  $('#clrSample').onclick = clearSamples;
  $('#clrAll').onclick = async () => { if (await confirmDialog('Clear everything?', 'This will permanently delete your logbook and uploaded photos. Are you sure?', 'Delete Everything')) { await clearImages().catch(() => {}); logs = []; saveLogs(); ls.del(K.d); showToast('All data cleared.'); refreshView(); } };
  $('#modal').onclick = e => { if (e.target.id === 'modal') closeSheet(); };
  $('#vClose').onclick = () => $('#viewer').hidden = true; $('#vPrev').onclick = () => stepViewer(-1); $('#vNext').onclick = () => stepViewer(1);
  let sx = 0; const v = $('#viewer');
  v.addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true });
  v.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50 && viewerState.items.length > 1) stepViewer(dx < 0 ? 1 : -1); }, { passive: true });
  document.addEventListener('keydown', e => { if (!v.hidden) { if (e.key === 'Escape') v.hidden = true; if (e.key === 'ArrowLeft') stepViewer(-1); if (e.key === 'ArrowRight') stepViewer(1); } else if (e.key === 'Escape') closeSheet(); });
}
let draftTimer;
function saveDraft() { // only for new logs; never overwrites saved entries
  if (form.editId || view !== 'add') return;
  clearTimeout(draftTimer); draftTimer = setTimeout(() => { const f = collectForm(); if (f.tasks || f.workProcess || f.problems || f.learning) ls.set(K.d, { fields: f, tools: [...form.tools] }); }, 500);
}

/* ---------- Init ---------- */
async function initApp() {
  loadSettings();
  if (!settings.seeded && !logs.length) await seedSamples();
  bindEvents(); $('#fDate').value = today(); go('dashboard');
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('service-worker.js').catch(() => {});
}
document.addEventListener('DOMContentLoaded', initApp);

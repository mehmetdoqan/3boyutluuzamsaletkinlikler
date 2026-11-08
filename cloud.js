'use strict';
/* Bulut katmanı (Supabase REST, bağımlılıksız). config.js boşsa uygulama yerel modda kalır.
   Ana betikteki DB, validDB, uid, saveDB yalnızca çağrı anında kullanılır. */
const CFG = window.BK_CONFIG || {};
const CL = { on: !!(CFG.url && CFG.anonKey), sess: null, status: '', ok: true, last: null, timer: 0, busy: false, again: false, listeners: [] };
const CL_KEY = 'birimkup.auth';
const CL_TABLES = ['classes', 'students', 'results', 'tasks', 'works'];
const clUrl = () => String(CFG.url || '').replace(/\/+$/, '');
function clSet(status, ok) { CL.status = status; CL.ok = ok !== false; CL.listeners.forEach(f => { try { f(); } catch (e) { } }); }

async function clFetch(path, opt, token) {
  const o = opt || {};
  const r = await fetch(clUrl() + path, {
    method: o.method || 'GET',
    headers: Object.assign({ apikey: CFG.anonKey, Authorization: 'Bearer ' + (token || CFG.anonKey), 'Content-Type': 'application/json' }, o.headers || {}),
    body: o.body === undefined ? undefined : JSON.stringify(o.body)
  });
  const txt = await r.text(); let data = null; try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
  if (!r.ok) { const m = data && (data.msg || data.message || data.error_description || data.error) || ('HTTP ' + r.status); const err = new Error(m); err.status = r.status; throw err; }
  return data;
}
/* ----- Oturum ----- */
function clStore(s) { CL.sess = s; try { if (s) localStorage.setItem(CL_KEY, JSON.stringify(s)); else localStorage.removeItem(CL_KEY); } catch (e) { } }
function clTake(d) { return { access: d.access_token, refresh: d.refresh_token, exp: Date.now() + (d.expires_in || 3600) * 1000, email: d.user && d.user.email || '', uid: d.user && d.user.id || '' }; }
function clRestore() { try { const s = JSON.parse(localStorage.getItem(CL_KEY) || 'null'); if (s && s.refresh) CL.sess = s; } catch (e) { } }
async function clToken() {
  const s = CL.sess; if (!s) throw new Error('Oturum yok');
  if (s.exp - Date.now() > 60000) return s.access;
  const d = await clFetch('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: s.refresh } });
  clStore(clTake(d)); return CL.sess.access;
}
async function clLogin(email, pw) { const d = await clFetch('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password: pw } }); clStore(clTake(d)); }
async function clSignup(email, pw) {
  const d = await clFetch('/auth/v1/signup', { method: 'POST', body: { email, password: pw } });
  if (d && d.access_token) { clStore(clTake(d)); return true; }
  return false; // e-posta doğrulaması isteniyor
}
function clLogout() { clStore(null); CL.last = null; clSet(''); }
const clAuthed = () => CL.on && !!CL.sess;

/* ----- DB ⇄ tablolar ----- */
function clRows(db) {
  const t = { classes: {}, students: {}, results: {}, tasks: {}, works: {} };
  db.classes.forEach(c => { t.classes[c.id] = { id: c.id, name: c.name, demo: !!c.demo }; c.students.forEach(s => { t.students[s.id] = { id: s.id, class_id: c.id, name: s.name }; }); });
  db.results.forEach(r => { t.results[r.id] = { id: r.id, class_id: r.classId, student_id: r.studentId, task_id: r.taskId, skill: r.skill, level: r.level || 1, outcome: r.outcome, day: r.day, tries: r.tries || 0, secs: r.secs || 0 }; });
  Object.keys(db.tasks || {}).forEach(id => { t.tasks[id] = { id, def: db.tasks[id] }; });
  (db.works || []).forEach(w => { t.works[w.id] = { id: w.id, name: w.name, grid: w.grid, at: w.at }; });
  return t;
}
function clBuild(rows, active) {
  const classes = rows.classes.map(c => ({ id: c.id, name: c.name, demo: !!c.demo, students: rows.students.filter(s => s.class_id === c.id).map(s => ({ id: s.id, name: s.name })) }));
  const results = rows.results.map(r => ({ id: r.id, studentId: r.student_id, classId: r.class_id, taskId: r.task_id, skill: r.skill, level: r.level, outcome: r.outcome, day: r.day, tries: r.tries, secs: r.secs }));
  const tasks = {}; rows.tasks.forEach(t => { tasks[t.id] = t.def; });
  const works = rows.works.map(w => ({ id: w.id, name: w.name, grid: w.grid, at: w.at })).sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return { v: 1, classes, results, active: classes.some(c => c.id === active) ? active : (classes[0] ? classes[0].id : null), tasks, works };
}
const clSnap = t => { const o = {}; CL_TABLES.forEach(k => { o[k] = {}; Object.keys(t[k]).forEach(id => { o[k][id] = JSON.stringify(t[k][id]); }); }); return o; };

async function clReq(path, opt) { return clFetch(path, opt, await clToken()); }
async function clPullAll() {
  const rows = {};
  for (const t of CL_TABLES) {
    let all = [], from = 0;
    for (;;) { // 1000'lik sayfalar
      const part = await clReq('/rest/v1/' + t + '?select=*&order=id.asc', { headers: { Range: from + '-' + (from + 999), 'Range-Unit': 'items' } });
      all = all.concat(part); if (part.length < 1000) break; from += 1000;
    }
    rows[t] = all;
  }
  return rows;
}
/* Girişten sonra: buluttaki veriyi al. Bulut boşsa ve yerelde gerçek veri varsa aktarmayı teklif et */
async function clSync() {
  clSet('Eşitleniyor…');
  const rows = await clPullAll(), empty = !rows.classes.length && !rows.tasks.length && !rows.works.length;
  CL.cloudEmpty = empty;
  if (empty) { CL.last = clSnap({ classes: {}, students: {}, results: {}, tasks: {}, works: {} }); clSet('Bulut boş'); return { empty: true }; }
  const db = clBuild(rows, DB.active); Object.keys(DB).forEach(k => delete DB[k]); Object.assign(DB, db);
  CL.last = clSnap(clRows(DB)); saveLocalOnly(); clSet('Eşitlendi'); return { empty: false };
}
function saveLocalOnly() { try { localStorage.setItem(LS_KEY, JSON.stringify(DB)); } catch (e) { } }

/* ----- Gönderme (fark bazlı) ----- */
const clChunks = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
async function clPush() {
  if (!clAuthed() || !CL.last) return;
  if (CL.busy) { CL.again = true; return; }
  CL.busy = true; clSet('Kaydediliyor…');
  try {
    const cur = clRows(DB), snap = clSnap(cur), conf = { classes: 'id', students: 'id', results: 'id', tasks: 'owner,id', works: 'id' };
    for (const t of CL_TABLES) {
      const up = Object.keys(cur[t]).filter(id => CL.last[t][id] !== snap[t][id]).map(id => cur[t][id]);
      for (const ch of clChunks(up, 200)) await clReq('/rest/v1/' + t + '?on_conflict=' + (t === 'tasks' ? 'owner,id' : 'id'), { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: ch.map(r => t === 'tasks' ? Object.assign({ owner: CL.sess.uid }, r) : r) });
      CL.last[t] = Object.assign({}, CL.last[t]); up.forEach(r => { CL.last[t][r.id] = snap[t][r.id]; });
    }
    for (const t of CL_TABLES.slice().reverse()) {
      const del = Object.keys(CL.last[t]).filter(id => !(id in cur[t]));
      for (const ch of clChunks(del, 100)) await clReq('/rest/v1/' + t + '?id=in.(' + ch.map(encodeURIComponent).join(',') + ')', { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      del.forEach(id => { delete CL.last[t][id]; });
    }
    clSet('Kaydedildi');
  } catch (e) { clSet('Kaydedilemedi: ' + e.message, false); }
  CL.busy = false; if (CL.again) { CL.again = false; clQueue(); }
}
function clQueue() { if (!clAuthed() || !CL.last) return; clearTimeout(CL.timer); CL.timer = setTimeout(clPush, 1200); }
async function clFlush() { clearTimeout(CL.timer); while (CL.busy) await new Promise(r => setTimeout(r, 100)); await clPush(); }
/* Yereldeki verinin tamamını buluta taşı (bulut boşken) */
async function clUploadLocal() { CL.last = clSnap({ classes: {}, students: {}, results: {}, tasks: {}, works: {} }); CL.cloudEmpty = false; await clPush(); }

/* ----- Bulut etkinlik kodu + öğrenci işlemleri ----- */
const CL_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const clNewCode = () => Array.from({ length: 6 }, () => CL_ALPHA[Math.floor(Math.random() * CL_ALPHA.length)]).join('');
const clIsCode = s => /^[A-Za-z0-9]{6}$/.test(String(s || '').trim());
async function clMakeActivity(classId, set) {
  await clFlush();
  for (let i = 0; i < 5; i++) {
    const code = clNewCode();
    try { await clReq('/rest/v1/activities', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: { code, class_id: classId, set } }); return code; }
    catch (e) { if (e.status !== 409) throw e; }
  }
  throw new Error('Kod üretilemedi');
}
const clGetActivity = code => clFetch('/rest/v1/rpc/get_activity', { method: 'POST', body: { p_code: String(code).trim() } });
const clSubmit = (code, name, results) => clFetch('/rest/v1/rpc/submit_activity', { method: 'POST', body: { p_code: String(code).trim(), p_name: name, p_results: results } });
async function clCloseActivity(code) { await clReq('/rest/v1/activities?code=eq.' + encodeURIComponent(code), { method: 'PATCH', body: { closed: true }, headers: { Prefer: 'return=minimal' } }); }

/* Başlangıç: kayıtlı oturum varsa sessizce eşitle */
async function clInit() {
  if (!CL.on) return;
  clRestore(); if (!CL.sess) return;
  try { await clToken(); await clSync(); } catch (e) { if (e.status === 400 || e.status === 401) clLogout(); else clSet('Çevrimdışı: ' + e.message, false); }
}

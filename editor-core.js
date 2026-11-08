'use strict';
/* Serbest tahta ve görev düzenleme: durum ve mantık (DOM yok).
   Ana betikteki yardımcılara (getTask, DB, COLORS…) yalnızca çağrı anında erişir. */
const ED = {
  st: null,                 // st[x][z] = renk indeksleri, aşağıdan yukarı
  mode: 'add', color: 0, sel: { x: 0, z: 4 },
  hist: [], viewer: null, view: 'iso',
  task: null,               // { id, title, skill, level, prompt, hint, k, variant, builtin, edited }
  msg: '', msgTimer: 0, pickerOpen: false, pickSkill: 'all', pickLevel: 0, workName: ''
};
const ED_MAXH = 5, ED_PER = 5;

function edBlank() { return Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => [])); }
function edClone(st) { return st.map(col => col.map(a => a.slice())); }
function edCounts() { const c = [0, 0, 0, 0, 0]; ED.st.forEach(col => col.forEach(a => a.forEach(v => { c[v]++; }))); return c; }
function edStats() {
  let used = 0, occ = 0, maxH = 0;
  ED.st.forEach(col => col.forEach(a => { used += a.length; if (a.length) occ++; maxH = Math.max(maxH, a.length); }));
  return { used, occ, maxH, counts: edCounts() };
}
function edPush() { ED.hist.push(JSON.stringify(ED.st)); if (ED.hist.length > 60) ED.hist.shift(); }
function edUndo() { if (!ED.hist.length) return false; ED.st = JSON.parse(ED.hist.pop()); return true; }
function edAdd(x, z, c) {
  const stack = ED.st[x][z];
  if (stack.length >= ED_MAXH) return { ok: false, msg: 'Bu hücre en fazla 5 küp yüksekliğinde olabilir.' };
  if (edCounts()[c] >= ED_PER) return { ok: false, msg: CTITLES[c] + ' renkte küp kalmadı.' };
  edPush(); stack.push(c); return { ok: true };
}
function edRemove(x, z) {
  const stack = ED.st[x][z];
  if (!stack.length) return { ok: false, msg: 'Bu hücrede silinecek küp yok.' };
  edPush(); stack.pop(); return { ok: true };
}
function edClear() { edPush(); ED.st = edBlank(); }
function edCubes(st) {
  const out = [];
  (st || ED.st).forEach((col, x) => col.forEach((a, z) => a.forEach((c, y) => out.push({ x, y, z, c, p: 0 }))));
  return out;
}
function edFromCubes(cubes) {
  const st = edBlank();
  cubes.slice().sort((a, b) => a.y - b.y).forEach(c => { st[c.x][c.z].push(c.c); });
  return st;
}

/* ----- Görev tanımı ⇄ görev nesnesi ----- */
function taskFromDef(d) {
  const cubes = edCubes(d.grid);
  const h = Array.from({ length: N }, () => Array(N).fill(0));
  cubes.forEach(c => { h[c.x][c.z]++; });
  const t = { id: d.id, skill: d.skill, level: d.level, seed: 0, h, cubes, T: cubes.length, maxH: maxHeight(h), foot: footprint(h),
    k: Math.max(1, Math.min(3, d.k || 1)), parts: 0, variant: d.variant === 'kur' ? 'kur' : 'cizim', vis: null, offsets: null,
    prompt: d.prompt || '', hint: d.hint || '', title: d.title || '', ok: true };
  if (d.skill === 'gizli') t.vis = visibleKeys(cubes);
  if (d.skill === 'parca') {
    const cols = [...new Set(cubes.map(c => c.c))].sort((a, b) => a - b);
    cubes.forEach(c => { c.p = cols.indexOf(c.c); });
    t.parts = cols.length || 1;
    t.offsets = cubes.length ? partOffsets(cubes, t.parts) : [[0, 0, 0]];
  }
  return t;
}
const edIsBuiltin = id => { const p = parseId(id); return !!SKILL_BY[p.skill] && p.level >= 1 && p.level <= 3 && p.seed > 0; };
function edTaskMeta(id) {
  const t = getTask(id), d = DB.tasks[id];
  return { id, title: d && d.title ? d.title : '', skill: t.skill, level: t.level, prompt: promptOf(t), hint: hintOf(t), k: t.k || 1,
    variant: t.variant || 'cizim', builtin: edIsBuiltin(id), edited: !!d };
}
function edOpenTask(id) {
  if (!ED.st) ED.st = edBlank(); else edPush();
  const t = getTask(id);
  ED.st = edFromCubes(t.cubes); ED.task = edTaskMeta(id); ED.sel = { x: 0, z: 4 };
}
function edNewTask() {
  ED.task = { id: '', title: '', skill: 'yapi', level: 1, prompt: '', hint: '', k: 1, variant: 'cizim', builtin: false, edited: false };
  ED.task.prompt = promptOf(taskFromDef(edDefFromState()));
  ED.task.hint = hintOf(taskFromDef(edDefFromState()));
}
function edDefFromState() {
  const T = ED.task || { skill: 'yapi', level: 1, k: 1, variant: 'cizim' };
  return { id: T.id || '', title: (T.title || '').trim(), skill: T.skill, level: T.level, prompt: '', hint: '', k: T.k, variant: T.variant, grid: edClone(ED.st) };
}
/* Otomatik metinle aynıysa geçersiz kılma saklanmaz; metin beceriyle birlikte güncel kalır */
function edDefToSave() {
  const T = ED.task, d = edDefFromState(), auto = taskFromDef(d);
  d.prompt = (T.prompt || '').trim() === promptOf(auto).trim() ? '' : (T.prompt || '').trim();
  d.hint = (T.hint || '').trim() === hintOf(auto).trim() ? '' : (T.hint || '').trim();
  return d;
}
function edPreview() {
  if (!ED.task) return '';
  const d = edDefFromState(); d.prompt = ''; d.hint = '';
  const t = taskFromDef(d);
  return t.T ? answerOf(t) : '';
}
function edSaveTask(asNew) {
  const T = ED.task;
  if (!edStats().used) return { ok: false, msg: 'Tahta boş. Önce küp ekleyin.' };
  let id = T.id;
  if (asNew || !id) id = T.skill + '.' + T.level + '.k' + Date.now().toString(36);
  const d = edDefToSave(); d.id = id;
  if (!d.title) d.title = SKILL_BY[T.skill].name;
  DB.tasks[id] = d; taskCache.delete(id); saveDB();
  ED.task = Object.assign(edTaskMeta(id), { title: d.title });
  return { ok: true, msg: asNew ? 'Yeni görev olarak kaydedildi.' : 'Görev kaydedildi.' };
}
function edRevertTask() {
  const T = ED.task; if (!T || !T.id) return { ok: false };
  delete DB.tasks[T.id]; taskCache.delete(T.id); saveDB();
  if (T.builtin) { edOpenTask(T.id); return { ok: true, msg: 'Özgün görev geri yüklendi.' }; }
  ED.task = null; return { ok: true, msg: 'Görev silindi.' };
}

/* ----- Kayıtlı çalışmalar (serbest tahta) ----- */
function edWorkSave(name) {
  if (!edStats().used) return { ok: false, msg: 'Tahta boş.' };
  DB.works.unshift({ id: uid('w'), name: (name || '').trim() || 'Çalışma ' + (DB.works.length + 1), grid: edClone(ED.st), at: new Date().toISOString() });
  DB.works = DB.works.slice(0, 30); saveDB(); return { ok: true, msg: 'Çalışma kaydedildi.' };
}
function edWorkLoad(id) { const w = DB.works.find(x => x.id === id); if (!w) return false; edPush(); ED.st = edClone(w.grid); ED.task = null; return true; }
function edWorkDelete(id) { DB.works = DB.works.filter(x => x.id !== id); saveDB(); }

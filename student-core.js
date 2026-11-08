'use strict';
/* Öğrenci modu: etkinlik, soru modeli, kontrol, sonuç kodu (DOM yok).
   Ana betikteki yardımcılara (getTask, DB, viewTop…) yalnızca çağrı anında erişir. */
const SES = { set: null, defs: null, who: null, mode: 'local', i: 0, st: [] };
const STU_MAX_TRIES = 3;

/* ----- Kod üretme / çözme (Unicode güvenli, kopyala-yapıştır için) ----- */
function stuPack(prefix, obj) {
  return prefix + '-' + btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function stuUnpack(prefix, text) {
  try {
    let s = String(text || '').trim().replace(/\s+/g, '');
    if (s.slice(0, prefix.length + 1) !== prefix + '-') return null;
    s = s.slice(prefix.length + 1).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const o = JSON.parse(decodeURIComponent(escape(atob(s))));
    return o && o.v === 1 ? o : null;
  } catch (e) { return null; }
}

/* ----- Etkinlik (görev kümesi) ----- */
function stuPool(skill, level) {
  const skills = skill === 'all' ? SKILLS.map(s => s.key) : [skill], levels = level ? [level] : [1, 2, 3], ids = [];
  skills.forEach(s => levels.forEach(l => { for (let i = 1; i <= BANK; i++) ids.push(s + '.' + l + '.' + i); }));
  Object.keys(DB.tasks).forEach(id => { const d = DB.tasks[id]; if (!ids.includes(id) && skills.includes(d.skill) && levels.includes(d.level)) ids.push(id); });
  return ids;
}
function stuMakeSet(skill, level, count, title) {
  const ids = shuffle(stuPool(skill, level), mulberry32((Date.now() & 0x7fffffff) || 1)).slice(0, count);
  ids.sort((a, b) => getTask(a).level - getTask(b).level);
  const defs = {}; ids.forEach(id => { if (DB.tasks[id]) defs[id] = DB.tasks[id]; });
  return { v: 1, title: (title || '').trim() || 'Etkinlik', ids, defs };
}
function stuSetValid(set) {
  return set && Array.isArray(set.ids) && set.ids.length && set.ids.length <= 30 &&
    set.ids.every(id => typeof id === 'string' && SKILL_BY[parseId(id).skill] && parseId(id).level >= 1 && parseId(id).level <= 3) &&
    (!set.defs || typeof set.defs === 'object');
}
function stuBegin(set, who, mode) {
  SES.set = set; SES.defs = set.defs && Object.keys(set.defs).length ? set.defs : null;
  taskCache.clear();
  SES.who = who; SES.mode = mode; SES.i = 0;
  SES.st = set.ids.map(() => ({ tries: 0, hint: false, out: null, secs: 0 }));
}
function stuEndSession() { SES.set = null; SES.defs = null; SES.who = null; SES.st = []; taskCache.clear(); }

/* ----- Sorular ----- */
const boardH = st => st.map(col => col.map(a => a.length));
function stuQuestions(t) {
  const q = [], num = (id, label, answer, extra) => q.push(Object.assign({ k: 'num', id, label, answer }, extra || {}));
  switch (t.skill) {
    case 'yapi':
      q.push({ k: 'build', id: 'b', label: 'Yapıyı kendi tahtanda kur.', target: t.h });
      if (t.level >= 2) num('n', 'Kaç küp kullandın?', t.T);
      if (t.level >= 3) num('m', 'En yüksek kule kaç katman?', t.maxH);
      break;
    case 'dondurme': q.push({ k: 'build', id: 'b', label: 'Döndürülmüş yapıyı kendi tahtanda kur.', target: rotateH(t.h, t.k) }); break;
    case 'katman': num('m', 'Yapı kaç katman yüksekliğinde?', t.maxH); layerCounts(t).forEach((n, i) => num('l' + i, (i + 1) + '. katmanda kaç küp var?', n)); break;
    case 'gizli': num('n', 'Toplam kaç küp var?', t.T); num('g', 'Kaç küp gizli?', t.T - t.vis.size); break;
    case 'gorunus':
      if (t.variant === 'kur') q.push({ k: 'build', id: 'b', label: 'Üç görünüşe bakarak yapıyı kendi tahtanda kur.', target: t.h });
      else [['top', 'Üstten bakınca hangisini görürsün?'], ['front', 'Önden bakınca hangisini görürsün?'], ['right', 'Sağdan bakınca hangisini görürsün?']]
        .forEach(v => q.push({ k: 'mc', id: v[0], label: v[1], options: stuOptions(t, v[0]) }));
      break;
    case 'parca': {
      const cnt = Array(t.parts).fill(0), pc = []; t.cubes.forEach(c => { cnt[c.p]++; pc[c.p] = c.c; });
      cnt.forEach((n, i) => num('p' + i, CTITLES[pc[i]] + ' parçada kaç küp var?', n, { dot: COLORS[pc[i]] }));
      break;
    }
  }
  return q;
}
/* Görünüş soruları: doğru şekil + yapıdan türetilen yanlış şekiller (aynı görev için hep aynı) */
function stuOptions(t, v) {
  const rows = Math.max(1, t.maxH) + 1, rng = mulberry32(hashStr(t.id + v));
  const strip = s => s.replace(/<figcaption>[\s\S]*?<\/figcaption>/, '');
  const render = cs => strip(v === 'top' ? viewTop(cs, '') : v === 'front' ? viewFront(cs, rows) : viewRight(cs, rows));
  const mir = (cs, ax) => cs.map(c => ({ x: ax === 'x' ? 4 - c.x : c.x, y: c.y, z: ax === 'z' ? 4 - c.z : c.z, c: c.c, p: c.p }));
  const correct = render(t.cubes), seen = new Set([correct]), wrong = [];
  const add = cs => { if (wrong.length >= 3) return; const s = render(cs.filter(c => c.y < rows)); if (!seen.has(s)) { seen.add(s); wrong.push(s); } };
  [mir(t.cubes, 'x'), mir(t.cubes, 'z'), rotCubes(t.cubes, 1), rotCubes(t.cubes, 2), rotCubes(t.cubes, 3)].forEach(add);
  const tops = t.cubes.filter(c => !t.cubes.some(d => d.x === c.x && d.z === c.z && d.y === c.y + 1));
  for (let i = 0; i < 80 && wrong.length < 3 && tops.length; i++) {
    const r = tops[ri(rng, 0, tops.length - 1)];
    add(rng() < 0.5 && t.cubes.length > 1 ? t.cubes.filter(c => c !== r) : t.cubes.concat([{ x: r.x, y: r.y + 1, z: r.z, c: r.c, p: r.p }]));
  }
  return shuffle([{ svg: correct, ok: true }].concat(wrong.map(s => ({ svg: s, ok: false }))), rng);
}
function stuCheckOne(q, a) {
  if (q.k === 'num') return a !== '' && a != null && Number(a) === q.answer;
  if (q.k === 'build') return JSON.stringify(a) === JSON.stringify(q.target);
  if (q.k === 'mc') return a != null && !!q.options[a] && q.options[a].ok;
  return false;
}
/* Cevaplar: { soruId: değer }. Yanlış soruların kimliklerini döndürür */
function stuWrong(qs, ans) { return qs.filter(q => !stuCheckOne(q, ans[q.id])).map(q => q.id); }

/* ----- Sonuçlar ----- */
function stuResults(onlyDone) {
  const day = dayStr(new Date());
  return SES.set.ids.map((id, i) => {
    const t = getTask(id), s = SES.st[i];
    return s.out || !onlyDone ? { taskId: id, skill: t.skill, level: t.level, outcome: s.out || 'x', day, tries: s.tries, secs: Math.round(s.secs) } : null;
  }).filter(Boolean);
}
function stuSaveLocal(results) {
  results.forEach(r => DB.results.push(Object.assign({ id: uid('r'), studentId: SES.who.id, classId: SES.who.classId }, r)));
  saveDB();
}
const stuResultCode = results => stuPack('BS1', { v: 1, title: SES.set.title, name: SES.who.name, results });
/* Öğretmen: sonuç kodlarını etkin sınıfa aktar (öğrenci adıyla eşleşir, yoksa eklenir) */
function stuImport(text, cls) {
  const lines = String(text || '').split(/\s+/).filter(Boolean), out = { students: 0, results: 0, bad: 0 };
  const touched = new Set();
  lines.forEach(line => {
    const d = stuUnpack('BS1', line);
    if (!d || !Array.isArray(d.results) || typeof d.name !== 'string') { out.bad++; return; }
    const nm = d.name.trim().slice(0, 60); if (!nm) { out.bad++; return; }
    let s = cls.students.find(x => x.name.trim().toLowerCase() === nm.toLowerCase());
    if (!s) { s = { id: uid('s'), name: nm }; cls.students.push(s); }
    touched.add(s.id);
    d.results.forEach(r => {
      if (!r || !SKILL_BY[r.skill] || SC[r.outcome] === undefined || typeof r.day !== 'string' || typeof r.taskId !== 'string') return;
      DB.results = DB.results.filter(x => !(x.studentId === s.id && x.taskId === r.taskId && x.day === r.day));
      DB.results.push({ id: uid('r'), studentId: s.id, classId: cls.id, taskId: r.taskId.slice(0, 40), skill: r.skill, level: +r.level || 1, outcome: r.outcome, day: r.day, tries: +r.tries || 0, secs: +r.secs || 0 });
      out.results++;
    });
  });
  out.students = touched.size; saveDB(); return out;
}

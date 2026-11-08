'use strict';
/* Öğrenci modu: öğretmen sayfası, öğrenci giriş sayfası ve tam ekran çözme ekranı */
const STU = { skill: 'all', level: 0, count: 5, title: '', code: '', codeIn: '', nameIn: '', resIn: '', msg: '', ok: true };
const PL = { screen: 'pick', t: null, qs: [], ans: {}, bad: [], checked: false, over: false, hint: false, fb: '', st: null, sel: null, color: 0, mode: 'add', hist: [], layer: 1, t0: 0, vA: null, vB: null, exitAsk: false, msgT: 0 };
const plQ = id => document.getElementById(id);

/* ===== Öğretmen sayfası (#ogrenci) ===== */
function stuTeacherPage() {
  const sk = [{ key: 'all', name: 'Tümü' }].concat(SKILLS).map(s => '<button class="chip" data-stu="skill" data-v="' + s.key + '" aria-pressed="' + (STU.skill === s.key) + '">' + esc(s.key === 'all' ? s.name : s.short) + '</button>').join('');
  const lv = [{ n: 0, t: 'Tümü' }].concat(LEVELS.map(l => ({ n: l.n, t: l.n + ' · ' + l.age }))).map(l => '<button class="chip" data-stu="level" data-v="' + l.n + '" aria-pressed="' + (STU.level === l.n) + '">' + l.t + '</button>').join('');
  const cnt = [3, 5, 8, 10, 15].map(n => '<option value="' + n + '"' + (STU.count === n ? ' selected' : '') + '>' + n + ' görev</option>').join('');
  const cls = activeClass();
  return '<header class="page-head"><h1>Öğrenci etkinliği</h1><p>Öğrenciler görevleri kendi ekranlarında çözer; sistem cevabı kontrol eder, ipucu verir ve sonucu otomatik değerlendirir.</p></header>' +
    '<div class="stack"><div class="two stu-two"><section class="panel"><h2>1. Etkinlik hazırla</h2>' +
    '<div class="filters"><div class="row"><span class="lbl">Beceri</span><div class="chips">' + sk + '</div></div><div class="row"><span class="lbl">Seviye</span><div class="chips">' + lv + '</div></div>' +
    '<div class="row"><span class="lbl">Sayı</span><select data-stu="count">' + cnt + '</select><input type="text" data-stu="title" placeholder="Etkinlik adı (isteğe bağlı)" maxlength="60" value="' + esc(STU.title) + '" style="flex:1 1 180px"></div></div>' +
    '<p class="note">Görevler seçtiğiniz beceri ve seviyeden rastgele seçilir; kendi düzenlediğiniz görevler de dahildir.</p>' +
    '<div class="chips" style="margin-top:14px"><button class="btn primary" data-stu="open">Bu cihazda öğrenci ekranını aç</button><button class="btn" data-stu="mkcode">Etkinlik kodu oluştur</button></div>' +
    (STU.code ? '<div style="margin-top:14px"><p class="note">Kodu öğrencilere gönderin. Öğrenciler panelde sağ üstteki <b>Öğrenci girişi</b> bölümünden kodu yapıştırıp başlar.</p><textarea id="stuCode" readonly aria-label="Etkinlik kodu">' + esc(STU.code) + '</textarea><div class="chips" style="margin-top:8px"><button class="btn small" data-stu="copycode">Kopyala</button><span class="note" id="stuCopyMsg"></span></div></div>' : '') + clTeacherBox() + '</section>' +
    '<section class="panel"><h2>2. Sonuçları al</h2><p class="note">Öğrenci işini bitirince bir <b>sonuç kodu</b> görür. Kodları (her satıra bir tane) buraya yapıştırın; öğrenciler ' + (cls ? '<b>' + esc(cls.name) + '</b> sınıfına' : 'etkin sınıfa') + ' adlarıyla eklenir ve Gelişim sayfasına işlenir. Aynı cihazda çözenlerin sonucu zaten otomatik kaydedilir.</p>' +
    '<textarea data-stu="resIn" placeholder="BS1-…" aria-label="Sonuç kodları">' + esc(STU.resIn) + '</textarea><div class="chips" style="margin-top:8px"><button class="btn primary" data-stu="import"' + (cls ? '' : ' disabled') + '>İçe aktar</button></div>' +
    (STU.msg ? '<p class="note" style="margin-top:10px;color:' + (STU.ok ? 'var(--ok)' : 'var(--bad)') + '">' + esc(STU.msg) + '</p>' : '') + '</section></div></div>';
}
/* ===== Öğrenci giriş sayfası (#giris) ===== */
function stuEntryPage() {
  return '<div class="entry"><div class="panel"><h1>Öğrenci girişi</h1><p class="muted">Öğretmeninin verdiği etkinlik kodunu yapıştır ve adını yaz.</p>' +
    '<label class="entry-l">Etkinlik kodu<textarea data-stu="codeIn" placeholder="6 haneli kod veya BK1-…" rows="3">' + esc(STU.codeIn) + '</textarea></label>' +
    '<label class="entry-l">Adın<input type="text" data-stu="nameIn" maxlength="60" placeholder="Adın ve soyadının ilk harfi" value="' + esc(STU.nameIn) + '"></label>' +
    '<button class="btn primary big" data-stu="start">Başla</button>' + (STU.msg ? '<p class="note" style="margin-top:10px;color:var(--bad)">' + esc(STU.msg) + '</p>' : '') +
    '<p class="note" style="margin-top:16px"><a href="#tahta">Öğretmen paneline dön</a></p></div></div>';
}
function stuCopy(text, ta, msgId) {
  const m = plQ(msgId), fb = () => { if (ta) { ta.focus(); ta.select(); } if (m) m.textContent = 'Metin seçildi. Ctrl+C ile kopyalayın.'; };
  try { navigator.clipboard.writeText(text).then(() => { if (m) m.textContent = 'Kopyalandı.'; }, fb); } catch (e) { fb(); }
}
function stuDefOk(d) {
  return d && SKILL_BY[d.skill] && d.level >= 1 && d.level <= 3 && Array.isArray(d.grid) && d.grid.length === 5 &&
    d.grid.every(col => Array.isArray(col) && col.length === 5 && col.every(a => Array.isArray(a) && a.length <= 5 && a.every(v => v >= 0 && v <= 4)));
}
function stuStart() {
  if (CL.on && clIsCode(STU.codeIn)) { stuStartCloud(); return; }
  const set = stuUnpack('BK1', STU.codeIn), name = STU.nameIn.trim();
  if (!stuSetValid(set)) { STU.msg = 'Etkinlik kodu okunamadı. Kodun tamamını yapıştırdığından emin ol.'; render(); return; }
  if (!name) { STU.msg = 'Önce adını yaz.'; render(); return; }
  if (set.defs) Object.keys(set.defs).forEach(id => { if (!stuDefOk(set.defs[id])) delete set.defs[id]; });
  STU.msg = ''; plOpen('code', set, { name: name.slice(0, 60) });
}
let stuBound = false;
function stuMount() {
  if (stuBound) return; stuBound = true;
  const root = plQ('app');
  root.addEventListener('click', e => {
    const t = e.target.closest('[data-stu]'); if (!t) return;
    const a = t.dataset.stu, v = t.dataset.v;
    if (a === 'skill') { STU.skill = v; render(); }
    else if (a === 'level') { STU.level = +v; render(); }
    else if (a === 'open') { const set = stuMakeSet(STU.skill, STU.level, STU.count, STU.title); if (!set.ids.length) { STU.msg = 'Bu seçimde görev yok.'; STU.ok = false; render(); return; } plOpen('local', set, null); }
    else if (a === 'mkcode') { const set = stuMakeSet(STU.skill, STU.level, STU.count, STU.title); STU.code = set.ids.length ? stuPack('BK1', set) : ''; render(); }
    else if (a === 'copycode') stuCopy(STU.code, plQ('stuCode'), 'stuCopyMsg');
    else if (a === 'import') {
      const c = activeClass(); if (!c) return;
      const r = stuImport(STU.resIn, c);
      STU.ok = r.results > 0; STU.msg = r.results ? r.students + ' öğrenciden ' + r.results + ' sonuç aktarıldı.' + (r.bad ? ' ' + r.bad + ' kod okunamadı.' : '') : 'Okunabilir bir sonuç kodu bulunamadı.';
      if (r.results) STU.resIn = ''; render();
    }
    else if (a === 'start') stuStart();
  });
  root.addEventListener('input', e => { const f = e.target.dataset && e.target.dataset.stu; if (f === 'title') STU.title = e.target.value; else if (f === 'resIn') STU.resIn = e.target.value; else if (f === 'codeIn') STU.codeIn = e.target.value; else if (f === 'nameIn') STU.nameIn = e.target.value; });
  root.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.stu === 'count') STU.count = +e.target.value; });
  plBind();
}

/* ===== Çözme ekranı ===== */
function plOpen(mode, set, who) {
  stuBegin(set, who, mode);
  document.documentElement.classList.add('pres-open'); plQ('play').hidden = false;
  if (who) plTask(0); else { PL.screen = 'pick'; plRender(); }
}
function plClose() {
  plDestroy(); plQ('play').hidden = true; plQ('play').innerHTML = '';
  document.documentElement.classList.remove('pres-open'); stuEndSession(); render();
}
function plDestroy() { if (PL.vA) PL.vA.destroy(); if (PL.vB) PL.vB.destroy(); PL.vA = PL.vB = null; }
function plTask(i) {
  SES.i = i; const t = getTask(SES.set.ids[i]);
  Object.assign(PL, { screen: 'task', t, qs: stuQuestions(t), ans: {}, bad: [], checked: false, over: false, hint: false, fb: '', st: edBlank(), sel: null, color: 0, mode: 'add', hist: [], layer: t.maxH, t0: Date.now(), exitAsk: false });
  plRender();
}
function plBuildQ() { return PL.qs.find(q => q.k === 'build'); }
function plCounts() { const c = [0, 0, 0, 0, 0]; PL.st.forEach(col => col.forEach(a => a.forEach(v => { c[v]++; }))); return c; }
function plToast(m) { const el = plQ('plToast'); if (!el) return; el.textContent = m; el.classList.add('show'); clearTimeout(PL.msgT); PL.msgT = setTimeout(() => el.classList.remove('show'), 2000); }
function plPick(h, e) {
  if (!h || PL.over) return;
  const stack = PL.st[h.x][h.z]; PL.sel = { x: h.x, z: h.z };
  if (PL.mode === 'remove' || e.ctrlKey) { if (!stack.length) return; PL.hist.push(JSON.stringify(PL.st)); stack.pop(); }
  else {
    if (stack.length >= 5) { plToast('Bir kule en fazla 5 küp olur.'); return; }
    if (plCounts()[PL.color] >= 5) { plToast(CTITLES[PL.color] + ' küp kalmadı. Başka renk seç.'); return; }
    PL.hist.push(JSON.stringify(PL.st)); stack.push(PL.color);
  }
  PL.hist = PL.hist.slice(-40); plSyncB(); plTools();
}
function plSyncB() { if (!PL.vB) return; PL.vB.st.cubes = edCubes(PL.st); PL.vB.st.sel = PL.sel; PL.vB.draw(); }
function plTools() {
  const el = plQ('plTools'); if (!el) return; const cnt = plCounts();
  el.innerHTML = COLORS.map((c, i) => '<button class="ed-mini-c" data-pl="color" data-i="' + i + '" aria-pressed="' + (PL.color === i && PL.mode === 'add') + '" aria-label="' + CTITLES[i] + '" style="background:' + c + '">' + (5 - cnt[i]) + '</button>').join('') +
    '<button class="btn small" data-pl="mode" aria-pressed="' + (PL.mode === 'remove') + '">− Sil</button><button class="btn small" data-pl="undo">Geri al</button>';
  const u = plQ('plUsed'); if (u) u.textContent = cnt.reduce((a, b) => a + b, 0);
}
function plQHTML(q) {
  const bad = PL.bad.includes(q.id), cls = 'q' + (bad ? ' bad' : PL.checked ? ' good' : ''), lost = PL.over && SES.st[SES.i].out === 'x', dis = PL.over ? ' disabled' : '';
  if (q.k === 'num') {
    const v = PL.ans[q.id] == null ? '' : PL.ans[q.id];
    return '<div class="' + cls + '"><label for="pl-' + q.id + '">' + (q.dot ? '<span class="dot" style="background:' + q.dot + '"></span>' : '') + esc(q.label) + '</label><div class="step"><button class="btn" data-pl="dec" data-id="' + q.id + '" aria-label="Azalt"' + dis + '>−</button>' +
      '<input id="pl-' + q.id + '" type="number" inputmode="numeric" min="0" max="99" data-pl-in="' + q.id + '" value="' + v + '" placeholder="?"' + dis + '><button class="btn" data-pl="inc" data-id="' + q.id + '" aria-label="Artır"' + dis + '>+</button></div>' + (lost ? '<div class="corr">Doğru cevap: <b>' + q.answer + '</b></div>' : '') + '</div>';
  }
  if (q.k === 'mc') {
    return '<div class="' + cls + '"><label>' + esc(q.label) + '</label><div class="mc">' + q.options.map((o, j) => '<button class="mcopt' + (lost && o.ok ? ' right' : '') + '" data-pl="mc" data-id="' + q.id + '" data-j="' + j + '" aria-pressed="' + (PL.ans[q.id] === j) + '"' + dis + '>' + o.svg + '</button>').join('') + '</div></div>';
  }
  return '<div class="' + cls + '"><label>' + esc(q.label) + '</label><div class="note">Tahtandaki küp: <b id="plUsed">' + plCounts().reduce((a, b) => a + b, 0) + '</b>' + (bad ? ' · Yapı henüz aynı değil. Her karedeki kule yüksekliğine bak.' : '') + '</div></div>';
}
function plPanelHTML() {
  const t = PL.t, L = LEVELS[t.level - 1], s = SES.st[SES.i], last = SES.i === SES.set.ids.length - 1, lost = PL.over && s.out === 'x';
  const fb = PL.fb === 'ok' ? '<div class="fb ok">Harika! Hepsi doğru.</div>' : PL.fb === 'retry' ? '<div class="fb retry">Neredeyse! Kırmızı çerçeveli yerlere bir daha bak. Kalan hakkın: ' + (STU_MAX_TRIES - s.tries) + '</div>' : PL.fb === 'fail' ? '<div class="fb fail">Bu sefer olmadı. Doğru cevapları gösterdim.</div>' : '';
  return '<div class="p-meta"><span class="pill l' + t.level + '">Seviye ' + t.level + ' · ' + L.age + '</span><span>' + esc(SKILL_BY[t.skill].name) + '</span></div><h2 class="p-prompt">' + esc(promptOf(t)) + '</h2>' +
    PL.qs.map(plQHTML).join('') + (PL.hint ? '<div class="hintbox">' + esc(hintOf(t)) + '</div>' + viewsOf(t, true, false) : viewsOf(t, false, false)) +
    (lost ? '<div class="answer">' + answerOf(t) + '</div>' + viewsOf(t, true, true) : '') + fb +
    '<div class="p-actions">' + (PL.over ? '<button class="btn primary big" data-pl="next">' + (last ? 'Bitir' : 'Sonraki görev →') + '</button>' : '<button class="btn" data-pl="hint">' + (PL.hint ? 'İpucunu gizle' : 'İpucu') + '</button><button class="btn primary big" data-pl="check">Kontrol et</button>') + '</div>';
}
function plRender() {
  plDestroy(); const box = plQ('play'), name = SES.who ? esc(SES.who.name) : '';
  const top = '<div class="play-top"><div class="ps-brand">Birim Küp</div><div class="ps-who">' + name + '</div><div class="ps-dots">' + (SES.set ? SES.st.map((x, j) => '<i class="' + (j === SES.i && PL.screen === 'task' ? 'cur ' : '') + (x.out ? 'o-' + x.out : '') + '"></i>').join('') : '') + '</div><button class="btn small" data-pl="exit">' + (PL.exitAsk ? 'Çıkılsın mı? Evet' : 'Çık') + '</button></div>';
  if (PL.screen === 'pick') {
    const c = activeClass(), list = c ? c.students.map(s => '<button class="btn who" data-pl="who" data-id="' + s.id + '">' + esc(s.name) + '</button>').join('') : '';
    box.innerHTML = top + '<div class="play-center"><h1>Merhaba!</h1><p class="muted">' + esc(SES.set.title) + ' · ' + SES.set.ids.length + ' görev. Adını seç.</p><div class="who-grid">' + (list || '<p class="note">Bu sınıfta öğrenci yok.</p>') + '</div>' +
      '<details><summary>Listede adım yok</summary><div class="inline-form" style="margin-top:10px"><input type="text" id="plGuest" placeholder="Adın" maxlength="60"><button class="btn primary" data-pl="guest">Başla</button></div></details></div>'; return;
  }
  if (PL.screen === 'end') {
    const rs = stuResults(false), stars = rs.reduce((a, r) => a + (r.outcome === 'd' ? 3 : r.outcome === 'y' ? 2 : 1), 0), code = SES.mode === 'code' ? stuResultCode(rs) : '';
    box.innerHTML = top + '<div class="play-center"><h1>Tebrikler' + (name ? ', ' + name : '') + '!</h1><p class="stars">★ ' + stars + ' / ' + rs.length * 3 + '</p><ul class="endlist">' + rs.map(r => '<li><span>' + esc(SKILL_BY[r.skill].name) + ' · Seviye ' + r.level + '</span><b class="out ' + r.outcome + '">' + OUTL[r.outcome] + '</b></li>').join('') + '</ul>' +
      (code ? '<p class="note">Bu kodu öğretmenine gönder; sonuçların onun panelinde görünür.</p><textarea id="plCode" readonly aria-label="Sonuç kodu">' + esc(code) + '</textarea><div class="chips" style="margin-top:8px"><button class="btn" data-pl="copy">Kopyala</button><span class="note" id="plCopyMsg"></span></div>' : SES.mode === 'cloud' ? '<div id="plSend">' + stuSendHTML() + '</div>' : '<p class="note">Sonuçların öğretmenine kaydedildi.</p>') +
      '<div class="chips" style="margin-top:16px"><button class="btn primary big" data-pl="done">Kapat</button></div></div>'; return;
  }
  const t = PL.t, hasB = !!plBuildQ(), hide = hideCubes(t);
  box.innerHTML = top + '<div class="play-main"><div class="play-stages"><div class="pstage"><div class="cap">' + (hide ? 'Görünüşler' : 'Yapı') + '</div><canvas id="plA" aria-label="Yapı"></canvas>' + (hide ? '<div class="pnote">Yapı gizli. Sağdaki üç görünüşe bak.</div>' : '') +
    (t.skill === 'katman' ? '<div class="layerbox"><label for="plLayer">Gösterilen katman: <span id="plLayerVal">' + PL.layer + ' / ' + t.maxH + '</span></label><input type="range" id="plLayer" min="1" max="' + t.maxH + '" value="' + PL.layer + '"></div>' : '') + '</div>' +
    (hasB ? '<div class="pstage"><div class="cap">Senin tahtan</div><canvas id="plB" aria-label="Senin tahtan"></canvas><div class="ed-mini on" id="plTools"></div><div class="ed-toast" id="plToast" role="status"></div></div>' : '') + '</div><div class="play-panel" id="plPanel">' + plPanelHTML() + '</div></div>';
  const vA = PL.vA = new Viewer(plQ('plA'), t.skill !== 'gizli'); vA.cam.zoom = hasB ? 1.05 : 1.25;
  vA.st = { cubes: hide ? [] : t.cubes, yaw: 0, explode: t.skill === 'parca' ? 1 : 0, offsets: t.offsets, maxLayer: t.skill === 'katman' ? PL.layer : null, dim: null }; vA.draw();
  if (hasB) { const vB = PL.vB = new Viewer(plQ('plB'), true); vB.pickable = true; vB.onPick = plPick; vB.cam.zoom = 1.05; vB.st = { cubes: [], yaw: 0, explode: 0, sel: null }; plSyncB(); plTools(); }
}
function plPanel() { const p = plQ('plPanel'); if (p) p.innerHTML = plPanelHTML(); plRenderDots(); }
function plRenderDots() { const d = document.querySelector('.ps-dots'); if (d) d.innerHTML = SES.st.map((x, j) => '<i class="' + (j === SES.i ? 'cur ' : '') + (x.out ? 'o-' + x.out : '') + '"></i>').join(''); }
function plCheck() {
  const s = SES.st[SES.i]; if (plBuildQ()) PL.ans.b = boardH(PL.st);
  const wrong = stuWrong(PL.qs, PL.ans); s.secs += (Date.now() - PL.t0) / 1000; PL.t0 = Date.now(); PL.checked = true;
  if (!wrong.length) { s.out = s.tries === 0 && !s.hint ? 'd' : 'y'; PL.over = true; PL.bad = []; PL.fb = 'ok'; }
  else { s.tries++; PL.bad = wrong; if (s.tries >= STU_MAX_TRIES) { s.out = 'x'; PL.over = true; PL.hint = true; PL.fb = 'fail'; } else PL.fb = 'retry'; }
  plPanel(); if (PL.vB) plTools();
}
function plNext() {
  if (SES.i < SES.set.ids.length - 1) { plTask(SES.i + 1); return; }
  const rs = stuResults(false); if (SES.mode === 'local' && SES.who.id) stuSaveLocal(rs);
  PL.screen = 'end'; plRender();
  if (SES.mode === 'cloud') stuCloudSend(rs);
}
function plBind() {
  const box = plQ('play');
  box.addEventListener('click', e => {
    const t = e.target.closest('[data-pl]'); if (!t) return;
    const a = t.dataset.pl, id = t.dataset.id;
    if (a === 'who') { const c = activeClass(); SES.who = { id, name: c.students.find(s => s.id === id).name, classId: c.id }; plTask(0); }
    else if (a === 'guest') { const n = (plQ('plGuest').value || '').trim(); if (!n) return; SES.who = { id: null, name: n.slice(0, 60) }; SES.mode = 'code'; plTask(0); }
    else if (a === 'inc' || a === 'dec') { const v = Math.max(0, Math.min(99, (Number(PL.ans[id]) || 0) + (a === 'inc' ? 1 : -1))); PL.ans[id] = v; plQ('pl-' + id).value = v; }
    else if (a === 'mc') { PL.ans[id] = +t.dataset.j; box.querySelectorAll('.mcopt').forEach((b, k) => b.setAttribute('aria-pressed', String(k === +t.dataset.j))); }
    else if (a === 'hint') { PL.hint = !PL.hint; if (PL.hint) SES.st[SES.i].hint = true; plPanel(); }
    else if (a === 'check') plCheck();
    else if (a === 'next') plNext();
    else if (a === 'color') { PL.color = +t.dataset.i; PL.mode = 'add'; plTools(); }
    else if (a === 'mode') { PL.mode = PL.mode === 'remove' ? 'add' : 'remove'; plTools(); }
    else if (a === 'undo') { if (PL.hist.length) { PL.st = JSON.parse(PL.hist.pop()); plSyncB(); plTools(); } }
    else if (a === 'copy') stuCopy(plQ('plCode').value, plQ('plCode'), 'plCopyMsg');
    else if (a === 'done') plClose();
    else if (a === 'resend') stuCloudSend(stuResults(false));
    else if (a === 'exit') {
      if (!PL.exitAsk && PL.screen !== 'end') { PL.exitAsk = true; t.textContent = 'Çıkılsın mı? Evet'; setTimeout(() => { PL.exitAsk = false; if (t.isConnected) t.textContent = 'Çık'; }, 3000); return; }
      if (SES.mode === 'local' && SES.who && SES.who.id && PL.screen !== 'end') { const rs = stuResults(true); if (rs.length) stuSaveLocal(rs); }
      if (SES.mode === 'cloud' && PL.screen !== 'end') { const rs = stuResults(true); if (rs.length) clSubmit(SES.code, SES.who.name, rs).catch(() => { }); }
      plClose();
    }
  });
  box.addEventListener('input', e => {
    const f = e.target.dataset && e.target.dataset.plIn;
    if (f) { PL.ans[f] = e.target.value === '' ? undefined : Number(e.target.value); return; }
    if (e.target.id === 'plLayer') { PL.layer = +e.target.value; PL.vA.st.maxLayer = PL.layer; PL.vA.draw(); plQ('plLayerVal').textContent = PL.layer + ' / ' + PL.t.maxH; }
  });
}

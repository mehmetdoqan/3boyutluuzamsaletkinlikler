'use strict';
/* Rapor sayfası: sınıf raporu ve veli raporu (yazdırılabilir). Ana betikteki DB, agg, pct, SKILLS… çağrı anında kullanılır. */
const RP = { mode: 'sinif', period: 'all', student: 'all' };
const RP_PERIODS = [['all', 'Tüm zaman'], ['30', 'Son 30 gün'], ['7', 'Son 7 gün']];
const RP_TIPS = {
  yapi: 'Evde 5–6 küple bir yapı kurup aynısını yan yana kurmasını isteyin; sonra yapıyı yandan ve üstten çizdirin.',
  dondurme: 'Küplerden bir yapı kurup çeyrek tur çevirin ve “Şimdi nasıl görünür?” diye önce tahmin ettirin, sonra çevirip kontrol ettirin.',
  katman: 'Yapıyı katman katman sökerken her katmanda kaç küp olduğunu saydırın; en yüksek kuleyi bulmasını isteyin.',
  gizli: 'Yapının arkasında veya altında kalan küpleri önce tahmin ettirin, sonra yapıyı döndürerek saydırın.',
  gorunus: 'Bir kutuya ya da bardağa önden, yandan ve üstten bakıp gördüğünü çizmesini isteyin.',
  parca: 'Aynı renkli küplerden oluşan parçaları ayırıp her parçada kaç küp olduğunu saydırın; sonra parçaları birleştirip bütünü kurdurun.'
};
const rpLevel = (p, n) => n < 2 || p == null ? { t: 'Henüz yeterli veri yok', c: 'none' } : p >= 75 ? { t: 'Güçlü', c: 'ok' } : p >= 50 ? { t: 'Gelişiyor', c: 'mid' } : { t: 'Destek gerekli', c: 'low' };
function rpCutoff() { if (RP.period === 'all') return ''; const d = new Date(); d.setDate(d.getDate() - +RP.period); return dayStr(d); }
function rpResults(cls) {
  const ids = new Set(cls.students.map(s => s.id)), cut = rpCutoff();
  return DB.results.filter(r => ids.has(r.studentId) && (!cut || r.day >= cut));
}
const rpTotal = a => Object.values(a).reduce((x, y) => ({ n: x.n + y.n, sc: x.sc + y.sc }), { n: 0, sc: 0 });
const rpDate = () => new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
const rpPeriodName = () => RP_PERIODS.find(p => p[0] === RP.period)[1];
const rpBar = (name, p, n) => '<div class="rbar"><span class="rn">' + esc(name) + '</span><div class="rtrack"><div class="rfill ' + (p == null ? '' : cellCls(p)) + '" style="width:' + (p || 0) + '%"></div></div><span class="rv">' + (p == null ? '—' : '%' + p) + '<small> · ' + n + ' görev</small></span></div>';
const rpCount = rs => { const c = { d: 0, y: 0, x: 0 }; rs.forEach(r => { c[r.outcome]++; }); return c; };

function rpControls(cls) {
  const sel = (id, opts, cur) => '<select data-rp="' + id + '">' + opts.map(o => '<option value="' + o[0] + '"' + (String(o[0]) === String(cur) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
  return '<div class="rp-ctl no-print"><div class="chips"><button class="btn" data-rp="mode" data-v="sinif" aria-pressed="' + (RP.mode === 'sinif') + '">Sınıf raporu</button><button class="btn" data-rp="mode" data-v="veli" aria-pressed="' + (RP.mode === 'veli') + '">Veli raporu</button></div>' +
    '<label>Sınıf ' + sel('class', DB.classes.map(c => [c.id, c.name + (c.demo ? ' (örnek)' : '')]), cls.id) + '</label>' +
    '<label>Dönem ' + sel('period', RP_PERIODS, RP.period) + '</label>' +
    (RP.mode === 'veli' ? '<label>Öğrenci ' + sel('student', [['all', 'Tüm öğrenciler (her biri ayrı sayfa)']].concat(cls.students.map(s => [s.id, s.name])), RP.student) + '</label>' : '') +
    '<button class="btn primary" data-rp="print">Yazdır / PDF olarak kaydet</button></div>';
}
function rpSinif(cls, rs) {
  const a = agg(rs), tot = rpTotal(a), c = rpCount(rs), per = cls.students.map(s => { const x = agg(rs.filter(r => r.studentId === s.id)); return { s, a: x, t: rpTotal(x) }; });
  const active = per.filter(p => p.t.n), quiet = per.filter(p => !p.t.n);
  const rated = SKILLS.filter(k => a[k.key].n >= 3).map(k => ({ k, p: pct(a[k.key]) })).sort((x, y) => y.p - x.p);
  const strong = rated[0], weak = rated.length > 1 ? rated[rated.length - 1] : null;
  const help = active.filter(p => pct(p.t) < 50).map(p => p.s.name);
  const lvRows = LEVELS.map(l => { const r2 = rs.filter(r => r.level === l.n), cc = rpCount(r2); return '<tr><td>Seviye ' + l.n + ' · ' + l.age + '</td><td>' + r2.length + '</td><td>' + (r2.length ? '%' + Math.round((cc.d + cc.y * 0.5) / r2.length * 100) : '—') + '</td></tr>'; }).join('');
  const rows = per.map(p => '<tr><td>' + esc(p.s.name) + '</td>' + SKILLS.map(k => { const v = pct(p.a[k.key]); return '<td><span class="cell ' + cellCls(v) + '">' + (v == null ? '—' : '%' + v) + '</span></td>'; }).join('') + '<td><b>' + (p.t.n ? '%' + pct(p.t) : '—') + '</b></td></tr>').join('');
  return '<article class="rpage"><header class="rhead"><div><div class="rbrand">Birim Küp · 3B Düşünme</div><h1>Sınıf Raporu</h1></div><div class="rmeta"><b>' + esc(cls.name) + '</b><br>' + rpPeriodName() + '<br>' + rpDate() + '</div></header>' +
    (rs.length ? '<div class="rstats"><div><b>' + cls.students.length + '</b><span>Öğrenci</span></div><div><b>' + rs.length + '</b><span>Çözülen görev</span></div><div><b>%' + pct(tot) + '</b><span>Sınıf ortalaması</span></div><div><b>' + c.d + ' / ' + c.y + ' / ' + c.x + '</b><span>Doğru / Yardımla / Yanlış</span></div></div>' +
      '<h2>Becerilere göre sınıf ortalaması</h2>' + SKILLS.map(k => rpBar(k.name, pct(a[k.key]), a[k.key].n)).join('') +
      '<div class="rnote">' + (strong ? 'En güçlü alan: <b>' + esc(strong.k.name) + '</b> (%' + strong.p + ').' : '') + (weak && weak.p < 75 ? ' Desteğe en çok ihtiyaç duyulan alan: <b>' + esc(weak.k.name) + '</b> (%' + weak.p + ').' : '') + '</div>' +
      '<div class="rcols"><div><h2>Seviyelere göre</h2><table class="rt"><thead><tr><th>Seviye</th><th>Görev</th><th>Başarı</th></tr></thead><tbody>' + lvRows + '</tbody></table></div>' +
      '<div><h2>Dikkat edilecekler</h2><ul class="rlist"><li>Destek gerektirenler (genel %50 altı): ' + (help.length ? esc(help.join(', ')) : 'yok') + '</li><li>Henüz görev çözmeyenler: ' + (quiet.length ? esc(quiet.map(p => p.s.name).join(', ')) : 'yok') + '</li></ul></div></div>' +
      '<h2>Öğrenci tablosu</h2><table class="rt rt-wide"><thead><tr><th>Öğrenci</th>' + SKILLS.map(k => '<th>' + k.short + '</th>').join('') + '<th>Genel</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="rfoot">Puanlama: Doğru 1, Yardımla yarım, Yanlış 0 puan. Başarı = alınan puan ÷ görev sayısı.</p>' : '<p class="empty">Bu dönemde bu sınıf için sonuç yok.</p>') + '</article>';
}
function rpVeli(cls, rs, stu) {
  const mine = rs.filter(r => r.studentId === stu.id), a = agg(mine), t = rpTotal(a), c = rpCount(mine);
  if (!mine.length) return '<article class="rpage"><header class="rhead"><div><div class="rbrand">Birim Küp · 3B Düşünme</div><h1>Gelişim Raporu</h1></div><div class="rmeta"><b>' + esc(stu.name) + '</b><br>' + esc(cls.name) + '<br>' + rpDate() + '</div></header><p class="empty">Bu dönemde ' + esc(stu.name) + ' için kayıtlı görev yok.</p></article>';
  const lv = SKILLS.map(k => ({ k, p: pct(a[k.key]), n: a[k.key].n })), rated = lv.filter(x => x.n >= 2).sort((x, y) => y.p - x.p);
  const strong = rated.filter(x => x.p >= 75).slice(0, 2), need = rated.slice().reverse().filter(x => x.p < 75).slice(0, 2);
  const days = [...new Set(mine.map(r => r.day))].length;
  const skillRows = lv.map(x => { const L = rpLevel(x.p, x.n); return '<div class="rrow">' + rpBar(x.k.name, x.p, x.n) + '<span class="rtag ' + L.c + '">' + L.t + '</span></div>'; }).join('');
  const tips = (need.length ? need : strong.slice(0, 1)).map(x => '<li><b>' + esc(x.k.name) + ':</b> ' + RP_TIPS[x.k.key] + '</li>').join('');
  return '<article class="rpage"><header class="rhead"><div><div class="rbrand">Birim Küp · 3B Düşünme</div><h1>Gelişim Raporu</h1></div><div class="rmeta"><b>' + esc(stu.name) + '</b><br>' + esc(cls.name) + ' · ' + rpPeriodName() + '<br>' + rpDate() + '</div></header>' +
    '<p class="rlead">Birim küplerle yapılan çalışmalarda ' + esc(stu.name) + ' toplam <b>' + mine.length + ' görev</b> çözdü (' + days + ' farklı gün). Görevlerin <b>' + c.d + '</b> tanesini yardımsız doğru, <b>' + c.y + '</b> tanesini ipucuyla, <b>' + c.x + '</b> tanesini ise henüz çözemeden tamamladı. Genel başarı: <b>%' + pct(t) + '</b>.</p>' +
    '<h2>Beceriler</h2>' + skillRows +
    '<div class="rnote">' + (strong.length ? 'Güçlü olduğu alanlar: <b>' + strong.map(x => esc(x.k.name)).join(', ') + '</b>. ' : '') + (need.length ? 'Biraz daha pratikle gelişebilecek alanlar: <b>' + need.map(x => esc(x.k.name)).join(', ') + '</b>.' : 'Tüm alanlarda iyi bir seviyede ilerliyor.') + '</div>' +
    '<h2>Evde nasıl destek olabilirsiniz?</h2><ul class="rlist">' + tips + '</ul>' +
    '<p class="rfoot">Puanlama: Doğru 1, Yardımla yarım, Yanlış 0 puan. Üç boyutlu düşünme zamanla pratikle gelişir; her çocuk kendi hızında ilerler.</p>' +
    '<div class="rsign"><span>Öğretmen</span><span>Veli</span></div></article>';
}
function pageReport() {
  const head = '<header class="page-head no-print"><h1>Rapor</h1><p>Sınıf raporunu veya öğrenci başına veli raporunu yazdırın ya da PDF olarak kaydedin.</p></header>';
  const cls = activeClass(); if (!cls) return head + '<div class="empty">Önce Sınıflar sayfasından bir sınıf ekleyin.</div>';
  if (RP.student !== 'all' && !cls.students.some(s => s.id === RP.student)) RP.student = 'all';
  const rs = rpResults(cls);
  let body;
  if (RP.mode === 'sinif') body = rpSinif(cls, rs);
  else { const list = RP.student === 'all' ? cls.students : cls.students.filter(s => s.id === RP.student); body = list.length ? list.map(s => rpVeli(cls, rs, s)).join('') : '<p class="empty">Bu sınıfta öğrenci yok.</p>'; }
  return head + rpControls(cls) + '<div class="rwrap">' + body + '</div>';
}
function rpMount() {
  const root = document.getElementById('app');
  root.addEventListener('click', e => {
    const t = e.target.closest('[data-rp]'); if (!t || t.tagName === 'SELECT') return;
    if (t.dataset.rp === 'mode') { RP.mode = t.dataset.v; render(); }
    else if (t.dataset.rp === 'print') window.print();
  });
  root.addEventListener('change', e => {
    const t = e.target; if (!t.dataset || !t.dataset.rp || t.tagName !== 'SELECT') return;
    if (t.dataset.rp === 'class') { DB.active = t.value; RP.student = 'all'; saveDB(); } else RP[t.dataset.rp] = t.value;
    render();
  });
}

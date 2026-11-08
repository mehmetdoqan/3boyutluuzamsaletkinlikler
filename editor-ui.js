'use strict';
/* Tahta sayfasının HTML parçaları (durumdan üretilir; olaylar editor-ctl.js'de) */
const ED_VIEWS = [['top', 'Üstten'], ['front', 'Önden'], ['side', 'Yandan'], ['iso', 'İzometrik']];
const ED_ROWNAMES = ['Kırmızı', 'Mavi', 'Sarı', 'Yeşil', 'Turuncu'];

function edModesHTML() {
  return [['add', '＋ Küp ekle'], ['remove', '− Küp sil']].map(m => '<button class="btn small" data-ed="mode" data-v="' + m[0] + '" aria-pressed="' + (ED.mode === m[0]) + '">' + m[1] + '</button>').join('');
}
function edColorsHTML() {
  const cnt = edCounts();
  return COLORS.map((c, i) => '<button class="ed-color" data-ed="color" data-i="' + i + '" aria-pressed="' + (ED.color === i) + '"><span class="sw" style="background:' + c + '"></span><span class="nm">' + CTITLES[i] + '</span><span class="ct">' + (ED_PER - cnt[i]) + ' / ' + ED_PER + '</span></button>').join('');
}
function edMiniHTML() {
  const cnt = edCounts();
  return COLORS.map((c, i) => '<button class="ed-mini-c" data-ed="color" data-i="' + i + '" aria-pressed="' + (ED.color === i) + '" aria-label="' + CTITLES[i] + '" style="background:' + c + '">' + (ED_PER - cnt[i]) + '</button>').join('') +
    '<button class="btn small" data-ed="mode" data-v="' + (ED.mode === 'add' ? 'remove' : 'add') + '">' + (ED.mode === 'add' ? 'Silme modu' : 'Ekleme modu') + '</button><button class="btn small" data-ed="undo">Geri al</button>';
}
function edViewsHTML() {
  return ED_VIEWS.map(v => '<button class="btn small" data-ed="view" data-v="' + v[0] + '" aria-pressed="' + (ED.view === v[0]) + '">' + v[1] + '</button>').join('');
}
function edStatsHTML() {
  const s = edStats(), sel = ED.st[ED.sel.x][ED.sel.z], name = COL_LABELS[ED.sel.x] + rowLabel(ED.sel.z);
  const row = (a, b) => '<div class="ed-stat"><span>' + a + '</span><b>' + b + '</b></div>';
  return '<h2>Tahta bilgileri</h2>' + row('Kullanılan küp', s.used) + row('Boşta küp', 25 - s.used) + row('Dolu hücre', s.occ + ' / 25') + row('En yüksek kule', s.maxH + ' / ' + ED_MAXH) +
    '<div class="ed-lbl">Seçili hücre</div>' + row('Koordinat', name) + row('Küp yüksekliği', sel.length + ' küp') + row('Üstteki renk', sel.length ? CTITLES[sel[sel.length - 1]] : '—') +
    '<div class="ed-lbl">Satır renkleri</div><div class="ed-rows">' + ROW_COLORS.map((c, i) => '<span style="background:' + c + '">' + (5 - i) + ' · ' + ED_ROWNAMES[i] + '</span>').join('') + '</div>';
}
function edWorksHTML() {
  const list = DB.works.map(w => '<li><span class="nm" title="' + esc(w.name) + '">' + esc(w.name) + '</span><button class="btn small" data-ed="workload" data-id="' + w.id + '">Aç</button><button class="btn small danger" data-ed="workdel" data-id="' + w.id + '">Sil</button></li>').join('');
  return '<h2>Kayıtlı çalışmalar</h2><form class="inline-form" data-edform="work"><input type="text" id="edWorkName" placeholder="Çalışma adı" aria-label="Çalışma adı" maxlength="50" value="' + esc(ED.workName) + '"><button class="btn primary small" type="submit">Kaydet</button></form>' +
    '<ul class="ed-works">' + (list || '<li class="note">Henüz kayıtlı çalışma yok.</li>') + '</ul>';
}
function edTaskHTML() {
  const T = ED.task;
  if (!T) return '<div class="ed-task-empty"><div><h2>Görev</h2><p class="note">Şu an serbest çalışıyorsunuz. Dilediğiniz anda bir görev seçebilir veya kurduğunuz yapıyı görev olarak kaydedebilirsiniz.</p></div><div class="chips"><button class="btn primary" data-ed="pick">Görevlerden seç</button><button class="btn" data-ed="newtask">Bu tahtayı görev yap</button></div></div>';
  const o = (v, l, cur) => '<option value="' + v + '"' + (String(cur) === String(v) ? ' selected' : '') + '>' + l + '</option>';
  const pill = T.builtin ? (T.edited ? 'Düzenlendi' : 'Hazır görev') : (T.id ? 'Özel görev' : 'Yeni görev');
  const extra = T.skill === 'dondurme' ? '<label>Döndürme<select data-f="k">' + [1, 2, 3].map(k => o(k, k * 90 + '° (' + k + ' çeyrek tur)', T.k)).join('') + '</select></label>'
    : T.skill === 'gorunus' ? '<label>Görev türü<select data-f="variant">' + o('cizim', 'Görünüşleri çiz', T.variant) + o('kur', 'Görünüşten yapıyı kur', T.variant) + '</select></label>' : '';
  const sec = T.id ? (T.builtin && T.edited ? '<button class="btn danger" data-ed="revert">Özgün haline dön</button>' : !T.builtin ? '<button class="btn danger" data-ed="revert">' + (ED.confirmDel ? 'Silinsin mi? Onayla' : 'Görevi sil') + '</button>' : '') : '';
  return '<div class="ed-task-head"><h2>Görevi düzenle</h2><span class="pill demo">' + pill + '</span></div>' +
    '<div class="ed-fields"><label>Başlık<input type="text" data-f="title" maxlength="80" placeholder="' + esc(SKILL_BY[T.skill].name) + '" value="' + esc(T.title) + '"></label>' +
    '<label>Beceri<select data-f="skill">' + SKILLS.map(s => o(s.key, s.name, T.skill)).join('') + '</select></label>' +
    '<label>Seviye<select data-f="level">' + LEVELS.map(l => o(l.n, l.n + ' · ' + l.age, T.level)).join('') + '</select></label>' + extra + '</div>' +
    '<label class="ed-wide">Öğrenciye gösterilen yönerge<textarea data-f="prompt" rows="2">' + esc(T.prompt) + '</textarea></label>' +
    '<label class="ed-wide">İpucu<input type="text" data-f="hint" maxlength="200" value="' + esc(T.hint) + '"></label>' +
    '<div class="answer ed-prev" id="edPrev"></div>' +
    '<div class="chips"><button class="btn primary" data-ed="savetask">' + (T.id ? 'Görevi kaydet' : 'Görev olarak kaydet') + '</button>' +
    (T.id ? '<button class="btn" data-ed="savenew">Yeni görev olarak kaydet</button><button class="btn" data-ed="present">Sun</button>' : '') + sec +
    '<button class="btn" data-ed="closetask">Düzenlemeyi kapat</button></div>';
}
function edPickerHTML() {
  const ids = edPickIds();
  const sk = [{ key: 'all', name: 'Tümü' }].concat(SKILLS).map(s => '<button class="chip" data-ed="pskill" data-v="' + s.key + '" aria-pressed="' + (ED.pickSkill === s.key) + '">' + esc(s.key === 'all' ? s.name : s.short) + '</button>').join('');
  const lv = [{ n: 0, t: 'Tümü' }].concat(LEVELS.map(l => ({ n: l.n, t: l.n + ' · ' + l.age }))).map(l => '<button class="chip" data-ed="plevel" data-v="' + l.n + '" aria-pressed="' + (ED.pickLevel === l.n) + '">' + l.t + '</button>').join('');
  const cards = ids.map(id => {
    const t = getTask(id), cd = DB.tasks[id];
    return '<article class="task" data-ed="take" data-id="' + id + '" tabindex="0"><div class="thumb"><canvas data-pthumb="' + id + '"></canvas></div><div class="meta"><div class="t-skill">' + esc(taskLabel(id)) + '</div><div class="t-sub"><span class="pill l' + t.level + '">Seviye ' + t.level + '</span><span>' + t.T + ' küp</span>' + (cd ? '<span class="pill demo">Özel</span>' : '') + '</div></div></article>';
  }).join('');
  return '<div class="picker-box" role="dialog" aria-modal="true" aria-label="Görevlerden seç"><div class="picker-head"><h2>Görevlerden seç</h2><button class="btn small" data-ed="pclose">Kapat</button></div>' +
    '<p class="note">Seçtiğiniz görev tahtaya yüklenir. Dilerseniz üzerinde değişiklik yapabilirsiniz; önceki tahtanıza Geri al ile dönebilirsiniz.</p>' +
    '<div class="filters"><div class="row"><span class="lbl">Beceri</span><div class="chips">' + sk + '</div></div><div class="row"><span class="lbl">Seviye</span><div class="chips">' + lv + '</div></div></div>' +
    '<div class="grid">' + cards + '</div></div>';
}
function edPickIds() {
  const o = { s: UI.skill, l: UI.level }; UI.skill = ED.pickSkill; UI.level = ED.pickLevel;
  const ids = taskIds(); UI.skill = o.s; UI.level = o.l; return ids;
}
function edPage() {
  if (!ED.st) ED.st = edBlank();
  return '<div class="ed" id="ed">' +
    '<aside class="panel ed-left"><h2>Çalışma araçları</h2><div class="ed-lbl">İşlem modu</div><div class="chips" id="edModes">' + edModesHTML() + '</div>' +
    '<div class="ed-lbl">Küp rengi</div><div class="ed-colors" id="edColors">' + edColorsHTML() + '</div>' +
    '<p class="note">Rengi seçin, hücreye dokunarak küp ekleyin. Aynı hücreye tekrar dokunarak üst üste dizin. <b>Ctrl + tıklama</b> üstteki küpü siler.</p>' +
    '<div class="ed-lbl">Görünüş</div><div class="chips" id="edViews">' + edViewsHTML() + '</div>' +
    '<div class="ed-lbl">Düzen</div><div class="chips"><button class="btn small" data-ed="undo">Geri al</button><button class="btn small danger" data-ed="clear" id="edClear">Tahtayı temizle</button></div></aside>' +
    '<section class="ed-center"><div class="ed-head"><div><h1 id="edTitle"></h1><p class="muted">5 × 5 hücre · 25 birim küp · en fazla 5 kat</p></div><div class="chips"><button class="btn primary" data-ed="pick">Görevlerden seç</button><button class="btn" data-ed="full">Tam ekran</button></div></div>' +
    '<div class="ed-view" id="edView"><canvas id="edCv" aria-label="3B çalışma tahtası"></canvas><div class="ed-prompt" id="edPrompt"></div><div class="ed-chip" id="edChip"></div>' +
    '<div class="ed-zoom"><button class="btn small" data-ed="zoom" data-d="1" aria-label="Yakınlaştır">+</button><button class="btn small" data-ed="zoom" data-d="-1" aria-label="Uzaklaştır">−</button><button class="btn small" data-ed="view" data-v="iso" aria-label="İzometrik görünüm">⌂</button></div>' +
    '<div class="ed-mini" id="edMini">' + edMiniHTML() + '</div><div class="ed-toast" id="edToast" role="status"></div></div>' +
    '<div class="ed-bar"><span>Sürükle: döndür · Tekerlek: yakınlaştır · Hücre: işlem uygula</span><span>Seçili hücre: <b id="edSel"></b></span></div>' +
    '<section class="panel ed-task" id="edTask">' + edTaskHTML() + '</section></section>' +
    '<aside class="panel ed-right"><div id="edStats">' + edStatsHTML() + '</div><div class="ed-split" id="edWorks">' + edWorksHTML() + '</div></aside>' +
    '<div class="picker" id="edPicker" hidden></div></div>';
}

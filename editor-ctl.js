'use strict';
/* Tahta sayfası: bağlama, olaylar, klavye */
const edQ = id => document.getElementById(id);
const edCams = () => ({ top: { a: 0, e: Math.PI / 2 }, front: { a: 0, e: 0 }, side: { a: -Math.PI / 2, e: 0 }, iso: { a: DEF_CAM.a, e: DEF_CAM.e } });

function edMount() {
  const root = edQ('ed'); if (!root) return;
  const v = ED.viewer = new Viewer(edQ('edCv'), true);
  v.pickable = true; v.onPick = edPick; v.cam.zoom = 1.15; ED.view = 'iso';
  root.addEventListener('click', edClick);
  root.addEventListener('input', edInput); root.addEventListener('change', edInput);
  root.addEventListener('submit', edSubmit);
  root.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-ed="take"]')) { e.preventDefault(); e.target.click(); } });
  edQ('edView').addEventListener('fullscreenchange', () => setTimeout(() => ED.viewer && ED.viewer.resize(), 60));
  edKeysOnce(); edRenderTask(); edRefresh();
}
function edLeave() { if (ED.viewer) { ED.viewer.destroy(); ED.viewer = null; } ED.pickerOpen = false; }
function edRedraw() { if (ED.viewer && UI.page === 'tahta') { ED.viewer.draw(); if (ED.pickerOpen) edPickerThumbs(); } }

function edRenderTask() { const t = edQ('edTask'); if (t) { t.innerHTML = edTaskHTML(); edPrevUpdate(); } }
function edPrevUpdate() { const p = edQ('edPrev'); if (p) p.innerHTML = 'Cevap önizleme: ' + (edPreview() || 'Önce tahtaya küp ekleyin.'); }
function edRefresh() {
  if (!edQ('ed')) return;
  edQ('edModes').innerHTML = edModesHTML(); edQ('edColors').innerHTML = edColorsHTML(); edQ('edViews').innerHTML = edViewsHTML();
  edQ('edMini').innerHTML = edMiniHTML(); edQ('edStats').innerHTML = edStatsHTML();
  edQ('edTitle').textContent = ED.task ? (ED.task.title || SKILL_BY[ED.task.skill].name) : 'Serbest tahta';
  edQ('edChip').textContent = ED.mode === 'add' ? 'KÜP EKLEME · ' + CTITLES[ED.color].toUpperCase() : 'KÜP SİLME';
  edQ('edSel').textContent = COL_LABELS[ED.sel.x] + rowLabel(ED.sel.z);
  edQ('edPrompt').textContent = ED.task ? ED.task.prompt : '';
  edPrevUpdate(); edSync();
}
function edRenderWorks() { const w = edQ('edWorks'); if (w) w.innerHTML = edWorksHTML(); }
function edSync() {
  const v = ED.viewer; if (!v) return;
  v.st.cubes = edCubes(); v.st.sel = ED.sel; v.st.yaw = 0; v.st.explode = 0; v.draw();
}
function edToast(msg) {
  const el = edQ('edToast'); if (!el) return;
  el.textContent = msg; el.classList.add('show'); clearTimeout(ED.msgTimer);
  ED.msgTimer = setTimeout(() => el.classList.remove('show'), 2400);
}
function edPick(h, e) {
  if (!h) return;
  ED.sel = { x: h.x, z: h.z };
  const del = ED.mode === 'remove' || e.ctrlKey || e.metaKey;
  const r = del ? edRemove(h.x, h.z) : edAdd(h.x, h.z, ED.color);
  if (!r.ok) edToast(r.msg);
  edRefresh();
}
function edPickerThumbs() {
  requestAnimationFrame(() => document.querySelectorAll('canvas[data-pthumb]').forEach(cv => { try { drawThumb(cv, getTask(cv.dataset.pthumb)); } catch (e) { } }));
}
function edPickerOpen(on) {
  const p = edQ('edPicker'); if (!p) return;
  ED.pickerOpen = on; p.hidden = !on;
  if (on) { p.innerHTML = edPickerHTML(); edPickerThumbs(); const b = p.querySelector('[data-ed="pclose"]'); if (b) b.focus(); }
}
function edApplyField(f, val) {
  const T = ED.task, auto = () => { const t = taskFromDef(edDefFromState()); return [promptOf(t), hintOf(t)]; };
  const before = auto();
  T[f] = (f === 'level' || f === 'k') ? +val : val;
  if (f === 'skill' || f === 'level' || f === 'k' || f === 'variant') {
    const after = auto();
    if (T.prompt === before[0]) T.prompt = after[0];
    if (T.hint === before[1]) T.hint = after[1];
    return true;
  }
  return false;
}
function edInput(e) {
  const t = e.target;
  if (t.id === 'edWorkName') { ED.workName = t.value; return; }
  const f = t.dataset && t.dataset.f; if (!f || !ED.task) return;
  const isSel = t.tagName === 'SELECT';
  if ((e.type === 'input') === isSel) return;
  if (edApplyField(f, t.value)) { edRenderTask(); edRefresh(); }
  else { edQ('edTitle').textContent = ED.task.title || SKILL_BY[ED.task.skill].name; edQ('edPrompt').textContent = ED.task.prompt; }
}
function edSubmit(e) {
  if (!e.target.matches('[data-edform="work"]')) return;
  e.preventDefault();
  const r = edWorkSave(ED.workName); edToast(r.msg);
  if (r.ok) { ED.workName = ''; edRenderWorks(); }
}
function edClick(e) {
  const t = e.target.closest('[data-ed]'); if (!t) return;
  const a = t.dataset.ed, v = t.dataset.v;
  if (a === 'mode') { ED.mode = v; edRefresh(); }
  else if (a === 'color') { ED.color = +t.dataset.i; ED.mode = 'add'; edRefresh(); }
  else if (a === 'view') { ED.view = v; ED.viewer.goCam(Object.assign({}, edCams()[v], v === 'iso' ? { zoom: 1.15 } : {}), 400); edQ('edViews').innerHTML = edViewsHTML(); }
  else if (a === 'zoom') { const c = ED.viewer.cam; c.zoom = Math.max(0.5, Math.min(2.6, c.zoom * (+t.dataset.d > 0 ? 1.15 : 0.87))); ED.viewer.draw(); }
  else if (a === 'undo') { if (edUndo()) edRefresh(); else edToast('Geri alınacak işlem yok.'); }
  else if (a === 'clear') {
    if (!ED.confirmClear) { ED.confirmClear = true; t.textContent = 'Emin misiniz?'; setTimeout(() => { ED.confirmClear = false; t.textContent = 'Tahtayı temizle'; }, 3000); }
    else { ED.confirmClear = false; t.textContent = 'Tahtayı temizle'; edClear(); edRefresh(); edToast('Tahta temizlendi. Geri al ile dönebilirsiniz.'); }
  }
  else if (a === 'full') { const el = edQ('edView'); if (document.fullscreenElement) document.exitFullscreen().catch(() => { }); else if (el.requestFullscreen) el.requestFullscreen().catch(() => edToast('Tam ekran bu ortamda açılamadı.')); }
  else if (a === 'pick') edPickerOpen(true);
  else if (a === 'pclose') edPickerOpen(false);
  else if (a === 'pskill') { ED.pickSkill = v; edPickerOpen(true); }
  else if (a === 'plevel') { ED.pickLevel = +v; edPickerOpen(true); }
  else if (a === 'take') { edOpenTask(t.dataset.id); edPickerOpen(false); edRenderTask(); edRefresh(); edToast('Görev tahtaya yüklendi. Geri al ile önceki tahtanıza dönebilirsiniz.'); }
  else if (a === 'newtask') { edNewTask(); edRenderTask(); edRefresh(); }
  else if (a === 'closetask') { ED.task = null; ED.confirmDel = false; edRenderTask(); edRefresh(); }
  else if (a === 'savetask' || a === 'savenew') { const r = edSaveTask(a === 'savenew'); edToast(r.msg); if (r.ok) { edRenderTask(); edRefresh(); } }
  else if (a === 'present') {
    const id = ED.task.id;
    if (JSON.stringify(edFromCubes(getTask(id).cubes)) !== JSON.stringify(ED.st)) edToast('Kaydedilmemiş değişiklikler var; kayıtlı hali sunuluyor.');
    openPres([id], 0, t);
  }
  else if (a === 'revert') {
    if (!ED.task.builtin && !ED.confirmDel) { ED.confirmDel = true; edRenderTask(); return; }
    ED.confirmDel = false; const r = edRevertTask(); edToast(r.msg || ''); edRenderTask(); edRefresh();
  }
  else if (a === 'workload') { if (edWorkLoad(t.dataset.id)) { edRenderTask(); edRefresh(); edToast('Çalışma açıldı.'); } }
  else if (a === 'workdel') { edWorkDelete(t.dataset.id); edRenderWorks(); }
}
function edKeysOnce() {
  if (edKeysOnce.done) return; edKeysOnce.done = true;
  document.addEventListener('keydown', e => {
    if (UI.page !== 'tahta' || !ED.viewer || !edQ('pres').hidden) return;
    if (e.key === 'Escape' && ED.pickerOpen) { edPickerOpen(false); return; }
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea' || ED.pickerOpen) return;
    const s = ED.sel;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (edUndo()) edRefresh(); return; }
    if (e.key >= '1' && e.key <= '5') { ED.color = +e.key - 1; ED.mode = 'add'; edRefresh(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      ED.sel = { x: Math.max(0, Math.min(4, s.x + (e.key === 'ArrowRight') - (e.key === 'ArrowLeft'))), z: Math.max(0, Math.min(4, s.z + (e.key === 'ArrowDown') - (e.key === 'ArrowUp'))) };
      edRefresh();
    }
    else if (e.key === 'Enter' && tag !== 'button') { const r = edAdd(s.x, s.z, ED.color); if (!r.ok) edToast(r.msg); edRefresh(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { const r = edRemove(s.x, s.z); if (!r.ok) edToast(r.msg); edRefresh(); }
  });
}

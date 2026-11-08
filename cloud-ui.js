'use strict';
/* Hesap sayfası, bulut etkinlik kodu ve öğrencinin doğrudan gönderimi */
const CLU = { email: '', pw: '', msg: '', ok: true, busy: false, code: '', codeMsg: '' };

function hesapPage() {
  const head = '<header class="page-head"><h1>Hesap ve bulut</h1><p>Verileriniz bulutta (Supabase) saklanır; her cihazdan giriş yaparak aynı sınıflara ve görevlere ulaşırsınız.</p></header>';
  if (!CL.on) return head + '<section class="panel"><h2>Bulut kapalı</h2><p class="note">Bu kurulumda veritabanı bağlı değil; veriler yalnızca bu tarayıcıda saklanır. Bağlamak için <b>config.js</b> dosyasına Supabase adresini ve anon anahtarını yazın (README, adım 3).</p></section>';
  const msg = CLU.msg ? '<p class="note" style="margin-top:10px;color:var(--' + (CLU.ok ? 'ok' : 'bad') + ')">' + esc(CLU.msg) + '</p>' : '';
  if (clAuthed()) {
    return head + '<section class="panel"><h2>Giriş yapıldı</h2><p><b>' + esc(CL.sess.email) + '</b></p><p class="note" id="clState">Durum: ' + esc(CL.status || '—') + '</p>' +
      '<div class="chips" style="margin-top:12px"><button class="btn" data-cl="sync">Şimdi eşitle</button><button class="btn danger" data-cl="logout">Çıkış yap</button></div>' + msg + '</section>';
  }
  return head + '<section class="panel" style="max-width:460px"><h2>Öğretmen girişi</h2><form data-clform="login" class="entry-form">' +
    '<label class="entry-l">E-posta<input type="email" data-cl-in="email" autocomplete="username" required value="' + esc(CLU.email) + '"></label>' +
    '<label class="entry-l">Şifre<input type="password" data-cl-in="pw" autocomplete="current-password" minlength="6" required value="' + esc(CLU.pw) + '"></label>' +
    '<div class="chips" style="margin-top:12px"><button class="btn primary" type="submit"' + (CLU.busy ? ' disabled' : '') + '>Giriş yap</button><button class="btn" type="button" data-cl="signup"' + (CLU.busy ? ' disabled' : '') + '>Hesap oluştur</button></div></form>' + msg +
    '<p class="note" style="margin-top:12px">Giriş yapmadan da kullanabilirsiniz; veriler o zaman yalnızca bu tarayıcıda kalır.</p></section>';
}
function clChipUpdate() {
  const a = document.getElementById('clChip'); if (!a) return;
  a.textContent = !CL.on ? 'Hesap' : clAuthed() ? (CL.ok ? '☁ ' + (CL.status || 'Bağlı') : '⚠ ' + CL.status) : 'Giriş';
  a.title = CL.sess ? CL.sess.email : '';
  const s = document.getElementById('clState'); if (s) s.textContent = 'Durum: ' + (CL.status || '—');
}
CL.listeners.push(clChipUpdate);

async function clDoAuth(signup) {
  if (CLU.busy) return; CLU.busy = true; CLU.msg = ''; render();
  try {
    if (signup) {
      const ok = await clSignup(CLU.email.trim(), CLU.pw);
      if (!ok) { CLU.msg = 'Hesap oluşturuldu. E-postanıza gelen doğrulama bağlantısına tıklayın, sonra giriş yapın.'; CLU.ok = true; CLU.busy = false; render(); return; }
    } else await clLogin(CLU.email.trim(), CLU.pw);
    CLU.pw = '';
    const r = await clSync();
    if (r.empty) await clUploadLocal();
    CLU.msg = r.empty ? 'Giriş yapıldı; bu tarayıcıdaki veriler buluta aktarıldı.' : 'Giriş yapıldı; bulutaki verileriniz yüklendi.'; CLU.ok = true;
  } catch (e) { CLU.msg = /Invalid login/i.test(e.message) ? 'E-posta veya şifre hatalı.' : e.message; CLU.ok = false; clLogout(); }
  CLU.busy = false; clChipUpdate(); render();
}
function clMount() {
  const root = document.getElementById('app');
  root.addEventListener('submit', e => { if (e.target.matches('[data-clform="login"]')) { e.preventDefault(); clDoAuth(false); } });
  root.addEventListener('input', e => { const f = e.target.dataset && e.target.dataset.clIn; if (f) CLU[f] = e.target.value; });
  root.addEventListener('click', async e => {
    const t = e.target.closest('[data-cl]'); if (!t) return; const a = t.dataset.cl;
    if (a === 'signup') clDoAuth(true);
    else if (a === 'logout') { clLogout(); CLU.msg = 'Çıkış yapıldı.'; CLU.ok = true; clChipUpdate(); render(); }
    else if (a === 'sync') { try { await clFlush(); await clSync(); CLU.msg = 'Eşitlendi.'; CLU.ok = true; } catch (er) { CLU.msg = er.message; CLU.ok = false; } render(); }
    else if (a === 'mkcloud') {
      const c = activeClass(); if (!c) return;
      const set = stuMakeSet(STU.skill, STU.level, STU.count, STU.title);
      if (!set.ids.length) { STU.msg = 'Bu seçimde görev yok.'; STU.ok = false; render(); return; }
      t.disabled = true; t.textContent = 'Oluşturuluyor…';
      try { CLU.code = await clMakeActivity(c.id, set); CLU.codeMsg = ''; } catch (er) { CLU.code = ''; STU.msg = 'Kod oluşturulamadı: ' + er.message; STU.ok = false; }
      render();
    }
    else if (a === 'copycloud') stuCopy(CLU.code, null, 'clCopyMsg');
    else if (a === 'closecloud') { try { await clCloseActivity(CLU.code); CLU.codeMsg = 'Etkinlik kapatıldı; yeni gönderim alınmaz.'; } catch (er) { CLU.codeMsg = er.message; } render(); }
  });
}
function clTeacherBox() {
  if (!CL.on) return '';
  if (!clAuthed()) return '<p class="note" style="margin-top:14px">Sonuçların otomatik gelmesi için <a href="#hesap">giriş yapın</a>; 6 haneli kısa kod oluşturabilirsiniz.</p>';
  return '<div class="chips" style="margin-top:10px"><button class="btn primary" data-cl="mkcloud">Kısa kod oluştur (sonuçlar otomatik gelir)</button></div>' +
    (CLU.code ? '<div style="margin-top:12px"><p class="note">Öğrenciler <b>Öğrenci girişi</b> sayfasında bu kodu ve adlarını yazar. Sonuçlar bittiğinde otomatik Gelişim sayfanıza düşer.</p><div class="bigcode">' + esc(CLU.code) + '</div><div class="chips" style="margin-top:8px"><button class="btn small" data-cl="copycloud">Kopyala</button><button class="btn small danger" data-cl="closecloud">Etkinliği kapat</button><span class="note" id="clCopyMsg">' + esc(CLU.codeMsg) + '</span></div></div>' : '');
}

/* ----- Öğrenci tarafı ----- */
async function stuStartCloud() {
  const code = STU.codeIn.trim().toUpperCase(), name = STU.nameIn.trim();
  if (!name) { STU.msg = 'Önce adını yaz.'; render(); return; }
  STU.msg = 'Etkinlik aranıyor…'; render();
  try {
    const d = await clGetActivity(code), set = d && d.set;
    if (!stuSetValid(set)) { STU.msg = 'Bu kodla açık bir etkinlik bulunamadı. Kodu kontrol et.'; render(); return; }
    if (set.defs) Object.keys(set.defs).forEach(id => { if (!stuDefOk(set.defs[id])) delete set.defs[id]; });
    STU.msg = ''; SES.code = code; plOpen('cloud', set, { name: name.slice(0, 60) });
  } catch (e) { STU.msg = 'Bağlanılamadı: ' + e.message; render(); }
}
async function stuCloudSend(rs) {
  SES.sent = 'wait'; stuSendShow();
  try { await clSubmit(SES.code, SES.who.name, rs); SES.sent = 'ok'; }
  catch (e) { SES.sent = 'err'; SES.sentErr = e.message; }
  stuSendShow();
}
function stuSendHTML() {
  if (SES.sent === 'ok') return '<p class="note" style="color:var(--ok)">Sonuçların öğretmenine gönderildi.</p>';
  if (SES.sent === 'err') return '<p class="note" style="color:var(--bad)">Gönderilemedi (' + esc(SES.sentErr || '') + '). İnternetini kontrol edip tekrar dene.</p><div class="chips"><button class="btn primary" data-pl="resend">Tekrar gönder</button></div>';
  return '<p class="note">Sonuçların gönderiliyor…</p>';
}
function stuSendShow() { const el = document.getElementById('plSend'); if (el) el.innerHTML = stuSendHTML(); }

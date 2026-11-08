# Birim Küp · Öğretmen Paneli

3B uzamsal algı eğitimi için web uygulaması. GitHub Pages'te çalışır, verileri Supabase'te saklar.

## Kurulum (yaklaşık 10 dakika)

1. **Depo:** Bu klasörün içindekileri boş GitHub deponuza yükleyin (`main` dalı).
2. **Supabase:** supabase.com'da ücretsiz proje açın → **SQL Editor** → `supabase/schema.sql` içeriğini yapıştırıp **Run**.
   Ardından **Authentication → Providers → Email**: okul kullanımında "Confirm email" kapalıysa kayıt hemen çalışır; açıksa gelen e-postadaki bağlantı gerekir.
3. **Bağlantı:** Supabase → **Project Settings → API**: `Project URL` ve `anon public` anahtarını `config.js` dosyasına yazın. (`service_role` anahtarını asla yazmayın.)
4. **Yayın:** Depoda **Settings → Pages → Source: GitHub Actions** seçin. `main`'e her gönderimde site otomatik yayınlanır: `https://KULLANICI.github.io/DEPO/`.
5. **Supabase → Authentication → URL Configuration:** Site URL olarak yukarıdaki adresi girin.

## Kullanım
- **Hesap** sekmesinden öğretmen hesabı açıp giriş yapın. İlk girişte bu tarayıcıdaki veriler buluta taşınır; sonra her cihazda aynı veriler görünür.
- **Öğrenci → Kısa kod oluştur:** 6 haneli kodu öğrencilere verin. Öğrenci **Öğrenci girişi**'ne kodu ve adını yazar; sonuçlar bitince otomatik Gelişim sayfasına düşer.
- Giriş yapılmazsa veya `config.js` boşsa uygulama eskisi gibi yalnızca tarayıcıda çalışır (BK1/BS1 kod yöntemi de geçerlidir).

## Güvenlik
- Her öğretmen yalnızca kendi satırlarını görür (Row Level Security).
- Öğrenciler tablolara erişemez; yalnızca `get_activity` ve `submit_activity` işlevlerini çağırır, bunlar kodu bilen öğrenciye etkinliği verir ve sonuç ekler.
- Öğrenci adı olarak ad ve soyadın ilk harfini kullanmanız önerilir (kişisel veri azaltma).

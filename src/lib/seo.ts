// Search + AI copy for Orbi Transfer, one entry per language. Every word here is shown on the page
// (no hidden keyword text): the title/description go to search engines, the rest renders as a short
// guide + FAQ under the void, and the FAQ is also published as FAQPage structured data.

export const SITE = "https://orbitransfer.com";
export const NAME = "Orbi Transfer";

export interface Faq { q: string; a: string }
export interface SeoCopy {
  lang: string;
  label: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  points: string[];
  faq: Faq[];
  keywords: string[];
}

export const SEO: Record<string, SeoCopy> = {
  en: {
    lang: "en", label: "English",
    title: "Orbi Transfer — Free Instant File Transfer, No Login Required, Encrypted",
    description: "Send files, folders, photos, videos and links instantly between any two devices. Free, no login required, no signup, up to 20 GB, end-to-end encrypted, auto-deleted after 5–30 minutes.",
    h1: "Free online file transfer. No login required. Instant.",
    intro: "Orbi Transfer moves files between your phone, laptop and any browser in seconds. Drop a file, it floats in the void, open it on the other device and it lands. No account, no app, no email.",
    points: [
      "No login required, no signup, completely free",
      "Files, whole folders, photos, videos, text and links, up to 20 GB",
      "End-to-end encrypted in your browser (AES-256-GCM); optional passcode",
      "Burns automatically after 5 to 30 minutes or N downloads",
    ],
    faq: [
      { q: "How do I send a file without logging in?", a: "Open orbitransfer.com, tap Send, pick a file or folder and press Launch. It appears instantly on every device that has the page open. Tap it there to download. No account is ever needed." },
      { q: "Is Orbi Transfer free?", a: "Yes. Orbi Transfer is completely free to use, with no signup, no ads in the transfer and no paid tier needed to send or receive." },
      { q: "How large a file can I send?", a: "Up to 20 GB per object, including whole folders and many files at once. Uploads run in parallel parts, so large files move fast." },
      { q: "Is it secure and private?", a: "Files are encrypted in your browser before upload with AES-256-GCM. With a passcode only people who know it can open them, and everything is deleted after the lifetime you choose." },
      { q: "How do I move files from phone to laptop (or PC to phone)?", a: "Open orbitransfer.com on both devices, send from one, tap the object on the other. It works across iPhone, Android, Windows, Mac and Linux in any modern browser." },
    ],
    keywords: ["free file transfer", "no login file transfer", "send large files free", "instant file transfer", "quick file transfer", "share files online", "transfer files phone to pc", "send files without account", "encrypted file sharing", "wetransfer alternative", "airdrop alternative", "send folder online"],
  },
  es: {
    lang: "es", label: "Español",
    title: "Orbi Transfer — Transferir archivos gratis, sin registro, al instante",
    description: "Envía archivos, carpetas, fotos, vídeos y enlaces al instante entre dos dispositivos. Gratis, sin registro ni cuenta, hasta 20 GB, cifrado de extremo a extremo, se borra en 5–30 minutos.",
    h1: "Transferencia de archivos gratis. Sin registro. Al instante.",
    intro: "Orbi Transfer mueve archivos entre tu móvil, tu portátil y cualquier navegador en segundos. Suelta un archivo, aparece en el otro dispositivo y lo descargas. Sin cuenta, sin app, sin correo.",
    points: ["Sin registro ni cuenta, totalmente gratis", "Archivos, carpetas, fotos, vídeos, texto y enlaces, hasta 20 GB", "Cifrado de extremo a extremo en tu navegador; contraseña opcional", "Se borra solo tras 5 a 30 minutos"],
    faq: [
      { q: "¿Cómo envío un archivo sin registrarme?", a: "Abre orbitransfer.com, pulsa Send, elige un archivo o carpeta y pulsa Launch. Aparece al instante en el otro dispositivo; tócalo para descargarlo." },
      { q: "¿Es gratis?", a: "Sí, Orbi Transfer es totalmente gratis y no necesita cuenta." },
      { q: "¿Qué tamaño puedo enviar?", a: "Hasta 20 GB por envío, incluidas carpetas completas y varios archivos a la vez." },
      { q: "¿Es seguro?", a: "Los archivos se cifran en tu navegador con AES-256-GCM antes de subirse y se eliminan automáticamente." },
    ],
    keywords: ["transferir archivos gratis", "enviar archivos sin registro", "enviar archivos grandes gratis", "compartir archivos online", "pasar archivos del móvil al pc"],
  },
  pt: {
    lang: "pt", label: "Português",
    title: "Orbi Transfer — Transferência de arquivos grátis, sem login, instantânea",
    description: "Envie arquivos, pastas, fotos, vídeos e links na hora entre dois dispositivos. Grátis, sem login nem cadastro, até 20 GB, criptografia de ponta a ponta, apagado em 5–30 minutos.",
    h1: "Transferência de arquivos grátis. Sem login. Na hora.",
    intro: "O Orbi Transfer leva arquivos entre celular, notebook e qualquer navegador em segundos. Solte um arquivo, ele aparece no outro aparelho e você baixa. Sem conta, sem app, sem e-mail.",
    points: ["Sem login nem cadastro, totalmente grátis", "Arquivos, pastas, fotos, vídeos, texto e links, até 20 GB", "Criptografia de ponta a ponta no navegador; senha opcional", "Apagado automaticamente após 5 a 30 minutos"],
    faq: [
      { q: "Como envio um arquivo sem fazer login?", a: "Abra orbitransfer.com, toque em Send, escolha um arquivo ou pasta e toque em Launch. Ele aparece na hora no outro aparelho; toque para baixar." },
      { q: "É grátis?", a: "Sim, o Orbi Transfer é totalmente grátis e não precisa de conta." },
      { q: "Qual o tamanho máximo?", a: "Até 20 GB por envio, incluindo pastas inteiras e vários arquivos de uma vez." },
      { q: "É seguro?", a: "Os arquivos são criptografados no navegador com AES-256-GCM antes do envio e apagados automaticamente." },
    ],
    keywords: ["transferir arquivos grátis", "enviar arquivos sem login", "enviar arquivos grandes", "compartilhar arquivos online", "passar arquivos do celular para o pc"],
  },
  fr: {
    lang: "fr", label: "Français",
    title: "Orbi Transfer — Transfert de fichiers gratuit, sans inscription, instantané",
    description: "Envoyez fichiers, dossiers, photos, vidéos et liens instantanément entre deux appareils. Gratuit, sans compte, jusqu'à 2 Go, chiffré de bout en bout, supprimé après 5–30 minutes.",
    h1: "Transfert de fichiers gratuit. Sans inscription. Instantané.",
    intro: "Orbi Transfer déplace vos fichiers entre téléphone, ordinateur et n'importe quel navigateur en quelques secondes. Déposez un fichier, il apparaît sur l'autre appareil, vous le téléchargez. Sans compte, sans appli, sans e-mail.",
    points: ["Sans inscription ni compte, entièrement gratuit", "Fichiers, dossiers, photos, vidéos, texte et liens, jusqu'à 2 Go", "Chiffrement de bout en bout dans le navigateur ; code optionnel", "Supprimé automatiquement après 5 à 30 minutes"],
    faq: [
      { q: "Comment envoyer un fichier sans compte ?", a: "Ouvrez orbitransfer.com, touchez Send, choisissez un fichier ou un dossier puis Launch. Il apparaît aussitôt sur l'autre appareil ; touchez-le pour le télécharger." },
      { q: "Est-ce gratuit ?", a: "Oui, Orbi Transfer est entièrement gratuit et sans inscription." },
      { q: "Quelle taille maximale ?", a: "Jusqu'à 2 Go par envoi, dossiers complets et fichiers multiples compris." },
      { q: "Est-ce sécurisé ?", a: "Les fichiers sont chiffrés dans votre navigateur (AES-256-GCM) avant l'envoi et supprimés automatiquement." },
    ],
    keywords: ["transfert de fichiers gratuit", "envoyer fichier sans inscription", "envoyer gros fichiers gratuit", "partager fichiers en ligne", "transférer fichiers téléphone pc"],
  },
  de: {
    lang: "de", label: "Deutsch",
    title: "Orbi Transfer — Kostenlose Dateiübertragung ohne Anmeldung, sofort",
    description: "Dateien, Ordner, Fotos, Videos und Links sofort zwischen zwei Geräten senden. Kostenlos, ohne Anmeldung oder Konto, bis 20 GB, Ende-zu-Ende-verschlüsselt, nach 5–30 Minuten gelöscht.",
    h1: "Kostenlose Dateiübertragung. Ohne Anmeldung. Sofort.",
    intro: "Orbi Transfer bringt Dateien in Sekunden zwischen Handy, Laptop und jedem Browser. Datei ablegen, sie erscheint auf dem anderen Gerät, dort herunterladen. Kein Konto, keine App, keine E-Mail.",
    points: ["Ohne Anmeldung oder Konto, komplett kostenlos", "Dateien, Ordner, Fotos, Videos, Text und Links, bis 20 GB", "Ende-zu-Ende-verschlüsselt im Browser; Passcode optional", "Automatisch gelöscht nach 5 bis 30 Minuten"],
    faq: [
      { q: "Wie sende ich eine Datei ohne Anmeldung?", a: "orbitransfer.com öffnen, Send tippen, Datei oder Ordner wählen und Launch drücken. Sie erscheint sofort auf dem anderen Gerät; antippen zum Herunterladen." },
      { q: "Ist das kostenlos?", a: "Ja, Orbi Transfer ist komplett kostenlos und braucht kein Konto." },
      { q: "Wie groß darf eine Datei sein?", a: "Bis 20 GB pro Sendung, auch ganze Ordner und viele Dateien auf einmal." },
      { q: "Ist das sicher?", a: "Dateien werden vor dem Hochladen im Browser mit AES-256-GCM verschlüsselt und automatisch gelöscht." },
    ],
    keywords: ["dateien kostenlos senden", "dateiübertragung ohne anmeldung", "große dateien verschicken kostenlos", "dateien online teilen", "dateien vom handy auf pc"],
  },
  it: {
    lang: "it", label: "Italiano",
    title: "Orbi Transfer — Trasferimento file gratis, senza login, istantaneo",
    description: "Invia file, cartelle, foto, video e link all'istante tra due dispositivi. Gratis, senza login né registrazione, fino a 20 GB, crittografia end-to-end, eliminati dopo 5–30 minuti.",
    h1: "Trasferimento file gratis. Senza login. Istantaneo.",
    intro: "Orbi Transfer sposta file tra telefono, portatile e qualsiasi browser in pochi secondi. Rilascia un file, compare sull'altro dispositivo e lo scarichi. Niente account, niente app, niente email.",
    points: ["Senza login né registrazione, completamente gratis", "File, cartelle, foto, video, testo e link, fino a 20 GB", "Crittografia end-to-end nel browser; codice opzionale", "Eliminato in automatico dopo 5–30 minuti"],
    faq: [
      { q: "Come invio un file senza registrarmi?", a: "Apri orbitransfer.com, tocca Send, scegli un file o una cartella e premi Launch. Compare subito sull'altro dispositivo; toccalo per scaricarlo." },
      { q: "È gratis?", a: "Sì, Orbi Transfer è completamente gratuito e senza account." },
      { q: "Qual è la dimensione massima?", a: "Fino a 20 GB per invio, anche cartelle intere e più file insieme." },
      { q: "È sicuro?", a: "I file sono cifrati nel browser con AES-256-GCM prima del caricamento ed eliminati automaticamente." },
    ],
    keywords: ["trasferire file gratis", "inviare file senza registrazione", "inviare file grandi gratis", "condividere file online", "trasferire file da telefono a pc"],
  },
  hi: {
    lang: "hi", label: "हिन्दी",
    title: "Orbi Transfer — मुफ़्त फ़ाइल ट्रांसफ़र, बिना लॉगिन, तुरंत",
    description: "फ़ाइलें, फ़ोल्डर, फ़ोटो, वीडियो और लिंक किसी भी दो डिवाइस के बीच तुरंत भेजें। मुफ़्त, बिना लॉगिन या साइनअप, 20 GB तक, एंड-टू-एंड एन्क्रिप्टेड, 5–30 मिनट में अपने-आप डिलीट।",
    h1: "मुफ़्त ऑनलाइन फ़ाइल ट्रांसफ़र। बिना लॉगिन। तुरंत।",
    intro: "Orbi Transfer आपके फ़ोन, लैपटॉप और किसी भी ब्राउज़र के बीच सेकंडों में फ़ाइलें भेजता है। फ़ाइल डालें, वह दूसरे डिवाइस पर दिखेगी, वहाँ डाउनलोड करें। न अकाउंट, न ऐप, न ईमेल।",
    points: ["बिना लॉगिन या साइनअप, पूरी तरह मुफ़्त", "फ़ाइलें, पूरे फ़ोल्डर, फ़ोटो, वीडियो, टेक्स्ट और लिंक, 20 GB तक", "ब्राउज़र में एंड-टू-एंड एन्क्रिप्शन; पासकोड वैकल्पिक", "5 से 30 मिनट बाद अपने-आप डिलीट"],
    faq: [
      { q: "बिना लॉगिन फ़ाइल कैसे भेजें?", a: "orbitransfer.com खोलें, Send दबाएँ, फ़ाइल या फ़ोल्डर चुनें और Launch दबाएँ। वह तुरंत दूसरे डिवाइस पर दिखेगी; डाउनलोड करने के लिए उस पर टैप करें।" },
      { q: "क्या यह मुफ़्त है?", a: "हाँ, Orbi Transfer पूरी तरह मुफ़्त है और किसी अकाउंट की ज़रूरत नहीं।" },
      { q: "कितनी बड़ी फ़ाइल भेज सकते हैं?", a: "हर बार 20 GB तक, पूरे फ़ोल्डर और एक साथ कई फ़ाइलें भी।" },
      { q: "क्या यह सुरक्षित है?", a: "अपलोड से पहले फ़ाइलें आपके ब्राउज़र में AES-256-GCM से एन्क्रिप्ट होती हैं और अपने-आप डिलीट हो जाती हैं।" },
    ],
    keywords: ["मुफ़्त फ़ाइल ट्रांसफ़र", "बिना लॉगिन फ़ाइल भेजें", "बड़ी फ़ाइल भेजें", "फ़ोन से लैपटॉप फ़ाइल ट्रांसफ़र", "file transfer free"],
  },
  ar: {
    lang: "ar", label: "العربية",
    title: "Orbi Transfer — نقل ملفات مجاني فوري بدون تسجيل دخول",
    description: "أرسل الملفات والمجلدات والصور والفيديو والروابط فوراً بين أي جهازين. مجاني، بدون تسجيل أو حساب، حتى 2 غيغابايت، تشفير من طرف إلى طرف، يُحذف تلقائياً بعد 5–30 دقيقة.",
    h1: "نقل ملفات مجاني عبر الإنترنت. بدون تسجيل. فوري.",
    intro: "ينقل Orbi Transfer الملفات بين هاتفك وحاسوبك وأي متصفح خلال ثوانٍ. ضع الملف فيظهر على الجهاز الآخر ثم نزّله. بدون حساب أو تطبيق أو بريد.",
    points: ["بدون تسجيل أو حساب، مجاني بالكامل", "ملفات ومجلدات وصور وفيديو ونصوص وروابط حتى 2 غيغابايت", "تشفير من طرف إلى طرف داخل المتصفح؛ رمز مرور اختياري", "يُحذف تلقائياً بعد 5 إلى 30 دقيقة"],
    faq: [
      { q: "كيف أرسل ملفاً بدون تسجيل دخول؟", a: "افتح orbitransfer.com واضغط Send واختر ملفاً أو مجلداً ثم Launch. يظهر فوراً على الجهاز الآخر، اضغط عليه لتنزيله." },
      { q: "هل الخدمة مجانية؟", a: "نعم، Orbi Transfer مجاني بالكامل ولا يحتاج إلى حساب." },
      { q: "ما الحد الأقصى للحجم؟", a: "حتى 2 غيغابايت في كل إرسال، بما في ذلك المجلدات الكاملة وعدة ملفات معاً." },
      { q: "هل هو آمن؟", a: "تُشفَّر الملفات في متصفحك بـ AES-256-GCM قبل الرفع وتُحذف تلقائياً." },
    ],
    keywords: ["نقل ملفات مجاني", "ارسال ملفات بدون تسجيل", "ارسال ملفات كبيرة", "مشاركة الملفات اونلاين", "نقل الملفات من الهاتف للكمبيوتر"],
  },
  id: {
    lang: "id", label: "Bahasa Indonesia",
    title: "Orbi Transfer — Transfer file gratis, tanpa login, instan",
    description: "Kirim file, folder, foto, video, dan tautan secara instan antar dua perangkat. Gratis, tanpa login atau daftar, hingga 20 GB, terenkripsi end-to-end, terhapus otomatis setelah 5–30 menit.",
    h1: "Transfer file online gratis. Tanpa login. Instan.",
    intro: "Orbi Transfer memindahkan file antara ponsel, laptop, dan browser apa pun dalam hitungan detik. Taruh file, muncul di perangkat lain, lalu unduh. Tanpa akun, tanpa aplikasi, tanpa email.",
    points: ["Tanpa login atau daftar, gratis sepenuhnya", "File, folder, foto, video, teks, dan tautan hingga 20 GB", "Enkripsi end-to-end di browser; kode sandi opsional", "Terhapus otomatis setelah 5 sampai 30 menit"],
    faq: [
      { q: "Bagaimana mengirim file tanpa login?", a: "Buka orbitransfer.com, ketuk Send, pilih file atau folder, lalu Launch. File langsung muncul di perangkat lain; ketuk untuk mengunduh." },
      { q: "Apakah gratis?", a: "Ya, Orbi Transfer sepenuhnya gratis dan tanpa akun." },
      { q: "Berapa ukuran maksimum?", a: "Hingga 20 GB per kiriman, termasuk folder utuh dan banyak file sekaligus." },
      { q: "Apakah aman?", a: "File dienkripsi di browser dengan AES-256-GCM sebelum diunggah dan dihapus otomatis." },
    ],
    keywords: ["transfer file gratis", "kirim file tanpa login", "kirim file besar gratis", "berbagi file online", "pindah file dari hp ke laptop"],
  },
  tr: {
    lang: "tr", label: "Türkçe",
    title: "Orbi Transfer — Ücretsiz, üyeliksiz, anında dosya transferi",
    description: "Dosya, klasör, fotoğraf, video ve bağlantıları iki cihaz arasında anında gönderin. Ücretsiz, giriş veya üyelik yok, 20 GB'a kadar, uçtan uca şifreli, 5–30 dakikada otomatik silinir.",
    h1: "Ücretsiz online dosya transferi. Üyelik yok. Anında.",
    intro: "Orbi Transfer dosyaları telefon, dizüstü ve her tarayıcı arasında saniyeler içinde taşır. Dosyayı bırakın, diğer cihazda görünsün, indirin. Hesap yok, uygulama yok, e-posta yok.",
    points: ["Giriş veya üyelik yok, tamamen ücretsiz", "Dosya, klasör, fotoğraf, video, metin ve bağlantı, 20 GB'a kadar", "Tarayıcıda uçtan uca şifreleme; isteğe bağlı şifre", "5 ila 30 dakika sonra otomatik silinir"],
    faq: [
      { q: "Giriş yapmadan nasıl dosya gönderirim?", a: "orbitransfer.com'u açın, Send'e dokunun, dosya veya klasör seçip Launch'a basın. Diğer cihazda anında görünür; indirmek için dokunun." },
      { q: "Ücretsiz mi?", a: "Evet, Orbi Transfer tamamen ücretsizdir ve hesap gerektirmez." },
      { q: "En fazla ne kadar büyük?", a: "Gönderim başına 20 GB'a kadar, tüm klasörler ve birden çok dosya dahil." },
      { q: "Güvenli mi?", a: "Dosyalar yüklemeden önce tarayıcınızda AES-256-GCM ile şifrelenir ve otomatik silinir." },
    ],
    keywords: ["ücretsiz dosya transferi", "üyeliksiz dosya gönderme", "büyük dosya gönderme", "online dosya paylaşma", "telefondan bilgisayara dosya aktarma"],
  },
  ru: {
    lang: "ru", label: "Русский",
    title: "Orbi Transfer — Бесплатная передача файлов без регистрации, мгновенно",
    description: "Отправляйте файлы, папки, фото, видео и ссылки мгновенно между любыми устройствами. Бесплатно, без входа и регистрации, до 2 ГБ, сквозное шифрование, удаление через 5–30 минут.",
    h1: "Бесплатная передача файлов онлайн. Без регистрации. Мгновенно.",
    intro: "Orbi Transfer переносит файлы между телефоном, ноутбуком и любым браузером за секунды. Положите файл, он появится на другом устройстве, скачайте его. Без аккаунта, приложения и почты.",
    points: ["Без входа и регистрации, полностью бесплатно", "Файлы, папки, фото, видео, текст и ссылки до 2 ГБ", "Сквозное шифрование в браузере; пароль по желанию", "Удаляется автоматически через 5–30 минут"],
    faq: [
      { q: "Как отправить файл без регистрации?", a: "Откройте orbitransfer.com, нажмите Send, выберите файл или папку и нажмите Launch. Он сразу появится на другом устройстве; нажмите, чтобы скачать." },
      { q: "Это бесплатно?", a: "Да, Orbi Transfer полностью бесплатен и не требует аккаунта." },
      { q: "Какой максимальный размер?", a: "До 2 ГБ за отправку, включая целые папки и много файлов сразу." },
      { q: "Это безопасно?", a: "Файлы шифруются в браузере (AES-256-GCM) до загрузки и удаляются автоматически." },
    ],
    keywords: ["передача файлов бесплатно", "отправить файл без регистрации", "отправить большой файл", "обмен файлами онлайн", "перекинуть файлы с телефона на компьютер"],
  },
  ja: {
    lang: "ja", label: "日本語",
    title: "Orbi Transfer — 無料・ログイン不要のファイル転送、すぐ届く",
    description: "ファイル、フォルダ、写真、動画、リンクを2台の端末間ですぐに送信。無料、ログイン・登録不要、最大20GB、エンドツーエンド暗号化、5〜30分で自動削除。",
    h1: "無料のオンラインファイル転送。ログイン不要。すぐ届く。",
    intro: "Orbi Transfer はスマホ、ノートPC、あらゆるブラウザの間で数秒でファイルを送ります。ファイルを置けば相手の端末に現れ、そこでダウンロード。アカウントもアプリもメールも不要です。",
    points: ["ログイン・登録不要、完全無料", "ファイル、フォルダ、写真、動画、テキスト、リンクを最大20GB", "ブラウザ内でエンドツーエンド暗号化、パスコードは任意", "5〜30分で自動的に削除"],
    faq: [
      { q: "ログインせずにファイルを送るには?", a: "orbitransfer.com を開き、Send をタップしてファイルかフォルダを選び Launch。すぐに相手の端末に表示され、タップでダウンロードできます。" },
      { q: "無料ですか?", a: "はい、Orbi Transfer は完全無料でアカウントも不要です。" },
      { q: "最大サイズは?", a: "1回あたり最大20GB。フォルダごとや複数ファイルの同時送信も可能です。" },
      { q: "安全ですか?", a: "ファイルはアップロード前にブラウザで AES-256-GCM により暗号化され、自動で削除されます。" },
    ],
    keywords: ["ファイル転送 無料", "ファイル送信 登録不要", "大容量ファイル 送信 無料", "ファイル共有 オンライン", "スマホ パソコン ファイル転送"],
  },
  zh: {
    lang: "zh", label: "中文",
    title: "Orbi Transfer — 免费免登录的即时文件传输",
    description: "在任意两台设备之间即时发送文件、文件夹、照片、视频和链接。免费、无需登录注册、最大 20 GB、端到端加密、5–30 分钟后自动删除。",
    h1: "免费在线文件传输。无需登录。即时送达。",
    intro: "Orbi Transfer 让文件在手机、电脑和任何浏览器之间几秒内传送。放下文件，它会出现在另一台设备上，点一下即可下载。无需账号、应用或邮箱。",
    points: ["无需登录注册，完全免费", "文件、整个文件夹、照片、视频、文本和链接，最大 20 GB", "浏览器内端到端加密，可选密码", "5 到 30 分钟后自动删除"],
    faq: [
      { q: "如何不登录发送文件？", a: "打开 orbitransfer.com，点 Send，选择文件或文件夹后点 Launch。它会立即出现在另一台设备上，点击即可下载。" },
      { q: "免费吗？", a: "是的，Orbi Transfer 完全免费，无需账号。" },
      { q: "最大能传多大？", a: "每次最多 20 GB，可传整个文件夹或一次多个文件。" },
      { q: "安全吗？", a: "文件在上传前于浏览器中用 AES-256-GCM 加密，并会自动删除。" },
    ],
    keywords: ["免费文件传输", "免登录传文件", "大文件传输免费", "在线文件分享", "手机传文件到电脑"],
  },
  ko: {
    lang: "ko", label: "한국어",
    title: "Orbi Transfer — 무료, 로그인 없는 즉시 파일 전송",
    description: "파일, 폴더, 사진, 동영상, 링크를 두 기기 사이에서 바로 보내세요. 무료, 로그인·가입 불필요, 최대 20GB, 종단 간 암호화, 5–30분 후 자동 삭제.",
    h1: "무료 온라인 파일 전송. 로그인 없이. 즉시.",
    intro: "Orbi Transfer는 휴대폰, 노트북, 어떤 브라우저 사이에서도 몇 초 만에 파일을 옮깁니다. 파일을 올리면 다른 기기에 나타나고 바로 내려받습니다. 계정도 앱도 이메일도 필요 없습니다.",
    points: ["로그인·가입 없이 완전 무료", "파일, 폴더, 사진, 동영상, 텍스트, 링크 최대 20GB", "브라우저에서 종단 간 암호화, 비밀번호는 선택", "5~30분 후 자동 삭제"],
    faq: [
      { q: "로그인 없이 파일을 보내려면?", a: "orbitransfer.com을 열고 Send를 눌러 파일이나 폴더를 고른 뒤 Launch를 누르세요. 다른 기기에 바로 나타나며 탭하면 다운로드됩니다." },
      { q: "무료인가요?", a: "네, Orbi Transfer는 완전 무료이며 계정이 필요 없습니다." },
      { q: "최대 용량은?", a: "한 번에 최대 20GB, 폴더 전체나 여러 파일도 한 번에 보낼 수 있습니다." },
      { q: "안전한가요?", a: "파일은 업로드 전에 브라우저에서 AES-256-GCM으로 암호화되고 자동으로 삭제됩니다." },
    ],
    keywords: ["무료 파일 전송", "로그인 없이 파일 보내기", "대용량 파일 전송 무료", "온라인 파일 공유", "휴대폰 컴퓨터 파일 전송"],
  },
};

export const LANGS = Object.keys(SEO);
export const OTHER_LANGS = LANGS.filter((l) => l !== "en");
export const pathFor = (lang: string) => (lang === "en" ? "/" : `/${lang}`);

/** Structured data: the app itself + its FAQ, in the page's language. */
export function jsonLd(c: SeoCopy) {
  const url = `${SITE}${pathFor(c.lang)}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: NAME,
      alternateName: ["Orbi", "OrbiTransfer", "orbitransfer.com"],
      url,
      inLanguage: c.lang,
      description: c.description,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any (web browser): Windows, macOS, Linux, iOS, Android",
      browserRequirements: "Requires a modern web browser with JavaScript",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      isAccessibleForFree: true,
      featureList: c.points,
      keywords: c.keywords.join(", "),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: c.lang,
      mainEntity: c.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: NAME,
      alternateName: "Orbi",
      url: SITE,
    },
  ];
}

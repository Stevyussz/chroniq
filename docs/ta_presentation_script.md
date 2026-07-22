# SKRIP PRESENTASI SIDANG TA - CHRONIQ
## "Chroniq: Behavioral Productivity Engine Berbasis Neurosains untuk Generasi Z"

> Format: skrip narasi + outline PPT per slide
> Durasi target: 15-20 menit presentasi + 10 menit tanya jawab
> Tone: percaya diri, berbasis sistem, tidak overclaim

---

# BAGIAN 1 - OUTLINE PPT

## SLIDE 1 - COVER
**Judul:** Chroniq: Behavioral Productivity Engine

**Subjudul:** Sistem manajemen waktu berbasis neurosains, adaptive scheduling, dan Chroniq AI untuk Generasi Z

**Visual:** Logo Chroniq + screenshot dashboard/coach.

**Tagline:** "Bukan sekadar to-do list. Chroniq menyusun jadwal berdasarkan energi, perilaku, dan konteks pengguna."

---

## SLIDE 2 - PROBLEM STATEMENT
**Judul:** Masalahnya Bukan Sekadar Malas

**Poin utama:**
- Banyak mahasiswa membuat jadwal, tetapi gagal menjalankannya secara konsisten.
- Aplikasi produktivitas umum hanya mencatat tugas, bukan membantu memutuskan kapan tugas paling rasional dikerjakan.
- Jadwal yang kaku sering tidak mempertimbangkan ritme energi, fixed blocks, deadline, distraksi, dan burnout.

**Kalimat kunci:** "Masalahnya bukan hanya disiplin. Masalahnya adalah alat yang belum memahami cara kerja manusia."

---

## SLIDE 3 - GAP KOMPETITOR
**Judul:** Apa yang Chroniq Tambahkan

| Kemampuan | Chroniq | To-do list umum | Notion |
|---|---:|---:|---:|
| Scheduling berbasis energi biologis | Ya | Tidak | Tidak |
| Deadline auto-priority | Ya | Parsial | Manual |
| Brain Dump ke jadwal | Ya | Tidak | Tidak |
| Chroniq AI Coach kontekstual | Ya | Tidak | Tidak |
| Long-range study planning | Ya | Tidak | Manual |
| Burnout/adaptive learning | Ya | Tidak | Tidak |
| Analytics + reflection | Ya | Tidak | Manual |
| Reset onboarding mandiri | Ya | Parsial | Manual |

**Kalimat kunci:** "Chroniq bukan hanya tempat menulis tugas, tetapi engine yang membantu mengambil keputusan produktivitas."

---

## SLIDE 4 - LANDASAN ILMIAH
**Judul:** Riset yang Diterjemahkan ke Engine

**Riset/prinsip yang digunakan:**
- Ultradian Rhythm / BRAC: blok fokus dibatasi dan diselingi recovery.
- Circadian rhythm & Cortisol Awakening Response: zona energi mengikuti jam bangun pengguna.
- Post-lunch dip: jam biologis tertentu dilindungi dari beban kognitif berlebihan.
- Attention residue: distraksi menurunkan nilai produktivitas aktual.
- Implementation intentions: tugas dengan waktu spesifik lebih mudah dieksekusi.
- Spaced repetition & active recall: plan belajar jangka panjang dipecah menjadi sesi kecil.
- Self-efficacy, growth mindset, motivational interviewing: gaya coaching Chroniq AI.

**Kalimat kunci:** "Riset tidak hanya menjadi referensi, tetapi menjadi aturan keputusan di dalam sistem."

---

## SLIDE 5 - ARSITEKTUR SISTEM
**Judul:** Cara Chroniq Bekerja

```text
INPUT LAYER
- Profil user
- Jam bangun
- Durasi tidur
- Fixed blocks
- Task / brain dump
- Execution logs

AI + DECISION LAYER
- Chroniq AI parser
- Chroniq AI refine
- Chroniq AI coach
- Long-range study planner
- Local fallback engine
- Validator & normalizer

SCHEDULING ENGINE
- Flexible time calculator
- Priority allocation
- Energy mapping
- Deadline urgency
- BRAC break insertion
- Adaptive learning

OUTPUT LAYER
- Daily optimized timeline
- Upcoming Study Plan
- Analytics
- Chroniq AI reflection
- EXP, streak, focus timer
```

**Catatan presenter:** Di aplikasi, user hanya melihat "Chroniq AI". Provider AI tidak ditampilkan sebagai fitur produk.

---

## SLIDE 6 - FITUR UTAMA
**Judul:** Fitur yang Membuat Chroniq Terasa Hidup

1. **Brain Dump Mode** - input bebas diubah menjadi task terstruktur.
2. **Chroniq AI Quick Add** - tambah tugas dengan bahasa sehari-hari.
3. **Long-range Study Planning** - plan beberapa hari, minggu, atau bulan ke depan.
4. **Daily Optimized Timeline** - jadwal hari ini dibangun dari constraint nyata.
5. **Chroniq AI Coach** - bisa menambah, mengubah, reschedule, memberi checklist, dan re-optimize.
6. **Analytics & AI Reflection** - membaca pola fokus, distraksi, energi, dan eksekusi.
7. **Zen Mode + Micro Evaluation** - fokus penuh dan data evaluasi setelah task selesai.
8. **Reset Onboarding** - user bisa mulai ulang profil dan setup dari awal.

---

## SLIDE 7 - DEMO: BRAIN DUMP & QUICK ADD
**Judul:** Dari Pikiran Berantakan ke Jadwal

**Demo script:**
> "Saya akan mengetik input bebas seperti: 'Besok belajar kimia 2 jam, balas email 20 menit, latihan matematika malam ini, olahraga 30 menit.'"

**Yang ditunjukkan:**
- Loading Chroniq AI.
- Task otomatis punya durasi, prioritas, kategori, deadline/scheduled date jika ada.
- Jadwal hari ini tidak asal penuh, tetapi mengikuti constraint dan energi.

---

## SLIDE 8 - DEMO: PLAN BELAJAR 1 BULAN
**Judul:** Long-range Study Planning

**Contoh prompt:**
> "Buatkan aku plan produktif untuk belajar ujian selama 1 bulan dengan mata pelajaran IPA, IPS, Biologi, Kimia, Matematika, dan Matematika Lanjut."

**Yang terjadi di sistem:**
- Chroniq AI membuat banyak sesi belajar kecil.
- Setiap sesi diberi `scheduled_date`, durasi, prioritas, kategori, dan deadline jika relevan.
- Tugas masa depan tidak ditumpuk ke timeline hari ini.
- Dashboard menampilkan `Upcoming Study Plan`.
- Ketika tanggalnya tiba, sesi otomatis masuk ke daily timeline.

**Kalimat kunci:** "Ini bukan satu task besar bernama 'belajar ujian', tetapi strategi belajar bertahap."

---

## SLIDE 9 - DEMO: CHRONIQ AI COACH
**Judul:** Coach yang Punya Otoritas Eksekusi

**Kemampuan Coach terbaru:**
- `ADD_TASK` dan `ADD_TASKS`
- `UPDATE_TASK`
- `RESCHEDULE_TASK`
- `DELETE_TASK`
- `SET_DEADLINE`
- `ADD_CHECKLIST`
- `SET_ENERGY_SLOTS`
- `REOPTIMIZE`

**Contoh demo:**
> "Chroniq, pecah tugas belajar Matematika jadi checklist, pindahkan sesi berat ke jam peak, lalu susun ulang jadwalku."

**Catatan presenter:** Coach menerima konteks task aktif, timeline hari ini, fixed blocks, dan energy slots, sehingga tidak mengambil keputusan dari ruang kosong.

---

## SLIDE 10 - ENGINE SCIENCE
**Judul:** Bagaimana Jadwal Diputuskan?

**Urutan keputusan engine:**
1. Kunci sleep dan fixed blocks.
2. Hitung waktu fleksibel.
3. Filter task berdasarkan tanggal due/scheduled date.
4. Boost prioritas berdasarkan deadline.
5. Alokasikan durasi berdasarkan bobot prioritas dan durasi.
6. Arahkan tugas berat ke peak/medium energy.
7. Pakai preferred start sebagai soft constraint.
8. Batasi blok kerja dan sisipkan break.
9. Gunakan execution logs untuk adaptasi burnout dan penalti kategori.

**Kalimat kunci:** "AI membantu memahami dan memperbaiki input, tetapi keputusan jadwal final tetap dikawal oleh engine deterministic."

---

## SLIDE 11 - ANALYTICS & ADAPTIVE LEARNING
**Judul:** Chroniq Belajar dari Eksekusi

**Data yang dibaca:**
- Task selesai, dilewati, atau parsial.
- Durasi aktual.
- Focus score.
- Energy after.
- Jumlah distraksi.

**Output:**
- Discipline score.
- Priority alignment.
- Energy reliability.
- True Productivity Index.
- Burnout risk.
- Chroniq AI weekly reflection.
- Saran tuning energy slots.

**Kalimat kunci:** "Semakin sering digunakan, Chroniq semakin memahami ritme pengguna."

---

## SLIDE 12 - VALIDASI TEKNIS
**Judul:** Hasil Pengujian Sistem

**Validasi yang sudah dilakukan:**
- `npm run lint` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed.
- Smoke test endpoint AI passed:
  - `/api/ai/parse-nl`
  - `/api/ai/refine`
  - `/api/ai/split`
  - `/api/ai/reflection`
  - `/api/ai/chat`
- Fallback lokal aktif jika AI provider timeout, error, atau rate-limit.
- Output AI divalidasi dan dinormalisasi sebelum masuk scheduler.

**Kalimat kunci:** "Sistem tidak bergantung buta pada AI. Jika AI gagal, Chroniq tetap berjalan."

---

## SLIDE 13 - STACK TEKNOLOGI
**Judul:** Technology Stack

- **Next.js 16 App Router** - frontend dan API routes.
- **React 19** - UI interaktif.
- **Zustand Persist** - state lokal dan persistence.
- **Chroniq AI via Groq OpenAI-compatible API** - chat, parser, refine, split, reflection.
- **Local fallback AI logic** - mode aman saat provider gagal.
- **Recharts** - analytics radar/chart.
- **Framer Motion** - animasi UI.
- **Firebase** - auth/cloud integration yang tersedia di project.
- **Vercel** - deployment.

**Env production penting:**
- `GROQ_API_KEY`
- Opsional: `GROQ_MODEL`

---

## SLIDE 14 - KESIMPULAN
**Judul:** Kontribusi Chroniq

1. **Kontribusi teoritis:** menerjemahkan prinsip neurosains dan psikologi perilaku menjadi aturan scheduling.
2. **Kontribusi praktis:** membantu mahasiswa membuat jadwal yang lebih realistis, bukan sekadar daftar tugas.
3. **Kontribusi teknis:** menggabungkan AI-assisted planning, deterministic optimizer, fallback local logic, dan adaptive analytics.

**Positioning:**
> "Chroniq adalah productivity engine yang memperlakukan jadwal sebagai hasil dari konteks manusia, bukan sekadar slot kosong."

---

## SLIDE 15 - PENUTUP & Q&A
**Judul:** Chroniq - Jadwal yang Belajar dari Penggunanya

**Closing line:**
> "Produktivitas sejati bukan hanya mengisi kalender. Produktivitas sejati adalah menempatkan usaha terbaik pada waktu yang paling masuk akal."

---

# BAGIAN 2 - SKRIP NARASI LENGKAP

## OPENING - Slide 1

> "Selamat pagi/siang Bapak/Ibu penguji yang saya hormati.
>
> Saya [Nama] akan mempresentasikan Tugas Akhir saya berjudul Chroniq: Behavioral Productivity Engine Berbasis Neurosains untuk Generasi Z.
>
> Ide utama dari Chroniq sederhana: banyak orang gagal menjalankan jadwal bukan karena tidak punya niat, tetapi karena jadwalnya tidak dibuat berdasarkan kondisi biologis, energi, dan konteks harian mereka.
>
> Chroniq mencoba menjawab masalah itu dengan menggabungkan scheduling engine, prinsip riset neurosains, dan Chroniq AI."

---

## PROBLEM - Slide 2

> "Aplikasi produktivitas yang umum dipakai biasanya hanya menyimpan task. User tetap harus memutuskan sendiri kapan tugas harus dikerjakan, tugas mana yang lebih penting, mana yang harus diprioritaskan, dan kapan harus beristirahat.
>
> Masalahnya, manusia tidak bekerja seperti mesin. Fokus naik turun, ada fixed schedule, ada deadline, ada distraksi, dan ada risiko burnout.
>
> Jadi Chroniq tidak hanya bertanya: apa tugasmu? Chroniq juga bertanya: kapan otakmu paling siap mengerjakan tugas itu?"

---

## GAP KOMPETITOR - Slide 3

> "Perbedaan Chroniq dengan to-do list biasa ada pada lapisan intelligence.
>
> Todo list umum adalah tools pasif. User memasukkan data, lalu aplikasi menampilkan daftar.
>
> Chroniq lebih aktif. Ia membaca prioritas, durasi, deadline, jam bangun, fixed blocks, energy zone, dan data evaluasi setelah task selesai. Dari situ, Chroniq menyusun timeline harian dan memberi insight melalui Chroniq AI."

---

## LANDASAN ILMIAH - Slide 4

> "Chroniq dibangun dengan beberapa prinsip riset.
>
> Pertama, ultradian rhythm. Sistem tidak mendorong user bekerja terus tanpa jeda. Work block dibatasi dan recovery dipertimbangkan.
>
> Kedua, circadian rhythm. Jam produktif tidak sama untuk semua orang. Karena itu onboarding Chroniq menanyakan jam bangun, lalu membuat energy mapping berdasarkan ritme pengguna.
>
> Ketiga, attention residue. Setelah distraksi, kualitas fokus tidak langsung kembali. Itu sebabnya Chroniq tidak hanya menghitung task selesai, tapi juga menghitung focus score dan distraction count.
>
> Keempat, spaced repetition dan active recall. Ini dipakai terutama untuk fitur long-range study planning, agar belajar ujian tidak dijadikan satu blok besar, tetapi dipecah menjadi sesi harian yang lebih realistis."

---

## ARSITEKTUR - Slide 5

> "Secara arsitektur, Chroniq punya empat lapisan.
>
> Lapisan pertama adalah input: profil user, fixed blocks, jam bangun, task, brain dump, dan execution logs.
>
> Lapisan kedua adalah Chroniq AI dan fallback logic. AI membantu parsing bahasa natural, refine tugas, membuat plan jangka panjang, dan memberi coaching. Tetapi semua output AI divalidasi lebih dulu.
>
> Lapisan ketiga adalah scheduling engine. Di sini keputusan jadwal dibuat secara deterministic berdasarkan constraint dan aturan.
>
> Lapisan terakhir adalah output: daily timeline, upcoming study plan, analytics, reflection, EXP, streak, dan focus mode."

---

## FITUR UTAMA - Slide 6

> "Fitur utama Chroniq dirancang untuk membuat sistem terasa hidup.
>
> User bisa melakukan brain dump. User bisa minta plan belajar 1 bulan. User bisa chat dengan Coach dan Coach benar-benar bisa mengeksekusi perubahan, bukan hanya memberi saran.
>
> Setelah task selesai, user mengisi micro evaluation. Data ini dipakai untuk analytics dan adaptive learning."

---

## DEMO BRAIN DUMP - Slide 7

> "Di demo ini, saya akan menunjukkan Brain Dump Mode.
>
> User tidak perlu mengisi form satu per satu. Cukup mengetik kalimat bebas. Chroniq AI akan mengubah input itu menjadi task dengan durasi, prioritas, kategori, deadline, dan scheduled date jika ada.
>
> Setelah itu, scheduler menempatkan task ke timeline berdasarkan energi dan constraint, bukan asal menaruh di slot kosong."

---

## DEMO PLAN 1 BULAN - Slide 8

> "Fitur terbaru Chroniq adalah long-range planning.
>
> Misalnya user berkata: buatkan plan belajar ujian selama 1 bulan untuk IPA, IPS, Biologi, Kimia, Matematika, dan Matematika Lanjut.
>
> Chroniq tidak membuat satu task besar bernama 'belajar ujian'. Sistem membuat beberapa sesi bertanggal, misalnya pemetaan materi, active recall, latihan soal, review kesalahan, dan simulasi mini.
>
> Setiap sesi punya scheduled date. Artinya, tugas minggu depan tidak ditumpuk di hari ini. Ia tersimpan di Upcoming Study Plan dan akan masuk ke timeline ketika waktunya tiba."

---

## DEMO COACH - Slide 9

> "Chroniq AI Coach sekarang memiliki otoritas lebih lengkap.
>
> Coach menerima konteks task aktif, timeline hari ini, fixed blocks, dan energy slots.
>
> Ia bisa menambah task, membuat banyak task sekaligus, mengubah task, reschedule, menambah checklist, mengatur deadline, tuning energy slots jika diminta, dan menjalankan re-optimize.
>
> Namun ada batas keamanan: untuk update atau delete, Coach harus mencocokkan nama dari task aktif. Jika target ambigu, ia diarahkan untuk bertanya klarifikasi."

---

## ENGINE SCIENCE - Slide 10

> "Bagian terpenting Chroniq adalah scheduler.
>
> AI tidak diberi kebebasan penuh untuk menaruh jadwal. AI membantu memahami input, tetapi engine yang menentukan keputusan final.
>
> Engine mengunci fixed blocks dan sleep, menghitung flexible time, memfilter task berdasarkan scheduled date, menaikkan prioritas jika deadline dekat, lalu menempatkan tugas ke energy zone yang sesuai.
>
> Jika user punya data execution logs, engine juga bisa menurunkan max block duration saat burnout risk meningkat."

---

## ANALYTICS - Slide 11

> "Setelah user menjalankan task, Chroniq mengumpulkan data kualitas eksekusi.
>
> Dari situ, sistem menghitung discipline score, priority alignment, energy reliability, true productivity index, burnout risk, dan reflection.
>
> Jadi analytics Chroniq bukan sekadar grafik cantik, tapi loop pembelajaran untuk memperbaiki keputusan jadwal berikutnya."

---

## VALIDASI - Slide 12

> "Dari sisi teknis, saya melakukan validasi dengan linting, TypeScript strict check, production build, dan smoke test semua endpoint AI.
>
> Endpoint yang diuji meliputi parser, refine, split, reflection, dan coach.
>
> Selain itu, sistem dilengkapi fallback lokal. Jadi ketika AI provider gagal, timeout, atau rate limit, Chroniq tetap bisa berjalan dan tetap memberi output yang valid."

---

## STACK - Slide 13

> "Chroniq dibangun dengan Next.js 16 dan React 19. State management menggunakan Zustand Persist.
>
> Chroniq AI berjalan melalui API route internal dengan provider Groq OpenAI-compatible. Tetapi di sisi user, branding tetap Chroniq AI.
>
> Untuk keamanan dan stabilitas, API key disimpan di environment variable Vercel sebagai GROQ_API_KEY, bukan di client dan bukan di repository."

---

## KESIMPULAN - Slide 14

> "Kesimpulannya, Chroniq memberikan tiga kontribusi.
>
> Secara teoritis, Chroniq menerjemahkan prinsip neurosains dan psikologi perilaku ke dalam aturan scheduling.
>
> Secara praktis, Chroniq membantu mahasiswa membuat jadwal yang lebih realistis, termasuk plan belajar jangka panjang.
>
> Secara teknis, Chroniq menggabungkan AI-assisted planning, deterministic optimizer, fallback local logic, dan adaptive analytics."

---

## CLOSING - Slide 15

> "Produktivitas sejati bukan hanya mengisi kalender.
>
> Produktivitas sejati adalah menempatkan usaha terbaik pada waktu yang paling masuk akal.
>
> Demikian presentasi saya. Saya siap menerima pertanyaan dari Bapak/Ibu penguji. Terima kasih."

---

# BAGIAN 3 - PREDIKSI PERTANYAAN PENGUJI & JAWABAN

## "Apa bedanya dengan Notion atau Todoist?"

> "Notion dan Todoist adalah tools pencatatan. Chroniq adalah decision engine. Ia tidak hanya menyimpan task, tetapi membantu menentukan kapan task dikerjakan, seberapa besar prioritasnya, bagaimana jika deadline dekat, dan bagaimana pola fokus user dari waktu ke waktu."

---

## "Apakah AI yang menyusun jadwal? Bagaimana kalau AI salah?"

> "AI membantu memahami input, refine task, membuat plan, dan memberi coaching. Tetapi keputusan final jadwal dikawal oleh deterministic scheduling engine. Semua output AI divalidasi dan dinormalisasi. Jika AI gagal, ada fallback lokal sehingga aplikasi tetap berjalan."

---

## "Apakah jadwalnya tidak ngawur?"

> "Tidak. Scheduler mempertimbangkan sleep, fixed blocks, flexible time, priority, duration, deadline, scheduled date, energy zone, preferred start, dan burnout risk. Jadi sistem tidak asal menaruh tugas di slot kosong."

---

## "Apakah sudah mendukung plan beberapa minggu atau bulan?"

> "Sudah. Chroniq mendukung `scheduled_date`, sehingga task masa depan tidak ditumpuk ke hari ini. Contohnya plan belajar 1 bulan akan dipecah menjadi sesi-sesi bertanggal dan tampil di Upcoming Study Plan."

---

## "Mengapa pakai Groq?"

> "Karena kebutuhan Chroniq adalah respons cepat untuk text intelligence: parsing task, coach chat, long-range planning, dan reflection. Groq menyediakan API OpenAI-compatible yang ringan untuk integrasi. Namun sistem tidak bergantung buta pada provider, karena fallback lokal tetap aktif."

---

## "Bagaimana jika user mengisi micro evaluation secara tidak akurat?"

> "Sistem tidak langsung menjadikan satu data sebagai kebenaran mutlak. Adaptive learning menggunakan pola log, terutama data terbaru, sehingga satu input yang kurang akurat tidak langsung merusak keseluruhan jadwal."

---

## "Apa keterbatasan sistem?"

> "Ada beberapa keterbatasan. Pertama, long-range planning sudah ada, tetapi belum dalam bentuk calendar month view penuh. Kedua, kualitas coaching akan semakin baik jika data eksekusi user semakin banyak. Ketiga, validasi efektivitas secara longitudinal ke banyak pengguna masih menjadi pengembangan lanjutan."

---

# BAGIAN 4 - TIPS DEMO LIVE

## Urutan Demo 5-7 Menit

1. Buka Dashboard dan tunjukkan daily optimized timeline.
2. Buka Quick Add / Brain Dump.
3. Input teks bebas: "Besok belajar kimia 2 jam, latihan matematika malam ini, balas email 20 menit, olahraga 30 menit."
4. Tunjukkan hasil task dan timeline.
5. Buka Coach, input: "Buatkan plan belajar ujian 1 bulan untuk IPA, IPS, Biologi, Kimia, Matematika, dan Matematika Lanjut."
6. Tunjukkan `Upcoming Study Plan`.
7. Minta Coach: "Pecah tugas belajar Matematika jadi checklist dan susun ulang jadwalku."
8. Tunjukkan timeline, checklist, dan re-optimize.
9. Buka Analytics dan tunjukkan radar/insight.
10. Buka Settings dan tunjukkan opsi Reset Onboarding.

## Checklist Persiapan

- [ ] Pastikan `GROQ_API_KEY` sudah terpasang di Vercel.
- [ ] Siapkan akun demo dengan beberapa task dan execution logs.
- [ ] Siapkan teks demo di clipboard.
- [ ] Siapkan screenshot cadangan jika koneksi internet bermasalah.
- [ ] Gunakan mode gelap agar visual lebih kontras.
- [ ] Jangan tampilkan environment variable atau API key saat demo.

---

# KALIMAT PAMUNGKAS

> "Chroniq mungkin belum sempurna sebagai produk komersial, tetapi sebagai Tugas Akhir, kontribusi utamanya jelas: mengubah jadwal dari daftar statis menjadi sistem adaptif yang mempertimbangkan energi, perilaku, deadline, dan konteks belajar pengguna."

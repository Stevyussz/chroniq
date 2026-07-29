# Chroniq WhatsApp Reminder Bridge

Fitur ini membuat Chroniq bisa mengirim reminder jadwal otomatis ke WhatsApp user melalui nomor khusus Chroniq AI.

## Flow

1. User mengaktifkan WhatsApp Reminder di Settings Chroniq.
2. User mengisi nomor WhatsApp dan memilih waktu reminder, misalnya 15 menit sebelum task.
3. Chroniq mengirim salinan jadwal terbaru ke `chroniq-wa-bridge`.
4. Bridge menyimpan jadwal di server.
5. Bridge mengecek jadwal berkala dan mengirim chat WhatsApp dari nomor Chroniq AI.

## Fitur WhatsApp

- Reminder adaptif: prioritas tinggi/belajar/tugas panjang bisa mendapat pengingat tambahan.
- Reply sync: user bisa balas `1`, `done`, `2`, `tunda 15`, `3`, atau `skip`.
- Morning brief: ringkasan fokus harian otomatis sesuai `MORNING_BRIEF_TIME`.
- Night reflection: cek ritme malam otomatis sesuai `NIGHT_REFLECTION_TIME`.
- Share plan: tombol `Plan` di Settings mengirim ringkasan jadwal hari ini ke WhatsApp.

## Deployment Gratis

Jalankan service ini di panel Pterodactyl 1GB, VPS gratis, Raspberry Pi, atau laptop yang selalu menyala.

```bash
cd services/chroniq-wa-bridge
npm install
npm start
```

Startup command Pterodactyl:

```bash
npm start
```

Working directory:

```bash
services/chroniq-wa-bridge
```

## Env Bridge

```bash
PORT=8787
BRIDGE_API_KEY=buat_key_panjang_random
DEFAULT_TIMEZONE=Asia/Jakarta
REMINDER_CHECK_INTERVAL_MS=30000
BOT_DISPLAY_NAME=Chroniq AI
CHRONIQ_APP_URL=https://chroniq.yusrilastaghina.my.id
ENABLE_CONFIRMATION_POLL=false
MORNING_BRIEF_TIME=06:30
NIGHT_REFLECTION_TIME=21:30
```

Setelah bridge hidup, scan QR di terminal panel memakai nomor WhatsApp khusus Chroniq AI.

`CHRONIQ_APP_URL` dipakai untuk menambahkan link CTA "Buka Chroniq" di pesan WhatsApp.
`ENABLE_CONFIRMATION_POLL=true` akan mengirim poll konfirmasi setelah reminder, tetapi default yang disarankan adalah `false` agar quick reply lewat angka/teks menjadi sumber aksi utama dan tidak bergantung pada voting poll.

## Env Chroniq / Vercel

```bash
CHRONIQ_WA_BRIDGE_URL=https://url-panel-kamu
CHRONIQ_WA_BRIDGE_API_KEY=buat_key_panjang_random
```

`CHRONIQ_WA_BRIDGE_API_KEY` harus sama dengan `BRIDGE_API_KEY`.

## Catatan Keamanan

- Gunakan nomor khusus Chroniq AI, bukan nomor pribadi utama.
- Jangan kirim spam atau broadcast massal.
- Ini memakai WhatsApp Web unofficial via Baileys, jadi cocok untuk TA/MVP/demo gratis.
- Untuk produksi skala besar, jalur paling aman tetap WhatsApp Business Platform resmi.

# Chroniq WhatsApp Bridge

Bridge gratis untuk mengirim reminder jadwal Chroniq lewat WhatsApp menggunakan Baileys.

## Cara Jalan

```bash
cd services/chroniq-wa-bridge
npm install
cp .env.example .env
npm start
```

Scan QR yang muncul di terminal memakai nomor WhatsApp khusus Chroniq AI.

## Env Bridge

```bash
PORT=8787
BRIDGE_API_KEY=change-this-long-random-key
DEFAULT_TIMEZONE=Asia/Jakarta
REMINDER_CHECK_INTERVAL_MS=30000
BOT_DISPLAY_NAME=Chroniq AI
CHRONIQ_APP_URL=https://chroniq.yusrilastaghina.my.id
ENABLE_CONFIRMATION_POLL=false
ENABLE_CHRONIQ_AI_FEEDBACK=true
MORNING_BRIEF_TIME=06:30
NIGHT_REFLECTION_TIME=21:30
```

`CHRONIQ_APP_URL` membuat pesan WhatsApp membawa link "Buka Chroniq".
`ENABLE_CONFIRMATION_POLL=true` mengirim poll konfirmasi setelah reminder, tapi default yang disarankan adalah `false` agar quick action teks/angka menjadi sumber aksi utama.
`ENABLE_CHRONIQ_AI_FEEDBACK=true` membuat bridge meminta feedback singkat dari endpoint Chroniq AI saat user membalas WA; kalau gagal, bridge otomatis pakai feedback lokal.

## Env Chroniq Next.js

Tambahkan di Vercel/local Next.js:

```bash
CHRONIQ_WA_BRIDGE_URL=https://domain-bridge-kamu
CHRONIQ_WA_BRIDGE_API_KEY=isi-sama-dengan-BRIDGE_API_KEY
```

## Endpoint

- `GET /api/status`
- `GET /api/qr`
- `POST /api/schedules/sync`
- `POST /api/messages/test`

Semua endpoint `/api/*` butuh header:

```http
x-chroniq-bridge-key: BRIDGE_API_KEY
```

## Catatan Penting

Ini memakai WhatsApp Web unofficial, bukan WhatsApp Business API resmi. Cocok untuk TA/MVP/demo gratis, tapi hindari spam dan gunakan nomor khusus Chroniq AI.

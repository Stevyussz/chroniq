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

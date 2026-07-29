import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import pino from 'pino';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState
} from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const authDir = path.join(rootDir, 'auth_info');
const storePath = path.join(dataDir, 'schedules.json');
const commandPath = path.join(dataDir, 'commands.json');

const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.BRIDGE_API_KEY || '';
const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || 'Asia/Jakarta';
const BOT_DISPLAY_NAME = process.env.BOT_DISPLAY_NAME || 'Chroniq AI';
const CHECK_INTERVAL_MS = Number(process.env.REMINDER_CHECK_INTERVAL_MS || 30_000);

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

let sock = null;
let connectionState = 'starting';
let currentQr = null;
let currentQrDataUrl = null;
let lastConnectionAt = null;

async function ensureDataFiles() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(authDir, { recursive: true });
  try {
    await fs.access(storePath);
  } catch {
    await fs.writeFile(storePath, JSON.stringify({ users: {} }, null, 2));
  }
  try {
    await fs.access(commandPath);
  } catch {
    await fs.writeFile(commandPath, JSON.stringify({ commands: [] }, null, 2));
  }
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

function requireKey(req, res, next) {
  if (!API_KEY) {
    return res.status(500).json({ ok: false, error: 'BRIDGE_API_KEY belum diset.' });
  }

  const key = req.header('x-chroniq-bridge-key');
  if (key !== API_KEY) {
    return res.status(401).json({ ok: false, error: 'Unauthorized bridge request.' });
  }

  return next();
}

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

function toJid(phone) {
  const normalized = normalizePhone(phone);
  return normalized ? `${normalized}@s.whatsapp.net` : '';
}

function localParts(date = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });

  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute)
  };
}

function timeToMinutes(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || ''));
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function getMessageText(message) {
  const payload = message?.message;
  return (
    payload?.conversation ||
    payload?.extendedTextMessage?.text ||
    payload?.imageMessage?.caption ||
    payload?.videoMessage?.caption ||
    ''
  ).trim();
}

function findActivityName(userRecord, block) {
  if (block.type === 'fixed') return block.title || 'Jadwal tetap';
  if (block.type !== 'activity') return block.type || 'Aktivitas';
  const activity = userRecord.activities?.find((item) => item.id === block.activity_id);
  return activity?.name || 'Tugas Chroniq';
}

function reminderMessage(userRecord, block, minutesUntil) {
  const taskName = findActivityName(userRecord, block);
  const activity = userRecord.activities?.find((item) => item.id === block.activity_id);
  const checklist = activity?.checklists?.filter((item) => !item.is_completed).slice(0, 3) || [];
  const checklistText = checklist.length
    ? `\n\nLangkah kecil:\n${checklist.map((item, index) => `${index + 1}. ${item.title}`).join('\n')}`
    : '';

  return [
    `*${BOT_DISPLAY_NAME} Reminder*`,
    '',
    `${minutesUntil <= 0 ? 'Sekarang waktunya' : `${minutesUntil} menit lagi`}: *${taskName}*`,
    `Jam: ${block.planned_start}-${block.planned_end}`,
    activity?.category ? `Kategori: ${activity.category}` : '',
    checklistText,
    '',
    'Balas *done*, *tunda 30*, atau *skip* untuk mencatat responsmu.'
  ].filter(Boolean).join('\n');
}

async function sendText(phone, text) {
  if (!sock || connectionState !== 'connected') {
    throw new Error('WhatsApp belum connected. Scan QR bridge dulu.');
  }

  const jid = toJid(phone);
  if (!jid) throw new Error('Nomor WhatsApp tidak valid.');

  await sock.sendMessage(jid, { text });
}

async function appendCommand(command) {
  const data = await readJson(commandPath, { commands: [] });
  data.commands = [command, ...(data.commands || [])].slice(0, 200);
  await writeJson(commandPath, data);
}

async function handleIncomingMessages(event) {
  if (event.type !== 'notify') return;

  const store = await readJson(storePath, { users: {} });

  for (const message of event.messages || []) {
    if (message.key?.fromMe) continue;
    const from = String(message.key?.remoteJid || '').split('@')[0];
    const text = getMessageText(message);
    if (!from || !text) continue;

    const userRecord = Object.values(store.users || {}).find((item) => normalizePhone(item.phone) === normalizePhone(from));
    if (!userRecord) continue;

    const lower = text.toLowerCase();
    const intent = lower.startsWith('done') || lower.startsWith('selesai')
      ? 'done'
      : lower.startsWith('skip')
        ? 'skip'
        : lower.startsWith('tunda') || lower.startsWith('snooze')
          ? 'snooze'
          : 'chat';

    await appendCommand({
      id: `cmd-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      userId: userRecord.userId,
      phone: normalizePhone(from),
      text,
      intent,
      createdAt: new Date().toISOString()
    });

    if (intent === 'done') {
      await sock.sendMessage(message.key.remoteJid, { text: 'Mantap. Aku catat respons *done* kamu di bridge Chroniq AI.' });
    } else if (intent === 'skip') {
      await sock.sendMessage(message.key.remoteJid, { text: 'Oke, aku catat *skip*. Nanti Chroniq bisa bantu re-optimize lagi.' });
    } else if (intent === 'snooze') {
      await sock.sendMessage(message.key.remoteJid, { text: 'Siap, aku catat permintaan tunda kamu.' });
    }
  }
}

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: false,
    logger: pino({ level: process.env.BAILEYS_LOG_LEVEL || 'silent' }),
    browser: ['Chroniq AI', 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('messages.upsert', handleIncomingMessages);
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQr = qr;
      currentQrDataUrl = await QRCode.toDataURL(qr);
      connectionState = 'qr';
      logger.info('Scan QR berikut dengan nomor WhatsApp Chroniq AI:');
      qrcodeTerminal.generate(qr, { small: true });
    }

    if (connection === 'open') {
      connectionState = 'connected';
      currentQr = null;
      currentQrDataUrl = null;
      lastConnectionAt = new Date().toISOString();
      logger.info('WhatsApp bridge connected.');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      connectionState = shouldReconnect ? 'reconnecting' : 'logged_out';
      logger.warn({ statusCode, shouldReconnect }, 'WhatsApp bridge disconnected.');
      if (shouldReconnect) {
        setTimeout(startWhatsApp, 3000);
      }
    }
  });
}

async function reminderTick() {
  const data = await readJson(storePath, { users: {} });
  let changed = false;

  for (const userRecord of Object.values(data.users || {})) {
    if (!userRecord.enabled || !userRecord.phone) continue;

    const timeZone = userRecord.timezone || DEFAULT_TIMEZONE;
    const now = localParts(new Date(), timeZone);
    const leadMinutes = Number(userRecord.leadMinutes || 15);

    for (const block of userRecord.schedule || []) {
      if (block.date !== now.date || block.type !== 'activity') continue;
      const startMinutes = timeToMinutes(block.planned_start);
      if (startMinutes === null) continue;

      const minutesUntil = startMinutes - now.minutes;
      const shouldSend = minutesUntil <= leadMinutes && minutesUntil >= 0;
      const reminderKey = `${block.id}:${block.date}:${block.planned_start}:${leadMinutes}`;

      if (!shouldSend || userRecord.sentReminders?.[reminderKey]) continue;

      try {
        await sendText(userRecord.phone, reminderMessage(userRecord, block, minutesUntil));
        userRecord.sentReminders = { ...(userRecord.sentReminders || {}), [reminderKey]: new Date().toISOString() };
        changed = true;
        logger.info({ userId: userRecord.userId, blockId: block.id }, 'Reminder sent.');
      } catch (error) {
        logger.error({ error: error.message, userId: userRecord.userId }, 'Failed to send reminder.');
      }
    }
  }

  if (changed) await writeJson(storePath, data);
}

function validateSyncPayload(body) {
  const userId = String(body?.user?.id || body?.userId || '').trim();
  const phone = normalizePhone(body?.phone);
  const schedule = Array.isArray(body?.schedule) ? body.schedule : [];
  const activities = Array.isArray(body?.activities) ? body.activities : [];

  if (!userId) return { ok: false, error: 'user.id wajib ada.' };
  if (body?.enabled && !phone) return { ok: false, error: 'Nomor WhatsApp wajib diisi saat reminder aktif.' };

  return {
    ok: true,
    record: {
      userId,
      name: String(body?.user?.name || 'Chroniq User'),
      phone,
      enabled: Boolean(body?.enabled),
      leadMinutes: Math.min(120, Math.max(1, Number(body?.leadMinutes || 15))),
      timezone: String(body?.timezone || DEFAULT_TIMEZONE),
      schedule: schedule.slice(0, 120),
      activities: activities.slice(0, 200),
      updatedAt: new Date().toISOString()
    }
  };
}

async function createServer() {
  await ensureDataFiles();
  await startWhatsApp();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/', (_req, res) => {
    res.json({ ok: true, service: 'Chroniq WhatsApp Bridge', state: connectionState });
  });

  app.get('/api/status', requireKey, (_req, res) => {
    res.json({
      ok: true,
      state: connectionState,
      hasQr: Boolean(currentQr),
      lastConnectionAt,
      timezone: DEFAULT_TIMEZONE
    });
  });

  app.get('/api/qr', requireKey, (_req, res) => {
    res.json({ ok: true, qr: currentQr, qrDataUrl: currentQrDataUrl, state: connectionState });
  });

  app.post('/api/schedules/sync', requireKey, async (req, res) => {
    const parsed = validateSyncPayload(req.body);
    if (!parsed.ok) return res.status(400).json({ ok: false, error: parsed.error });

    const data = await readJson(storePath, { users: {} });
    const previous = data.users[parsed.record.userId] || {};
    data.users[parsed.record.userId] = {
      ...previous,
      ...parsed.record,
      sentReminders: previous.sentReminders || {}
    };
    await writeJson(storePath, data);

    res.json({ ok: true, syncedAt: parsed.record.updatedAt, scheduleCount: parsed.record.schedule.length });
  });

  app.post('/api/messages/test', requireKey, async (req, res) => {
    const phone = normalizePhone(req.body?.phone);
    if (!phone) return res.status(400).json({ ok: false, error: 'Nomor WhatsApp tidak valid.' });

    await sendText(phone, `*${BOT_DISPLAY_NAME} aktif.*\n\nReminder WhatsApp kamu sudah terhubung. Nanti aku akan mengingatkan jadwal penting dari Chroniq.`);
    res.json({ ok: true, sentAt: new Date().toISOString() });
  });

  app.get('/api/commands', requireKey, async (_req, res) => {
    const data = await readJson(commandPath, { commands: [] });
    res.json({ ok: true, commands: data.commands || [] });
  });

  setInterval(() => {
    reminderTick().catch((error) => logger.error({ error: error.message }, 'Reminder tick failed.'));
  }, CHECK_INTERVAL_MS);

  app.listen(PORT, () => {
    logger.info(`Chroniq WhatsApp Bridge listening on port ${PORT}`);
  });
}

createServer().catch((error) => {
  logger.error(error, 'Failed to start Chroniq WhatsApp Bridge.');
  process.exit(1);
});

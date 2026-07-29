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
const CHRONIQ_APP_URL = (process.env.CHRONIQ_APP_URL || '').replace(/\/$/, '');
const ENABLE_CONFIRMATION_POLL = process.env.ENABLE_CONFIRMATION_POLL === 'true';
const MORNING_BRIEF_TIME = process.env.MORNING_BRIEF_TIME || '06:30';
const NIGHT_REFLECTION_TIME = process.env.NIGHT_REFLECTION_TIME || '21:30';
const ENABLE_CHRONIQ_AI_FEEDBACK = process.env.ENABLE_CHRONIQ_AI_FEEDBACK !== 'false';
const ENABLE_RICH_LINK_PREVIEW = process.env.ENABLE_RICH_LINK_PREVIEW === 'true';
const INCOMING_REPLY_WINDOW_MS = Number(process.env.INCOMING_REPLY_WINDOW_MINUTES || 30) * 60_000;
const ALLOW_SELF_CHAT_COMMANDS = process.env.ALLOW_SELF_CHAT_COMMANDS === 'true';

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

function unwrapMessageContent(payload) {
  let content = payload;
  for (let depth = 0; depth < 5; depth += 1) {
    const next =
      content?.ephemeralMessage?.message ||
      content?.viewOnceMessage?.message ||
      content?.viewOnceMessageV2?.message ||
      content?.documentWithCaptionMessage?.message ||
      content?.editedMessage?.message ||
      content?.protocolMessage?.editedMessage?.message;

    if (!next || next === content) break;
    content = next;
  }
  return content;
}

function getMessageText(message) {
  const payload = unwrapMessageContent(message?.message);
  const interactiveParams = payload?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;

  if (interactiveParams) {
    try {
      const parsed = JSON.parse(interactiveParams);
      return String(parsed?.id || parsed?.display_text || parsed?.title || interactiveParams).trim();
    } catch {
      return String(interactiveParams).trim();
    }
  }

  return (
    payload?.conversation ||
    payload?.extendedTextMessage?.text ||
    payload?.imageMessage?.caption ||
    payload?.videoMessage?.caption ||
    payload?.buttonsResponseMessage?.selectedDisplayText ||
    payload?.buttonsResponseMessage?.selectedButtonId ||
    payload?.templateButtonReplyMessage?.selectedDisplayText ||
    payload?.templateButtonReplyMessage?.selectedId ||
    payload?.listResponseMessage?.title ||
    ''
  ).trim();
}

function getMessageTimestampMs(message) {
  const timestamp = message?.messageTimestamp;
  const seconds =
    typeof timestamp === 'number'
      ? timestamp
      : typeof timestamp?.toNumber === 'function'
        ? timestamp.toNumber()
        : Number(timestamp || 0);

  return seconds ? seconds * 1000 : 0;
}

function uniqueSyncedPhones(store) {
  return [...new Set(
    Object.values(store.users || {})
      .filter((item) => item.enabled && item.phone)
      .map((item) => normalizePhone(item.phone))
      .filter(Boolean)
  )];
}

function findUserRecordByPhone(store, phone, remoteJid) {
  const users = Object.values(store.users || {});
  const exact = users.find((item) => normalizePhone(item.phone) === phone);
  if (exact) return exact;

  if (remoteJid.endsWith('@lid')) {
    const enabledUsers = users.filter((item) => item.enabled && item.phone);
    const phones = uniqueSyncedPhones(store);
    if (phones.length === 1) {
      logger.warn({ remoteJid, mappedPhone: phone, syncedPhone: phones[0] }, 'Using only synced user as fallback for LID reply.');
      return enabledUsers.find((item) => normalizePhone(item.phone) === phones[0]) || null;
    }
  }

  return null;
}

async function phoneFromRemoteJid(remoteJid, store) {
  if (remoteJid.endsWith('@s.whatsapp.net')) {
    return normalizePhone(remoteJid.split('@')[0]);
  }

  if (remoteJid.endsWith('@lid')) {
    try {
      const pnJid = await sock?.signalRepository?.lidMapping?.getPNForLID?.(remoteJid);
      if (pnJid) return normalizePhone(String(pnJid).split('@')[0]);
    } catch (error) {
      logger.debug({ error: error.message }, 'Failed to resolve LID to phone number.');
    }

    const phones = uniqueSyncedPhones(store);
    if (phones.length === 1) {
      logger.warn({ remoteJid }, 'Using the only synced phone as fallback for LID reply.');
      return phones[0];
    }
  }

  return normalizePhone(remoteJid.split('@')[0]);
}

function detectIntent(lower, userRecord) {
  const isReflectionReply = userRecord.lastPrompt?.type === 'night-reflection' && ['1', '2', '3'].includes(lower);
  if (isReflectionReply) return 'reflection';
  if (lower === '1' || lower.includes('selesai') || lower.startsWith('done')) return 'done';
  if (lower === '3' || lower.startsWith('skip')) return 'skip';
  if (lower === '2' || lower.startsWith('tunda') || lower.startsWith('snooze')) return 'snooze';
  if (lower === 'plan' || lower.includes('jadwal hari ini')) return 'share_plan';
  if (lower.includes('capek') || lower.includes('kacau') || lower.includes('fokus')) return 'reflection';
  return 'chat';
}

function isSelfChatCommandCandidate(lower) {
  const compact = lower.replace(/\s+/g, ' ').trim();
  return (
    ['1', '2', '3', 'done', 'selesai', 'skip', 'plan', 'tunda', 'snooze'].includes(compact) ||
    /^done[.!?]*$/.test(compact) ||
    /^skip[.!?]*$/.test(compact) ||
    /^tunda( \d{1,3})?[.!?]*$/.test(compact) ||
    /^snooze( \d{1,3})?[.!?]*$/.test(compact)
  );
}

function findActivityName(userRecord, block) {
  if (block.type === 'fixed') return block.title || 'Jadwal tetap';
  if (block.type !== 'activity') return block.type || 'Aktivitas';
  const activity = userRecord.activities?.find((item) => item.id === block.activity_id);
  return activity?.name || 'Tugas Chroniq';
}

function blockDuration(block) {
  const start = timeToMinutes(block?.planned_start);
  const end = timeToMinutes(block?.planned_end);
  if (start === null || end === null) return 0;
  return Math.max(0, end - start);
}

function findActivity(userRecord, block) {
  return userRecord.activities?.find((item) => item.id === block.activity_id);
}

function dashboardUrl() {
  return CHRONIQ_APP_URL ? `${CHRONIQ_APP_URL}/` : '';
}

function priorityLabel(priority) {
  const value = Number(priority || 3);
  if (value >= 5) return 'Prioritas utama';
  if (value >= 4) return 'Prioritas tinggi';
  if (value <= 2) return 'Santai';
  return 'Prioritas sedang';
}

function formatDuration(minutes) {
  const value = Number(minutes || 0);
  if (!value) return '';
  if (value < 60) return `${value} menit`;
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest ? `${hours} jam ${rest} menit` : `${hours} jam`;
}

function reminderOffsets(userRecord, block) {
  const activity = findActivity(userRecord, block);
  const base = Math.min(120, Math.max(1, Number(userRecord.leadMinutes || 15)));
  const category = String(activity?.category || '').toLowerCase();
  const priority = Number(activity?.priority || 3);
  const duration = Number(activity?.target_duration || blockDuration(block));
  const offsets = new Set([base]);

  if (priority >= 4) offsets.add(30);
  if (priority >= 5 || category.includes('belajar') || category.includes('analitis')) offsets.add(10);
  if (duration >= 90) offsets.add(60);

  return [...offsets].filter((value) => value > 0).sort((a, b) => b - a).slice(0, 3);
}

function reminderMessage(userRecord, block, minutesUntil) {
  const taskName = findActivityName(userRecord, block);
  const activity = findActivity(userRecord, block);
  const checklist = activity?.checklists?.filter((item) => !item.is_completed).slice(0, 3) || [];
  const checklistText = checklist.length
    ? `\n\n*Langkah kecil*\n${checklist.map((item, index) => `${index + 1}. ${item.title}`).join('\n')}`
    : '';
  const durationText = formatDuration(activity?.target_duration);
  const openUrl = dashboardUrl();
  const focusLine = activity?.category?.toLowerCase().includes('belajar')
    ? 'Mulai dari bagian paling kecil dulu. Targetnya bukan sempurna, targetnya mulai.'
    : 'Ambil 1 langkah paling jelas dulu, lalu biarkan momentum jalan.';

  return [
    `*${BOT_DISPLAY_NAME} Reminder*`,
    '━━━━━━━━━━━━━━',
    '',
    `${minutesUntil <= 0 ? 'Mulai sekarang' : `${minutesUntil} menit lagi`}`,
    `*${taskName}*`,
    '',
    `Jam: ${block.planned_start}-${block.planned_end}`,
    durationText ? `Durasi: ${durationText}` : '',
    activity?.priority ? `Level: ${priorityLabel(activity.priority)}` : '',
    activity?.category ? `Mode: ${activity.category}` : '',
    checklistText,
    '',
    `_${focusLine}_`,
    '',
    '*Konfirmasi cepat*',
    '1. Selesai',
    '2. Tunda 15 menit',
    '3. Skip dulu',
    openUrl ? `\nBuka Chroniq: ${openUrl}` : '',
    '',
    'Balas angka, *done*, *tunda 15*, atau *skip*.'
  ].filter(Boolean).join('\n');
}

function testMessage() {
  const openUrl = dashboardUrl();
  return [
    `*${BOT_DISPLAY_NAME} aktif*`,
    '━━━━━━━━━━━━━━',
    '',
    'Reminder WhatsApp kamu sudah terhubung.',
    'Nanti aku akan mengingatkan jadwal penting dari Chroniq dengan format yang lebih rapi dan bisa dikonfirmasi cepat.',
    '',
    '*Quick action yang bisa kamu balas:*',
    '1 / done = tandai selesai',
    '2 / tunda 15 = minta tunda',
    '3 / skip = lewati dulu',
    openUrl ? `\nBuka Chroniq: ${openUrl}` : ''
  ].filter(Boolean).join('\n');
}

function scheduleBlocksForToday(userRecord, date) {
  return (userRecord.schedule || [])
    .filter((block) => block.date === date && block.type === 'activity')
    .sort((a, b) => String(a.planned_start).localeCompare(String(b.planned_start)));
}

function planSummaryMessage(userRecord, date = localParts(new Date(), userRecord.timezone || DEFAULT_TIMEZONE).date) {
  const blocks = scheduleBlocksForToday(userRecord, date);
  const openUrl = dashboardUrl();

  if (!blocks.length) {
    return [
      `*${BOT_DISPLAY_NAME} Plan*`,
      '━━━━━━━━━━━━━━',
      '',
      'Belum ada jadwal aktif untuk hari ini.',
      openUrl ? `Buka Chroniq: ${openUrl}` : ''
    ].filter(Boolean).join('\n');
  }

  const topPriority = [...blocks]
    .map((block) => ({ block, activity: findActivity(userRecord, block) }))
    .sort((a, b) => Number(b.activity?.priority || 0) - Number(a.activity?.priority || 0))[0];

  return [
    `*${BOT_DISPLAY_NAME} Plan Hari Ini*`,
    '━━━━━━━━━━━━━━',
    '',
    `Total: ${blocks.length} fokus terjadwal`,
    topPriority ? `Fokus utama: *${findActivityName(userRecord, topPriority.block)}*` : '',
    '',
    ...blocks.slice(0, 8).map((block, index) => `${index + 1}. ${block.planned_start}-${block.planned_end} · ${findActivityName(userRecord, block)}`),
    blocks.length > 8 ? `\n+${blocks.length - 8} jadwal lain di Chroniq.` : '',
    openUrl ? `\nBuka Chroniq: ${openUrl}` : '',
    '',
    'Balas *plan* kapan saja untuk minta ringkasan ini lagi.'
  ].filter(Boolean).join('\n');
}

function morningBriefMessage(userRecord, date) {
  const blocks = scheduleBlocksForToday(userRecord, date);
  const firstBlock = blocks[0];
  const topPriority = [...blocks]
    .map((block) => ({ block, activity: findActivity(userRecord, block) }))
    .sort((a, b) => Number(b.activity?.priority || 0) - Number(a.activity?.priority || 0))[0];

  return [
    `*${BOT_DISPLAY_NAME} Morning Brief*`,
    '━━━━━━━━━━━━━━',
    '',
    blocks.length ? `Hari ini ada *${blocks.length}* fokus terjadwal.` : 'Hari ini belum ada jadwal aktif.',
    topPriority ? `Prioritas utama: *${findActivityName(userRecord, topPriority.block)}*` : '',
    firstBlock ? `Mulai pertama: ${firstBlock.planned_start} · ${findActivityName(userRecord, firstBlock)}` : '',
    '',
    blocks.length ? 'Strategi hari ini: mulai kecil, jangan tunggu mood sempurna.' : 'Buka Chroniq untuk menyusun ritme hari ini.',
    dashboardUrl() ? `\nBuka Chroniq: ${dashboardUrl()}` : ''
  ].filter(Boolean).join('\n');
}

function nightReflectionMessage() {
  return [
    `*${BOT_DISPLAY_NAME} Night Reflection*`,
    '━━━━━━━━━━━━━━',
    '',
    'Hari ini ritmemu gimana?',
    '',
    '1. Fokus',
    '2. Capek',
    '3. Kacau',
    '',
    'Balas angka. Chroniq akan menyimpan sinyal ini untuk bahan adaptasi jadwal berikutnya.'
  ].join('\n');
}

function commandFeedbackFallback(intent, userRecord, commandText) {
  const taskName = userRecord.lastReminder?.taskName;
  const openUrl = dashboardUrl();

  if (intent === 'done') {
    return [
      '*Konfirmasi diterima.*',
      '',
      taskName ? `Aku catat *${taskName}* sebagai selesai.` : 'Aku catat tugas terakhir sebagai selesai.',
      'Saat dashboard Chroniq aktif, statusnya akan disinkronkan otomatis.',
      '',
      'Nice. Satu langkah selesai, ritme kamu tetap jalan.',
      openUrl ? `\nBuka Chroniq: ${openUrl}` : ''
    ].filter(Boolean).join('\n');
  }

  if (intent === 'skip') {
    return [
      '*Skip diterima.*',
      '',
      taskName ? `Aku catat *${taskName}* sebagai dilewati dulu.` : 'Aku catat tugas terakhir sebagai dilewati dulu.',
      'Chroniq akan menyimpan sinyal ini supaya jadwal berikutnya tetap realistis.',
      openUrl ? `\nBuka Chroniq: ${openUrl}` : ''
    ].filter(Boolean).join('\n');
  }

  if (intent === 'snooze') {
    return [
      '*Tunda diterima.*',
      '',
      taskName ? `Aku catat penundaan untuk *${taskName}*.` : 'Aku catat permintaan tunda kamu.',
      `Detail balasan: "${commandText}"`,
      'Saat dashboard Chroniq aktif, perubahan ini akan disinkronkan.',
      openUrl ? `\nBuka Chroniq: ${openUrl}` : ''
    ].filter(Boolean).join('\n');
  }

  if (intent === 'reflection') {
    return [
      '*Refleksi diterima.*',
      '',
      `Aku simpan sinyal energi kamu: "${commandText}".`,
      'Ini akan membantu Chroniq memahami ritme harianmu.'
    ].join('\n');
  }

  return [
    '*Aku terima balasanmu.*',
    '',
    'Untuk aksi cepat, balas:',
    '1 / done = selesai',
    '2 / tunda 15 = tunda',
    '3 / skip = lewati'
  ].join('\n');
}

async function chroniqAiFeedback(intent, userRecord, commandText) {
  if (!ENABLE_CHRONIQ_AI_FEEDBACK || !CHRONIQ_APP_URL) {
    return commandFeedbackFallback(intent, userRecord, commandText);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);

  try {
    const today = localParts(new Date(), userRecord.timezone || DEFAULT_TIMEZONE).date;
    const response = await fetch(`${CHRONIQ_APP_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: [
            `User membalas WhatsApp reminder Chroniq dengan intent "${intent}".`,
            `Balasan user: "${commandText}".`,
            userRecord.lastReminder?.taskName ? `Task terkait: ${userRecord.lastReminder.taskName}.` : '',
            'Buat feedback WhatsApp super singkat, hangat, dan jelas dalam Bahasa Indonesia.',
            'Maksimal 4 baris. Jangan sebut provider AI. Jangan pakai command JSON.'
          ].filter(Boolean).join('\n')
        }],
        context: {
          level: 1,
          exp: 0,
          currentStreak: 0,
          burnoutRisk: 0,
          pendingActivitiesCount: userRecord.activities?.length || 0,
          upcomingTasksCount: scheduleBlocksForToday(userRecord, today).length,
          activeTasks: (userRecord.activities || []).slice(0, 20),
          todayTimeline: scheduleBlocksForToday(userRecord, today).slice(0, 12),
          energyZones: 'WhatsApp reminder context'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Chroniq AI feedback endpoint returned ${response.status}`);
    }

    const data = await response.json();
    if (data?.mode === 'offline' || data?.mode === 'offline-fallback') {
      logger.warn({ mode: data.mode }, 'Chroniq AI feedback endpoint is in offline mode; using WhatsApp fallback feedback.');
      return commandFeedbackFallback(intent, userRecord, commandText);
    }

    const reply = String(data?.reply || '').replace(/```json[\s\S]*?```/g, '').trim();
    return reply || commandFeedbackFallback(intent, userRecord, commandText);
  } catch (error) {
    logger.warn({ error: error.message }, 'Chroniq AI feedback failed; using fallback feedback.');
    return commandFeedbackFallback(intent, userRecord, commandText);
  } finally {
    clearTimeout(timer);
  }
}

async function sendText(phone, text) {
  if (!sock || connectionState !== 'connected') {
    throw new Error('WhatsApp belum connected. Scan QR bridge dulu.');
  }

  const jid = toJid(phone);
  if (!jid) throw new Error('Nomor WhatsApp tidak valid.');

  const payload = { text };

  // Keep production delivery close to a normal manually typed WhatsApp message.
  // Rich previews/externalAdReply are prettier, but unofficial WA clients can
  // occasionally leave those messages stuck at one checkmark.
  if (ENABLE_RICH_LINK_PREVIEW && CHRONIQ_APP_URL) {
    payload.contextInfo = {
      externalAdReply: {
        title: BOT_DISPLAY_NAME,
        body: 'Smart schedule reminder',
        mediaType: 1,
        sourceUrl: CHRONIQ_APP_URL,
        showAdAttribution: false,
        renderLargerThumbnail: false
      }
    };
  }

  await sock.sendPresenceUpdate('available', jid).catch(() => {});
  await sock.sendMessage(jid, payload);
}

async function sendConfirmationPoll(phone, taskName) {
  if (!ENABLE_CONFIRMATION_POLL) return;

  const jid = toJid(phone);
  if (!jid) return;

  await sock.sendMessage(jid, {
    poll: {
      name: `Konfirmasi: ${taskName}`,
      values: ['Selesai', 'Tunda 15 menit', 'Skip dulu'],
      selectableCount: 1
    }
  });
}

async function sendReminder(phone, userRecord, block, minutesUntil) {
  const taskName = findActivityName(userRecord, block);
  userRecord.lastReminder = {
    blockId: block.id,
    activityId: block.activity_id,
    taskName,
    plannedStart: block.planned_start,
    plannedEnd: block.planned_end,
    date: block.date,
    sentAt: new Date().toISOString()
  };
  await sendText(phone, reminderMessage(userRecord, block, minutesUntil));

  try {
    await sendConfirmationPoll(phone, taskName);
  } catch (error) {
    logger.warn({ error: error.message }, 'Confirmation poll failed; text quick actions are still available.');
  }
}

async function appendCommand(command) {
  const data = await readJson(commandPath, { commands: [] });
  data.commands = [command, ...(data.commands || [])].slice(0, 200);
  await writeJson(commandPath, data);
}

async function ackCommands(ids) {
  const normalizedIds = new Set((Array.isArray(ids) ? ids : []).map((id) => String(id)).filter(Boolean));
  if (!normalizedIds.size) return 0;

  const data = await readJson(commandPath, { commands: [] });
  const before = data.commands?.length || 0;
  data.commands = (data.commands || []).filter((command) => !normalizedIds.has(command.id));
  await writeJson(commandPath, data);
  return before - data.commands.length;
}

async function handleIncomingMessages(event) {
  const store = await readJson(storePath, { users: {} });

  for (const message of event.messages || []) {
    const remoteJid = String(message.key?.remoteJid || '');
    if (!remoteJid.endsWith('@s.whatsapp.net') && !remoteJid.endsWith('@lid')) continue;

    const messageAtMs = getMessageTimestampMs(message);
    const isFresh = !messageAtMs || Date.now() - messageAtMs <= INCOMING_REPLY_WINDOW_MS;
    if (event.type !== 'notify' && !isFresh) continue;

    const text = getMessageText(message);
    if (!text) {
      logger.debug({ eventType: event.type, remoteJid }, 'Incoming WhatsApp message ignored because text is empty.');
      continue;
    }
    const lower = text.toLowerCase().trim();

    if (message.key?.fromMe && (!ALLOW_SELF_CHAT_COMMANDS || !isSelfChatCommandCandidate(lower))) {
      logger.debug({ eventType: event.type, remoteJid }, 'Own WhatsApp message ignored.');
      continue;
    }

    const from = await phoneFromRemoteJid(remoteJid, store);
    const userRecord = findUserRecordByPhone(store, from, remoteJid);
    if (!userRecord) {
      logger.warn({ eventType: event.type, remoteJid, from }, 'Incoming WhatsApp reply ignored because phone is not synced.');
      continue;
    }

    const intent = detectIntent(lower, userRecord);

    const command = {
      id: `cmd-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      userId: userRecord.userId,
      phone: normalizePhone(userRecord.phone || from),
      text,
      intent,
      context: userRecord.lastReminder || null,
      createdAt: new Date().toISOString()
    };
    await appendCommand(command);
    logger.info({ eventType: event.type, userId: userRecord.userId, intent }, 'Incoming WhatsApp command received.');

    if (intent === 'done') {
      await sock.sendMessage(message.key.remoteJid, {
        text: await chroniqAiFeedback(intent, userRecord, text)
      });
    } else if (intent === 'skip') {
      await sock.sendMessage(message.key.remoteJid, {
        text: await chroniqAiFeedback(intent, userRecord, text)
      });
    } else if (intent === 'snooze') {
      await sock.sendMessage(message.key.remoteJid, {
        text: await chroniqAiFeedback(intent, userRecord, text)
      });
    } else if (intent === 'share_plan') {
      await sock.sendMessage(message.key.remoteJid, { text: planSummaryMessage(userRecord) });
    } else if (intent === 'reflection') {
      await sock.sendMessage(message.key.remoteJid, {
        text: await chroniqAiFeedback(intent, userRecord, text)
      });
    } else {
      await sock.sendMessage(message.key.remoteJid, {
        text: await chroniqAiFeedback(intent, userRecord, text)
      });
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

    for (const block of userRecord.schedule || []) {
      if (block.date !== now.date || block.type !== 'activity') continue;
      const startMinutes = timeToMinutes(block.planned_start);
      if (startMinutes === null) continue;

      const minutesUntil = startMinutes - now.minutes;
      for (const offset of reminderOffsets(userRecord, block)) {
        const shouldSend = minutesUntil <= offset && minutesUntil >= Math.max(0, offset - 1);
        const reminderKey = `${block.id}:${block.date}:${block.planned_start}:reminder:${offset}`;

        if (!shouldSend || userRecord.sentReminders?.[reminderKey]) continue;

        try {
          await sendReminder(userRecord.phone, userRecord, block, minutesUntil);
          userRecord.sentReminders = { ...(userRecord.sentReminders || {}), [reminderKey]: new Date().toISOString() };
          changed = true;
          logger.info({ userId: userRecord.userId, blockId: block.id, offset }, 'Reminder sent.');
        } catch (error) {
          logger.error({ error: error.message, userId: userRecord.userId }, 'Failed to send reminder.');
        }
      }
    }

    const morningMinutes = timeToMinutes(MORNING_BRIEF_TIME);
    if (morningMinutes !== null && now.minutes >= morningMinutes && now.minutes <= morningMinutes + 1) {
      const reminderKey = `morning-brief:${now.date}`;
      if (!userRecord.sentReminders?.[reminderKey]) {
        try {
          await sendText(userRecord.phone, morningBriefMessage(userRecord, now.date));
          userRecord.sentReminders = { ...(userRecord.sentReminders || {}), [reminderKey]: new Date().toISOString() };
          changed = true;
        } catch (error) {
          logger.error({ error: error.message, userId: userRecord.userId }, 'Failed to send morning brief.');
        }
      }
    }

    const nightMinutes = timeToMinutes(NIGHT_REFLECTION_TIME);
    if (nightMinutes !== null && now.minutes >= nightMinutes && now.minutes <= nightMinutes + 1) {
      const reminderKey = `night-reflection:${now.date}`;
      if (!userRecord.sentReminders?.[reminderKey]) {
        try {
          userRecord.lastPrompt = {
            type: 'night-reflection',
            date: now.date,
            sentAt: new Date().toISOString()
          };
          await sendText(userRecord.phone, nightReflectionMessage());
          userRecord.sentReminders = { ...(userRecord.sentReminders || {}), [reminderKey]: new Date().toISOString() };
          changed = true;
        } catch (error) {
          logger.error({ error: error.message, userId: userRecord.userId }, 'Failed to send night reflection.');
        }
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

    await sendText(phone, testMessage());
    try {
      await sendConfirmationPoll(phone, 'Test reminder Chroniq');
    } catch (error) {
      logger.warn({ error: error.message }, 'Test confirmation poll failed.');
    }
    res.json({ ok: true, sentAt: new Date().toISOString() });
  });

  app.post('/api/messages/share-plan', requireKey, async (req, res) => {
    const userId = String(req.body?.userId || '').trim();
    const data = await readJson(storePath, { users: {} });
    const userRecord = data.users[userId];

    if (!userRecord) {
      return res.status(404).json({ ok: false, error: 'Jadwal user belum tersinkron ke bridge.' });
    }

    await sendText(userRecord.phone, planSummaryMessage(userRecord));
    res.json({ ok: true, sentAt: new Date().toISOString() });
  });

  app.get('/api/commands', requireKey, async (_req, res) => {
    const data = await readJson(commandPath, { commands: [] });
    res.json({ ok: true, commands: data.commands || [] });
  });

  app.post('/api/commands/ack', requireKey, async (req, res) => {
    const acked = await ackCommands(req.body?.ids);
    res.json({ ok: true, acked });
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

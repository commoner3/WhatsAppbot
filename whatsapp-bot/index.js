require('dotenv').config();

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

const { handleGroupCommand, handleTagAll, autoModerate } = require('./lib/groupManager');
const { handleSaveCommand } = require('./lib/media');
const { startNumberGame, handleGuess, playRockPaperScissors } = require('./lib/games');
const { createPairingServer } = require('./web/server');
const { callAI, translateText } = require('./lib/ai');
const { setProfilePictureIfNeeded } = require('./lib/profile');
const { logEvent } = require('./lib/analytics');
const { SUPPORTED_LANGUAGES, setLanguage, getLanguage } = require('./lib/language');
const { handleVcfCommand } = require('./lib/vcf');
const { handleGroupParticipantsUpdate } = require('./lib/greetings');
const { storeMessage, handlePossibleDelete } = require('./lib/antidelete');
const { checkCooldown } = require('./lib/ratelimit');
const { handleBroadcast } = require('./lib/broadcast');

const AI_COOLDOWN_MS = 10 * 1000; // per-user cooldown for !ai / !joke / !translate

const logger = pino({ level: 'silent' });

// Set to true to use the web pairing-code flow instead of scanning a QR in the terminal.
const USE_PAIRING_CODE = true;
const WEB_PORT = process.env.PORT || 3000;

let currentSock = null; // shared with web/server.js so it can call requestPairingCode()

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: !USE_PAIRING_CODE,
  });

  currentSock = sock;

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !USE_PAIRING_CODE) {
      console.log('Scan this QR code with WhatsApp (Linked Devices > Link a device):');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed.', statusCode, 'Reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        startBot();
      } else {
        console.log('Logged out. Delete the auth_info folder and restart to log in again.');
      }
    } else if (connection === 'open') {
      console.log('✅ Connected to WhatsApp');
      setProfilePictureIfNeeded(sock);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('group-participants.update', (update) => {
    handleGroupParticipantsUpdate(sock, update);
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const wasDeleteNotice = await handlePossibleDelete(sock, msg);
      if (wasDeleteNotice) continue;

      const jid = msg.key.remoteJid;
      logEvent('message', { jid, isGroup: jid.endsWith('@g.us') });
      storeMessage(msg);

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        '';

      // Anti-spam / auto-kick check runs on every group message, even without a command
      if (text) {
        const handled = await autoModerate(sock, msg, text);
        if (handled) continue;
      }

      if (!text) continue;

      const [command, ...args] = text.trim().split(/\s+/);
      const lower = command.toLowerCase();

      if (lower.startsWith('!')) {
        logEvent('command', { jid, isGroup: jid.endsWith('@g.us'), command: lower });
      }

      console.log(`📩 ${jid}: ${text}`);

      if (lower === '!ping') {
        await sock.sendMessage(jid, { text: 'pong 🏓' });
      } else if (lower === '!help') {
        await sock.sendMessage(jid, {
          text: [
            'Available commands:',
            '!ping - test the bot',
            '',
            'Group management (admins only):',
            '!kick (reply/tag) - remove a member',
            '!add <number> - add a member by phone number',
            '!promote / !demote (reply/tag) - change admin status',
            '!tagall [message] - mention every group member',
            '!vcf - export all group members as a .vcf contact file',
            '',
            'Owner only:',
            '!broadcast <message> - send an announcement to every group the bot is in',
            '',
            'Media:',
            '!save (reply to media) - save it to the server',
            '',
            'Games:',
            '!numguess - start a number guessing game',
            '!guess <number> - make a guess',
            '!rps rock|paper|scissors - play rock-paper-scissors',
            '',
            'AI & language:',
            '!ai <message> - chat with the AI',
            '!joke - get an AI-generated joke',
            '!lang <language> - set reply language for !ai/!joke (english, twi, ga, ewe, fante, dagbani, hausa, dagaare, nzema, pidgin)',
            '!translate <language> <text> - translate text',
          ].join('\n'),
        });
      } else if (['!kick', '!add', '!promote', '!demote'].includes(lower)) {
        await handleGroupCommand(sock, msg, lower, args);
      } else if (lower === '!tagall') {
        await handleTagAll(sock, msg, args.join(' '));
      } else if (lower === '!vcf') {
        await handleVcfCommand(sock, msg);
      } else if (lower === '!save') {
        await handleSaveCommand(sock, msg);
      } else if (lower === '!numguess') {
        await sock.sendMessage(jid, { text: startNumberGame(jid) });
      } else if (lower === '!guess') {
        await sock.sendMessage(jid, { text: handleGuess(jid, args[0]) });
      } else if (lower === '!rps') {
        await sock.sendMessage(jid, { text: playRockPaperScissors(args[0]) });
      } else if (lower === '!ai') {
        const prompt = args.join(' ');
        const sender = msg.key.participant || jid;
        const cooldown = checkCooldown(`ai:${sender}`, AI_COOLDOWN_MS);
        if (!prompt) {
          await sock.sendMessage(jid, { text: 'Usage: !ai <your message>' });
        } else if (!cooldown.allowed) {
          await sock.sendMessage(jid, {
            text: `Slow down a bit — try again in ${Math.ceil(cooldown.waitMs / 1000)}s.`,
          });
        } else {
          const reply = await callAI(prompt, getLanguage(jid));
          await sock.sendMessage(jid, { text: reply });
        }
      } else if (lower === '!joke') {
        const sender = msg.key.participant || jid;
        const cooldown = checkCooldown(`ai:${sender}`, AI_COOLDOWN_MS);
        if (!cooldown.allowed) {
          await sock.sendMessage(jid, {
            text: `Slow down a bit — try again in ${Math.ceil(cooldown.waitMs / 1000)}s.`,
          });
        } else {
          const reply = await callAI('Tell a short, clean joke.', getLanguage(jid));
          await sock.sendMessage(jid, { text: reply });
        }
      } else if (lower === '!lang') {
        if (!args.length) {
          await sock.sendMessage(jid, {
            text: `Current language: ${getLanguage(jid)}\nSupported: ${SUPPORTED_LANGUAGES.join(', ')}\nUsage: !lang <language>`,
          });
        } else {
          const applied = setLanguage(jid, args[0]);
          if (!applied) {
            await sock.sendMessage(jid, {
              text: `Unsupported language. Choose from: ${SUPPORTED_LANGUAGES.join(', ')}`,
            });
          } else {
            await sock.sendMessage(jid, { text: `Language set to ${applied}. !ai and !joke will reply in it.` });
          }
        }
      } else if (lower === '!translate') {
        const targetLang = args[0];
        const text2translate = args.slice(1).join(' ');
        const sender = msg.key.participant || jid;
        const cooldown = checkCooldown(`ai:${sender}`, AI_COOLDOWN_MS);
        if (!targetLang || !text2translate) {
          await sock.sendMessage(jid, { text: 'Usage: !translate <language> <text>' });
        } else if (!cooldown.allowed) {
          await sock.sendMessage(jid, {
            text: `Slow down a bit — try again in ${Math.ceil(cooldown.waitMs / 1000)}s.`,
          });
        } else {
          const translated = await translateText(text2translate, targetLang);
          await sock.sendMessage(jid, { text: translated });
        }
      } else if (lower === '!broadcast') {
        await handleBroadcast(sock, msg, args.join(' '));
      }
    }
  });

  return sock;
}

startBot().catch((err) => console.error('Fatal error starting bot:', err));

if (USE_PAIRING_CODE) {
  createPairingServer(() => currentSock, WEB_PORT);
}

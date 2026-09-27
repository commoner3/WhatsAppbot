// lib/groupManager.js
// Handles group admin actions. All destructive actions require the sender to be a group admin.

const { createStore } = require('./store');

const warnings = createStore('warnings.json'); // "groupId:senderJid" -> count
const MAX_WARNINGS = 3;

async function isSenderAdmin(sock, groupId, senderJid) {
  const metadata = await sock.groupMetadata(groupId);
  const participant = metadata.participants.find((p) => p.id === senderJid);
  return participant?.admin === 'admin' || participant?.admin === 'superadmin';
}

// Extracts JIDs either from an @mention in the message or from the quoted/replied-to message's author
function getTargetJids(msg) {
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentioned.length) return mentioned;

  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quotedParticipant) return [quotedParticipant];

  return [];
}

async function handleGroupCommand(sock, msg, command, args) {
  const groupId = msg.key.remoteJid;
  if (!groupId.endsWith('@g.us')) {
    await sock.sendMessage(groupId, { text: 'This command only works inside a group.' });
    return;
  }

  const sender = msg.key.participant || msg.key.remoteJid;
  const senderIsAdmin = await isSenderAdmin(sock, groupId, sender);

  if (!senderIsAdmin) {
    await sock.sendMessage(groupId, { text: 'Only group admins can use this command.' });
    return;
  }

  if (command === '!kick') {
    const targets = getTargetJids(msg);
    if (!targets.length) {
      await sock.sendMessage(groupId, { text: 'Tag or reply to the member you want to kick.' });
      return;
    }
    await sock.groupParticipantsUpdate(groupId, targets, 'remove');
    await sock.sendMessage(groupId, { text: `Removed ${targets.length} member(s).` });
  } else if (command === '!add') {
    // args should be phone numbers, e.g. !add 15551234567 15559876543
    const numbers = args.filter((a) => /^\d+$/.test(a));
    if (!numbers.length) {
      await sock.sendMessage(groupId, {
        text: 'Usage: !add <phone_number_with_country_code> [more numbers...]',
      });
      return;
    }
    const jids = numbers.map((n) => `${n}@s.whatsapp.net`);
    const result = await sock.groupParticipantsUpdate(groupId, jids, 'add');
    await sock.sendMessage(groupId, { text: `Add result: ${JSON.stringify(result)}` });
  } else if (command === '!promote') {
    const targets = getTargetJids(msg);
    if (!targets.length) {
      await sock.sendMessage(groupId, { text: 'Tag or reply to the member you want to promote.' });
      return;
    }
    await sock.groupParticipantsUpdate(groupId, targets, 'promote');
    await sock.sendMessage(groupId, { text: 'Member(s) promoted to admin.' });
  } else if (command === '!demote') {
    const targets = getTargetJids(msg);
    if (!targets.length) {
      await sock.sendMessage(groupId, { text: 'Tag or reply to the member you want to demote.' });
      return;
    }
    await sock.groupParticipantsUpdate(groupId, targets, 'demote');
    await sock.sendMessage(groupId, { text: 'Member(s) demoted.' });
  }
}

// Tags every member of the group in one message (admins only, to avoid spam abuse).
async function handleTagAll(sock, msg, announcement) {
  const groupId = msg.key.remoteJid;
  if (!groupId.endsWith('@g.us')) {
    await sock.sendMessage(groupId, { text: 'This command only works inside a group.' });
    return;
  }

  const sender = msg.key.participant || msg.key.remoteJid;
  const senderIsAdmin = await isSenderAdmin(sock, groupId, sender);
  if (!senderIsAdmin) {
    await sock.sendMessage(groupId, { text: 'Only group admins can use this command.' });
    return;
  }

  const metadata = await sock.groupMetadata(groupId);
  const mentions = metadata.participants.map((p) => p.id);
  const mentionText = mentions.map((jid) => `@${jid.split('@')[0]}`).join(' ');
  const body = announcement ? `${announcement}\n\n${mentionText}` : mentionText;

  await sock.sendMessage(groupId, { text: body, mentions });
}

// Anti-spam: warns non-admins who post a WhatsApp group invite link, kicking after MAX_WARNINGS.
// Add more conditions here (banned words, other link patterns, etc.) as needed.
async function autoModerate(sock, msg, text) {
  const groupId = msg.key.remoteJid;
  if (!groupId.endsWith('@g.us')) return false;

  const sender = msg.key.participant || msg.key.remoteJid;
  const senderIsAdmin = await isSenderAdmin(sock, groupId, sender);
  if (senderIsAdmin) return false; // never moderate admins

  const containsInviteLink = /chat\.whatsapp\.com\/[A-Za-z0-9]+/i.test(text);
  if (!containsInviteLink) return false;

  const warnKey = `${groupId}:${sender}`;
  const count = warnings.get(warnKey, 0) + 1;
  const senderNumber = sender.split('@')[0];

  if (count >= MAX_WARNINGS) {
    warnings.delete(warnKey);
    await sock.groupParticipantsUpdate(groupId, [sender], 'remove');
    await sock.sendMessage(groupId, {
      text: `Removed @${senderNumber} after ${MAX_WARNINGS} warnings for sharing group invite links.`,
      mentions: [sender],
    });
  } else {
    warnings.set(warnKey, count);
    await sock.sendMessage(groupId, {
      text: `⚠️ @${senderNumber}, warning ${count}/${MAX_WARNINGS}: sharing group invite links isn't allowed here.`,
      mentions: [sender],
    });
  }

  return true; // signals the message was handled, stop further command processing
}

module.exports = { handleGroupCommand, handleTagAll, autoModerate, isSenderAdmin };
